import { LanguageDetectionService } from '../languageDetectionService';
import { ConversationContext } from './MessageParserService';
import { ContextService } from './ContextService';
import { logger } from '../../utils/logger';

/**
 * Language Service
 * 
 * Zentrale Sprach-Erkennung und Sprach-Konsistenz
 * Wiederverwendbar für alle Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
 */
export class LanguageService {
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
  static detectLanguage(
    message: string,
    phoneNumber?: string,
    context?: ConversationContext
  ): string {
    // Priorität 1: Aus Nachricht
    const fromMessage = this.detectLanguageFromMessage(message);
    if (fromMessage) {
      return fromMessage;
    }
    
    // Priorität 2: Aus Context
    if (context?.language) {
      return context.language;
    }
    
    // Priorität 3: Aus Telefonnummer
    if (phoneNumber) {
      return LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    }
    
    // Fallback
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
  static detectLanguageFromMessage(message: string): string | null {
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
        logger.log(`[LanguageService] Kurze Begrüßung erkannt: "${text.trim()}" → Englisch`);
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
      logger.log(`[LanguageService] Sprache erkannt: ${scores[0].lang} (Score: ${scores[0].score}, alle Scores: es=${spanishScore}, de=${germanScore}, en=${englishScore}, fr=${frenchScore})`);
      return scores[0].lang;
    }
    
    // Keine Sprache erkannt
    logger.log(`[LanguageService] Keine Sprache erkannt für: "${message.substring(0, 50)}"`);
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
  static async ensureLanguageConsistency(
    conversationId: number,
    detectedLanguage: string,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'
  ): Promise<string> {
    try {
      const context = await ContextService.getContext(conversationId, conversationModel);
      
      // Wenn Sprache bereits im Context, verwende diese
      if (context.language) {
        return context.language;
      }
      
      // Sonst: Speichere erkannte Sprache
      await ContextService.updateContext(
        conversationId,
        { language: detectedLanguage },
        conversationModel
      );
      return detectedLanguage;
    } catch (error) {
      logger.error('[LanguageService] Fehler bei ensureLanguageConsistency:', error);
      return detectedLanguage || 'es';
    }
  }

  /**
   * Lädt Sprache aus Context
   * 
   * @param conversationId - ID der Conversation
   * @param conversationModel - Prisma Model-Name
   * @returns Sprache aus Context oder null
   */
  static async getLanguageFromContext(
    conversationId: number,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'
  ): Promise<string | null> {
    try {
      const context = await ContextService.getContext(conversationId, conversationModel);
      return context.language || null;
    } catch (error) {
      logger.error('[LanguageService] Fehler beim Laden der Sprache aus Context:', error);
      return null;
    }
  }

  /**
   * Speichert Sprache im Context
   * 
   * @param conversationId - ID der Conversation
   * @param language - Zu speichernde Sprache
   * @param conversationModel - Prisma Model-Name
   */
  static async saveLanguageToContext(
    conversationId: number,
    language: string,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'
  ): Promise<void> {
    try {
      await ContextService.updateContext(
        conversationId,
        { language },
        conversationModel
      );
    } catch (error) {
      logger.error('[LanguageService] Fehler beim Speichern der Sprache im Context:', error);
      throw error;
    }
  }
}
