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
exports.requireCompleteProfile = exports.isAdmin = exports.checkUserPermission = exports.checkUserPermissionWithDetails = exports.checkPermission = void 0;
const prisma_1 = require("../utils/prisma");
const userCache_1 = require("../services/userCache");
const logger_1 = require("../utils/logger");
/**
 * Konvertiert Legacy-AccessLevel zu neuem Format
 */
function convertLegacyAccessLevel(level) {
    switch (level) {
        case 'read': return 'all_read';
        case 'write': return 'own_both';
        case 'both': return 'all_both';
        case 'none': return 'none';
        default:
            // Prüfe ob bereits neues Format
            if (['own_read', 'own_both', 'all_read', 'all_both', 'none'].includes(level)) {
                return level;
            }
            return 'none';
    }
}
/**
 * Prüft ob ein AccessLevel den erforderlichen Zugang gewährt
 * @param currentLevel - Aktuelles AccessLevel des Users
 * @param requiredAccess - Erforderlicher Zugang ('read' oder 'write')
 * @returns Ob Zugang gewährt wird und ob Ownership-Check nötig ist
 */
function evaluateAccess(currentLevel, requiredAccess) {
    const normalizedLevel = convertLegacyAccessLevel(currentLevel);
    switch (normalizedLevel) {
        case 'none':
            return { hasAccess: false, requiresOwnership: false };
        case 'all_both':
            return { hasAccess: true, requiresOwnership: false };
        case 'all_read':
            return { hasAccess: requiredAccess === 'read', requiresOwnership: false };
        case 'own_both':
            return { hasAccess: true, requiresOwnership: true };
        case 'own_read':
            return { hasAccess: requiredAccess === 'read', requiresOwnership: true };
        default:
            return { hasAccess: false, requiresOwnership: false };
    }
}
/**
 * Ownership-Felder pro Entity (für Row-Level-Isolation)
 */
const OWNERSHIP_FIELDS = {
    // Requests
    'requests': ['requesterId', 'responsibleId'],
    'request_create': ['requesterId'],
    'request_edit': ['requesterId', 'responsibleId'],
    'request_delete': ['requesterId'],
    // Tasks
    // ✅ FIX: roleId entfernt für own_both - nur responsibleId und qualityControlId
    // roleId wird nur verwendet, wenn accessLevel all_both ist (siehe getDataIsolationFilter)
    'todos': ['responsibleId', 'qualityControlId'],
    'task_create': ['responsibleId'],
    // ✅ FIX: roleId entfernt für own_both - nur responsibleId und qualityControlId
    'task_edit': ['responsibleId', 'qualityControlId'],
    'task_delete': ['responsibleId'],
    // Reservations
    'reservations': ['branchId'],
    'reservation_create': [],
    'reservation_edit': ['branchId'],
    'reservation_delete': ['branchId'],
    // Tour Bookings
    'tour_bookings': ['bookedById', 'branchId'],
    'tour_booking_create': [],
    'tour_booking_edit': ['bookedById'],
    'tour_booking_cancel': ['bookedById'],
    // Worktime
    'worktime': ['userId'],
    'worktime_start': ['userId'],
    'worktime_stop': ['userId'],
    // Working Times (Workcenter)
    'working_times': ['userId'],
    'working_time_create': ['userId'],
    'working_time_edit': ['userId'],
    'working_time_delete': ['userId'],
    // Consultations
    'consultation_tracker': ['userId'],
    'consultation_list': ['userId'],
    'consultation_start': ['userId'],
    'consultation_stop': ['userId'],
    'consultation_edit': ['userId'],
    'consultation_delete': ['userId'],
    // Clients
    'client_create': [],
    'client_edit': ['createdById'],
    'client_delete': ['createdById'],
    // Payroll
    'consultation_invoices': ['userId'],
    'monthly_reports': ['userId'],
    'payroll_reports': ['userId'],
    // Password Manager
    'password_manager': ['createdById'],
    'password_entry_create': [],
    'password_entry_edit': ['createdById'],
    'password_entry_delete': ['createdById'],
};
/**
 * Middleware zur Überprüfung von Berechtigungen
 * @param entity - Entität (z.B. 'dashboard', 'requests', 'task_create')
 * @param requiredAccess - Erforderliche Zugriffsebene ('read' oder 'write')
 * @param entityType - Typ der Entität ('page' | 'box' | 'tab' | 'button' | 'table' | 'cerebro')
 * @returns Express Middleware (behält Request-Parameter-Typen bei)
 */
const checkPermission = (entity, requiredAccess, entityType = 'page') => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const isDebug = req.path.includes('rate-shopping');
            if (isDebug) {
                logger_1.logger.warn(`[checkPermission] 🔍 Prüfe: Entity=${entity}, Type=${entityType}, Access=${requiredAccess}`);
            }
            const userId = parseInt(req.userId, 10);
            const roleId = parseInt(req.roleId, 10);
            if (isNaN(userId) || isNaN(roleId)) {
                logger_1.logger.error(`[checkPermission] ❌ Nicht authentifiziert: userId=${req.userId}, roleId=${req.roleId}`);
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }
            // Hole Permission-Details
            const permissionResult = yield (0, exports.checkUserPermissionWithDetails)(userId, roleId, entity, requiredAccess, entityType);
            if (!permissionResult.hasAccess) {
                logger_1.logger.warn(`[checkPermission] ❌ VERWEIGERT: Entity=${entity}, User=${userId}, Role=${roleId}`);
                return res.status(403).json({
                    message: 'Zugriff verweigert',
                    details: `Keine ausreichenden Berechtigungen für ${entityType} ${entity}`
                });
            }
            // Speichere Permission-Kontext für Controller (Row-Level-Isolation)
            req.permissionContext = {
                accessLevel: permissionResult.accessLevel,
                isOwnershipRequired: permissionResult.requiresOwnership,
                ownershipFields: OWNERSHIP_FIELDS[entity] || []
            };
            if (isDebug) {
                logger_1.logger.warn(`[checkPermission] ✅ Erlaubt: Entity=${entity}, Level=${permissionResult.accessLevel}, Ownership=${permissionResult.requiresOwnership}`);
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('[checkPermission] ❌ Fehler:', error);
            res.status(500).json({ message: 'Interner Server-Fehler' });
        }
    });
};
exports.checkPermission = checkPermission;
/**
 * Prüft Berechtigungen und gibt Details zurück
 * Verwendet UserCache für Performance
 */
const checkUserPermissionWithDetails = (userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1) => __awaiter(void 0, [userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1], void 0, function* (userId, roleId, currentEntity, requiredAccess, entityType = 'page') {
    var _a;
    const noAccess = { hasAccess: false, accessLevel: 'none', requiresOwnership: false };
    try {
        // ✅ PERFORMANCE: Verwende UserCache
        const cached = yield userCache_1.userCache.get(userId);
        if (!cached || !cached.user) {
            logger_1.logger.error(`[checkPermission] ❌ User nicht im Cache: userId=${userId}`);
            return noAccess;
        }
        // Finde aktive Rolle
        const activeRole = cached.user.roles.find((r) => r.lastUsed);
        if (!activeRole) {
            logger_1.logger.error(`[checkPermission] ❌ Keine aktive Rolle: userId=${userId}`);
            return noAccess;
        }
        // Admin-Bypass: Prüfe ob Rollenname 'admin' enthält (case-insensitive)
        const roleName = ((_a = activeRole.role.name) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
        if (roleName === 'admin' || roleName.includes('admin')) {
            return { hasAccess: true, accessLevel: 'all_both', requiresOwnership: false };
        }
        // Hole Permissions aus der aktiven Rolle
        const permissions = activeRole.role.permissions || [];
        // Suche nach der Berechtigung
        // Versuche erst mit exaktem entityType, dann mit 'table' als Fallback für Legacy
        let permission = permissions.find((p) => p.entity === currentEntity && p.entityType === entityType);
        // Legacy-Fallback: 'box' und 'tab' wurden früher als 'table' gespeichert
        if (!permission && (entityType === 'box' || entityType === 'tab')) {
            permission = permissions.find((p) => p.entity === currentEntity && p.entityType === 'table');
        }
        if (!permission) {
            // Kein Fehler-Log für fehlende Permissions (normal für nicht-berechtigte Entities)
            return noAccess;
        }
        // Evaluiere Access
        const { hasAccess, requiresOwnership } = evaluateAccess(permission.accessLevel, requiredAccess);
        return {
            hasAccess,
            accessLevel: permission.accessLevel,
            requiresOwnership
        };
    }
    catch (error) {
        logger_1.logger.error('[checkPermission] ❌ Fehler:', error);
        return noAccess;
    }
});
exports.checkUserPermissionWithDetails = checkUserPermissionWithDetails;
/**
 * Einfache Permission-Prüfung (Legacy-Kompatibilität)
 */
const checkUserPermission = (userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1) => __awaiter(void 0, [userId_1, roleId_1, currentEntity_1, requiredAccess_1, ...args_1], void 0, function* (userId, roleId, currentEntity, requiredAccess, entityType = 'page') {
    const result = yield (0, exports.checkUserPermissionWithDetails)(userId, roleId, currentEntity, requiredAccess, entityType);
    return result.hasAccess;
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