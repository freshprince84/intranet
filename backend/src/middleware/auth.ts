import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { userCache } from '../services/userCache';
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
    
    // ✅ PERFORMANCE: Verwende Cache statt DB-Query bei jedem Request
    const cached = await userCache.get(decoded.userId);
    
    if (!cached || !cached.user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    
    const user = cached.user;
    
    // Attach the user to the request object
    req.user = user;
    
    // Set compatibility fields for legacy code
    req.userId = String(user.id);
    
    // Set active role from cache
    if (cached.roleId) {
      req.roleId = cached.roleId;
    } else {
      // Fallback: Finde aktive Rolle (sollte nicht nötig sein, da im Cache)
      const activeRole = user.roles.find(r => r.lastUsed);
      if (activeRole) {
        req.roleId = String(activeRole.role.id);
      } else {
        // Nur bei Fehlern loggen (wenn keine aktive Rolle gefunden)
        console.error(`[authMiddleware] ❌ Keine aktive Rolle gefunden für User ${user.id}`);
        console.error(`[authMiddleware] Verfügbare Rollen: ${user.roles.length}`);
        user.roles.forEach(r => {
          console.error(`   - ${r.role.name} (ID: ${r.role.id}), lastUsed: ${r.lastUsed}`);
        });
      }
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