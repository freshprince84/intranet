import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';

// Erweitere den Request-Typ, um den Benutzer hinzuzufügen
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        roles: string[];
        activeRoleId?: number; // Hinzugefügt: ID der aktiven Rolle
      };
      userId: string; // Für Abwärtskompatibilität - als string, weil parseInt in permissionMiddleware verwendet wird
      roleId: string; // Für Abwärtskompatibilität - als string, weil parseInt in permissionMiddleware verwendet wird
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * Authentication middleware to verify the JWT token
 * and attach the user to the request object.
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ message: 'Authentifizierung erforderlich' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token erforderlich' });
    }
    
    // Verify the token
    const decoded: any = jwt.verify(token, SECRET_KEY);
    
    // Get the user with roles, including the active role
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true
              }
            }
          }
        },
        settings: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    
    // Attach the user to the request object
    req.user = user;
    
    // Set compatibility fields for legacy code
    req.userId = String(user.id);
    
    // Find and set active role
    const activeRole = user.roles.find(r => r.lastUsed);
    if (activeRole) {
      req.roleId = String(activeRole.role.id);
    }
    
    next();
  } catch (error) {
    console.error('Fehler in der Auth-Middleware:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Ungültiger Token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token abgelaufen' });
    }
    res.status(500).json({ message: 'Server-Fehler bei der Authentifizierung' });
  }
};

// Exportiere auch unter dem alten Namen für Abwärtskompatibilität
export const authenticateToken = authMiddleware;

export default authMiddleware; 