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
exports.getUserOrganizationFilter = exports.getOrganizationFilter = exports.organizationMiddleware = void 0;
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
    if (!req.organizationId) {
        throw new Error('Organization context not available');
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
    if (!req.organizationId) {
        throw new Error('Organization context not available');
    }
    return {
        OR: [
            {
                roles: {
                    some: {
                        role: {
                            organizationId: req.organizationId
                        }
                    }
                }
            },
            // Fallback: User hat keine Rollen in aktueller Organisation
            {
                id: req.userId,
                roles: {
                    some: {
                        role: {
                            organizationId: req.organizationId
                        }
                    }
                }
            }
        ]
    };
};
exports.getUserOrganizationFilter = getUserOrganizationFilter;
//# sourceMappingURL=organization.js.map