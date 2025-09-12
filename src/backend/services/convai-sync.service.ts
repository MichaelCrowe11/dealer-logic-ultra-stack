import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { prisma } from '../database/connection';
import { logger } from '../config/logger';

const execAsync = promisify(exec);

interface ConvAIAgent {
  name: string;
  config?: string;
  environments?: {
    prod?: {
      config: string;
    };
  };
}

interface AgentConfig {
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
        llm: string;
        temperature: number;
      };
      first_message: string;
      language: string;
    };
    conversation: {
      text_only: boolean;
      max_duration_seconds: number;
    };
    tts: {
      model_id: string;
      voice_id: string;
    };
  };
  platform_settings: any;
  tags: string[];
}

export class ConvAISyncService {
  private elevenLabsApiKey: string;
  private agentsBasePath: string;

  constructor() {
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY || '';
    this.agentsBasePath = path.join(process.cwd(), '..', 'agent_configs');
  }

  /**
   * Pull agents from ConvAI CLI
   */
  async pullAgentsFromConvAI(): Promise<ConvAIAgent[]> {
    try {
      logger.info('Pulling agents from ConvAI...');
      
      // Run convai agent list command
      const { stdout } = await execAsync('convai agent list --json');
      const agents = JSON.parse(stdout);
      
      logger.info(`Found ${agents.length} agents in ConvAI`);
      return agents;
    } catch (error) {
      logger.error('Failed to pull agents from ConvAI:', error);
      
      // Fallback to reading from agents.json file
      const agentsFile = path.join(process.cwd(), '..', 'agents.json');
      const agentsData = await fs.readFile(agentsFile, 'utf-8');
      const agentsJson = JSON.parse(agentsData);
      return agentsJson.agents || [];
    }
  }

  /**
   * Load agent configuration from file
   */
  async loadAgentConfig(configPath: string): Promise<AgentConfig | null> {
    try {
      const fullPath = path.join(process.cwd(), '..', configPath);
      const configData = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      logger.error(`Failed to load agent config from ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Get voice information from ElevenLabs
   */
  async getVoiceInfo(voiceId: string) {
    try {
      if (!this.elevenLabsApiKey) {
        logger.warn('ElevenLabs API key not configured, skipping voice info');
        return null;
      }

      const response = await axios.get(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey
        }
      });

      const voice = response.data;
      return {
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        labels: voice.labels,
        samples: voice.samples,
      };
    } catch (error) {
      logger.error(`Failed to get voice info for ${voiceId}:`, error);
      return null;
    }
  }

  /**
   * Sync a single agent to the database
   */
  async syncAgentToDatabase(agent: ConvAIAgent, config: AgentConfig) {
    try {
      // Determine if this is a Dealer Logic agent
      const isDealerLogic = config.tags?.includes('dealer-logic') || 
                           agent.name.toLowerCase().includes('dealer logic');

      if (!isDealerLogic) {
        logger.info(`Skipping non-Dealer Logic agent: ${agent.name}`);
        return null;
      }

      // Get voice info from ElevenLabs
      const voiceInfo = await this.getVoiceInfo(config.conversation_config.tts.voice_id);

      // Map agent type based on name or tags
      const agentType = this.determineAgentType(agent.name, config.tags);

      // Create or update agent in database
      const dbAgent = await prisma.agent.upsert({
        where: {
          name_dealershipId: {
            name: agent.name,
            dealershipId: 'default', // You may want to make this configurable
          }
        },
        create: {
          name: agent.name,
          email: `${agent.name.toLowerCase().replace(/\s+/g, '.')}@dealerlogic.ai`,
          dealershipId: 'default',
          active: true,
          metadata: {
            convaiConfig: config,
            elevenLabsVoice: voiceInfo,
            agentType,
            tags: config.tags,
          } as any,
        },
        update: {
          active: true,
          metadata: {
            convaiConfig: config,
            elevenLabsVoice: voiceInfo,
            agentType,
            tags: config.tags,
            updatedAt: new Date(),
          } as any,
        }
      });

      logger.info(`Synced agent: ${agent.name} (${dbAgent.id})`);
      return dbAgent;
    } catch (error) {
      logger.error(`Failed to sync agent ${agent.name}:`, error);
      return null;
    }
  }

  /**
   * Determine agent type based on name and tags
   */
  private determineAgentType(name: string, tags: string[]): string {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('reception')) return 'RECEPTION';
    if (nameLower.includes('sales')) return 'SALES';
    if (nameLower.includes('service')) return 'SERVICE';
    if (nameLower.includes('parts')) return 'PARTS';
    if (nameLower.includes('finance')) return 'FINANCE';
    if (nameLower.includes('trade-in')) return 'TRADE_IN';
    if (nameLower.includes('recall')) return 'RECALL';
    if (nameLower.includes('after hours')) return 'AFTER_HOURS';
    if (nameLower.includes('scheduler')) return 'SCHEDULER';
    
    // Check tags
    if (tags.includes('reception')) return 'RECEPTION';
    if (tags.includes('sales')) return 'SALES';
    if (tags.includes('service')) return 'SERVICE';
    
    return 'GENERAL';
  }

  /**
   * Sync all Dealer Logic agents
   */
  async syncAllDealerLogicAgents() {
    try {
      logger.info('Starting Dealer Logic agents synchronization...');
      
      // Pull agents from ConvAI
      const agents = await this.pullAgentsFromConvAI();
      
      // Filter Dealer Logic agents
      const dealerLogicAgents = agents.filter(agent => 
        agent.name.toLowerCase().includes('dealer logic')
      );

      logger.info(`Found ${dealerLogicAgents.length} Dealer Logic agents to sync`);

      const syncedAgents = [];
      
      for (const agent of dealerLogicAgents) {
        // Get config path
        const configPath = agent.environments?.prod?.config || agent.config;
        
        if (!configPath) {
          logger.warn(`No config path found for agent: ${agent.name}`);
          continue;
        }

        // Load agent config
        const config = await this.loadAgentConfig(configPath);
        
        if (!config) {
          logger.warn(`Failed to load config for agent: ${agent.name}`);
          continue;
        }

        // Sync to database
        const syncedAgent = await this.syncAgentToDatabase(agent, config);
        if (syncedAgent) {
          syncedAgents.push(syncedAgent);
        }
      }

      logger.info(`Successfully synced ${syncedAgents.length} agents`);
      return syncedAgents;
    } catch (error) {
      logger.error('Failed to sync Dealer Logic agents:', error);
      throw error;
    }
  }

  /**
   * Deploy agent to ElevenLabs Conversational AI
   */
  async deployAgentToElevenLabs(agentId: string) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      const metadata = agent.metadata as any;
      const config = metadata?.convaiConfig;

      if (!config) {
        throw new Error(`No ConvAI config found for agent: ${agentId}`);
      }

      // Deploy using ConvAI CLI
      const { stdout } = await execAsync(`convai agent deploy "${agent.name}" --environment prod`);
      
      logger.info(`Deployed agent ${agent.name} to ElevenLabs: ${stdout}`);
      
      // Update agent status
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          metadata: {
            ...metadata,
            deployedAt: new Date(),
            deploymentStatus: 'active'
          } as any
        }
      });

      return { success: true, message: stdout };
    } catch (error) {
      logger.error(`Failed to deploy agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get agent conversation history from ElevenLabs
   */
  async getAgentConversations(agentId: string, limit: number = 100) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId }
      });

      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }

      // Use ConvAI CLI to get conversations
      const { stdout } = await execAsync(
        `convai conversation list --agent "${agent.name}" --limit ${limit} --json`
      );

      const conversations = JSON.parse(stdout);
      
      // Store conversations in database
      for (const conv of conversations) {
        await prisma.voiceCall.create({
          data: {
            dealershipId: agent.dealershipId,
            agentId: agent.id,
            customerPhone: conv.phone || 'unknown',
            department: this.mapAgentTypeToDepartment(agent.metadata as any),
            status: conv.status || 'completed',
            duration: conv.duration || 0,
            recordingUrl: conv.recording_url,
            metadata: conv as any,
            createdAt: new Date(conv.created_at || conv.timestamp),
          }
        });
      }

      return conversations;
    } catch (error) {
      logger.error(`Failed to get conversations for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Map agent type to department
   */
  private mapAgentTypeToDepartment(metadata: any): string {
    const agentType = metadata?.agentType || 'GENERAL';
    
    switch (agentType) {
      case 'SALES':
      case 'TRADE_IN':
      case 'FINANCE':
        return 'sales';
      case 'SERVICE':
      case 'SCHEDULER':
      case 'RECALL':
        return 'service';
      case 'PARTS':
        return 'parts';
      default:
        return 'general';
    }
  }
}