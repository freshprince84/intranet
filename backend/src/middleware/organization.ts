import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Erweitere Request-Interface
declare global {
  namespace Express {
    interface Request {
      organizationId?: number;
      userRole?: any;
    }
  }
}

export const organizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole aktuelle Rolle und Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true,
            permissions: true
          }
        }
      }
    });

    if (!userRole) {
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }

    // Füge Organisations-Kontext zum Request hinzu
    req.organizationId = userRole.role.organizationId;
    req.userRole = userRole;

    next();
  } catch (error) {
    console.error('Fehler in Organization Middleware:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Hilfsfunktion für Query-Filter
export const getOrganizationFilter = (req: Request): any => {
  if (!req.organizationId) {
    throw new Error('Organization context not available');
  }

  return {
    role: {
      organizationId: req.organizationId
    }
  };
};

// Hilfsfunktion für indirekte Organisation-Filter (über User → Role → Organization)
export const getUserOrganizationFilter = (req: Request): any => {
  if (!req.organizationId) {
    throw new Error('Organization context not available');
  }

  return {
    OR: [
      {
        roles: {
          some: {
            role: {
              organizationId: req.organizationId
            }
          }
        }
      },
      // Fallback: User hat keine Rollen in aktueller Organisation
      {
        id: req.userId,
        roles: {
          some: {
            role: {
              organizationId: req.organizationId
            }
          }
        }
      }
    ]
  };
}; 