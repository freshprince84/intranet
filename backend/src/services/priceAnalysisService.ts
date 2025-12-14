import { PrismaClient, Decimal } from '@prisma/client';
import { logger } from '../utils/logger';
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
   * Ermittelt die Gesamtzahl Zimmer pro Kategorie
   * Methode: Maximum über einen längeren Zeitraum (90 Tage)
   * 
   * @param branchId - Branch-ID
   * @param categoryId - Kategorie-ID
   * @returns Gesamtzahl Zimmer
   */
  private static async getTotalRoomsForCategory(
    branchId: number,
    categoryId: number
  ): Promise<number> {
    try {
      // Hole Verfügbarkeit für längeren Zeitraum (90 Tage zurück)
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 90);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);

      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
      const availabilityData = await lobbyPmsService.checkAvailability(pastDate, futureDate);

      // Finde Maximum für diese Kategorie
      let maxAvailable = 0;
      for (const entry of availabilityData) {
        if (entry.categoryId === categoryId && entry.availableRooms > maxAvailable) {
          maxAvailable = entry.availableRooms;
        }
      }

      // Wenn kein Maximum gefunden, verwende aktuellen Wert + 1 als Fallback
      if (maxAvailable === 0) {
        logger.warn(`[PriceAnalysis] Keine Verfügbarkeitsdaten für Kategorie ${categoryId}, verwende Fallback`);
        return 1; // Mindestens 1 Zimmer
      }

      return maxAvailable;
    } catch (error) {
      logger.error(`Fehler beim Ermitteln der Gesamtzahl Zimmer für Kategorie ${categoryId}:`, error);
      return 1; // Fallback
    }
  }

  /**
   * Berechnet die Belegungsrate
   * 
   * @param availableRooms - Verfügbare Zimmer
   * @param totalRooms - Gesamtzahl Zimmer
   * @returns Belegungsrate (0-100)
   */
  private static calculateOccupancyRate(availableRooms: number, totalRooms: number): number {
    if (totalRooms === 0) return 0;
    const occupiedRooms = totalRooms - availableRooms;
    return (occupiedRooms / totalRooms) * 100;
  }

  /**
   * Ruft historische Preisdaten ab
   * 
   * @param branchId - Branch-ID
   * @param categoryId - Kategorie-ID
   * @param roomType - Zimmerart
   * @param days - Anzahl Tage zurück
   * @returns Array von historischen Preisen
   */
  private static async getHistoricalPrices(
    branchId: number,
    categoryId: number,
    roomType: string,
    days: number = 30
  ): Promise<number[]> {
    try {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - days);

      const historicalAnalyses = await prisma.priceAnalysis.findMany({
        where: {
          branchId,
          categoryId,
          roomType,
          analysisDate: {
            gte: pastDate
          },
          currentPrice: {
            not: null
          }
        },
        select: {
          currentPrice: true
        },
        orderBy: {
          analysisDate: 'desc'
        }
      });

      return historicalAnalyses
        .map(a => a.currentPrice)
        .filter((p): p is Decimal => p !== null)
        .map(p => Number(p));
    } catch (error) {
      logger.error('Fehler beim Abrufen historischer Preise:', error);
      return [];
    }
  }

  /**
   * Ruft Konkurrenzpreise ab
   * 
   * @param branchId - Branch-ID
   * @param categoryId - Kategorie-ID
   * @param date - Datum
   * @returns Durchschnittspreis der Konkurrenz oder null
   */
  private static async getCompetitorAvgPrice(
    branchId: number,
    categoryId: number,
    date: Date
  ): Promise<number | null> {
    try {
      // Hole OTA-Listings für diese Kategorie
      const listings = await prisma.oTAListing.findMany({
        where: {
          branchId,
          categoryId,
          isActive: true
        }
      });

      if (listings.length === 0) {
        return null;
      }

      // Hole Preisdaten für dieses Datum
      const priceData = await prisma.oTAPriceData.findMany({
        where: {
          listingId: {
            in: listings.map(l => l.id)
          },
          date: date,
          price: {
            not: null
          }
        },
        select: {
          price: true
        }
      });

      if (priceData.length === 0) {
        return null;
      }

      // Berechne Durchschnitt
      const prices = priceData
        .map(d => d.price)
        .filter((p): p is Decimal => p !== null)
        .map(p => Number(p));

      if (prices.length === 0) {
        return null;
      }

      const sum = prices.reduce((acc, p) => acc + p, 0);
      return sum / prices.length;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Konkurrenzpreise:', error);
      return null;
    }
  }

  /**
   * Bestimmt die Preisposition im Vergleich zur Konkurrenz
   * 
   * @param currentPrice - Aktueller Preis
   * @param competitorPrice - Konkurrenzpreis
   * @returns 'above' | 'below' | 'equal'
   */
  private static getPricePosition(currentPrice: number, competitorPrice: number | null): string | null {
    if (competitorPrice === null) {
      return null;
    }

    const diffPercent = ((currentPrice - competitorPrice) / competitorPrice) * 100;

    // Toleranz: ±5%
    if (diffPercent > 5) return 'above';
    if (diffPercent < -5) return 'below';
    return 'equal';
  }

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

      // Cache für totalRooms pro Kategorie (Performance-Optimierung)
      const totalRoomsCache = new Map<number, number>();

      // Gruppiere Daten nach Kategorie und Datum
      const groupedData = new Map<string, typeof availabilityData[0]>();
      for (const entry of availabilityData) {
        const key = `${entry.categoryId}-${entry.date}`;
        groupedData.set(key, entry);
      }

      let analysisCount = 0;

      // Für jeden Tag und jede Kategorie
      for (const entry of availabilityData) {
        const analysisDate = new Date(entry.date);
        const roomType = entry.roomType === 'compartida' ? 'dorm' : 'private';

        // 1. Ermittle totalRooms (mit Cache)
        let totalRooms = totalRoomsCache.get(entry.categoryId);
        if (totalRooms === undefined) {
          totalRooms = await this.getTotalRoomsForCategory(branchId, entry.categoryId);
          totalRoomsCache.set(entry.categoryId, totalRooms);
        }

        // 2. Berechne Belegungsrate
        const occupancyRate = this.calculateOccupancyRate(entry.availableRooms, totalRooms);

        // 3. Hole historische Preise (letzte 30 Tage)
        const historicalPrices = await this.getHistoricalPrices(branchId, entry.categoryId, roomType, 30);

        // 4. Berechne Durchschnitt, Min, Max aus historischen Daten
        let averagePrice: number | null = null;
        let minPrice: number | null = null;
        let maxPrice: number | null = null;

        if (historicalPrices.length > 0) {
          averagePrice = historicalPrices.reduce((sum, p) => sum + p, 0) / historicalPrices.length;
          minPrice = Math.min(...historicalPrices);
          maxPrice = Math.max(...historicalPrices);
        }

        // 5. Hole Konkurrenzpreise
        const competitorAvgPrice = await this.getCompetitorAvgPrice(branchId, entry.categoryId, analysisDate);

        // 6. Bestimme Preisposition
        const pricePosition = this.getPricePosition(entry.pricePerNight, competitorAvgPrice);

        // 7. Speichere Analyse
        await prisma.priceAnalysis.upsert({
          where: {
            branchId_analysisDate_categoryId_roomType: {
              branchId,
              analysisDate,
              categoryId: entry.categoryId,
              roomType
            }
          },
          update: {
            currentPrice: entry.pricePerNight,
            averagePrice: averagePrice,
            minPrice: minPrice,
            maxPrice: maxPrice,
            occupancyRate: occupancyRate,
            availableRooms: entry.availableRooms,
            competitorAvgPrice: competitorAvgPrice,
            pricePosition: pricePosition,
            updatedAt: new Date()
          },
          create: {
            branchId,
            analysisDate,
            startDate,
            endDate,
            categoryId: entry.categoryId,
            roomType,
            currentPrice: entry.pricePerNight,
            averagePrice: averagePrice,
            minPrice: minPrice,
            maxPrice: maxPrice,
            occupancyRate: occupancyRate,
            availableRooms: entry.availableRooms,
            competitorAvgPrice: competitorAvgPrice,
            pricePosition: pricePosition
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

