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
exports.otaController = void 0;
const otaRateShoppingService_1 = require("../services/otaRateShoppingService");
const notificationController_1 = require("./notificationController");
const client_1 = require("@prisma/client");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
/**
 * Controller für OTA Rate Shopping
 */
exports.otaController = {
    /**
     * Ruft OTA-Listings ab
     * GET /api/ota/listings
     */
    getListings: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const branchId = req.query.branchId
                ? parseInt(req.query.branchId, 10)
                : undefined;
            if (!branchId) {
                return res.status(400).json({
                    message: 'branchId ist erforderlich'
                });
            }
            const listings = yield otaRateShoppingService_1.OTARateShoppingService.getListings(branchId);
            res.json(listings);
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Abrufen der OTA-Listings:', error);
            res.status(500).json({
                message: 'Fehler beim Abrufen der OTA-Listings',
                error: error.message
            });
        }
    }),
    /**
     * Führt Rate Shopping durch
     * POST /api/ota/rate-shopping
     */
    runRateShopping: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { branchId, platform, startDate, endDate } = req.body;
            if (!branchId || !platform || !startDate || !endDate) {
                return res.status(400).json({
                    message: 'branchId, platform, startDate und endDate sind erforderlich'
                });
            }
            const jobId = yield otaRateShoppingService_1.OTARateShoppingService.runRateShopping(branchId, platform, new Date(startDate), new Date(endDate));
            // Notification erstellen (wird später bei Job-Abschluss aktualisiert)
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (userId) {
                try {
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'rateShoppingCompleted', platform);
                    // Notification wird später bei Job-Abschluss/Fehler aktualisiert
                    // Hier nur als Info-Notification
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: 'Rate Shopping gestartet',
                        message: `Rate Shopping für ${platform} wurde gestartet.`,
                        type: client_1.NotificationType.system,
                        relatedEntityId: jobId,
                        relatedEntityType: 'started'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Fehler beim Erstellen der Notification:', error);
                }
            }
            res.json({
                success: true,
                jobId,
                message: 'Rate Shopping Job wurde erstellt'
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
            res.status(500).json({
                message: 'Fehler beim Erstellen des Rate Shopping Jobs',
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=otaController.js.map