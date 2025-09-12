import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';
import { requireRole } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();

const dealershipSchema = z.object({
  name: z.string().min(1),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  phone: z.string(),
  email: z.string().email(),
  website: z.string().url().optional(),
  subscriptionTier: z.enum(['basic', 'professional', 'enterprise']).default('basic')
});

router.get('/', async (req: Request, res: Response, next: Function) => {
  try {
    const dealerships = await prisma.dealership.findMany({
      include: {
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    res.json(dealerships);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: Function) => {
  try {
    const dealership = await prisma.dealership.findUnique({
      where: { id: req.params.id },
      include: {
        users: true,
        analytics: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!dealership) {
      throw new ApiError(404, 'Dealership not found');
    }

    res.json(dealership);
  } catch (error) {
    next(error);
  }
});

router.post('/', requireRole('admin') as any, async (req: Request, res: Response, next: Function) => {
  try {
    const validated = dealershipSchema.parse(req.body);
    
    const dealership = await prisma.dealership.create({
      data: validated
    });

    logger.info(`New dealership created: ${dealership.name}`);

    res.status(201).json(dealership);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', requireRole('admin') as any, async (req: Request, res: Response, next: Function) => {
  try {
    const validated = dealershipSchema.partial().parse(req.body);
    
    const dealership = await prisma.dealership.update({
      where: { id: req.params.id },
      data: validated
    });

    logger.info(`Dealership updated: ${dealership.name}`);

    res.json(dealership);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireRole('admin') as any, async (req: Request, res: Response, next: Function) => {
  try {
    await prisma.dealership.delete({
      where: { id: req.params.id }
    });

    logger.info(`Dealership deleted: ${req.params.id}`);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:id/metrics', async (req: Request, res: Response, next: Function) => {
  try {
    const { startDate, endDate } = req.query;
    
    const metrics = await prisma.analytics.aggregate({
      where: {
        dealershipId: req.params.id,
        createdAt: {
          gte: startDate ? new Date(startDate as string) : undefined,
          lte: endDate ? new Date(endDate as string) : undefined
        }
      },
      _sum: {
        totalCalls: true,
        answeredCalls: true,
        missedCalls: true,
        revenue: true
      },
      _avg: {
        callDuration: true,
        responseTime: true
      }
    });

    res.json(metrics);
  } catch (error) {
    next(error);
  }
});

export default router;