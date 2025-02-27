import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface RoleParams {
    id: string;
}

interface Permission {
    page: string;
    accessLevel: string;
}

interface CreateRoleBody {
    name: string;
    description: string;
    permissions: Permission[];
}

interface UpdateRoleBody extends CreateRoleBody {}

const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
} as const;

// Alle Rollen abrufen
export const getAllRoles = async (_req: Request, res: Response) => {
    try {
        console.log('getAllRoles aufgerufen');
        
        // Prüfen, ob Prisma-Verbindung hergestellt ist
        await prisma.$connect();
        console.log('Prisma-Verbindung OK');
        
        const roles = await prisma.role.findMany({
            include: {
                permissions: true
            }
        });
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

        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: {
                permissions: true,
                users: {
                    include: {
                        user: {
                            select: userSelect
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
        const { name, description, permissions } = req.body;
        
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

        try {
            const role = await prisma.role.create({
                data: {
                    name,
                    description,
                    permissions: {
                        create: permissions.map(permission => ({
                            page: permission.page,
                            accessLevel: permission.accessLevel
                        }))
                    }
                },
                include: {
                    permissions: true
                }
            });
            
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
        const { name, description, permissions } = req.body;
        const roleId = parseInt(req.params.id, 10);
        
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        console.log(`Aktualisierung für Rolle mit ID ${roleId} begonnen...`);
        console.log('Neue Daten:', { name, description, permissions: permissions.length });

        // Transaktion verwenden, um sicherzustellen, dass alle Schritte erfolgreich sind oder komplett zurückgerollt werden
        const updatedRole = await prisma.$transaction(async (tx) => {
            // 1. Prüfe, ob die Rolle existiert
            const existingRole = await tx.role.findUnique({
                where: { id: roleId },
                include: { permissions: true }
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

            // 3. Aktualisiere die Rolle selbst
            const role = await tx.role.update({
                where: { id: roleId },
                data: {
                    name,
                    description,
                    permissions: {
                        create: permissions.map(permission => ({
                            page: permission.page,
                            accessLevel: permission.accessLevel
                        }))
                    }
                },
                include: {
                    permissions: true,
                    users: true
                }
            });

            console.log(`Rolle '${role.name}' erfolgreich aktualisiert mit ${role.permissions.length} neuen Berechtigungen`);
            return role;
        });

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

        // Verhindere das Löschen der Standardrolle 999
        if (roleId === 999) {
            return res.status(403).json({ 
                message: 'Die Standardrolle (ID 999) kann nicht gelöscht werden' 
            });
        }
        
        await prisma.$transaction(async (tx) => {
            // 1. Prüfe, ob die Rolle existiert
            const role = await tx.role.findUnique({
                where: { id: roleId },
                include: {
                    users: true,
                    permissions: true
                }
            });

            if (!role) {
                throw new Error(`Rolle mit ID ${roleId} wurde nicht gefunden`);
            }

            console.log(`Rolle gefunden: ${role.name}, ${role.users.length} Benutzerverknüpfungen, ${role.permissions.length} Berechtigungen`);

            // 2. Für jeden Benutzer mit dieser Rolle prüfen, ob es die lastUsed-Rolle ist
            if (role.users.length > 0) {
                const usersWithThisRoleAsLastUsed = await tx.userRole.findMany({
                    where: { 
                        roleId: roleId,
                        lastUsed: true
                    },
                    include: {
                        user: true
                    }
                });
                
                console.log(`${usersWithThisRoleAsLastUsed.length} Benutzer haben diese Rolle als lastUsed markiert`);
                
                // Für jeden Benutzer, der diese Rolle als lastUsed hat, die nächsthöhere ID zuweisen
                for (const userRole of usersWithThisRoleAsLastUsed) {
                    // Finde alle anderen Rollen dieses Benutzers
                    const otherUserRoles = await tx.userRole.findMany({
                        where: {
                            userId: userRole.userId,
                            roleId: {
                                not: roleId
                            }
                        },
                        orderBy: {
                            roleId: 'asc'
                        },
                        include: {
                            role: true
                        }
                    });
                    
                    console.log(`Benutzer ${userRole.userId} hat ${otherUserRoles.length} andere Rollen`);
                    
                    if (otherUserRoles.length > 0) {
                        // Finde Rollen mit höherer ID als die gelöschte
                        const higherRoles = otherUserRoles.filter(ur => ur.roleId > roleId);
                        
                        // Wenn keine höhere ID gefunden wurde, nimm die erste verfügbare Rolle
                        const replacementRole = higherRoles.length > 0 ? higherRoles[0] : otherUserRoles[0];
                        
                        // Markiere die Ersatzrolle als lastUsed
                        await tx.userRole.update({
                            where: {
                                id: replacementRole.id
                            },
                            data: {
                                lastUsed: true
                            }
                        });
                        
                        console.log(`Benutzer ${userRole.userId} erhält Rolle ${replacementRole.roleId} (${replacementRole.role.name}) als neue lastUsed-Rolle`);
                    } else {
                        console.log(`Warnung: Benutzer ${userRole.userId} hat keine anderen Rollen, nach dem Löschen keine aktive Rolle mehr`);
                    }
                }
            }

            // 3. Lösche alle Benutzer-Rollen-Verknüpfungen
            const deletedUserRoles = await tx.userRole.deleteMany({
                where: { roleId: roleId }
            });
            console.log(`${deletedUserRoles.count} Benutzer-Rollen-Verknüpfungen gelöscht`);

            // 4. Lösche alle Berechtigungen der Rolle
            const deletedPermissions = await tx.permission.deleteMany({
                where: { roleId: roleId }
            });
            console.log(`${deletedPermissions.count} Berechtigungen gelöscht`);

            // 5. Lösche die Rolle selbst
            const deletedRole = await tx.role.delete({
                where: { id: roleId }
            });
            console.log(`Rolle '${deletedRole.name}' erfolgreich gelöscht`);
        });

        res.json({ message: 'Rolle erfolgreich gelöscht' });
    } catch (error) {
        console.error('Error in deleteRole:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Spezifische Fehlerbehandlung für Prisma-Fehler
            let errorMessage = 'Fehler beim Löschen der Rolle';

            // Behandlung von Foreign-Key-Fehlern
            if (error.code === 'P2003') {
                errorMessage = 'Die Rolle kann nicht gelöscht werden, da sie noch mit Benutzern verknüpft ist';
            } else if (error.code === 'P2025') {
                errorMessage = 'Rolle wurde nicht gefunden oder bereits gelöscht';
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