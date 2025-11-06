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
exports.belongsToOrganization = exports.getDataIsolationFilter = exports.getUserOrganizationFilter = exports.getOrganizationFilter = exports.organizationMiddleware = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const organizationMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('=== organizationMiddleware CALLED ===');
        const userId = req.userId;
        console.log('userId:', userId);
        if (!userId) {
            console.log('❌ No userId in middleware, returning 401');
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
            console.log('❌ No userRole found, returning 404');
            return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
        }
        console.log('✅ userRole found:', userRole.id);
        console.log('✅ role.organizationId:', userRole.role.organizationId);
        // Füge Organisations-Kontext zum Request hinzu
        // WICHTIG: Kann NULL sein für standalone User (Hamburger-Rolle)
        req.organizationId = userRole.role.organizationId;
        req.userRole = userRole;
        console.log('✅ Setting req.organizationId to:', req.organizationId);
        console.log('✅ Calling next()');
        next();
    }
    catch (error) {
        console.error('❌ Error in Organization Middleware:', error);
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
            case 'worktime':
                return {
                    userId: userId
                };
            case 'client':
                // Standalone: Nur Clients, die der User verwendet hat
                return {
                    workTimes: {
                        some: {
                            userId: userId
                        }
                    }
                };
            case 'branch':
                // Standalone: Nur Branches wo User Mitglied ist
                return {
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                };
            case 'role':
                // Standalone: Nur Rollen die User hat (Hamburger-Rolle)
                return {
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                };
            default:
                // Für andere Entitäten: Alle Daten anzeigen (keine Isolation)
                return {};
        }
    }
    // User mit Organisation - Organisations-spezifische Filter
    // WICHTIG: Zeigt ALLE Daten der Organisation, nicht nur eigene!
    console.log(`[getDataIsolationFilter] entity: ${entity}, userId: ${userId}, organizationId: ${req.organizationId}`);
    switch (entity) {
        case 'task':
            // Alle Tasks der Organisation
            // WICHTIG: BEIDE beteiligten User (responsible UND qualityControl) müssen Rollen in der Organisation haben
            const taskFilter = {
                OR: [
                    // Task hat direkte Role-Zuordnung zur Organisation
                    {
                        role: {
                            organizationId: req.organizationId
                        }
                    },
                    // ODER: Task hat keine Role-Zuordnung UND ALLE beteiligten User haben Rollen in Organisation
                    {
                        AND: [
                            { roleId: null }, // Nur wenn keine direkte Role-Zuordnung
                            // Responsible muss Rolle in Organisation haben (wenn gesetzt)
                            {
                                OR: [
                                    { responsibleId: null }, // ODER responsible ist nicht gesetzt
                                    {
                                        responsible: {
                                            roles: {
                                                some: {
                                                    role: {
                                                        organizationId: req.organizationId
                                                    }
                                                }
                                            }
                                        }
                                    }
                                ]
                            },
                            // QualityControl muss Rolle in Organisation haben (immer gesetzt)
                            {
                                qualityControl: {
                                    roles: {
                                        some: {
                                            role: {
                                                organizationId: req.organizationId
                                            }
                                        }
                                    }
                                }
                            }
                        ]
                    }
                ]
            };
            console.log('[getDataIsolationFilter] task filter:', JSON.stringify(taskFilter, null, 2));
            return taskFilter;
        case 'request':
            // Alle Requests der Organisation
            // WICHTIG: BEIDE beteiligten User (requester UND responsible) müssen Rollen in der Organisation haben
            const requestFilter = {
                AND: [
                    // Requester muss Rolle in Organisation haben
                    {
                        requester: {
                            roles: {
                                some: {
                                    role: {
                                        organizationId: req.organizationId
                                    }
                                }
                            }
                        }
                    },
                    // Responsible muss Rolle in Organisation haben
                    {
                        responsible: {
                            roles: {
                                some: {
                                    role: {
                                        organizationId: req.organizationId
                                    }
                                }
                            }
                        }
                    }
                ]
            };
            console.log('[getDataIsolationFilter] request filter:', JSON.stringify(requestFilter, null, 2));
            return requestFilter;
        case 'worktime':
            // Alle WorkTimes der Organisation (via user)
            return {
                user: {
                    roles: {
                        some: {
                            role: {
                                organizationId: req.organizationId
                            }
                        }
                    }
                }
            };
        case 'user':
            // Alle User der Organisation
            return {
                roles: {
                    some: {
                        role: {
                            organizationId: req.organizationId
                        }
                    }
                }
            };
        case 'client':
            // Alle Clients der Organisation (via WorkTimes → User → Roles → Organization)
            return {
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
            };
        case 'branch':
            // Alle Branches der Organisation (via Users → Roles → Organization)
            return {
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
            };
        case 'role':
            // Alle Rollen der Organisation
            return {
                organizationId: req.organizationId
            };
        default:
            // Fallback: Kein Filter (alle Daten anzeigen)
            return {};
    }
};
exports.getDataIsolationFilter = getDataIsolationFilter;
// Hilfsfunktion zum Prüfen, ob eine Ressource zur Organisation des Users gehört
const belongsToOrganization = (req, entity, resourceId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Standalone User: Prüfe ob Ressource ihm gehört
        if (!req.organizationId) {
            const userId = Number(req.userId);
            switch (entity) {
                case 'client':
                    const client = yield prisma.client.findUnique({
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
                    const role = yield prisma.role.findUnique({
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
                    const branch = yield prisma.branch.findUnique({
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
                const client = yield prisma.client.findFirst({
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
                const role = yield prisma.role.findFirst({
                    where: {
                        id: resourceId,
                        organizationId: req.organizationId
                    }
                });
                return role !== null;
            case 'branch':
                const branch = yield prisma.branch.findFirst({
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
        console.error(`Fehler in belongsToOrganization für ${entity}:`, error);
        return false;
    }
});
exports.belongsToOrganization = belongsToOrganization;
//# sourceMappingURL=organization.js.map