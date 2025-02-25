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
        const roles = await prisma.role.findMany({
            include: {
                permissions: true
            }
        });
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

        res.status(201).json(role);
    } catch (error) {
        console.error('Error in createRole:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                message: 'Fehler beim Erstellen der Rolle',
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

        // Lösche zuerst alle bestehenden Berechtigungen
        await prisma.permission.deleteMany({
            where: { roleId: roleId }
        });

        // Aktualisiere die Rolle und füge neue Berechtigungen hinzu
        const role = await prisma.role.update({
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
                permissions: true
            }
        });

        res.json(role);
    } catch (error) {
        console.error('Error in updateRole:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                message: 'Fehler beim Aktualisieren der Rolle',
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

        // Lösche zuerst alle Berechtigungen der Rolle
        await prisma.permission.deleteMany({
            where: { roleId: roleId }
        });

        // Lösche dann die Rolle selbst
        await prisma.role.delete({
            where: { id: roleId }
        });

        res.json({ message: 'Rolle erfolgreich gelöscht' });
    } catch (error) {
        console.error('Error in deleteRole:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                message: 'Fehler beim Löschen der Rolle',
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