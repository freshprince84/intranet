"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRolePermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getAllRoles = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
};
// Alle Rollen abrufen
const getAllRoles = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('getAllRoles aufgerufen');
        // Prüfen, ob Prisma-Verbindung hergestellt ist
        yield prisma.$connect();
        console.log('Prisma-Verbindung OK');
        const roles = yield prisma.role.findMany({
            include: {
                permissions: true
            }
        });
        console.log('Gefundene Rollen:', roles.length);
        res.json(roles);
    }
    catch (error) {
        console.error('Error in getAllRoles:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Rollen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllRoles = getAllRoles;
// Eine spezifische Rolle abrufen
const getRoleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        const role = yield prisma.role.findUnique({
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
    }
    catch (error) {
        console.error('Error in getRoleById:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Rolle',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRoleById = getRoleById;
// Neue Rolle erstellen
const createRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const role = yield prisma.role.create({
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
        }
        catch (prismaError) {
            console.error('Prisma-Fehler beim Erstellen der Rolle:', prismaError);
            throw prismaError;
        }
    }
    catch (error) {
        console.error('Error in createRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Erstellen der Rolle',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.createRole = createRole;
// Rolle aktualisieren
const updateRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, description, permissions } = req.body;
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        console.log(`Aktualisierung für Rolle mit ID ${roleId} begonnen...`);
        console.log('Neue Daten:', { name, description, permissions: permissions.length });
        // Transaktion verwenden, um sicherzustellen, dass alle Schritte erfolgreich sind oder komplett zurückgerollt werden
        const updatedRole = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Prüfe, ob die Rolle existiert
            const existingRole = yield tx.role.findUnique({
                where: { id: roleId },
                include: { permissions: true }
            });
            if (!existingRole) {
                throw new Error(`Rolle mit ID ${roleId} wurde nicht gefunden`);
            }
            console.log(`Bestehende Rolle gefunden: ${existingRole.name} mit ${existingRole.permissions.length} Berechtigungen`);
            // 2. Lösche alle bestehenden Berechtigungen
            const deletedPermissions = yield tx.permission.deleteMany({
                where: { roleId: roleId }
            });
            console.log(`${deletedPermissions.count} alte Berechtigungen gelöscht`);
            // 3. Aktualisiere die Rolle selbst
            const role = yield tx.role.update({
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
        }));
        res.json(updatedRole);
    }
    catch (error) {
        console.error('Error in updateRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            // Spezifische Fehlerbehandlung für Prisma-Fehler
            let errorMessage = 'Fehler beim Aktualisieren der Rolle';
            if (error.code === 'P2002') {
                errorMessage = 'Eine Rolle mit diesem Namen existiert bereits';
            }
            else if (error.code === 'P2025') {
                errorMessage = 'Rolle wurde nicht gefunden';
            }
            res.status(400).json({
                message: errorMessage,
                code: error.code,
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Aktualisieren der Rolle',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateRole = updateRole;
// Rolle löschen
const deleteRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Prüfe, ob die Rolle existiert
            const role = yield tx.role.findUnique({
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
                const usersWithThisRoleAsLastUsed = yield tx.userRole.findMany({
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
                    const otherUserRoles = yield tx.userRole.findMany({
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
                        yield tx.userRole.update({
                            where: {
                                id: replacementRole.id
                            },
                            data: {
                                lastUsed: true
                            }
                        });
                        console.log(`Benutzer ${userRole.userId} erhält Rolle ${replacementRole.roleId} (${replacementRole.role.name}) als neue lastUsed-Rolle`);
                    }
                    else {
                        console.log(`Warnung: Benutzer ${userRole.userId} hat keine anderen Rollen, nach dem Löschen keine aktive Rolle mehr`);
                    }
                }
            }
            // 3. Lösche alle Benutzer-Rollen-Verknüpfungen
            const deletedUserRoles = yield tx.userRole.deleteMany({
                where: { roleId: roleId }
            });
            console.log(`${deletedUserRoles.count} Benutzer-Rollen-Verknüpfungen gelöscht`);
            // 4. Lösche alle Berechtigungen der Rolle
            const deletedPermissions = yield tx.permission.deleteMany({
                where: { roleId: roleId }
            });
            console.log(`${deletedPermissions.count} Berechtigungen gelöscht`);
            // 5. Lösche die Rolle selbst
            const deletedRole = yield tx.role.delete({
                where: { id: roleId }
            });
            console.log(`Rolle '${deletedRole.name}' erfolgreich gelöscht`);
        }));
        res.json({ message: 'Rolle erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error in deleteRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            // Spezifische Fehlerbehandlung für Prisma-Fehler
            let errorMessage = 'Fehler beim Löschen der Rolle';
            // Behandlung von Foreign-Key-Fehlern
            if (error.code === 'P2003') {
                errorMessage = 'Die Rolle kann nicht gelöscht werden, da sie noch mit Benutzern verknüpft ist';
            }
            else if (error.code === 'P2025') {
                errorMessage = 'Rolle wurde nicht gefunden oder bereits gelöscht';
            }
            res.status(400).json({
                message: errorMessage,
                code: error.code,
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Löschen der Rolle',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.deleteRole = deleteRole;
// Berechtigungen einer Rolle abrufen
const getRolePermissions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        const permissions = yield prisma.permission.findMany({
            where: { roleId: roleId }
        });
        res.json(permissions);
    }
    catch (error) {
        console.error('Error in getRolePermissions:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Berechtigungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRolePermissions = getRolePermissions;
//# sourceMappingURL=roleController.js.map