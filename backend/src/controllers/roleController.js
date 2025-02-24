const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Alle Rollen abrufen
exports.getAllRoles = async (req, res) => {
    try {
        const roles = await prisma.role.findMany({
            include: {
                permissions: true
            }
        });
        res.json(roles);
    } catch (error) {
        console.error('Error in getAllRoles:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Rollen', error: error.message });
    }
};

// Eine spezifische Rolle abrufen
exports.getRoleById = async (req, res) => {
    try {
        const role = await prisma.role.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                permissions: true,
                users: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true
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
        res.status(500).json({ message: 'Fehler beim Abrufen der Rolle', error: error.message });
    }
};

// Neue Rolle erstellen
exports.createRole = async (req, res) => {
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
        res.status(400).json({ message: 'Fehler beim Erstellen der Rolle', error: error.message });
    }
};

// Rolle aktualisieren
exports.updateRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const roleId = parseInt(req.params.id);

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
        res.status(400).json({ message: 'Fehler beim Aktualisieren der Rolle', error: error.message });
    }
};

// Rolle löschen
exports.deleteRole = async (req, res) => {
    try {
        const roleId = parseInt(req.params.id);

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
        res.status(500).json({ message: 'Fehler beim Löschen der Rolle', error: error.message });
    }
};

// Berechtigungen einer Rolle abrufen
exports.getRolePermissions = async (req, res) => {
    try {
        const roleId = parseInt(req.params.id);
        const permissions = await prisma.permission.findMany({
            where: { roleId: roleId }
        });
        res.json(permissions);
    } catch (error) {
        console.error('Error in getRolePermissions:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Berechtigungen', error: error.message });
    }
}; 