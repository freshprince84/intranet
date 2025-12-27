import { Request, Response, NextFunction } from 'express';
import { organizationCache } from '../utils/organizationCache';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

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

    // ✅ PERFORMANCE: Verwende Cache statt DB-Query bei jedem Request
    const cachedData = await organizationCache.get(Number(userId));

    if (!cachedData) {
      logger.error('[organizationMiddleware] Keine aktive Rolle gefunden für userId:', userId);
      return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
    }
    
    // Füge Organisations-Kontext zum Request hinzu
    req.organizationId = cachedData.organizationId;
    req.userRole = cachedData.userRole;
    req.branchId = cachedData.branchId;

    next();
  } catch (error) {
    logger.error('❌ Error in Organization Middleware:', error);
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
    logger.error('Invalid userId in getUserOrganizationFilter:', req.userId);
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

// ============================================
// OWNERSHIP-FELDER FÜR ROW-LEVEL-ISOLATION
// ============================================
// Definiert welche DB-Felder für "eigene Daten" geprüft werden
const OWNERSHIP_FIELDS: Record<string, string[]> = {
  'task': ['responsibleId', 'qualityControlId', 'roleId'],
  'request': ['requesterId', 'responsibleId'],
  'worktime': ['userId'],
  'client': ['createdById'],
  'branch': [],  // Branch-Zugehörigkeit wird über BranchUser geprüft
  'invoice': ['userId'],
  'consultationInvoice': ['userId'],
  'monthlyReport': ['userId'],
  'monthlyConsultationReport': ['userId'],
  'cerebroCarticle': ['createdById'],
  'carticle': ['createdById'],
  'reservation': ['branchId'],  // Branch-basiert
  'tour_booking': ['bookedById', 'branchId'],
  'password_entry': ['createdById'],
};

/**
 * Neue Hilfsfunktion für Datenisolation basierend auf AccessLevel
 * Berücksichtigt das Permission-System (own_read, own_both, all_read, all_both)
 * 
 * @param req - Express Request mit userId, organizationId, permissionContext
 * @param entity - Entity-Name (z.B. 'task', 'request')
 * @returns Prisma WHERE-Filter für Row-Level-Isolation
 */
export const getDataIsolationFilter = (req: Request, entity: string): any => {
  // ✅ FIX: Admin/Owner sehen alle Daten (keine Isolation)
  if (isAdminOrOwner(req)) {
    return {}; // Leerer Filter = alle Daten
  }
  
  // Konvertiere userId von String zu Integer
  const userId = Number(req.userId);
  
  if (isNaN(userId)) {
    logger.error('Invalid userId in request:', req.userId);
    return {}; // Leerer Filter als Fallback
  }

  // ✅ NEU: Prüfe permissionContext (gesetzt von checkPermission Middleware)
  const permissionContext = req.permissionContext;
  
  if (permissionContext) {
    const { accessLevel, isOwnershipRequired, ownershipFields } = permissionContext;
    
    // all_both oder all_read: Keine Row-Level-Isolation nötig (alle Daten der Org sehen)
    if (accessLevel === 'all_both' || accessLevel === 'all_read') {
      // Nur nach organizationId filtern (falls vorhanden)
      if (req.organizationId) {
        return { organizationId: req.organizationId };
      }
      return {};
    }
    
    // own_both oder own_read: Nur eigene Daten
    if (isOwnershipRequired && ownershipFields.length > 0) {
      const orConditions: any[] = [];
      
      for (const field of ownershipFields) {
        if (field === 'userId' || field === 'responsibleId' || field === 'qualityControlId' || 
            field === 'requesterId' || field === 'createdById' || field === 'bookedById') {
          orConditions.push({ [field]: userId });
        } else if (field === 'roleId') {
          const userRoleId = req.userRole?.role?.id;
          if (userRoleId) {
            orConditions.push({ [field]: userRoleId });
          }
        } else if (field === 'branchId') {
          if (req.branchId) {
            orConditions.push({ [field]: req.branchId });
          }
        }
      }
      
      const filter: any = {};
      
      if (req.organizationId) {
        filter.organizationId = req.organizationId;
      }
      
      if (orConditions.length > 0) {
        filter.OR = orConditions;
      }
      
      return filter;
    }
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
      logger.log('[getDataIsolationFilter] Task filter:', {
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
      
      logger.log('[getDataIsolationFilter] Final task filter:', JSON.stringify(taskFilter, null, 2));
      
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
      // WICHTIG: Wenn organizationId null/undefined ist, gibt es keine Ergebnisse
      if (!req.organizationId) {
        // Keine Organisation: Garantiert keine Ergebnisse (sicherer als leeres Objekt)
        return { id: -1 };
      }
      return {
        organizationId: req.organizationId
      };
    
    case 'user':
      // User-Filterung bleibt komplex (über UserRole)
      if (!req.organizationId) {
        // Keine Organisation: Nur eigene User-Daten
        return { id: userId };
      }
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
      // Rollen: Nur Rollen der Organisation
      if (!req.organizationId) {
        // Keine Organisation: Garantiert keine Ergebnisse
        return { id: -1 };
      }
      return {
        organizationId: req.organizationId
      };
    
    default:
      return {};
  }
};

// ✅ ROLLEN-ISOLATION: Hilfsfunktionen für Rollen-Prüfung
/**
 * Prüft, ob der User eine Admin-Rolle hat
 */
export const isAdminRole = (req: Request): boolean => {
  const roleName = req.userRole?.role?.name;
  if (!roleName) return false;
  const roleNameLower = roleName.toLowerCase();
  return roleNameLower === 'admin' || roleNameLower.includes('administrator');
};

/**
 * Prüft, ob der User eine Owner-Rolle hat
 */
export const isOwnerRole = (req: Request): boolean => {
  const roleName = req.userRole?.role?.name;
  if (!roleName) return false;
  const roleNameLower = roleName.toLowerCase();
  return roleNameLower === 'owner';
};

/**
 * Prüft, ob der User Admin oder Owner ist
 */
export const isAdminOrOwner = (req: Request): boolean => {
  return isAdminRole(req) || isOwnerRole(req);
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
    logger.error(`Fehler in belongsToOrganization für ${entity}:`, error);
    return false;
  }
}; 