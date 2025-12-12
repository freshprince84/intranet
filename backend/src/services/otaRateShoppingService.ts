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

      // TODO: Implementierung des Rate Shopping
      // - Web Scraping oder API-Integration
      // - Preisdaten sammeln
      // - In OTAPriceData speichern
      // - Job-Status aktualisieren

      return job.id;
    } catch (error) {
      logger.error('Fehler beim Erstellen des Rate Shopping Jobs:', error);
      throw error;
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

