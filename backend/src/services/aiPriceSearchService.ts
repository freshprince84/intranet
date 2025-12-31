import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import axios from 'axios';
import { prisma } from '../utils/prisma';

/**
 * Service für KI-basierte Preissuche und Competitor-Discovery
 * 
 * Verwendet OpenAI GPT-4o um:
 * 1. Direkte Konkurrenten basierend auf Branch/Organization-Informationen zu identifizieren
 * 2. Preise für Competitors zu finden
 */
export class AIPriceSearchService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly DEFAULT_MODEL = 'gpt-4o';
  private static readonly DEFAULT_TEMPERATURE = 0.3; // Niedrig für strukturierte Daten
  private static readonly DEFAULT_MAX_TOKENS = 2000;
  
  // Rate-Limiting: Max 1 Request pro Sekunde
  private static readonly RATE_LIMIT_DELAY_MS = 1000;
  private static lastRequestTime: number = 0;
  
  // Retry-Konfiguration für 429-Fehler
  private static readonly MAX_RETRIES = 3;
  private static readonly INITIAL_RETRY_DELAY_MS = 2000; // 2 Sekunden
  private static readonly MAX_RETRY_DELAY_MS = 60000; // 60 Sekunden

  /**
   * 🔍 KI-basierte Competitor-Discovery
   * Identifiziert direkte Konkurrenten basierend auf Branch- und Organization-Informationen
   * 
   * @param branchId - Branch-ID
   * @param roomType - Zimmertyp ('private' | 'dorm')
   * @param maxCompetitors - Maximale Anzahl Competitors (Standard: 10)
   * @returns Array von Competitor-Objekten
   */
  static async discoverCompetitors(
    branchId: number,
    roomType: 'private' | 'dorm',
    maxCompetitors: number = 10
  ): Promise<CompetitorDiscoveryResult[]> {
    try {
      logger.info(`[AIPriceSearchService] Starte Competitor-Discovery für Branch ${branchId}, RoomType: ${roomType}`);

      // 1. Lade Branch und Organization-Informationen
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          name: true,
          address: true,
          city: true,
          country: true,
          organization: {
            select: {
              name: true,
              displayName: true,
              country: true
            }
          }
        }
      });

      if (!branch) {
        logger.error(`[AIPriceSearchService] Branch ${branchId} nicht gefunden`);
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      if (!branch.city) {
        logger.error(`[AIPriceSearchService] Branch ${branchId} hat keine Stadt-Information`);
        throw new Error(`Branch ${branchId} hat keine Stadt-Information`);
      }

      logger.debug(`[AIPriceSearchService] Branch-Daten geladen:`, {
        name: branch.name,
        city: branch.city,
        country: branch.country,
        organization: branch.organization?.name || branch.organization?.displayName
      });

      // 2. Erstelle KI-Prompt
      const prompt = this.createCompetitorDiscoveryPrompt(
        branch.organization?.name || branch.organization?.displayName || 'Unbekannt',
        branch.organization?.country || null,
        branch.name,
        branch.city,
        branch.address,
        branch.country,
        roomType,
        maxCompetitors
      );

      logger.debug(`[AIPriceSearchService] Prompt erstellt (${prompt.length} Zeichen)`);

      // 3. Rufe OpenAI API auf
      let competitors: string;
      try {
        competitors = await this.callOpenAI(prompt, 'competitor-discovery');
        logger.debug(`[AIPriceSearchService] OpenAI Response erhalten (${competitors.length} Zeichen)`);
      } catch (openAIError: any) {
        logger.error(`[AIPriceSearchService] OpenAI API Fehler:`, {
          message: openAIError?.message,
          status: openAIError?.response?.status,
          statusText: openAIError?.response?.statusText,
          data: openAIError?.response?.data
        });
        
        // Spezifische Fehlermeldungen für verschiedene OpenAI-Fehler
        if (openAIError?.response?.status === 401) {
          throw new Error('OpenAI API Key ungültig (401 Unauthorized)');
        } else if (openAIError?.response?.status === 429) {
          throw new Error('OpenAI API Rate Limit erreicht (429 Too Many Requests)');
        } else if (openAIError?.code === 'ECONNABORTED' || openAIError?.message?.includes('timeout')) {
          throw new Error('OpenAI API Timeout - Bitte später erneut versuchen');
        } else if (openAIError?.response?.status) {
          throw new Error(`OpenAI API Fehler (${openAIError.response.status}): ${openAIError.response.statusText}`);
        } else {
          throw new Error(`OpenAI API Fehler: ${openAIError?.message || 'Unbekannter Fehler'}`);
        }
      }

      // 4. Validiere und parse Response
      let parsedCompetitors: CompetitorDiscoveryResult[];
      try {
        parsedCompetitors = this.parseCompetitorDiscoveryResponse(competitors);
        logger.info(`[AIPriceSearchService] Competitor-Discovery abgeschlossen: ${parsedCompetitors.length} Competitors gefunden`);
      } catch (parseError) {
        logger.error(`[AIPriceSearchService] Fehler beim Parsen der OpenAI Response:`, parseError);
        logger.error(`[AIPriceSearchService] Response war:`, competitors);
        throw new Error(`Fehler beim Parsen der OpenAI Response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      return parsedCompetitors;
    } catch (error) {
      logger.error('[AIPriceSearchService] Fehler bei Competitor-Discovery:', error);
      throw error;
    }
  }

  /**
   * Erstellt KI-Prompt für Competitor-Discovery
   */
  private static createCompetitorDiscoveryPrompt(
    organizationName: string,
    organizationCountry: string | null,
    branchName: string,
    branchCity: string | null,
    branchAddress: string | null,
    branchCountry: string | null,
    roomType: 'private' | 'dorm',
    maxCompetitors: number
  ): string {
    const roomTypeText = roomType === 'private' ? 'Privatzimmer' : 'Schlafsaal';
    
    return `Du bist ein Experte für die Hostel-Industrie in Kolumbien und kennst alle wichtigen Hostels in den verschiedenen Städten.

Aufgabe: Identifiziere die ${maxCompetitors} wichtigsten direkten Konkurrenten eines Hostels.

Hostel-Informationen:
- Organisation: ${organizationName}
- Branch/Standort: ${branchName}
- Stadt: ${branchCity || 'Unbekannt'}
- Adresse: ${branchAddress || 'Nicht angegeben'}
- Land: ${branchCountry || organizationCountry || 'Kolumbien'}
- Zimmertyp: ${roomTypeText}

Bitte identifiziere die ${maxCompetitors} wichtigsten direkten Konkurrenten für dieses Hostel in dieser Stadt.
Berücksichtige dabei:
- Ähnliche Zielgruppe
- Ähnliche Lage (gleiche Stadt, ähnliche Nachbarschaft)
- Ähnliche Ausstattung und Preisniveau
- Bekannte Hostel-Ketten und unabhängige Hostels

Antworte NUR mit einem JSON-Array im folgenden Format:
[
  {
    "name": "Los Patios Hostel",
    "searchName": "Los Patios Medellín",
    "bookingComUrl": "https://www.booking.com/hotel/co/los-patios.html",
    "hostelworldUrl": "https://www.hostelworld.com/hosteldetails.php/Los-Patios/Medellin/12345",
    "reasoning": "Direkter Konkurrent in derselben Nachbarschaft, ähnliche Zielgruppe",
    "confidence": 0.95
  },
  {
    "name": "Selina Medellín",
    "searchName": "Selina Medellín Hostel",
    "bookingComUrl": "https://www.booking.com/hotel/co/selina-medellin.html",
    "reasoning": "Bekannte Hostel-Kette, ähnliches Preisniveau",
    "confidence": 0.85
  }
]

WICHTIG:
- Antworte NUR mit dem JSON-Array, keine zusätzlichen Erklärungen
- Falls keine Konkurrenten gefunden werden können, antworte mit: []
- bookingComUrl und hostelworldUrl sind optional, können null sein
- confidence ist ein Wert zwischen 0 und 1`;
  }

  /**
   * Sucht Preise für eine Konkurrenzgruppe mit KI
   * 
   * @param competitorGroupId - ID der Konkurrenzgruppe
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @param roomType - Zimmertyp ('private' | 'dorm')
   * @returns Anzahl gefundener Preise
   */
  static async searchPrices(
    competitorGroupId: number,
    startDate: Date,
    endDate: Date,
    roomType: 'private' | 'dorm'
  ): Promise<number> {
    try {
      logger.info(`[AIPriceSearchService] Starte Preissuche für CompetitorGroup ${competitorGroupId}`);

      // 1. Lade CompetitorGroup mit Competitors
      const competitorGroup = await prisma.competitorGroup.findUnique({
        where: { id: competitorGroupId },
        include: {
          competitors: {
            where: { isActive: true }
          }
        }
      });

      if (!competitorGroup) {
        throw new Error(`CompetitorGroup ${competitorGroupId} nicht gefunden`);
      }

      if (competitorGroup.competitors.length === 0) {
        logger.warn(`[AIPriceSearchService] Keine aktiven Competitors in Gruppe ${competitorGroupId}`);
        return 0;
      }

      // 2. Iteriere über alle Competitors und suche Preise
      let pricesFound = 0;
      const dates = this.getDateRange(startDate, endDate);

      for (const competitor of competitorGroup.competitors) {
        for (const date of dates) {
          try {
            const price = await this.findPriceWithAI(
              competitor.id,
              competitor.name,
              competitorGroup.city,
              date,
              roomType
            );

            if (price !== null) {
              // Speichere Preis in OTAPriceData
              await this.savePriceData(competitor, competitorGroup, date, price, roomType);
              pricesFound++;

              // Update Competitor
              await prisma.competitor.update({
                where: { id: competitor.id },
                data: {
                  lastSearchedAt: new Date(),
                  lastPriceFoundAt: new Date()
                }
              });
            } else {
              // Update nur lastSearchedAt
              await prisma.competitor.update({
                where: { id: competitor.id },
                data: {
                  lastSearchedAt: new Date()
                }
              });
            }
          } catch (error) {
            logger.error(`[AIPriceSearchService] Fehler beim Suchen von Preis für Competitor ${competitor.id}, Datum ${date.toISOString()}:`, error);
          }
        }
      }

      logger.info(`[AIPriceSearchService] Preissuche abgeschlossen: ${pricesFound} Preise gefunden`);

      return pricesFound;
    } catch (error) {
      logger.error('[AIPriceSearchService] Fehler bei Preissuche:', error);
      throw error;
    }
  }

  /**
   * Verwendet KI, um Preise für ein einzelnes Hostel zu finden
   */
  private static async findPriceWithAI(
    competitorId: number,
    hostelName: string,
    city: string,
    date: Date,
    roomType: 'private' | 'dorm'
  ): Promise<number | null> {
    try {
      const prompt = this.createPriceSearchPrompt(hostelName, city, date, roomType);
      const response = await this.callOpenAI(prompt, 'price-search');
      const priceData = this.parsePriceSearchResponse(response);

      return priceData.price;
    } catch (error) {
      logger.error(`[AIPriceSearchService] Fehler beim Finden von Preis für ${hostelName}:`, error);
      return null;
    }
  }

  /**
   * Erstellt KI-Prompt für Preissuche
   */
  private static createPriceSearchPrompt(
    hostelName: string,
    city: string,
    date: Date,
    roomType: 'private' | 'dorm'
  ): string {
    const roomTypeText = roomType === 'private' ? 'Privatzimmer' : 'Schlafsaal';
    const dateStr = date.toISOString().split('T')[0];

    return `Du bist ein Experte für Hostel-Preise in Kolumbien. 

Aufgabe: Finde den aktuellen Preis für ein Hostel.

Hostel-Name: ${hostelName}
Stadt: ${city}
Datum: ${dateStr}
Zimmertyp: ${roomTypeText}

Bitte suche auf Booking.com, Hostelworld oder anderen OTA-Plattformen nach dem Preis für dieses Hostel an diesem Datum.

Antworte NUR mit einem JSON-Objekt im folgenden Format:
{
  "price": 35000,
  "currency": "COP",
  "platform": "booking.com",
  "url": "https://...",
  "available": true,
  "roomName": "Private Room"
}

Falls kein Preis gefunden werden kann, antworte mit:
{
  "price": null,
  "error": "Preis nicht gefunden"
}

WICHTIG:
- Antworte NUR mit dem JSON-Objekt, keine zusätzlichen Erklärungen
- price ist in COP (Kolumbianische Pesos)
- Falls kein Preis gefunden, setze price auf null`;
  }

  /**
   * Rate-Limiting: Wartet bis genug Zeit seit dem letzten Request vergangen ist
   */
  private static async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY_MS) {
      const waitTime = this.RATE_LIMIT_DELAY_MS - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Berechnet Retry-Delay mit Exponential Backoff
   */
  private static calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Zufällige Variation (0-1 Sekunde)
    return Math.min(exponentialDelay + jitter, this.MAX_RETRY_DELAY_MS);
  }

  /**
   * Ruft OpenAI API auf mit Rate-Limiting und Retry-Logik
   */
  private static async callOpenAI(prompt: string, context: string): Promise<string> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      logger.error('[AIPriceSearchService] OPENAI_API_KEY nicht gesetzt in Umgebungsvariablen');
      throw new Error('OPENAI_API_KEY nicht gesetzt');
    }

    // Prüfe ob Key gültig aussieht (beginnt mit sk-)
    if (!OPENAI_API_KEY.startsWith('sk-')) {
      logger.warn('[AIPriceSearchService] OPENAI_API_KEY sieht ungültig aus (sollte mit "sk-" beginnen)');
    }

    logger.debug(`[AIPriceSearchService] Rufe OpenAI API auf (${context}), Model: ${this.DEFAULT_MODEL}, Attempt: 1/${this.MAX_RETRIES}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Rate-Limiting: Warte bis genug Zeit vergangen ist
        await this.waitForRateLimit();

        if (attempt > 1) {
          logger.info(`[AIPriceSearchService] Retry ${attempt}/${this.MAX_RETRIES} für ${context}`);
        }

        const response = await axios.post(
          this.OPENAI_API_URL,
          {
            model: this.DEFAULT_MODEL,
            messages: [
              {
                role: 'system',
                content: 'Du bist ein hilfreicher Assistent, der strukturierte JSON-Daten zurückgibt. Antworte NUR mit JSON, keine zusätzlichen Erklärungen.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: this.DEFAULT_TEMPERATURE,
            max_tokens: this.DEFAULT_MAX_TOKENS
            // Note: response_format nur bei gpt-4o und gpt-4-turbo verfügbar
            // Für bessere Kompatibilität lassen wir es weg und parsen manuell
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            timeout: 30000
          }
        );

        if (!response.data?.choices?.[0]?.message?.content) {
          logger.error(`[AIPriceSearchService] OpenAI Response hat unerwartetes Format:`, response.data);
          throw new Error('OpenAI API Response hat unerwartetes Format');
        }

        const content = response.data.choices[0].message.content;
        logger.debug(`[AIPriceSearchService] OpenAI Response (${context}) erhalten, Länge: ${content.length} Zeichen`);
        
        return content;
      } catch (error) {
        lastError = error as Error;
        
        // Logge detaillierte Fehlerinformationen
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          const statusText = error.response?.statusText;
          const data = error.response?.data;
          
          logger.error(`[AIPriceSearchService] OpenAI API Fehler (${context}), Attempt ${attempt}/${this.MAX_RETRIES}:`, {
            status,
            statusText,
            data,
            message: error.message
          });
        } else {
          logger.error(`[AIPriceSearchService] Fehler (${context}), Attempt ${attempt}/${this.MAX_RETRIES}:`, error);
        }

        // Prüfe ob es ein Rate-Limit-Fehler (429) ist
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after']
            ? parseInt(error.response.headers['retry-after']) * 1000
            : null;
          
          const delay = retryAfter || this.calculateRetryDelay(attempt);
          
          if (attempt < this.MAX_RETRIES) {
            logger.warn(
              `[AIPriceSearchService] Rate Limit erreicht (${context}), Retry ${attempt}/${this.MAX_RETRIES} nach ${Math.round(delay / 1000)}s`
            );
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          } else {
            logger.error(
              `[AIPriceSearchService] Rate Limit erreicht (${context}), alle Retries fehlgeschlagen`
            );
            throw new Error(`OpenAI API Rate Limit erreicht nach ${this.MAX_RETRIES} Versuchen`);
          }
        }

        // Für andere Fehler: Loggen und werfen (kein Retry)
        logger.error(`[AIPriceSearchService] OpenAI API Fehler (${context}):`, error);
        if (axios.isAxiosError(error)) {
          logger.error(`[AIPriceSearchService] Status:`, error.response?.status);
          logger.error(`[AIPriceSearchService] Data:`, error.response?.data);
        }
        throw error;
      }
    }

    // Sollte nie erreicht werden, aber TypeScript braucht es
    throw lastError || new Error('OpenAI API Aufruf fehlgeschlagen');
  }

  /**
   * Parst Competitor-Discovery Response
   */
  private static parseCompetitorDiscoveryResponse(response: string): CompetitorDiscoveryResult[] {
    try {
      // Entferne Markdown-Code-Blöcke (```json ... ``` oder ``` ... ```)
      let cleanedResponse = response.trim();
      
      // Entferne ```json am Anfang
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '');
      }
      
      // Entferne ``` am Ende
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/\s*```$/, '');
      }
      
      // Trimme nochmal nach Entfernen der Code-Blöcke
      cleanedResponse = cleanedResponse.trim();
      
      // Versuche JSON zu parsen
      const parsed = JSON.parse(cleanedResponse);
      
      // Falls es ein Array ist, direkt zurückgeben
      if (Array.isArray(parsed)) {
        return parsed;
      }
      
      // Falls es ein Objekt mit einem Array-Feld ist
      if (parsed.competitors && Array.isArray(parsed.competitors)) {
        return parsed.competitors;
      }
      
      // Falls es ein Objekt mit einem data-Feld ist
      if (parsed.data && Array.isArray(parsed.data)) {
        return parsed.data;
      }
      
      logger.warn('[AIPriceSearchService] Unerwartetes Response-Format:', parsed);
      return [];
    } catch (error) {
      logger.error('[AIPriceSearchService] Fehler beim Parsen der Competitor-Discovery Response:', error);
      logger.error('[AIPriceSearchService] Response (erste 500 Zeichen):', response.substring(0, 500));
      throw error; // Werfe Fehler weiter, damit Controller ihn behandeln kann
    }
  }

  /**
   * Parst Price-Search Response
   */
  private static parsePriceSearchResponse(response: string): PriceSearchResult {
    try {
      // Entferne mögliche Markdown-Code-Blöcke
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanedResponse);
      
      return {
        price: parsed.price ? Number(parsed.price) : null,
        currency: parsed.currency || 'COP',
        platform: parsed.platform || null,
        url: parsed.url || null,
        available: parsed.available !== false,
        roomName: parsed.roomName || null,
        error: parsed.error || null
      };
    } catch (error) {
      logger.error('[AIPriceSearchService] Fehler beim Parsen der Price-Search Response:', error);
      logger.error('[AIPriceSearchService] Response:', response);
      return {
        price: null,
        currency: 'COP',
        platform: null,
        url: null,
        available: false,
        roomName: null,
        error: 'Parse-Fehler'
      };
    }
  }

  /**
   * Speichert Preisdaten in OTAPriceData
   */
  private static async savePriceData(
    competitor: any,
    competitorGroup: any,
    date: Date,
    price: number,
    roomType: 'private' | 'dorm'
  ): Promise<void> {
    try {
      // Prüfe ob bereits ein OTAListing existiert
      let otaListing = competitor.otaListingId
        ? await prisma.oTAListing.findUnique({ where: { id: competitor.otaListingId } })
        : null;

      // Falls kein Listing existiert, erstelle eines
      if (!otaListing) {
        otaListing = await prisma.oTAListing.create({
          data: {
            platform: 'ai_search',
            listingId: `competitor-${competitor.id}`,
            listingUrl: competitor.bookingComUrl || competitor.hostelworldUrl || null,
            city: competitorGroup.city,
            country: competitorGroup.country || null,
            roomType: roomType,
            roomName: competitor.name,
            branchId: competitorGroup.branchId,
            isActive: true
          }
        });

        // Update Competitor mit otaListingId
        await prisma.competitor.update({
          where: { id: competitor.id },
          data: { otaListingId: otaListing.id }
        });
      }

      // Speichere Preisdaten
      await prisma.oTAPriceData.upsert({
        where: {
          listingId_date: {
            listingId: otaListing.id,
            date: date
          }
        },
        create: {
          listingId: otaListing.id,
          date: date,
          price: price,
          currency: 'COP',
          available: true,
          source: 'ai_search',
          scrapedAt: new Date()
        },
        update: {
          price: price,
          scrapedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('[AIPriceSearchService] Fehler beim Speichern von Preisdaten:', error);
      throw error;
    }
  }

  /**
   * Generiert Datums-Array für einen Zeitraum
   */
  private static getDateRange(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }
}

// Type Definitions
export interface CompetitorDiscoveryResult {
  name: string;              // Hostel-Name (z.B. "Los Patios Hostel")
  searchName?: string;       // Alternative Suchbegriffe
  bookingComUrl?: string;    // Booking.com URL (falls gefunden)
  hostelworldUrl?: string;   // Hostelworld URL (falls gefunden)
  reasoning?: string;        // Begründung, warum dieser Competitor relevant ist
  confidence?: number;       // Konfidenz-Score (0-1)
}

interface PriceSearchResult {
  price: number | null;
  currency: string;
  platform: string | null;
  url: string | null;
  available: boolean;
  roomName: string | null;
  error: string | null;
}

