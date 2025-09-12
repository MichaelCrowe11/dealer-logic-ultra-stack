import { Router, Request, Response } from 'express';
import { ConvAISyncService } from '../services/convai-sync.service';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();
const convaiSync = new ConvAISyncService();

// Sync all Dealer Logic agents from ConvAI
router.post('/sync-agents', async (req: Request, res: Response, next: Function) => {
  try {
    logger.info('Starting agent synchronization from ConvAI/ElevenLabs');
    
    const syncedAgents = await convaiSync.syncAllDealerLogicAgents();
    
    res.json({
      message: 'Agent synchronization completed',
      syncedCount: syncedAgents.length,
      agents: syncedAgents.map(agent => ({
        id: agent.id,
        name: agent.name,
        active: agent.active,
        metadata: agent.metadata
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get all synced agents
router.get('/agents', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId, active, type } = req.query;
    
    const where: any = {};
    
    if (dealershipId) where.dealershipId = dealershipId as string;
    if (active !== undefined) where.active = active === 'true';
    
    const agents = await prisma.agent.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    // Filter by agent type if specified
    let filteredAgents = agents;
    if (type) {
      filteredAgents = agents.filter((agent: any) => {
        const metadata = agent.metadata as any;
        return metadata?.agentType === (type as string).toUpperCase();
      });
    }

    res.json({
      agents: filteredAgents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        dealershipId: agent.dealershipId,
        active: agent.active,
        agentType: (agent.metadata as any)?.agentType,
        elevenLabsVoice: (agent.metadata as any)?.elevenLabsVoice,
        tags: (agent.metadata as any)?.tags,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get specific agent details
router.get('/agents/:id', async (req: Request, res: Response, next: Function) => {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id },
      include: {
        dealership: true,
        currentCalls: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!agent) {
      throw new ApiError(404, 'Agent not found');
    }

    const metadata = agent.metadata as any;

    res.json({
      ...agent,
      agentType: metadata?.agentType,
      convaiConfig: metadata?.convaiConfig,
      elevenLabsVoice: metadata?.elevenLabsVoice,
      tags: metadata?.tags,
      deploymentStatus: metadata?.deploymentStatus,
      deployedAt: metadata?.deployedAt
    });
  } catch (error) {
    next(error);
  }
});

// Deploy agent to ElevenLabs
router.post('/agents/:id/deploy', async (req: Request, res: Response, next: Function) => {
  try {
    const result = await convaiSync.deployAgentToElevenLabs(req.params.id);
    
    res.json({
      message: 'Agent deployed successfully',
      result
    });
  } catch (error) {
    next(error);
  }
});

// Get agent conversation history
router.get('/agents/:id/conversations', async (req: Request, res: Response, next: Function) => {
  try {
    const { limit = 100 } = req.query;
    
    const conversations = await convaiSync.getAgentConversations(
      req.params.id, 
      parseInt(limit as string)
    );
    
    res.json({
      conversations,
      count: conversations.length
    });
  } catch (error) {
    next(error);
  }
});

// Update agent configuration
router.put('/agents/:id', async (req: Request, res: Response, next: Function) => {
  try {
    const { active, metadata } = req.body;
    
    const agent = await prisma.agent.update({
      where: { id: req.params.id },
      data: {
        active,
        metadata: metadata ? { ...metadata } : undefined
      }
    });

    res.json(agent);
  } catch (error) {
    next(error);
  }
});

// Get ElevenLabs voices
router.get('/voices', async (req: Request, res: Response, next: Function) => {
  try {
    const { stdout } = await require('child_process').execSync('convai voice list --json', { encoding: 'utf8' });
    const voices = JSON.parse(stdout);
    
    res.json({ voices });
  } catch (error) {
    logger.error('Failed to fetch voices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch voices',
      message: 'Could not retrieve voice list from ElevenLabs'
    });
  }
});

// Test agent voice
router.post('/agents/:id/test-voice', async (req: Request, res: Response, next: Function) => {
  try {
    const { text = 'Hello! This is a test of my voice. How can I help you today?' } = req.body;
    
    const agent = await prisma.agent.findUnique({
      where: { id: req.params.id }
    });

    if (!agent) {
      throw new ApiError(404, 'Agent not found');
    }

    const metadata = agent.metadata as any;
    const voiceId = metadata?.convaiConfig?.conversation_config?.tts?.voice_id;

    if (!voiceId) {
      throw new ApiError(400, 'No voice ID configured for this agent');
    }

    // Use ConvAI CLI to generate speech
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const tempFile = `/tmp/voice-test-${Date.now()}.mp3`;
    await execAsync(`convai tts --voice-id ${voiceId} --text "${text}" --output ${tempFile}`);

    res.json({
      message: 'Voice test generated successfully',
      voiceId,
      text,
      audioFile: tempFile
    });
  } catch (error) {
    next(error);
  }
});

// Get agent performance metrics
router.get('/agents/:id/metrics', async (req: Request, res: Response, next: Function) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const [totalCalls, completedCalls, avgDuration, callsByStatus] = await Promise.all([
      prisma.voiceCall.count({
        where: {
          agentId: req.params.id,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        }
      }),
      prisma.voiceCall.count({
        where: {
          agentId: req.params.id,
          status: 'completed',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        }
      }),
      prisma.voiceCall.aggregate({
        where: {
          agentId: req.params.id,
          status: 'completed',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        _avg: {
          duration: true
        }
      }),
      prisma.voiceCall.groupBy({
        by: ['status'],
        where: {
          agentId: req.params.id,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined
        },
        _count: true
      })
    ]);

    res.json({
      totalCalls,
      completedCalls,
      completionRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
      averageDuration: avgDuration._avg.duration || 0,
      callsByStatus: callsByStatus.reduce((acc: any, item: any) => {
        acc[item.status] = item._count;
        return acc;
      }, {})
    });
  } catch (error) {
    next(error);
  }
});

export default router;