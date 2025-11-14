import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Erweitere Request-Interface
declare global {
  namespace Express {
    interface Request {
      organizationId?: number;
      branchId?: number;
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

    // Hole aktive Branch des Users
    const userBranch = await prisma.usersBranches.findFirst({
      where: {
        userId: Number(userId),
        lastUsed: true
      },
      select: {
        branchId: true
      }
    });

    // Setze branchId im Request (kann undefined sein, wenn User keine Branch hat)
    if (userBranch) {
      req.branchId = userBranch.branchId;
    }

    next();
  } catch (error) {
    console.error('❌ Error in Organization Middleware:', error);
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
      
      case 'worktime':
        return { userId: userId };
      
      case 'client':
        // Standalone: Nur Clients, die der User verwendet hat
        return {
          workTimes: {
            some: { userId: userId }
          }
        };
      
      case 'branch':
        // Standalone: Nur Branches wo User Mitglied ist
        return {
          users: {
            some: { userId: userId }
          }
        };
      
      case 'invoice':
      case 'consultationInvoice':
        return { userId: userId };
      
      case 'monthlyReport':
      case 'monthlyConsultationReport':
        return { userId: userId };
      
      case 'cerebroCarticle':
      case 'carticle':
        // Standalone: Nur Artikel die der User erstellt hat
        return { createdById: userId };
      
      case 'role':
        // Standalone: Nur Rollen die User hat (Hamburger-Rolle)
        return {
          users: {
            some: { userId: userId }
          }
        };
      
      default:
        // Für andere Entitäten: Alle Daten anzeigen (keine Isolation)
        return {};
    }
  }

  // User mit Organisation - Filter nach organizationId
  
  switch (entity) {
    case 'task':
      // Tasks: Nach organizationId UND (responsibleId ODER roleId ODER qualityControlId)
      // Wenn User eine Rolle hat, die einer Task-Rolle entspricht, soll er die Task sehen
      const taskFilter: any = {};
      
      // Nur organizationId hinzufügen, wenn es gesetzt ist
      if (req.organizationId) {
        taskFilter.organizationId = req.organizationId;
      }
      
      // Wenn User eine aktive Rolle hat, füge roleId-Filter hinzu
      const userRoleId = req.userRole?.role?.id;
      
      // Debug-Logging
      console.log('[getDataIsolationFilter] Task filter:', {
        userId,
        organizationId: req.organizationId,
        userRoleId,
        userRoleName: req.userRole?.role?.name,
        hasOrganization: !!req.organizationId
      });
      
      if (userRoleId) {
        taskFilter.OR = [
          { responsibleId: userId },
          { qualityControlId: userId },
          { roleId: userRoleId }
        ];
      } else {
        // Fallback: Nur eigene Tasks
        taskFilter.OR = [
          { responsibleId: userId },
          { qualityControlId: userId }
        ];
      }
      
      // Wenn organizationId gesetzt ist, muss es in der OR-Bedingung auch berücksichtigt werden
      // ABER: Prisma unterstützt keine verschachtelten OR-Bedingungen mit AND
      // Lösung: organizationId wird als separate Bedingung hinzugefügt
      // Das bedeutet: (organizationId = X) AND (responsibleId = Y OR roleId = Z OR qualityControlId = Y)
      
      console.log('[getDataIsolationFilter] Final task filter:', JSON.stringify(taskFilter, null, 2));
      
      return taskFilter;
    
    case 'request':
    case 'worktime':
    case 'client':
    case 'branch':
    case 'invoice':
    case 'consultationInvoice':
    case 'monthlyReport':
    case 'monthlyConsultationReport':
    case 'cerebroCarticle':
    case 'carticle':
      // Einfache Filterung nach organizationId
      // WICHTIG: Wenn organizationId gesetzt ist, werden nur Einträge mit dieser organizationId angezeigt
      // NULL-Werte werden automatisch ausgeschlossen
      return {
        organizationId: req.organizationId
      };
    
    case 'user':
      // User-Filterung bleibt komplex (über UserRole)
      return {
        roles: {
          some: {
            role: {
              organizationId: req.organizationId
            }
          }
        }
      };
    
    case 'role':
      return {
        organizationId: req.organizationId
      };
    
    default:
      return {};
  }
};

// Hilfsfunktion zum Prüfen, ob eine Ressource zur Organisation des Users gehört
export const belongsToOrganization = async (
  req: Request,
  entity: string,
  resourceId: number
): Promise<boolean> => {
  try {
    // Standalone User: Prüfe ob Ressource ihm gehört
    if (!req.organizationId) {
      const userId = Number(req.userId);
      
      switch (entity) {
        case 'client':
          const client = await prisma.client.findUnique({
            where: { id: resourceId },
            include: {
              workTimes: {
                where: { userId: userId },
                take: 1
              }
            }
          });
          return client !== null && client.workTimes.length > 0;
        
        case 'role':
          const role = await prisma.role.findUnique({
            where: { id: resourceId },
            include: {
              users: {
                where: { userId: userId },
                take: 1
              }
            }
          });
          return role !== null && role.users.length > 0;
        
        case 'branch':
          const branch = await prisma.branch.findUnique({
            where: { id: resourceId },
            include: {
              users: {
                where: { userId: userId },
                take: 1
              }
            }
          });
          return branch !== null && branch.users.length > 0;
        
        default:
          return false;
      }
    }

    // User mit Organisation: Prüfe ob Ressource zur Organisation gehört
    switch (entity) {
      case 'client':
        const client = await prisma.client.findFirst({
          where: {
            id: resourceId,
            workTimes: {
              some: {
                user: {
                  roles: {
                    some: {
                      role: {
                        organizationId: req.organizationId
                      }
                    }
                  }
                }
              }
            }
          }
        });
        return client !== null;
      
      case 'role':
        const role = await prisma.role.findFirst({
          where: {
            id: resourceId,
            organizationId: req.organizationId
          }
        });
        return role !== null;
      
      case 'branch':
        const branch = await prisma.branch.findFirst({
          where: {
            id: resourceId,
            users: {
              some: {
                user: {
                  roles: {
                    some: {
                      role: {
                        organizationId: req.organizationId
                      }
                    }
                  }
                }
              }
            }
          }
        });
        return branch !== null;
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`Fehler in belongsToOrganization für ${entity}:`, error);
    return false;
  }
}; 