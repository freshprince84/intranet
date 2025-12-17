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
const otaDiscoveryService_1 = require("../services/otaDiscoveryService");
const lobbyPmsService_1 = require("../services/lobbyPmsService");
const notificationController_1 = require("./notificationController");
const client_1 = require("@prisma/client");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
const prisma_1 = require("../utils/prisma");
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
        logger_1.logger.warn('[OTA Controller] ⚡ runRateShopping aufgerufen');
        try {
            const { branchId, platform, startDate, endDate } = req.body;
            logger_1.logger.warn(`[OTA Controller] 📋 Request Body:`, JSON.stringify({ branchId, platform, startDate, endDate }));
            if (!branchId || !platform || !startDate || !endDate) {
                logger_1.logger.warn('[OTA Controller] ❌ Fehlende Parameter:', JSON.stringify({ branchId, platform, startDate, endDate }));
                return res.status(400).json({
                    message: 'branchId, platform, startDate und endDate sind erforderlich'
                });
            }
            logger_1.logger.warn(`[OTA Controller] 🔄 Rufe OTARateShoppingService.runRateShopping auf...`);
            const jobId = yield otaRateShoppingService_1.OTARateShoppingService.runRateShopping(branchId, platform, new Date(startDate), new Date(endDate));
            logger_1.logger.warn(`[OTA Controller] ✅ Job erstellt mit ID: ${jobId}`);
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
    }),
    /**
     * Discovere Konkurrenz-Listings auf OTA-Plattformen
     * POST /api/price-analysis/ota/discover
     */
    discoverListings: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { branchId, platform, roomType } = req.body;
            if (!branchId || !platform) {
                return res.status(400).json({
                    message: 'branchId und platform sind erforderlich'
                });
            }
            // 1. Hole Branch mit Adress-Informationen
            const branch = yield prisma_1.prisma.branch.findUnique({
                where: { id: branchId },
                select: {
                    city: true,
                    country: true,
                    name: true,
                    organizationId: true
                }
            });
            if (!branch) {
                return res.status(404).json({ message: 'Branch nicht gefunden' });
            }
            if (!branch.city) {
                return res.status(400).json({
                    message: 'Branch hat keine Stadt konfiguriert. Bitte Adress-Informationen in Branch-Einstellungen hinzufügen.'
                });
            }
            // 2. Hole eigene Zimmer-Typen aus LobbyPMS (falls roomType nicht explizit angegeben)
            let roomTypesToDiscover = [];
            if (roomType) {
                // Manuelles Testen: Nur einen Zimmertyp discoveren
                roomTypesToDiscover = [roomType];
            }
            else {
                // Automatisch: Alle eigenen Zimmertypen discoveren
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                const ownRooms = yield lobbyPmsService.checkAvailability(new Date(), new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Nächste 90 Tage
                );
                const uniqueRoomTypes = [...new Set(ownRooms.map(r => r.roomType === 'compartida' ? 'dorm' : 'private'))];
                roomTypesToDiscover = uniqueRoomTypes;
            }
            if (roomTypesToDiscover.length === 0) {
                return res.status(400).json({
                    message: 'Keine eigenen Zimmer-Typen gefunden. Bitte zuerst Reservierungen aus LobbyPMS importieren.'
                });
            }
            // 3. Discovere Listings für jeden Zimmertyp
            let totalListingsFound = 0;
            const results = [];
            for (const rt of roomTypesToDiscover) {
                const discovered = yield otaDiscoveryService_1.OTADiscoveryService.discoverListings(branch.city, branch.country, rt, platform);
                // 4. Speichere gefundene Listings
                let savedCount = 0;
                for (const listing of discovered) {
                    try {
                        yield prisma_1.prisma.oTAListing.upsert({
                            where: {
                                platform_listingId_city: {
                                    platform: listing.platform,
                                    listingId: listing.listingId,
                                    city: listing.city
                                }
                            },
                            update: {
                                listingUrl: listing.listingUrl,
                                roomName: listing.roomName,
                                lastScrapedAt: new Date(),
                                isActive: true
                            },
                            create: {
                                platform: listing.platform,
                                listingId: listing.listingId,
                                listingUrl: listing.listingUrl,
                                city: listing.city,
                                country: listing.country,
                                roomType: listing.roomType,
                                roomName: listing.roomName,
                                branchId: branchId, // Optional: Für Filterung
                                isActive: true,
                                discoveredAt: new Date()
                            }
                        });
                        savedCount++;
                    }
                    catch (error) {
                        logger_1.logger.error(`Fehler beim Speichern eines Listings:`, error.message);
                    }
                }
                totalListingsFound += savedCount;
                results.push({ roomType: rt, listingsFound: savedCount });
            }
            res.json({
                success: true,
                listingsFound: totalListingsFound,
                results: results,
                city: branch.city,
                country: branch.country
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Discoveren von OTA-Listings:', error);
            res.status(500).json({
                message: 'Fehler beim Discoveren von OTA-Listings',
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=otaController.js.map