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
exports.isAdmin = exports.checkUserPermission = exports.checkPermission = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware zur Überprüfung von Berechtigungen
 * @param entity - Entität (z.B. 'page', 'table' oder 'cerebro')
 * @param requiredAccess - Erforderliche Zugriffsebene ('read' oder 'write')
 * @param entityType - Typ der Entität ('page', 'table' oder 'cerebro')
 * @returns Express Middleware
 */
const checkPermission = (entity, requiredAccess, entityType = 'page') => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = parseInt(req.userId, 10);
            const roleId = parseInt(req.roleId, 10);
            if (isNaN(userId) || isNaN(roleId)) {
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }
            // Prüfe, ob der Benutzer die erforderliche Berechtigung hat
            const hasAccess = yield (0, exports.checkUserPermission)(userId, roleId, entity, requiredAccess, entityType);
            if (!hasAccess) {
                return res.status(403).json({
                    message: 'Zugriff verweigert',
                    details: `Keine ausreichenden Berechtigungen für ${entityType} ${entity}`
                });
            }
            next();
        }
        catch (error) {
            console.error('Fehler bei der Berechtigungsprüfung:', error);
            res.status(500).json({ message: 'Interner Server-Fehler' });
        }
    });
};
exports.checkPermission = checkPermission;
// Hilfsfunktion zur Überprüfung der Berechtigungen eines Benutzers
const checkUserPermission = (userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1) => __awaiter(void 0, [userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1], void 0, function* (userId, roleId, currentEntity, requiredAccess, entityType = 'page') {
    try {
        // Hole die Berechtigungen für die aktuelle Rolle des Benutzers
        const role = yield prisma.role.findUnique({
            where: { id: roleId },
            include: { permissions: true }
        });
        if (!role) {
            return false;
        }
        // Suche nach der Berechtigung für die angeforderte Entität
        const permission = role.permissions.find(p => p.entity === currentEntity && p.entityType === entityType);
        if (!permission) {
            return false;
        }
        // Prüfe, ob die Berechtigung ausreichend ist
        const hasAccess = permission.accessLevel === 'both' ||
            (requiredAccess === 'read' && (permission.accessLevel === 'read' || permission.accessLevel === 'write')) ||
            (requiredAccess === 'write' && permission.accessLevel === 'write');
        if (!hasAccess) {
            return false;
        }
        // Zugriff gewähren, wenn alle Prüfungen bestanden wurden
        return true;
    }
    catch (error) {
        console.error('Fehler bei der Berechtigungsprüfung:', error);
        return false;
    }
});
exports.checkUserPermission = checkUserPermission;
/**
 * Middleware zur Überprüfung von Admin-Berechtigungen
 */
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                message: 'Nicht authentifiziert',
                error: 'NOT_AUTHENTICATED'
            });
        }
        // Überprüfe, ob die Rolle 'admin' ist
        const role = yield prisma.role.findUnique({
            where: { id: roleId }
        });
        if (!role || role.name !== 'admin') {
            return res.status(403).json({
                message: 'Admin-Berechtigung erforderlich',
                error: 'ADMIN_REQUIRED'
            });
        }
        next();
    }
    catch (error) {
        console.error('Error in admin check middleware:', error);
        res.status(500).json({
            message: 'Fehler bei der Admin-Berechtigungsprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.isAdmin = isAdmin;
//# sourceMappingURL=permissionMiddleware.js.map