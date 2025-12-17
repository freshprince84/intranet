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
exports.PriceAnalysisService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const lobbyPmsService_1 = require("./lobbyPmsService");
const prisma = new client_1.PrismaClient();
/**
 * Service für Preisanalyse
 *
 * Zuständig für:
 * - Sammeln von Preisdaten aus LobbyPMS
 * - Berechnung von Belegungsraten
 * - Analyse von historischen Daten
 * - Vergleich mit Konkurrenzpreisen
 */
class PriceAnalysisService {
    /**
     * Ermittelt die Gesamtzahl Zimmer pro Kategorie
     * Methode: Maximum über einen längeren Zeitraum (90 Tage)
     *
     * @param branchId - Branch-ID
     * @param categoryId - Kategorie-ID
     * @returns Gesamtzahl Zimmer
     */
    static getTotalRoomsForCategory(branchId, categoryId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hole Verfügbarkeit für längeren Zeitraum (90 Tage zurück)
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - 90);
                const futureDate = new Date();
                futureDate.setDate(futureDate.getDate() + 90);
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                const availabilityData = yield lobbyPmsService.checkAvailability(pastDate, futureDate);
                // Finde Maximum für diese Kategorie
                let maxAvailable = 0;
                for (const entry of availabilityData) {
                    if (entry.categoryId === categoryId && entry.availableRooms > maxAvailable) {
                        maxAvailable = entry.availableRooms;
                    }
                }
                // Wenn kein Maximum gefunden, verwende aktuellen Wert + 1 als Fallback
                if (maxAvailable === 0) {
                    logger_1.logger.warn(`[PriceAnalysis] Keine Verfügbarkeitsdaten für Kategorie ${categoryId}, verwende Fallback`);
                    return 1; // Mindestens 1 Zimmer
                }
                return maxAvailable;
            }
            catch (error) {
                logger_1.logger.error(`Fehler beim Ermitteln der Gesamtzahl Zimmer für Kategorie ${categoryId}:`, error);
                return 1; // Fallback
            }
        });
    }
    /**
     * Berechnet die Belegungsrate
     *
     * @param availableRooms - Verfügbare Zimmer
     * @param totalRooms - Gesamtzahl Zimmer
     * @returns Belegungsrate (0-100)
     */
    static calculateOccupancyRate(availableRooms, totalRooms) {
        if (totalRooms === 0)
            return 0;
        const occupiedRooms = totalRooms - availableRooms;
        return (occupiedRooms / totalRooms) * 100;
    }
    /**
     * Ruft historische Preisdaten ab
     *
     * @param branchId - Branch-ID
     * @param categoryId - Kategorie-ID
     * @param roomType - Zimmerart
     * @param days - Anzahl Tage zurück
     * @returns Array von historischen Preisen
     */
    static getHistoricalPrices(branchId_1, categoryId_1, roomType_1) {
        return __awaiter(this, arguments, void 0, function* (branchId, categoryId, roomType, days = 30) {
            try {
                const pastDate = new Date();
                pastDate.setDate(pastDate.getDate() - days);
                const historicalAnalyses = yield prisma.priceAnalysis.findMany({
                    where: {
                        branchId,
                        categoryId,
                        roomType,
                        analysisDate: {
                            gte: pastDate
                        },
                        currentPrice: {
                            not: null
                        }
                    },
                    select: {
                        currentPrice: true
                    },
                    orderBy: {
                        analysisDate: 'desc'
                    }
                });
                return historicalAnalyses
                    .map(a => a.currentPrice)
                    .filter((p) => p !== null)
                    .map(p => Number(p));
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen historischer Preise:', error);
                return [];
            }
        });
    }
    /**
     * Ruft Konkurrenzpreise ab
     *
     * @param branchId - Branch-ID
     * @param roomType - Zimmertyp ('compartida' | 'privada') - LobbyPMS Format
     * @param date - Datum
     * @returns Durchschnittspreis der Konkurrenz oder null
     */
    static getCompetitorAvgPrice(branchId, roomType, date) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Hole Branch mit Adress-Informationen
                const branch = yield prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { city: true, country: true }
                });
                if (!(branch === null || branch === void 0 ? void 0 : branch.city)) {
                    return null;
                }
                // Konvertiere LobbyPMS roomType zu OTA roomType
                const otaRoomType = roomType === 'compartida' ? 'dorm' : 'private';
                // Hole OTA-Listings für diese Stadt und Zimmertyp
                const listings = yield prisma.oTAListing.findMany({
                    where: {
                        city: branch.city,
                        country: branch.country || undefined,
                        roomType: otaRoomType,
                        isActive: true
                    }
                });
                if (listings.length === 0) {
                    return null;
                }
                // Hole Preisdaten für dieses Datum
                const priceData = yield prisma.oTAPriceData.findMany({
                    where: {
                        listingId: {
                            in: listings.map(l => l.id)
                        },
                        date: date,
                        price: {
                            not: null
                        }
                    },
                    select: {
                        price: true
                    }
                });
                if (priceData.length === 0) {
                    return null;
                }
                // Berechne Durchschnitt
                const prices = priceData
                    .map(d => d.price)
                    .filter((p) => p !== null)
                    .map(p => Number(p));
                if (prices.length === 0) {
                    return null;
                }
                const sum = prices.reduce((acc, p) => acc + p, 0);
                return sum / prices.length;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der Konkurrenzpreise:', error);
                return null;
            }
        });
    }
    /**
     * Bestimmt die Preisposition im Vergleich zur Konkurrenz
     *
     * @param currentPrice - Aktueller Preis
     * @param competitorPrice - Konkurrenzpreis
     * @returns 'above' | 'below' | 'equal'
     */
    static getPricePosition(currentPrice, competitorPrice) {
        if (competitorPrice === null) {
            return null;
        }
        const diffPercent = ((currentPrice - competitorPrice) / competitorPrice) * 100;
        // Toleranz: ±5%
        if (diffPercent > 5)
            return 'above';
        if (diffPercent < -5)
            return 'below';
        return 'equal';
    }
    /**
     * Führt eine Preisanalyse für einen Branch durch
     *
     * @param branchId - Branch-ID
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Anzahl erstellter Analysen
     */
    static analyzePrices(branchId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log(`Starte Preisanalyse für Branch ${branchId}, Zeitraum: ${startDate.toISOString()} - ${endDate.toISOString()}`);
                // LobbyPMS Service für Branch erstellen
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                // Verfügbarkeitsdaten aus LobbyPMS abrufen
                const availabilityData = yield lobbyPmsService.checkAvailability(startDate, endDate);
                // Cache für totalRooms pro Kategorie (Performance-Optimierung)
                const totalRoomsCache = new Map();
                // Gruppiere Daten nach Kategorie und Datum
                const groupedData = new Map();
                for (const entry of availabilityData) {
                    const key = `${entry.categoryId}-${entry.date}`;
                    groupedData.set(key, entry);
                }
                let analysisCount = 0;
                // Für jeden Tag und jede Kategorie
                for (const entry of availabilityData) {
                    const analysisDate = new Date(entry.date);
                    const roomType = entry.roomType === 'compartida' ? 'dorm' : 'private';
                    // 1. Ermittle totalRooms (mit Cache)
                    let totalRooms = totalRoomsCache.get(entry.categoryId);
                    if (totalRooms === undefined) {
                        totalRooms = yield this.getTotalRoomsForCategory(branchId, entry.categoryId);
                        totalRoomsCache.set(entry.categoryId, totalRooms);
                    }
                    // 2. Berechne Belegungsrate
                    const occupancyRate = this.calculateOccupancyRate(entry.availableRooms, totalRooms);
                    // 3. Hole historische Preise (letzte 30 Tage)
                    const historicalPrices = yield this.getHistoricalPrices(branchId, entry.categoryId, roomType, 30);
                    // 4. Berechne Durchschnitt, Min, Max aus historischen Daten
                    let averagePrice = null;
                    let minPrice = null;
                    let maxPrice = null;
                    if (historicalPrices.length > 0) {
                        averagePrice = historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length;
                        minPrice = Math.min(...historicalPrices);
                        maxPrice = Math.max(...historicalPrices);
                    }
                    // 5. Hole Konkurrenzpreise
                    const competitorAvgPrice = yield this.getCompetitorAvgPrice(branchId, entry.roomType, analysisDate);
                    // 6. Bestimme Preisposition
                    const pricePosition = this.getPricePosition(entry.pricePerNight, competitorAvgPrice);
                    // 7. Speichere Analyse
                    yield prisma.priceAnalysis.upsert({
                        where: {
                            branchId_analysisDate_categoryId_roomType: {
                                branchId,
                                analysisDate,
                                categoryId: entry.categoryId,
                                roomType
                            }
                        },
                        update: {
                            currentPrice: entry.pricePerNight,
                            averagePrice: averagePrice,
                            minPrice: minPrice,
                            maxPrice: maxPrice,
                            occupancyRate: occupancyRate,
                            availableRooms: entry.availableRooms,
                            competitorAvgPrice: competitorAvgPrice,
                            pricePosition: pricePosition,
                            updatedAt: new Date()
                        },
                        create: {
                            branchId,
                            analysisDate,
                            startDate,
                            endDate,
                            categoryId: entry.categoryId,
                            roomType,
                            currentPrice: entry.pricePerNight,
                            averagePrice: averagePrice,
                            minPrice: minPrice,
                            maxPrice: maxPrice,
                            occupancyRate: occupancyRate,
                            availableRooms: entry.availableRooms,
                            competitorAvgPrice: competitorAvgPrice,
                            pricePosition: pricePosition
                        }
                    });
                    analysisCount++;
                }
                logger_1.logger.log(`Preisanalyse abgeschlossen: ${analysisCount} Analysen erstellt`);
                return analysisCount;
            }
            catch (error) {
                logger_1.logger.error('Fehler bei der Preisanalyse:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft Preisanalysen für einen Branch ab
     *
     * @param branchId - Branch-ID
     * @param startDate - Startdatum (optional)
     * @param endDate - Enddatum (optional)
     * @returns Array von Preisanalysen
     */
    static getAnalyses(branchId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const where = {
                    branchId
                };
                if (startDate || endDate) {
                    where.analysisDate = {};
                    if (startDate) {
                        where.analysisDate.gte = startDate;
                    }
                    if (endDate) {
                        where.analysisDate.lte = endDate;
                    }
                }
                const analyses = yield prisma.priceAnalysis.findMany({
                    where,
                    include: {
                        recommendations: {
                            where: {
                                status: 'pending'
                            }
                        }
                    },
                    orderBy: {
                        analysisDate: 'desc'
                    }
                });
                return analyses;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der Preisanalysen:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft eine einzelne Preisanalyse ab
     *
     * @param analysisId - Analyse-ID
     * @returns Preisanalyse
     */
    static getAnalysisById(analysisId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const analysis = yield prisma.priceAnalysis.findUnique({
                    where: {
                        id: analysisId
                    },
                    include: {
                        recommendations: true
                    }
                });
                if (!analysis) {
                    throw new Error(`Preisanalyse mit ID ${analysisId} nicht gefunden`);
                }
                return analysis;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Abrufen der Preisanalyse:', error);
                throw error;
            }
        });
    }
}
exports.PriceAnalysisService = PriceAnalysisService;
//# sourceMappingURL=priceAnalysisService.js.map