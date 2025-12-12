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
exports.priceRecommendationController = void 0;
const priceRecommendationService_1 = require("../services/priceRecommendationService");
const notificationController_1 = require("./notificationController");
const client_1 = require("@prisma/client");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
/**
 * Controller für Preisempfehlungen
 */
exports.priceRecommendationController = {
    /**
     * Ruft Preisempfehlungen ab
     * GET /api/price-recommendations
     */
    getRecommendations: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const branchId = req.query.branchId
                ? parseInt(req.query.branchId, 10)
                : undefined;
            const status = req.query.status;
            const startDate = req.query.startDate
                ? new Date(req.query.startDate)
                : undefined;
            const endDate = req.query.endDate
                ? new Date(req.query.endDate)
                : undefined;
            if (!branchId) {
                return res.status(400).json({
                    message: 'branchId ist erforderlich'
                });
            }
            const recommendations = yield priceRecommendationService_1.PriceRecommendationService.getRecommendations(branchId, status, startDate, endDate);
            res.json(recommendations);
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Abrufen der Preisempfehlungen:', error);
            res.status(500).json({
                message: 'Fehler beim Abrufen der Preisempfehlungen',
                error: error.message
            });
        }
    }),
    /**
     * Wendet eine Preisempfehlung an
     * POST /api/price-recommendations/:id/apply
     */
    applyRecommendation: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const recommendationId = parseInt(req.params.id, 10);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (isNaN(recommendationId)) {
                return res.status(400).json({
                    message: 'Ungültige Empfehlungs-ID'
                });
            }
            if (!userId) {
                return res.status(401).json({
                    message: 'Nicht authentifiziert'
                });
            }
            const success = yield priceRecommendationService_1.PriceRecommendationService.applyRecommendation(recommendationId, userId);
            // Notification erstellen
            if (success) {
                try {
                    const recommendation = yield priceRecommendationService_1.PriceRecommendationService.getRecommendationById(recommendationId);
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'recommendationApplied', `Kategorie ${recommendation.categoryId || 'Unbekannt'}`, new Date(recommendation.date).toISOString().split('T')[0]);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.system,
                        relatedEntityId: recommendationId,
                        relatedEntityType: 'applied'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Fehler beim Erstellen der Notification:', error);
                }
            }
            res.json({
                success,
                message: 'Preisempfehlung wurde angewendet'
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Anwenden der Preisempfehlung:', error);
            res.status(500).json({
                message: 'Fehler beim Anwenden der Preisempfehlung',
                error: error.message
            });
        }
    }),
    /**
     * Genehmigt eine Preisempfehlung
     * POST /api/price-recommendations/:id/approve
     */
    approveRecommendation: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const recommendationId = parseInt(req.params.id, 10);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (isNaN(recommendationId)) {
                return res.status(400).json({
                    message: 'Ungültige Empfehlungs-ID'
                });
            }
            if (!userId) {
                return res.status(401).json({
                    message: 'Nicht authentifiziert'
                });
            }
            const success = yield priceRecommendationService_1.PriceRecommendationService.approveRecommendation(recommendationId, userId);
            res.json({
                success,
                message: 'Preisempfehlung wurde genehmigt'
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Genehmigen der Preisempfehlung:', error);
            res.status(500).json({
                message: 'Fehler beim Genehmigen der Preisempfehlung',
                error: error.message
            });
        }
    }),
    /**
     * Lehnt eine Preisempfehlung ab
     * POST /api/price-recommendations/:id/reject
     */
    rejectRecommendation: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const recommendationId = parseInt(req.params.id, 10);
            if (isNaN(recommendationId)) {
                return res.status(400).json({
                    message: 'Ungültige Empfehlungs-ID'
                });
            }
            const success = yield priceRecommendationService_1.PriceRecommendationService.rejectRecommendation(recommendationId);
            res.json({
                success,
                message: 'Preisempfehlung wurde abgelehnt'
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Ablehnen der Preisempfehlung:', error);
            res.status(500).json({
                message: 'Fehler beim Ablehnen der Preisempfehlung',
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=priceRecommendationController.js.map