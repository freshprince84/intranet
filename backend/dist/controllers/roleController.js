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
        const roles = yield prisma.role.findMany({
            include: {
                permissions: true
            }
        });
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
        res.status(201).json(role);
    }
    catch (error) {
        console.error('Error in createRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                message: 'Fehler beim Erstellen der Rolle',
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
        // Lösche zuerst alle bestehenden Berechtigungen
        yield prisma.permission.deleteMany({
            where: { roleId: roleId }
        });
        // Aktualisiere die Rolle und füge neue Berechtigungen hinzu
        const role = yield prisma.role.update({
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
    }
    catch (error) {
        console.error('Error in updateRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                message: 'Fehler beim Aktualisieren der Rolle',
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
        // Lösche zuerst alle Berechtigungen der Rolle
        yield prisma.permission.deleteMany({
            where: { roleId: roleId }
        });
        // Lösche dann die Rolle selbst
        yield prisma.role.delete({
            where: { id: roleId }
        });
        res.json({ message: 'Rolle erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error in deleteRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                message: 'Fehler beim Löschen der Rolle',
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