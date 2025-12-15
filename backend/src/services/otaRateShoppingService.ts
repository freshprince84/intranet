import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { LobbyPmsService } from './lobbyPmsService';
import { OTADiscoveryService } from './otaDiscoveryService';

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
    logger.warn(`[OTARateShoppingService] ⚡ runRateShopping aufgerufen: Branch ${branchId}, Platform ${platform}, Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);
    try {
      // Job erstellen
      logger.warn(`[OTARateShoppingService] 📝 Erstelle Rate Shopping Job in DB...`);
      const job = await prisma.rateShoppingJob.create({
        data: {
          branchId,
          platform,
          startDate,
          endDate,
          status: 'pending'
        }
      });

      logger.warn(`[OTARateShoppingService] ✅ Rate Shopping Job erstellt: ID ${job.id}, Platform: ${platform}, Branch: ${branchId}`);

      // Asynchron ausführen (nicht blockieren)
      logger.warn(`[OTARateShoppingService] 🚀 Starte asynchrones executeRateShopping für Job ${job.id}...`);
      this.executeRateShopping(job.id, branchId, platform, startDate, endDate).catch(error => {
        logger.error(`[OTARateShoppingService] ❌ Fehler beim Ausführen des Rate Shopping Jobs ${job.id}:`, error);
        logger.error(`[OTARateShoppingService] Error Stack:`, error instanceof Error ? error.stack : 'Kein Stack verfügbar');
      });

      logger.warn(`[OTARateShoppingService] ✅ executeRateShopping wurde aufgerufen (asynchron), gebe Job ID ${job.id} zurück`);
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
    logger.warn(`[OTARateShoppingService] ⚡ executeRateShopping START für Job ${jobId}, Branch ${branchId}, Platform ${platform}`);
    try {
      // Job-Status auf 'running' setzen
      logger.warn(`[OTARateShoppingService] 🔄 Setze Job ${jobId} Status auf 'running'...`);
      await prisma.rateShoppingJob.update({
        where: { id: jobId },
        data: {
          status: 'running',
          startedAt: new Date()
        }
      });
      logger.warn(`[OTARateShoppingService] ✅ Job ${jobId} Status auf 'running' gesetzt`);

      logger.warn(`[OTARateShoppingService] 🚀 Starte Job ${jobId} für ${platform}, Branch ${branchId}`);

      // 1. Hole Adress-Informationen vom Branch
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { 
          city: true, 
          country: true, 
          name: true,
          organizationId: true // Für Kontext
        }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      if (!branch.city) {
        logger.warn(`[Rate Shopping] Branch ${branchId} hat keine Stadt konfiguriert`);
        await prisma.rateShoppingJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errors: [{ error: 'Branch hat keine Stadt konfiguriert. Bitte Adress-Informationen in Branch-Einstellungen hinzufügen.' }]
          }
        });
        return;
      }

      // 2. Hole eigene Zimmer-Typen aus LobbyPMS
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
      const ownRooms = await lobbyPmsService.checkAvailability(startDate, endDate);
      const ownRoomTypes = [...new Set(ownRooms.map(r => {
        // Konvertiere 'compartida' -> 'dorm', 'privada' -> 'private'
        return r.roomType === 'compartida' ? 'dorm' : 'private';
      }))]; // ['private', 'dorm']

      if (ownRoomTypes.length === 0) {
        logger.warn(`[Rate Shopping] Keine eigenen Zimmer-Typen gefunden für Branch ${branchId}`);
        await prisma.rateShoppingJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errors: [{ error: 'Keine eigenen Zimmer-Typen gefunden. Bitte zuerst Reservierungen aus LobbyPMS importieren.' }]
          }
        });
        return;
      }

      logger.warn(`[Rate Shopping] Gefundene eigene Zimmertypen: ${ownRoomTypes.join(', ')}`);

      // 3. Für jeden eigenen Zimmertyp: Finde Konkurrenz-Listings
      let totalListingsFound = 0;
      let totalPricesCollected = 0;
      const errors: any[] = [];

      for (const roomType of ownRoomTypes) {
        logger.warn(`[Rate Shopping] Verarbeite Zimmertyp: ${roomType}`);

        // Prüfe ob Listings vorhanden sind oder älter als 7 Tage
        const existingListings = await prisma.oTAListing.findMany({
          where: {
            city: branch.city,
            country: branch.country || undefined,
            platform,
            roomType,
            isActive: true
          }
        });

        // Falls keine Listings vorhanden oder älter als 7 Tage: Neu discoveren
        const needsDiscovery = existingListings.length === 0 || 
          existingListings.some(l => !l.lastScrapedAt || 
            new Date(l.lastScrapedAt).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000);

        if (needsDiscovery) {
          logger.warn(`[Rate Shopping] Starte Discovery für ${platform}, ${branch.city}, ${roomType}`);
          try {
            const discovered = await OTADiscoveryService.discoverListings(
              branch.city,
              branch.country,
              roomType as 'private' | 'dorm',
              platform
            );

            // Speichere/aktualisiere Listings
            for (const listing of discovered) {
              try {
                await prisma.oTAListing.upsert({
                  where: {
                    platform_listingId_city: {
                      platform: listing.platform,
                      listingId: listing.listingId,
                      city: listing.city
                    }
                  },
                  update: {
                    listingUrl: listing.listingUrl,
                    roomName: listing.roomName,
                    lastScrapedAt: new Date(),
                    isActive: true
                  },
                  create: {
                    platform: listing.platform,
                    listingId: listing.listingId,
                    listingUrl: listing.listingUrl,
                    city: listing.city,
                    country: listing.country,
                    roomType: listing.roomType,
                    roomName: listing.roomName,
                    branchId: branchId, // Optional: Für Filterung
                    isActive: true,
                    discoveredAt: new Date()
                  }
                });
                totalListingsFound++;
              } catch (error: any) {
                logger.error(`[Rate Shopping] Fehler beim Speichern eines Listings:`, error.message);
                errors.push({ error: `Fehler beim Speichern: ${error.message}` });
              }
            }
          } catch (error: any) {
            logger.error(`[Rate Shopping] Fehler beim Discovery:`, error.message);
            errors.push({ error: `Discovery-Fehler: ${error.message}` });
          }
        } else {
          logger.warn(`[Rate Shopping] Verwende vorhandene Listings (${existingListings.length}) für ${roomType}`);
          totalListingsFound += existingListings.length;
        }

        // 4. Scrape Preise für alle Konkurrenz-Listings
        const listings = await prisma.oTAListing.findMany({
          where: {
            city: branch.city,
            country: branch.country || undefined,
            platform,
            roomType,
            isActive: true
          }
        });

        logger.warn(`[Rate Shopping] Scrape Preise für ${listings.length} Listings (${roomType})`);

        for (const listing of listings) {
          try {
            if (listing.listingUrl) {
              const pricesCollected = await this.scrapeOTA(
                listing.id,
                platform,
                listing.listingUrl,
                startDate,
                endDate
              );
              totalPricesCollected += pricesCollected;
            }
          } catch (error: any) {
            logger.error(`[Rate Shopping] Fehler beim Scraping für Listing ${listing.id}:`, error.message);
            errors.push({
              listingId: listing.id,
              error: error.message || String(error)
            });
          }

          // Rate-Limiting: Warte 2 Sekunden zwischen Listings
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Hole alle Listings für Status-Update
      const allListings = await prisma.oTAListing.findMany({
        where: {
          city: branch.city,
          country: branch.country || undefined,
          platform,
          isActive: true
        }
      });

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
          listingsFound: allListings.length,
          pricesCollected: totalPricesCollected,
          errors: errors.length > 0 ? errors : null
        }
      });

      logger.warn(`[Rate Shopping] ✅ Job ${jobId} abgeschlossen: ${allListings.length} Listings, ${totalPricesCollected} Preise gesammelt`);
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
    logger.warn(`[Booking.com] 🔍 Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
    
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
      logger.warn(`[Hostelworld] 🔍 Starte Scraping für Listing ${listingId} von ${startDate.toISOString()} bis ${endDate.toISOString()}`);
      
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
            logger.warn(`[Hostelworld] 💰 Preis für ${checkInDate}: ${price} COP, verfügbar: ${available}`);
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
      
      logger.warn(`[Hostelworld] ✅ Scraping abgeschlossen für Listing ${listingId}: ${pricesCollected} Preise gesammelt`);
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
   * @param roomType - Zimmertyp ('compartida' | 'privada') - LobbyPMS Format
   * @returns Durchschnittspreis der Konkurrenz
   */
  static async getCompetitorPrices(
    branchId: number,
    date: Date,
    roomType: 'compartida' | 'privada'
  ): Promise<number | null> {
    try {
      // Hole Branch mit Adress-Informationen
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { city: true, country: true }
      });

      if (!branch?.city) {
        return null;
      }

      // Konvertiere LobbyPMS roomType zu OTA roomType
      const otaRoomType = roomType === 'compartida' ? 'dorm' : 'private';

      // Hole alle OTA-Listings für diese Stadt und Zimmertyp
      const listings = await prisma.oTAListing.findMany({
        where: {
          city: branch.city,
          country: branch.country || undefined,
          roomType: otaRoomType,
          isActive: true
        },
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
      // Hole Branch mit Adress-Informationen
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { city: true, country: true }
      });

      if (!branch?.city) {
        return [];
      }

      // Hole alle Listings für diese Stadt (optional: gefiltert nach branchId)
      const listings = await prisma.oTAListing.findMany({
        where: {
          city: branch.city,
          country: branch.country || undefined,
          isActive: true,
          // Optional: Nur Listings für diesen Branch anzeigen
          // branchId: branchId
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
   * @param branchId - Branch-ID (optional)
   * @param platform - OTA-Plattform
   * @param listingId - Listing-ID auf der OTA-Plattform
   * @param city - Stadt
   * @param data - Listing-Daten
   * @returns Listing
   */
  static async upsertListing(
    branchId: number | null,
    platform: string,
    listingId: string,
    city: string,
    data: {
      listingUrl?: string;
      country?: string | null;
      roomType: 'private' | 'dorm';
      roomName?: string;
      isActive?: boolean;
    }
  ) {
    try {
      const listing = await prisma.oTAListing.upsert({
        where: {
          platform_listingId_city: {
            platform,
            listingId,
            city
          }
        },
        update: {
          ...data,
          branchId: branchId || undefined,
          updatedAt: new Date()
        },
        create: {
          branchId: branchId || null,
          platform,
          listingId,
          city,
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

