import { ConversationContext, ParsedMessage } from './MessageParserService';
import { ContextService } from './ContextService';
import { logger } from '../../utils/logger';

/**
 * Conversation State Interface
 * 
 * Repräsentiert den aktuellen Zustand einer Conversation
 */
export interface ConversationState {
  shouldBook?: boolean;
  shouldBookTour?: boolean;
  shouldCheckAvailability?: boolean;
  missingInfo?: string[];
}

/**
 * Conversation Service
 * 
 * Zentrale Conversation-Logik
 * State-Management
 * Flow-Control
 * Wiederverwendbar für alle Kanäle (WhatsApp, Email, Instagram, Facebook, Twitter)
 */
export class ConversationService {
  /**
   * Verarbeitet Nachricht und bestimmt nächste Aktion
   * 
   * @param message - Die eingehende Nachricht
   * @param parsed - Geparste Nachricht
   * @param context - Conversation Context
   * @param language - Sprache
   * @param conversationId - ID der Conversation
   * @param conversationModel - Prisma Model-Name
   * @param branchId - Branch ID
   * @returns Conversation State mit nächsten Aktionen
   */
  static async processMessage(
    message: string,
    parsed: ParsedMessage,
    context: ConversationContext,
    language: string,
    conversationId: number,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation',
    branchId: number
  ): Promise<ConversationState> {
    try {
      // Merge parsed mit context
      const updatedContext = ContextService.mergeWithContext(parsed, context);
      
      // Speichere updated context
      await ContextService.updateContext(conversationId, updatedContext, conversationModel);
      
      // Bestimme nächste Aktion
      const state: ConversationState = {};
      
      if (parsed.intent === 'booking' && this.shouldExecuteBooking(updatedContext, parsed)) {
        state.shouldBook = true;
      }
      
      if (parsed.intent === 'tour' && this.shouldExecuteTourBooking(updatedContext, parsed)) {
        state.shouldBookTour = true;
      }
      
      if (parsed.intent === 'availability') {
        state.shouldCheckAvailability = true;
      }
      
      // Bestimme fehlende Informationen
      if (state.shouldBook || state.shouldBookTour) {
        state.missingInfo = this.getMissingInfo(updatedContext, parsed.intent || 'other');
      }
      
      return state;
    } catch (error) {
      logger.error('[ConversationService] Fehler bei processMessage:', error);
      return {};
    }
  }

  /**
   * Bestimmt ob Buchung ausgeführt werden soll
   * 
   * Prüft ob alle erforderlichen Informationen vorhanden sind und ob eine aktive Buchungsanfrage existiert
   * 
   * @param context - Conversation Context
   * @param parsed - Geparste Nachricht
   * @returns true wenn Buchung ausgeführt werden soll
   */
  static shouldExecuteBooking(context: ConversationContext, parsed: ParsedMessage): boolean {
    // Prüfe ob alle Informationen vorhanden sind
    if (!ContextService.hasAllBookingInfo(context)) {
      return false;
    }
    
    // Prüfe ob Name gerade gegeben wurde
    const nameWasJustProvided = parsed.name && !context.booking?.guestName;
    const hasActiveBookingRequest = context.booking?.checkInDate || context.booking?.lastAvailabilityCheck;
    
    // Wenn Name gerade gegeben wurde und alle Daten vorhanden sind, buchen
    if (nameWasJustProvided && hasActiveBookingRequest) {
      return true;
    }
    
    // Wenn Intent booking ist und alle Daten vorhanden sind, buchen
    if (parsed.intent === 'booking' && hasActiveBookingRequest) {
      return true;
    }
    
    return false;
  }

  /**
   * Bestimmt ob Tour-Buchung ausgeführt werden soll
   * 
   * @param context - Conversation Context
   * @param parsed - Geparste Nachricht
   * @returns true wenn Tour-Buchung ausgeführt werden soll
   */
  static shouldExecuteTourBooking(context: ConversationContext, parsed: ParsedMessage): boolean {
    // Prüfe ob alle Informationen vorhanden sind
    if (!ContextService.hasAllTourInfo(context)) {
      return false;
    }
    
    // Wenn Intent tour ist und alle Daten vorhanden sind, buchen
    if (parsed.intent === 'tour') {
      return true;
    }
    
    return false;
  }

  /**
   * Bestimmt fehlende Informationen
   * 
   * @param context - Conversation Context
   * @param intent - Intent der Nachricht
   * @returns Array mit fehlenden Informationen
   */
  static getMissingInfo(context: ConversationContext, intent: string): string[] {
    const missing: string[] = [];
    
    if (intent === 'booking') {
      if (!context.booking?.checkInDate) missing.push('checkInDate');
      if (!context.booking?.checkOutDate) missing.push('checkOutDate');
      if (!context.booking?.guestName) missing.push('guestName');
      if (!context.booking?.roomType) missing.push('roomType');
      if (context.booking?.roomName && !context.booking?.categoryId) missing.push('categoryId');
    }
    
    if (intent === 'tour') {
      if (!context.tour?.tourId) missing.push('tourId');
      if (!context.tour?.tourDate) missing.push('tourDate');
      if (!context.tour?.numberOfParticipants) missing.push('numberOfParticipants');
      if (!context.tour?.customerName) missing.push('customerName');
    }
    
    return missing;
  }
}
