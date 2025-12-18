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
// Neue Hilfsfunktion für Datenisolation je nach User-Typ
const getDataIsolationFilter = (req, entity) => {
    var _a, _b, _c, _d;
    // ✅ FIX: Admin/Owner sehen alle Daten (keine Isolation)
    if ((0, exports.isAdminOrOwner)(req)) {
        return {}; // Leerer Filter = alle Daten
    }
    // Konvertiere userId von String zu Integer
    const userId = Number(req.userId);
    if (isNaN(userId)) {
        logger_1.logger.error('Invalid userId in request:', req.userId);
        return {}; // Leerer Filter als Fallback
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
    switch (entity) {
        case 'task':
            // Tasks: Nach organizationId UND (responsibleId ODER roleId ODER qualityControlId)
            // Wenn User eine Rolle hat, die einer Task-Rolle entspricht, soll er die Task sehen
            const taskFilter = {};
            // Nur organizationId hinzufügen, wenn es gesetzt ist
            if (req.organizationId) {
                taskFilter.organizationId = req.organizationId;
            }
            // Wenn User eine aktive Rolle hat, füge roleId-Filter hinzu
            const userRoleId = (_b = (_a = req.userRole) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.id;
            // Debug-Logging
            logger_1.logger.log('[getDataIsolationFilter] Task filter:', {
                userId,
                organizationId: req.organizationId,
                userRoleId,
                userRoleName: (_d = (_c = req.userRole) === null || _c === void 0 ? void 0 : _c.role) === null || _d === void 0 ? void 0 : _d.name,
                hasOrganization: !!req.organizationId
            });
            if (userRoleId) {
                taskFilter.OR = [
                    { responsibleId: userId },
                    { qualityControlId: userId },
                    { roleId: userRoleId }
                ];
            }
            else {
                // Fallback: Nur eigene Tasks
                taskFilter.OR = [
                    { responsibleId: userId },
                    { qualityControlId: userId }
                ];
            }
            // Wenn organizationId gesetzt ist, muss es in der OR-Bedingung auch berücksichtigt werden
            // ABER: Prisma unterstützt keine verschachtelten OR-Bedingungen mit AND
            // Lösung: organizationId wird als separate Bedingung hinzugefügt
            // Das bedeutet: (organizationId = X) AND (responsibleId = Y OR roleId = Z OR qualityControlId = Y)
            logger_1.logger.log('[getDataIsolationFilter] Final task filter:', JSON.stringify(taskFilter, null, 2));
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
            // WICHTIG: Wenn organizationId gesetzt ist, werden nur Einträge mit dieser organizationId angezeigt
            // NULL-Werte werden automatisch ausgeschlossen
            return {
                organizationId: req.organizationId
            };
        case 'user':
            // User-Filterung bleibt komplex (über UserRole)
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