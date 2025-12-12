import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { LobbyPmsService } from './lobbyPmsService';

const prisma = new PrismaClient();

/**
 * Service für Preisanalyse
 * 
 * Zuständig für:
 * - Sammeln von Preisdaten aus LobbyPMS
 * - Berechnung von Belegungsraten
 * - Analyse von historischen Daten
 * - Vergleich mit Konkurrenzpreisen
 */
export class PriceAnalysisService {
  /**
   * Führt eine Preisanalyse für einen Branch durch
   * 
   * @param branchId - Branch-ID
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Anzahl erstellter Analysen
   */
  static async analyzePrices(
    branchId: number,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      logger.log(`Starte Preisanalyse für Branch ${branchId}, Zeitraum: ${startDate.toISOString()} - ${endDate.toISOString()}`);

      // LobbyPMS Service für Branch erstellen
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
      
      // Verfügbarkeitsdaten aus LobbyPMS abrufen
      const availabilityData = await lobbyPmsService.checkAvailability(startDate, endDate);

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
        await prisma.priceAnalysis.upsert({
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

      logger.log(`Preisanalyse abgeschlossen: ${analysisCount} Analysen erstellt`);

      return analysisCount;
    } catch (error) {
      logger.error('Fehler bei der Preisanalyse:', error);
      throw error;
    }
  }

  /**
   * Ruft Preisanalysen für einen Branch ab
   * 
   * @param branchId - Branch-ID
   * @param startDate - Startdatum (optional)
   * @param endDate - Enddatum (optional)
   * @returns Array von Preisanalysen
   */
  static async getAnalyses(
    branchId: number,
    startDate?: Date,
    endDate?: Date
  ) {
    try {
      const where: any = {
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

      const analyses = await prisma.priceAnalysis.findMany({
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
    } catch (error) {
      logger.error('Fehler beim Abrufen der Preisanalysen:', error);
      throw error;
    }
  }

  /**
   * Ruft eine einzelne Preisanalyse ab
   * 
   * @param analysisId - Analyse-ID
   * @returns Preisanalyse
   */
  static async getAnalysisById(analysisId: number) {
    try {
      const analysis = await prisma.priceAnalysis.findUnique({
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
    } catch (error) {
      logger.error('Fehler beim Abrufen der Preisanalyse:', error);
      throw error;
    }
  }
}

