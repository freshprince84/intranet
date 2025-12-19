import { prisma } from '../../utils/prisma';
import { logger } from '../../utils/logger';
import { ConversationContext } from './MessageParserService';
import { ParsedMessage } from './MessageParserService';

/**
 * Context Service
 * 
 * Zentrale Context-Verwaltung für alle Kanäle
 * Standardisierte Context-Struktur
 * Wiederverwendbar für WhatsApp, Email, Instagram, Facebook, Twitter
 */
export class ContextService {
  /**
   * Lädt Context aus Conversation
   * 
   * @param conversationId - ID der Conversation
   * @param conversationModel - Prisma Model-Name ('WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation')
   * @returns Conversation Context
   */
  static async getContext(
    conversationId: number,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'
  ): Promise<ConversationContext> {
    try {
      const model = this.getPrismaModel(conversationModel);
      const conversation = await (prisma as any)[model].findUnique({
        where: { id: conversationId },
        select: { context: true }
      });
      
      const context = (conversation?.context as ConversationContext) || { language: 'es' };
      
      // Stelle sicher, dass language immer vorhanden ist
      if (!context.language) {
        context.language = 'es';
      }
      
      return context;
    } catch (error) {
      logger.error(`[ContextService] Fehler beim Laden des Contexts:`, error);
      return { language: 'es' };
    }
  }

  /**
   * Aktualisiert Context in Conversation
   * 
   * @param conversationId - ID der Conversation
   * @param updates - Teilweise Context-Updates
   * @param conversationModel - Prisma Model-Name
   */
  static async updateContext(
    conversationId: number,
    updates: Partial<ConversationContext>,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'
  ): Promise<void> {
    try {
      const currentContext = await this.getContext(conversationId, conversationModel);
      const updatedContext = { ...currentContext, ...updates };
      
      // Stelle sicher, dass language immer vorhanden ist
      if (!updatedContext.language) {
        updatedContext.language = 'es';
      }
      
      const model = this.getPrismaModel(conversationModel);
      await (prisma as any)[model].update({
        where: { id: conversationId },
        data: { context: updatedContext }
      });
    } catch (error) {
      logger.error(`[ContextService] Fehler beim Aktualisieren des Contexts:`, error);
      throw error;
    }
  }

  /**
   * Löscht Context
   * 
   * @param conversationId - ID der Conversation
   * @param conversationModel - Prisma Model-Name
   */
  static async clearContext(
    conversationId: number,
    conversationModel: 'WhatsAppConversation' | 'EmailConversation' | 'InstagramConversation'
  ): Promise<void> {
    try {
      await this.updateContext(conversationId, { language: 'es' }, conversationModel);
    } catch (error) {
      logger.error(`[ContextService] Fehler beim Löschen des Contexts:`, error);
      throw error;
    }
  }

  /**
   * Prüft ob alle Buchungsinformationen vorhanden sind
   * 
   * @param context - Conversation Context
   * @returns true wenn alle erforderlichen Informationen vorhanden sind
   */
  static hasAllBookingInfo(context: ConversationContext): boolean {
    const booking = context.booking;
    if (!booking) return false;
    
    return !!(
      booking.checkInDate &&
      booking.checkOutDate &&
      booking.roomType &&
      (booking.categoryId || !booking.roomName) // categoryId nur erforderlich wenn roomName vorhanden
    );
  }

  /**
   * Prüft ob alle Tour-Informationen vorhanden sind
   * 
   * @param context - Conversation Context
   * @returns true wenn alle erforderlichen Informationen vorhanden sind
   */
  static hasAllTourInfo(context: ConversationContext): boolean {
    const tour = context.tour;
    if (!tour) return false;
    
    return !!(
      tour.tourId &&
      tour.tourDate &&
      tour.numberOfParticipants &&
      tour.customerName
    );
  }

  /**
   * Merged ParsedMessage mit Context
   * 
   * Kombiniert geparste Nachricht mit bestehendem Context
   * 
   * @param parsed - Geparste Nachricht
   * @param context - Bestehender Context
   * @returns Aktualisierter Context
   */
  static mergeWithContext(parsed: ParsedMessage, context: ConversationContext): ConversationContext {
    const updated: ConversationContext = { ...context };
    
    // KRITISCH: Sprache aus bestehendem Context behalten (wichtig für Sprach-Konsistenz!)
    if (!updated.language) {
      updated.language = context.language || 'es';
    }
    
    // Merge dates
    if (parsed.dates) {
      if (!updated.booking) updated.booking = {};
      if (parsed.dates.checkIn) updated.booking.checkInDate = parsed.dates.checkIn;
      if (parsed.dates.checkOut) updated.booking.checkOutDate = parsed.dates.checkOut;
    }
    
    // Merge name
    if (parsed.name) {
      if (!updated.booking) updated.booking = {};
      updated.booking.guestName = parsed.name;
    }
    
    // Merge room
    if (parsed.room) {
      if (!updated.booking) updated.booking = {};
      if (parsed.room.name) updated.booking.roomName = parsed.room.name;
      if (parsed.room.categoryId) updated.booking.categoryId = parsed.room.categoryId;
      if (parsed.room.type) updated.booking.roomType = parsed.room.type;
    }

    // Wenn roomName vorhanden ist, aber categoryId fehlt, versuche es aus lastAvailabilityCheck zu holen
    if (updated.booking?.roomName && !updated.booking.categoryId && updated.booking.lastAvailabilityCheck) {
      const lastCheck = updated.booking.lastAvailabilityCheck;
      if (lastCheck.rooms) {
        const roomNameLower = updated.booking.roomName.toLowerCase();
        const roomNameWithoutArticle = roomNameLower.replace(/^(el|la|los|las|un|una)\s+/, '');
        const matchingRoom = lastCheck.rooms.find(
          r => {
            const rNameLower = r.name.toLowerCase();
            return rNameLower === roomNameLower ||
                   rNameLower.includes(roomNameWithoutArticle) ||
                   (roomNameWithoutArticle && rNameLower.includes(roomNameWithoutArticle));
          }
        );
        if (matchingRoom) {
          updated.booking.categoryId = matchingRoom.categoryId;
          updated.booking.roomType = matchingRoom.type;
          logger.log(`[ContextService] categoryId aus lastAvailabilityCheck gefunden: ${matchingRoom.categoryId} für ${matchingRoom.name}`);
        }
      }
    }
    
    return updated;
  }

  /**
   * Gibt Prisma Model-Name zurück
   * 
   * @param conversationModel - Conversation Model-Name
   * @returns Prisma Model-Name (lowercase)
   */
  private static getPrismaModel(conversationModel: string): string {
    // Konvertiere zu lowercase für Prisma
    return conversationModel.charAt(0).toLowerCase() + conversationModel.slice(1);
  }
}
