import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const pricingTiers = {
  basic: {
    name: 'Basic',
    price: 299,
    features: ['100 calls/month', 'Basic analytics', 'Email support']
  },
  professional: {
    name: 'Professional',
    price: 799,
    features: ['500 calls/month', 'Advanced analytics', 'Priority support', 'CRM integration']
  },
  enterprise: {
    name: 'Enterprise',
    price: 2499,
    features: ['Unlimited calls', 'Custom analytics', 'Dedicated support', 'Full API access']
  }
};

router.get('/tiers', (req: Request, res: Response) => {
  res.json(pricingTiers);
});

router.get('/calculator', async (req: Request, res: Response, next: Function) => {
  try {
    const { calls, agents, features } = req.query;
    
    const estimate = calculatePricing(
      parseInt(calls as string) || 100,
      parseInt(agents as string) || 1,
      (features as string)?.split(',') || []
    );

    res.json(estimate);
  } catch (error) {
    next(error);
  }
});

router.post('/quote', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId, tier, addons, notes } = req.body;
    
    const quote = await prisma.quote.create({
      data: {
        dealershipId,
        tier,
        addons,
        notes,
        amount: calculateQuoteAmount(tier, addons),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    res.status(201).json(quote);
  } catch (error) {
    next(error);
  }
});

function calculatePricing(calls: number, agents: number, features: string[]) {
  let baseTier = 'basic';
  
  if (calls > 500 || agents > 5) {
    baseTier = 'enterprise';
  } else if (calls > 100 || agents > 2) {
    baseTier = 'professional';
  }

  const basePrice = pricingTiers[baseTier as keyof typeof pricingTiers].price;
  const addonCost = features.length * 50;

  return {
    recommendedTier: baseTier,
    basePrice,
    addonCost,
    totalMonthly: basePrice + addonCost,
    totalAnnual: (basePrice + addonCost) * 12 * 0.9
  };
}

function calculateQuoteAmount(tier: string, addons: string[]): number {
  const basePrice = pricingTiers[tier as keyof typeof pricingTiers]?.price || 299;
  const addonCost = addons.length * 50;
  return basePrice + addonCost;
}

export default router;