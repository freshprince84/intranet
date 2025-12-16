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

      // Starte Browser mit Puppeteer (mit Fehlerbehandlung)
      try {
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
      } catch (puppeteerError: any) {
        logger.error(`[OTADiscoveryService] ⚠️ Puppeteer kann nicht gestartet werden: ${puppeteerError.message}`);
        logger.warn(`[OTADiscoveryService] 🔄 Fallback auf axios (ohne Browser-Automation)`);
        // Fallback auf axios (wird weiter unten behandelt)
        throw new Error('PUPPETEER_UNAVAILABLE');
      }

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
      await new Promise(resolve => setTimeout(resolve, 2000));

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
      // Wenn Puppeteer nicht verfügbar ist, versuche Fallback auf axios
      if (error.message === 'PUPPETEER_UNAVAILABLE' || error.message.includes('Failed to launch the browser process')) {
        logger.warn(`[OTADiscoveryService] 🔄 Puppeteer nicht verfügbar, verwende Fallback auf axios`);
        return await this.scrapeBookingComSearchFallback(city, country, roomType);
      }
      
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
   * Fallback: Scraped Booking.com mit axios (wenn Puppeteer nicht verfügbar)
   */
  private static async scrapeBookingComSearchFallback(
    city: string,
    country: string | null,
    roomType: 'private' | 'dorm'
  ): Promise<DiscoveredListing[]> {
    logger.warn(`[OTADiscoveryService] 🔍 Scrape Booking.com (Fallback axios) für ${city}, ${country || 'N/A'}, ${roomType}`);
    
    const listings: DiscoveredListing[] = [];
    
    try {
      const searchString = country ? `${city}, ${country}` : city;
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const checkInDate = today.toISOString().split('T')[0];
      const checkOutDate = tomorrow.toISOString().split('T')[0];
      const encodedSearch = encodeURIComponent(searchString);
      
      const url = `https://www.booking.com/searchresults.de.html?ss=${encodedSearch}&dest_type=city&checkin=${checkInDate}&checkout=${checkOutDate}&group_adults=1&no_rooms=1&group_children=0&nflt=ht_id%3D203&offset=0`;

      logger.warn(`[OTADiscoveryService] 📡 Request zu Booking.com (Fallback): ${url}`);

      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.booking.com/',
        'DNT': '1'
      };

      const response = await axios.get(url, {
        headers,
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: (status) => status < 500
      });

      const responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      if (responseText.includes('challenge-container') || responseText.includes('AwsWafIntegration')) {
        logger.error(`[OTADiscoveryService] ⚠️ Booking.com Bot-Schutz aktiv (Fallback)!`);
        return [];
      }

      const $ = cheerio.load(response.data);
      const pageListings = this.extractBookingComListings($, roomType, city, country);
      listings.push(...pageListings);
      
      logger.warn(`[OTADiscoveryService] ✅ Booking.com Fallback abgeschlossen: ${listings.length} Listings gefunden`);
    } catch (error: any) {
      logger.error(`[OTADiscoveryService] ❌ Fehler beim Fallback-Scraping von Booking.com:`, error.message);
    }

    return listings;
  }

  /**
   * Scraped Hostelworld Suchseite (mit Puppeteer für JavaScript-Rendering)
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
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // Erstelle Suchstring: "Stadt, Land"
      const searchString = country 
        ? `${city}, ${country}` 
        : city;

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const fromDate = today.toISOString().split('T')[0];
      const toDate = tomorrow.toISOString().split('T')[0];
      const encodedSearch = encodeURIComponent(searchString);
      
      const url = `https://www.hostelworld.com/search?search_keywords=${encodedSearch}&date_from=${fromDate}&date_to=${toDate}&number_of_guests=1`;

      logger.warn(`[OTADiscoveryService] 📡 Starte Browser für Hostelworld: ${url}`);

      // Versuche Puppeteer zu starten
      try {
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
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
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

        // Navigiere zur Seite und warte auf JavaScript-Rendering
        logger.warn(`[OTADiscoveryService] 🌐 Navigiere zu Hostelworld...`);
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });

        // Warte auf Listings - verschiedene Strategien
        // 1. Warte auf Loading-Container zu verschwinden UND auf Listings zu erscheinen
        try {
          await page.waitForFunction(
            () => {
              const loadingContainer = document.querySelector('.search-loading-container');
              const hasListings = document.querySelectorAll('a[href*="/hostels/"]').length > 0;
              return (!loadingContainer || loadingContainer.style.display === 'none') && hasListings;
            },
            { timeout: 15000 }
          );
          logger.warn(`[OTADiscoveryService] ✅ Loading-Container verschwunden und Listings geladen`);
        } catch (e) {
          logger.warn(`[OTADiscoveryService] ⚠️ Timeout beim Warten auf Loading-Container/Listings, warte zusätzlich...`);
          // Warte zusätzlich 5 Sekunden
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // 2. Warte explizit auf tatsächliche Listings-Links
        const selectors = [
          'a[href*="/hostels/"]', // Direkte Links zu Hostels (PRIORITÄT)
          '.property-card a[href*="/hostels/"]',
          '.hostel-card a[href*="/hostels/"]',
          '[data-property-id] a[href*="/hostels/"]',
          'article a[href*="/hostels/"]',
          '[class*="property-card"] a[href*="/hostels/"]'
        ];

        let listingsFound = false;
        for (const selector of selectors) {
          try {
            await page.waitForSelector(selector, { timeout: 5000 });
            const count = await page.$$eval(selector, elements => elements.length);
            if (count > 0) {
              listingsFound = true;
              logger.warn(`[OTADiscoveryService] ✅ Hostelworld Selektor "${selector}" gefunden: ${count} Links`);
              break;
            }
          } catch (e) {
            // Selektor nicht gefunden, versuche nächsten
          }
        }

        if (!listingsFound) {
          // Warte zusätzlich 5 Sekunden für JavaScript-Execution
          logger.warn(`[OTADiscoveryService] ⚠️ Keine Listings-Selektoren gefunden, warte 5 Sekunden auf JavaScript...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Prüfe nochmal, ob jetzt Links vorhanden sind
          const linkCount = await page.$$eval('a[href*="/hostels/"]', elements => elements.length);
          logger.warn(`[OTADiscoveryService] 🔍 Nach Wartezeit: ${linkCount} Hostel-Links gefunden`);
        }

        // Extrahiere HTML nach JavaScript-Rendering
        const html = await page.content();
        const $ = cheerio.load(html);
        
        logger.warn(`[OTADiscoveryService] 📄 HTML-Response erhalten: ${html.length} Zeichen`);
        
        // Extrahiere Listings
        const pageListings = this.extractHostelworldListings($, roomType, city, country);
        listings.push(...pageListings);
        
        logger.warn(`[OTADiscoveryService] ✅ Hostelworld Discovery abgeschlossen: ${listings.length} Listings gefunden`);

      } catch (puppeteerError: any) {
        logger.error(`[OTADiscoveryService] ⚠️ Puppeteer kann nicht gestartet werden: ${puppeteerError.message}`);
        logger.warn(`[OTADiscoveryService] 🔄 Fallback auf axios (ohne JavaScript-Rendering)`);
        // Fallback auf axios
        return await this.scrapeHostelworldSearchFallback(city, country, roomType);
      }

    } catch (error: any) {
      logger.error(`[OTADiscoveryService] ❌ Fehler beim Scraping von Hostelworld:`, error.message);
      // Versuche Fallback
      return await this.scrapeHostelworldSearchFallback(city, country, roomType);
    } finally {
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
   * Fallback: Scraped Hostelworld mit axios (wenn Puppeteer nicht verfügbar)
   * Versucht JSON-Daten im HTML zu finden
   */
  private static async scrapeHostelworldSearchFallback(
    city: string,
    country: string | null,
    roomType: 'private' | 'dorm'
  ): Promise<DiscoveredListing[]> {
    logger.warn(`[OTADiscoveryService] 🔍 Scrape Hostelworld (Fallback axios) für ${city}, ${country || 'N/A'}, ${roomType}`);
    
    const listings: DiscoveredListing[] = [];
    
    try {
      const searchString = country ? `${city}, ${country}` : city;
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const fromDate = today.toISOString().split('T')[0];
      const toDate = tomorrow.toISOString().split('T')[0];
      const encodedSearch = encodeURIComponent(searchString);
      
      const url = `https://www.hostelworld.com/search?search_keywords=${encodedSearch}&date_from=${fromDate}&date_to=${toDate}&number_of_guests=1`;

      logger.warn(`[OTADiscoveryService] 📡 Request zu Hostelworld (Fallback): ${url}`);

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
        validateStatus: (status) => status < 500
      });

      const $ = cheerio.load(response.data);
      
      // Versuche JSON-Daten in <script> Tags zu finden
      const scripts = $('script').toArray();
      for (const script of scripts) {
        const scriptContent = $(script).html() || '';
        // Suche nach JSON-Daten mit Property-Informationen
        if (scriptContent.includes('properties') || scriptContent.includes('hostels') || scriptContent.includes('listings')) {
          try {
            // Versuche JSON zu extrahieren
            const jsonMatch = scriptContent.match(/\{[\s\S]*"properties"[\s\S]*\}/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              logger.warn(`[OTADiscoveryService] ✅ JSON-Daten in Script-Tag gefunden`);
              // TODO: Parse JSON-Daten zu Listings
            }
          } catch (e) {
            // JSON-Parsing fehlgeschlagen, ignoriere
          }
        }
      }
      
      // Versuche trotzdem mit Cheerio zu extrahieren (falls doch etwas da ist)
      const pageListings = this.extractHostelworldListings($, roomType, city, country);
      listings.push(...pageListings);
      
      logger.warn(`[OTADiscoveryService] ✅ Hostelworld Fallback abgeschlossen: ${listings.length} Listings gefunden`);
    } catch (error: any) {
      logger.error(`[OTADiscoveryService] ❌ Fehler beim Fallback-Scraping von Hostelworld:`, error.message);
    }

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

    // PRIORITÄT 1: Suche direkt nach Links zu Hostels (schnellste Methode)
    const hostelLinks = $('a[href*="/hostels/"]');
    if (hostelLinks.length > 0) {
      logger.warn(`[OTADiscoveryService] ✅ Hostelworld: ${hostelLinks.length} direkte Hostel-Links gefunden`);
      
      const seenUrls = new Set<string>();
      
      hostelLinks.each((index, element) => {
        try {
          const $link = $(element);
          const relativeUrl = $link.attr('href');
          
          if (!relativeUrl || !relativeUrl.includes('/hostels/')) {
            return;
          }
          
          const listingUrl = relativeUrl.startsWith('http') 
            ? relativeUrl 
            : `https://www.hostelworld.com${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`;
          
          // Vermeide Duplikate
          if (seenUrls.has(listingUrl)) {
            return;
          }
          seenUrls.add(listingUrl);
          
          // Extrahiere Property-ID aus URL
          const match = listingUrl.match(/\/hostels\/[^\/]+-(\d+)/);
          const propertyId = match && match[1] ? match[1] : `hostel-${seenUrls.size}`;
          
          // Versuche Zimmernamen aus Link-Text oder umgebenden Elementen zu extrahieren
          let roomName = $link.text().trim() || null;
          if (!roomName || roomName.length < 3) {
            // Suche in umgebenden Elementen
            const parent = $link.closest('.property-card, .hostel-card, article, [class*="property"], [class*="hostel"]');
            roomName = parent.find('h2, h3, .property-name, .hostel-name, .title').first().text().trim() || null;
          }
          
          listings.push({
            platform: 'hostelworld.com',
            listingId: propertyId,
            listingUrl,
            city,
            country,
            roomType, // Wird später beim Scraping der Detailseite genauer bestimmt
            roomName: roomName || (roomType === 'dorm' ? 'Dorm Bed' : 'Private Room')
          });
          
          logger.warn(`[OTADiscoveryService] ✅ Hostelworld Listing ${listings.length}: ID=${propertyId}, URL=${listingUrl.substring(0, 80)}...`);
        } catch (error: any) {
          logger.warn(`[OTADiscoveryService] ⚠️ Fehler beim Verarbeiten von Link ${index}: ${error.message}`);
        }
      });
      
      if (listings.length > 0) {
        logger.warn(`[OTADiscoveryService] ✅ Hostelworld: ${listings.length} Listings aus direkten Links extrahiert`);
        return listings;
      }
    }

    // PRIORITÄT 2: Suche nach Container-Elementen (Fallback)
    const testSelectors = [
      '.property-card',
      '.hostel-card',
      '[data-property-id]',
      '.pwa-property-card',
      '[class*="property-card"]',
      '[class*="hostel-card"]',
      '.property',
      '.hostel',
      '[class*="property"]',
      '[class*="hostel"]',
      'article',
      '[data-testid*="property"]',
      '[data-testid*="hostel"]'
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
        
        // DEBUG: Log HTML-Struktur des Elements
        const elementHtml = $el.html() || '';
        if (index < 2) {
          logger.warn(`[OTADiscoveryService] 🔍 Hostelworld Element ${index} HTML (erste 500 Zeichen): ${elementHtml.substring(0, 500)}`);
        }
        
        // Extrahiere URL - versuche verschiedene Selektoren
        let linkElement = $el.find('a[href*="/hostels/"]').first();
        if (linkElement.length === 0) {
          // Versuche andere Selektoren
          linkElement = $el.find('a[href*="hostel"]').first();
        }
        if (linkElement.length === 0) {
          // Versuche direkt im Element
          linkElement = $el.is('a') ? $el : $el.find('a').first();
        }
        
        let relativeUrl = linkElement.attr('href');
        
        // Falls kein href, versuche data-href oder andere Attribute
        if (!relativeUrl) {
          relativeUrl = linkElement.attr('data-href') || 
                       $el.attr('data-href') ||
                       $el.attr('href');
        }
        
        const listingUrl = relativeUrl 
          ? (relativeUrl.startsWith('http') ? relativeUrl : `https://www.hostelworld.com${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`)
          : null;

        if (!listingUrl) {
          logger.warn(`[OTADiscoveryService] ⚠️ Hostelworld: Keine URL gefunden für Element ${index}`);
          logger.warn(`[OTADiscoveryService] 🔍 Element hat ${$el.find('a').length} Links gefunden`);
          if ($el.find('a').length > 0) {
            $el.find('a').each((i, a) => {
              const href = $(a).attr('href');
              logger.warn(`[OTADiscoveryService] 🔍 Link ${i}: ${href}`);
            });
          }
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

