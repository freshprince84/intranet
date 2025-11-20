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
exports.rejectSwapRequest = exports.approveSwapRequest = exports.createSwapRequest = exports.getSwapRequestById = exports.getAllSwapRequests = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const prisma_1 = require("../utils/prisma");
/**
 * GET /api/shifts/swaps
 * Holt alle Schichttausch-Anfragen
 */
const getAllSwapRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
        const status = req.query.status;
        const where = {};
        // Wenn userId angegeben, zeige nur Anfragen, die von oder an diesen User gerichtet sind
        if (userId && !isNaN(userId)) {
            where.OR = [
                { requestedBy: userId },
                { requestedFrom: userId }
            ];
        }
        if (status) {
            where.status = status;
        }
        const swapRequests = yield prisma_1.prisma.shiftSwapRequest.findMany({
            where,
            include: {
                originalShift: {
                    include: {
                        shiftTemplate: {
                            select: {
                                id: true,
                                name: true,
                                startTime: true,
                                endTime: true
                            }
                        },
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                targetShift: {
                    include: {
                        shiftTemplate: {
                            select: {
                                id: true,
                                name: true,
                                startTime: true,
                                endTime: true
                            }
                        },
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                requestee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            success: true,
            data: swapRequests
        });
    }
    catch (error) {
        console.error('[ShiftSwap] Fehler beim Abrufen der Tausch-Anfragen:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Tausch-Anfragen'
        });
    }
});
exports.getAllSwapRequests = getAllSwapRequests;
/**
 * GET /api/shifts/swaps/:id
 * Holt eine Tausch-Anfrage nach ID
 */
const getSwapRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const swapId = parseInt(id, 10);
        if (isNaN(swapId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Tausch-Anfrage-ID'
            });
        }
        const swapRequest = yield prisma_1.prisma.shiftSwapRequest.findUnique({
            where: { id: swapId },
            include: {
                originalShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                targetShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                requestee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        if (!swapRequest) {
            return res.status(404).json({
                success: false,
                message: 'Tausch-Anfrage nicht gefunden'
            });
        }
        res.json({
            success: true,
            data: swapRequest
        });
    }
    catch (error) {
        console.error('[ShiftSwap] Fehler beim Abrufen der Tausch-Anfrage:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Abrufen der Tausch-Anfrage'
        });
    }
});
exports.getSwapRequestById = getSwapRequestById;
/**
 * POST /api/shifts/swaps
 * Erstellt eine neue Tausch-Anfrage
 */
const createSwapRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { originalShiftId, targetShiftId, message } = req.body;
        // Validierung
        if (!originalShiftId || typeof originalShiftId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'originalShiftId ist erforderlich'
            });
        }
        if (!targetShiftId || typeof targetShiftId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'targetShiftId ist erforderlich'
            });
        }
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Hole Schichten
        const originalShift = yield prisma_1.prisma.shift.findUnique({
            where: { id: originalShiftId },
            include: {
                user: true
            }
        });
        const targetShift = yield prisma_1.prisma.shift.findUnique({
            where: { id: targetShiftId },
            include: {
                user: true
            }
        });
        if (!originalShift) {
            return res.status(404).json({
                success: false,
                message: 'Original-Schicht nicht gefunden'
            });
        }
        if (!targetShift) {
            return res.status(404).json({
                success: false,
                message: 'Ziel-Schicht nicht gefunden'
            });
        }
        // Prüfe, ob User die Original-Schicht hat
        if (originalShift.userId !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Sie können nur Ihre eigenen Schichten tauschen'
            });
        }
        // Prüfe, ob Ziel-Schicht einen User hat
        if (!targetShift.userId) {
            return res.status(400).json({
                success: false,
                message: 'Ziel-Schicht hat keinen zugewiesenen User'
            });
        }
        // Prüfe, ob User nicht mit sich selbst tauscht
        if (originalShift.userId === targetShift.userId) {
            return res.status(400).json({
                success: false,
                message: 'Sie können nicht mit sich selbst tauschen'
            });
        }
        // Prüfe, ob bereits eine offene Anfrage existiert
        const existingRequest = yield prisma_1.prisma.shiftSwapRequest.findFirst({
            where: {
                originalShiftId,
                targetShiftId,
                status: 'pending'
            }
        });
        if (existingRequest) {
            return res.status(400).json({
                success: false,
                message: 'Es existiert bereits eine offene Tausch-Anfrage für diese Schichten'
            });
        }
        // Erstelle Tausch-Anfrage
        const swapRequest = yield prisma_1.prisma.shiftSwapRequest.create({
            data: {
                originalShiftId,
                targetShiftId,
                requestedBy: currentUserId,
                requestedFrom: targetShift.userId,
                status: client_1.SwapStatus.pending,
                message: message || null
            },
            include: {
                originalShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                targetShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                requestee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        // Benachrichtigung an Ziel-User senden
        const requesterName = swapRequest.requester
            ? `${swapRequest.requester.firstName} ${swapRequest.requester.lastName}`.trim()
            : 'Ein User';
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: targetShift.userId,
            title: 'Schichttausch-Anfrage',
            message: `${requesterName} möchte mit Ihnen eine Schicht tauschen`,
            type: 'shift_swap',
            relatedEntityId: swapRequest.id,
            relatedEntityType: 'request_received'
        });
        res.status(201).json({
            success: true,
            data: swapRequest
        });
    }
    catch (error) {
        console.error('[ShiftSwap] Fehler beim Erstellen der Tausch-Anfrage:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Erstellen der Tausch-Anfrage'
        });
    }
});
exports.createSwapRequest = createSwapRequest;
/**
 * PUT /api/shifts/swaps/:id/approve
 * Genehmigt eine Tausch-Anfrage
 */
const approveSwapRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const swapId = parseInt(id, 10);
        const { responseMessage } = req.body;
        if (isNaN(swapId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Tausch-Anfrage-ID'
            });
        }
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Hole Tausch-Anfrage
        const swapRequest = yield prisma_1.prisma.shiftSwapRequest.findUnique({
            where: { id: swapId },
            include: {
                originalShift: true,
                targetShift: true
            }
        });
        if (!swapRequest) {
            return res.status(404).json({
                success: false,
                message: 'Tausch-Anfrage nicht gefunden'
            });
        }
        // Prüfe, ob User berechtigt ist (muss der requestee sein)
        if (swapRequest.requestedFrom !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Sie können nur Ihre eigenen Tausch-Anfragen genehmigen'
            });
        }
        // Prüfe, ob Anfrage noch pending ist
        if (swapRequest.status !== client_1.SwapStatus.pending) {
            return res.status(400).json({
                success: false,
                message: 'Tausch-Anfrage wurde bereits bearbeitet'
            });
        }
        // Führe Tausch durch: Tausche User der beiden Schichten
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Aktualisiere Original-Schicht (User bekommt Ziel-Schicht)
            yield tx.shift.update({
                where: { id: swapRequest.originalShiftId },
                data: {
                    userId: swapRequest.targetShift.userId,
                    status: client_1.ShiftStatus.swapped
                }
            });
            // Aktualisiere Ziel-Schicht (User bekommt Original-Schicht)
            yield tx.shift.update({
                where: { id: swapRequest.targetShiftId },
                data: {
                    userId: swapRequest.originalShift.userId,
                    status: client_1.ShiftStatus.swapped
                }
            });
            // Aktualisiere Tausch-Anfrage
            yield tx.shiftSwapRequest.update({
                where: { id: swapId },
                data: {
                    status: client_1.SwapStatus.approved,
                    responseMessage: responseMessage || null,
                    respondedAt: new Date()
                }
            });
        }));
        // Hole aktualisierte Tausch-Anfrage
        const updatedSwapRequest = yield prisma_1.prisma.shiftSwapRequest.findUnique({
            where: { id: swapId },
            include: {
                originalShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                targetShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                requestee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        // Benachrichtigungen senden
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: swapRequest.requestedBy,
            title: 'Schichttausch genehmigt',
            message: `Ihre Tausch-Anfrage wurde genehmigt`,
            type: 'shift_swap',
            relatedEntityId: swapId,
            relatedEntityType: 'approved'
        });
        res.json({
            success: true,
            data: updatedSwapRequest
        });
    }
    catch (error) {
        console.error('[ShiftSwap] Fehler beim Genehmigen der Tausch-Anfrage:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Genehmigen der Tausch-Anfrage'
        });
    }
});
exports.approveSwapRequest = approveSwapRequest;
/**
 * PUT /api/shifts/swaps/:id/reject
 * Lehnt eine Tausch-Anfrage ab
 */
const rejectSwapRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const swapId = parseInt(id, 10);
        const { responseMessage } = req.body;
        if (isNaN(swapId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Tausch-Anfrage-ID'
            });
        }
        const currentUserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                message: 'Nicht authentifiziert'
            });
        }
        // Hole Tausch-Anfrage
        const swapRequest = yield prisma_1.prisma.shiftSwapRequest.findUnique({
            where: { id: swapId }
        });
        if (!swapRequest) {
            return res.status(404).json({
                success: false,
                message: 'Tausch-Anfrage nicht gefunden'
            });
        }
        // Prüfe, ob User berechtigt ist (muss der requestee sein)
        if (swapRequest.requestedFrom !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: 'Sie können nur Ihre eigenen Tausch-Anfragen ablehnen'
            });
        }
        // Prüfe, ob Anfrage noch pending ist
        if (swapRequest.status !== client_1.SwapStatus.pending) {
            return res.status(400).json({
                success: false,
                message: 'Tausch-Anfrage wurde bereits bearbeitet'
            });
        }
        // Aktualisiere Tausch-Anfrage
        const updatedSwapRequest = yield prisma_1.prisma.shiftSwapRequest.update({
            where: { id: swapId },
            data: {
                status: client_1.SwapStatus.rejected,
                responseMessage: responseMessage || null,
                respondedAt: new Date()
            },
            include: {
                originalShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                targetShift: {
                    include: {
                        shiftTemplate: true,
                        branch: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true
                            }
                        }
                    }
                },
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                requestee: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        // Benachrichtigung senden
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: swapRequest.requestedBy,
            title: 'Schichttausch abgelehnt',
            message: `Ihre Tausch-Anfrage wurde abgelehnt`,
            type: 'shift_swap',
            relatedEntityId: swapId,
            relatedEntityType: 'rejected'
        });
        res.json({
            success: true,
            data: updatedSwapRequest
        });
    }
    catch (error) {
        console.error('[ShiftSwap] Fehler beim Ablehnen der Tausch-Anfrage:', error);
        res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : 'Fehler beim Ablehnen der Tausch-Anfrage'
        });
    }
});
exports.rejectSwapRequest = rejectSwapRequest;
//# sourceMappingURL=shiftSwapController.js.map