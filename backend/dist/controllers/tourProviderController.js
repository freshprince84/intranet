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
exports.deleteTourProvider = exports.updateTourProvider = exports.createTourProvider = exports.getTourProviderById = exports.getAllTourProviders = void 0;
const prisma_1 = require("../utils/prisma");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const logger_1 = require("../utils/logger");
// GET /api/tour-providers - Alle Anbieter (mit Filtern)
const getAllTourProviders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        const search = req.query.search;
        const whereClause = {};
        if (organizationId) {
            whereClause.organizationId = organizationId;
        }
        if (branchId) {
            whereClause.branchId = branchId;
        }
        if (search) {
            whereClause.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { contactPerson: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ];
        }
        const providers = yield prisma_1.prisma.tourProvider.findMany({
            where: whereClause,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                tours: {
                    select: {
                        id: true,
                        title: true
                    },
                    take: 5
                }
            },
            orderBy: {
                name: 'asc'
            }
        });
        res.json({
            success: true,
            data: providers
        });
    }
    catch (error) {
        logger_1.logger.error('[getAllTourProviders] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden der Anbieter'
        });
    }
});
exports.getAllTourProviders = getAllTourProviders;
// GET /api/tour-providers/:id - Einzelner Anbieter
const getTourProviderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const providerId = parseInt(id, 10);
        if (isNaN(providerId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Anbieter-ID'
            });
        }
        const provider = yield prisma_1.prisma.tourProvider.findUnique({
            where: { id: providerId },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                tours: {
                    include: {
                        bookings: {
                            take: 5,
                            orderBy: {
                                bookingDate: 'desc'
                            }
                        }
                    }
                }
            }
        });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Anbieter nicht gefunden'
            });
        }
        res.json({
            success: true,
            data: provider
        });
    }
    catch (error) {
        logger_1.logger.error('[getTourProviderById] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden des Anbieters'
        });
    }
});
exports.getTourProviderById = getTourProviderById;
// POST /api/tour-providers - Neuen Anbieter erstellen
const createTourProvider = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(parseInt(req.userId), parseInt(req.roleId), 'tour_provider_create', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Keine Berechtigung zum Erstellen von Anbietern'
            });
        }
        const organizationId = req.organizationId;
        const branchId = req.branchId;
        const { name, phone, email, contactPerson, notes } = req.body;
        // Validierung
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name muss mindestens 2 Zeichen lang sein'
            });
        }
        if (!organizationId) {
            return res.status(400).json({
                success: false,
                message: 'Organisation ist erforderlich'
            });
        }
        const provider = yield prisma_1.prisma.tourProvider.create({
            data: {
                name: name.trim(),
                phone: (phone === null || phone === void 0 ? void 0 : phone.trim()) || null,
                email: (email === null || email === void 0 ? void 0 : email.trim()) || null,
                contactPerson: (contactPerson === null || contactPerson === void 0 ? void 0 : contactPerson.trim()) || null,
                notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || null,
                organizationId,
                branchId: branchId || null
            },
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: provider
        });
    }
    catch (error) {
        logger_1.logger.error('[createTourProvider] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Erstellen des Anbieters'
        });
    }
});
exports.createTourProvider = createTourProvider;
// PUT /api/tour-providers/:id - Anbieter aktualisieren
const updateTourProvider = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(parseInt(req.userId), parseInt(req.roleId), 'tour_provider_edit', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Keine Berechtigung zum Bearbeiten von Anbietern'
            });
        }
        const { id } = req.params;
        const providerId = parseInt(id, 10);
        if (isNaN(providerId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Anbieter-ID'
            });
        }
        const existing = yield prisma_1.prisma.tourProvider.findUnique({
            where: { id: providerId }
        });
        if (!existing) {
            return res.status(404).json({
                success: false,
                message: 'Anbieter nicht gefunden'
            });
        }
        const { name, phone, email, contactPerson, notes } = req.body;
        const updateData = {};
        if (name !== undefined) {
            if (name.trim().length < 2) {
                return res.status(400).json({
                    success: false,
                    message: 'Name muss mindestens 2 Zeichen lang sein'
                });
            }
            updateData.name = name.trim();
        }
        if (phone !== undefined)
            updateData.phone = (phone === null || phone === void 0 ? void 0 : phone.trim()) || null;
        if (email !== undefined)
            updateData.email = (email === null || email === void 0 ? void 0 : email.trim()) || null;
        if (contactPerson !== undefined)
            updateData.contactPerson = (contactPerson === null || contactPerson === void 0 ? void 0 : contactPerson.trim()) || null;
        if (notes !== undefined)
            updateData.notes = (notes === null || notes === void 0 ? void 0 : notes.trim()) || null;
        const provider = yield prisma_1.prisma.tourProvider.update({
            where: { id: providerId },
            data: updateData,
            include: {
                organization: {
                    select: {
                        id: true,
                        name: true,
                        displayName: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
        res.json({
            success: true,
            data: provider
        });
    }
    catch (error) {
        logger_1.logger.error('[updateTourProvider] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Aktualisieren des Anbieters'
        });
    }
});
exports.updateTourProvider = updateTourProvider;
// DELETE /api/tour-providers/:id - Anbieter löschen
const deleteTourProvider = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Berechtigung prüfen
        const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(parseInt(req.userId), parseInt(req.roleId), 'tour_provider_delete', 'write', 'button');
        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Keine Berechtigung zum Löschen von Anbietern'
            });
        }
        const { id } = req.params;
        const providerId = parseInt(id, 10);
        if (isNaN(providerId)) {
            return res.status(400).json({
                success: false,
                message: 'Ungültige Anbieter-ID'
            });
        }
        // Prüfe ob Touren verknüpft sind
        const tours = yield prisma_1.prisma.tour.findMany({
            where: { externalProviderId: providerId }
        });
        if (tours.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Anbieter kann nicht gelöscht werden, da ${tours.length} Tour(s) verknüpft sind`
            });
        }
        yield prisma_1.prisma.tourProvider.delete({
            where: { id: providerId }
        });
        res.json({
            success: true,
            message: 'Anbieter gelöscht'
        });
    }
    catch (error) {
        logger_1.logger.error('[deleteTourProvider] Fehler:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Löschen des Anbieters'
        });
    }
});
exports.deleteTourProvider = deleteTourProvider;
//# sourceMappingURL=tourProviderController.js.map