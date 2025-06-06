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
exports.getOrganizationStats = exports.deleteOrganization = exports.updateOrganization = exports.createOrganization = exports.getOrganizationById = exports.getAllOrganizations = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Validation Schemas
const createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name ist erforderlich'),
    displayName: zod_1.z.string().min(1, 'Anzeigename ist erforderlich'),
    maxUsers: zod_1.z.number().min(1, 'Maximale Benutzeranzahl muss mindestens 1 sein'),
    subscriptionPlan: zod_1.z.enum(['basic', 'pro', 'enterprise', 'trial'])
});
const updateOrganizationSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).optional(),
    maxUsers: zod_1.z.number().min(1).optional(),
    subscriptionPlan: zod_1.z.enum(['basic', 'pro', 'enterprise', 'trial']).optional(),
    isActive: zod_1.z.boolean().optional()
});
// Alle Organisationen abrufen
const getAllOrganizations = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizations = yield prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                displayName: true,
                isActive: true,
                maxUsers: true,
                subscriptionPlan: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        roles: true,
                        joinRequests: true,
                        invitations: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(organizations);
    }
    catch (error) {
        console.error('Error in getAllOrganizations:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisationen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllOrganizations = getAllOrganizations;
// Organisation nach ID abrufen
const getOrganizationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        const organization = yield prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                roles: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        _count: {
                            select: { users: true }
                        }
                    }
                },
                joinRequests: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        requester: {
                            select: {
                                id: true,
                                username: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                invitations: {
                    select: {
                        id: true,
                        email: true,
                        expiresAt: true,
                        acceptedAt: true,
                        createdAt: true,
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        inviter: {
                            select: {
                                id: true,
                                username: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!organization) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        res.json(organization);
    }
    catch (error) {
        console.error('Error in getOrganizationById:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOrganizationById = getOrganizationById;
// Neue Organisation erstellen
const createOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = createOrganizationSchema.parse(req.body);
        // Prüfe ob Name bereits existiert
        const existingOrg = yield prisma.organization.findUnique({
            where: { name: validatedData.name }
        });
        if (existingOrg) {
            return res.status(400).json({ message: 'Organisation mit diesem Namen existiert bereits' });
        }
        const organization = yield prisma.organization.create({
            data: {
                name: validatedData.name,
                displayName: validatedData.displayName,
                maxUsers: validatedData.maxUsers,
                subscriptionPlan: validatedData.subscriptionPlan,
                isActive: true
            },
            select: {
                id: true,
                name: true,
                displayName: true,
                isActive: true,
                maxUsers: true,
                subscriptionPlan: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.status(201).json(organization);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors: error.errors
            });
        }
        console.error('Error in createOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createOrganization = createOrganization;
// Organisation aktualisieren
const updateOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        const validatedData = updateOrganizationSchema.parse(req.body);
        // Prüfe ob Organisation existiert
        const existingOrg = yield prisma.organization.findUnique({
            where: { id: organizationId }
        });
        if (!existingOrg) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        const organization = yield prisma.organization.update({
            where: { id: organizationId },
            data: validatedData,
            select: {
                id: true,
                name: true,
                displayName: true,
                isActive: true,
                maxUsers: true,
                subscriptionPlan: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json(organization);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors: error.errors
            });
        }
        console.error('Error in updateOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateOrganization = updateOrganization;
// Organisation löschen
const deleteOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        // Prüfe ob es die Standard-Organisation ist
        if (organizationId === 1) {
            return res.status(400).json({ message: 'Standard-Organisation kann nicht gelöscht werden' });
        }
        // Prüfe ob Organisation existiert
        const existingOrg = yield prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                _count: {
                    select: {
                        roles: true,
                        joinRequests: true,
                        invitations: true
                    }
                }
            }
        });
        if (!existingOrg) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        // Prüfe ob Organisation noch Abhängigkeiten hat
        if (existingOrg._count.roles > 0) {
            return res.status(400).json({
                message: 'Organisation kann nicht gelöscht werden - noch Rollen vorhanden'
            });
        }
        // Lösche zuerst abhängige Datensätze
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Lösche Join Requests
            yield tx.organizationJoinRequest.deleteMany({
                where: { organizationId }
            });
            // Lösche Invitations
            yield tx.organizationInvitation.deleteMany({
                where: { organizationId }
            });
            // Lösche Organisation
            yield tx.organization.delete({
                where: { id: organizationId }
            });
        }));
        res.json({ message: 'Organisation erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error in deleteOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteOrganization = deleteOrganization;
// Organisation-Statistiken abrufen
const getOrganizationStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        const stats = yield prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                id: true,
                name: true,
                displayName: true,
                maxUsers: true,
                _count: {
                    select: {
                        roles: true,
                        joinRequests: true,
                        invitations: true
                    }
                }
            }
        });
        if (!stats) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        // Berechne aktuelle Benutzeranzahl über Rollen
        const userCount = yield prisma.userRole.count({
            where: {
                role: {
                    organizationId: organizationId
                }
            }
        });
        const response = Object.assign(Object.assign({}, stats), { currentUsers: userCount, availableSlots: stats.maxUsers - userCount, utilizationPercent: Math.round((userCount / stats.maxUsers) * 100) });
        res.json(response);
    }
    catch (error) {
        console.error('Error in getOrganizationStats:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisations-Statistiken',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOrganizationStats = getOrganizationStats;
//# sourceMappingURL=organizationController.js.map