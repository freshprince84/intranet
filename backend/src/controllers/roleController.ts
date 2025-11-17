import { Request, Response } from 'express';
import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from './notificationController';
import { getUserLanguage, getRoleNotificationText } from '../utils/translations';
import { getDataIsolationFilter, belongsToOrganization, getUserOrganizationFilter } from '../middleware/organization';

const prisma = new PrismaClient();

interface RoleParams {
    id: string;
}

interface Permission {
    entity: string;
    entityType: string;
    accessLevel: string;
}

interface CreateRoleBody {
    name: string;
    description: string;
    permissions: Permission[];
    allBranches?: boolean;
    branchIds?: number[];
}

interface UpdateRoleBody extends CreateRoleBody {}

const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
} as const;

// Hilfsfunktion: Prüft, ob eine Rolle für eine Branch verfügbar ist
export const isRoleAvailableForBranch = async (roleId: number, branchId: number): Promise<boolean> => {
    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: {
            allBranches: true,
            branches: {
                where: { branchId },
                select: { id: true }
            }
        }
    });
    
    if (!role) return false;
    
    // Rolle ist verfügbar, wenn allBranches = true ODER es gibt einen RoleBranch Eintrag
    return role.allBranches || role.branches.length > 0;
};

// Alle Rollen abrufen (optional gefiltert nach branchId)
export const getAllRoles = async (req: Request, res: Response) => {
    try {
        console.log('getAllRoles aufgerufen');
        
        // Prüfen, ob Prisma-Verbindung hergestellt ist
        await prisma.$connect();
        console.log('Prisma-Verbindung OK');
        
        // Datenisolation: Zeigt alle Rollen der Organisation oder nur eigene (wenn standalone)
        const roleFilter = getDataIsolationFilter(req as any, 'role');
        
        // Optional: Filter nach branchId (aus Query-Parameter)
        const branchId = req.query.branchId ? parseInt(req.query.branchId as string, 10) : null;
        
        let roles = await prisma.role.findMany({
            where: roleFilter,
            include: {
                permissions: true,
                branches: branchId ? {
                    where: { branchId },
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                } : {
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        
        // Wenn branchId angegeben, filtere Rollen nach Verfügbarkeit
        if (branchId && !isNaN(branchId)) {
            roles = roles.filter(role => {
                // Rolle ist verfügbar, wenn allBranches = true ODER es gibt einen RoleBranch Eintrag
                return role.allBranches || (role.branches && role.branches.length > 0);
            });
        }
        
        console.log('Gefundene Rollen:', roles.length);
        res.json(roles);
    } catch (error) {
        console.error('Error in getAllRoles:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Rollen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
};

// Eine spezifische Rolle abrufen
export const getRoleById = async (req: Request<RoleParams>, res: Response) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }

        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                permissions: true,
                branches: {
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                users: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!role) {
            return res.status(404).json({ message: 'Rolle nicht gefunden' });
        }
        
        res.json(role);
    } catch (error) {
        console.error('Error in getRoleById:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Rolle', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
};

// Neue Rolle erstellen
export const createRole = async (req: Request<{}, {}, CreateRoleBody>, res: Response) => {
    try {
        const { name, description, permissions, allBranches = false, branchIds = [] } = req.body;
        
        console.log('Request Body für createRole:', req.body);
        console.log('Permissions aus Request:', permissions);
        
        if (!name) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Rolle: Name ist erforderlich'
            });
        }
        
        if (!permissions || !Array.isArray(permissions)) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Rolle: Ungültige Berechtigungen'
            });
        }

        console.log('Berechtigungsdetails:');
        permissions.forEach((perm, idx) => {
            console.log(`Permission ${idx+1}:`, JSON.stringify(perm));
            console.log(`  - Schlüssel: ${Object.keys(perm).join(', ')}`);
            console.log(`  - entity: ${perm.entity}, entityType: ${perm.entityType || 'nicht angegeben'}, accessLevel: ${perm.accessLevel}`);
        });

        // Prüfe ob User eine Organisation hat
        const organizationId = (req as any).organizationId;
        
        if (!organizationId) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Rolle: Sie müssen Mitglied einer Organisation sein, um Rollen zu erstellen'
            });
        }

        // Validierung: Wenn allBranches = false, müssen branchIds angegeben werden
        if (!allBranches && (!branchIds || branchIds.length === 0)) {
            return res.status(400).json({
                message: 'Fehler beim Erstellen der Rolle: Wenn "alle Branches" nicht aktiviert ist, müssen mindestens eine Branch ausgewählt werden'
            });
        }

        // Prüfe, ob alle branchIds zur Organisation gehören
        if (branchIds.length > 0) {
            const branchFilter = getDataIsolationFilter(req as any, 'branch');
            const existingBranches = await prisma.branch.findMany({
                where: {
                    id: { in: branchIds },
                    ...branchFilter
                }
            });

            if (existingBranches.length !== branchIds.length) {
                return res.status(400).json({
                    message: 'Eine oder mehrere Branches wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
                });
            }
        }

        try {
            const role = await prisma.role.create({
                data: {
                    name,
                    description,
                    organizationId: organizationId, // Verwende Organisation des aktuellen Users
                    allBranches: allBranches,
                    permissions: {
                        create: permissions.map(permission => ({
                            entity: permission.entity,
                            entityType: permission.entityType || 'page',
                            accessLevel: permission.accessLevel
                        }))
                    },
                    branches: allBranches ? undefined : {
                        create: branchIds.map(branchId => ({
                            branchId
                        }))
                    }
                },
                include: {
                    permissions: true,
                    branches: {
                        include: {
                            branch: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });
            
            console.log('Neue Rolle wurde erstellt, überprüfe Permissions:');
            if (role.permissions.length === 0) {
                console.error('WARNUNG: Rolle wurde erstellt, aber keine Berechtigungen wurden angelegt!');
            } else {
                console.log(`Rolle hat ${role.permissions.length} Berechtigungen:`);
                role.permissions.forEach((perm, idx) => {
                    console.log(`Gespeicherte Permission ${idx+1}:`, JSON.stringify(perm));
                });
            }
            
            // Benachrichtigung für Administratoren der Organisation senden
            const userFilter = getUserOrganizationFilter(req);
            const admins = await prisma.user.findMany({
                where: {
                    ...userFilter,
                    roles: {
                        some: {
                            role: {
                                name: 'Admin',
                                organizationId: req.organizationId
                            }
                        }
                    }
                }
            });

            for (const admin of admins) {
                const adminLang = await getUserLanguage(admin.id);
                const notificationText = getRoleNotificationText(adminLang, 'created', name, false);
                await createNotificationIfEnabled({
                    userId: admin.id,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: NotificationType.role,
                    relatedEntityId: role.id,
                    relatedEntityType: 'create'
                });
            }
            
            console.log('Neue Rolle erfolgreich erstellt:', role);
            res.status(201).json(role);
        } catch (prismaError) {
            console.error('Prisma-Fehler beim Erstellen der Rolle:', prismaError);
            throw prismaError;
        }
    } catch (error) {
        console.error('Error in createRole:', error);
        
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.log('Fehlercode:', error.code);
            console.log('Fehlermeldung:', error.message);
            console.log('Meta:', error.meta);
            
            if (error.code === 'P2002') {
                return res.status(400).json({
                    message: 'Eine Rolle mit diesem Namen existiert bereits',
                    code: error.code,
                    details: error.message
                });
            }
            
            res.status(400).json({ 
                message: 'Fehler beim Erstellen der Rolle',
                code: error.code,
                details: error.message,
                meta: error.meta
            });
        } else {
            res.status(500).json({ 
                message: 'Fehler beim Erstellen der Rolle', 
                error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
            });
        }
    }
};

// Rolle aktualisieren
export const updateRole = async (req: Request<RoleParams, {}, UpdateRoleBody>, res: Response) => {
    try {
        const { name, description, permissions, allBranches, branchIds } = req.body;
        const roleId = parseInt(req.params.id, 10);
        
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }

        // Validierung: Wenn allBranches = false, müssen branchIds angegeben werden
        if (allBranches !== undefined && !allBranches && (!branchIds || branchIds.length === 0)) {
            return res.status(400).json({
                message: 'Fehler beim Aktualisieren der Rolle: Wenn "alle Branches" nicht aktiviert ist, müssen mindestens eine Branch ausgewählt werden'
            });
        }

        // Prüfe, ob alle branchIds zur Organisation gehören (wenn angegeben)
        if (branchIds && branchIds.length > 0) {
            const branchFilter = getDataIsolationFilter(req as any, 'branch');
            const existingBranches = await prisma.branch.findMany({
                where: {
                    id: { in: branchIds },
                    ...branchFilter
                }
            });

            if (existingBranches.length !== branchIds.length) {
                return res.status(400).json({
                    message: 'Eine oder mehrere Branches wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
                });
            }
        }

        console.log(`Aktualisierung für Rolle mit ID ${roleId} begonnen...`);
        console.log('Neue Daten:', { name, description, permissions: permissions.length, allBranches, branchIds });
        
        // Detaillierte Ausgabe der Berechtigungen
        console.log('Detaillierte Berechtigungen:');
        permissions.forEach((perm, index) => {
            console.log(`Permission ${index + 1}:`, JSON.stringify(perm));
        });

        // Transaktion verwenden, um sicherzustellen, dass alle Schritte erfolgreich sind oder komplett zurückgerollt werden
        const updatedRole = await prisma.$transaction(async (tx) => {
            // 1. Prüfe, ob die Rolle existiert
            const existingRole = await tx.role.findUnique({
                where: { id: roleId },
                include: { 
                    permissions: true,
                    branches: true
                }
            });

            if (!existingRole) {
                throw new Error(`Rolle mit ID ${roleId} wurde nicht gefunden`);
            }

            console.log(`Bestehende Rolle gefunden: ${existingRole.name} mit ${existingRole.permissions.length} Berechtigungen`);

            // 2. Lösche alle bestehenden Berechtigungen
            const deletedPermissions = await tx.permission.deleteMany({
                where: { roleId: roleId }
            });
            console.log(`${deletedPermissions.count} alte Berechtigungen gelöscht`);

            // 3. Aktualisiere Branch-Zuweisungen (wenn allBranches oder branchIds angegeben)
            if (allBranches !== undefined) {
                // Lösche alle bestehenden RoleBranch Einträge
                await tx.roleBranch.deleteMany({
                    where: { roleId: roleId }
                });

                // Wenn allBranches = false und branchIds angegeben, erstelle neue RoleBranch Einträge
                if (!allBranches && branchIds && branchIds.length > 0) {
                    await tx.roleBranch.createMany({
                        data: branchIds.map(branchId => ({
                            roleId: roleId,
                            branchId: branchId
                        }))
                    });
                }
            }

            // 4. Aktualisiere die Rolle selbst
            const updateData: any = {
                name,
                description,
                permissions: {
                    create: permissions.map(permission => ({
                        entity: permission.entity,
                        entityType: permission.entityType || 'page',
                        accessLevel: permission.accessLevel
                    }))
                }
            };

            // Füge allBranches hinzu, wenn angegeben
            if (allBranches !== undefined) {
                updateData.allBranches = allBranches;
            }

            const role = await tx.role.update({
                where: { id: roleId },
                data: updateData,
                include: {
                    permissions: true,
                    branches: {
                        include: {
                            branch: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    users: true
                }
            });

            console.log(`Rolle '${role.name}' erfolgreich aktualisiert mit ${role.permissions.length} neuen Berechtigungen`);
            
            // Überprüfe die gespeicherten Berechtigungen
            if (role.permissions.length === 0) {
                console.error('WARNUNG: Rolle wurde aktualisiert, aber keine Berechtigungen wurden angelegt!');
            } else {
                console.log('Details der gespeicherten Berechtigungen:');
                role.permissions.forEach((perm, idx) => {
                    console.log(`Gespeicherte Permission ${idx+1}:`, JSON.stringify(perm));
                });
            }
            
            return role;
        });

        // Benachrichtigung für Administratoren senden
        const admins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });

        for (const admin of admins) {
            const adminLang = await getUserLanguage(admin.id);
            const notificationText = getRoleNotificationText(adminLang, 'updated', updatedRole.name, false);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.role,
                relatedEntityId: updatedRole.id,
                relatedEntityType: 'update'
            });
        }

        // Benachrichtigung für Benutzer mit dieser Rolle senden (nur User der Organisation)
        const roleFilter = getDataIsolationFilter(req as any, 'role');
        const usersWithRole = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        roleId: roleId,
                        role: {
                            ...roleFilter
                        }
                    }
                }
            }
        });

        for (const user of usersWithRole) {
            // Nicht an Administratoren senden, die bereits benachrichtigt wurden
            if (!admins.some(admin => admin.id === user.id)) {
                const userLang = await getUserLanguage(user.id);
                const notificationText = getRoleNotificationText(userLang, 'updated', updatedRole.name, true);
                await createNotificationIfEnabled({
                    userId: user.id,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: NotificationType.role,
                    relatedEntityId: updatedRole.id,
                    relatedEntityType: 'update'
                });
            }
        }

        res.json(updatedRole);
    } catch (error) {
        console.error('Error in updateRole:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Spezifische Fehlerbehandlung für Prisma-Fehler
            let errorMessage = 'Fehler beim Aktualisieren der Rolle';
            
            if (error.code === 'P2002') {
                errorMessage = 'Eine Rolle mit diesem Namen existiert bereits';
            } else if (error.code === 'P2025') {
                errorMessage = 'Rolle wurde nicht gefunden';
            }
            
            res.status(400).json({ 
                message: errorMessage,
                code: error.code,
                details: error.message,
                meta: error.meta
            });
        } else {
            res.status(500).json({ 
                message: 'Fehler beim Aktualisieren der Rolle', 
                error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
            });
        }
    }
};

// Rolle löschen
export const deleteRole = async (req: Request<RoleParams>, res: Response) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }

        // Rolle vor dem Löschen abrufen
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                users: true
            }
        });

        if (!role) {
            return res.status(404).json({ message: 'Rolle nicht gefunden' });
        }

        // Benutzer mit dieser Rolle abrufen (nur User der Organisation)
        const roleFilter = getDataIsolationFilter(req as any, 'role');
        const usersWithRole = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        roleId: roleId,
                        role: {
                            ...roleFilter
                        }
                    }
                }
            }
        });

        // Transaktion für das Löschen verwenden
        await prisma.$transaction([
            // 1. Lösche alle Berechtigungen dieser Rolle
            prisma.permission.deleteMany({
                where: { roleId: roleId }
            }),
            // 2. Lösche alle RoleBranch-Verknüpfungen
            prisma.roleBranch.deleteMany({
                where: { roleId: roleId }
            }),
            // 3. Lösche alle Benutzer-Rollen-Verknüpfungen
            prisma.userRole.deleteMany({
                where: { roleId: roleId }
            }),
            // 4. Lösche die Rolle selbst
            prisma.role.delete({
                where: { id: roleId }
            })
        ]);

        // Benachrichtigung für Administratoren senden
        const admins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });

        for (const admin of admins) {
            const adminLang = await getUserLanguage(admin.id);
            const notificationText = getRoleNotificationText(adminLang, 'deleted', role.name, false);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.role,
                relatedEntityId: roleId,
                relatedEntityType: 'delete'
            });
        }

        // Benachrichtigung für Benutzer mit dieser Rolle senden
        for (const user of usersWithRole) {
            // Nicht an Administratoren senden, die bereits benachrichtigt wurden
            if (!admins.some(admin => admin.id === user.id)) {
                const userLang = await getUserLanguage(user.id);
                const notificationText = getRoleNotificationText(userLang, 'deleted', role.name, true);
                await createNotificationIfEnabled({
                    userId: user.id,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: NotificationType.role,
                    relatedEntityId: roleId,
                    relatedEntityType: 'delete'
                });
            }
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error in deleteRole:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            let errorMessage = 'Fehler beim Löschen der Rolle';
            
            if (error.code === 'P2025') {
                errorMessage = 'Rolle wurde nicht gefunden';
            }
            
            res.status(400).json({ 
                message: errorMessage,
                code: error.code,
                details: error.message,
                meta: error.meta
            });
        } else {
            res.status(500).json({ 
                message: 'Fehler beim Löschen der Rolle', 
                error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
            });
        }
    }
};

// Berechtigungen einer Rolle abrufen
export const getRolePermissions = async (req: Request<RoleParams>, res: Response) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }

        const permissions = await prisma.permission.findMany({
            where: { roleId: roleId }
        });
        res.json(permissions);
    } catch (error) {
        console.error('Error in getRolePermissions:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Berechtigungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
};

// Branches einer Rolle abrufen
export const getRoleBranches = async (req: Request<RoleParams>, res: Response) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }

        const role = await prisma.role.findUnique({
            where: { id: roleId },
            select: {
                id: true,
                name: true,
                allBranches: true,
                branches: {
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!role) {
            return res.status(404).json({ message: 'Rolle nicht gefunden' });
        }

        res.json({
            roleId: role.id,
            roleName: role.name,
            allBranches: role.allBranches,
            branches: role.branches.map(rb => rb.branch)
        });
    } catch (error) {
        console.error('Error in getRoleBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Branches', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
};

// Branches einer Rolle aktualisieren
interface UpdateRoleBranchesBody {
    allBranches?: boolean;
    branchIds?: number[];
}

export const updateRoleBranches = async (req: Request<RoleParams, {}, UpdateRoleBranchesBody>, res: Response) => {
    try {
        const roleId = parseInt(req.params.id, 10);
        const { allBranches, branchIds = [] } = req.body;
        
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = await belongsToOrganization(req as any, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }

        // Validierung
        if (allBranches !== undefined && !allBranches && branchIds.length === 0) {
            return res.status(400).json({
                message: 'Wenn "alle Branches" nicht aktiviert ist, müssen mindestens eine Branch ausgewählt werden'
            });
        }

        // Prüfe, ob alle branchIds zur Organisation gehören
        if (branchIds.length > 0) {
            const branchFilter = getDataIsolationFilter(req as any, 'branch');
            const existingBranches = await prisma.branch.findMany({
                where: {
                    id: { in: branchIds },
                    ...branchFilter
                }
            });

            if (existingBranches.length !== branchIds.length) {
                return res.status(400).json({
                    message: 'Eine oder mehrere Branches wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
                });
            }
        }

        const updatedRole = await prisma.$transaction(async (tx) => {
            // Lösche alle bestehenden RoleBranch Einträge
            await tx.roleBranch.deleteMany({
                where: { roleId: roleId }
            });

            // Aktualisiere allBranches Flag
            const updateData: any = {};
            if (allBranches !== undefined) {
                updateData.allBranches = allBranches;
            }

            // Wenn allBranches = false und branchIds angegeben, erstelle neue RoleBranch Einträge
            if (allBranches !== undefined && !allBranches && branchIds.length > 0) {
                await tx.roleBranch.createMany({
                    data: branchIds.map(branchId => ({
                        roleId: roleId,
                        branchId: branchId
                    }))
                });
            }

            // Aktualisiere die Rolle
            return await tx.role.update({
                where: { id: roleId },
                data: updateData,
                include: {
                    branches: {
                        include: {
                            branch: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });
        });

        res.json({
            roleId: updatedRole.id,
            allBranches: updatedRole.allBranches,
            branches: updatedRole.branches.map(rb => rb.branch)
        });
    } catch (error) {
        console.error('Error in updateRoleBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Branches', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler' 
        });
    }
}; 