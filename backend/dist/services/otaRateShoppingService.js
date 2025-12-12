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
exports.OTARateShoppingService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
/**
 * Service für OTA Rate Shopping
 *
 * Zuständig für:
 * - Sammeln von Preisdaten von OTA-Plattformen (Booking.com, Hostelworld, etc.)
 * - Web Scraping oder API-Integration
 * - Speichern der Preisdaten in der Datenbank
 */
class OTARateShoppingService {
    /**
     * Führt Rate Shopping für eine bestimmte Plattform durch
     *
     * @param branchId - Branch-ID
     * @param platform - OTA-Plattform (z.B. 'booking.com', 'hostelworld.com')
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Job-ID
     */
    static runRateShopping(branchId, platform, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Job erstellen
                const job = yield prisma.rateShoppingJob.create({
                    data: {
                        branchId,
                        platform,
                        startDate,
                        endDate,
                        status: 'pending'
                    }
                });
                logger_1.logger.log(`Rate Shopping Job erstellt: ID ${job.id}, Platform: ${platform}, Branch: ${branchId}`);
                // TODO: Implementierung des Rate Shopping
                // - Web Scraping oder API-Integration
                // - Preisdaten sammeln
                // - In OTAPriceData speichern
                // - Job-Status aktualisieren
                return job.id;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft alle OTA-Listings für einen Branch ab
     *
     * @param branchId - Branch-ID
     * @returns Array von OTA-Listings
     */
    static getListings(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const listings = yield prisma.oTAListing.findMany({
                    where: {
                        branchId,
                        isActive: true
                    },
                    include: {
                        priceData: {
                            orderBy: {
                                date: 'desc'
                            },
                            take: 30 // Letzte 30 Tage
                        }
                    },
                    orderBy: {
                        platform: 'asc'
                    }
                });
                return listings;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der OTA-Listings:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt oder aktualisiert ein OTA-Listing
     *
     * @param branchId - Branch-ID
     * @param platform - OTA-Plattform
     * @param listingId - Listing-ID auf der OTA-Plattform
     * @param data - Listing-Daten
     * @returns Listing
     */
    static upsertListing(branchId, platform, listingId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const listing = yield prisma.oTAListing.upsert({
                    where: {
                        branchId_platform_listingId: {
                            branchId,
                            platform,
                            listingId
                        }
                    },
                    update: Object.assign(Object.assign({}, data), { updatedAt: new Date() }),
                    create: Object.assign({ branchId,
                        platform,
                        listingId }, data)
                });
                return listing;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Erstellen/Aktualisieren des OTA-Listings:', error);
                throw error;
            }
        });
    }
    /**
     * Speichert Preisdaten für ein Listing
     *
     * @param listingId - Listing-ID
     * @param date - Datum
     * @param price - Preis
     * @param currency - Währung (Standard: COP)
     * @param available - Verfügbar
     * @param availableRooms - Anzahl verfügbarer Zimmer
     * @param source - Quelle ('rate_shopper' | 'api' | 'manual')
     * @returns Preisdaten
     */
    static savePriceData(listingId_1, date_1, price_1) {
        return __awaiter(this, arguments, void 0, function* (listingId, date, price, currency = 'COP', available = true, availableRooms, source = 'rate_shopper') {
            try {
                const priceData = yield prisma.oTAPriceData.upsert({
                    where: {
                        listingId_date: {
                            listingId,
                            date
                        }
                    },
                    update: {
                        price,
                        currency,
                        available,
                        availableRooms,
                        source,
                        scrapedAt: new Date()
                    },
                    create: {
                        listingId,
                        date,
                        price,
                        currency,
                        available,
                        availableRooms,
                        source,
                        scrapedAt: new Date()
                    }
                });
                return priceData;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Speichern der Preisdaten:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft Preisdaten für ein Listing ab
     *
     * @param listingId - Listing-ID
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Array von Preisdaten
     */
    static getPriceData(listingId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const priceData = yield prisma.oTAPriceData.findMany({
                    where: {
                        listingId,
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    },
                    orderBy: {
                        date: 'asc'
                    }
                });
                return priceData;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der Preisdaten:', error);
                throw error;
            }
        });
    }
}
exports.OTARateShoppingService = OTARateShoppingService;
//# sourceMappingURL=otaRateShoppingService.js.map