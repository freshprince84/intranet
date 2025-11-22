import { Reservation, ReservationStatus, PaymentStatus } from '@prisma/client';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../utils/encryption';
import { TaskAutomationService } from './taskAutomationService';
import { prisma } from '../utils/prisma';

/**
 * Findet Branch-ID über LobbyPMS property_id
 * @param propertyId - LobbyPMS Property ID
 * @param organizationId - Organisation ID (optional, für bessere Performance)
 * @returns Branch-ID oder null
 */
export async function findBranchByPropertyId(propertyId: string, organizationId?: number): Promise<number | null> {
  const branches = await prisma.branch.findMany({
    where: organizationId ? { organizationId } : undefined,
    select: { id: true, lobbyPmsSettings: true }
  });

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
      baseURL: 'https://app.lobbypms.com/api', // Placeholder, wird in loadSettings überschrieben
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
      const params: any = {
        start_date: startDate.toISOString().split('T')[0], // YYYY-MM-DD
        end_date: endDate.toISOString().split('T')[0],
      };

      if (this.propertyId) {
        params.property_id = this.propertyId;
      }

      const response = await this.axiosInstance.get<any>('/api/v1/bookings', {
        params,
        validateStatus: (status) => status < 500 // Akzeptiere 4xx als gültige Antwort
      });

      // Prüfe ob Response HTML ist (404-Seite)
      const responseData = response.data;
      if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
        throw new Error('LobbyPMS API Endpoint nicht gefunden. Bitte prüfe die API-Dokumentation für den korrekten Endpoint.');
      }

      // LobbyPMS gibt { data: [...], meta: {...} } zurück
      if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
        return responseData.data;
      }

      // Fallback: Direktes Array (wenn API direkt Array zurückgibt)
      if (Array.isArray(responseData)) {
        return responseData;
      }

      // Fallback: success-Format
      if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
        return responseData.data;
      }

      // Debug: Zeige Response-Struktur (nur wenn nicht HTML)
      if (typeof responseData !== 'string') {
        console.error('[LobbyPMS] Unerwartete Response-Struktur:', JSON.stringify(responseData, null, 2));
      }

      throw new Error(
        (responseData && typeof responseData === 'object' && responseData.error) ||
        (responseData && typeof responseData === 'object' && responseData.message) ||
        'Unbekannter Fehler beim Abrufen der Reservierungen'
      );
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
   * Synchronisiert eine LobbyPMS-Reservierung in die lokale Datenbank
   * 
   * @param lobbyReservation - Reservierungsdaten von LobbyPMS
   * @returns Lokale Reservation
   */
  async syncReservation(lobbyReservation: LobbyPmsReservation): Promise<Reservation> {
    // Mappe LobbyPMS Status zu unserem ReservationStatus
    const mapStatus = (status?: string): ReservationStatus => {
      switch (status?.toLowerCase()) {
        case 'checked_in':
          return ReservationStatus.checked_in;
        case 'checked_out':
          return ReservationStatus.checked_out;
        case 'cancelled':
          return ReservationStatus.cancelled;
        case 'no_show':
          return ReservationStatus.no_show;
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
    
    // Datum-Felder: API gibt start_date/end_date zurück
    const checkInDate = lobbyReservation.start_date || lobbyReservation.check_in_date;
    const checkOutDate = lobbyReservation.end_date || lobbyReservation.check_out_date;
    
    // Zimmer-Daten aus assigned_room-Objekt
    const roomNumber = lobbyReservation.assigned_room?.name || lobbyReservation.room_number || null;
    const roomDescription = lobbyReservation.assigned_room?.type || lobbyReservation.room_description || lobbyReservation.category?.name || null;
    
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

    // Hole Branch-ID: Verwende this.branchId (MUSS gesetzt sein!)
    // KEIN Fallback mehr, da dies zu falschen Branch-Zuordnungen führt
    if (!this.branchId) {
      throw new Error(`LobbyPmsService.syncReservation: branchId ist nicht gesetzt! Service muss mit createForBranch() erstellt werden.`);
    }
    const branchId: number = this.branchId;

    const reservationData = {
      lobbyReservationId: bookingId,
      guestName: guestName,
      guestEmail: guestEmail,
      guestPhone: guestPhone,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      arrivalTime: lobbyReservation.arrival_time ? new Date(lobbyReservation.arrival_time) : null,
      roomNumber: roomNumber,
      roomDescription: roomDescription,
      status: status,
      paymentStatus: paymentStatus,
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

      return reservation;
  }

  /**
   * Synchronisiert alle Reservierungen für einen Zeitraum
   * 
   * @param startDate - Startdatum
   * @param endDate - Enddatum
   * @returns Anzahl synchronisierter Reservierungen
   */
  async syncReservations(startDate: Date, endDate: Date): Promise<number> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey) {
      await this.loadSettings();
    }

    const lobbyReservations = await this.fetchReservations(startDate, endDate);
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

