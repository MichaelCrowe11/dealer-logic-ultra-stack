import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';

const router = Router();

const customerSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().optional(),
  phone: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  leadSource: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'negotiation', 'closed', 'lost']).default('new')
});

router.get('/customers', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId, status, search } = req.query;
    
    const customers = await prisma.customer.findMany({
      where: {
        dealershipId: dealershipId as string,
        status: status as any,
        OR: search ? [
          { firstName: { contains: search as string } },
          { lastName: { contains: search as string } },
          { email: { contains: search as string } },
          { phone: { contains: search as string } }
        ] : undefined
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(customers);
  } catch (error) {
    next(error);
  }
});

router.post('/customers', async (req: Request, res: Response, next: Function) => {
  try {
    const validated = customerSchema.parse(req.body);
    const { dealershipId } = req.body;
    
    const customer = await prisma.customer.create({
      data: {
        ...validated,
        dealershipId
      }
    });

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

router.put('/customers/:id', async (req: Request, res: Response, next: Function) => {
  try {
    const validated = customerSchema.partial().parse(req.body);
    
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: validated
    });

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.get('/leads', async (req: Request, res: Response, next: Function) => {
  try {
    const { dealershipId, assignedTo, status } = req.query;
    
    const leads = await prisma.lead.findMany({
      where: {
        dealershipId: dealershipId as string,
        assignedTo: assignedTo as string,
        status: status as any
      },
      include: {
        customer: true,
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(leads);
  } catch (error) {
    next(error);
  }
});

router.post('/leads', async (req: Request, res: Response, next: Function) => {
  try {
    const { customerId, dealershipId, assignedTo, source, notes } = req.body;
    
    const lead = await prisma.lead.create({
      data: {
        customerId,
        dealershipId,
        assignedTo,
        source,
        notes,
        status: 'new'
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

router.post('/activities', async (req: Request, res: Response, next: Function) => {
  try {
    const { customerId, leadId, type, notes, scheduledFor } = req.body;
    
    const activity = await prisma.activity.create({
      data: {
        customerId,
        leadId,
        type,
        notes,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        completedAt: type === 'note' ? new Date() : undefined
      }
    });

    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
});

router.get('/pipeline/:dealershipId', async (req: Request, res: Response, next: Function) => {
  try {
    const pipeline = await prisma.lead.groupBy({
      by: ['status'],
      where: {
        dealershipId: req.params.dealershipId
      },
      _count: true,
      _sum: {
        value: true
      }
    });

    const stages = ['new', 'contacted', 'qualified', 'negotiation', 'closed', 'lost'];
    const formattedPipeline = stages.map(stage => {
      const data = pipeline.find((p: any) => p.status === stage);
      return {
        stage,
        count: data?._count || 0,
        value: data?._sum.value || 0
      };
    });

    res.json(formattedPipeline);
  } catch (error) {
    next(error);
  }
});

export default router;