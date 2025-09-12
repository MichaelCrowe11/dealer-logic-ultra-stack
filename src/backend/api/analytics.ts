import { Router, Request, Response } from 'express';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

router.get('/dashboard/:dealershipId', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId } = req.params;
    const { period = '7d' } = req.query;
    
    const startDate = getStartDate(period as string);
    
    const [calls, revenue, performance, trends] = await Promise.all([
      getCallMetrics(dealershipId, startDate),
      getRevenueMetrics(dealershipId, startDate),
      getPerformanceMetrics(dealershipId, startDate),
      getTrendData(dealershipId, startDate)
    ]);

    res.json({
      calls,
      revenue,
      performance,
      trends,
      period,
      lastUpdated: new Date()
    });
  } catch (error) {
    next(error);
  }
});

router.get('/reports/:dealershipId', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId } = req.params;
    const { type, startDate, endDate } = req.query;
    
    const report = await generateReport(
      dealershipId,
      type as string,
      new Date(startDate as string),
      new Date(endDate as string)
    );

    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.post('/track', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId, event, properties } = req.body;
    
    await prisma.analyticsEvent.create({
      data: {
        dealershipId,
        event,
        properties,
        timestamp: new Date()
      }
    });

    res.status(201).json({ success: true });
  } catch (error) {
    next(error);
  }
});

async function getCallMetrics(dealershipId: string, startDate: Date) {
  const metrics = await prisma.voiceCall.groupBy({
    by: ['status'],
    where: {
      dealershipId,
      createdAt: { gte: startDate }
    },
    _count: true
  });

  return {
    total: metrics.reduce((sum: number, m: any) => sum + m._count, 0),
    answered: metrics.find((m: any) => m.status === 'completed')?._count || 0,
    missed: metrics.find((m: any) => m.status === 'missed')?._count || 0,
    abandoned: metrics.find((m: any) => m.status === 'abandoned')?._count || 0
  };
}

async function getRevenueMetrics(dealershipId: string, startDate: Date) {
  const revenue = await prisma.transaction.aggregate({
    where: {
      dealershipId,
      createdAt: { gte: startDate }
    },
    _sum: {
      amount: true
    },
    _count: true
  });

  return {
    total: revenue._sum.amount || 0,
    transactions: revenue._count,
    average: revenue._count > 0 ? (revenue._sum.amount || 0) / revenue._count : 0
  };
}

async function getPerformanceMetrics(dealershipId: string, startDate: Date) {
  const calls = await prisma.voiceCall.findMany({
    where: {
      dealershipId,
      createdAt: { gte: startDate },
      status: 'completed'
    },
    select: {
      duration: true,
      responseTime: true
    }
  });

  const avgDuration = calls.reduce((sum: number, c: any) => sum + (c.duration || 0), 0) / (calls.length || 1);
  const avgResponseTime = calls.reduce((sum: number, c: any) => sum + (c.responseTime || 0), 0) / (calls.length || 1);

  return {
    averageCallDuration: Math.round(avgDuration),
    averageResponseTime: Math.round(avgResponseTime),
    totalCalls: calls.length
  };
}

async function getTrendData(dealershipId: string, startDate: Date) {
  const dailyData = await prisma.analytics.findMany({
    where: {
      dealershipId,
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'asc' }
  });

  return dailyData.map((d: any) => ({
    date: d.createdAt,
    calls: d.totalCalls,
    revenue: d.revenue,
    conversion: d.conversionRate
  }));
}

async function generateReport(dealershipId: string, type: string, startDate: Date, endDate: Date) {
  return {
    type,
    dealershipId,
    period: { startDate, endDate },
    generatedAt: new Date(),
    data: {}
  };
}

function getStartDate(period: string): Date {
  const now = new Date();
  const days = parseInt(period) || 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export default router;