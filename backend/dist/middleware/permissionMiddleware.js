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
exports.isAdmin = exports.checkPermission = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware zur Überprüfung von Benutzerberechtigungen
 * @param requiredAccess - Erforderliche Zugriffsebene ('read', 'write', 'both')
 * @param entityType - Typ der Entität ('page' oder 'table')
 * @returns Express Middleware
 */
const checkPermission = (requiredAccess, entityType = 'page') => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = parseInt(req.userId, 10);
            const roleId = parseInt(req.roleId, 10);
            if (isNaN(userId)) {
                return res.status(401).json({
                    message: 'Nicht authentifiziert',
                    error: 'NOT_AUTHENTICATED'
                });
            }
            if (isNaN(roleId)) {
                return res.status(403).json({
                    message: 'Keine Rolle im Token',
                    error: 'NO_ROLE_IN_TOKEN'
                });
            }
            console.log(`[PERMISSION] Prüfe Berechtigung - UserId: ${userId}, RoleId: ${roleId}`);
            // Hole die Rolle und deren Berechtigungen direkt mit der roleId aus dem Token
            const role = yield prisma.role.findUnique({
                where: { id: roleId },
                include: { permissions: true }
            });
            if (!role) {
                return res.status(403).json({
                    message: 'Rolle nicht gefunden',
                    error: 'ROLE_NOT_FOUND'
                });
            }
            // Bestimme die aktuelle Entität aus der URL
            const currentEntity = req.baseUrl.split('/').pop() || 'dashboard';
            console.log(`[PERMISSION] Aktuelle Entität: ${currentEntity}, Typ: ${entityType}`);
            // Finde die relevante Berechtigung
            const permission = role.permissions.find(p => p.entity === currentEntity && p.entityType === entityType);
            if (!permission) {
                console.log(`[PERMISSION] Keine Berechtigung gefunden für Entität: ${currentEntity}, Typ: ${entityType}`);
                return res.status(403).json({
                    message: `Keine Berechtigung für ${entityType} ${currentEntity}`,
                    error: 'NO_ENTITY_PERMISSION'
                });
            }
            console.log(`[PERMISSION] Gefundene Berechtigung: ${permission.accessLevel} für ${entityType} ${permission.entity}`);
            // Prüfe die Zugriffsebene
            const hasAccess = checkAccessLevel(permission.accessLevel, requiredAccess);
            if (!hasAccess) {
                console.log(`[PERMISSION] Unzureichende Berechtigungen: Hat ${permission.accessLevel}, benötigt ${requiredAccess}`);
                return res.status(403).json({
                    message: 'Unzureichende Berechtigungen',
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            // Füge die Berechtigungen zum Request hinzu
            req.userPermissions = role.permissions;
            console.log(`[PERMISSION] Zugriff gewährt für ${entityType} ${currentEntity}`);
            next();
        }
        catch (error) {
            console.error('Error in permission middleware:', error);
            res.status(500).json({
                message: 'Fehler bei der Berechtigungsprüfung',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    });
};
exports.checkPermission = checkPermission;
/**
 * Prüft, ob die vorhandene Zugriffsebene ausreichend ist
 * @param hasLevel - Vorhandene Zugriffsebene
 * @param needsLevel - Benötigte Zugriffsebene
 * @returns boolean
 */
function checkAccessLevel(hasLevel, needsLevel) {
    if (hasLevel === 'none')
        return false;
    if (hasLevel === 'both')
        return true;
    if (needsLevel === 'both')
        return false; // Nur 'both' kann 'both' erfüllen
    return hasLevel === needsLevel; // Exakte Übereinstimmung oder 'both' (wegen vorherigem Check)
}
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