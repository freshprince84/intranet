"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.PriceRecommendationService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
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
     * Prüft, ob eine Regel anwendbar ist
     *
     * @param rule - Regel
     * @param analysis - Preisanalyse
     * @param currentPrice - Aktueller Preis
     * @returns true wenn Regel anwendbar
     */
    static evaluateRule(rule, analysis, currentPrice) {
        try {
            const conditions = rule.conditions;
            // Prüfe Scope (roomTypes, categoryIds)
            if (rule.roomTypes) {
                const roomTypes = rule.roomTypes;
                const analysisRoomType = analysis.roomType === 'dorm' ? 'dorm' : 'private';
                if (!roomTypes.includes(analysisRoomType)) {
                    return false;
                }
            }
            if (rule.categoryIds) {
                const categoryIds = rule.categoryIds;
                if (analysis.categoryId && !categoryIds.includes(analysis.categoryId)) {
                    return false;
                }
            }
            // Prüfe Bedingungen
            return this.evaluateConditions(conditions, analysis, currentPrice);
        }
        catch (error) {
            logger_1.logger.error(`Fehler beim Evaluieren der Regel ${rule.id}:`, error);
            return false;
        }
    }
    /**
     * Prüft Bedingungen rekursiv (unterstützt AND/OR)
     *
     * @param conditions - Bedingungen
     * @param analysis - Preisanalyse
     * @param currentPrice - Aktueller Preis
     * @returns true wenn Bedingungen erfüllt
     */
    static evaluateConditions(conditions, analysis, currentPrice) {
        // Wenn conditions Array vorhanden (AND/OR)
        if (conditions.conditions && Array.isArray(conditions.conditions)) {
            const operator = conditions.operator || 'AND';
            const results = conditions.conditions.map(c => this.evaluateConditions(c, analysis, currentPrice));
            if (operator === 'AND') {
                return results.every(r => r === true);
            }
            else {
                return results.some(r => r === true);
            }
        }
        // Einzelne Bedingungen prüfen
        if (conditions.occupancyRate) {
            const occupancyRate = Number(analysis.occupancyRate) || 0;
            const { operator, value } = conditions.occupancyRate;
            if (!this.compareValues(occupancyRate, operator, value)) {
                return false;
            }
        }
        if (conditions.dayOfWeek) {
            const dayOfWeek = new Date(analysis.analysisDate).getDay();
            if (!conditions.dayOfWeek.includes(dayOfWeek)) {
                return false;
            }
        }
        if (conditions.competitorPriceDiff) {
            if (!analysis.competitorAvgPrice) {
                return false;
            }
            const competitorPrice = Number(analysis.competitorAvgPrice);
            const priceDiff = ((currentPrice - competitorPrice) / competitorPrice) * 100;
            const { operator, value } = conditions.competitorPriceDiff;
            if (!this.compareValues(priceDiff, operator, value)) {
                return false;
            }
        }
        if (conditions.currentPrice) {
            const { operator, value } = conditions.currentPrice;
            if (!this.compareValues(currentPrice, operator, value)) {
                return false;
            }
        }
        if (conditions.date) {
            const analysisDate = new Date(analysis.analysisDate);
            const { operator, value } = conditions.date;
            if (operator === 'before') {
                const beforeDate = new Date(value);
                if (analysisDate >= beforeDate) {
                    return false;
                }
            }
            else if (operator === 'after') {
                const afterDate = new Date(value);
                if (analysisDate <= afterDate) {
                    return false;
                }
            }
            else if (operator === 'between' && Array.isArray(value)) {
                const startDate = new Date(value[0]);
                const endDate = new Date(value[1]);
                if (analysisDate < startDate || analysisDate > endDate) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Vergleicht zwei Werte mit einem Operator
     */
    static compareValues(actual, operator, expected) {
        switch (operator) {
            case '>': return actual > expected;
            case '<': return actual < expected;
            case '>=': return actual >= expected;
            case '<=': return actual <= expected;
            case '==': return Math.abs(actual - expected) < 0.01;
            case '!=': return Math.abs(actual - expected) >= 0.01;
            default: return false;
        }
    }
    /**
     * Wendet eine Regel-Aktion an
     *
     * @param action - Aktion
     * @param currentPrice - Aktueller Preis (kann bereits angepasst sein)
     * @param originalPrice - Ursprünglicher Preis
     * @returns Neuer Preis
     */
    static applyAction(action, currentPrice, originalPrice) {
        const basePrice = action.cumulative ? currentPrice : originalPrice;
        let newPrice;
        if (action.type === 'increase') {
            newPrice = basePrice * (1 + action.value / 100);
        }
        else if (action.type === 'decrease') {
            newPrice = basePrice * (1 - action.value / 100);
        }
        else if (action.type === 'set') {
            newPrice = action.value;
        }
        else {
            return currentPrice;
        }
        // Validierung: Max-Änderung
        if (action.maxChange !== undefined) {
            const maxChange = originalPrice * (action.maxChange / 100);
            const actualChange = Math.abs(newPrice - originalPrice);
            if (actualChange > maxChange) {
                if (newPrice > originalPrice) {
                    newPrice = originalPrice + maxChange;
                }
                else {
                    newPrice = originalPrice - maxChange;
                }
            }
        }
        // Validierung: Min/Max-Preis
        if (action.minPrice !== undefined && newPrice < action.minPrice) {
            newPrice = action.minPrice;
        }
        if (action.maxPrice !== undefined && newPrice > action.maxPrice) {
            newPrice = action.maxPrice;
        }
        return newPrice;
    }
    /**
     * Generiert Reasoning-Text für eine Empfehlung
     *
     * @param appliedRules - Angewendete Regeln
     * @param analysis - Preisanalyse
     * @returns Reasoning-Text
     */
    static generateReasoning(appliedRules, analysis) {
        if (appliedRules.length === 0) {
            return 'Keine Regeln anwendbar';
        }
        const reasons = [];
        for (const rule of appliedRules) {
            const actionText = rule.action === 'increase' ? 'erhöht' : rule.action === 'decrease' ? 'gesenkt' : 'gesetzt';
            reasons.push(`${rule.ruleName}: Preis um ${rule.value}% ${actionText}`);
        }
        // Zusätzliche Kontext-Informationen
        if (analysis.occupancyRate) {
            reasons.push(`Belegungsrate: ${Number(analysis.occupancyRate).toFixed(1)}%`);
        }
        if (analysis.competitorAvgPrice) {
            const diff = ((Number(analysis.currentPrice) - Number(analysis.competitorAvgPrice)) / Number(analysis.competitorAvgPrice)) * 100;
            reasons.push(`Konkurrenz: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`);
        }
        return reasons.join(' | ');
    }
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
                logger_1.logger.log(`Starte Generierung von Preisempfehlungen für Branch ${branchId}`);
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
                    logger_1.logger.log(`Keine aktiven Regeln für Branch ${branchId} gefunden`);
                    return 0;
                }
                // Preisanalysen abrufen
                const analyses = yield priceAnalysisService_1.PriceAnalysisService.getAnalyses(branchId, startDate, endDate);
                let recommendationCount = 0;
                // Für jede Analyse
                for (const analysis of analyses) {
                    if (!analysis.currentPrice) {
                        continue;
                    }
                    const originalPrice = Number(analysis.currentPrice);
                    let currentPrice = originalPrice;
                    const appliedRules = [];
                    // Wende alle Regeln an (sortiert nach Priorität)
                    for (const rule of rules) {
                        // Prüfe ob Regel anwendbar ist
                        if (this.evaluateRule(rule, analysis, currentPrice)) {
                            const action = rule.action;
                            const oldPrice = currentPrice;
                            currentPrice = this.applyAction(action, currentPrice, originalPrice);
                            // Speichere angewendete Regel
                            appliedRules.push({
                                ruleId: rule.id,
                                ruleName: rule.name,
                                action: action.type,
                                value: action.value,
                                priceChange: currentPrice - oldPrice
                            });
                            logger_1.logger.log(`[PriceRecommendation] Regel ${rule.id} (${rule.name}) angewendet: ${oldPrice} → ${currentPrice}`);
                        }
                    }
                    // Wenn sich der Preis geändert hat, erstelle Empfehlung
                    if (Math.abs(currentPrice - originalPrice) > 0.01) {
                        const priceChange = currentPrice - originalPrice;
                        const priceChangePercent = originalPrice > 0
                            ? (priceChange / originalPrice) * 100
                            : 0;
                        // Generiere Reasoning
                        const reasoning = this.generateReasoning(appliedRules, analysis);
                        // Speichere Empfehlung
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
                                recommendedPrice: currentPrice,
                                currentPrice: analysis.currentPrice,
                                priceChange,
                                priceChangePercent,
                                appliedRules: appliedRules,
                                reasoning,
                                status: 'pending',
                                updatedAt: new Date()
                            },
                            create: {
                                branchId,
                                analysisId: analysis.id,
                                date: analysis.analysisDate,
                                categoryId: analysis.categoryId,
                                roomType: analysis.roomType,
                                recommendedPrice: currentPrice,
                                currentPrice: analysis.currentPrice,
                                priceChange,
                                priceChangePercent,
                                appliedRules: appliedRules,
                                reasoning,
                                status: 'pending'
                            }
                        });
                        recommendationCount++;
                    }
                }
                logger_1.logger.log(`Preisempfehlungen generiert: ${recommendationCount} Empfehlungen erstellt`);
                return recommendationCount;
            }
            catch (error) {
                logger_1.logger.error('Fehler bei der Generierung von Preisempfehlungen:', error);
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
                logger_1.logger.error('Fehler beim Abrufen der Preisempfehlung:', error);
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
                logger_1.logger.error('Fehler beim Abrufen der Preisempfehlungen:', error);
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
                // Preis ins LobbyPMS einspielen
                const { LobbyPmsPriceUpdateService } = yield Promise.resolve().then(() => __importStar(require('./lobbyPmsPriceUpdateService')));
                yield LobbyPmsPriceUpdateService.applyRecommendation(recommendationId);
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
                logger_1.logger.log(`Preisempfehlung ${recommendationId} wurde angewendet`);
                return true;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Anwenden der Preisempfehlung:', error);
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
                logger_1.logger.log(`Preisempfehlung ${recommendationId} wurde genehmigt`);
                return true;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Genehmigen der Preisempfehlung:', error);
                throw error;
            }
        });
    }
    /**
     * Lehnt eine Preisempfehlung ab
     *
     * @param recommendationId - Empfehlungs-ID
     * @param reason - Grund für Ablehnung (optional)
     * @returns Erfolg
     */
    static rejectRecommendation(recommendationId, reason) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield prisma.priceRecommendation.update({
                    where: {
                        id: recommendationId
                    },
                    data: {
                        status: 'rejected',
                        reasoning: reason ? `${reason} (Abgelehnt)` : undefined
                    }
                });
                logger_1.logger.log(`Preisempfehlung ${recommendationId} wurde abgelehnt${reason ? `: ${reason}` : ''}`);
                return true;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Ablehnen der Preisempfehlung:', error);
                throw error;
            }
        });
    }
}
exports.PriceRecommendationService = PriceRecommendationService;
//# sourceMappingURL=priceRecommendationService.js.map