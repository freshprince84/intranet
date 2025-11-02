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
exports.getDataIsolationFilter = exports.getUserOrganizationFilter = exports.getOrganizationFilter = exports.organizationMiddleware = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const organizationMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole aktuelle Rolle und Organisation des Users
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId: Number(userId),
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true,
                        permissions: true
                    }
                }
            }
        });
        if (!userRole) {
            return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
        }
        // Füge Organisations-Kontext zum Request hinzu
        // WICHTIG: Kann NULL sein für standalone User (Hamburger-Rolle)
        req.organizationId = userRole.role.organizationId;
        req.userRole = userRole;
        next();
    }
    catch (error) {
        console.error('Fehler in Organization Middleware:', error);
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
        console.error('Invalid userId in getUserOrganizationFilter:', req.userId);
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
    // Konvertiere userId von String zu Integer
    const userId = Number(req.userId);
    if (isNaN(userId)) {
        console.error('Invalid userId in request:', req.userId);
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
            default:
                // Für andere Entitäten: Alle Daten anzeigen (keine Isolation)
                return {};
        }
    }
    // User mit Organisation - Organisations-spezifische Filter
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
            return {
                userId: userId
            };
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
        default:
            // Fallback: Kein Filter (alle Daten anzeigen)
            return {};
    }
};
exports.getDataIsolationFilter = getDataIsolationFilter;
//# sourceMappingURL=organization.js.map