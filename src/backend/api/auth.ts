import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../database/connection';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dealershipName: z.string().optional(),
  role: z.enum(['admin', 'manager', 'sales', 'service']).default('sales')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/register', async (req: Request, res: Response, next: Function) => {
  try {
    const validated = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (existingUser) {
      throw new ApiError(400, 'Email already registered');
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        firstName: validated.firstName,
        lastName: validated.lastName,
        role: validated.role
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: Function) => {
  try {
    const validated = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({
      where: { email: validated.email }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const validPassword = await bcrypt.compare(validated.password, user.password);
    
    if (!validPassword) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        dealershipId: user.dealershipId
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        dealershipId: user.dealershipId
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.post('/refresh', async (req: Request, res: Response, next: Function) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new ApiError(401, 'Refresh token required');
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret') as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        dealershipId: user.dealershipId
      },
      process.env.JWT_SECRET || 'your-jwt-secret',
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
});

export default router;