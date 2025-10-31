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
    // WICHTIG: Kann NULL sein für standalone User (Hamburger-Rolle)
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
  // Für standalone User (ohne Organisation) return leeren Filter
  if (!req.organizationId) {
    return {};
  }

  return {
    role: {
      organizationId: req.organizationId
    }
  };
};

// Hilfsfunktion für indirekte Organisation-Filter (über User → Role → Organization)
export const getUserOrganizationFilter = (req: Request): any => {
  // Konvertiere userId von String zu Integer
  const userId = Number(req.userId);
  
  if (isNaN(userId)) {
    console.error('Invalid userId in getUserOrganizationFilter:', req.userId);
    return {}; // Leerer Filter als Fallback
  }

  // Für standalone User (ohne Organisation) - nur eigene Daten
  if (!req.organizationId) {
    return {
      id: userId  // Nur eigene User-Daten
    };
  }

  // Für User mit Organisation: Alle User zurückgeben, die mindestens eine Rolle in dieser Organisation haben
  return {
    roles: {
      some: {
        role: {
          organizationId: req.organizationId
        }
      }
    }
  };
};

// Neue Hilfsfunktion für Datenisolation je nach User-Typ
export const getDataIsolationFilter = (req: Request, entity: string): any => {
  // Konvertiere userId von String zu Integer
  const userId = Number(req.userId);
  
  if (isNaN(userId)) {
    console.error('Invalid userId in request:', req.userId);
    return {}; // Leerer Filter als Fallback
  }

  // Standalone User (ohne Organisation) - nur eigene Daten
  if (!req.organizationId) {
    switch (entity) {
      case 'task':
        return {
          OR: [
            { responsibleId: userId },
            { qualityControlId: userId }
          ]
        };
      
      case 'request':
        return {
          OR: [
            { requesterId: userId },
            { responsibleId: userId }
          ]
        };
      
      default:
        // Für andere Entitäten: Alle Daten anzeigen (keine Isolation)
        return {};
    }
  }

  // User mit Organisation - Organisations-spezifische Filter
  switch (entity) {
    case 'task':
      return {
        OR: [
          { responsibleId: userId },
          { qualityControlId: userId }
        ]
      };
    
    case 'request':
      return {
        OR: [
          { requesterId: userId },
          { responsibleId: userId }
        ]
      };
    
    case 'worktime':
      return {
        userId: userId
      };
    
    case 'user':
      return {
        roles: {
          some: {
            role: {
              organizationId: req.organizationId
            }
          }
        }
      };
    
    default:
      // Fallback: Kein Filter (alle Daten anzeigen)
      return {};
  }
}; 