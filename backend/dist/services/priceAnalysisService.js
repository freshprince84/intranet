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
exports.PriceAnalysisService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = __importDefault(require("../utils/logger"));
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
                logger_1.default.log(`Starte Preisanalyse für Branch ${branchId}, Zeitraum: ${startDate.toISOString()} - ${endDate.toISOString()}`);
                // LobbyPMS Service für Branch erstellen
                const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                // Verfügbarkeitsdaten aus LobbyPMS abrufen
                const availabilityData = yield lobbyPmsService.checkAvailability(startDate, endDate);
                // TODO: Implementierung der Analyse
                // - Daten gruppieren nach Kategorie und Datum
                // - Belegungsrate berechnen
                // - Historische Daten abrufen
                // - Konkurrenzpreise abrufen
                // - Analyse-Daten speichern
                let analysisCount = 0;
                // Für jeden Tag und jede Kategorie
                for (const entry of availabilityData) {
                    // TODO: Vollständige Analyse implementieren
                    // - Belegungsrate berechnen (benötigt totalRooms)
                    // - Historische Preise abrufen
                    // - Konkurrenzpreise abrufen
                    // - Durchschnitt, Min, Max berechnen
                    // Placeholder: Einfache Analyse erstellen
                    yield prisma.priceAnalysis.upsert({
                        where: {
                            branchId_analysisDate_categoryId_roomType: {
                                branchId,
                                analysisDate: new Date(entry.date),
                                categoryId: entry.categoryId,
                                roomType: entry.roomType === 'compartida' ? 'dorm' : 'private'
                            }
                        },
                        update: {
                            currentPrice: entry.pricePerNight,
                            availableRooms: entry.availableRooms,
                            updatedAt: new Date()
                        },
                        create: {
                            branchId,
                            analysisDate: new Date(entry.date),
                            startDate,
                            endDate,
                            categoryId: entry.categoryId,
                            roomType: entry.roomType === 'compartida' ? 'dorm' : 'private',
                            currentPrice: entry.pricePerNight,
                            availableRooms: entry.availableRooms
                        }
                    });
                    analysisCount++;
                }
                logger_1.default.log(`Preisanalyse abgeschlossen: ${analysisCount} Analysen erstellt`);
                return analysisCount;
            }
            catch (error) {
                logger_1.default.error('Fehler bei der Preisanalyse:', error);
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
                logger_1.default.error('Fehler beim Abrufen der Preisanalysen:', error);
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
                logger_1.default.error('Fehler beim Abrufen der Preisanalyse:', error);
                throw error;
            }
        });
    }
}
exports.PriceAnalysisService = PriceAnalysisService;
//# sourceMappingURL=priceAnalysisService.js.map