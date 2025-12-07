import { Reservation, ReservationStatus, PaymentStatus } from '@prisma/client';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../utils/encryption';
import { TaskAutomationService } from './taskAutomationService';
import { prisma } from '../utils/prisma';

/**
 * Findet Branch-ID über LobbyPMS property_id UND apiKey
 * WICHTIG: Da mehrere Branches die gleiche propertyId haben können, muss auch der apiKey geprüft werden!
 * @param propertyId - LobbyPMS Property ID
 * @param apiKey - LobbyPMS API Key (optional, aber empfohlen für eindeutige Zuordnung)
 * @param organizationId - Organisation ID (optional, für bessere Performance)
 * @returns Branch-ID oder null
 */
export async function findBranchByPropertyId(
  propertyId: string, 
  apiKey?: string,
  organizationId?: number
): Promise<number | null> {
  const branches = await prisma.branch.findMany({
    where: organizationId ? { organizationId } : undefined,
    select: { id: true, lobbyPmsSettings: true }
  });

  // Wenn apiKey vorhanden, prüfe auch diesen für eindeutige Zuordnung
  if (apiKey) {
    for (const branch of branches) {
      if (branch.lobbyPmsSettings) {
        try {
          const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
          const lobbyPmsSettings = settings?.lobbyPms || settings;
          const propertyIdMatch = lobbyPmsSettings?.propertyId === propertyId || String(lobbyPmsSettings?.propertyId) === String(propertyId);
          const apiKeyMatch = lobbyPmsSettings?.apiKey === apiKey;
          
          if (propertyIdMatch && apiKeyMatch) {
            return branch.id;
          }
        } catch (error) {
          // Ignoriere Entschlüsselungsfehler
        }
      }
    }
  }

  // Fallback: Nur propertyId prüfen (sollte jetzt eindeutig sein)
  for (const branch of branches) {
    if (branch.lobbyPmsSettings) {
      try {
        const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
        const lobbyPmsSettings = settings?.lobbyPms || settings;
        if (lobbyPmsSettings?.propertyId === propertyId || String(lobbyPmsSettings?.propertyId) === String(propertyId)) {
          return branch.id;
        }
      } catch (error) {
        // Ignoriere Entschlüsselungsfehler
      }
    }
  }

  return null;
}

/**
 * LobbyPMS API Response Types
 */
export interface LobbyPmsReservation {
  id: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  check_in_date: string; // ISO date string
  check_out_date: string; // ISO date string
  arrival_time?: string; // ISO datetime string
  room_number?: string;
  room_description?: string;
  status?: string; // 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
  payment_status?: string; // 'pending', 'paid', 'partially_paid', 'refunded'
  property_id?: string;
  // Weitere Felder können hier hinzugefügt werden
  [key: string]: any;
}

export interface LobbyPmsApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Service für LobbyPMS API-Integration
 * 
 * Bietet Funktionen zum Abrufen und Synchronisieren von Reservierungen
 */
export class LobbyPmsService {
  private apiUrl: string;
  private apiKey: string;
  private propertyId?: string;
  private organizationId?: number;
  private branchId?: number;
  private axiosInstance: AxiosInstance;

  /**
   * Erstellt eine neue LobbyPMS Service-Instanz
   * 
   * @param organizationId - ID der Organisation (optional, wenn branchId gesetzt)
   * @param branchId - ID des Branches (optional, wenn organizationId gesetzt)
   * @throws Error wenn weder organizationId noch branchId angegeben ist
   */
  constructor(organizationId?: number, branchId?: number) {
    if (!organizationId && !branchId) {
      throw new Error('Entweder organizationId oder branchId muss angegeben werden');
    }
    this.organizationId = organizationId;
    this.branchId = branchId;
    // Settings werden beim ersten API-Call geladen (lazy loading)
    this.axiosInstance = axios.create({
      baseURL: 'https://api.lobbypms.com', // Placeholder, wird in loadSettings überschrieben
      timeout: 30000
    });
  }

  /**
   * Lädt LobbyPMS Settings aus Branch oder Organisation (mit Fallback)
   * Muss vor jedem API-Call aufgerufen werden
   */
  private async loadSettings(): Promise<void> {
    // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
    if (this.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: this.branchId },
        select: { 
          lobbyPmsSettings: true, 
          organizationId: true 
        }
      });

      if (branch?.lobbyPmsSettings) {
        try {
          const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
          const lobbyPmsSettings = settings?.lobbyPms || settings;

          if (lobbyPmsSettings?.apiKey) {
            let apiUrl = lobbyPmsSettings.apiUrl || 'https://api.lobbypms.com';
            // Korrigiere app.lobbypms.com zu api.lobbypms.com
            if (apiUrl.includes('app.lobbypms.com')) {
              apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
            }
            // Stelle sicher, dass apiUrl NICHT mit /api endet (wird im Endpoint hinzugefügt)
            if (apiUrl.endsWith('/api')) {
              apiUrl = apiUrl.replace(/\/api$/, '');
            }
            this.apiUrl = apiUrl;
            this.apiKey = lobbyPmsSettings.apiKey;
            this.propertyId = lobbyPmsSettings.propertyId;
            this.axiosInstance = this.createAxiosInstance();
            // WICHTIG: Setze organizationId aus Branch (wird für syncReservation benötigt)
            if (branch.organizationId) {
              this.organizationId = branch.organizationId;
            }
            console.log(`[LobbyPMS] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
            return; // Erfolgreich geladen
          }
        } catch (error) {
          console.warn(`[LobbyPMS] Fehler beim Laden der Branch Settings:`, error);
          // Fallback auf Organization Settings
        }

        // Fallback: Lade Organization Settings
        if (branch.organizationId) {
          this.organizationId = branch.organizationId;
        }
      } else if (branch?.organizationId) {
        // Branch hat keine Settings, aber Organization ID
        this.organizationId = branch.organizationId;
      }
    }

    // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
    if (this.organizationId) {
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error(`LobbyPMS ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    const settings = decryptApiSettings(organization.settings as any);
    const lobbyPmsSettings = settings?.lobbyPms;

    if (!lobbyPmsSettings?.apiKey) {
      throw new Error(`LobbyPMS API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    if (!lobbyPmsSettings?.apiUrl) {
      throw new Error(`LobbyPMS API URL ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    let apiUrl = lobbyPmsSettings.apiUrl;
    if (!apiUrl) {
      apiUrl = 'https://api.lobbypms.com';
    }
    // Korrigiere app.lobbypms.com zu api.lobbypms.com
    if (apiUrl.includes('app.lobbypms.com')) {
      apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
    }
    // Stelle sicher, dass apiUrl NICHT mit /api endet (wird im Endpoint hinzugefügt)
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.replace(/\/api$/, '');
    }
    this.apiUrl = apiUrl;
    this.apiKey = lobbyPmsSettings.apiKey;
    this.propertyId = lobbyPmsSettings.propertyId;

    // Erstelle Axios-Instanz mit korrekten Settings
    this.axiosInstance = this.createAxiosInstance();
      return;
    }

    throw new Error('LobbyPMS Settings nicht gefunden (weder Branch noch Organization)');
  }

  /**
   * Statische Factory-Methode: Erstellt Service für Branch
   * 
   * @param branchId - ID des Branches
   * @returns LobbyPmsService-Instanz
   */
  static async createForBranch(branchId: number): Promise<LobbyPmsService> {
    // Hole organizationId direkt aus Branch (wie in Dokumentation beschrieben)
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { organizationId: true }
    });
    
    if (!branch?.organizationId) {
      throw new Error(`Branch ${branchId} hat keine organizationId`);
    }
    
    const service = new LobbyPmsService(branch.organizationId, branchId);
    await service.loadSettings();
    return service;
  }

  /**
   * Erstellt eine konfigurierte Axios-Instanz für LobbyPMS API-Requests
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000, // 30 Sekunden Timeout
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        // LobbyPMS API verwendet Bearer Token Authentifizierung
        // Alternative Methoden werden bei Bedarf unterstützt
      }
    });

    // Request Interceptor für Logging
    instance.interceptors.request.use(
      (config) => {
        console.log(`[LobbyPMS] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[LobbyPMS] Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor für Error Handling
    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[LobbyPMS] API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });
        return Promise.reject(error);
      }
    );

    return instance;
  }

  /**
   * Formatiert Datum als YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Prüft Zimmerverfügbarkeit für einen Zeitraum
   * 
   * @param startDate - Check-in Datum (inklusive)
   * @param endDate - Check-out Datum (inklusive)
   * @returns Array von verfügbaren Zimmern mit Preisen
   */
  async checkAvailability(startDate: Date, endDate: Date): Promise<Array<{
    categoryId: number;
    roomName: string;
    roomType: 'compartida' | 'privada';
    availableRooms: number;
    pricePerNight: number;
    currency: string;
    date: string;
    prices: Array<{ people: number; value: number }>;
  }>> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      // Parameter basierend auf Test-Ergebnissen
      // WICHTIG: start_date UND end_date sind ERFORDERLICH!
      const params: any = {
        start_date: this.formatDate(startDate), // Format: "YYYY-MM-DD"
        end_date: this.formatDate(endDate) // Format: "YYYY-MM-DD"
      };

      if (this.propertyId) {
        params.property_id = this.propertyId; // Optional
      }

      // WICHTIG: room_type Parameter wird ignoriert (aus Tests bekannt)
      // Stattdessen: Filtere nach category_id oder name

      const response = await this.axiosInstance.get<any>(
        '/api/v2/available-rooms',
        { params }
      );

      // Response-Struktur basierend auf Test-Ergebnissen
      // Struktur: { data: [{ date: "...", categories: [...] }] }
      const responseData = response.data.data || [];
      
      // Flache alle Kategorien für alle Daten
      const allCategories: Array<{
        categoryId: number;
        roomName: string;
        roomType: 'compartida' | 'privada';
        availableRooms: number;
        pricePerNight: number;
        currency: string;
        date: string;
        prices: Array<{ people: number; value: number }>;
      }> = [];
      
      for (const dateEntry of responseData) {
        const date = dateEntry.date;
        const categories = dateEntry.categories || [];
        
        // Debug: Logge alle Kategorien für diesen Tag
        console.log(`[LobbyPMS] Datum ${date}: ${categories.length} Kategorien gefunden`);
        for (const cat of categories) {
          console.log(`[LobbyPMS]   - ${cat.category_id}: ${cat.name}, available_rooms: ${cat.available_rooms || 0}`);
        }
        
        for (const category of categories) {
          // Hole Preis für 1 Person (Standard)
          const priceForOnePerson = category.plans?.[0]?.prices?.find((p: any) => p.people === 1);
          const price = priceForOnePerson?.value || 0;
          
          // Bestimme room_type aus Namen oder category_id
          // Heuristik: Namen mit "Dorm", "Compartida" = compartida, sonst privada
          const name = category.name?.toLowerCase() || '';
          let roomType: 'compartida' | 'privada' = 'privada';
          // Compartida: category_id 34280 (El primo aventurero), 34281 (La tia artista), 34282 (El abuelo viajero)
          if (name.includes('dorm') || name.includes('compartida') || 
              category.category_id === 34280 || category.category_id === 34281 || category.category_id === 34282) {
            roomType = 'compartida';
          }
          
          // WICHTIG: Füge ALLE Kategorien hinzu, auch wenn available_rooms = 0 (für Debugging)
          allCategories.push({
            categoryId: category.category_id,
            roomName: category.name,
            roomType: roomType,
            availableRooms: category.available_rooms || 0,
            pricePerNight: price,
            currency: 'COP', // Standard aus Tests
            date: date,
            prices: category.plans?.[0]?.prices || [] // Alle Preise (verschiedene Personenanzahl)
          });
          
          // Debug: Spezifisch für "apartamento doble" und "primo deportista"
          if (name.includes('apartamento doble') || name.includes('primo deportista')) {
            console.log(`[LobbyPMS] ⚠️ Apartamento doble / Primo deportista: category_id=${category.category_id}, name=${category.name}, roomType=${roomType}, available_rooms=${category.available_rooms || 0}, date=${date}`);
          }
        }
      }
      
      return allCategories;
    } catch (error) {
      // Fehlerbehandlung basierend auf Test-Ergebnissen
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        throw new Error(
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          `LobbyPMS API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Ruft alle Reservierungen für einen Zeitraum ab
   * 
   * @param startDate - Startdatum (inklusive)
   * @param endDate - Enddatum (inklusive)
   * @returns Array von Reservierungen
   */
  async fetchReservations(startDate: Date, endDate: Date): Promise<LobbyPmsReservation[]> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      // PROBLEM: creation_date_from Filter funktioniert nicht korrekt in der API
      // Die API gibt nicht alle Reservierungen zurück, die nach creation_date_from erstellt wurden
      // LÖSUNG: Hole alle Reservierungen mit Pagination OHNE creation_date_from Filter und filtere client-seitig
      const params: any = {
        per_page: 100, // Maximal 100 pro Seite
      };

      if (this.propertyId) {
        params.property_id = this.propertyId;
      }

      // OPTIMIERUNG: Hole Seiten mit Pagination und stoppe früher wenn keine neuen Reservierungen mehr kommen
      // Da die API keine Filter-Parameter unterstützt, filtern wir inline und stoppen nach X Seiten ohne neue Reservierungen
      let allReservations: LobbyPmsReservation[] = [];
      let page = 1;
      let hasMore = true;
      const maxPages = 5; // ✅ MEMORY: Reduziert von 200 auf 5 (für regelmäßigen Sync reichen max. 5 Seiten)
      let knownTotalPages: number | undefined = undefined; // Speichere totalPages aus erster Response
      let consecutiveOldPages = 0; // Zähler für aufeinanderfolgende "alte" Seiten
      const MAX_CONSECUTIVE_OLD_PAGES = 1; // ✅ MEMORY: Reduziert von 3 auf 1 (API ist nach creation_date DESC sortiert, 1 Seite reicht)

      while (hasMore && page <= maxPages) {
        const response = await this.axiosInstance.get<any>('/api/v1/bookings', {
          params: { ...params, page },
          validateStatus: (status) => status < 500 // Akzeptiere 4xx als gültige Antwort
        });

        // Prüfe ob Response HTML ist (404-Seite)
        const responseData = response.data;
        if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
          throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
        }

        // LobbyPMS gibt { data: [...], meta: {...} } zurück
        let pageReservations: LobbyPmsReservation[] = [];
        if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
          pageReservations = responseData.data;
        } else if (Array.isArray(responseData)) {
          pageReservations = responseData;
        } else if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
          pageReservations = responseData.data;
        } else {
          // Debug: Zeige Response-Struktur (nur wenn nicht HTML)
          if (typeof responseData !== 'string') {
            console.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(responseData, null, 2));
          }
          throw new Error(
            (responseData && typeof responseData === 'object' && responseData.error) ||
            (responseData && typeof responseData === 'object' && responseData.message) ||
            'Unbekannter Fehler beim Abrufen der Reservierungen'
          );
        }

        // OPTIMIERUNG: Filtere sofort nach creation_date (statt erst am Ende)
        const recentReservations = pageReservations.filter((reservation: LobbyPmsReservation) => {
          if (!reservation.creation_date) {
            return false;
          }
          const creationDate = new Date(reservation.creation_date);
          const afterStartDate = creationDate >= startDate;
          const beforeEndDate = !endDate || creationDate <= endDate;
          return afterStartDate && beforeEndDate;
        });

        // Prüfe ob neue Reservierungen gefunden wurden
        if (recentReservations.length > 0) {
          // Neue Reservierungen gefunden - füge hinzu
          allReservations = allReservations.concat(recentReservations);
          consecutiveOldPages = 0; // Reset Counter
          console.log(`[LobbyPMS] Seite ${page}: ${recentReservations.length} neue Reservierungen (von ${pageReservations.length} insgesamt)`);
        } else {
          // Keine neuen Reservierungen auf dieser Seite
          consecutiveOldPages++;
          console.log(`[LobbyPMS] Seite ${page}: 0 neue Reservierungen (${consecutiveOldPages}/${MAX_CONSECUTIVE_OLD_PAGES} aufeinanderfolgende "alte" Seiten)`);
          
          // OPTIMIERUNG: Stoppe nach X Seiten ohne neue Reservierungen
          if (consecutiveOldPages >= MAX_CONSECUTIVE_OLD_PAGES) {
            console.log(`[LobbyPMS] Stoppe Pagination: ${MAX_CONSECUTIVE_OLD_PAGES} aufeinanderfolgende Seiten ohne neue Reservierungen`);
            hasMore = false;
            break;
          }
        }

        // Prüfe ob es weitere Seiten gibt
        const meta = responseData.meta || {};
        const totalPages = meta.total_pages;
        const currentPage = meta.current_page || page;
        const perPage = meta.per_page || params.per_page || 100;
        
        // Speichere totalPages aus erster Response (falls vorhanden)
        if (totalPages !== undefined && knownTotalPages === undefined) {
          knownTotalPages = totalPages;
        }
        
        // Verwende bekannte totalPages falls in aktueller Response nicht vorhanden
        const effectiveTotalPages = totalPages !== undefined ? totalPages : knownTotalPages;
        
        // Stoppe wenn:
        // 1. Keine Reservierungen auf dieser Seite (leere Seite = Ende)
        // 2. Weniger Reservierungen als per_page (letzte Seite)
        // 3. totalPages ist bekannt UND page >= totalPages (NACH dem Erhöhen von page)
        if (pageReservations.length === 0) {
          hasMore = false;
        } else if (pageReservations.length < perPage) {
          // Weniger als per_page = letzte Seite
          hasMore = false;
        } else if (effectiveTotalPages !== undefined && page >= effectiveTotalPages) {
          // WICHTIG: Prüfe VOR dem Erhöhen, ob nächste Seite noch existiert
          hasMore = false;
        } else {
          page++;
          // Prüfe NACH dem Erhöhen, ob wir die letzte Seite erreicht haben
          if (effectiveTotalPages !== undefined && page > effectiveTotalPages) {
            hasMore = false;
          }
        }
        
        // Debug-Log für Pagination (bei ersten 5 Seiten oder wenn totalPages erreicht)
        if (page <= 5 || (effectiveTotalPages !== undefined && page >= effectiveTotalPages)) {
          console.log(`[LobbyPMS] Seite ${page - 1}: ${pageReservations.length} Reservierungen, totalPages: ${effectiveTotalPages || 'N/A'}, hasMore: ${hasMore}`);
        }
      }

      // Reservierungen sind bereits gefiltert (inline)
      return allReservations;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<LobbyPmsApiResponse>;
        throw new Error(
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          `LobbyPMS API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Ruft Reservierungen nach check_out_date ab (für ersten Sync)
   * 
   * Lädt alle Reservierungen mit check_out_date >= yesterday
   * Durchsucht alle Seiten bis 3 aufeinanderfolgende Seiten ohne passende Reservierungen gefunden werden
   * 
   * @param yesterday - Gestern (Anfang des Tages)
   * @returns Array von Reservierungen mit check_out_date >= yesterday
   */
  async fetchReservationsByCheckoutDate(yesterday: Date): Promise<LobbyPmsReservation[]> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      // PROBLEM: API unterstützt keine Filter-Parameter für check_out_date
      // LÖSUNG: Hole alle Reservierungen mit Pagination und filtere client-seitig nach check_out_date
      const params: any = {
        per_page: 100, // Maximal 100 pro Seite
      };

      if (this.propertyId) {
        params.property_id = this.propertyId;
      }

      // OPTIMIERUNG: Hole Seiten mit Pagination
      // WICHTIG: Für vollständigen Sync müssen ALLE Seiten durchsucht werden, auch wenn dazwischen Seiten ohne passende Reservierungen sind
      let allReservations: LobbyPmsReservation[] = [];
      let page = 1;
      let hasMore = true;
      const maxPages = 200; // Sicherheitslimit (20.000 Reservierungen max) - für ersten Sync müssen alle Seiten durchsucht werden
      let knownTotalPages: number | undefined = undefined;

      while (hasMore && page <= maxPages) {
        const response = await this.axiosInstance.get<any>('/api/v1/bookings', {
          params: { ...params, page },
          validateStatus: (status) => status < 500
        });

        // Prüfe ob Response HTML ist (404-Seite)
        const responseData = response.data;
        if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
          throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
        }

        // LobbyPMS gibt { data: [...], meta: {...} } zurück
        let pageReservations: LobbyPmsReservation[] = [];
        if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
          pageReservations = responseData.data;
        } else if (Array.isArray(responseData)) {
          pageReservations = responseData;
        } else if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
          pageReservations = responseData.data;
        } else {
          if (typeof responseData !== 'string') {
            console.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(responseData, null, 2));
          }
          throw new Error(
            (responseData && typeof responseData === 'object' && responseData.error) ||
            (responseData && typeof responseData === 'object' && responseData.message) ||
            'Unbekannter Fehler beim Abrufen der Reservierungen'
          );
        }

        // OPTIMIERUNG: Filtere sofort nach check_out_date (statt erst am Ende)
        // WICHTIG: API gibt end_date zurück, nicht check_out_date - verwende Fallback
        const recentReservations = pageReservations.filter((reservation: LobbyPmsReservation) => {
          // Verwende check_out_date oder end_date (API gibt end_date zurück)
          const checkOutDateString = reservation.check_out_date || reservation.end_date;
          if (!checkOutDateString) {
            return false; // Kein checkout_date/end_date = ignoriere
          }
          const checkOutDate = new Date(checkOutDateString);
          // Nur Reservierungen mit checkout >= gestern
          return checkOutDate >= yesterday;
        });

        // Prüfe ob passende Reservierungen gefunden wurden
        if (recentReservations.length > 0) {
          // Passende Reservierungen gefunden - füge hinzu
          allReservations = allReservations.concat(recentReservations);
          console.log(`[LobbyPMS] Seite ${page}: ${recentReservations.length} Reservierungen mit check_out_date >= gestern (von ${pageReservations.length} insgesamt)`);
        } else {
          // Keine passenden Reservierungen auf dieser Seite
          console.log(`[LobbyPMS] Seite ${page}: 0 Reservierungen mit check_out_date >= gestern (von ${pageReservations.length} insgesamt)`);
          // WICHTIG: Stoppe NICHT hier - Reservierungen können auf späteren Seiten sein!
          // Die API sortiert nicht nach check_out_date, daher können passende Reservierungen überall sein
        }

        // Prüfe ob es weitere Seiten gibt
        const meta = responseData.meta || {};
        const totalPages = meta.total_pages;
        const currentPage = meta.current_page || page;
        const perPage = meta.per_page || params.per_page || 100;
        
        // Speichere totalPages aus erster Response (falls vorhanden)
        if (totalPages !== undefined && knownTotalPages === undefined) {
          knownTotalPages = totalPages;
        }
        
        // Verwende bekannte totalPages falls in aktueller Response nicht vorhanden
        const effectiveTotalPages = totalPages !== undefined ? totalPages : knownTotalPages;
        
        // Stoppe wenn:
        // 1. Keine Reservierungen auf dieser Seite (leere Seite = Ende)
        // 2. Weniger Reservierungen als per_page (letzte Seite)
        // 3. totalPages ist bekannt UND page >= totalPages
        if (pageReservations.length === 0) {
          hasMore = false;
        } else if (pageReservations.length < perPage) {
          hasMore = false;
        } else if (effectiveTotalPages !== undefined && page >= effectiveTotalPages) {
          hasMore = false;
        } else {
          page++;
          if (effectiveTotalPages !== undefined && page > effectiveTotalPages) {
            hasMore = false;
          }
        }
        
        // Debug-Log für Pagination (bei ersten 5 Seiten oder wenn totalPages erreicht)
        if (page <= 5 || (effectiveTotalPages !== undefined && page >= effectiveTotalPages)) {
          console.log(`[LobbyPMS] Seite ${page - 1}: ${pageReservations.length} Reservierungen, totalPages: ${effectiveTotalPages || 'N/A'}, hasMore: ${hasMore}`);
        }
      }

      // Reservierungen sind bereits gefiltert (inline)
      return allReservations;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<LobbyPmsApiResponse>;
        throw new Error(
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          `LobbyPMS API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Ruft Reservierungen mit Ankunft am nächsten Tag ab
   * 
   * @param arrivalTimeThreshold - Optional: Nur Reservierungen nach dieser Uhrzeit (z.B. "22:00")
   * @returns Array von Reservierungen
   */
  async fetchTomorrowReservations(arrivalTimeThreshold?: string): Promise<LobbyPmsReservation[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const reservations = await this.fetchReservations(tomorrow, dayAfterTomorrow);

    // Filtere nach arrivalTimeThreshold wenn angegeben
    if (arrivalTimeThreshold) {
      const [hours, minutes] = arrivalTimeThreshold.split(':').map(Number);
      const thresholdTime = new Date(tomorrow);
      thresholdTime.setHours(hours, minutes, 0, 0);

      return reservations.filter(reservation => {
        if (!reservation.arrival_time) {
          return false; // Keine Ankunftszeit = nicht inkludieren
        }
        const arrivalTime = new Date(reservation.arrival_time);
        return arrivalTime >= thresholdTime;
      });
    }

    return reservations;
  }

  /**
   * Ruft Details einer spezifischen Reservierung ab
   * 
   * @param reservationId - LobbyPMS Reservierungs-ID
   * @returns Reservierungsdetails
   */
  async fetchReservationById(reservationId: string): Promise<LobbyPmsReservation> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      const response = await this.axiosInstance.get<LobbyPmsApiResponse<LobbyPmsReservation>>(
        `/reservations/${reservationId}`
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }

      // Fallback: Direktes Objekt (wenn API direkt Reservation zurückgibt)
      if (response.data && !response.data.success && (response.data as any).id) {
        return response.data as unknown as LobbyPmsReservation;
      }

      throw new Error(response.data.error || response.data.message || 'Reservierung nicht gefunden');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<LobbyPmsApiResponse>;
        if (axiosError.response?.status === 404) {
          throw new Error('Reservierung nicht gefunden');
        }
        throw new Error(
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          `LobbyPMS API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Erstellt eine neue Reservierung in LobbyPMS
   * 
   * @param categoryId - Category ID des Zimmers (erforderlich)
   * @param checkInDate - Check-in Datum
   * @param checkOutDate - Check-out Datum
   * @param guestName - Name des Gastes
   * @param guestEmail - E-Mail des Gastes (optional)
   * @param guestPhone - Telefonnummer des Gastes (optional)
   * @param guests - Anzahl Personen (optional, default: 1)
   * @returns LobbyPMS Booking ID
   */
  async createBooking(
    categoryId: number,
    checkInDate: Date,
    checkOutDate: Date,
    guestName: string,
    guestEmail?: string,
    guestPhone?: string,
    guests: number = 1
  ): Promise<string> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      // Payload basierend auf Test-Ergebnissen
      // WICHTIG: total_adults und holder_name sind ERFORDERLICH!
      const payload: any = {
        category_id: categoryId,
        start_date: this.formatDate(checkInDate), // Format: "YYYY-MM-DD"
        end_date: this.formatDate(checkOutDate), // Format: "YYYY-MM-DD"
        holder_name: guestName.trim(), // ERFORDERLICH: holder_name (nicht guest_name!)
        total_adults: guests > 0 ? guests : 1 // ERFORDERLICH: Standard 1, falls nicht angegeben
      };

      // Optionale Felder
      if (guestEmail) {
        payload.guest_email = guestEmail.trim();
      }
      if (guestPhone) {
        payload.guest_phone = guestPhone.trim();
      }

      console.log(`[LobbyPMS] Erstelle Reservierung: category_id=${categoryId}, checkIn=${this.formatDate(checkInDate)}, checkOut=${this.formatDate(checkOutDate)}, guest=${guestName}`);

      const response = await this.axiosInstance.post<any>(
        '/api/v1/bookings',
        payload
      );

      // Response-Struktur (aus Tests bekannt):
      // { booking: { booking_id: 18251865, room_id: 807372 } }
      let bookingId: string | undefined;

      // Prüfe verschiedene Response-Formate
      if (response.data?.booking?.booking_id) {
        // Standard Response-Format: { booking: { booking_id: ..., room_id: ... } }
        bookingId = String(response.data.booking.booking_id);
      } else if (response.data?.booking_id) {
        // Direktes booking_id im Root
        bookingId = String(response.data.booking_id);
      } else if (response.data?.data?.booking_id) {
        // Verschachteltes Format: { data: { booking_id: ... } }
        bookingId = String(response.data.data.booking_id);
      } else if ((response.data as any).id) {
        // Fallback: id statt booking_id
        bookingId = String((response.data as any).id);
      }

      if (!bookingId) {
        console.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(response.data, null, 2));
        throw new Error('LobbyPMS API hat keine booking_id zurückgegeben');
      }

      console.log(`[LobbyPMS] Reservierung erfolgreich erstellt: booking_id=${bookingId}`);
      return String(bookingId);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<LobbyPmsApiResponse>;
        const errorMessage = 
          axiosError.response?.data?.error ||
          (Array.isArray(axiosError.response?.data) ? (axiosError.response?.data as any[]).join(', ') : undefined) ||
          axiosError.response?.data?.message ||
          `LobbyPMS API Fehler: ${axiosError.message}`;
        
        console.error('[LobbyPMS] Fehler beim Erstellen der Reservierung:', errorMessage);
        throw new Error(errorMessage);
      }
      throw error;
    }
  }

  /**
   * Aktualisiert den Check-in-Status einer Reservierung in LobbyPMS
   * 
   * @param reservationId - LobbyPMS Reservierungs-ID
   * @param status - Neuer Status ('checked_in', 'checked_out', etc.)
   */
  async updateReservationStatus(reservationId: string, status: string): Promise<void> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      const response = await this.axiosInstance.put<LobbyPmsApiResponse>(
        `/reservations/${reservationId}/status`,
        { status }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || response.data.message || 'Fehler beim Aktualisieren des Status');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<LobbyPmsApiResponse>;
        throw new Error(
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          `LobbyPMS API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Parst ein Datum als lokales Datum (ohne Zeitzone)
   * Verhindert UTC-Konvertierung bei Datumsstrings im Format YYYY-MM-DD
   * 
   * @param dateString - Datumsstring (z.B. "2025-01-20" oder "2025-01-20T00:00:00Z")
   * @returns Date-Objekt als lokales Datum
   */
  private parseLocalDate(dateString: string): Date {
    if (!dateString) {
      throw new Error('Datum-String ist leer');
    }
    
    // Wenn das Datum im Format YYYY-MM-DD ist (ohne Zeit), parse es als lokales Datum
    // Dies verhindert UTC-Konvertierung, die zu einem Tag-Versatz führt
    const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      // new Date(year, monthIndex, day) erstellt ein lokales Datum (keine UTC-Konvertierung)
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    // Fallback: Normales Parsing für andere Formate
    return new Date(dateString);
  }

  /**
   * Synchronisiert eine LobbyPMS-Reservierung in die lokale Datenbank
   * 
   * @param lobbyReservation - Reservierungsdaten von LobbyPMS
   * @returns Lokale Reservation
   */
  async syncReservation(lobbyReservation: LobbyPmsReservation): Promise<Reservation> {
    // Mappe LobbyPMS Status zu unserem ReservationStatus
    // Unterstützt sowohl englische als auch spanische Status-Strings
    const mapStatus = (status?: string): ReservationStatus => {
      switch (status?.toLowerCase()) {
        // Englische Status
        case 'checked_in':
          return ReservationStatus.checked_in;
        case 'checked_out':
          return ReservationStatus.checked_out;
        case 'cancelled':
          return ReservationStatus.cancelled;
        case 'no_show':
          return ReservationStatus.no_show;
        // Spanische Status (LobbyPMS ist auf Spanisch)
        case 'ingresado':
        case 'check-in':
          return ReservationStatus.checked_in;
        case 'salido':
        case 'check-out':
          return ReservationStatus.checked_out;
        case 'cancelado':
          return ReservationStatus.cancelled;
        case 'no_aparecio':
        case 'no apareció':
          return ReservationStatus.no_show;
        case 'confirmado':
          return ReservationStatus.confirmed;
        default:
          return ReservationStatus.confirmed;
      }
    };

    // Mappe LobbyPMS Payment Status zu unserem PaymentStatus
    const mapPaymentStatus = (status?: string): PaymentStatus => {
      switch (status?.toLowerCase()) {
        case 'paid':
          return PaymentStatus.paid;
        case 'partially_paid':
          return PaymentStatus.partially_paid;
        case 'refunded':
          return PaymentStatus.refunded;
        default:
          return PaymentStatus.pending;
      }
    };

    // API gibt booking_id zurück, nicht id
    const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id);
    
    // Gastdaten aus holder-Objekt extrahieren (falls vorhanden)
    const holder = lobbyReservation.holder || {};
    const guestName = (holder.name && holder.surname) 
      ? `${holder.name} ${holder.surname}${holder.second_surname ? ' ' + holder.second_surname : ''}`.trim()
      : (lobbyReservation.guest_name || 'Unbekannt');
    const guestEmail = holder.email || lobbyReservation.guest_email || null;
    const guestPhone = holder.phone || lobbyReservation.guest_phone || null;
    // Land aus holder.country extrahieren (für Sprache-basierte WhatsApp-Nachrichten)
    // WICHTIG: LobbyPMS verwendet 'country', nicht 'pais'!
    const guestNationality = holder.country || holder.pais || null;
    
    // Prüfe ob Gast Check-in-Link abgeschlossen hat (Dokumente hochgeladen)
    // Indikatoren:
    // 1. checkin_online = true (sicherster Indikator)
    // 2. holder.type_document + holder.document gefüllt (sehr wahrscheinlich)
    // WICHTIG: Stelle sicher, dass immer ein Boolean zurückgegeben wird
    const hasCompletedCheckInLink = Boolean(
      lobbyReservation.checkin_online === true ||
      (holder.type_document && holder.type_document !== '' && 
       holder.document && holder.document !== '')
    );
    
    // Datum-Felder: API gibt start_date/end_date zurück
    // WICHTIG: Verwende parseLocalDate, um UTC-Konvertierung zu vermeiden
    // Die API gibt Datum als "YYYY-MM-DD" zurück, was als UTC interpretiert wird
    // und dann in der lokalen Zeitzone einen Tag zu früh angezeigt wird
    const checkInDateString = lobbyReservation.start_date || lobbyReservation.check_in_date;
    const checkOutDateString = lobbyReservation.end_date || lobbyReservation.check_out_date;
    
    if (!checkInDateString || !checkOutDateString) {
      throw new Error('Check-in oder Check-out Datum fehlt in der LobbyPMS-Reservierung');
    }
    
    const checkInDate = this.parseLocalDate(checkInDateString);
    const checkOutDate = this.parseLocalDate(checkOutDateString);
    
    // Zimmer-Daten aus assigned_room-Objekt
    // WICHTIG: Für Dorms (compartida) enthält assigned_room.name nur die Bettnummer,
    // der Zimmername steht in category.name. Für Privatzimmer (privada) steht der
    // Zimmername direkt in assigned_room.name.
    const assignedRoom = lobbyReservation.assigned_room;
    const isDorm = assignedRoom?.type === 'compartida';
    
    let roomNumber: string | null = null;
    let roomDescription: string | null = null;
    
    // Extrahiere categoryId für Zimmer-Beschreibungen
    const categoryId = lobbyReservation.category?.category_id || null;
    
    if (isDorm) {
      // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
      const dormName = lobbyReservation.category?.name || null;
      const bedNumber = assignedRoom?.name || null;
      // Für Dorms: roomNumber = Bettnummer, roomDescription = Zimmername
      roomNumber = bedNumber;
      roomDescription = dormName;
    } else {
      // Für Privatzimmer: assigned_room.name = Zimmername
      // roomNumber bleibt leer (nur bei Dorms gefüllt)
      roomNumber = null;
      // roomDescription = Zimmername
      roomDescription = assignedRoom?.name || lobbyReservation.room_number || null;
    }
    
    // Status: API gibt checked_in/checked_out Booleans zurück
    let status: ReservationStatus = ReservationStatus.confirmed;
    if (lobbyReservation.checked_out) {
      status = ReservationStatus.checked_out;
    } else if (lobbyReservation.checked_in) {
      status = ReservationStatus.checked_in;
    } else if (lobbyReservation.status) {
      status = mapStatus(lobbyReservation.status);
    }
    
    // Payment Status: API gibt paid_out und total_to_pay zurück
    let paymentStatus: PaymentStatus = PaymentStatus.pending;
    const paidOut = parseFloat(lobbyReservation.paid_out || '0');
    const totalToPay = parseFloat(lobbyReservation.total_to_pay || lobbyReservation.total_to_pay_accommodation || '0');
    if (paidOut >= totalToPay && totalToPay > 0) {
      paymentStatus = PaymentStatus.paid;
    } else if (paidOut > 0) {
      paymentStatus = PaymentStatus.partially_paid;
    } else if (lobbyReservation.payment_status) {
      paymentStatus = mapPaymentStatus(lobbyReservation.payment_status);
    }

    // Setze amount aus totalToPay (für Payment-Link-Erstellung)
    const amount = totalToPay > 0 ? totalToPay : null;
    // Setze currency (Standard: COP, könnte auch aus API kommen)
    const currency = lobbyReservation.currency || 'COP';

    // Hole Branch-ID: Verwende this.branchId (MUSS gesetzt sein!)
    // KEIN Fallback mehr, da dies zu falschen Branch-Zuordnungen führt
    if (!this.branchId) {
      throw new Error(`LobbyPmsService.syncReservation: branchId ist nicht gesetzt! Service muss mit createForBranch() erstellt werden.`);
    }
    const branchId: number = this.branchId;

    // Hole existierende Reservation um checkInDataUploaded-Status zu prüfen
    const existingReservation = await prisma.reservation.findUnique({
      where: { lobbyReservationId: bookingId }
    });

    // Prüfe ob checkInDataUploaded bereits gesetzt war
    const wasAlreadyUploaded = existingReservation?.checkInDataUploaded || false;
    const isNowUploaded = hasCompletedCheckInLink;
    const checkInDataUploadedChanged = !wasAlreadyUploaded && isNowUploaded;

    const reservationData = {
      lobbyReservationId: bookingId,
      guestName: guestName,
      guestEmail: guestEmail,
      guestPhone: guestPhone,
      checkInDate: checkInDate,
      checkOutDate: checkOutDate,
      arrivalTime: lobbyReservation.arrival_time ? new Date(lobbyReservation.arrival_time) : null,
      roomNumber: roomNumber,
      roomDescription: roomDescription,
      categoryId: categoryId, // LobbyPMS category_id (für Zimmer-Beschreibungen)
      status: status,
      paymentStatus: paymentStatus,
      amount: amount,
      currency: currency,
      guestNationality: guestNationality, // Land für Sprache-basierte WhatsApp-Nachrichten
      checkInDataUploaded: isNowUploaded, // Setze wenn Check-in-Link abgeschlossen
      checkInDataUploadedAt: isNowUploaded && !wasAlreadyUploaded ? new Date() : existingReservation?.checkInDataUploadedAt || null,
      organizationId: this.organizationId!,
      branchId: branchId,
    };

    // Upsert: Erstelle oder aktualisiere Reservierung
    const reservation = await prisma.reservation.upsert({
      where: {
        lobbyReservationId: bookingId
      },
      create: reservationData,
      update: reservationData
    });

      // Erstelle Sync-History-Eintrag
      await prisma.reservationSyncHistory.create({
        data: {
          reservationId: reservation.id,
          syncType: 'updated',
          syncData: lobbyReservation as any,
        }
      });

      // Erstelle automatisch Task wenn aktiviert
      try {
        await TaskAutomationService.createReservationTask(reservation, this.organizationId);
      } catch (error) {
        console.error(`[LobbyPMS] Fehler beim Erstellen des Tasks für Reservierung ${reservation.id}:`, error);
        // Fehler nicht weiterwerfen, da Task-Erstellung optional ist
      }

      // PIN-Versand: Wenn Check-in-Link abgeschlossen UND bezahlt → versende PIN
      if (checkInDataUploadedChanged && paymentStatus === PaymentStatus.paid && !reservation.doorPin) {
        try {
          console.log(`[LobbyPMS] Check-in-Link abgeschlossen und bezahlt → versende PIN für Reservierung ${reservation.id}`);
          const { ReservationNotificationService } = await import('./reservationNotificationService');
          await ReservationNotificationService.generatePinAndSendNotification(reservation.id);
        } catch (error) {
          console.error(`[LobbyPMS] Fehler beim Versenden der PIN für Reservierung ${reservation.id}:`, error);
          // Fehler nicht weiterwerfen, da PIN-Versand optional ist
        }
      }

      return reservation;
  }

  /**
   * Synchronisiert Reservierungen nach check_out_date (für ersten Sync)
   * 
   * Lädt alle Reservierungen mit check_out_date >= gestern
   * Wird für manuellen ersten Sync verwendet
   * 
   * @returns Anzahl synchronisierter Reservierungen
   */
  async syncReservationsByCheckoutDate(): Promise<number> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    // Filter nach check_out_date >= gestern
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    console.log(`[LobbyPMS] Starte vollständigen Sync nach check_out_date >= ${yesterday.toISOString()}`);

    // Rufe fetchReservationsByCheckoutDate auf
    const lobbyReservations = await this.fetchReservationsByCheckoutDate(yesterday);
    let syncedCount = 0;

    for (const lobbyReservation of lobbyReservations) {
      try {
        await this.syncReservation(lobbyReservation);
        syncedCount++;
      } catch (error) {
        const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
        console.error(`[LobbyPMS] Fehler beim Synchronisieren der Reservierung ${bookingId}:`, error);
        // Erstelle Sync-History mit Fehler
        const existingReservation = await prisma.reservation.findUnique({
          where: { lobbyReservationId: bookingId }
        });
        if (existingReservation) {
          await prisma.reservationSyncHistory.create({
            data: {
              reservationId: existingReservation.id,
              syncType: 'error',
              syncData: lobbyReservation as any,
              errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler'
            }
          });
        }
      }
    }

    console.log(`[LobbyPMS] Vollständiger Sync abgeschlossen: ${syncedCount} Reservierungen synchronisiert`);
    return syncedCount;
  }

  /**
   * Synchronisiert alle Reservierungen für einen Zeitraum
   * 
   * @param startDate - Startdatum (creation_date_from)
   * @param endDate - Wird nicht mehr verwendet (nur für Kompatibilität)
   * @returns Anzahl synchronisierter Reservierungen
   */
  async syncReservations(startDate: Date, endDate?: Date): Promise<number> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    // WICHTIG: fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
    const lobbyReservations = await this.fetchReservations(startDate, endDate || new Date());
    let syncedCount = 0;

    for (const lobbyReservation of lobbyReservations) {
      try {
        await this.syncReservation(lobbyReservation);
        syncedCount++;
      } catch (error) {
        const bookingId = String(lobbyReservation.booking_id || lobbyReservation.id || 'unknown');
        console.error(`[LobbyPMS] Fehler beim Synchronisieren der Reservierung ${bookingId}:`, error);
        // Erstelle Sync-History mit Fehler
        const existingReservation = await prisma.reservation.findUnique({
          where: { lobbyReservationId: bookingId }
        });
        if (existingReservation) {
          await prisma.reservationSyncHistory.create({
            data: {
              reservationId: existingReservation.id,
              syncType: 'error',
              syncData: lobbyReservation as any,
              errorMessage: error instanceof Error ? error.message : 'Unbekannter Fehler'
            }
          });
        }
      }
    }

    return syncedCount;
  }

  /**
   * Validiert die LobbyPMS API-Verbindung
   * 
   * @returns true wenn Verbindung erfolgreich
   */
  async validateConnection(): Promise<boolean> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    try {
      // Versuche eine einfache API-Anfrage (z.B. Health Check oder Properties)
      await this.axiosInstance.get('/health');
      return true;
    } catch (error) {
      // Wenn /health nicht existiert, versuche /properties
      try {
        await this.axiosInstance.get('/properties');
        return true;
      } catch {
        return false;
      }
    }
  }
}

