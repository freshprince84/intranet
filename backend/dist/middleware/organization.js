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
exports.belongsToOrganization = exports.isAdminOrOwner = exports.isOwnerRole = exports.isAdminRole = exports.getDataIsolationFilter = exports.getUserOrganizationFilter = exports.getOrganizationFilter = exports.organizationMiddleware = void 0;
const organizationCache_1 = require("../utils/organizationCache");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const organizationMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // ✅ PERFORMANCE: Verwende Cache statt DB-Query bei jedem Request
        const cachedData = yield organizationCache_1.organizationCache.get(Number(userId));
        if (!cachedData) {
            logger_1.logger.error('[organizationMiddleware] Keine aktive Rolle gefunden für userId:', userId);
            return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
        }
        // Füge Organisations-Kontext zum Request hinzu
        req.organizationId = cachedData.organizationId;
        req.userRole = cachedData.userRole;
        req.branchId = cachedData.branchId;
        next();
    }
    catch (error) {
        logger_1.logger.error('❌ Error in Organization Middleware:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.organizationMiddleware = organizationMiddleware;
// Hilfsfunktion für Query-Filter
const getOrganizationFilter = (req) => {
    // Für standalone User (ohne Organisation) return leeren Filter
    if (!req.organizationId) {
        return {};
    }
    return {
        role: {
            organizationId: req.organizationId
        }
    };
};
exports.getOrganizationFilter = getOrganizationFilter;
// Hilfsfunktion für indirekte Organisation-Filter (über User → Role → Organization)
const getUserOrganizationFilter = (req) => {
    // Konvertiere userId von String zu Integer
    const userId = Number(req.userId);
    if (isNaN(userId)) {
        logger_1.logger.error('Invalid userId in getUserOrganizationFilter:', req.userId);
        return {}; // Leerer Filter als Fallback
    }
    // Für standalone User (ohne Organisation) - nur eigene Daten
    if (!req.organizationId) {
        return {
            id: userId // Nur eigene User-Daten
        };
    }
    // Für User mit Organisation: Alle User zurückgeben, die mindestens eine Rolle in dieser Organisation haben
    return {
        roles: {
            some: {
                role: {
                    organizationId: req.organizationId
                }
            }
        }
    };
};
exports.getUserOrganizationFilter = getUserOrganizationFilter;
// ============================================
// OWNERSHIP-FELDER FÜR ROW-LEVEL-ISOLATION
// ============================================
// Definiert welche DB-Felder für "eigene Daten" geprüft werden
const OWNERSHIP_FIELDS = {
    // ✅ FIX: roleId entfernt für own_both - nur responsibleId und qualityControlId
    // roleId wird nur verwendet, wenn accessLevel all_both ist (siehe getDataIsolationFilter)
    'task': ['responsibleId', 'qualityControlId'],
    'request': ['requesterId', 'responsibleId'],
    'worktime': ['userId'],
    'client': ['createdById'],
    'branch': [], // Branch-Zugehörigkeit wird über BranchUser geprüft
    'invoice': ['userId'],
    'consultationInvoice': ['userId'],
    'monthlyReport': ['userId'],
    'monthlyConsultationReport': ['userId'],
    'cerebroCarticle': ['createdById'],
    'carticle': ['createdById'],
    'reservation': ['branchId'], // Branch-basiert
    'tour_booking': ['bookedById', 'branchId'],
    'password_entry': ['createdById'],
};
/**
 * Neue Hilfsfunktion für Datenisolation basierend auf AccessLevel
 * Berücksichtigt das Permission-System (own_read, own_both, all_read, all_both)
 *
 * @param req - Express Request mit userId, organizationId, permissionContext
 * @param entity - Entity-Name (z.B. 'task', 'request')
 * @returns Prisma WHERE-Filter für Row-Level-Isolation
 */
const getDataIsolationFilter = (req, entity) => {
    var _a, _b;
    // Konvertiere userId von String zu Integer
    const userId = Number(req.userId);
    // ✅ FIX: Admin/Owner sehen alle Daten der EIGENEN ORGANISATION (keine Row-Level-Isolation)
    // ABER: Immer noch auf organizationId beschränkt!
    if ((0, exports.isAdminOrOwner)(req)) {
        if (!req.organizationId) {
            // Standalone Admin ohne Organisation: Keine Daten (außer eigene)
            return { id: -1 };
        }
        // Admin mit Organisation: Nur Daten der eigenen Organisation
        switch (entity) {
            case 'role':
            case 'branch':
            case 'request':
            case 'worktime':
            case 'client':
            case 'invoice':
            case 'consultationInvoice':
            case 'monthlyReport':
            case 'monthlyConsultationReport':
            case 'cerebroCarticle':
            case 'carticle':
                return { organizationId: req.organizationId };
            case 'user':
                return {
                    roles: {
                        some: {
                            role: {
                                organizationId: req.organizationId
                            }
                        }
                    }
                };
            case 'task':
                return { organizationId: req.organizationId };
            default:
                return { organizationId: req.organizationId };
        }
    }
    if (isNaN(userId)) {
        logger_1.logger.error('Invalid userId in request:', req.userId);
        return {}; // Leerer Filter als Fallback
    }
    // ✅ NEU: Prüfe permissionContext (gesetzt von checkPermission Middleware)
    const permissionContext = req.permissionContext;
    if (permissionContext) {
        const { accessLevel, isOwnershipRequired, ownershipFields } = permissionContext;
        // all_both oder all_read: Keine Row-Level-Isolation nötig (alle Daten der Org sehen)
        if (accessLevel === 'all_both' || accessLevel === 'all_read') {
            // Nur nach organizationId filtern (falls vorhanden)
            if (req.organizationId) {
                return { organizationId: req.organizationId };
            }
            return {};
        }
        // own_both oder own_read: Nur eigene Daten
        if (isOwnershipRequired && ownershipFields.length > 0) {
            const orConditions = [];
            for (const field of ownershipFields) {
                if (field === 'userId' || field === 'responsibleId' || field === 'qualityControlId' ||
                    field === 'requesterId' || field === 'createdById' || field === 'bookedById') {
                    orConditions.push({ [field]: userId });
                }
                else if (field === 'roleId') {
                    const userRoleId = (_b = (_a = req.userRole) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.id;
                    if (userRoleId) {
                        orConditions.push({ [field]: userRoleId });
                    }
                }
                else if (field === 'branchId') {
                    if (req.branchId) {
                        orConditions.push({ [field]: req.branchId });
                    }
                }
            }
            const filter = {};
            if (req.organizationId) {
                filter.organizationId = req.organizationId;
            }
            if (orConditions.length > 0) {
                filter.OR = orConditions;
            }
            return filter;
        }
    }
    // Standalone User (ohne Organisation) - nur eigene Daten
    if (!req.organizationId) {
        switch (entity) {
            case 'task':
                return {
                    OR: [
                        { responsibleId: userId },
                        { qualityControlId: userId }
                    ]
                };
            case 'request':
                return {
                    OR: [
                        { requesterId: userId },
                        { responsibleId: userId }
                    ]
                };
            case 'worktime':
                return { userId: userId };
            case 'client':
                // Standalone: Nur Clients, die der User verwendet hat
                return {
                    workTimes: {
                        some: { userId: userId }
                    }
                };
            case 'branch':
                // Standalone: Nur Branches wo User Mitglied ist
                return {
                    users: {
                        some: { userId: userId }
                    }
                };
            case 'invoice':
            case 'consultationInvoice':
                return { userId: userId };
            case 'monthlyReport':
            case 'monthlyConsultationReport':
                return { userId: userId };
            case 'cerebroCarticle':
            case 'carticle':
                // Standalone: Nur Artikel die der User erstellt hat
                return { createdById: userId };
            case 'role':
                // Standalone: Nur Rollen die User hat (Hamburger-Rolle)
                return {
                    users: {
                        some: { userId: userId }
                    }
                };
            default:
                // Für andere Entitäten: Alle Daten anzeigen (keine Isolation)
                return {};
        }
    }
    // User mit Organisation - Filter nach organizationId
    // ✅ FIX: Fallback-Code nur verwenden, wenn permissionContext NICHT vorhanden ist
    // Wenn permissionContext vorhanden ist, wurde bereits oben (Zeile 167-211) gehandhabt
    switch (entity) {
        case 'task':
            // ✅ FIX: Fallback nur wenn permissionContext NICHT vorhanden
            // In diesem Fall: Nur eigene Tasks (sicherer Fallback)
            // permissionContext sollte aber immer vorhanden sein, wenn checkPermission Middleware verwendet wird
            logger_1.logger.warn('[getDataIsolationFilter] Task: permissionContext nicht vorhanden, verwende sicheren Fallback (nur eigene Tasks)');
            const taskFilter = {};
            // Nur organizationId hinzufügen, wenn es gesetzt ist
            if (req.organizationId) {
                taskFilter.organizationId = req.organizationId;
            }
            // ✅ FIX: Fallback zeigt nur eigene Tasks (sicherer als roleId-Filter)
            // Wenn permissionContext vorhanden wäre, würde es own_both vs all_both berücksichtigen
            taskFilter.OR = [
                { responsibleId: userId },
                { qualityControlId: userId }
            ];
            logger_1.logger.log('[getDataIsolationFilter] Task fallback filter (nur eigene Tasks):', JSON.stringify(taskFilter, null, 2));
            return taskFilter;
        case 'request':
        case 'worktime':
        case 'client':
        case 'branch':
        case 'invoice':
        case 'consultationInvoice':
        case 'monthlyReport':
        case 'monthlyConsultationReport':
        case 'cerebroCarticle':
        case 'carticle':
            // Einfache Filterung nach organizationId
            // WICHTIG: Wenn organizationId null/undefined ist, gibt es keine Ergebnisse
            if (!req.organizationId) {
                // Keine Organisation: Garantiert keine Ergebnisse (sicherer als leeres Objekt)
                return { id: -1 };
            }
            return {
                organizationId: req.organizationId
            };
        case 'user':
            // User-Filterung bleibt komplex (über UserRole)
            if (!req.organizationId) {
                // Keine Organisation: Nur eigene User-Daten
                return { id: userId };
            }
            return {
                roles: {
                    some: {
                        role: {
                            organizationId: req.organizationId
                        }
                    }
                }
            };
        case 'role':
            // Rollen: Nur Rollen der Organisation
            if (!req.organizationId) {
                // Keine Organisation: Garantiert keine Ergebnisse
                return { id: -1 };
            }
            return {
                organizationId: req.organizationId
            };
        default:
            return {};
    }
};
exports.getDataIsolationFilter = getDataIsolationFilter;
// ✅ ROLLEN-ISOLATION: Hilfsfunktionen für Rollen-Prüfung
/**
 * Prüft, ob der User eine Admin-Rolle hat
 */
const isAdminRole = (req) => {
    var _a, _b;
    const roleName = (_b = (_a = req.userRole) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.name;
    if (!roleName)
        return false;
    const roleNameLower = roleName.toLowerCase();
    return roleNameLower === 'admin' || roleNameLower.includes('administrator');
};
exports.isAdminRole = isAdminRole;
/**
 * Prüft, ob der User eine Owner-Rolle hat
 */
const isOwnerRole = (req) => {
    var _a, _b;
    const roleName = (_b = (_a = req.userRole) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.name;
    if (!roleName)
        return false;
    const roleNameLower = roleName.toLowerCase();
    return roleNameLower === 'owner';
};
exports.isOwnerRole = isOwnerRole;
/**
 * Prüft, ob der User Admin oder Owner ist
 */
const isAdminOrOwner = (req) => {
    return (0, exports.isAdminRole)(req) || (0, exports.isOwnerRole)(req);
};
exports.isAdminOrOwner = isAdminOrOwner;
// Hilfsfunktion zum Prüfen, ob eine Ressource zur Organisation des Users gehört
const belongsToOrganization = (req, entity, resourceId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Standalone User: Prüfe ob Ressource ihm gehört
        if (!req.organizationId) {
            const userId = Number(req.userId);
            switch (entity) {
                case 'client':
                    const client = yield prisma_1.prisma.client.findUnique({
                        where: { id: resourceId },
                        include: {
                            workTimes: {
                                where: { userId: userId },
                                take: 1
                            }
                        }
                    });
                    return client !== null && client.workTimes.length > 0;
                case 'role':
                    const role = yield prisma_1.prisma.role.findUnique({
                        where: { id: resourceId },
                        include: {
                            users: {
                                where: { userId: userId },
                                take: 1
                            }
                        }
                    });
                    return role !== null && role.users.length > 0;
                case 'branch':
                    const branch = yield prisma_1.prisma.branch.findUnique({
                        where: { id: resourceId },
                        include: {
                            users: {
                                where: { userId: userId },
                                take: 1
                            }
                        }
                    });
                    return branch !== null && branch.users.length > 0;
                default:
                    return false;
            }
        }
        // User mit Organisation: Prüfe ob Ressource zur Organisation gehört
        switch (entity) {
            case 'client':
                const client = yield prisma_1.prisma.client.findFirst({
                    where: {
                        id: resourceId,
                        workTimes: {
                            some: {
                                user: {
                                    roles: {
                                        some: {
                                            role: {
                                                organizationId: req.organizationId
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                return client !== null;
            case 'role':
                const role = yield prisma_1.prisma.role.findFirst({
                    where: {
                        id: resourceId,
                        organizationId: req.organizationId
                    }
                });
                return role !== null;
            case 'branch':
                const branch = yield prisma_1.prisma.branch.findFirst({
                    where: {
                        id: resourceId,
                        users: {
                            some: {
                                user: {
                                    roles: {
                                        some: {
                                            role: {
                                                organizationId: req.organizationId
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
                return branch !== null;
            default:
                return false;
        }
    }
    catch (error) {
        logger_1.logger.error(`Fehler in belongsToOrganization für ${entity}:`, error);
        return false;
    }
});
exports.belongsToOrganization = belongsToOrganization;
//# sourceMappingURL=organization.js.map