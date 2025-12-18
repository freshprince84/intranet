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
exports.PricingRuleScheduler = void 0;
const priceAnalysisService_1 = require("./priceAnalysisService");
const priceRecommendationService_1 = require("./priceRecommendationService");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Scheduler für automatische Preisregel-Ausführung
 *
 * Führt regelmäßig Preisanalysen durch, generiert Empfehlungen basierend auf aktiven Regeln
 * und wendet diese automatisch an (falls konfiguriert) für die nächsten 3-6 Monate
 */
class PricingRuleScheduler {
    /**
     * Startet den Scheduler
     *
     * Prüft alle 6 Stunden auf neue Preisempfehlungen für alle Branches mit aktiven Regeln
     */
    static start() {
        if (this.isRunning) {
            logger_1.logger.log('[PricingRuleScheduler] Scheduler läuft bereits');
            return;
        }
        logger_1.logger.log('[PricingRuleScheduler] Scheduler gestartet');
        // Prüfe alle 6 Stunden
        const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 Stunden
        // Führe sofort einen Check aus beim Start
        this.checkAllBranches();
        // Dann alle 6 Stunden
        this.checkInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.checkAllBranches();
        }), CHECK_INTERVAL_MS);
        this.isRunning = true;
    }
    /**
     * Stoppt den Scheduler
     */
    static stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            this.isRunning = false;
            logger_1.logger.log('[PricingRuleScheduler] Scheduler gestoppt');
        }
    }
    /**
     * Prüft alle Branches mit aktiven Preisregeln
     */
    static checkAllBranches() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.logger.log('[PricingRuleScheduler] Starte Preisregel-Prüfung für alle Branches');
                // Hole alle Branches mit aktiven Preisregeln
                const branches = yield prisma_1.prisma.branch.findMany({
                    where: {
                        pricingRules: {
                            some: {
                                isActive: true
                            }
                        }
                    },
                    select: {
                        id: true,
                        name: true
                    }
                });
                if (branches.length === 0) {
                    logger_1.logger.log('[PricingRuleScheduler] Keine Branches mit aktiven Preisregeln gefunden');
                    return;
                }
                logger_1.logger.log(`[PricingRuleScheduler] Gefunden: ${branches.length} Branch(es) mit aktiven Regeln`);
                // Für jeden Branch: Führe Preisanalyse und Empfehlungsgenerierung durch
                for (const branch of branches) {
                    try {
                        logger_1.logger.log(`[PricingRuleScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);
                        // Zeitraum: Nächste 3-6 Monate (180 Tage)
                        const startDate = new Date();
                        startDate.setHours(0, 0, 0, 0);
                        const endDate = new Date();
                        endDate.setDate(endDate.getDate() + 180); // 6 Monate
                        endDate.setHours(23, 59, 59, 999);
                        // 1. Führe Preisanalyse durch
                        logger_1.logger.log(`[PricingRuleScheduler] Branch ${branch.id}: Starte Preisanalyse für Zeitraum ${startDate.toISOString()} - ${endDate.toISOString()}`);
                        const analysisCount = yield priceAnalysisService_1.PriceAnalysisService.analyzePrices(branch.id, startDate, endDate);
                        logger_1.logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${analysisCount} Preisanalysen erstellt`);
                        // 2. Generiere Empfehlungen basierend auf Regeln
                        logger_1.logger.log(`[PricingRuleScheduler] Branch ${branch.id}: Generiere Preisempfehlungen...`);
                        const recommendationCount = yield priceRecommendationService_1.PriceRecommendationService.generateRecommendations(branch.id, startDate, endDate);
                        logger_1.logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${recommendationCount} Preisempfehlungen generiert`);
                    }
                    catch (error) {
                        logger_1.logger.error(`[PricingRuleScheduler] Fehler bei Branch ${branch.id}:`, error);
                    }
                }
                logger_1.logger.log('[PricingRuleScheduler] Preisregel-Prüfung für alle Branches abgeschlossen');
            }
            catch (error) {
                logger_1.logger.error('[PricingRuleScheduler] Fehler beim Prüfen aller Branches:', error);
            }
        });
    }
    /**
     * Manueller Trigger für einen spezifischen Branch
     *
     * @param branchId - Branch-ID
     */
    static triggerManually(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.log(`[PricingRuleScheduler] Manueller Trigger für Branch ${branchId}...`);
            try {
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { id: true, name: true }
                });
                if (!branch) {
                    throw new Error(`Branch ${branchId} nicht gefunden`);
                }
                // Zeitraum: Nächste 3-6 Monate (180 Tage)
                const startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + 180);
                endDate.setHours(23, 59, 59, 999);
                // 1. Führe Preisanalyse durch
                const analysisCount = yield priceAnalysisService_1.PriceAnalysisService.analyzePrices(branch.id, startDate, endDate);
                logger_1.logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${analysisCount} Preisanalysen erstellt`);
                // 2. Generiere Empfehlungen
                const recommendationCount = yield priceRecommendationService_1.PriceRecommendationService.generateRecommendations(branch.id, startDate, endDate);
                logger_1.logger.log(`[PricingRuleScheduler] Branch ${branch.id}: ${recommendationCount} Preisempfehlungen generiert`);
            }
            catch (error) {
                logger_1.logger.error(`[PricingRuleScheduler] Fehler beim manuellen Trigger für Branch ${branchId}:`, error);
                throw error;
            }
        });
    }
}
exports.PricingRuleScheduler = PricingRuleScheduler;
PricingRuleScheduler.checkInterval = null;
PricingRuleScheduler.isRunning = false;
//# sourceMappingURL=pricingRuleScheduler.js.map