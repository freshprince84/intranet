import { Request, Response } from 'express';
import { getDataIsolationFilter } from '../middleware/organization';
import { prisma } from '../utils/prisma';
import { branchCache } from '../services/branchCache';
import { logger } from '../utils/logger';

interface TestBranch {
    id: number;
    name: string;
}

interface SwitchBranchRequest {
    branchId: number;
}

// Debug-Funktion ohne DB-Zugriff
export const getTest = async (_req: Request, res: Response) => {
    const testBranches: TestBranch[] = [
        { id: 1, name: "Test-Niederlassung 1" },
        { id: 2, name: "Test-Niederlassung 2" }
    ];
    res.json(testBranches);
};

// Alle Niederlassungen abrufen (optional gefiltert nach roleId)
export const getAllBranches = async (req: Request, res: Response) => {
    try {
        // Datenisolation: Zeigt alle Branches der Organisation oder nur eigene (wenn standalone)
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        
        // Optional: Filter nach roleId (aus Query-Parameter)
        const roleId = req.query.roleId ? parseInt(req.query.roleId as string, 10) : null;
        
        // Prisma Query vorbereiten
        const queryOptions: any = {
            where: branchFilter,
            orderBy: { name: 'asc' }
        };
        
        // Wenn roleId vorhanden, füge roles Relation hinzu
        if (roleId && !isNaN(roleId)) {
            queryOptions.select = {
                id: true,
                name: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                messageTemplates: true,
                autoSendReservationInvitation: true,
                roles: {
                    where: { roleId: roleId },
                    select: { id: true }
                }
            };
        } else {
            queryOptions.select = {
                id: true,
                name: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                messageTemplates: true,
                autoSendReservationInvitation: true
            };
        }
        
        // ✅ MONITORING: Timing-Log für DB-Query
        const queryStartTime = Date.now();
        let branches = await prisma.branch.findMany(queryOptions);
        const queryDuration = Date.now() - queryStartTime;
        logger.log(`[getAllBranches] ⏱️ Query: ${queryDuration}ms | Branches: ${branches.length}`);
        
        // Entschlüssele alle Settings für alle Branches
        // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
        const { decryptBranchApiSettings } = await import('../utils/encryption');
        branches = branches.map((branch: any) => {
            // Entschlüssele WhatsApp Settings
            if (branch.whatsappSettings) {
                try {
                    branch.whatsappSettings = decryptBranchApiSettings(branch.whatsappSettings as any);
                } catch (error) {
                    logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings für Branch ${branch.id}:`, error);
                }
            }
            
            // Entschlüssele LobbyPMS Settings
            if (branch.lobbyPmsSettings) {
                try {
                    branch.lobbyPmsSettings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
                } catch (error) {
                    logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings für Branch ${branch.id}:`, error);
                }
            }
            
            // Entschlüssele Bold Payment Settings
            if (branch.boldPaymentSettings) {
                try {
                    const decrypted = decryptBranchApiSettings(branch.boldPaymentSettings as any);
                    // Stelle sicher, dass das Objekt nicht null/undefined wird, auch wenn Entschlüsselung fehlschlägt
                    if (decrypted && typeof decrypted === 'object') {
                        branch.boldPaymentSettings = decrypted;
                        // Log für Debugging: Prüfe ob Werte vorhanden sind (auch verschlüsselt)
                        // Wenn Entschlüsselung fehlgeschlagen ist, bleiben verschlüsselte Werte erhalten (mit ':')
                        const hasApiKey = decrypted.apiKey && typeof decrypted.apiKey === 'string';
                        const hasMerchantId = decrypted.merchantId && typeof decrypted.merchantId === 'string';
                        if (!hasApiKey && !hasMerchantId) {
                            logger.warn(`[Branch Controller] Bold Payment Settings für Branch ${branch.id} hat keine apiKey/merchantId Werte (auch nicht verschlüsselt)`);
                        } else if ((hasApiKey && decrypted.apiKey.includes(':')) || (hasMerchantId && decrypted.merchantId.includes(':'))) {
                            logger.info(`[Branch Controller] Bold Payment Settings für Branch ${branch.id} enthält verschlüsselte Werte (Entschlüsselung fehlgeschlagen)`);
                        }
                    } else {
                        // Falls Entschlüsselung komplett fehlschlägt, behalte Original
                        logger.warn(`[Branch Controller] Entschlüsselung von Bold Payment Settings für Branch ${branch.id} fehlgeschlagen, behalte Original`);
                    }
                } catch (error) {
                    logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Bold Payment Settings für Branch ${branch.id}:`, error);
                    // Bei Fehler: behalte Original-Settings (verschlüsselt)
                }
            }
            
            // Entschlüssele Door System Settings
            if (branch.doorSystemSettings) {
                try {
                    branch.doorSystemSettings = decryptBranchApiSettings(branch.doorSystemSettings as any);
                } catch (error) {
                    logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Door System Settings für Branch ${branch.id}:`, error);
                }
            }
            
            // Entschlüssele Email Settings
            if (branch.emailSettings) {
                try {
                    branch.emailSettings = decryptBranchApiSettings(branch.emailSettings as any);
                } catch (error) {
                    logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Email Settings für Branch ${branch.id}:`, error);
                }
            }
            
            // Entschlüssele Message Templates
            if (branch.messageTemplates) {
                try {
                    branch.messageTemplates = decryptBranchApiSettings(branch.messageTemplates as any);
                } catch (error) {
                    logger.warn(`[Branch Controller] Fehler beim Entschlüsseln der Message Templates für Branch ${branch.id}:`, error);
                }
            }
            
            return branch;
        });
        
        // Wenn roleId angegeben, filtere Branches nach Verfügbarkeit für diese Rolle
        if (roleId && !isNaN(roleId)) {
            // Hole die Rolle, um allBranches zu prüfen
            const role = await prisma.role.findUnique({
                where: { id: roleId },
                select: {
                    allBranches: true
                }
            });
            
            if (role) {
                // Wenn allBranches = true, sind alle Branches verfügbar
                // Wenn allBranches = false, nur Branches mit RoleBranch Eintrag
                if (!role.allBranches) {
                    branches = branches.filter(branch => {
                        // TypeScript-Hack: branches hat jetzt ein 'roles' Feld wenn roleId vorhanden
                        const branchWithRoles = branch as any;
                        return branchWithRoles.roles && branchWithRoles.roles.length > 0;
                    });
                }
            } else {
                // Rolle nicht gefunden, keine Branches zurückgeben
                branches = [];
            }
            
            // Entferne das 'roles' Feld aus der Antwort, behalte aber alle Settings
            branches = branches.map(branch => ({
                id: branch.id,
                name: branch.name,
                whatsappSettings: (branch as any).whatsappSettings,
                lobbyPmsSettings: (branch as any).lobbyPmsSettings,
                boldPaymentSettings: (branch as any).boldPaymentSettings,
                doorSystemSettings: (branch as any).doorSystemSettings,
                emailSettings: (branch as any).emailSettings,
                messageTemplates: (branch as any).messageTemplates,
                autoSendReservationInvitation: (branch as any).autoSendReservationInvitation
            })) as any;
        }
        
        res.json(branches);
    } catch (error) {
        logger.error('Error in getAllBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Niederlassungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
};

// Branches eines Benutzers mit lastUsed-Flag abrufen
export const getUserBranches = async (req: Request, res: Response) => {
    try {
        const userId = parseInt((req as any).userId as string, 10);

        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        // ✅ PERFORMANCE: Verwende BranchCache statt DB-Query
        // ✅ SICHERHEIT: BranchCache berücksichtigt getDataIsolationFilter
        // ✅ MONITORING: Timing-Log für Cache-Operation
        const cacheStartTime = Date.now();
        const cachedBranches = await branchCache.get(userId, req);
        const cacheDuration = Date.now() - cacheStartTime;
        if (cachedBranches) {
            logger.log(`[getUserBranches] ⏱️ Cache-Hit: ${cacheDuration}ms | Branches: ${cachedBranches.length}`);
        } else {
            logger.log(`[getUserBranches] ⏱️ Cache-Miss: ${cacheDuration}ms`);
        }
        
        if (cachedBranches) {
            return res.json(cachedBranches);
        }
        
        // Fallback: DB-Query (sollte nicht nötig sein, da Cache immer Daten liefert oder null)
        return res.status(500).json({ 
            message: 'Fehler beim Laden der Branches',
            error: 'Cache-Fehler'
        });
    } catch (error) {
        logger.error('Error in getUserBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Benutzer-Niederlassungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
};

// Aktiven Branch eines Benutzers wechseln
export const switchUserBranch = async (req: Request, res: Response) => {
    try {
        const userId = parseInt((req as any).userId as string, 10);
        const { branchId } = req.body as SwitchBranchRequest;

        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        if (!branchId || isNaN(branchId) || branchId <= 0) {
            return res.status(400).json({ message: 'Ungültige Niederlassungs-ID' });
        }

        // Prüfen, ob die Niederlassung dem Benutzer zugewiesen ist
        const userBranch = await prisma.usersBranches.findFirst({
            where: {
                userId,
                branchId
            }
        });

        if (!userBranch) {
            return res.status(404).json({
                message: 'Diese Niederlassung ist dem Benutzer nicht zugewiesen'
            });
        }

        // Prüfen, ob Branch zur Organisation gehört (Datenisolation)
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const branch = await prisma.branch.findFirst({
            where: {
                id: branchId,
                ...branchFilter
            }
        });

        if (!branch) {
            return res.status(403).json({
                message: 'Zugriff auf diese Niederlassung verweigert'
            });
        }

        // Prüfe, ob die aktive Rolle für die neue Branch verfügbar ist
        const activeRole = await prisma.userRole.findFirst({
            where: {
                userId,
                lastUsed: true
            },
            select: {
                roleId: true
            }
        });

        if (activeRole) {
            // Importiere die Hilfsfunktion dynamisch, um Zirkelimporte zu vermeiden
            const { isRoleAvailableForBranch } = await import('./roleController');
            const isAvailable = await isRoleAvailableForBranch(activeRole.roleId, branchId);
            
            if (!isAvailable) {
                return res.status(400).json({
                    message: 'Die aktive Rolle ist für diese Branch nicht verfügbar. Bitte wechseln Sie zuerst zu einer verfügbaren Rolle.'
                });
            }
        }

        // Transaktion starten
        await prisma.$transaction(async (tx) => {
            // Alle Branches des Benutzers auf lastUsed=false setzen
            await tx.usersBranches.updateMany({
                where: { userId },
                data: { lastUsed: false }
            });

            // Die ausgewählte Branch auf lastUsed=true setzen
            await tx.usersBranches.update({
                where: { id: userBranch.id },
                data: { lastUsed: true }
            });
        });

        // Aktualisierte Branches zurückgeben
        const updatedUserBranches = await prisma.usersBranches.findMany({
            where: {
                userId: userId,
                branch: branchFilter
            },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                branch: {
                    name: 'asc'
                }
            }
        });

        const branches = updatedUserBranches.map(ub => ({
            id: ub.branch.id,
            name: ub.branch.name,
            lastUsed: ub.lastUsed
        }));

        // ✅ PERFORMANCE: Cache invalidieren nach Branch-Wechsel
        const organizationId = (req as any).organizationId;
        const roleId = (req as any).roleId;
        branchCache.invalidate(userId, organizationId, roleId);
        // ✅ FIX: OrganizationCache invalidieren (branchId hat sich geändert)
        const { organizationCache } = await import('../utils/organizationCache');
        organizationCache.invalidate(userId);

        return res.json({ 
            success: true, 
            branches,
            selectedBranch: branchId
        });
    } catch (error) {
        logger.error('Error in switchUserBranch:', error);
        res.status(500).json({ 
            message: 'Fehler beim Wechseln der Niederlassung', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Branch erstellen
export const createBranch = async (req: Request, res: Response) => {
    try {
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Niederlassung: Name ist erforderlich'
            });
        }

        // Prüfe ob User eine Organisation hat
        const organizationId = (req as any).organizationId;

        if (!organizationId) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Niederlassung: Sie müssen Mitglied einer Organisation sein, um Niederlassungen zu erstellen'
            });
        }

        // Prüfe ob Branch mit diesem Namen bereits existiert (global unique)
        const existingBranch = await prisma.branch.findUnique({
            where: { name: name.trim() }
        });

        if (existingBranch) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }

        // Erstelle Branch
        const branch = await prisma.branch.create({
            data: {
                name: name.trim(),
                organizationId: organizationId
            }
        });

        res.status(201).json(branch);
    } catch (error) {
        logger.error('Error in createBranch:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        res.status(500).json({
            message: 'Fehler beim Erstellen der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Branch aktualisieren
export const updateBranch = async (req: Request, res: Response) => {
    try {
        const branchId = parseInt(req.params.id, 10);
        const { name, whatsappSettings, lobbyPmsSettings, boldPaymentSettings, doorSystemSettings, emailSettings, messageTemplates, autoSendReservationInvitation } = req.body;

        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Niederlassungs-ID' });
        }

        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({
                message: 'Fehler beim Aktualisieren der Niederlassung: Name ist erforderlich'
            });
        }

        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const existingBranch = await prisma.branch.findFirst({
            where: {
                id: branchId,
                ...branchFilter
            }
        });

        if (!existingBranch) {
            return res.status(404).json({ message: 'Niederlassung nicht gefunden' });
        }

        // Prüfe ob Branch mit neuem Namen bereits existiert (außer dem aktuellen)
        const duplicateBranch = await prisma.branch.findFirst({
            where: {
                name: name.trim(),
                NOT: { id: branchId }
            }
        });

        if (duplicateBranch) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }

        // Verschlüssele alle Settings falls vorhanden
        const { encryptBranchApiSettings } = await import('../utils/encryption');
        
        let encryptedWhatsAppSettings = whatsappSettings;
        if (whatsappSettings) {
            try {
                encryptedWhatsAppSettings = encryptBranchApiSettings(whatsappSettings);
                logger.log('[Branch Controller] WhatsApp Settings verschlüsselt');
            } catch (error) {
                logger.warn('[Branch Controller] WhatsApp Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        
        let encryptedLobbyPmsSettings = lobbyPmsSettings;
        if (lobbyPmsSettings) {
            try {
                encryptedLobbyPmsSettings = encryptBranchApiSettings(lobbyPmsSettings);
                logger.log('[Branch Controller] LobbyPMS Settings verschlüsselt');
            } catch (error) {
                logger.warn('[Branch Controller] LobbyPMS Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        
        let encryptedBoldPaymentSettings = boldPaymentSettings;
        if (boldPaymentSettings) {
            try {
                encryptedBoldPaymentSettings = encryptBranchApiSettings(boldPaymentSettings);
                logger.log('[Branch Controller] Bold Payment Settings verschlüsselt');
            } catch (error) {
                logger.warn('[Branch Controller] Bold Payment Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        
        let encryptedDoorSystemSettings = doorSystemSettings;
        if (doorSystemSettings) {
            try {
                encryptedDoorSystemSettings = encryptBranchApiSettings(doorSystemSettings);
                logger.log('[Branch Controller] Door System Settings verschlüsselt');
            } catch (error) {
                logger.warn('[Branch Controller] Door System Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        
        let encryptedEmailSettings = emailSettings;
        if (emailSettings) {
            try {
                encryptedEmailSettings = encryptBranchApiSettings(emailSettings);
                logger.log('[Branch Controller] Email Settings verschlüsselt');
            } catch (error) {
                logger.warn('[Branch Controller] Email Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }
        
        let encryptedMessageTemplates = messageTemplates;
        if (messageTemplates) {
            try {
                encryptedMessageTemplates = encryptBranchApiSettings(messageTemplates);
                logger.log('[Branch Controller] Message Templates verschlüsselt');
            } catch (error) {
                logger.warn('[Branch Controller] Message Templates Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
            }
        }

        // Aktualisiere Branch
        const updateData: any = {
            name: name.trim()
        };

        if (whatsappSettings !== undefined) {
            updateData.whatsappSettings = encryptedWhatsAppSettings;
        }
        if (lobbyPmsSettings !== undefined) {
            updateData.lobbyPmsSettings = encryptedLobbyPmsSettings;
        }
        if (boldPaymentSettings !== undefined) {
            updateData.boldPaymentSettings = encryptedBoldPaymentSettings;
        }
        if (doorSystemSettings !== undefined) {
            updateData.doorSystemSettings = encryptedDoorSystemSettings;
        }
        if (emailSettings !== undefined) {
            updateData.emailSettings = encryptedEmailSettings;
        }
        if (messageTemplates !== undefined) {
            updateData.messageTemplates = encryptedMessageTemplates;
        }
        if (autoSendReservationInvitation !== undefined) {
            updateData.autoSendReservationInvitation = autoSendReservationInvitation;
        }

        const updatedBranch = await prisma.branch.update({
            where: { id: branchId },
            data: updateData,
            select: {
                id: true,
                name: true,
                whatsappSettings: true,
                lobbyPmsSettings: true,
                boldPaymentSettings: true,
                doorSystemSettings: true,
                emailSettings: true,
                messageTemplates: true,
                autoSendReservationInvitation: true
            }
        });

        // Entschlüssele alle Settings für Response (Frontend braucht entschlüsselte Werte)
        const { decryptBranchApiSettings } = await import('../utils/encryption');
        
        if (updatedBranch.whatsappSettings) {
            try {
                (updatedBranch as any).whatsappSettings = decryptBranchApiSettings(updatedBranch.whatsappSettings as any);
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings:', error);
            }
        }
        
        if (updatedBranch.lobbyPmsSettings) {
            try {
                (updatedBranch as any).lobbyPmsSettings = decryptBranchApiSettings(updatedBranch.lobbyPmsSettings as any);
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }
        
        if (updatedBranch.boldPaymentSettings) {
            try {
                (updatedBranch as any).boldPaymentSettings = decryptBranchApiSettings(updatedBranch.boldPaymentSettings as any);
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Bold Payment Settings:', error);
            }
        }
        
        if (updatedBranch.doorSystemSettings) {
            try {
                (updatedBranch as any).doorSystemSettings = decryptBranchApiSettings(updatedBranch.doorSystemSettings as any);
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Door System Settings:', error);
            }
        }
        
        if (updatedBranch.emailSettings) {
            try {
                (updatedBranch as any).emailSettings = decryptBranchApiSettings(updatedBranch.emailSettings as any);
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Email Settings:', error);
            }
        }
        
        if (updatedBranch.messageTemplates) {
            try {
                (updatedBranch as any).messageTemplates = decryptBranchApiSettings(updatedBranch.messageTemplates as any);
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der Message Templates:', error);
            }
        }

        // ✅ PERFORMANCE: Cache leeren nach Branch-Update (alle User betroffen)
        branchCache.clear();

        res.json(updatedBranch);
    } catch (error) {
        logger.error('Error in updateBranch:', error);
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            return res.status(400).json({
                message: 'Eine Niederlassung mit diesem Namen existiert bereits'
            });
        }
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Branch löschen
export const deleteBranch = async (req: Request, res: Response) => {
    try {
        const branchId = parseInt(req.params.id, 10);

        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Niederlassungs-ID' });
        }

        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const branch = await prisma.branch.findFirst({
            where: {
                id: branchId,
                ...branchFilter
            }
        });

        if (!branch) {
            return res.status(404).json({ message: 'Niederlassung nicht gefunden' });
        }

        // Prüfe ob Branch verwendet wird
        const [workTimes, tasks, requests, userBranches] = await Promise.all([
            prisma.workTime.count({
                where: { branchId }
            }),
            prisma.task.count({
                where: { branchId }
            }),
            prisma.request.count({
                where: { branchId }
            }),
            prisma.usersBranches.count({
                where: { branchId }
            })
        ]);

        if (workTimes > 0 || tasks > 0 || requests > 0 || userBranches > 0) {
            const usageDetails = [];
            if (workTimes > 0) usageDetails.push(`${workTimes} Zeiterfassung(en)`);
            if (tasks > 0) usageDetails.push(`${tasks} Aufgabe(n)`);
            if (requests > 0) usageDetails.push(`${requests} Antrag/Anträge`);
            if (userBranches > 0) usageDetails.push(`${userBranches} Benutzerzuweisung(en)`);

            return res.status(400).json({
                message: `Die Niederlassung kann nicht gelöscht werden, da sie noch verwendet wird: ${usageDetails.join(', ')}`
            });
        }

        // Lösche Branch
        await prisma.branch.delete({
            where: { id: branchId }
        });

        res.status(204).send();
    } catch (error) {
        logger.error('Error in deleteBranch:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

/**
 * GET /api/branches/:id/room-descriptions
 * Lädt alle Zimmer-Beschreibungen für einen Branch
 */
export const getRoomDescriptions = async (req: Request, res: Response) => {
    try {
        const branchId = parseInt(req.params.id, 10);
        const organizationId = (req as any).organizationId;

        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Branch-ID' });
        }

        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const branch = await prisma.branch.findFirst({
            where: {
                id: branchId,
                ...branchFilter
            },
            select: {
                id: true,
                lobbyPmsSettings: true
            }
        });

        if (!branch) {
            return res.status(404).json({ message: 'Branch nicht gefunden' });
        }

        // Lade und entschlüssele lobbyPmsSettings
        let roomDescriptions: Record<number, { text?: string; imageUrl?: string; videoUrl?: string }> = {};
        
        if (branch.lobbyPmsSettings) {
            try {
                const { decryptBranchApiSettings } = await import('../utils/encryption');
                const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
                const lobbyPmsSettings = decryptedSettings?.lobbyPms || decryptedSettings;
                roomDescriptions = lobbyPmsSettings?.roomDescriptions || {};
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }

        res.json(roomDescriptions);
    } catch (error) {
        logger.error('Error in getRoomDescriptions:', error);
        res.status(500).json({
            message: 'Fehler beim Laden der Zimmer-Beschreibungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

/**
 * PUT /api/branches/:id/room-descriptions
 * Speichert Zimmer-Beschreibungen für einen Branch
 */
export const updateRoomDescriptions = async (req: Request, res: Response) => {
    try {
        const branchId = parseInt(req.params.id, 10);
        const { roomDescriptions } = req.body;

        if (isNaN(branchId)) {
            return res.status(400).json({ message: 'Ungültige Branch-ID' });
        }

        if (!roomDescriptions || typeof roomDescriptions !== 'object') {
            return res.status(400).json({ message: 'roomDescriptions muss ein Objekt sein' });
        }

        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const branch = await prisma.branch.findFirst({
            where: {
                id: branchId,
                ...branchFilter
            },
            select: {
                id: true,
                lobbyPmsSettings: true
            }
        });

        if (!branch) {
            return res.status(404).json({ message: 'Branch nicht gefunden' });
        }

        // Lade bestehende lobbyPmsSettings
        let lobbyPmsSettings: any = {};
        if (branch.lobbyPmsSettings) {
            try {
                const { decryptBranchApiSettings } = await import('../utils/encryption');
                const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
                lobbyPmsSettings = decryptedSettings?.lobbyPms || decryptedSettings || {};
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
                lobbyPmsSettings = {};
            }
        }

        // Aktualisiere roomDescriptions
        lobbyPmsSettings.roomDescriptions = roomDescriptions;

        // Verschlüssele und speichere
        const { encryptBranchApiSettings } = await import('../utils/encryption');
        const encryptedSettings = encryptBranchApiSettings(lobbyPmsSettings);

        await prisma.branch.update({
            where: { id: branchId },
            data: {
                lobbyPmsSettings: encryptedSettings
            }
        });

        // Cache leeren
        branchCache.clear();

        res.json({ success: true, roomDescriptions });
    } catch (error) {
        logger.error('Error in updateRoomDescriptions:', error);
        res.status(500).json({
            message: 'Fehler beim Speichern der Zimmer-Beschreibungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

/**
 * GET /api/branches/:id/room-descriptions/:categoryId
 * Lädt Beschreibung für ein spezifisches Zimmer
 */
export const getRoomDescription = async (req: Request, res: Response) => {
    try {
        const branchId = parseInt(req.params.id, 10);
        const categoryId = parseInt(req.params.categoryId, 10);

        if (isNaN(branchId) || isNaN(categoryId)) {
            return res.status(400).json({ message: 'Ungültige Branch-ID oder Category-ID' });
        }

        // Prüfe ob Branch zur Organisation gehört
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const branch = await prisma.branch.findFirst({
            where: {
                id: branchId,
                ...branchFilter
            },
            select: {
                id: true,
                lobbyPmsSettings: true
            }
        });

        if (!branch) {
            return res.status(404).json({ message: 'Branch nicht gefunden' });
        }

        // Lade roomDescriptions
        let roomDescription: { text?: string; imageUrl?: string; videoUrl?: string } | null = null;
        
        if (branch.lobbyPmsSettings) {
            try {
                const { decryptBranchApiSettings } = await import('../utils/encryption');
                const decryptedSettings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
                const lobbyPmsSettings = decryptedSettings?.lobbyPms || decryptedSettings;
                roomDescription = lobbyPmsSettings?.roomDescriptions?.[categoryId] || null;
            } catch (error) {
                logger.warn('[Branch Controller] Fehler beim Entschlüsseln der LobbyPMS Settings:', error);
            }
        }

        res.json(roomDescription || {});
    } catch (error) {
        logger.error('Error in getRoomDescription:', error);
        res.status(500).json({
            message: 'Fehler beim Laden der Zimmer-Beschreibung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 