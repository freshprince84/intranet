import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getDataIsolationFilter } from '../middleware/organization';

const prisma = new PrismaClient();

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
                roles: {
                    where: { roleId: roleId },
                    select: { id: true }
                }
            };
        } else {
            queryOptions.select = {
                id: true,
                name: true,
                whatsappSettings: true
            };
        }
        
        let branches = await prisma.branch.findMany(queryOptions);
        
        // Entschlüssele WhatsApp Settings für alle Branches
        // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
        const { decryptSecret } = await import('../utils/encryption');
        branches = branches.map((branch: any) => {
            if (branch.whatsappSettings) {
                try {
                    const settings = branch.whatsappSettings;
                    // Prüfe ob Settings verschlüsselt sind (Format: iv:authTag:encrypted)
                    if (settings.apiKey && typeof settings.apiKey === 'string' && settings.apiKey.includes(':')) {
                        settings.apiKey = decryptSecret(settings.apiKey);
                    }
                    if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
                        settings.apiSecret = decryptSecret(settings.apiSecret);
                    }
                    branch.whatsappSettings = settings;
                } catch (error) {
                    console.warn(`[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings für Branch ${branch.id}:`, error);
                    // Bei Fehler: Settings bleiben verschlüsselt (für Migration)
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
            
            // Entferne das 'roles' Feld aus der Antwort, behalte aber whatsappSettings
            branches = branches.map(branch => ({
                id: branch.id,
                name: branch.name,
                whatsappSettings: (branch as any).whatsappSettings
            })) as any;
        }
        
        res.json(branches);
    } catch (error) {
        console.error('Error in getAllBranches:', error);
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

        // Datenisolation: Zeigt nur Branches der Organisation
        const branchFilter = getDataIsolationFilter(req as any, 'branch');

        // Lade alle Branches des Users mit lastUsed-Flag
        const userBranches = await prisma.usersBranches.findMany({
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

        // Transformiere zu einfachem Format mit lastUsed-Flag
        const branches = userBranches.map(ub => ({
            id: ub.branch.id,
            name: ub.branch.name,
            lastUsed: ub.lastUsed
        }));

        res.json(branches);
    } catch (error) {
        console.error('Error in getUserBranches:', error);
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

        return res.json({ 
            success: true, 
            branches,
            selectedBranch: branchId
        });
    } catch (error) {
        console.error('Error in switchUserBranch:', error);
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
        console.error('Error in createBranch:', error);
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
        const { name, whatsappSettings } = req.body;

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

        // Verschlüssele WhatsApp Settings falls vorhanden
        let encryptedWhatsAppSettings = whatsappSettings;
        if (whatsappSettings) {
            try {
                const { encryptApiSettings } = await import('../utils/encryption');
                encryptedWhatsAppSettings = encryptApiSettings(whatsappSettings);
                console.log('[Branch Controller] WhatsApp Settings verschlüsselt und bereit zum Speichern');
            } catch (error) {
                console.warn('[Branch Controller] WhatsApp Settings Verschlüsselung fehlgeschlagen, speichere unverschlüsselt:', error);
                // Falls Verschlüsselung fehlschlägt, speichere unverschlüsselt (nur für Development)
            }
        }

        // Aktualisiere Branch
        const updateData: any = {
            name: name.trim()
        };

        if (whatsappSettings !== undefined) {
            updateData.whatsappSettings = encryptedWhatsAppSettings;
            console.log('[Branch Controller] WhatsApp Settings werden gespeichert:', {
                hasProvider: !!whatsappSettings?.provider,
                hasApiKey: !!whatsappSettings?.apiKey,
                hasPhoneNumberId: !!whatsappSettings?.phoneNumberId
            });
        } else {
            console.log('[Branch Controller] Keine WhatsApp Settings im Request');
        }

        const updatedBranch = await prisma.branch.update({
            where: { id: branchId },
            data: updateData,
            select: {
                id: true,
                name: true,
                whatsappSettings: true
            }
        });

        // Entschlüssele WhatsApp Settings für Response (Frontend braucht entschlüsselte Werte)
        // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
        if (updatedBranch.whatsappSettings) {
            try {
                const { decryptSecret } = await import('../utils/encryption');
                const settings = updatedBranch.whatsappSettings as any;
                // Prüfe ob Settings verschlüsselt sind (Format: iv:authTag:encrypted)
                if (settings.apiKey && typeof settings.apiKey === 'string' && settings.apiKey.includes(':')) {
                    settings.apiKey = decryptSecret(settings.apiKey);
                }
                if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
                    settings.apiSecret = decryptSecret(settings.apiSecret);
                }
                (updatedBranch as any).whatsappSettings = settings;
            } catch (error) {
                console.warn('[Branch Controller] Fehler beim Entschlüsseln der WhatsApp Settings:', error);
                // Bei Fehler: Settings bleiben verschlüsselt (für Migration)
            }
        }

        res.json(updatedBranch);
    } catch (error) {
        console.error('Error in updateBranch:', error);
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
        console.error('Error in deleteBranch:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Niederlassung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 