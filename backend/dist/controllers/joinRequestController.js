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
exports.withdrawJoinRequest = exports.processJoinRequest = exports.getMyJoinRequests = exports.getJoinRequestsForOrganization = exports.createJoinRequest = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Validation Schemas
const createJoinRequestSchema = zod_1.z.object({
    organizationName: zod_1.z.string().min(1, 'Organisationsname ist erforderlich'),
    message: zod_1.z.string().optional()
});
const processJoinRequestSchema = zod_1.z.object({
    action: zod_1.z.enum(['approve', 'reject']),
    response: zod_1.z.string().optional(),
    roleId: zod_1.z.number().optional()
});
// Beitrittsanfrage erstellen
const createJoinRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationName, message } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!organizationName) {
            return res.status(400).json({ message: 'Organisationsname ist erforderlich' });
        }
        // Finde Organisation
        const organization = yield prisma.organization.findUnique({
            where: { name: organizationName.toLowerCase() }
        });
        if (!organization) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        if (!organization.isActive) {
            return res.status(400).json({ message: 'Organisation ist nicht aktiv' });
        }
        // Prüfe ob bereits Anfrage existiert
        const existingRequest = yield prisma.organizationJoinRequest.findUnique({
            where: {
                organizationId_requesterId: {
                    organizationId: organization.id,
                    requesterId: Number(userId)
                }
            }
        });
        if (existingRequest && existingRequest.status === 'pending') {
            return res.status(409).json({ message: 'Beitrittsanfrage bereits gestellt' });
        }
        const joinRequest = yield prisma.organizationJoinRequest.create({
            data: {
                organizationId: organization.id,
                requesterId: Number(userId),
                message: message || null,
                status: 'pending'
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                requester: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json(joinRequest);
    }
    catch (error) {
        console.error('Error in createJoinRequest:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen der Beitrittsanfrage',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createJoinRequest = createJoinRequest;
// Beitrittsanfragen für Organisation abrufen
const getJoinRequestsForOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole aktuelle Organisation des Users
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId: Number(userId),
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true
                    }
                }
            }
        });
        if (!userRole) {
            return res.status(404).json({ message: 'Keine aktive Rolle gefunden' });
        }
        const joinRequests = yield prisma.organizationJoinRequest.findMany({
            where: { organizationId: userRole.role.organizationId },
            include: {
                requester: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                processor: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(joinRequests);
    }
    catch (error) {
        console.error('Error in getJoinRequestsForOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Beitrittsanfragen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getJoinRequestsForOrganization = getJoinRequestsForOrganization;
// Eigene Beitrittsanfragen abrufen
const getMyJoinRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const joinRequests = yield prisma.organizationJoinRequest.findMany({
            where: { requesterId: Number(userId) },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                processor: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(joinRequests);
    }
    catch (error) {
        console.error('Error in getMyJoinRequests:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der eigenen Beitrittsanfragen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getMyJoinRequests = getMyJoinRequests;
// Beitrittsanfrage bearbeiten
const processJoinRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { action, response, roleId } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Ungültige Aktion' });
        }
        const requestId = parseInt(id);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Anfrage-ID' });
        }
        // Hole Beitrittsanfrage
        const joinRequest = yield prisma.organizationJoinRequest.findUnique({
            where: { id: requestId },
            include: {
                organization: true,
                requester: true
            }
        });
        if (!joinRequest) {
            return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
        }
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Anfrage bereits bearbeitet' });
        }
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Aktualisiere Beitrittsanfrage
            const updatedRequest = yield tx.organizationJoinRequest.update({
                where: { id: requestId },
                data: {
                    status: action === 'approve' ? 'approved' : 'rejected',
                    response: response || null,
                    processedBy: Number(userId),
                    processedAt: new Date()
                }
            });
            // Bei Genehmigung: User zur Organisation hinzufügen
            if (action === 'approve') {
                let targetRoleId = roleId;
                // Falls keine Rolle angegeben, verwende Standard-User-Rolle
                if (!targetRoleId) {
                    const defaultRole = yield tx.role.findFirst({
                        where: {
                            organizationId: joinRequest.organizationId,
                            name: 'User'
                        }
                    });
                    if (defaultRole) {
                        targetRoleId = defaultRole.id;
                    }
                }
                if (targetRoleId) {
                    yield tx.userRole.create({
                        data: {
                            userId: joinRequest.requesterId,
                            roleId: targetRoleId,
                            lastUsed: false
                        }
                    });
                }
            }
            return updatedRequest;
        }));
        res.json(result);
    }
    catch (error) {
        console.error('Error in processJoinRequest:', error);
        res.status(500).json({
            message: 'Fehler beim Bearbeiten der Beitrittsanfrage',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.processJoinRequest = processJoinRequest;
// Beitrittsanfrage zurückziehen
const withdrawJoinRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const requestId = parseInt(id);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Anfrage-ID' });
        }
        // Hole Beitrittsanfrage
        const joinRequest = yield prisma.organizationJoinRequest.findUnique({
            where: { id: requestId }
        });
        if (!joinRequest) {
            return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
        }
        // Prüfe ob User der Ersteller ist
        if (joinRequest.requesterId !== Number(userId)) {
            return res.status(403).json({ message: 'Keine Berechtigung' });
        }
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Nur ausstehende Anfragen können zurückgezogen werden' });
        }
        const updatedRequest = yield prisma.organizationJoinRequest.update({
            where: { id: requestId },
            data: {
                status: 'withdrawn',
                processedAt: new Date()
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                }
            }
        });
        res.json(updatedRequest);
    }
    catch (error) {
        console.error('Error in withdrawJoinRequest:', error);
        res.status(500).json({
            message: 'Fehler beim Zurückziehen der Beitrittsanfrage',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.withdrawJoinRequest = withdrawJoinRequest;
//# sourceMappingURL=joinRequestController.js.map