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
exports.requireCompleteProfile = exports.isAdmin = exports.checkUserPermission = exports.checkPermission = void 0;
const prisma_1 = require("../utils/prisma");
const userCache_1 = require("../services/userCache");
const logger_1 = require("../utils/logger");
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
            // Nur für Rate Shopping Route loggen (um Log-Spam zu vermeiden)
            if (req.path.includes('rate-shopping')) {
                logger_1.logger.warn(`[checkPermission] 🔍 Prüfe Permission: Entity=${entity}, EntityType=${entityType}, RequiredAccess=${requiredAccess}, Path=${req.path}`);
            }
            const userId = parseInt(req.userId, 10);
            const roleId = parseInt(req.roleId, 10);
            if (isNaN(userId) || isNaN(roleId)) {
                logger_1.logger.error(`[checkPermission] ❌ Authentifizierung fehlgeschlagen: userId=${req.userId}, roleId=${req.roleId}`);
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }
            if (req.path.includes('rate-shopping')) {
                logger_1.logger.warn(`[checkPermission] ✅ Authentifiziert: UserId=${userId}, RoleId=${roleId}`);
            }
            // Prüfe, ob der Benutzer die erforderliche Berechtigung hat
            const hasAccess = yield (0, exports.checkUserPermission)(userId, roleId, entity, requiredAccess, entityType);
            if (!hasAccess) {
                logger_1.logger.error(`[checkPermission] ❌ VERWEIGERT: Entity=${entity}, EntityType=${entityType}, UserId=${userId}, RoleId=${roleId}`);
                return res.status(403).json({
                    message: 'Zugriff verweigert',
                    details: `Keine ausreichenden Berechtigungen für ${entityType} ${entity}`
                });
            }
            if (req.path.includes('rate-shopping')) {
                logger_1.logger.warn(`[checkPermission] ✅ Permission erteilt für Entity=${entity}, EntityType=${entityType}`);
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('[checkPermission] ❌ Fehler bei der Berechtigungsprüfung:', error);
            res.status(500).json({ message: 'Interner Server-Fehler' });
        }
    });
};
exports.checkPermission = checkPermission;
// Hilfsfunktion zur Überprüfung der Berechtigungen eines Benutzers
// ✅ PERFORMANCE: Verwendet UserCache statt eigene DB-Query
const checkUserPermission = (userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1) => __awaiter(void 0, [userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1], void 0, function* (userId, roleId, currentEntity, requiredAccess, entityType = 'page') {
    try {
        // ✅ PERFORMANCE: Verwende UserCache statt eigene DB-Query
        const cached = yield userCache_1.userCache.get(userId);
        if (!cached || !cached.user) {
            logger_1.logger.error(`[checkUserPermission] ❌ User nicht gefunden: userId=${userId}`);
            return false;
        }
        // Finde aktive Rolle (mit lastUsed: true)
        const activeRole = cached.user.roles.find((r) => r.lastUsed);
        if (!activeRole) {
            logger_1.logger.error(`[checkUserPermission] ❌ Keine aktive Rolle gefunden: userId=${userId}`);
            return false;
        }
        // Prüfe ob die roleId mit der aktiven Rolle übereinstimmt
        if (activeRole.role.id !== roleId) {
            logger_1.logger.warn(`[checkUserPermission] ⚠️ roleId mismatch: requested=${roleId}, active=${activeRole.role.id}, verwende aktive Rolle`);
            // Verwende die aktive Rolle statt der angeforderten roleId
        }
        // Hole Permissions aus der aktiven Rolle (bereits im Cache geladen)
        const permissions = activeRole.role.permissions || [];
        // Suche nach der Berechtigung für die angeforderte Entität
        const permission = permissions.find((p) => p.entity === currentEntity && p.entityType === entityType);
        if (!permission) {
            logger_1.logger.error(`[checkUserPermission] ❌ Berechtigung nicht gefunden: entity=${currentEntity}, entityType=${entityType}, role="${activeRole.role.name}" (ID: ${activeRole.role.id})`);
            logger_1.logger.log(`[checkUserPermission] Verfügbare Cerebro-Permissions:`);
            permissions
                .filter((p) => p.entity.includes('cerebro'))
                .forEach((p) => {
                logger_1.logger.log(`   - ${p.entity} (${p.entityType}): ${p.accessLevel}`);
            });
            return false;
        }
        // Prüfe, ob die Berechtigung ausreichend ist
        const hasAccess = permission.accessLevel === 'both' ||
            (requiredAccess === 'read' && (permission.accessLevel === 'read' || permission.accessLevel === 'write')) ||
            (requiredAccess === 'write' && permission.accessLevel === 'write');
        if (!hasAccess) {
            logger_1.logger.error(`[checkUserPermission] ❌ Zugriff unzureichend: ${permission.accessLevel} < ${requiredAccess}`);
            return false;
        }
        // Zugriff gewähren, wenn alle Prüfungen bestanden wurden
        return true;
    }
    catch (error) {
        logger_1.logger.error('Fehler bei der Berechtigungsprüfung:', error);
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
        const role = yield prisma_1.prisma.role.findUnique({
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
        logger_1.logger.error('Error in admin check middleware:', error);
        res.status(500).json({
            message: 'Fehler bei der Admin-Berechtigungsprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.isAdmin = isAdmin;
/**
 * Middleware zur Überprüfung der Profilvollständigkeit
 * Erlaubt Zugriff nur, wenn Profil vollständig ist (username, email, country, language)
 * Ausnahmen: Profil-Seite selbst und Profil-Prüf-Endpoint
 */
const requireCompleteProfile = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Ausnahmen: Profil-Seite und Profil-Prüf-Endpoint
        const path = req.path;
        if (path.includes('/profile') && (req.method === 'GET' || req.method === 'PUT')) {
            // Erlaube Zugriff auf Profil-Seite selbst
            return next();
        }
        // Prüfe ob User Mitglied einer Organisation ist
        const userRole = yield prisma_1.prisma.userRole.findFirst({
            where: {
                userId: userId,
                lastUsed: true
            },
            include: {
                role: {
                    select: {
                        organizationId: true
                    }
                }
            }
        });
        // WICHTIG: profileComplete ist nur relevant, wenn User Mitglied einer Organisation ist
        // Vor Organisation-Beitritt: Keine Profil-Blockierung
        const hasOrganization = (userRole === null || userRole === void 0 ? void 0 : userRole.role.organizationId) !== null && (userRole === null || userRole === void 0 ? void 0 : userRole.role.organizationId) !== undefined;
        if (!hasOrganization) {
            // User hat keine Organisation → Keine Profil-Blockierung
            return next();
        }
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                profileComplete: true,
                username: true,
                email: true,
                country: true,
                language: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Prüfe Profilvollständigkeit (nur wenn User Mitglied einer Organisation ist)
        // username, email, language - country NICHT nötig
        const isComplete = !!(user.username &&
            user.email &&
            user.language);
        // Update profileComplete, falls noch nicht gesetzt
        if (isComplete !== user.profileComplete) {
            yield prisma_1.prisma.user.update({
                where: { id: userId },
                data: { profileComplete: isComplete }
            });
        }
        if (!isComplete) {
            return res.status(403).json({
                message: 'Profil muss zuerst vervollständigt werden',
                redirectTo: '/profile',
                missingFields: [
                    !user.username ? 'username' : null,
                    !user.email ? 'email' : null,
                    !user.language ? 'language' : null
                ].filter(Boolean)
            });
        }
        next();
    }
    catch (error) {
        logger_1.logger.error('Error in requireCompleteProfile middleware:', error);
        res.status(500).json({
            message: 'Fehler bei der Profilprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.requireCompleteProfile = requireCompleteProfile;
//# sourceMappingURL=permissionMiddleware.js.map