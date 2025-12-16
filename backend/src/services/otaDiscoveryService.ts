import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';

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
   * Scraped Booking.com Suchseite mit Puppeteer (Browser-Automation)
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
    logger.warn(`[OTADiscoveryService] 🔍 Scrape Booking.com für ${city}, ${country || 'N/A'}, ${roomType} (mit Puppeteer)`);
    
    const listings: DiscoveredListing[] = [];
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // Erstelle Suchstring: "Stadt, Region, Land" oder "Stadt, Land"
      const searchString = country 
        ? `${city}, ${country}` 
        : city;

      // Basis-URL für Booking.com
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const checkInDate = today.toISOString().split('T')[0];
      const checkOutDate = tomorrow.toISOString().split('T')[0];

      // URL-encode Suchstring
      const encodedSearch = encodeURIComponent(searchString);
      
      // Hostel-Filter: nflt=ht_id%3D203 (Hostels)
      const url = `https://www.booking.com/searchresults.de.html?ss=${encodedSearch}&dest_type=city&checkin=${checkInDate}&checkout=${checkOutDate}&group_adults=1&no_rooms=1&group_children=0&nflt=ht_id%3D203&offset=0`;

      logger.warn(`[OTADiscoveryService] 📡 Starte Browser für Booking.com: ${url}`);

      // Starte Browser mit Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });

      page = await browser.newPage();

      // Setze realistische Browser-Headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'DNT': '1'
      });

      // Navigiere zur Seite und warte auf Content
      logger.warn(`[OTADiscoveryService] 🌐 Navigiere zu Booking.com...`);
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Warte zusätzlich 2 Sekunden für JavaScript-Execution
      await page.waitForTimeout(2000);

      // Prüfe ob Bot-Schutz aktiv ist
      const pageContent = await page.content();
      if (pageContent.includes('challenge-container') || pageContent.includes('AwsWafIntegration') || pageContent.includes('verify that you\'re not a robot')) {
        logger.error(`[OTADiscoveryService] ⚠️ Booking.com Bot-Schutz aktiv!`);
        logger.error(`[OTADiscoveryService] ⚠️ Response-Länge: ${pageContent.length} Zeichen`);
        return [];
      }

      // Warte auf Hotel-Listings (verschiedene mögliche Selektoren)
      const selectors = [
        '.sr_item',
        '.c-sr_item',
        '[data-hotel-id]',
        '[data-testid*="propertycard"]',
        '[data-testid*="hotelcard"]',
        'article[data-testid]'
      ];

      let listingsFound = false;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          listingsFound = true;
          logger.warn(`[OTADiscoveryService] ✅ Selektor "${selector}" gefunden`);
          break;
        } catch (e) {
          // Selektor nicht gefunden, versuche nächsten
        }
      }

      if (!listingsFound) {
        logger.warn(`[OTADiscoveryService] ⚠️ Keine Hotel-Listings gefunden mit erwarteten Selektoren`);
      }

      // Extrahiere HTML und parse mit Cheerio
      const html = await page.content();
      const $ = cheerio.load(html);
      
      logger.warn(`[OTADiscoveryService] 📄 HTML-Response erhalten: ${html.length} Zeichen`);
      
      // DEBUG: Teste verschiedene Selektoren
      const testSelectors = [
        '.sr_item',
        '.c-sr_item',
        '[data-hotel-id]',
        '[data-testid*="propertycard"]',
        '[data-testid*="hotelcard"]',
        '.propertycard',
        '.hotelcard',
        'article[data-testid]',
        '[class*="sr_item"]',
        '[class*="property"]'
      ];
      
      for (const selector of testSelectors) {
        const count = $(selector).length;
        if (count > 0) {
          logger.warn(`[OTADiscoveryService] 🔍 Selektor "${selector}": ${count} Elemente gefunden`);
        }
      }
      
      // Extrahiere Listings
      const pageListings = this.extractBookingComListings($, roomType, city, country);
      listings.push(...pageListings);
      
      logger.warn(`[OTADiscoveryService] ✅ Booking.com Discovery abgeschlossen: ${listings.length} Listings gefunden`);

    } catch (error: any) {
      logger.error(`[OTADiscoveryService] ❌ Fehler beim Scraping von Booking.com:`, error.message);
      logger.error(`[OTADiscoveryService] Error Stack:`, error instanceof Error ? error.stack : 'Kein Stack verfügbar');
    } finally {
      // Schließe Browser
      if (page) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    }

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
        
        // Hostelworld URL-Struktur - versuche Standard-Suchseite
        // Format: /search?search_keywords=...&date_from=...&date_to=...
        let url: string;
        if (page === 1) {
          url = `https://www.hostelworld.com/search?search_keywords=${encodedSearch}&date_from=${fromDate}&date_to=${toDate}&number_of_guests=1`;
        } else {
          url = `https://www.hostelworld.com/search?search_keywords=${encodedSearch}&date_from=${fromDate}&date_to=${toDate}&number_of_guests=1&page=${page}`;
        }

        logger.warn(`[OTADiscoveryService] 📡 Request zu Hostelworld, Seite ${page}: ${url}`);

        // Erweiterte Headers für Bot-Schutz-Umgehung
        const headers = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.hostelworld.com/',
          'DNT': '1'
        };

        const response = await axios.get(url, {
          headers,
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: (status) => status < 500 // Akzeptiere auch 4xx für besseres Error-Handling
        });

        // Prüfe Status-Code - aber auch wenn 404, wenn content-length > 0, dann wurde HTML geladen
        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        if (response.status === 404 && contentLength < 1000) {
          // Echter 404 (kleine Fehlerseite)
          logger.error(`[OTADiscoveryService] ⚠️ Hostelworld 404-Fehler! URL: ${url}`);
          logger.error(`[OTADiscoveryService] ⚠️ Response-Header:`, response.headers);
          hasMorePages = false;
          break; // Stoppe weitere Versuche
        }

        // Wenn Status 404 aber große Response, dann wurde HTML geladen (möglicherweise Fehlerseite, aber versuchen zu parsen)
        if (response.status === 404 && contentLength > 1000) {
          logger.warn(`[OTADiscoveryService] ⚠️ Hostelworld Status 404, aber ${contentLength} Bytes HTML erhalten - versuche zu parsen`);
        }

        const $ = cheerio.load(response.data);
        
        // DEBUG: Log HTML-Struktur für Analyse
        if (page === 1) {
          const bodyHtml = $('body').html() || '';
          const bodyLength = bodyHtml.length;
          logger.warn(`[OTADiscoveryService] 📄 HTML-Response erhalten: ${bodyLength} Zeichen, Status: ${response.status}`);
          
          // Prüfe verschiedene mögliche Selektoren
          const testSelectors = [
            '.property-card',
            '.hostel-card',
            '[data-property-id]',
            '.pwa-property-card',
            '.property',
            '.hostel',
            '[class*="property"]',
            '[class*="hostel"]',
            'article',
            '[data-testid*="property"]',
            '[data-testid*="hostel"]'
          ];
          
          for (const selector of testSelectors) {
            const count = $(selector).length;
            if (count > 0) {
              logger.warn(`[OTADiscoveryService] 🔍 Selektor "${selector}": ${count} Elemente gefunden`);
            }
          }
          
          // Log erste 2000 Zeichen des HTML für manuelle Analyse
          const htmlSample = bodyHtml.substring(0, 2000);
          logger.warn(`[OTADiscoveryService] 📋 HTML-Sample (erste 2000 Zeichen):\n${htmlSample}`);
        }
        
        const pageListings = this.extractHostelworldListings($, roomType, city, country);

        if (pageListings.length === 0) {
          logger.warn(`[OTADiscoveryService] ⚠️ Seite ${page}: Keine Listings gefunden`);
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
    // DEBUG: Teste verschiedene Selektoren und logge Ergebnisse
    const testSelectors = [
      '.sr_item',
      '.c-sr_item',
      '[data-hotel-id]',
      '[data-testid*="propertycard"]',
      '[data-testid*="hotelcard"]',
      '.propertycard',
      '.hotelcard',
      'article[data-testid]',
      '[class*="sr_item"]',
      '[class*="property"]',
      'a[href*="/hotel/"]'
    ];
    
    let hotelElements: cheerio.Cheerio<any> | null = null;
    let foundSelector: string | null = null;
    
    for (const selector of testSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        logger.warn(`[OTADiscoveryService] ✅ Booking.com Selektor "${selector}": ${elements.length} Elemente gefunden`);
        hotelElements = elements;
        foundSelector = selector;
        break;
      }
    }
    
    if (!hotelElements || hotelElements.length === 0) {
      logger.warn(`[OTADiscoveryService] ⚠️ Booking.com: Keine Hotel-Elemente gefunden mit allen getesteten Selektoren`);
      logger.warn(`[OTADiscoveryService] 🔍 Getestete Selektoren: ${testSelectors.join(', ')}`);
      return [];
    }
    
    logger.warn(`[OTADiscoveryService] ✅ Verwende Selektor "${foundSelector}" mit ${hotelElements.length} Elementen`);

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
    // DEBUG: Teste verschiedene Selektoren und logge Ergebnisse
    const testSelectors = [
      '.property-card',
      '.hostel-card',
      '[data-property-id]',
      '.pwa-property-card',
      '.property',
      '.hostel',
      '[class*="property"]',
      '[class*="hostel"]',
      'article',
      '[data-testid*="property"]',
      '[data-testid*="hostel"]',
      'a[href*="/hostels/"]'
    ];
    
    let hostelElements: cheerio.Cheerio<any> | null = null;
    let foundSelector: string | null = null;
    
    for (const selector of testSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        logger.warn(`[OTADiscoveryService] ✅ Hostelworld Selektor "${selector}": ${elements.length} Elemente gefunden`);
        hostelElements = elements;
        foundSelector = selector;
        break;
      }
    }
    
    if (!hostelElements || hostelElements.length === 0) {
      logger.warn(`[OTADiscoveryService] ⚠️ Hostelworld: Keine Listings-Elemente gefunden mit allen getesteten Selektoren`);
      logger.warn(`[OTADiscoveryService] 🔍 Getestete Selektoren: ${testSelectors.join(', ')}`);
      return [];
    }
    
    logger.warn(`[OTADiscoveryService] ✅ Verwende Selektor "${foundSelector}" mit ${hostelElements.length} Elementen`);

    hostelElements.each((index, element) => {
      try {
        const $el = $(element);
        
        // Extrahiere URL zuerst (wird für propertyId-Extraktion benötigt)
        const linkElement = $el.find('a[href*="/hostels/"]').first();
        const relativeUrl = linkElement.attr('href');
        const listingUrl = relativeUrl 
          ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.hostelworld.com${relativeUrl}`)
          : null;

        if (!listingUrl) {
          logger.warn(`[OTADiscoveryService] ⚠️ Hostelworld: Keine URL gefunden für Element ${index}`);
          return; // Skip wenn keine URL gefunden
        }

        // Extrahiere Property-ID (Listing-ID) - zuerst aus Attributen, dann aus URL
        let propertyId = $el.attr('data-property-id') || 
                         $el.find('[data-property-id]').attr('data-property-id') ||
                         $el.attr('data-id') ||
                         null;

        // Falls nicht in Attributen, versuche aus URL zu extrahieren
        if (!propertyId && listingUrl) {
          const match = listingUrl.match(/\/hostels\/[^\/]+-(\d+)/);
          if (match && match[1]) {
            propertyId = match[1];
          } else {
            // Alternative: Versuche aus href direkt
            const hrefMatch = relativeUrl?.match(/\/hostels\/[^\/]+-(\d+)/);
            if (hrefMatch && hrefMatch[1]) {
              propertyId = hrefMatch[1];
            }
          }
        }

        // Falls immer noch keine ID, verwende URL als Fallback-ID
        if (!propertyId) {
          // Extrahiere letzten Teil der URL als ID
          const urlParts = listingUrl.split('/');
          const lastPart = urlParts[urlParts.length - 1];
          propertyId = lastPart || `hostel-${index}`;
          logger.warn(`[OTADiscoveryService] ⚠️ Hostelworld: Keine Property-ID gefunden, verwende Fallback: ${propertyId}`);
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

        // Verwende propertyId als listingId (falls nicht vorhanden, verwende Fallback)
        const listingId = propertyId || `hostel-${index}`;

        logger.warn(`[OTADiscoveryService] 🔍 Hostelworld Listing ${index}: ID=${listingId}, URL=${listingUrl}, RoomName=${roomName}, isDorm=${isDorm}, isPrivate=${isPrivate}, roomType=${roomType}`);

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

