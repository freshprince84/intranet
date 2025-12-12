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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceRecommendationService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
const priceAnalysisService_1 = require("./priceAnalysisService");
const prisma = new client_1.PrismaClient();
/**
 * Service für Preisempfehlungen
 *
 * Zuständig für:
 * - Generierung von Preisempfehlungen basierend auf Regeln
 * - Anwendung des Multi-Faktor-Algorithmus
 * - Validierung von Empfehlungen
 */
class PriceRecommendationService {
    /**
     * Generiert Preisempfehlungen für einen Branch
     *
     * @param branchId - Branch-ID
     * @param startDate - Startdatum
     * @param endDate - Enddatum
     * @returns Anzahl generierter Empfehlungen
     */
    static generateRecommendations(branchId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.default.log(`Starte Generierung von Preisempfehlungen für Branch ${branchId}`);
                // Aktive Regeln laden
                const rules = yield prisma.pricingRule.findMany({
                    where: {
                        branchId,
                        isActive: true
                    },
                    orderBy: {
                        priority: 'desc'
                    }
                });
                if (rules.length === 0) {
                    logger_1.default.log(`Keine aktiven Regeln für Branch ${branchId} gefunden`);
                    return 0;
                }
                // Preisanalysen abrufen
                const analyses = yield priceAnalysisService_1.PriceAnalysisService.getAnalyses(branchId, startDate, endDate);
                let recommendationCount = 0;
                // Für jede Analyse
                for (const analysis of analyses) {
                    // TODO: Vollständige Berechnung implementieren
                    // - Multi-Faktor-Algorithmus anwenden
                    // - Regeln prüfen und anwenden
                    // - Validierung durchführen
                    // - Empfehlung speichern
                    // Placeholder: Einfache Empfehlung erstellen
                    if (analysis.currentPrice) {
                        const currentPriceNum = Number(analysis.currentPrice);
                        const recommendedPrice = currentPriceNum; // TODO: Berechnung implementieren
                        const priceChange = recommendedPrice - currentPriceNum;
                        const priceChangePercent = currentPriceNum > 0
                            ? (priceChange / currentPriceNum) * 100
                            : 0;
                        yield prisma.priceRecommendation.upsert({
                            where: {
                                branchId_date_categoryId_roomType: {
                                    branchId,
                                    date: analysis.analysisDate,
                                    categoryId: analysis.categoryId || 0,
                                    roomType: analysis.roomType
                                }
                            },
                            update: {
                                recommendedPrice,
                                currentPrice: analysis.currentPrice,
                                priceChange,
                                priceChangePercent,
                                status: 'pending',
                                updatedAt: new Date()
                            },
                            create: {
                                branchId,
                                analysisId: analysis.id,
                                date: analysis.analysisDate,
                                categoryId: analysis.categoryId,
                                roomType: analysis.roomType,
                                recommendedPrice,
                                currentPrice: analysis.currentPrice,
                                priceChange,
                                priceChangePercent,
                                status: 'pending'
                            }
                        });
                        recommendationCount++;
                    }
                }
                logger_1.default.log(`Preisempfehlungen generiert: ${recommendationCount} Empfehlungen erstellt`);
                return recommendationCount;
            }
            catch (error) {
                logger_1.default.error('Fehler bei der Generierung von Preisempfehlungen:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft eine einzelne Preisempfehlung ab
     *
     * @param recommendationId - Empfehlungs-ID
     * @returns Preisempfehlung
     */
    static getRecommendationById(recommendationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recommendation = yield prisma.priceRecommendation.findUnique({
                    where: {
                        id: recommendationId
                    }
                });
                if (!recommendation) {
                    throw new Error(`Preisempfehlung mit ID ${recommendationId} nicht gefunden`);
                }
                return recommendation;
            }
            catch (error) {
                logger_1.default.error('Fehler beim Abrufen der Preisempfehlung:', error);
                throw error;
            }
        });
    }
    /**
     * Ruft Preisempfehlungen für einen Branch ab
     *
     * @param branchId - Branch-ID
     * @param status - Status-Filter (optional)
     * @param startDate - Startdatum (optional)
     * @param endDate - Enddatum (optional)
     * @returns Array von Preisempfehlungen
     */
    static getRecommendations(branchId, status, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const where = {
                    branchId
                };
                if (status) {
                    where.status = status;
                }
                if (startDate || endDate) {
                    where.date = {};
                    if (startDate) {
                        where.date.gte = startDate;
                    }
                    if (endDate) {
                        where.date.lte = endDate;
                    }
                }
                const recommendations = yield prisma.priceRecommendation.findMany({
                    where,
                    orderBy: {
                        date: 'asc'
                    }
                });
                return recommendations;
            }
            catch (error) {
                logger_1.default.error('Fehler beim Abrufen der Preisempfehlungen:', error);
                throw error;
            }
        });
    }
    /**
     * Wendet eine Preisempfehlung an
     *
     * @param recommendationId - Empfehlungs-ID
     * @param userId - User-ID, der die Empfehlung anwendet
     * @returns Erfolg
     */
    static applyRecommendation(recommendationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const recommendation = yield prisma.priceRecommendation.findUnique({
                    where: {
                        id: recommendationId
                    }
                });
                if (!recommendation) {
                    throw new Error(`Preisempfehlung mit ID ${recommendationId} nicht gefunden`);
                }
                if (recommendation.status !== 'pending' && recommendation.status !== 'approved') {
                    throw new Error(`Preisempfehlung kann nicht angewendet werden. Status: ${recommendation.status}`);
                }
                // TODO: Preis ins LobbyPMS einspielen
                // - LobbyPMSPriceUpdateService verwenden
                // - Preis aktualisieren
                // Status aktualisieren
                yield prisma.priceRecommendation.update({
                    where: {
                        id: recommendationId
                    },
                    data: {
                        status: 'applied',
                        appliedAt: new Date(),
                        appliedBy: userId
                    }
                });
                logger_1.default.log(`Preisempfehlung ${recommendationId} wurde angewendet`);
                return true;
            }
            catch (error) {
                logger_1.default.error('Fehler beim Anwenden der Preisempfehlung:', error);
                throw error;
            }
        });
    }
    /**
     * Genehmigt eine Preisempfehlung
     *
     * @param recommendationId - Empfehlungs-ID
     * @param userId - User-ID, der die Empfehlung genehmigt
     * @returns Erfolg
     */
    static approveRecommendation(recommendationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.priceRecommendation.update({
                    where: {
                        id: recommendationId
                    },
                    data: {
                        status: 'approved',
                        approvedAt: new Date(),
                        approvedBy: userId
                    }
                });
                logger_1.default.log(`Preisempfehlung ${recommendationId} wurde genehmigt`);
                return true;
            }
            catch (error) {
                logger_1.default.error('Fehler beim Genehmigen der Preisempfehlung:', error);
                throw error;
            }
        });
    }
    /**
     * Lehnt eine Preisempfehlung ab
     *
     * @param recommendationId - Empfehlungs-ID
     * @returns Erfolg
     */
    static rejectRecommendation(recommendationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.priceRecommendation.update({
                    where: {
                        id: recommendationId
                    },
                    data: {
                        status: 'rejected'
                    }
                });
                logger_1.default.log(`Preisempfehlung ${recommendationId} wurde abgelehnt`);
                return true;
            }
            catch (error) {
                logger_1.default.error('Fehler beim Ablehnen der Preisempfehlung:', error);
                throw error;
            }
        });
    }
}
exports.PriceRecommendationService = PriceRecommendationService;
//# sourceMappingURL=priceRecommendationService.js.map