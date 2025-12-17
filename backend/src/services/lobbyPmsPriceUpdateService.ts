import { LobbyPmsService } from './lobbyPmsService';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import axios, { AxiosError } from 'axios';

/**
 * Service für Preis-Updates in LobbyPMS
 * 
 * Aktualisiert Preise in LobbyPMS basierend auf Preisempfehlungen
 * 
 * ⚠️ HINWEIS: Der LobbyPMS Preis-Update-Endpoint muss noch identifiziert werden.
 * Mögliche Endpoints:
 * - PUT /api/v2/categories/:categoryId/prices
 * - POST /api/v2/prices
 * - PUT /api/v2/available-rooms (mit Preis-Updates im Payload)
 * 
 * Siehe: docs/implementation_plans/PREISANALYSE_FUNKTION_PLAN.md Abschnitt 9.4
 */
export class LobbyPmsPriceUpdateService {
  /**
   * Aktualisiert einen Preis für eine Kategorie und ein Datum
   * 
   * @param branchId - Branch-ID
   * @param categoryId - LobbyPMS Kategorie-ID
   * @param date - Datum (ISO string oder Date)
   * @param price - Neuer Preis (für 1 Person)
   * @param people - Personenanzahl (default: 1)
   * @returns Erfolg
   */
  static async updatePrice(
    branchId: number,
    categoryId: number,
    date: string | Date,
    price: number,
    people: number = 1
  ): Promise<boolean> {
    try {
      logger.log(`[LobbyPmsPriceUpdate] Aktualisiere Preis für Branch ${branchId}, Kategorie ${categoryId}, Datum ${date}, Preis ${price} (${people} Person(en))`);

      // Lade Branch und Settings
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          id: true,
          lobbyPmsSettings: true,
          organizationId: true
        }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      // Erstelle LobbyPMS Service für API-Zugriff
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
      
      // ⚠️ TODO: LobbyPMS Preis-Update-Endpoint identifizieren und implementieren
      // Aktuell: Placeholder-Implementierung
      // 
      // Mögliche Endpoints (müssen getestet werden):
      // 1. PUT /api/v2/categories/:categoryId/prices
      //    Payload: { date: "...", prices: [{ people: 1, value: 50000 }] }
      // 2. POST /api/v2/prices
      //    Payload: { category_id: 34280, date: "...", prices: [{ people: 1, value: 50000 }] }
      // 3. PUT /api/v2/available-rooms (mit Preis-Updates)
      //    Payload: { date: "...", categories: [{ category_id: 34280, plans: [{ prices: [{ people: 1, value: 50000 }] }] }] }
      
      // Format date
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];

      // ⚠️ PLACEHOLDER: Versuche verschiedene Endpoints
      // Dies muss durch tatsächliche API-Tests ersetzt werden
      try {
        // Versuch 1: PUT /api/v2/categories/:categoryId/prices
        const response = await this.tryUpdatePriceEndpoint1(
          lobbyPmsService,
          categoryId,
          dateStr,
          price,
          people
        );
        
        if (response) {
          logger.log(`[LobbyPmsPriceUpdate] Preis erfolgreich aktualisiert via Endpoint 1`);
          return true;
        }
      } catch (error) {
        logger.warn(`[LobbyPmsPriceUpdate] Endpoint 1 fehlgeschlagen, versuche Endpoint 2...`, error);
      }

      try {
        // Versuch 2: POST /api/v2/prices
        const response = await this.tryUpdatePriceEndpoint2(
          lobbyPmsService,
          categoryId,
          dateStr,
          price,
          people
        );
        
        if (response) {
          logger.log(`[LobbyPmsPriceUpdate] Preis erfolgreich aktualisiert via Endpoint 2`);
          return true;
        }
      } catch (error) {
        logger.warn(`[LobbyPmsPriceUpdate] Endpoint 2 fehlgeschlagen, versuche Endpoint 3...`, error);
      }

      // Versuch 3: PUT /api/v2/available-rooms (mit Preis-Updates)
      try {
        const response = await this.tryUpdatePriceEndpoint3(
          lobbyPmsService,
          categoryId,
          dateStr,
          price,
          people
        );
        
        if (response) {
          logger.log(`[LobbyPmsPriceUpdate] Preis erfolgreich aktualisiert via Endpoint 3`);
          return true;
        }
      } catch (error) {
        logger.error(`[LobbyPmsPriceUpdate] Alle Endpoint-Versuche fehlgeschlagen:`, error);
        throw new Error(`LobbyPMS Preis-Update-Endpoint konnte nicht identifiziert werden. Bitte LobbyPMS API-Dokumentation prüfen oder Support kontaktieren.`);
      }

      return false;
    } catch (error) {
      logger.error(`[LobbyPmsPriceUpdate] Fehler beim Aktualisieren des Preises:`, error);
      throw error;
    }
  }

  /**
   * Versuch 1: PUT /api/v2/categories/:categoryId/prices
   */
  private static async tryUpdatePriceEndpoint1(
    lobbyPmsService: LobbyPmsService,
    categoryId: number,
    date: string,
    price: number,
    people: number
  ): Promise<boolean> {
    // ⚠️ PLACEHOLDER: Muss durch tatsächliche API-Implementierung ersetzt werden
    // Zugriff auf axiosInstance von LobbyPmsService benötigt
    logger.warn(`[LobbyPmsPriceUpdate] Endpoint 1 nicht implementiert - benötigt API-Zugriff`);
    return false;
  }

  /**
   * Versuch 2: POST /api/v2/prices
   */
  private static async tryUpdatePriceEndpoint2(
    lobbyPmsService: LobbyPmsService,
    categoryId: number,
    date: string,
    price: number,
    people: number
  ): Promise<boolean> {
    // ⚠️ PLACEHOLDER: Muss durch tatsächliche API-Implementierung ersetzt werden
    logger.warn(`[LobbyPmsPriceUpdate] Endpoint 2 nicht implementiert - benötigt API-Zugriff`);
    return false;
  }

  /**
   * Versuch 3: PUT /api/v2/available-rooms (mit Preis-Updates)
   */
  private static async tryUpdatePriceEndpoint3(
    lobbyPmsService: LobbyPmsService,
    categoryId: number,
    date: string,
    price: number,
    people: number
  ): Promise<boolean> {
    // ⚠️ PLACEHOLDER: Muss durch tatsächliche API-Implementierung ersetzt werden
    logger.warn(`[LobbyPmsPriceUpdate] Endpoint 3 nicht implementiert - benötigt API-Zugriff`);
    return false;
  }

  /**
   * Aktualisiert mehrere Preise in einem Batch
   * 
   * @param branchId - Branch-ID
   * @param priceUpdates - Array von Preis-Updates
   * @returns Anzahl erfolgreicher Updates
   */
  static async batchUpdatePrices(
    branchId: number,
    priceUpdates: Array<{
      categoryId: number;
      date: string | Date;
      price: number;
      people?: number;
    }>
  ): Promise<number> {
    let successCount = 0;

    for (const update of priceUpdates) {
      try {
        await this.updatePrice(
          branchId,
          update.categoryId,
          update.date,
          update.price,
          update.people || 1
        );
        successCount++;
      } catch (error) {
        logger.error(`[LobbyPmsPriceUpdate] Fehler beim Batch-Update für Kategorie ${update.categoryId}, Datum ${update.date}:`, error);
      }
    }

    logger.log(`[LobbyPmsPriceUpdate] Batch-Update abgeschlossen: ${successCount}/${priceUpdates.length} erfolgreich`);
    return successCount;
  }

  /**
   * Wendet eine Preisempfehlung an (aktualisiert Preis in LobbyPMS)
   * 
   * @param recommendationId - Preisempfehlungs-ID
   * @returns Erfolg
   */
  static async applyRecommendation(recommendationId: number): Promise<boolean> {
    try {
      const recommendation = await prisma.priceRecommendation.findUnique({
        where: { id: recommendationId },
        select: {
          id: true,
          branchId: true,
          categoryId: true,
          date: true,
          recommendedPrice: true,
          currentPrice: true
        }
      });

      if (!recommendation) {
        throw new Error(`Preisempfehlung ${recommendationId} nicht gefunden`);
      }

      if (!recommendation.categoryId) {
        throw new Error(`Preisempfehlung ${recommendationId} hat keine categoryId`);
      }

      // Aktualisiere Preis in LobbyPMS
      await this.updatePrice(
        recommendation.branchId,
        recommendation.categoryId,
        recommendation.date,
        Number(recommendation.recommendedPrice),
        1 // Standard: 1 Person
      );

      logger.log(`[LobbyPmsPriceUpdate] Preisempfehlung ${recommendationId} angewendet: ${Number(recommendation.currentPrice)} → ${Number(recommendation.recommendedPrice)}`);

      return true;
    } catch (error) {
      logger.error(`[LobbyPmsPriceUpdate] Fehler beim Anwenden der Preisempfehlung ${recommendationId}:`, error);
      throw error;
    }
  }
}

