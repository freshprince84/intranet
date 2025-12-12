import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
    try {
      logger.log(`[Hostelworld] Starte Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
      
      let pricesCollected = 0;
      
      // Iteriere über alle Daten im Zeitraum
      const currentDate = new Date(startDate);
      const end = new Date(endDate);
      
      while (currentDate <= end) {
        try {
          // Erstelle URL mit Check-in Datum
          const checkInDate = currentDate.toISOString().split('T')[0];
          const checkOutDate = new Date(currentDate);
          checkOutDate.setDate(checkOutDate.getDate() + 1);
          const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
          
          // Hostelworld URL-Format: /hostels/{hostel-name}-{id}?dateFrom={date}&dateTo={date}
          let urlWithDates = listingUrl;
          if (urlWithDates.includes('?')) {
            urlWithDates = `${urlWithDates}&dateFrom=${checkInDate}&dateTo=${checkOutDateStr}`;
          } else {
            urlWithDates = `${urlWithDates}?dateFrom=${checkInDate}&dateTo=${checkOutDateStr}`;
          }
          
          // HTTP-Request mit User-Agent
          const response = await axios.get(urlWithDates, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.5',
              'Accept-Encoding': 'gzip, deflate, br',
              'Connection': 'keep-alive',
              'Upgrade-Insecure-Requests': '1'
            },
            timeout: 30000, // 30 Sekunden Timeout
            maxRedirects: 5
          });
          
          // HTML parsen
          const $ = cheerio.load(response.data);
          
          // Preise extrahieren - verschiedene mögliche Selektoren für Hostelworld
          let price: number | null = null;
          let available = true;
          let availableRooms: number | null = null;
          
          // Versuche verschiedene Selektoren für Hostelworld
          // 1. .price-amount oder .price
          const priceElement1 = $('.price-amount, .price').first();
          if (priceElement1.length > 0) {
            const priceText = priceElement1.text().replace(/[^\d,.-]/g, '').replace(',', '.');
            const priceMatch = priceText.match(/(\d+\.?\d*)/);
            if (priceMatch) {
              price = parseFloat(priceMatch[1]);
            }
          }
          
          // 2. [data-price] oder data-price attribute
          if (!price) {
            const priceElement2 = $('[data-price]').first();
            if (priceElement2.length > 0) {
              const priceAttr = priceElement2.attr('data-price');
              if (priceAttr) {
                price = parseFloat(priceAttr);
              }
            }
          }
          
          // 3. .room-price oder .dorm-price
          if (!price) {
            const priceElement3 = $('.room-price, .dorm-price, .private-price').first();
            if (priceElement3.length > 0) {
              const priceText = priceElement3.text().replace(/[^\d,.-]/g, '').replace(',', '.');
              const priceMatch = priceText.match(/(\d+\.?\d*)/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1]);
              }
            }
          }
          
          // 4. Suche nach Preis in verschiedenen Formaten im Body
          if (!price) {
            const priceRegex = /(?:€|EUR|USD|\$|COP|COL|GBP|£)\s*(\d+[.,]?\d*)/gi;
            const bodyText = $('body').text();
            const matches = bodyText.match(priceRegex);
            if (matches && matches.length > 0) {
              // Nimm den ersten Preis-Match
              const priceText = matches[0].replace(/[^\d,.-]/g, '').replace(',', '.');
              const priceMatch = priceText.match(/(\d+\.?\d*)/);
              if (priceMatch) {
                price = parseFloat(priceMatch[1]);
              }
            }
          }
          
          // Verfügbarkeit prüfen
          // 1. Prüfe auf "Nicht verfügbar" oder ähnliche Meldungen
          const unavailableTexts = [
            'not available',
            'nicht verfügbar',
            'no beds available',
            'keine betten verfügbar',
            'sold out',
            'ausgebucht',
            'fully booked',
            'voll belegt'
          ];
          
          const bodyTextLower = $('body').text().toLowerCase();
          for (const text of unavailableTexts) {
            if (bodyTextLower.includes(text.toLowerCase())) {
              available = false;
              break;
            }
          }
          
          // 2. Prüfe auf Verfügbarkeits-Indikatoren
          if (available) {
            const availableIndicators = [
              '.availability',
              '.beds-available',
              '[data-available]',
              '.room-available'
            ];
            
            for (const selector of availableIndicators) {
              const element = $(selector).first();
              if (element.length > 0) {
                const text = element.text().toLowerCase();
                if (text.includes('available') || text.includes('verfügbar')) {
                  // Versuche Anzahl verfügbarer Betten zu extrahieren
                  const bedMatch = text.match(/(\d+)\s*(?:bed|bett|beds|betten)/i);
                  if (bedMatch) {
                    availableRooms = parseInt(bedMatch[1], 10);
                  }
                  break;
                }
              }
            }
          }
          
          // 3. Prüfe auf "Book now" Button (indiziert Verfügbarkeit)
          if (available) {
            const bookButton = $('.book-now, .book-button, [data-action="book"]').first();
            if (bookButton.length > 0) {
              const buttonText = bookButton.text().toLowerCase();
              if (buttonText.includes('book') || buttonText.includes('buchen')) {
                available = true;
              }
            }
          }
          
          // Speichere Preisdaten, wenn Preis gefunden wurde
          if (price && price > 0) {
            await this.savePriceData(
              listingId,
              new Date(currentDate),
              price,
              'COP', // Standard-Währung, kann später aus URL/Seite extrahiert werden
              available,
              availableRooms,
              'rate_shopper'
            );
            pricesCollected++;
            logger.log(`[Hostelworld] Preis für ${checkInDate}: ${price} COP, verfügbar: ${available}`);
          } else {
            logger.warn(`[Hostelworld] Kein Preis gefunden für ${checkInDate}`);
          }
          
          // Rate-Limiting: Warte 3 Sekunden zwischen Requests
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Nächster Tag
          currentDate.setDate(currentDate.getDate() + 1);
        } catch (error: any) {
          logger.error(`[Hostelworld] Fehler beim Scraping für ${currentDate.toISOString().split('T')[0]}:`, error.message);
          // Weiter mit nächstem Tag
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      logger.log(`[Hostelworld] Scraping abgeschlossen für Listing ${listingId}: ${pricesCollected} Preise gesammelt`);
      return pricesCollected;
    } catch (error: any) {
      logger.error(`[Hostelworld] Fehler beim Scraping für Listing ${listingId}:`, error);
      throw error;
    }
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

