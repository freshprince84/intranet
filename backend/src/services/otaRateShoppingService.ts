import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Service für OTA Rate Shopping
 * 
 * Zuständig für:
 * - Sammeln von Preisdaten von OTA-Plattformen (Booking.com, Hostelworld, etc.)
 * - Web Scraping oder API-Integration
 * - Speichern der Preisdaten in der Datenbank
 */
export class OTARateShoppingService {
  /**
   * Führt Rate Shopping für eine bestimmte Plattform durch
   * 
   * @param branchId - Branch-ID
   * @param platform - OTA-Plattform (z.B. 'booking.com', 'hostelworld.com')
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Job-ID
   */
  static async runRateShopping(
    branchId: number,
    platform: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    try {
      // Job erstellen
      const job = await prisma.rateShoppingJob.create({
        data: {
          branchId,
          platform,
          startDate,
          endDate,
          status: 'pending'
        }
      });

      logger.log(`Rate Shopping Job erstellt: ID ${job.id}, Platform: ${platform}, Branch: ${branchId}`);

      // Asynchron ausführen (nicht blockieren)
      this.executeRateShopping(job.id, branchId, platform, startDate, endDate).catch(error => {
        logger.error(`Fehler beim Ausführen des Rate Shopping Jobs ${job.id}:`, error);
      });

      return job.id;
    } catch (error) {
      logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
      throw error;
    }
  }

  /**
   * Führt den Rate Shopping Job aus
   * 
   * @param jobId - Job-ID
   * @param branchId - Branch-ID
   * @param platform - OTA-Plattform
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   */
  private static async executeRateShopping(
    jobId: number,
    branchId: number,
    platform: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      // Job-Status auf 'running' setzen
      await prisma.rateShoppingJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date()
        }
      });

      logger.log(`[Rate Shopping] Starte Job ${jobId} für ${platform}, Branch ${branchId}`);

      // Hole alle aktiven Listings für diese Plattform
      const listings = await prisma.oTAListing.findMany({
        where: {
          branchId,
          platform,
          isActive: true
        }
      });

      if (listings.length === 0) {
        logger.warn(`[Rate Shopping] Keine aktiven Listings gefunden für ${platform}, Branch ${branchId}`);
        await prisma.rateShoppingJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            listingsFound: 0,
            pricesCollected: 0
          }
        });
        return;
      }

      let totalPricesCollected = 0;
      const errors: any[] = [];

      // Für jedes Listing Preise sammeln
      for (const listing of listings) {
        try {
          const pricesCollected = await this.scrapeOTA(
            listing.id,
            platform,
            listing.listingUrl || '',
            startDate,
            endDate
          );
          totalPricesCollected += pricesCollected;
        } catch (error: any) {
          logger.error(`[Rate Shopping] Fehler beim Scraping für Listing ${listing.id}:`, error);
          errors.push({
            listingId: listing.id,
            error: error.message || String(error)
          });
        }

        // Rate-Limiting: Warte 2 Sekunden zwischen Listings
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Job-Status auf 'completed' setzen
      await prisma.rateShoppingJob.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          listingsFound: listings.length,
          pricesCollected: totalPricesCollected,
          errors: errors.length > 0 ? errors : null
        }
      });

      logger.log(`[Rate Shopping] Job ${jobId} abgeschlossen: ${totalPricesCollected} Preise gesammelt`);
    } catch (error) {
      logger.error(`[Rate Shopping] Fehler beim Ausführen des Jobs ${jobId}:`, error);
      await prisma.rateShoppingJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errors: [{ error: error instanceof Error ? error.message : String(error) }]
        }
      });
    }
  }

  /**
   * Generische Funktion zum Scrapen einer OTA-Plattform
   * 
   * @param listingId - Listing-ID in der Datenbank
   * @param platform - OTA-Plattform
   * @param listingUrl - URL des Listings
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Anzahl gesammelter Preise
   */
  private static async scrapeOTA(
    listingId: number,
    platform: string,
    listingUrl: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    if (!listingUrl) {
      throw new Error(`Keine URL für Listing ${listingId} angegeben`);
    }

    switch (platform.toLowerCase()) {
      case 'booking.com':
        return await this.scrapeBookingCom(listingId, listingUrl, startDate, endDate);
      case 'hostelworld.com':
      case 'hostelworld':
        return await this.scrapeHostelworld(listingId, listingUrl, startDate, endDate);
      default:
        throw new Error(`Plattform ${platform} wird noch nicht unterstützt`);
    }
  }

  /**
   * Sammelt Preise von Booking.com
   * 
   * @param listingId - Listing-ID in der Datenbank
   * @param listingUrl - URL des Listings
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Anzahl gesammelter Preise
   */
  private static async scrapeBookingCom(
    listingId: number,
    listingUrl: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // TODO: Implementierung mit Web Scraping (Cheerio) oder API
    // Für jetzt: Placeholder-Implementierung
    logger.log(`[Booking.com] Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
    
    // Simuliere Preise (später durch echtes Scraping ersetzen)
    const pricesCollected = 0;
    
    // Beispiel-Struktur für später:
    // 1. HTTP-Request mit axios
    // 2. HTML parsen mit cheerio
    // 3. Preise extrahieren
    // 4. In savePriceData speichern
    
    return pricesCollected;
  }

  /**
   * Sammelt Preise von Hostelworld
   * 
   * @param listingId - Listing-ID in der Datenbank
   * @param listingUrl - URL des Listings
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Anzahl gesammelter Preise
   */
  private static async scrapeHostelworld(
    listingId: number,
    listingUrl: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    // TODO: Implementierung mit Web Scraping (Cheerio) oder API
    // Für jetzt: Placeholder-Implementierung
    logger.log(`[Hostelworld] Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
    
    // Simuliere Preise (später durch echtes Scraping ersetzen)
    const pricesCollected = 0;
    
    // Beispiel-Struktur für später:
    // 1. HTTP-Request mit axios
    // 2. HTML parsen mit cheerio
    // 3. Preise extrahieren
    // 4. In savePriceData speichern
    
    return pricesCollected;
  }

  /**
   * Gibt Konkurrenzpreise für ein bestimmtes Datum zurück
   * 
   * @param branchId - Branch-ID
   * @param date - Datum
   * @param categoryId - Kategorie-ID (optional)
   * @returns Durchschnittspreis der Konkurrenz
   */
  static async getCompetitorPrices(
    branchId: number,
    date: Date,
    categoryId?: number
  ): Promise<number | null> {
    try {
      // Hole alle OTA-Listings für diesen Branch
      const where: any = {
        branchId,
        isActive: true
      };

      if (categoryId) {
        where.categoryId = categoryId;
      }

      const listings = await prisma.oTAListing.findMany({
        where,
        include: {
          priceData: {
            where: {
              date: date
            }
          }
        }
      });

      if (listings.length === 0) {
        return null;
      }

      // Berechne Durchschnittspreis
      let totalPrice = 0;
      let count = 0;

      for (const listing of listings) {
        if (listing.priceData.length > 0) {
          const price = Number(listing.priceData[0].price);
          totalPrice += price;
          count++;
        }
      }

      if (count === 0) {
        return null;
      }

      return totalPrice / count;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Konkurrenzpreise:', error);
      return null;
    }
  }

  /**
   * Ruft alle OTA-Listings für einen Branch ab
   * 
   * @param branchId - Branch-ID
   * @returns Array von OTA-Listings
   */
  static async getListings(branchId: number) {
    try {
      const listings = await prisma.oTAListing.findMany({
        where: {
          branchId,
          isActive: true
        },
        include: {
          priceData: {
            orderBy: {
              date: 'desc'
            },
            take: 30 // Letzte 30 Tage
          }
        },
        orderBy: {
          platform: 'asc'
        }
      });

      return listings;
    } catch (error) {
      logger.error('Fehler beim Abrufen der OTA-Listings:', error);
      throw error;
    }
  }

  /**
   * Erstellt oder aktualisiert ein OTA-Listing
   * 
   * @param branchId - Branch-ID
   * @param platform - OTA-Plattform
   * @param listingId - Listing-ID auf der OTA-Plattform
   * @param data - Listing-Daten
   * @returns Listing
   */
  static async upsertListing(
    branchId: number,
    platform: string,
    listingId: string,
    data: {
      listingUrl?: string;
      categoryId?: number;
      roomType: 'private' | 'dorm';
      roomName?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const listing = await prisma.oTAListing.upsert({
        where: {
          branchId_platform_listingId: {
            branchId,
            platform,
            listingId
          }
        },
        update: {
          ...data,
          updatedAt: new Date()
        },
        create: {
          branchId,
          platform,
          listingId,
          ...data
        }
      });

      return listing;
    } catch (error) {
      logger.error('Fehler beim Erstellen/Aktualisieren des OTA-Listings:', error);
      throw error;
    }
  }

  /**
   * Speichert Preisdaten für ein Listing
   * 
   * @param listingId - Listing-ID
   * @param date - Datum
   * @param price - Preis
   * @param currency - Währung (Standard: COP)
   * @param available - Verfügbar
   * @param availableRooms - Anzahl verfügbarer Zimmer
   * @param source - Quelle ('rate_shopper' | 'api' | 'manual')
   * @returns Preisdaten
   */
  static async savePriceData(
    listingId: number,
    date: Date,
    price: number,
    currency: string = 'COP',
    available: boolean = true,
    availableRooms?: number,
    source: 'rate_shopper' | 'api' | 'manual' = 'rate_shopper'
  ) {
    try {
      const priceData = await prisma.oTAPriceData.upsert({
        where: {
          listingId_date: {
            listingId,
            date
          }
        },
        update: {
          price,
          currency,
          available,
          availableRooms,
          source,
          scrapedAt: new Date()
        },
        create: {
          listingId,
          date,
          price,
          currency,
          available,
          availableRooms,
          source,
          scrapedAt: new Date()
        }
      });

      return priceData;
    } catch (error) {
      logger.error('Fehler beim Speichern der Preisdaten:', error);
      throw error;
    }
  }

  /**
   * Ruft Preisdaten für ein Listing ab
   * 
   * @param listingId - Listing-ID
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Array von Preisdaten
   */
  static async getPriceData(
    listingId: number,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const priceData = await prisma.oTAPriceData.findMany({
        where: {
          listingId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        }
      });

      return priceData;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Preisdaten:', error);
      throw error;
    }
  }
}

