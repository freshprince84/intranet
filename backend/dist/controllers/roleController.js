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
exports.updateRoleBranches = exports.getRoleBranches = exports.getRolePermissions = exports.deleteRole = exports.updateRole = exports.createRole = exports.getRoleById = exports.getAllRoles = exports.isRoleAvailableForBranch = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const translations_1 = require("../utils/translations");
const organization_1 = require("../middleware/organization");
const prisma_1 = require("../utils/prisma");
const userCache_1 = require("../services/userCache");
const logger_1 = require("../utils/logger");
const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
};
// Hilfsfunktion: Prüft, ob eine Rolle für eine Branch verfügbar ist
const isRoleAvailableForBranch = (roleId, branchId) => __awaiter(void 0, void 0, void 0, function* () {
    const role = yield prisma_1.prisma.role.findUnique({
        where: { id: roleId },
        select: {
            allBranches: true,
            branches: {
                where: { branchId },
                select: { id: true }
            }
        }
    });
    if (!role)
        return false;
    // Rolle ist verfügbar, wenn allBranches = true ODER es gibt einen RoleBranch Eintrag
    return role.allBranches || role.branches.length > 0;
});
exports.isRoleAvailableForBranch = isRoleAvailableForBranch;
// Alle Rollen abrufen (optional gefiltert nach branchId)
const getAllRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        logger_1.logger.log('getAllRoles aufgerufen');
        // Datenisolation: Zeigt alle Rollen der Organisation oder nur eigene (wenn standalone)
        const roleFilter = (0, organization_1.getDataIsolationFilter)(req, 'role');
        // Optional: Filter nach branchId (aus Query-Parameter)
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : null;
        let roles = yield prisma_1.prisma.role.findMany({
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
        logger_1.logger.log('Gefundene Rollen:', roles.length);
        res.json(roles);
    }
    catch (error) {
        logger_1.logger.error('Error in getAllRoles:', error);
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
        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }
        const role = yield prisma_1.prisma.role.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error('Error in getRoleById:', error);
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
        const { name, description, permissions, allBranches = false, branchIds = [] } = req.body;
        logger_1.logger.log('Request Body für createRole:', req.body);
        logger_1.logger.log('Permissions aus Request:', permissions);
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
        logger_1.logger.log('Berechtigungsdetails:');
        permissions.forEach((perm, idx) => {
            logger_1.logger.log(`Permission ${idx + 1}:`, JSON.stringify(perm));
            logger_1.logger.log(`  - Schlüssel: ${Object.keys(perm).join(', ')}`);
            logger_1.logger.log(`  - entity: ${perm.entity}, entityType: ${perm.entityType || 'nicht angegeben'}, accessLevel: ${perm.accessLevel}`);
        });
        // Prüfe ob User eine Organisation hat
        const organizationId = req.organizationId;
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
            const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
            const existingBranches = yield prisma_1.prisma.branch.findMany({
                where: Object.assign({ id: { in: branchIds } }, branchFilter)
            });
            if (existingBranches.length !== branchIds.length) {
                return res.status(400).json({
                    message: 'Eine oder mehrere Branches wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
                });
            }
        }
        try {
            const role = yield prisma_1.prisma.role.create({
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
            logger_1.logger.log('Neue Rolle wurde erstellt, überprüfe Permissions:');
            if (role.permissions.length === 0) {
                logger_1.logger.error('WARNUNG: Rolle wurde erstellt, aber keine Berechtigungen wurden angelegt!');
            }
            else {
                logger_1.logger.log(`Rolle hat ${role.permissions.length} Berechtigungen:`);
                role.permissions.forEach((perm, idx) => {
                    logger_1.logger.log(`Gespeicherte Permission ${idx + 1}:`, JSON.stringify(perm));
                });
            }
            // Benachrichtigung für Administratoren der Organisation senden
            const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
            const admins = yield prisma_1.prisma.user.findMany({
                where: Object.assign(Object.assign({}, userFilter), { roles: {
                        some: {
                            role: {
                                name: 'Admin',
                                organizationId: req.organizationId
                            }
                        }
                    } })
            });
            for (const admin of admins) {
                const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
                const notificationText = (0, translations_1.getRoleNotificationText)(adminLang, 'created', name, false);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: admin.id,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.role,
                    relatedEntityId: role.id,
                    relatedEntityType: 'create'
                });
            }
            logger_1.logger.log('Neue Rolle erfolgreich erstellt:', role);
            res.status(201).json(role);
        }
        catch (prismaError) {
            logger_1.logger.error('Prisma-Fehler beim Erstellen der Rolle:', prismaError);
            throw prismaError;
        }
    }
    catch (error) {
        logger_1.logger.error('Error in createRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            logger_1.logger.log('Fehlercode:', error.code);
            logger_1.logger.log('Fehlermeldung:', error.message);
            logger_1.logger.log('Meta:', error.meta);
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
        const { name, description, permissions, allBranches, branchIds } = req.body;
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'role', roleId);
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
            const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
            const existingBranches = yield prisma_1.prisma.branch.findMany({
                where: Object.assign({ id: { in: branchIds } }, branchFilter)
            });
            if (existingBranches.length !== branchIds.length) {
                return res.status(400).json({
                    message: 'Eine oder mehrere Branches wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
                });
            }
        }
        logger_1.logger.log(`Aktualisierung für Rolle mit ID ${roleId} begonnen...`);
        logger_1.logger.log('Neue Daten:', { name, description, permissions: permissions.length, allBranches, branchIds });
        // Detaillierte Ausgabe der Berechtigungen
        logger_1.logger.log('Detaillierte Berechtigungen:');
        permissions.forEach((perm, index) => {
            logger_1.logger.log(`Permission ${index + 1}:`, JSON.stringify(perm));
        });
        // Transaktion verwenden, um sicherzustellen, dass alle Schritte erfolgreich sind oder komplett zurückgerollt werden
        const updatedRole = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Prüfe, ob die Rolle existiert
            const existingRole = yield tx.role.findUnique({
                where: { id: roleId },
                include: {
                    permissions: true,
                    branches: true
                }
            });
            if (!existingRole) {
                throw new Error(`Rolle mit ID ${roleId} wurde nicht gefunden`);
            }
            logger_1.logger.log(`Bestehende Rolle gefunden: ${existingRole.name} mit ${existingRole.permissions.length} Berechtigungen`);
            // 2. Lösche alle bestehenden Berechtigungen
            const deletedPermissions = yield tx.permission.deleteMany({
                where: { roleId: roleId }
            });
            logger_1.logger.log(`${deletedPermissions.count} alte Berechtigungen gelöscht`);
            // 3. Aktualisiere Branch-Zuweisungen (wenn allBranches oder branchIds angegeben)
            if (allBranches !== undefined) {
                // Lösche alle bestehenden RoleBranch Einträge
                yield tx.roleBranch.deleteMany({
                    where: { roleId: roleId }
                });
                // Wenn allBranches = false und branchIds angegeben, erstelle neue RoleBranch Einträge
                if (!allBranches && branchIds && branchIds.length > 0) {
                    yield tx.roleBranch.createMany({
                        data: branchIds.map(branchId => ({
                            roleId: roleId,
                            branchId: branchId
                        }))
                    });
                }
            }
            // 4. Aktualisiere die Rolle selbst
            const updateData = {
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
            const role = yield tx.role.update({
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
            logger_1.logger.log(`Rolle '${role.name}' erfolgreich aktualisiert mit ${role.permissions.length} neuen Berechtigungen`);
            // Überprüfe die gespeicherten Berechtigungen
            if (role.permissions.length === 0) {
                logger_1.logger.error('WARNUNG: Rolle wurde aktualisiert, aber keine Berechtigungen wurden angelegt!');
            }
            else {
                logger_1.logger.log('Details der gespeicherten Berechtigungen:');
                role.permissions.forEach((perm, idx) => {
                    logger_1.logger.log(`Gespeicherte Permission ${idx + 1}:`, JSON.stringify(perm));
                });
            }
            return role;
        }));
        // ✅ PERFORMANCE: UserCache invalidieren für alle User mit dieser Rolle
        // Hole alle User mit dieser Rolle (wird später auch für Benachrichtigungen benötigt)
        const usersWithRoleForCache = yield prisma_1.prisma.userRole.findMany({
            where: { roleId: roleId },
            select: { userId: true }
        });
        // Invalidiere Cache für alle betroffenen User
        for (const userRole of usersWithRoleForCache) {
            userCache_1.userCache.invalidate(userRole.userId);
        }
        // Benachrichtigung für Administratoren senden
        const admins = yield prisma_1.prisma.user.findMany({
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
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            const notificationText = (0, translations_1.getRoleNotificationText)(adminLang, 'updated', updatedRole.name, false);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.role,
                relatedEntityId: updatedRole.id,
                relatedEntityType: 'update'
            });
        }
        // Benachrichtigung für Benutzer mit dieser Rolle senden (nur User der Organisation)
        const roleFilter = (0, organization_1.getDataIsolationFilter)(req, 'role');
        const usersWithRole = yield prisma_1.prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        roleId: roleId,
                        role: Object.assign({}, roleFilter)
                    }
                }
            }
        });
        for (const user of usersWithRole) {
            // Nicht an Administratoren senden, die bereits benachrichtigt wurden
            if (!admins.some(admin => admin.id === user.id)) {
                const userLang = yield (0, translations_1.getUserLanguage)(user.id);
                const notificationText = (0, translations_1.getRoleNotificationText)(userLang, 'updated', updatedRole.name, true);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: user.id,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.role,
                    relatedEntityId: updatedRole.id,
                    relatedEntityType: 'update'
                });
            }
        }
        res.json(updatedRole);
    }
    catch (error) {
        logger_1.logger.error('Error in updateRole:', error);
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
        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }
        // Rolle vor dem Löschen abrufen
        const role = yield prisma_1.prisma.role.findUnique({
            where: { id: roleId },
            include: {
                users: true
            }
        });
        if (!role) {
            return res.status(404).json({ message: 'Rolle nicht gefunden' });
        }
        // Benutzer mit dieser Rolle abrufen (nur User der Organisation)
        const roleFilter = (0, organization_1.getDataIsolationFilter)(req, 'role');
        const usersWithRole = yield prisma_1.prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        roleId: roleId,
                        role: Object.assign({}, roleFilter)
                    }
                }
            }
        });
        // Transaktion für das Löschen verwenden
        yield prisma_1.prisma.$transaction([
            // 1. Lösche alle Berechtigungen dieser Rolle
            prisma_1.prisma.permission.deleteMany({
                where: { roleId: roleId }
            }),
            // 2. Lösche alle RoleBranch-Verknüpfungen
            prisma_1.prisma.roleBranch.deleteMany({
                where: { roleId: roleId }
            }),
            // 3. Lösche alle Benutzer-Rollen-Verknüpfungen
            prisma_1.prisma.userRole.deleteMany({
                where: { roleId: roleId }
            }),
            // 4. Lösche die Rolle selbst
            prisma_1.prisma.role.delete({
                where: { id: roleId }
            })
        ]);
        // Benachrichtigung für Administratoren senden
        const admins = yield prisma_1.prisma.user.findMany({
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
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            const notificationText = (0, translations_1.getRoleNotificationText)(adminLang, 'deleted', role.name, false);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.role,
                relatedEntityId: roleId,
                relatedEntityType: 'delete'
            });
        }
        // Benachrichtigung für Benutzer mit dieser Rolle senden
        for (const user of usersWithRole) {
            // Nicht an Administratoren senden, die bereits benachrichtigt wurden
            if (!admins.some(admin => admin.id === user.id)) {
                const userLang = yield (0, translations_1.getUserLanguage)(user.id);
                const notificationText = (0, translations_1.getRoleNotificationText)(userLang, 'deleted', role.name, true);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: user.id,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.role,
                    relatedEntityId: roleId,
                    relatedEntityType: 'delete'
                });
            }
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Error in deleteRole:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }
        const permissions = yield prisma_1.prisma.permission.findMany({
            where: { roleId: roleId }
        });
        res.json(permissions);
    }
    catch (error) {
        logger_1.logger.error('Error in getRolePermissions:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Berechtigungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRolePermissions = getRolePermissions;
// Branches einer Rolle abrufen
const getRoleBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roleId = parseInt(req.params.id, 10);
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'role', roleId);
        if (!hasAccess) {
            return res.status(403).json({ message: 'Zugriff auf diese Rolle verweigert' });
        }
        const role = yield prisma_1.prisma.role.findUnique({
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
    }
    catch (error) {
        logger_1.logger.error('Error in getRoleBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Branches',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRoleBranches = getRoleBranches;
const updateRoleBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const roleId = parseInt(req.params.id, 10);
        const { allBranches, branchIds = [] } = req.body;
        if (isNaN(roleId)) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        // Prüfe ob Rolle zur Organisation gehört
        const hasAccess = yield (0, organization_1.belongsToOrganization)(req, 'role', roleId);
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
            const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
            const existingBranches = yield prisma_1.prisma.branch.findMany({
                where: Object.assign({ id: { in: branchIds } }, branchFilter)
            });
            if (existingBranches.length !== branchIds.length) {
                return res.status(400).json({
                    message: 'Eine oder mehrere Branches wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
                });
            }
        }
        const updatedRole = yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Lösche alle bestehenden RoleBranch Einträge
            yield tx.roleBranch.deleteMany({
                where: { roleId: roleId }
            });
            // Aktualisiere allBranches Flag
            const updateData = {};
            if (allBranches !== undefined) {
                updateData.allBranches = allBranches;
            }
            // Wenn allBranches = false und branchIds angegeben, erstelle neue RoleBranch Einträge
            if (allBranches !== undefined && !allBranches && branchIds.length > 0) {
                yield tx.roleBranch.createMany({
                    data: branchIds.map(branchId => ({
                        roleId: roleId,
                        branchId: branchId
                    }))
                });
            }
            // Aktualisiere die Rolle
            return yield tx.role.update({
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
        }));
        res.json({
            roleId: updatedRole.id,
            allBranches: updatedRole.allBranches,
            branches: updatedRole.branches.map(rb => rb.branch)
        });
    }
    catch (error) {
        logger_1.logger.error('Error in updateRoleBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Branches',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateRoleBranches = updateRoleBranches;
//# sourceMappingURL=roleController.js.map