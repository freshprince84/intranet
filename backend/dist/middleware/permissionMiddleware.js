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
 * @returns Express Middleware
 */
const checkPermission = (requiredAccess) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
            if (!userId) {
                return res.status(401).json({
                    message: 'Nicht authentifiziert',
                    error: 'NOT_AUTHENTICATED'
                });
            }
            // Hole die aktive Rolle des Benutzers
            const userRole = yield prisma.userRole.findFirst({
                where: {
                    userId,
                    lastUsed: true
                },
                include: {
                    role: {
                        include: {
                            permissions: true
                        }
                    }
                }
            });
            if (!userRole) {
                return res.status(403).json({
                    message: 'Keine aktive Rolle gefunden',
                    error: 'NO_ACTIVE_ROLE'
                });
            }
            // Bestimme die aktuelle Seite aus der URL
            const currentPage = req.baseUrl.split('/').pop() || 'dashboard';
            // Finde die relevante Berechtigung
            const permission = userRole.role.permissions.find(p => p.page === currentPage);
            if (!permission) {
                return res.status(403).json({
                    message: 'Keine Berechtigung für diese Seite',
                    error: 'NO_PAGE_PERMISSION'
                });
            }
            // Prüfe die Zugriffsebene
            const hasAccess = checkAccessLevel(permission.accessLevel, requiredAccess);
            if (!hasAccess) {
                return res.status(403).json({
                    message: 'Unzureichende Berechtigungen',
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }
            // Füge die Berechtigungen zum Request hinzu
            req.userPermissions = userRole.role.permissions;
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
        return hasLevel === 'both';
    return hasLevel === needsLevel || hasLevel === 'both';
}
/**
 * Middleware zur Überprüfung von Admin-Berechtigungen
 */
const isAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                message: 'Nicht authentifiziert',
                error: 'NOT_AUTHENTICATED'
            });
        }
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId,
                lastUsed: true,
                role: {
                    name: 'admin'
                }
            }
        });
        if (!userRole) {
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