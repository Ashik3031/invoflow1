import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { TenantModel } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xyraco-secret-key';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    role: string;
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Access token required' });

  jwt.verify(token, JWT_SECRET, async (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });

    // Enforce Tenant Suspension Check for non-super admins
    if (user && user.role !== 'super_admin') {
      try {
        const tenant = await TenantModel.findOne({ id: user.tenantId });
        if (tenant && tenant.status === 'suspended') {
          return res.status(403).json({ 
            message: 'Your organization has been suspended by the administrator. All actions have been locked.' 
          });
        }
      } catch (dbErr) {
        console.error('Error verifying tenant suspension:', dbErr);
      }
    }

    req.user = user;
    next();
  });
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super Administration privileges required' });
  }
  next();
};
