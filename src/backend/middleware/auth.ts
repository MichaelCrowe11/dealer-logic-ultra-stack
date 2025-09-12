import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    dealershipId?: string;
    role: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret') as any;
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      dealershipId: decoded.dealershipId,
      role: decoded.role
    };

    next();
  } catch (error) {
    logger.error('Authentication failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}