import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { prisma } from '../database/connection';

const router = Router();

router.post('/voice', async (req: Request, res: Response) => {
  try {
    const { event, callId, data } = req.body;
    
    logger.info(`Voice webhook received: ${event}`, { callId, data });

    switch (event) {
      case 'call.started':
        await handleCallStarted(callId, data);
        break;
      case 'call.answered':
        await handleCallAnswered(callId, data);
        break;
      case 'call.ended':
        await handleCallEnded(callId, data);
        break;
      case 'transcription.ready':
        await handleTranscription(callId, data);
        break;
      default:
        logger.warn(`Unknown webhook event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/crm', async (req: Request, res: Response) => {
  try {
    const { event, data } = req.body;
    
    logger.info(`CRM webhook received: ${event}`, { data });

    switch (event) {
      case 'lead.created':
        await handleLeadCreated(data);
        break;
      case 'deal.closed':
        await handleDealClosed(data);
        break;
      default:
        logger.warn(`Unknown CRM webhook event: ${event}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('CRM webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

async function handleCallStarted(callId: string, data: any) {
  await prisma.voiceCall.update({
    where: { id: callId },
    data: {
      status: 'in_progress',
      startedAt: new Date(),
      agentId: data.agentId
    }
  });
}

async function handleCallAnswered(callId: string, data: any) {
  await prisma.voiceCall.update({
    where: { id: callId },
    data: {
      status: 'answered',
      answeredAt: new Date(),
      responseTime: data.responseTime
    }
  });
}

async function handleCallEnded(callId: string, data: any) {
  await prisma.voiceCall.update({
    where: { id: callId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      duration: data.duration,
      recordingUrl: data.recordingUrl
    }
  });

  await updateDealershipMetrics(data.dealershipId);
}

async function handleTranscription(callId: string, data: any) {
  await prisma.transcription.create({
    data: {
      callId,
      text: data.transcription,
      summary: data.summary,
      sentiment: data.sentiment,
      keywords: data.keywords
    }
  });
}

async function handleLeadCreated(data: any) {
  const lead = await prisma.lead.create({
    data: {
      customerId: data.customerId,
      dealershipId: data.dealershipId,
      source: 'webhook',
      status: 'new',
      value: data.value
    }
  });

  logger.info(`New lead created from webhook: ${lead.id}`);
}

async function handleDealClosed(data: any) {
  await prisma.transaction.create({
    data: {
      dealershipId: data.dealershipId,
      customerId: data.customerId,
      type: 'sale',
      amount: data.amount,
      description: data.description
    }
  });

  await updateDealershipMetrics(data.dealershipId);
}

async function updateDealershipMetrics(dealershipId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [calls, revenue] = await Promise.all([
    prisma.voiceCall.count({
      where: {
        dealershipId,
        createdAt: { gte: today }
      }
    }),
    prisma.transaction.aggregate({
      where: {
        dealershipId,
        createdAt: { gte: today },
        type: 'sale'
      },
      _sum: { amount: true }
    })
  ]);

  await prisma.analytics.upsert({
    where: {
      dealershipId_date: {
        dealershipId,
        date: today
      }
    },
    create: {
      dealershipId,
      date: today,
      totalCalls: calls,
      revenue: revenue._sum.amount || 0
    },
    update: {
      totalCalls: calls,
      revenue: revenue._sum.amount || 0
    }
  });
}

export default router;