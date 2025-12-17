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
                const userId = req.userId ? parseInt(req.userId, 10) : undefined;
                const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'branchIdRequired')
                });
            }
            const recommendations = yield priceRecommendationService_1.PriceRecommendationService.getRecommendations(branchId, status, startDate, endDate);
            res.json(recommendations);
        }
        catch (error) {
            logger_1.logger.error('Error fetching price recommendations:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorFetchingRecommendations'),
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
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (isNaN(recommendationId)) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidRecommendationId')
                });
            }
            if (!userId) {
                return res.status(401).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'notAuthenticated')
                });
            }
            const success = yield priceRecommendationService_1.PriceRecommendationService.applyRecommendation(recommendationId, userId);
            // Notification erstellen
            if (success) {
                try {
                    const recommendation = yield priceRecommendationService_1.PriceRecommendationService.getRecommendationById(recommendationId);
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
                    logger_1.logger.error('Error creating notification:', error);
                }
            }
            res.json({
                success,
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'recommendationApplied')
            });
        }
        catch (error) {
            logger_1.logger.error('Error applying price recommendation:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorApplyingRecommendation'),
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
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (isNaN(recommendationId)) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidRecommendationId')
                });
            }
            if (!userId) {
                return res.status(401).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'notAuthenticated')
                });
            }
            const success = yield priceRecommendationService_1.PriceRecommendationService.approveRecommendation(recommendationId, userId);
            res.json({
                success,
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'recommendationApproved')
            });
        }
        catch (error) {
            logger_1.logger.error('Error approving price recommendation:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorApprovingRecommendation'),
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
            const reason = req.body.reason;
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (isNaN(recommendationId)) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidRecommendationId')
                });
            }
            const success = yield priceRecommendationService_1.PriceRecommendationService.rejectRecommendation(recommendationId, reason);
            res.json({
                success,
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'recommendationRejected')
            });
        }
        catch (error) {
            logger_1.logger.error('Error rejecting price recommendation:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorRejectingRecommendation'),
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=priceRecommendationController.js.map