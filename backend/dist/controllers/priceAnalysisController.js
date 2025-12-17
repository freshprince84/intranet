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
exports.priceAnalysisController = void 0;
const priceAnalysisService_1 = require("../services/priceAnalysisService");
const priceRecommendationService_1 = require("../services/priceRecommendationService");
const notificationController_1 = require("./notificationController");
const client_1 = require("@prisma/client");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
/**
 * Controller für Preisanalyse
 */
exports.priceAnalysisController = {
    /**
     * Führt eine Preisanalyse durch
     * POST /api/price-analysis/analyze
     */
    analyze: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { branchId, startDate, endDate } = req.body;
            if (!branchId || !startDate || !endDate) {
                const userId = req.userId ? parseInt(req.userId, 10) : undefined;
                const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'requiredFieldsMissing')
                });
            }
            const analysisCount = yield priceAnalysisService_1.PriceAnalysisService.analyzePrices(branchId, new Date(startDate), new Date(endDate));
            // Notification erstellen
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (userId) {
                try {
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'analysisCompleted', analysisCount);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.system,
                        relatedEntityId: branchId,
                        relatedEntityType: 'analyzed'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error creating notification:', error);
                }
            }
            res.json({
                success: true,
                analysisCount
            });
        }
        catch (error) {
            logger_1.logger.error('Error analyzing prices:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorAnalyzing'),
                error: error.message
            });
        }
    }),
    /**
     * Ruft Preisanalysen ab
     * GET /api/price-analysis
     */
    getAnalyses: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const branchId = req.query.branchId
                ? parseInt(req.query.branchId, 10)
                : undefined;
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
            const analyses = yield priceAnalysisService_1.PriceAnalysisService.getAnalyses(branchId, startDate, endDate);
            res.json(analyses);
        }
        catch (error) {
            logger_1.logger.error('Error fetching price analyses:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorFetchingAnalyses'),
                error: error.message
            });
        }
    }),
    /**
     * Ruft eine einzelne Preisanalyse ab
     * GET /api/price-analysis/:id
     */
    getAnalysisById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const analysisId = parseInt(req.params.id, 10);
            if (isNaN(analysisId)) {
                const userId = req.userId ? parseInt(req.userId, 10) : undefined;
                const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidAnalysisId')
                });
            }
            const analysis = yield priceAnalysisService_1.PriceAnalysisService.getAnalysisById(analysisId);
            res.json(analysis);
        }
        catch (error) {
            logger_1.logger.error('Error fetching price analysis:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorFetchingAnalysis'),
                error: error.message
            });
        }
    }),
    /**
     * Generiert Preisempfehlungen
     * POST /api/price-analysis/recommendations/generate
     */
    generateRecommendations: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { branchId, startDate, endDate } = req.body;
            if (!branchId || !startDate || !endDate) {
                const userId = req.userId ? parseInt(req.userId, 10) : undefined;
                const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'requiredAnalysisFieldsMissing')
                });
            }
            const recommendationCount = yield priceRecommendationService_1.PriceRecommendationService.generateRecommendations(branchId, new Date(startDate), new Date(endDate));
            // Notification erstellen
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (userId && recommendationCount > 0) {
                try {
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'recommendationsGenerated', recommendationCount);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.system,
                        relatedEntityId: branchId,
                        relatedEntityType: 'generated'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error creating notification:', error);
                }
            }
            res.json({
                success: true,
                recommendationCount
            });
        }
        catch (error) {
            logger_1.logger.error('Error generating price recommendations:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorGeneratingRecommendations'),
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=priceAnalysisController.js.map