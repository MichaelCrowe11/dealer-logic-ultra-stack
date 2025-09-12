import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

const callSchema = z.object({
  dealershipId: z.string(),
  customerPhone: z.string(),
  customerName: z.string().optional(),
  department: z.enum(['sales', 'service', 'parts', 'general']),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  notes: z.string().optional()
});

router.get('/calls', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId, status, startDate, endDate } = req.query;
    
    const calls = await prisma.voiceCall.findMany({
      where: {
        dealershipId: dealershipId as string,
        status: status as any,
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(calls);
  } catch (error) {
    next(error);
  }
});

router.post('/calls', async (req: Request, res: Response, next: Function) => {
  try {
    const validated = callSchema.parse(req.body);
    
    const call = await prisma.voiceCall.create({
      data: {
        ...validated,
        status: 'queued',
        queuedAt: new Date()
      }
    });

    logger.info(`New voice call created: ${call.id}`);

    res.status(201).json(call);
  } catch (error) {
    next(error);
  }
});

router.put('/calls/:id/status', async (req: Request, res: Response, next: Function) => {
  try {
    const { status, agentId, notes } = req.body;
    
    const call = await prisma.voiceCall.update({
      where: { id: req.params.id },
      data: {
        status,
        agentId,
        notes,
        answeredAt: status === 'answered' ? new Date() : undefined,
        completedAt: status === 'completed' ? new Date() : undefined
      }
    });

    logger.info(`Voice call ${call.id} status updated to ${status}`);

    res.json(call);
  } catch (error) {
    next(error);
  }
});

router.get('/agents', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId } = req.query;
    
    const agents = await prisma.agent.findMany({
      where: {
        dealershipId: dealershipId as string,
        active: true
      },
      include: {
        currentCalls: {
          where: { status: 'in_progress' }
        }
      }
    });

    res.json(agents);
  } catch (error) {
    next(error);
  }
});

router.post('/transcriptions', async (req: Request, res: Response, next: Function) => {
  try {
    const { callId, transcription, summary, sentiment } = req.body;
    
    const result = await prisma.transcription.create({
      data: {
        callId,
        text: transcription,
        summary,
        sentiment
      }
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;