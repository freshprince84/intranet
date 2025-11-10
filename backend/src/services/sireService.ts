import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient, Reservation } from '@prisma/client';
import { decryptApiSettings } from '../utils/encryption';

const prisma = new PrismaClient();

/**
 * SIRE API Response Types
 */
export interface SireRegistrationResponse {
  success: boolean;
  registrationId?: string;
  message?: string;
  error?: string;
}

export interface SireRegistrationStatus {
  status: 'registered' | 'pending' | 'error';
  lastUpdated: Date;
  registrationId?: string;
  error?: string;
}

/**
 * Service für SIRE Integration (Plataforma de la migración, Kolumbien)
 * 
 * Bietet Funktionen zur automatischen Gästeregistrierung bei SIRE
 */
export class SireService {
  private organizationId: number;
  private apiUrl?: string;
  private apiKey?: string;
  private apiSecret?: string;
  private propertyCode?: string;
  private enabled: boolean = false;
  private autoRegisterOnCheckIn: boolean = false;
  private axiosInstance?: AxiosInstance;

  /**
   * Erstellt eine neue SIRE Service-Instanz
   * 
   * @param organizationId - ID der Organisation
   * @throws Error wenn SIRE nicht konfiguriert ist
   */
  constructor(organizationId: number) {
    this.organizationId = organizationId;
    // Settings werden beim ersten API-Call geladen (lazy loading)
  }

  /**
   * Lädt SIRE Settings aus der Organisation
   * Muss vor jedem API-Call aufgerufen werden
   */
  private async loadSettings(): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error(`SIRE ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    const settings = decryptApiSettings(organization.settings as any);
    const sireSettings = settings?.sire;

    if (!sireSettings) {
      throw new Error(`SIRE Settings sind nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    this.enabled = sireSettings.enabled || false;
    this.autoRegisterOnCheckIn = sireSettings.autoRegisterOnCheckIn || false;
    this.apiUrl = sireSettings.apiUrl;
    this.apiKey = sireSettings.apiKey;
    this.apiSecret = sireSettings.apiSecret;
    this.propertyCode = sireSettings.propertyCode;

    if (this.enabled && (!this.apiUrl || !this.apiKey)) {
      throw new Error(`SIRE API URL oder API Key fehlt für Organisation ${this.organizationId}`);
    }

    // Erstelle Axios-Instanz wenn aktiviert
    if (this.enabled) {
      this.axiosInstance = this.createAxiosInstance();
    }
  }

  /**
   * Erstellt eine konfigurierte Axios-Instanz für SIRE API-Requests
   */
  private createAxiosInstance(): AxiosInstance {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('SIRE API URL oder API Key fehlt');
    }

    const instance = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        // Alternative: 'X-API-Key': this.apiKey (je nach SIRE API)
      }
    });

    // Request Interceptor für Logging
    instance.interceptors.request.use(
      (config) => {
        console.log(`[SIRE] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[SIRE] Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor für Error Handling
    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[SIRE] API Error:', {
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
   * Validiert, ob alle erforderlichen Daten für SIRE-Registrierung vorhanden sind
   */
  private validateReservationData(reservation: Reservation): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!reservation.guestName) {
      missingFields.push('guestName');
    }

    if (!reservation.guestNationality) {
      missingFields.push('guestNationality');
    }

    if (!reservation.guestPassportNumber) {
      missingFields.push('guestPassportNumber');
    }

    if (!reservation.guestBirthDate) {
      missingFields.push('guestBirthDate');
    }

    if (!reservation.checkInDate) {
      missingFields.push('checkInDate');
    }

    if (!reservation.checkOutDate) {
      missingFields.push('checkOutDate');
    }

    if (!reservation.roomNumber) {
      missingFields.push('roomNumber');
    }

    return {
      valid: missingFields.length === 0,
      missingFields
    };
  }

  /**
   * Registriert einen Gast bei SIRE
   * Wird automatisch beim Check-in aufgerufen (wenn aktiviert)
   * 
   * @param reservation - Reservierung mit Gästedaten
   * @returns Registrierungsergebnis
   */
  async registerGuest(reservation: Reservation): Promise<{
    success: boolean;
    registrationId?: string;
    error?: string;
  }> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey && !this.apiUrl) {
      await this.loadSettings();
    }

    try {
      if (!this.enabled) {
        return {
          success: false,
          error: 'SIRE ist für diese Organisation nicht aktiviert'
        };
      }

      if (!this.axiosInstance) {
        return {
          success: false,
          error: 'SIRE Service nicht initialisiert'
        };
      }

      // Validiere erforderliche Daten
      const validation = this.validateReservationData(reservation);
      if (!validation.valid) {
        return {
          success: false,
          error: `Fehlende erforderliche Daten: ${validation.missingFields.join(', ')}`
        };
      }

      // Erstelle SIRE-Registrierungsanfrage
      const registrationData = {
        property_code: this.propertyCode,
        guest: {
          name: reservation.guestName,
          nationality: reservation.guestNationality,
          passport_number: reservation.guestPassportNumber,
          birth_date: reservation.guestBirthDate?.toISOString().split('T')[0], // YYYY-MM-DD
          email: reservation.guestEmail || undefined,
          phone: reservation.guestPhone || undefined
        },
        stay: {
          check_in_date: reservation.checkInDate.toISOString().split('T')[0], // YYYY-MM-DD
          check_out_date: reservation.checkOutDate.toISOString().split('T')[0],
          room_number: reservation.roomNumber
        }
      };

      // Sende an SIRE API
      const response = await this.axiosInstance.post<SireRegistrationResponse>(
        '/registrations',
        registrationData
      );

      if (response.data.success && response.data.registrationId) {
        // Speichere Registrierungs-ID in Reservierung
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            sireRegistered: true,
            sireRegistrationId: response.data.registrationId,
            sireRegisteredAt: new Date(),
            sireRegistrationError: null
          }
        });

        console.log(`[SIRE] Gast ${reservation.guestName} erfolgreich registriert: ${response.data.registrationId}`);

        return {
          success: true,
          registrationId: response.data.registrationId
        };
      }

      // Fallback: Prüfe ob Registration ID direkt im Response ist
      if ((response.data as any).registrationId) {
        const registrationId = (response.data as any).registrationId;
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            sireRegistered: true,
            sireRegistrationId: registrationId,
            sireRegisteredAt: new Date(),
            sireRegistrationError: null
          }
        });

        return {
          success: true,
          registrationId
        };
      }

      const errorMessage = response.data.error || response.data.message || 'Unbekannter Fehler bei SIRE-Registrierung';
      
      // Speichere Fehler in Reservierung
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          sireRegistered: false,
          sireRegistrationError: errorMessage
        }
      });

      return {
        success: false,
        error: errorMessage
      };
    } catch (error) {
      const errorMessage = axios.isAxiosError(error)
        ? (error as AxiosError<SireRegistrationResponse>).response?.data?.error ||
          (error as AxiosError<SireRegistrationResponse>).response?.data?.message ||
          `SIRE API Fehler: ${error.message}`
        : error instanceof Error
        ? error.message
        : 'Unbekannter Fehler';

      // Speichere Fehler in Reservierung
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          sireRegistered: false,
          sireRegistrationError: errorMessage
        }
      });

      console.error(`[SIRE] Fehler bei Registrierung für Reservierung ${reservation.id}:`, errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Aktualisiert eine bestehende SIRE-Registrierung
   * 
   * @param registrationId - SIRE Registrierungs-ID
   * @param reservation - Aktualisierte Reservierungsdaten
   * @returns true wenn erfolgreich
   */
  async updateRegistration(
    registrationId: string,
    reservation: Reservation
  ): Promise<boolean> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey && !this.apiUrl) {
      await this.loadSettings();
    }

    try {
      if (!this.enabled || !this.axiosInstance) {
        throw new Error('SIRE Service nicht aktiviert oder nicht initialisiert');
      }

      const registrationData = {
        property_code: this.propertyCode,
        guest: {
          name: reservation.guestName,
          nationality: reservation.guestNationality,
          passport_number: reservation.guestPassportNumber,
          birth_date: reservation.guestBirthDate?.toISOString().split('T')[0],
          email: reservation.guestEmail || undefined,
          phone: reservation.guestPhone || undefined
        },
        stay: {
          check_in_date: reservation.checkInDate.toISOString().split('T')[0],
          check_out_date: reservation.checkOutDate.toISOString().split('T')[0],
          room_number: reservation.roomNumber
        }
      };

      const response = await this.axiosInstance.put<SireRegistrationResponse>(
        `/registrations/${registrationId}`,
        registrationData
      );

      if (response.data.success) {
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            sireRegisteredAt: new Date(),
            sireRegistrationError: null
          }
        });

        return true;
      }

      throw new Error(response.data.error || response.data.message || 'Fehler beim Aktualisieren der Registrierung');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error(`[SIRE] Fehler beim Aktualisieren der Registrierung ${registrationId}:`, errorMessage);
      
      await prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          sireRegistrationError: errorMessage
        }
      });

      return false;
    }
  }

  /**
   * Meldet einen Gast bei SIRE ab (bei Check-out)
   * 
   * @param registrationId - SIRE Registrierungs-ID
   * @returns true wenn erfolgreich
   */
  async unregisterGuest(registrationId: string): Promise<boolean> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey && !this.apiUrl) {
      await this.loadSettings();
    }

    try {
      if (!this.enabled || !this.axiosInstance) {
        throw new Error('SIRE Service nicht aktiviert oder nicht initialisiert');
      }

      const response = await this.axiosInstance.delete<SireRegistrationResponse>(
        `/registrations/${registrationId}`
      );

      if (response.data.success) {
        // Finde Reservierung und aktualisiere Status
        const reservation = await prisma.reservation.findFirst({
          where: { sireRegistrationId: registrationId }
        });

        if (reservation) {
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: {
              sireRegistered: false,
              sireRegistrationId: null
            }
          });
        }

        return true;
      }

      throw new Error(response.data.error || response.data.message || 'Fehler beim Abmelden');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error(`[SIRE] Fehler beim Abmelden der Registrierung ${registrationId}:`, errorMessage);
      return false;
    }
  }

  /**
   * Prüft den Status einer Registrierung
   * 
   * @param registrationId - SIRE Registrierungs-ID
   * @returns Registrierungsstatus
   */
  async getRegistrationStatus(registrationId: string): Promise<SireRegistrationStatus> {
    // Lade Settings falls noch nicht geladen
    if (!this.apiKey && !this.apiUrl) {
      await this.loadSettings();
    }

    try {
      if (!this.enabled || !this.axiosInstance) {
        throw new Error('SIRE Service nicht aktiviert oder nicht initialisiert');
      }

      const response = await this.axiosInstance.get<SireRegistrationResponse>(
        `/registrations/${registrationId}/status`
      );

      if (response.data.success) {
        return {
          status: 'registered',
          lastUpdated: new Date(),
          registrationId
        };
      }

      return {
        status: 'error',
        lastUpdated: new Date(),
        registrationId,
        error: response.data.error || response.data.message
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      console.error(`[SIRE] Fehler beim Abrufen des Status für ${registrationId}:`, errorMessage);
      
      return {
        status: 'error',
        lastUpdated: new Date(),
        registrationId,
        error: errorMessage
      };
    }
  }
}


