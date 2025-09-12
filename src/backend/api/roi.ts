import { Router, Request, Response } from 'express';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

router.get('/calculate/:dealershipId', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId } = req.params;
    const { period = '30d' } = req.query;
    
    const roi = await calculateROI(dealershipId, period as string);
    
    res.json(roi);
  } catch (error) {
    next(error);
  }
});

router.get('/projections/:dealershipId', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId } = req.params;
    const { months = 12 } = req.query;
    
    const projections = await generateProjections(dealershipId, parseInt(months as string));
    
    res.json(projections);
  } catch (error) {
    next(error);
  }
});

async function calculateROI(dealershipId: string, period: string) {
  const days = parseInt(period) || 30;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [revenue, costs, metrics] = await Promise.all([
    getRevenue(dealershipId, startDate),
    getCosts(dealershipId, startDate),
    getMetrics(dealershipId, startDate)
  ]);

  const roi = ((revenue - costs) / costs) * 100;
  const paybackPeriod = costs / (revenue / days);

  return {
    revenue,
    costs,
    profit: revenue - costs,
    roi: Math.round(roi * 100) / 100,
    paybackPeriod: Math.round(paybackPeriod),
    metrics,
    period: { days, startDate, endDate: new Date() }
  };
}

async function generateProjections(dealershipId: string, months: number) {
  const historicalData = await getHistoricalData(dealershipId);
  const growthRate = calculateGrowthRate(historicalData);
  
  const projections = [];
  let currentRevenue = historicalData[historicalData.length - 1]?.revenue || 0;
  
  for (let i = 1; i <= months; i++) {
    currentRevenue *= (1 + growthRate);
    projections.push({
      month: i,
      revenue: Math.round(currentRevenue),
      costs: Math.round(currentRevenue * 0.3),
      profit: Math.round(currentRevenue * 0.7),
      roi: Math.round(((currentRevenue * 0.7) / (currentRevenue * 0.3)) * 100)
    });
  }

  return {
    projections,
    assumptions: {
      growthRate: Math.round(growthRate * 10000) / 100,
      costRatio: 30,
      months
    }
  };
}

async function getRevenue(dealershipId: string, startDate: Date) {
  const result = await prisma.transaction.aggregate({
    where: {
      dealershipId,
      createdAt: { gte: startDate },
      type: 'revenue'
    },
    _sum: { amount: true }
  });
  
  return result._sum.amount || 0;
}

async function getCosts(dealershipId: string, startDate: Date) {
  const dealership = await prisma.dealership.findUnique({
    where: { id: dealershipId }
  });
  
  const monthlySubscription = dealership?.subscriptionTier === 'enterprise' ? 2499 :
                             dealership?.subscriptionTier === 'professional' ? 799 : 299;
  
  const days = Math.floor((Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  return (monthlySubscription / 30) * days;
}

async function getMetrics(dealershipId: string, startDate: Date) {
  const [calls, conversions] = await Promise.all([
    prisma.voiceCall.count({
      where: { dealershipId, createdAt: { gte: startDate } }
    }),
    prisma.transaction.count({
      where: { dealershipId, createdAt: { gte: startDate }, type: 'sale' }
    })
  ]);

  return {
    totalCalls: calls,
    conversions,
    conversionRate: calls > 0 ? Math.round((conversions / calls) * 10000) / 100 : 0
  };
}

async function getHistoricalData(dealershipId: string) {
  return prisma.analytics.findMany({
    where: { dealershipId },
    orderBy: { createdAt: 'asc' },
    take: 12
  });
}

function calculateGrowthRate(data: any[]): number {
  if (data.length < 2) return 0.05;
  
  const firstMonth = data[0].revenue || 0;
  const lastMonth = data[data.length - 1].revenue || 0;
  
  if (firstMonth === 0) return 0.05;
  
  return (lastMonth - firstMonth) / firstMonth / data.length;
}

export default router;