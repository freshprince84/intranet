import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { organizationCache } from '../utils/organizationCache';
import { z } from 'zod';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { encryptApiSettings, decryptApiSettings } from '../utils/encryption';
import { validateAllApiUrls } from '../utils/urlValidation';
import { validateApiSettings } from '../validation/organizationSettingsSchema';
import { logger } from '../utils/logger';
import { logSettingsChange } from '../services/auditService';
import {
  ALL_PAGES as CENTRAL_PAGES,
  ALL_BOXES as CENTRAL_BOXES,
  ALL_TABS as CENTRAL_TABS,
  ALL_BUTTONS as CENTRAL_BUTTONS,
  ADMIN_PERMISSIONS,
  USER_PERMISSIONS,
  HAMBURGER_PERMISSIONS,
  AccessLevel as NewAccessLevel,
  generatePermissionsForRole,
} from '../config/permissions';

// Definiere AccessLevel als String-Literale (mit Legacy-Support)
type AccessLevel = 'read' | 'write' | 'both' | 'none' | NewAccessLevel;

// Validation Schemas
const createOrganizationSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  displayName: z.string().min(1, 'Anzeigename ist erforderlich'),
  maxUsers: z.number().min(1, 'Maximale Benutzeranzahl muss mindestens 1 sein').optional(),
  subscriptionPlan: z.enum(['basic', 'pro', 'enterprise', 'trial']).optional(),
  domain: z.string().optional()
});

const updateOrganizationSchema = z.object({
  displayName: z.string().min(1).optional(),
  maxUsers: z.number().min(1).optional(),
  subscriptionPlan: z.enum(['basic', 'pro', 'enterprise', 'trial']).optional(),
  isActive: z.boolean().optional(),
  domain: z.string().optional(),
  logo: z.string().optional(),
  country: z.string().optional().nullable(),
  nit: z.string().optional().nullable(),
  settings: z.record(z.any()).optional() // Wird in updateCurrentOrganization spezifisch validiert
});

const languageSchema = z.enum(['es', 'de', 'en']);

// Alle Organisationen abrufen
export const getAllOrganizations = async (_req: Request, res: Response) => {
  try {
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            roles: true,
            joinRequests: true,
            invitations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(organizations);
  } catch (error) {
    logger.error('Error in getAllOrganizations:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisationen', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation nach ID abrufen
export const getOrganizationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        roles: {
          select: {
            id: true,
            name: true,
            description: true,
            _count: {
              select: { users: true }
            }
          }
        },
        joinRequests: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            requester: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        invitations: {
          select: {
            id: true,
            email: true,
            expiresAt: true,
            acceptedAt: true,
            createdAt: true,
            role: {
              select: {
                id: true,
                name: true
              }
            },
            inviter: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    res.json(organization);
  } catch (error) {
    logger.error('Error in getOrganizationById:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Neue Organisation erstellen
export const createOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const validatedData = createOrganizationSchema.parse(req.body);

    // Normalisiere Name zu lowercase für Konsistenz
    const normalizedName = validatedData.name.toLowerCase().trim();
    
    // Prüfe ob Name bereits existiert
    const existingOrg = await prisma.organization.findUnique({
      where: { name: normalizedName }
    });

    if (existingOrg) {
      return res.status(400).json({ message: 'Organisation mit diesem Namen existiert bereits' });
    }
    
    // Prüfe auch Domain falls angegeben
    if (validatedData.domain) {
      const normalizedDomain = validatedData.domain.toLowerCase().trim();
      const existingOrgByDomain = await prisma.organization.findUnique({
        where: { domain: normalizedDomain }
      });
      
      if (existingOrgByDomain) {
        return res.status(400).json({ message: 'Organisation mit dieser Domain existiert bereits' });
      }
    }

    // ============================================
    // PERMISSION-LISTEN AUS ZENTRALER QUELLE
    // ============================================
    // Importiert aus backend/src/config/permissions.ts
    const ALL_PAGES = CENTRAL_PAGES.map(p => p.entity);
    const ALL_BOXES = CENTRAL_BOXES.map(b => b.entity);
    const ALL_TABS = CENTRAL_TABS.map(t => t.entity);
    const ALL_BUTTONS = CENTRAL_BUTTONS.map(b => b.entity);
    
    // Kombiniert: Boxes + Tabs für Legacy-Kompatibilität (wurden früher als 'table' gespeichert)
    const ALL_TABLES = [...ALL_BOXES, ...ALL_TABS];

    // Erstelle Organisation und Admin-Rolle in einer Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Organisation erstellen
      const normalizedName = validatedData.name.toLowerCase().trim();
      const normalizedDomain = validatedData.domain ? validatedData.domain.toLowerCase().trim() : null;
      
      const organization = await tx.organization.create({
        data: {
          name: normalizedName,
          displayName: validatedData.displayName.trim(),
          maxUsers: validatedData.maxUsers ?? 50, // Default 50 falls nicht angegeben
          subscriptionPlan: validatedData.subscriptionPlan ?? 'basic', // Default 'basic' falls nicht angegeben
          domain: normalizedDomain,
          isActive: true
        }
      });

      // 2. Admin-Rolle für die Organisation erstellen
      const adminRole = await tx.role.create({
        data: {
          name: 'Admin',
          description: 'Administrator der Organisation',
          organizationId: organization.id
        }
      });

      // 3. Alle Berechtigungen für Admin-Rolle aus zentraler Definition erstellen
      // Admin hat all_both (voller Zugriff) auf alle Entities
      const adminPermissions = generatePermissionsForRole(adminRole.id, ADMIN_PERMISSIONS);
      
      // Branch-basierte Reservations-Berechtigungen für Admin (alle Branches)
      adminPermissions.push({
        entity: 'reservations_all_branches',
        entityType: 'table',
        accessLevel: 'all_read',
        roleId: adminRole.id
      });
      
      // Cerebro-spezifische Berechtigungen für Admin
      adminPermissions.push({
        entity: 'cerebro',
        entityType: 'cerebro',
        accessLevel: 'all_both',
        roleId: adminRole.id
      });
      adminPermissions.push({
        entity: 'cerebro_media',
        entityType: 'cerebro',
        accessLevel: 'all_both',
        roleId: adminRole.id
      });
      adminPermissions.push({
        entity: 'cerebro_links',
        entityType: 'cerebro',
        accessLevel: 'all_both',
        roleId: adminRole.id
      });
      
      await tx.permission.createMany({
        data: adminPermissions
      });

      // 3b. User-Rolle für die Organisation erstellen
      const userRole = await tx.role.create({
        data: {
          name: 'User',
          description: 'Standardbenutzer der Organisation',
          organizationId: organization.id
        }
      });

      // 3c. Berechtigungen für User-Rolle aus zentraler Definition erstellen
      const userPermissions = generatePermissionsForRole(userRole.id, USER_PERMISSIONS);
      
      // Cerebro-spezifische Berechtigungen für User
      userPermissions.push({
        entity: 'cerebro',
        entityType: 'cerebro',
        accessLevel: 'all_both',
        roleId: userRole.id
      });
      userPermissions.push({
        entity: 'cerebro_media',
        entityType: 'cerebro',
        accessLevel: 'all_both',
        roleId: userRole.id
      });
      userPermissions.push({
        entity: 'cerebro_links',
        entityType: 'cerebro',
        accessLevel: 'all_both',
        roleId: userRole.id
      });
      
      // Branch-basierte Reservations-Berechtigungen für User (nur eigene Branch)
      userPermissions.push({
        entity: 'reservations_own_branch',
        entityType: 'table',
        accessLevel: 'own_read',
        roleId: userRole.id
      });
      
      await tx.permission.createMany({
        data: userPermissions
      });

      // 3d. Hamburger-Rolle für die Organisation erstellen
      const hamburgerRole = await tx.role.create({
        data: {
          name: 'Hamburger',
          description: 'Hamburger-Rolle für neue Benutzer der Organisation',
          organizationId: organization.id
        }
      });

      // 3e. Berechtigungen für Hamburger-Rolle aus zentraler Definition erstellen
      const hamburgerPermissions = generatePermissionsForRole(hamburgerRole.id, HAMBURGER_PERMISSIONS);
      
      // Cerebro-spezifische Berechtigungen für Hamburger-Rolle
      hamburgerPermissions.push({
        entity: 'cerebro',
        entityType: 'cerebro',
        accessLevel: 'all_read',
        roleId: hamburgerRole.id
      });
      hamburgerPermissions.push({
        entity: 'cerebro_media',
        entityType: 'cerebro',
        accessLevel: 'all_read',
        roleId: hamburgerRole.id
      });
      hamburgerPermissions.push({
        entity: 'cerebro_links',
        entityType: 'cerebro',
        accessLevel: 'all_read',
        roleId: hamburgerRole.id
      });

      await tx.permission.createMany({
        data: hamburgerPermissions
      });

      // 4. Deaktiviere alle anderen Rollen des Users (setze lastUsed auf false)
      // WICHTIG: Wir löschen KEINE Rollen ohne Organisation, damit der User später
      // mehreren Organisationen angehören kann (z.B. als "Oberadmin")
      await tx.userRole.updateMany({
        where: {
          userId: Number(userId),
          lastUsed: true
        },
        data: {
          lastUsed: false
        }
      });

      // 5. Weise den Ersteller zur Admin-Rolle zu (als lastUsed)
      // Dies aktiviert die neue Admin-Rolle der erstellten Organisation
      await tx.userRole.create({
        data: {
          userId: Number(userId),
          roleId: adminRole.id,
          lastUsed: true
        }
      });

      return {
        organization: {
          id: organization.id,
          name: organization.name,
          displayName: organization.displayName,
          isActive: organization.isActive,
          maxUsers: organization.maxUsers,
          subscriptionPlan: organization.subscriptionPlan,
          createdAt: organization.createdAt,
          updatedAt: organization.updatedAt
        },
        adminRoleId: adminRole.id
      };
    });

    logger.log(`✅ Organisation "${result.organization.displayName}" erstellt. Ersteller (User ${userId}) ist jetzt Admin.`);

    res.status(201).json(result.organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: error.errors 
      });
    }

    logger.error('Error in createOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Erstellen der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation aktualisieren
export const updateOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    const validatedData = updateOrganizationSchema.parse(req.body);

    // Prüfe ob Organisation existiert
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!existingOrg) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: validatedData,
      select: {
        id: true,
        name: true,
        displayName: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(organization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: error.errors 
      });
    }

    logger.error('Error in updateOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation löschen
export const deleteOrganization = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = parseInt(id);

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    // Prüfe ob es die Standard-Organisation ist
    if (organizationId === 1) {
      return res.status(400).json({ message: 'Standard-Organisation kann nicht gelöscht werden' });
    }

    // Prüfe ob Organisation existiert
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            roles: true,
            joinRequests: true,
            invitations: true
          }
        }
      }
    });

    if (!existingOrg) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    // Prüfe ob Organisation noch Abhängigkeiten hat
    if (existingOrg._count.roles > 0) {
      return res.status(400).json({ 
        message: 'Organisation kann nicht gelöscht werden - noch Rollen vorhanden' 
      });
    }

    // Lösche zuerst abhängige Datensätze
    await prisma.$transaction(async (tx) => {
      // Lösche Join Requests
      await tx.organizationJoinRequest.deleteMany({
        where: { organizationId }
      });

      // Lösche Invitations
      await tx.organizationInvitation.deleteMany({
        where: { organizationId }
      });

      // Lösche Organisation
      await tx.organization.delete({
        where: { id: organizationId }
      });
    });

    res.json({ message: 'Organisation erfolgreich gelöscht' });
  } catch (error) {
    logger.error('Error in deleteOrganization:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation-Statistiken abrufen
export const getOrganizationStats = async (req: Request, res: Response) => {
  try {
    // Verwende organizationId aus Middleware (für /current/stats) oder aus params (für /:id/stats)
    const organizationId = req.organizationId || (req.params.id ? parseInt(req.params.id) : null);

    if (!organizationId || isNaN(organizationId)) {
      return res.status(400).json({ message: 'Ungültige Organisations-ID' });
    }

    const stats = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        displayName: true,
        maxUsers: true,
        _count: {
          select: {
            roles: true,
            joinRequests: true,
            invitations: true
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    // Berechne aktuelle Benutzeranzahl über Rollen
    const userCount = await prisma.userRole.count({
      where: {
        role: {
          organizationId: organizationId
        }
      }
    });

    const response = {
      ...stats,
      currentUsers: userCount,
      availableSlots: stats.maxUsers - userCount,
      utilizationPercent: Math.round((userCount / stats.maxUsers) * 100)
    };

    res.json(response);
  } catch (error) {
    logger.error('Error in getOrganizationStats:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisations-Statistiken', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Aktuelle Organisation abrufen (basierend auf User-Kontext)
export const getCurrentOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // ✅ PERFORMANCE: Verwende OrganizationCache statt DB-Query
    const cachedData = await organizationCache.get(Number(userId));
    
    if (!cachedData || !cachedData.userRole) {
      return res.status(404).json({ 
        message: 'Keine Organisation gefunden',
        hasOrganization: false,
        hint: 'Sie haben noch keine Organisation. Bitte erstellen Sie eine oder treten Sie einer bei.'
      });
    }

    // Prüfe ob Settings geladen werden sollen (Query-Parameter)
    const includeSettings = req.query.includeSettings === 'true';

    // Hole Organization-Daten aus Cache (userRole.role.organization ist bereits geladen)
    let organization = cachedData.userRole.role.organization;
    
    // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
    if (includeSettings && organization) {
      // ✅ MONITORING: Timing-Log für Settings-Query
      const settingsStartTime = Date.now();
      const orgWithSettings = await prisma.organization.findUnique({
        where: { id: organization.id },
        select: {
          id: true,
          name: true,
          displayName: true,
          domain: true,
          logo: true,
          isActive: true,
          maxUsers: true,
          subscriptionPlan: true,
          country: true,
          nit: true,
          createdAt: true,
          updatedAt: true,
          settings: true // Settings nur wenn explizit angefragt
        }
      });
      const settingsDuration = Date.now() - settingsStartTime;
      
      if (orgWithSettings) {
        organization = orgWithSettings;
        // ✅ ENTschlüssele Settings für Response
        const { decryptApiSettings } = await import('../utils/encryption');
        const decryptStartTime = Date.now();
        organization.settings = decryptApiSettings(organization.settings as any);
        const decryptDuration = Date.now() - decryptStartTime;
        
        // ✅ MONITORING: Settings-Größe und Performance loggen
        const settingsSize = JSON.stringify(orgWithSettings.settings || {}).length;
        logger.log(`[getCurrentOrganization] ⏱️ Settings-Query: ${settingsDuration}ms | Decrypt: ${decryptDuration}ms | Size: ${(settingsSize / 1024 / 1024).toFixed(2)} MB`);
      }
    } else {
      // Settings nicht geladen - setze auf null für Frontend
      if (organization) {
        organization.settings = null;
      }
    }

    // Prüfe ob die Rolle eine Organisation hat
    if (!organization) {
      return res.status(404).json({ 
        message: 'Keine Organisation gefunden',
        hasOrganization: false,
        hint: 'Sie haben noch keine Organisation. Bitte erstellen Sie eine oder treten Sie einer bei.'
      });
    }

    // Korrigiere String 'null' zu echtem null
    if (organization.logo === 'null') {
      organization.logo = null;
    }

    res.json(organization);
  } catch (error) {
    logger.error('Fehler beim Abrufen der Organisation:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beitrittsanfrage erstellen
export const createJoinRequest = async (req: Request, res: Response) => {
  try {
    const { organizationName, message } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    if (!organizationName) {
      return res.status(400).json({ message: 'Organisationsname ist erforderlich' });
    }

    // Finde Organisation
    const organization = await prisma.organization.findUnique({
      where: { name: organizationName.toLowerCase() }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    // Prüfe ob bereits Anfrage existiert
    const existingRequest = await prisma.organizationJoinRequest.findUnique({
      where: {
        organizationId_requesterId: {
          organizationId: organization.id,
          requesterId: Number(userId)
        }
      }
    });

    if (existingRequest) {
      return res.status(409).json({ message: 'Beitrittsanfrage bereits gestellt' });
    }

    const joinRequest = await prisma.organizationJoinRequest.create({
      data: {
        organizationId: organization.id,
        requesterId: Number(userId),
        message: message || null
      },
      include: {
        organization: true,
        requester: true
      }
    });

    res.status(201).json(joinRequest);
  } catch (error) {
    logger.error('Fehler beim Erstellen der Beitrittsanfrage:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beitrittsanfragen abrufen
export const getJoinRequests = async (req: Request, res: Response) => {
  try {
    logger.log('=== getJoinRequests CALLED ===');
    const userId = req.userId;
    logger.log('userId:', userId);
    logger.log('req.organizationId:', req.organizationId);

    if (!userId) {
      logger.log('❌ No userId, returning 401');
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Verwende req.organizationId aus Middleware (wie getOrganizationStats)
    if (!req.organizationId) {
      logger.log('❌ No organizationId, returning 400');
      return res.status(400).json({ 
        message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
      });
    }

    logger.log('✅ Fetching join requests for organizationId:', req.organizationId);
    const joinRequests = await prisma.organizationJoinRequest.findMany({
      where: { organizationId: req.organizationId },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        processor: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    logger.log('✅ Found join requests:', joinRequests.length);
    logger.log('✅ Returning join requests to frontend');
    res.json(joinRequests);
  } catch (error) {
    logger.error('❌ Error in getJoinRequests:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Beitrittsanfrage bearbeiten
export const processJoinRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, response, roleId } = req.body; // action: 'approve' | 'reject'
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfe ob User eine Organisation hat
    if (!req.organizationId) {
      return res.status(400).json({ 
        message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar' 
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Ungültige Aktion' });
    }

    // Hole Beitrittsanfrage
    const joinRequest = await prisma.organizationJoinRequest.findUnique({
      where: { id: Number(id) },
      include: {
        organization: true,
        requester: true
      }
    });

    if (!joinRequest) {
      return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
    }

    // Prüfe ob JoinRequest zur Organisation des Users gehört
    if (joinRequest.organizationId !== req.organizationId) {
      return res.status(403).json({ message: 'Keine Berechtigung für diese Beitrittsanfrage' });
    }

    if (joinRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Anfrage bereits bearbeitet' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Aktualisiere Beitrittsanfrage
      const updatedRequest = await tx.organizationJoinRequest.update({
        where: { id: Number(id) },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          response: response || null,
          processedBy: Number(userId),
          processedAt: new Date()
        }
      });

      if (action === 'approve') {
        // Erstelle UserRole-Eintrag
        let targetRoleId = roleId ? Number(roleId) : null;

        // Falls keine Rolle angegeben, verwende Hamburger-Rolle als Standard
        if (!targetRoleId) {
          const hamburgerRole = await tx.role.findFirst({
            where: {
              organizationId: joinRequest.organizationId,
              name: 'Hamburger'
            }
          });

          if (!hamburgerRole) {
            throw new Error('Hamburger-Rolle für Organisation nicht gefunden');
          }

          targetRoleId = hamburgerRole.id;
        }

        await tx.userRole.create({
          data: {
            userId: joinRequest.requesterId,
            roleId: targetRoleId,
            lastUsed: false // Nicht als aktiv setzen, da User bereits andere Rolle haben könnte
          }
        });

        // ✅ Erste Branch der Organisation dem User zuweisen
        // Bei Org-Beitritt braucht der User mindestens eine Branch
        const firstBranch = await tx.branch.findFirst({
          where: { organizationId: joinRequest.organizationId },
          orderBy: { id: 'asc' }
        });

        if (firstBranch) {
          // Prüfe ob User diese Branch schon hat
          const existingUserBranch = await tx.usersBranches.findFirst({
            where: {
              userId: joinRequest.requesterId,
              branchId: firstBranch.id
            }
          });

          if (!existingUserBranch) {
            await tx.usersBranches.create({
              data: {
                userId: joinRequest.requesterId,
                branchId: firstBranch.id,
                lastUsed: false // Nicht aktiv, da User bereits andere Rolle/Branch haben kann
              }
            });
          }
        }
      }

      return updatedRequest;
    });

    res.json(result);
  } catch (error) {
    logger.error('Fehler beim Bearbeiten der Beitrittsanfrage:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Organisationen für Join-Request suchen
export const searchOrganizations = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (!search || typeof search !== 'string') {
      return res.status(400).json({ message: 'Suchbegriff ist erforderlich' });
    }

    const organizations = await prisma.organization.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: search.toLowerCase() } },
              { displayName: { contains: search, mode: 'insensitive' } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        logo: true
      },
      take: 10
    });

    res.json(organizations);
  } catch (error) {
    logger.error('Fehler beim Suchen von Organisationen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Organisation-Sprache abrufen
export const getOrganizationLanguage = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole die aktuelle Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!userRole?.role.organization) {
      return res.status(404).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = userRole.role.organization;
    const settings = organization.settings as any;

    // Lese Sprache aus settings JSON-Feld
    const language = settings?.language || null;

    res.json({ language });
  } catch (error) {
    logger.error('Fehler beim Abrufen der Organisation-Sprache:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Organisation-Sprache', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Organisation-Sprache aktualisieren
export const updateOrganizationLanguage = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Validiere Sprache
    const { language } = req.body;
    const validatedLanguage = languageSchema.parse(language);

    // Hole die aktuelle Organisation des Users
    const userRole = await prisma.userRole.findFirst({
      where: { 
        userId: Number(userId),
        lastUsed: true 
      },
      include: {
        role: {
          include: {
            organization: true
          }
        }
      }
    });

    if (!userRole?.role.organization) {
      return res.status(404).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = userRole.role.organization;
    const currentSettings = (organization.settings as any) || {};

    // Aktualisiere Sprache in settings JSON-Feld
    const updatedSettings = {
      ...currentSettings,
      language: validatedLanguage
    };

    const updatedOrganization = await prisma.organization.update({
      where: { id: organization.id },
      data: {
        settings: updatedSettings
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    res.json({ 
      language: validatedLanguage,
      organization: updatedOrganization
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Ungültige Sprache', 
        errors: error.errors 
      });
    }

    logger.error('Fehler beim Aktualisieren der Organisation-Sprache:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Organisation-Sprache', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
    });
  }
};

// Aktuelle Organisation aktualisieren (basierend auf User-Kontext)
export const updateCurrentOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Debug: Logge Request-Body
    logger.log('=== REQUEST BODY DEBUG ===');
    logger.log('req.body.logo vorhanden:', !!req.body.logo);
    logger.log('req.body.logo type:', typeof req.body.logo);
    logger.log('req.body.logo length:', req.body.logo?.length);
    logger.log('req.body keys:', Object.keys(req.body));
    
    // Validiere Eingabedaten
    const validatedData = updateOrganizationSchema.parse(req.body);

    // Hole die aktuelle Organisation des Users mit Berechtigungen
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

    if (!userRole?.role.organization) {
      return res.status(404).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = userRole.role.organization;

    // 🔒 BERECHTIGUNGSPRÜFUNG: Prüfe ob User Settings ändern darf
    const hasPermission = userRole.role.permissions.some(
      p => p.entity === 'organization_management' && 
           ['both', 'write'].includes(p.accessLevel)
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Keine Berechtigung, Organisation-Einstellungen zu ändern' });
    }

      // Wenn settings aktualisiert werden, validiere und verschlüssele sie
    let updateData = { ...validatedData };
    
    // Debug: Logge Logo-Daten
    logger.log('=== ORGANIZATION UPDATE DEBUG ===');
    logger.log('validatedData.logo:', validatedData.logo ? (validatedData.logo === 'null' ? 'String "null"' : `${validatedData.logo.substring(0, 50)}...`) : 'null/undefined');
    logger.log('validatedData.logo type:', typeof validatedData.logo);
    logger.log('validatedData.logo length:', validatedData.logo?.length);
    logger.log('validatedData.logo === "null":', validatedData.logo === 'null');
    logger.log('updateData.logo:', updateData.logo ? (updateData.logo === 'null' ? 'String "null"' : `${updateData.logo.substring(0, 50)}...`) : 'null/undefined');
    if (validatedData.settings !== undefined) {
      const currentSettings = (organization.settings as any) || {};
        const newSettings = { ...currentSettings, ...validatedData.settings };
        
        // ✅ LobbyPMS: Setze feste URL wenn nicht vorhanden
        if (newSettings.lobbyPms && !newSettings.lobbyPms.apiUrl) {
          newSettings.lobbyPms.apiUrl = 'https://api.lobbypms.com';
        }

      // ✅ VALIDIERUNG: Validiere API-Settings-Struktur
      try {
        validateApiSettings(newSettings);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          return res.status(400).json({ 
            message: 'Validierungsfehler bei API-Einstellungen', 
            errors: validationError.errors 
          });
        }
        throw validationError;
      }

      // ✅ URL-VALIDIERUNG: Prüfe alle API-URLs gegen Whitelist
      const urlErrors = validateAllApiUrls(newSettings);
      if (urlErrors.length > 0) {
        return res.status(400).json({ 
          message: 'Ungültige API-URLs', 
          errors: urlErrors 
        });
      }

      // ✅ TTLOCK PASSWORD: MD5-Hash für TTLock Password erstellen (falls vorhanden)
      if (newSettings.doorSystem?.password && !newSettings.doorSystem.password.match(/^[a-f0-9]{32}$/i)) {
        // Password ist noch nicht gehasht (32-stelliger MD5-Hash)
        const crypto = require('crypto');
        newSettings.doorSystem.password = crypto.createHash('md5').update(newSettings.doorSystem.password).digest('hex');
        logger.log('[TTLock] Password wurde MD5-gehasht');
      }

      // ✅ VERSCHLÜSSELUNG: Verschlüssele alle API-Keys vor dem Speichern
      // ✅ PERFORMANCE: encryptApiSettings prüft jetzt ob bereits verschlüsselt (verhindert mehrfache Verschlüsselung)
      try {
        const encryptedSettings = encryptApiSettings(newSettings);
        
        // ✅ PERFORMANCE: Validiere Settings-Größe (Warnung bei > 1 MB)
        const settingsSize = JSON.stringify(encryptedSettings).length;
        if (settingsSize > 1024 * 1024) { // > 1 MB
          logger.warn(`[updateCurrentOrganization] ⚠️ Settings sind sehr groß: ${(settingsSize / 1024 / 1024).toFixed(2)} MB`);
          logger.warn(`[updateCurrentOrganization] ⚠️ Möglicherweise mehrfach verschlüsselte API-Keys vorhanden!`);
        }
        
        updateData.settings = encryptedSettings;
      } catch (encryptionError) {
        logger.error('Error encrypting API settings:', encryptionError);
        // Wenn ENCRYPTION_KEY nicht gesetzt ist, speichere unverschlüsselt (für Migration)
        // TODO: Später sollte dies ein Fehler sein
        if (encryptionError instanceof Error && encryptionError.message.includes('ENCRYPTION_KEY')) {
          logger.warn('⚠️ ENCRYPTION_KEY nicht gesetzt - speichere unverschlüsselt (nur für Migration!)');
          updateData.settings = newSettings;
        } else {
          throw encryptionError;
        }
      }

      // ⚠️ WICHTIG: Email-Reading für Organisation 1 (La Familia Hostel) ist STANDARDMÄSSIG aktiviert
      // Das Seed-Script stellt sicher, dass Email-Reading für Organisation 1 immer aktiviert ist
      // Wenn Email-Reading deaktiviert wird, wird es beim nächsten Seed automatisch wieder aktiviert
      if (organization.id === 1 && newSettings.emailReading) {
        // Stelle sicher, dass Email-Reading für Organisation 1 aktiviert bleibt
        if (newSettings.emailReading.enabled === false) {
          logger.warn('[OrganizationController] ⚠️ Email-Reading für Organisation 1 wurde deaktiviert - wird beim nächsten Seed wieder aktiviert');
        }
      }

      // ✅ AUDIT-LOG: Protokolliere Settings-Änderungen
      await logSettingsChange(
        organization.id,
        Number(userId),
        currentSettings,
        newSettings,
        req.ip,
        req.get('user-agent')
      );
    }

    // Debug: Logge updateData vor dem Speichern
    logger.log('updateData vor Prisma Update:', {
      ...updateData,
      logo: updateData.logo ? `${updateData.logo.substring(0, 50)}...` : updateData.logo
    });
    
    // Stelle sicher, dass leere Strings und String 'null' als null gespeichert werden
    if (updateData.logo !== undefined) {
      if (updateData.logo === '' || 
          (typeof updateData.logo === 'string' && updateData.logo.trim() === '') ||
          updateData.logo === 'null' ||
          updateData.logo === null) {
        updateData.logo = null;
        logger.log('Logo ist leerer String oder String "null", setze auf null');
      }
    }
    
    // Aktualisiere Organisation
    const updatedOrganization = await prisma.organization.update({
      where: { id: organization.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        displayName: true,
        domain: true,
        logo: true,
        isActive: true,
        maxUsers: true,
        subscriptionPlan: true,
        country: true,
        nit: true,
        settings: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // ✅ ENTschlüssele Settings für Response (Frontend braucht entschlüsselte Werte)
    if (updatedOrganization.settings) {
      try {
        updatedOrganization.settings = decryptApiSettings(updatedOrganization.settings as any);
      } catch (decryptionError) {
        logger.error('Error decrypting API settings:', decryptionError);
        // Bei Fehler: Settings bleiben verschlüsselt (für Migration)
        // Frontend zeigt dann verschlüsselte Werte, aber das ist OK für Migration
      }
    }
    
    // Debug: Logge gespeichertes Logo
    logger.log('Gespeichertes Logo in DB:', updatedOrganization.logo ? `${updatedOrganization.logo.substring(0, 50)}...` : 'null');
    logger.log('Logo length:', updatedOrganization.logo?.length);

    res.json(updatedOrganization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validierungsfehler', 
        errors: error.errors 
      });
    }

    logger.error('Error in updateCurrentOrganization:', error);
    logger.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren der Organisation', 
      error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
};

// Lebenszyklus-Rollen-Konfiguration abrufen
export const getLifecycleRoles = async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { settings: true }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const settings = organization.settings as any;
    const lifecycleRoles = settings?.lifecycleRoles || null;

    // Hole alle verfügbaren Rollen der Organisation
    const roles = await prisma.role.findMany({
      where: { organizationId: req.organizationId },
      select: {
        id: true,
        name: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      lifecycleRoles,
      availableRoles: roles
    });
  } catch (error) {
    logger.error('Error in getLifecycleRoles:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Lebenszyklus-Rollen',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

// Lebenszyklus-Rollen-Konfiguration aktualisieren
export const updateLifecycleRoles = async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Keine Organisation gefunden' });
    }

    const { adminRoleId, hrRoleId, legalRoleId, employeeRoleIds } = req.body;

    logger.log('[updateLifecycleRoles] Request body:', { adminRoleId, hrRoleId, legalRoleId, employeeRoleIds });
    logger.log('[updateLifecycleRoles] Organization ID:', req.organizationId);

    // Validiere Rollen-IDs (nur wenn sie gesetzt sind und > 0)
    // Konvertiere zu Number und prüfe, ob gültig
    const parseRoleId = (id: any): number | null => {
      if (id === null || id === undefined || id === '' || id === 'null' || id === 'undefined') {
        return null;
      }
      const parsed = parseInt(String(id), 10);
      return (!isNaN(parsed) && parsed > 0) ? parsed : null;
    };

    const parsedAdminRoleId = parseRoleId(adminRoleId);
    const parsedHrRoleId = parseRoleId(hrRoleId);
    const parsedLegalRoleId = parseRoleId(legalRoleId);
    const parsedEmployeeRoleIds = (employeeRoleIds || []).map(parseRoleId).filter((id): id is number => id !== null);

    logger.log('[updateLifecycleRoles] Parsed role IDs:', { 
      admin: parsedAdminRoleId, 
      hr: parsedHrRoleId, 
      legal: parsedLegalRoleId, 
      employees: parsedEmployeeRoleIds 
    });

    // Prüfe auf doppelte Rollen (Admin, HR, Legal müssen unterschiedlich sein)
    const uniqueRoleIds = new Set<number>();
    const duplicates: string[] = [];
    
    if (parsedAdminRoleId) {
      if (parsedAdminRoleId === parsedHrRoleId && parsedHrRoleId !== null) {
        duplicates.push('Admin und HR dürfen nicht die gleiche Rolle verwenden');
      }
      if (parsedAdminRoleId === parsedLegalRoleId && parsedLegalRoleId !== null) {
        duplicates.push('Admin und Legal dürfen nicht die gleiche Rolle verwenden');
      }
      uniqueRoleIds.add(parsedAdminRoleId);
    }
    
    if (parsedHrRoleId) {
      if (parsedHrRoleId === parsedLegalRoleId && parsedLegalRoleId !== null) {
        duplicates.push('HR und Legal dürfen nicht die gleiche Rolle verwenden');
      }
      uniqueRoleIds.add(parsedHrRoleId);
    }
    
    if (parsedLegalRoleId) {
      uniqueRoleIds.add(parsedLegalRoleId);
    }

    if (duplicates.length > 0) {
      return res.status(400).json({
        message: 'Rollen-Konfiguration ungültig',
        details: duplicates
      });
    }

    const roleIds = [
      parsedAdminRoleId,
      parsedHrRoleId,
      parsedLegalRoleId,
      ...parsedEmployeeRoleIds
    ].filter((id): id is number => id !== null);
    
    if (roleIds.length > 0) {
      // Hole ALLE Rollen der Organisation für Debugging
      const allOrgRoles = await prisma.role.findMany({
        where: { organizationId: req.organizationId },
        select: { id: true, name: true }
      });
      logger.log('[updateLifecycleRoles] All roles in organization:', allOrgRoles);

      const validRoles = await prisma.role.findMany({
        where: {
          id: { in: roleIds },
          organizationId: req.organizationId
        },
        select: { id: true, name: true, organizationId: true }
      });

      logger.log('[updateLifecycleRoles] Valid roles found:', validRoles);
      logger.log('[updateLifecycleRoles] Requested role IDs:', roleIds);

      if (validRoles.length !== roleIds.length) {
        const missingRoleIds = roleIds.filter(id => !validRoles.some(r => r.id === id));
        logger.error('[updateLifecycleRoles] Missing roles:', missingRoleIds);
        return res.status(400).json({ 
          message: 'Eine oder mehrere Rollen gehören nicht zu dieser Organisation',
          details: { 
            requested: roleIds, 
            found: validRoles.map(r => r.id),
            missing: missingRoleIds,
            organizationId: req.organizationId,
            allOrgRoles: allOrgRoles.map(r => ({ id: r.id, name: r.name }))
          }
        });
      }
    }

    // Hole aktuelle Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { settings: true }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const settings = (organization.settings as any) || {};
    
    // Konvertiere zu Number oder null (verhindert, dass 0 als gültige ID gespeichert wird)
    const normalizeRoleId = (id: any): number | null => {
      if (id === null || id === undefined || id === '' || id === 'null' || id === 'undefined') {
        return null;
      }
      const parsed = parseInt(String(id), 10);
      return (!isNaN(parsed) && parsed > 0) ? parsed : null;
    };
    
    const normalizedAdminRoleId = normalizeRoleId(adminRoleId);
    const normalizedHrRoleId = normalizeRoleId(hrRoleId);
    const normalizedLegalRoleId = normalizeRoleId(legalRoleId);
    const normalizedEmployeeRoleIds = (employeeRoleIds || []).map(normalizeRoleId).filter((id): id is number => id !== null);

    logger.log('[updateLifecycleRoles] Normalized role IDs:', {
      admin: normalizedAdminRoleId,
      hr: normalizedHrRoleId,
      legal: normalizedLegalRoleId,
      employees: normalizedEmployeeRoleIds
    });

    settings.lifecycleRoles = {
      adminRoleId: normalizedAdminRoleId,
      hrRoleId: normalizedHrRoleId,
      legalRoleId: normalizedLegalRoleId,
      employeeRoleIds: normalizedEmployeeRoleIds
    };

    logger.log('[updateLifecycleRoles] Settings to save:', JSON.stringify(settings.lifecycleRoles, null, 2));

    // Aktualisiere Organisation
    const updated = await prisma.organization.update({
      where: { id: req.organizationId },
      data: { settings },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    logger.log('[updateLifecycleRoles] Organization updated successfully. Saved lifecycleRoles:', (updated.settings as any)?.lifecycleRoles);

    res.json({
      lifecycleRoles: (updated.settings as any)?.lifecycleRoles,
      message: 'Lebenszyklus-Rollen erfolgreich aktualisiert'
    });
  } catch (error) {
    logger.error('Error in updateLifecycleRoles:', error);
    res.status(500).json({
      message: 'Fehler beim Aktualisieren der Lebenszyklus-Rollen',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
}; 

// Multer-Konfiguration für Template-Uploads
const TEMPLATES_DIR = path.join(__dirname, '../../uploads/document-templates');
const SIGNATURES_DIR = path.join(__dirname, '../../uploads/document-signatures');

// Stelle sicher, dass die Verzeichnisse existieren
if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}
if (!fs.existsSync(SIGNATURES_DIR)) {
  fs.mkdirSync(SIGNATURES_DIR, { recursive: true });
}

const templateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMPLATES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `template-${uniqueSuffix}${ext}`);
  }
});

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, SIGNATURES_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `signature-${uniqueSuffix}${ext}`);
  }
});

const templateUpload = multer({
  storage: templateStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF-Dateien sind erlaubt'));
    }
  }
});

const signatureUpload = multer({
  storage: signatureStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder (JPEG, PNG, GIF) oder PDFs sind erlaubt'));
    }
  }
});

// Dokumenten-Templates abrufen
export const getDocumentTemplates = async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { settings: true }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const settings = (organization.settings as any) || {};
    const documentTemplates = settings.documentTemplates || {};

    res.json({
      documentTemplates: {
        employmentCertificate: documentTemplates.employmentCertificate || null,
        employmentContract: documentTemplates.employmentContract || null
      }
    });
  } catch (error) {
    logger.error('Error in getDocumentTemplates:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Dokumenten-Templates',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

// Template hochladen
export const uploadDocumentTemplate = async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Keine Organisation gefunden' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }

    const { type } = req.body; // 'employmentCertificate' oder 'employmentContract'
    
    if (!type || !['employmentCertificate', 'employmentContract'].includes(type)) {
      return res.status(400).json({ message: 'Ungültiger Template-Typ' });
    }

    // Hole aktuelle Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { settings: true }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const settings = (organization.settings as any) || {};
    if (!settings.documentTemplates) {
      settings.documentTemplates = {};
    }

    // Speichere Template-Informationen
    const relativePath = `document-templates/${req.file.filename}`;
    const existingTemplate = settings.documentTemplates[type];
    const newVersion = existingTemplate?.version 
      ? `${parseFloat(existingTemplate.version) + 0.1}.0` 
      : '1.0';

    settings.documentTemplates[type] = {
      path: relativePath,
      version: newVersion,
      uploadDate: new Date().toISOString()
    };

    // Aktualisiere Organisation
    await prisma.organization.update({
      where: { id: req.organizationId },
      data: { settings }
    });

    res.json({
      message: 'Template erfolgreich hochgeladen',
      template: settings.documentTemplates[type]
    });
  } catch (error) {
    logger.error('Error in uploadDocumentTemplate:', error);
    res.status(500).json({
      message: 'Fehler beim Hochladen des Templates',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

// Dokumenten-Signaturen abrufen
export const getDocumentSignatures = async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Keine Organisation gefunden' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { settings: true }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const settings = (organization.settings as any) || {};
    const documentSignatures = settings.documentSignatures || {};

    res.json({
      documentSignatures: {
        employmentCertificate: documentSignatures.employmentCertificate || null,
        employmentContract: documentSignatures.employmentContract || null
      }
    });
  } catch (error) {
    logger.error('Error in getDocumentSignatures:', error);
    res.status(500).json({
      message: 'Fehler beim Abrufen der Dokumenten-Signaturen',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

// Signatur hochladen
export const uploadDocumentSignature = async (req: Request, res: Response) => {
  try {
    if (!req.organizationId) {
      return res.status(400).json({ message: 'Keine Organisation gefunden' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Keine Datei hochgeladen' });
    }

    const { type, signerName, signerPosition, positionX, positionY, page } = req.body;
    
    if (!type || !['employmentCertificate', 'employmentContract'].includes(type)) {
      return res.status(400).json({ message: 'Ungültiger Signatur-Typ' });
    }

    if (!signerName) {
      return res.status(400).json({ message: 'Name des Unterzeichners ist erforderlich' });
    }

    // Hole aktuelle Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: req.organizationId },
      select: { settings: true }
    });

    if (!organization) {
      return res.status(404).json({ message: 'Organisation nicht gefunden' });
    }

    const settings = (organization.settings as any) || {};
    if (!settings.documentSignatures) {
      settings.documentSignatures = {};
    }

    // Speichere Signatur-Informationen
    const relativePath = `document-signatures/${req.file.filename}`;
    settings.documentSignatures[type] = {
      path: relativePath,
      signerName,
      signerPosition: signerPosition || null,
      position: {
        x: positionX ? parseFloat(positionX) : 400,
        y: positionY ? parseFloat(positionY) : 100,
        page: page ? parseInt(page, 10) : 1
      },
      uploadDate: new Date().toISOString()
    };

    // Aktualisiere Organisation
    await prisma.organization.update({
      where: { id: req.organizationId },
      data: { settings }
    });

    res.json({
      message: 'Signatur erfolgreich hochgeladen',
      signature: settings.documentSignatures[type]
    });
  } catch (error) {
    logger.error('Error in uploadDocumentSignature:', error);
    res.status(500).json({
      message: 'Fehler beim Hochladen der Signatur',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
};

// Multer-Middleware exportieren
export const uploadTemplateMiddleware = templateUpload.single('file');
export const uploadSignatureMiddleware = signatureUpload.single('file'); 