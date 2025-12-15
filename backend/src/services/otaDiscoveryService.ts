import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

/**
 * Entdecktes Listing von einer OTA-Plattform
 */
export interface DiscoveredListing {
  platform: string;
  listingId: string;
  listingUrl: string;
  city: string;
  country: string | null;
  roomType: 'private' | 'dorm';
  roomName: string | null;
}

/**
 * Service für automatische Discovery von Konkurrenz-Listings auf OTA-Plattformen
 */
export class OTADiscoveryService {
  /**
   * Findet alle Listings für eine Stadt und Zimmertyp
   * 
   * @param city - Stadt (z.B. "Medellín")
   * @param country - Land (z.B. "Kolumbien") - optional
   * @param roomType - Zimmertyp ('private' | 'dorm')
   * @param platform - OTA-Plattform ('booking.com' | 'hostelworld.com')
   * @returns Array von gefundenen Listings
   */
  static async discoverListings(
    city: string,
    country: string | null,
    roomType: 'private' | 'dorm',
    platform: string
  ): Promise<DiscoveredListing[]> {
    logger.warn(`[OTADiscoveryService] 🔍 Starte Discovery für ${platform}, Stadt: ${city}, Land: ${country || 'N/A'}, Zimmertyp: ${roomType}`);

    switch (platform.toLowerCase()) {
      case 'booking.com':
        return await this.scrapeBookingComSearch(city, country, roomType);
      case 'hostelworld.com':
      case 'hostelworld':
        return await this.scrapeHostelworldSearch(city, country, roomType);
      default:
        throw new Error(`Plattform ${platform} wird noch nicht unterstützt`);
    }
  }

  /**
   * Scraped Booking.com Suchseite
   * 
   * @param city - Stadt (z.B. "Medellín")
   * @param country - Land (z.B. "Kolumbien")
   * @param roomType - 'private' | 'dorm'
   * @returns Gefundene Listings
   */
  private static async scrapeBookingComSearch(
    city: string,
    country: string | null,
    roomType: 'private' | 'dorm'
  ): Promise<DiscoveredListing[]> {
    logger.warn(`[OTADiscoveryService] 🔍 Scrape Booking.com für ${city}, ${country || 'N/A'}, ${roomType}`);
    
    const listings: DiscoveredListing[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 10; // Limit für Testing

    // Erstelle Suchstring: "Stadt, Region, Land" oder "Stadt, Land"
    const searchString = country 
      ? `${city}, ${country}` 
      : city;

    // Basis-URL für Booking.com
    // Beispiel: https://www.booking.com/searchresults.de.html?ss=Medell%C3%ADn%2C+Antioquia%2C+Kolumbien&dest_id=-592318&dest_type=city&checkin=2025-12-15&checkout=2025-12-16&group_adults=1&no_rooms=1&group_children=0&nflt=di%3D4137%3Bht_id%3D203%3Breview_score%3D80
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const checkInDate = today.toISOString().split('T')[0];
    const checkOutDate = tomorrow.toISOString().split('T')[0];

    while (hasMorePages && page <= maxPages) {
      try {
        // URL-encode Suchstring
        const encodedSearch = encodeURIComponent(searchString);
        
        // Hostel-Filter: nflt=di%3D4137%3Bht_id%3D203 (Hostels)
        const url = `https://www.booking.com/searchresults.de.html?ss=${encodedSearch}&dest_type=city&checkin=${checkInDate}&checkout=${checkOutDate}&group_adults=1&no_rooms=1&group_children=0&nflt=ht_id%3D203&offset=${(page - 1) * 25}`;

        logger.warn(`[OTADiscoveryService] 📡 Request zu Booking.com, Seite ${page}: ${url}`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 30000,
          maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        const pageListings = this.extractBookingComListings($, roomType, city, country);

        if (pageListings.length === 0) {
          hasMorePages = false;
        } else {
          listings.push(...pageListings);
          logger.warn(`[OTADiscoveryService] ✅ Seite ${page}: ${pageListings.length} Listings gefunden (Gesamt: ${listings.length})`);
        }

        // Rate-Limiting: 2 Sekunden zwischen Requests
        if (hasMorePages && page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        page++;
      } catch (error: any) {
        logger.error(`[OTADiscoveryService] ❌ Fehler beim Scraping von Booking.com Seite ${page}:`, error.message);
        hasMorePages = false;
      }
    }

    logger.warn(`[OTADiscoveryService] ✅ Booking.com Discovery abgeschlossen: ${listings.length} Listings gefunden`);
    return listings;
  }

  /**
   * Scraped Hostelworld Suchseite
   * 
   * @param city - Stadt (z.B. "Medellín")
   * @param country - Land (z.B. "Kolumbien")
   * @param roomType - 'private' | 'dorm'
   * @returns Gefundene Listings
   */
  private static async scrapeHostelworldSearch(
    city: string,
    country: string | null,
    roomType: 'private' | 'dorm'
  ): Promise<DiscoveredListing[]> {
    logger.warn(`[OTADiscoveryService] 🔍 Scrape Hostelworld für ${city}, ${country || 'N/A'}, ${roomType}`);
    
    const listings: DiscoveredListing[] = [];
    let page = 1;
    let hasMorePages = true;
    const maxPages = 10; // Limit für Testing

    // Erstelle Suchstring: "Stadt, Land"
    const searchString = country 
      ? `${city}, ${country}` 
      : city;

    // Basis-URL für Hostelworld
    // Beispiel: https://www.german.hostelworld.com/pwa/s?q=Medell%C3%ADn,%20Kolumbien&country=Medell%C3%ADn&city=Medell%C3%ADn&type=city&id=661&from=2025-12-15&to=2025-12-16&guests=1&page=1
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = tomorrow.toISOString().split('T')[0];

    while (hasMorePages && page <= maxPages) {
      try {
        // URL-encode Suchstring
        const encodedSearch = encodeURIComponent(searchString);
        
        // Hostelworld URL-Struktur
        const url = `https://www.german.hostelworld.com/pwa/s?q=${encodedSearch}&country=${encodeURIComponent(city)}&city=${encodeURIComponent(city)}&type=city&from=${fromDate}&to=${toDate}&guests=1&page=${page}`;

        logger.warn(`[OTADiscoveryService] 📡 Request zu Hostelworld, Seite ${page}: ${url}`);

        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
          },
          timeout: 30000,
          maxRedirects: 5
        });

        const $ = cheerio.load(response.data);
        const pageListings = this.extractHostelworldListings($, roomType, city, country);

        if (pageListings.length === 0) {
          hasMorePages = false;
        } else {
          listings.push(...pageListings);
          logger.warn(`[OTADiscoveryService] ✅ Seite ${page}: ${pageListings.length} Listings gefunden (Gesamt: ${listings.length})`);
        }

        // Rate-Limiting: 2 Sekunden zwischen Requests
        if (hasMorePages && page < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        page++;
      } catch (error: any) {
        logger.error(`[OTADiscoveryService] ❌ Fehler beim Scraping von Hostelworld Seite ${page}:`, error.message);
        hasMorePages = false;
      }
    }

    logger.warn(`[OTADiscoveryService] ✅ Hostelworld Discovery abgeschlossen: ${listings.length} Listings gefunden`);
    return listings;
  }

  /**
   * Extrahiert Listing-Informationen aus Booking.com HTML
   * Berücksichtigt Dorm vs Private Unterschiede
   */
  private static extractBookingComListings(
    $: cheerio.CheerioAPI,
    roomType: 'private' | 'dorm',
    city: string,
    country: string | null
  ): DiscoveredListing[] {
    const listings: DiscoveredListing[] = [];

    // Booking.com Struktur: Suche nach Hotel-Listings
    // Mögliche Selektoren: .sr_item, .c-sr_item, [data-hotel-id]
    const hotelElements = $('.sr_item, .c-sr_item, [data-hotel-id]');

    hotelElements.each((index, element) => {
      try {
        const $el = $(element);
        
        // Extrahiere Hotel-ID (Listing-ID)
        const hotelId = $el.attr('data-hotel-id') || 
                       $el.find('[data-hotel-id]').attr('data-hotel-id') ||
                       $el.attr('data-id') ||
                       null;

        if (!hotelId) {
          return; // Skip wenn keine ID gefunden
        }

        // Extrahiere URL
        const linkElement = $el.find('a[href*="/hotel/"]').first();
        const relativeUrl = linkElement.attr('href');
        const listingUrl = relativeUrl 
          ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.booking.com${relativeUrl}`)
          : null;

        if (!listingUrl) {
          return; // Skip wenn keine URL gefunden
        }

        // Extrahiere Zimmernamen und -typ
        // Booking.com zeigt verschiedene Zimmertypen auf der Suchseite
        // Suche nach Zimmernamen in verschiedenen Selektoren
        let roomName: string | null = null;
        const roomNameSelectors = [
          '.room_name',
          '.room-type',
          '[data-room-type]',
          '.room_info',
          '.room-details'
        ];

        for (const selector of roomNameSelectors) {
          const roomNameEl = $el.find(selector).first();
          if (roomNameEl.length > 0) {
            roomName = roomNameEl.text().trim();
            break;
          }
        }

        // Falls kein Zimmername gefunden, versuche aus Titel zu extrahieren
        if (!roomName) {
          const title = $el.find('h3, .sr-hotel__title, .hotel-name').first().text().trim();
          roomName = title || null;
        }

        // Filtere nach Zimmertyp basierend auf Namen
        const roomNameLower = (roomName || '').toLowerCase();
        const isDorm = roomNameLower.includes('dorm') || 
                      roomNameLower.includes('shared') || 
                      roomNameLower.includes('bed in') ||
                      roomNameLower.includes('bunk');
        const isPrivate = roomNameLower.includes('private') || 
                        roomNameLower.includes('room') ||
                        roomNameLower.includes('double') ||
                        roomNameLower.includes('single');

        // Prüfe ob Listing zum gewünschten Zimmertyp passt
        if (roomType === 'dorm' && !isDorm && !isPrivate) {
          // Wenn kein eindeutiger Typ gefunden, akzeptiere für Dorm (Hostels haben meist Dorms)
          // Aber skip wenn eindeutig Private
          if (isPrivate) {
            return; // Skip Private für Dorm-Suche
          }
        } else if (roomType === 'private' && isDorm) {
          return; // Skip Dorm für Private-Suche
        }

        // Wenn kein Zimmername gefunden, setze Default basierend auf roomType
        if (!roomName) {
          roomName = roomType === 'dorm' ? 'Dorm Bed' : 'Private Room';
        }

        listings.push({
          platform: 'booking.com',
          listingId: hotelId,
          listingUrl,
          city,
          country,
          roomType,
          roomName
        });
      } catch (error: any) {
        logger.error(`[OTADiscoveryService] Fehler beim Extrahieren eines Booking.com Listings:`, error.message);
      }
    });

    return listings;
  }

  /**
   * Extrahiert Listing-Informationen aus Hostelworld HTML
   * Berücksichtigt Dorm vs Private Unterschiede
   */
  private static extractHostelworldListings(
    $: cheerio.CheerioAPI,
    roomType: 'private' | 'dorm',
    city: string,
    country: string | null
  ): DiscoveredListing[] {
    const listings: DiscoveredListing[] = [];

    // Hostelworld Struktur: Suche nach Hostel-Listings
    // Mögliche Selektoren: .property-card, .hostel-card, [data-property-id]
    const hostelElements = $('.property-card, .hostel-card, [data-property-id], .pwa-property-card');

    hostelElements.each((index, element) => {
      try {
        const $el = $(element);
        
        // Extrahiere Property-ID (Listing-ID)
        const propertyId = $el.attr('data-property-id') || 
                          $el.find('[data-property-id]').attr('data-property-id') ||
                          $el.attr('data-id') ||
                          null;

        if (!propertyId) {
          // Versuche aus URL zu extrahieren
          const linkElement = $el.find('a[href*="/hostels/"]').first();
          const href = linkElement.attr('href');
          if (href) {
            const match = href.match(/\/hostels\/[^\/]+-(\d+)/);
            if (match && match[1]) {
              // propertyId gefunden
            } else {
              return; // Skip wenn keine ID gefunden
            }
          } else {
            return; // Skip wenn keine ID gefunden
          }
        }

        // Extrahiere URL
        const linkElement = $el.find('a[href*="/hostels/"]').first();
        const relativeUrl = linkElement.attr('href');
        const listingUrl = relativeUrl 
          ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.hostelworld.com${relativeUrl}`)
          : null;

        if (!listingUrl) {
          return; // Skip wenn keine URL gefunden
        }

        // Extrahiere Zimmernamen und -typ
        // Hostelworld zeigt verschiedene Zimmertypen
        let roomName: string | null = null;
        const roomNameSelectors = [
          '.room-type-dorm',
          '.room-type-private',
          '.room-type',
          '[data-room-type]',
          '.room-name',
          '.dorm-name',
          '.private-name'
        ];

        for (const selector of roomNameSelectors) {
          const roomNameEl = $el.find(selector).first();
          if (roomNameEl.length > 0) {
            roomName = roomNameEl.text().trim();
            break;
          }
        }

        // Falls kein Zimmername gefunden, versuche aus Titel zu extrahieren
        if (!roomName) {
          const title = $el.find('h2, h3, .property-name, .hostel-name').first().text().trim();
          roomName = title || null;
        }

        // Filtere nach Zimmertyp basierend auf Namen und Selektoren
        const roomNameLower = (roomName || '').toLowerCase();
        const hasDormSelector = $el.find('.room-type-dorm, .dorm-name').length > 0;
        const hasPrivateSelector = $el.find('.room-type-private, .private-name').length > 0;
        
        const isDorm = hasDormSelector || 
                      roomNameLower.includes('dorm') || 
                      roomNameLower.includes('shared') || 
                      roomNameLower.includes('bed in') ||
                      roomNameLower.includes('bunk');
        const isPrivate = hasPrivateSelector ||
                         (roomNameLower.includes('private') && !roomNameLower.includes('dorm')) ||
                         (roomNameLower.includes('room') && !roomNameLower.includes('dorm'));

        // Prüfe ob Listing zum gewünschten Zimmertyp passt
        if (roomType === 'dorm' && isPrivate && !isDorm) {
          return; // Skip Private für Dorm-Suche
        } else if (roomType === 'private' && isDorm && !isPrivate) {
          return; // Skip Dorm für Private-Suche
        }

        // Wenn kein Zimmername gefunden, setze Default basierend auf roomType
        if (!roomName) {
          roomName = roomType === 'dorm' ? 'Dorm Bed' : 'Private Room';
        }

        // Extrahiere Property-ID aus URL falls nicht vorhanden
        let listingId = propertyId;
        if (!listingId && listingUrl) {
          const match = listingUrl.match(/\/hostels\/[^\/]+-(\d+)/);
          if (match && match[1]) {
            listingId = match[1];
          }
        }

        if (!listingId) {
          return; // Skip wenn keine ID gefunden
        }

        listings.push({
          platform: 'hostelworld.com',
          listingId,
          listingUrl,
          city,
          country,
          roomType,
          roomName
        });
      } catch (error: any) {
        logger.error(`[OTADiscoveryService] Fehler beim Extrahieren eines Hostelworld Listings:`, error.message);
      }
    });

    return listings;
  }
}

