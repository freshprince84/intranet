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
exports.LanguageService = void 0;
const languageDetectionService_1 = require("../languageDetectionService");
const ContextService_1 = require("./ContextService");
const logger_1 = require("../../utils/logger");
/**
 * Language Service
 *
 * Zentrale Sprach-Erkennung und Sprach-Konsistenz
 * Wiederverwendbar für alle Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
 */
class LanguageService {
    /**
     * Erkennt Sprache aus Nachricht, Telefonnummer oder Context
     *
     * Priorität:
     * 1. Aus Nachricht (detectLanguageFromMessage)
     * 2. Aus Context (falls vorhanden)
     * 3. Aus Telefonnummer (LanguageDetectionService)
     * 4. Fallback: 'es'
     *
     * @param message - Die zu analysierende Nachricht
     * @param phoneNumber - Optional: Telefonnummer für Fallback-Erkennung
     * @param context - Optional: Conversation Context
     * @returns Sprachcode ('es', 'de', 'en')
     */
    static detectLanguage(message, phoneNumber, context) {
        // KRITISCH: Priorität 1: Aus Context (wenn vorhanden, verwende diese zuerst für Konsistenz!)
        // Dies stellt sicher, dass die Sprache konsistent bleibt, auch wenn User kurze Nachrichten schreibt
        if (context === null || context === void 0 ? void 0 : context.language) {
            logger_1.logger.log(`[LanguageService] Sprache aus Context verwendet: ${context.language} (Nachricht: "${message.substring(0, 30)}")`);
            return context.language;
        }
        // Priorität 2: Aus Nachricht
        const fromMessage = this.detectLanguageFromMessage(message);
        if (fromMessage) {
            logger_1.logger.log(`[LanguageService] Sprache aus Nachricht erkannt: ${fromMessage} (Nachricht: "${message.substring(0, 30)}")`);
            return fromMessage;
        }
        // Priorität 3: Aus Telefonnummer
        if (phoneNumber) {
            const fromPhone = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
            logger_1.logger.log(`[LanguageService] Sprache aus Telefonnummer erkannt: ${fromPhone}`);
            return fromPhone;
        }
        // Fallback
        logger_1.logger.log(`[LanguageService] Fallback zu Spanisch (keine Sprache erkannt)`);
        return 'es';
    }
    /**
     * Erkennt Sprache aus Nachricht
     *
     * Verwendet Heuristik basierend auf häufigen Wörtern, Zeichen und Regex-Patterns
     *
     * @param message - Die zu analysierende Nachricht
     * @returns Sprachcode ('es', 'de', 'en') oder null
     */
    static detectLanguageFromMessage(message) {
        if (!message || message.trim().length === 0) {
            return null;
        }
        const text = message.toLowerCase();
        // Spanische Wörter/Zeichen
        const spanishIndicators = [
            /\b(hola|gracias|por favor|qué|cómo|dónde|cuándo|por qué|sí|no|buenos días|buenas tardes|buenas noches|adiós|hasta luego)\b/i,
            /[áéíóúñü]/,
            /\b(el|la|los|las|un|una|de|en|con|por|para|es|son|está|están)\b/i
        ];
        // Deutsche Wörter/Zeichen
        const germanIndicators = [
            /\b(hallo|guten tag|guten morgen|guten abend|danke|bitte|ja|nein|wie|wo|wann|warum|auf wiedersehen|tschüss)\b/i,
            /\b(haben|wir|heute|frei|zimmer|sind|gibt|gibt es|verfügbar|verfügbarkeit|buchung|reservierung|reservieren|buchen)\b/i,
            /\b(habt|hast|hat|seid|bist|ist|sind|werden|wird|kann|können|möchte|möchten|will|wollen)\b/i,
            /[äöüß]/,
            /\b(der|die|das|ein|eine|von|in|mit|für|ist|sind|sind)\b/i
        ];
        // Englische Wörter (erweitert für bessere Erkennung)
        const englishIndicators = [
            // Begrüßungen und Höflichkeitsformeln
            /\b(hello|hi|hey|thanks|thank you|please|yes|no|how|where|when|why|what|which|goodbye|bye|see you|good morning|good afternoon|good evening)\b/i,
            // Häufige englische Wörter (Artikel, Präpositionen, Verben)
            /\b(the|a|an|of|in|on|at|for|with|is|are|was|were|do|does|did|have|has|had|you|your|yourself|yourselves|i|me|my|myself|we|us|our|ourselves|they|them|their|theirs|this|that|these|those)\b/i,
            // Verben und Modalverben
            /\b(can|could|would|should|will|want|need|show|tell|give|get|see|book|reserve|reservation|booking|room|rooms|available|availability|tonight|today|tomorrow|tonight)\b/i,
            // Buchungs-spezifische Wörter
            /\b(do you have|have you|are there|is there|i want|i need|i would like|i'd like|i'm looking|looking for|check|check in|check out|check-in|check-out)\b/i,
            // Fragewörter und Konjunktionen
            /\b(and|or|but|if|then|than|as|so|because|while|until|before|after|during|through|throughout|despite|although|however|therefore|moreover|furthermore|nevertheless)\b/i
        ];
        // Französische Wörter/Zeichen (optional, wird nicht zurückgegeben, aber für bessere Erkennung)
        const frenchIndicators = [
            /\b(bonjour|bonsoir|merci|s'il vous plaît|oui|non|comment|où|quand|pourquoi|au revoir|à bientôt)\b/i,
            /[àâäéèêëïîôùûüÿç]/,
            /\b(le|la|les|un|une|de|du|des|dans|avec|pour|est|sont)\b/i
        ];
        // Zähle Treffer für jede Sprache (gewichtet)
        let spanishScore = 0;
        let germanScore = 0;
        let englishScore = 0;
        let frenchScore = 0;
        // Spanisch: Zähle Pattern-Treffer
        spanishIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                spanishScore += matches.length; // Zähle alle Treffer, nicht nur ob vorhanden
            }
        });
        // Deutsch: Zähle Pattern-Treffer
        germanIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                germanScore += matches.length;
            }
        });
        // Englisch: Zähle Pattern-Treffer (gewichtet für bessere Erkennung)
        englishIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                englishScore += matches.length;
            }
        });
        // Französisch: Zähle Pattern-Treffer
        frenchIndicators.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
                frenchScore += matches.length;
            }
        });
        // Spezielle Behandlung für sehr kurze Nachrichten (z.B. "hi")
        if (text.trim().length <= 10) {
            // Wenn nur "hi", "hello", "hey" → Englisch
            if (/^(hi|hello|hey)$/i.test(text.trim())) {
                logger_1.logger.log(`[LanguageService] Kurze Begrüßung erkannt: "${text.trim()}" → Englisch`);
                return 'en';
            }
        }
        // Finde Sprache mit höchstem Score
        const scores = [
            { lang: 'es', score: spanishScore },
            { lang: 'de', score: germanScore },
            { lang: 'en', score: englishScore }
        ];
        scores.sort((a, b) => b.score - a.score);
        // Wenn höchster Score > 0, verwende diese Sprache
        if (scores[0].score > 0) {
            logger_1.logger.log(`[LanguageService] Sprache erkannt: ${scores[0].lang} (Score: ${scores[0].score}, alle Scores: es=${spanishScore}, de=${germanScore}, en=${englishScore}, fr=${frenchScore})`);
            return scores[0].lang;
        }
        // Keine Sprache erkannt
        logger_1.logger.log(`[LanguageService] Keine Sprache erkannt für: "${message.substring(0, 50)}"`);
        return null;
    }
    /**
     * Stellt Sprach-Konsistenz über Conversation sicher
     *
     * Wenn Sprache bereits im Context vorhanden ist, wird diese verwendet.
     * Sonst wird die erkannte Sprache gespeichert.
     *
     * @param conversationId - ID der Conversation
     * @param detectedLanguage - Erkannte Sprache
     * @param conversationModel - Prisma Model-Name
     * @returns Zu verwendende Sprache
     */
    static ensureLanguageConsistency(conversationId, detectedLanguage, conversationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const context = yield ContextService_1.ContextService.getContext(conversationId, conversationModel);
                // Wenn Sprache bereits im Context, verwende diese
                if (context.language) {
                    return context.language;
                }
                // Sonst: Speichere erkannte Sprache
                yield ContextService_1.ContextService.updateContext(conversationId, { language: detectedLanguage }, conversationModel);
                return detectedLanguage;
            }
            catch (error) {
                logger_1.logger.error('[LanguageService] Fehler bei ensureLanguageConsistency:', error);
                return detectedLanguage || 'es';
            }
        });
    }
    /**
     * Lädt Sprache aus Context
     *
     * @param conversationId - ID der Conversation
     * @param conversationModel - Prisma Model-Name
     * @returns Sprache aus Context oder null
     */
    static getLanguageFromContext(conversationId, conversationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const context = yield ContextService_1.ContextService.getContext(conversationId, conversationModel);
                return context.language || null;
            }
            catch (error) {
                logger_1.logger.error('[LanguageService] Fehler beim Laden der Sprache aus Context:', error);
                return null;
            }
        });
    }
    /**
     * Speichert Sprache im Context
     *
     * @param conversationId - ID der Conversation
     * @param language - Zu speichernde Sprache
     * @param conversationModel - Prisma Model-Name
     */
    static saveLanguageToContext(conversationId, language, conversationModel) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield ContextService_1.ContextService.updateContext(conversationId, { language }, conversationModel);
            }
            catch (error) {
                logger_1.logger.error('[LanguageService] Fehler beim Speichern der Sprache im Context:', error);
                throw error;
            }
        });
    }
}
exports.LanguageService = LanguageService;
//# sourceMappingURL=LanguageService.js.map