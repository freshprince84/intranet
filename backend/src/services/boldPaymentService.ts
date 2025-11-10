import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { PrismaClient, Reservation } from '@prisma/client';
import { decryptApiSettings } from '../utils/encryption';

const prisma = new PrismaClient();

/**
 * Bold Payment API Response Types
 */
export interface BoldPaymentLink {
  id: string;
  url: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  expiresAt?: string;
}

export interface BoldPaymentResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Service für Bold Payment Integration
 * 
 * Bietet Funktionen zum Erstellen von Zahlungslinks und Status-Abfragen
 */
export class BoldPaymentService {
  private organizationId: number;
  private apiKey?: string;
  private merchantId?: string;
  private environment: 'sandbox' | 'production' = 'sandbox';
  private apiUrl: string;
  private axiosInstance: AxiosInstance;

  /**
   * Erstellt eine neue Bold Payment Service-Instanz
   * 
   * @param organizationId - ID der Organisation
   * @throws Error wenn Bold Payment nicht konfiguriert ist
   */
  constructor(organizationId: number) {
    this.organizationId = organizationId;
    // Settings werden beim ersten API-Call geladen (lazy loading)
    this.axiosInstance = axios.create({
      baseURL: 'https://sandbox.bold.co', // Placeholder, wird in loadSettings überschrieben
      timeout: 30000
    });
  }

  /**
   * Lädt Bold Payment Settings aus der Organisation
   * Muss vor jedem API-Call aufgerufen werden
   */
  private async loadSettings(): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error(`Bold Payment ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    const settings = decryptApiSettings(organization.settings as any);
    const boldPaymentSettings = settings?.boldPayment;

    if (!boldPaymentSettings?.apiKey) {
      throw new Error(`Bold Payment API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    this.apiKey = boldPaymentSettings.apiKey;
    this.merchantId = boldPaymentSettings.merchantId;
    this.environment = boldPaymentSettings.environment || 'sandbox';

    // Bestimme API URL basierend auf Environment
    // Bold Payment "API Link de pagos" (Botón de pagos) verwendet:
    // - URL base: https://integrations.api.bold.co (für Sandbox und Production)
    // - Authentifizierung: x-api-key Header mit <llave_de_identidad>
    // Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
    this.apiUrl = 'https://integrations.api.bold.co';

    // Re-initialisiere Axios-Instanz mit korrekten Settings
    this.axiosInstance = this.createAxiosInstance();
  }

  /**
   * Erstellt eine konfigurierte Axios-Instanz für Bold Payment API-Requests
   * 
   * Bold Payment "API Link de pagos" (Botón de pagos) verwendet einfache API-Key-Authentifizierung:
   * - Authorization: x-api-key <llave_de_identidad>
   * - Die Llave de identidad (Identity Key / Merchant ID) wird direkt im Authorization Header verwendet
   * Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Request Interceptor für API-Key-Authentifizierung
    instance.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Lade Settings falls noch nicht geladen
        if (!this.merchantId) {
          await this.loadSettings();
        }

        // Bold Payment "API Link de pagos" verwendet:
        // Authorization Header mit Wert: x-api-key <llave_de_identidad>
        // Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
        if (!this.merchantId) {
          throw new Error('Bold Payment Merchant ID (Llave de identidad) fehlt');
        }
        config.headers.set('Authorization', `x-api-key ${this.merchantId}`);

        console.log(`[Bold Payment] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Bold Payment] Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor für Error Handling
    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[Bold Payment] API Error:', {
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
   * Erstellt einen Zahlungslink für eine Reservierung
   * 
   * Verwendet die "API Link de pagos" (Botón de pagos) von Bold Payment.
   * Quelle: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
   * 
   * @param reservation - Reservierung
   * @param amount - Betrag (in der Währung der Reservierung)
   * @param currency - Währung (z.B. "COP" für Kolumbien)
   * @param description - Beschreibung der Zahlung
   * @returns Payment Link URL
   */
  async createPaymentLink(
    reservation: Reservation,
    amount: number,
    currency: string = 'COP',
    description?: string
  ): Promise<string> {
    // Lade Settings falls noch nicht geladen
    if (!this.merchantId) {
      await this.loadSettings();
    }

    try {
      // Beschreibung: min 2, max 100 Zeichen
      const paymentDescription = (description || 
        `Reservierung ${reservation.guestName}`).substring(0, 100);
      
      if (paymentDescription.length < 2) {
        throw new Error('Beschreibung muss mindestens 2 Zeichen lang sein');
      }

      // Reference: max 60 Zeichen, alphanumerisch, Unterstriche, Bindestriche
      // Empfehlung: Timestamp hinzufügen um Duplikate zu vermeiden
      const timestamp = Date.now();
      const reference = `RES-${reservation.id}-${timestamp}`.substring(0, 60);

      // Payload gemäß API Link de pagos Dokumentation
      const payload: any = {
        amount_type: 'CLOSE', // Geschlossener Betrag (vom Merchant festgelegt)
        amount: {
          currency: currency,
          total_amount: amount,
          subtotal: amount, // TODO: Berechnung mit Steuern wenn nötig
          taxes: [], // TODO: Steuern hinzufügen wenn nötig
          tip_amount: 0
        },
        reference: reference,
        description: paymentDescription,
        // payment_methods: optional - Array von Methoden (z.B. ["PSE", "CREDIT_CARD"])
      };

      // callback_url ist optional, aber wenn gesetzt muss es https:// sein
      // Die API akzeptiert keine http:// URLs (insbesondere nicht localhost)
      const appUrl = process.env.APP_URL;
      if (appUrl && appUrl.startsWith('https://')) {
        payload.callback_url = `${appUrl}/api/bold-payment/webhook`;
      }
      // Für Sandbox/Development ohne https:// URL wird callback_url weggelassen

      // Endpoint: POST /online/link/v1
      const response = await this.axiosInstance.post<{
        payload?: {
          payment_link: string;
          url: string;
        };
        errors?: any[];
      }>(
        '/online/link/v1',
        payload
      );

      // Response-Struktur: { payload: { payment_link: "LNK_...", url: "https://..." }, errors: [] }
      const paymentLinkUrl = response.data.payload?.url;
      const paymentLinkId = response.data.payload?.payment_link;

      if (paymentLinkUrl) {
        // Speichere Payment Link in Reservierung
        await prisma.reservation.update({
          where: { id: reservation.id },
          data: { 
            paymentLink: paymentLinkUrl,
            // Optional: paymentLinkId speichern falls Feld existiert
          }
        });

        return paymentLinkUrl;
      }

      // Fehlerbehandlung
      if (response.data.errors && response.data.errors.length > 0) {
        const errorMessages = response.data.errors.map((e: any) => 
          e.message || JSON.stringify(e)
        ).join(', ');
        throw new Error(`Bold Payment Fehler: ${errorMessages}`);
      }

      throw new Error('Ungültige Antwort von Bold Payment API');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        const status = axiosError.response?.status;
        const errorMessage = axiosError.response?.data?.errors?.[0]?.message ||
          axiosError.response?.data?.message ||
          axiosError.message;
        
        // Spezifische Fehlermeldung für 403 Forbidden
        if (status === 403) {
          throw new Error(
            `Bold Payment API Fehler (403 Forbidden): ${errorMessage}\n` +
            `Bitte prüfen Sie im Bold Payment Dashboard:\n` +
            `1. Ist die "API Link de pagos" aktiviert?\n` +
            `2. Haben die Keys (Llave de identidad) die richtigen Berechtigungen?\n` +
            `3. Sind die Keys für die richtige Umgebung (Sandbox/Production) aktiviert?\n` +
            `4. Wird die "Llave de identidad" (Identity Key) korrekt verwendet?`
          );
        }
        
        throw new Error(`Bold Payment API Fehler: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Ruft den Status eines Zahlungslinks ab
   * 
   * Verwendet die "API Link de pagos" (Botón de pagos) von Bold Payment.
   * Endpoint: GET /online/link/v1/{payment_link}
   * 
   * @param paymentLinkId - Payment Link ID (z.B. "LNK_H7S4xxx")
   * @returns Payment Link Status und Daten
   */
  async getPaymentStatus(paymentLinkId: string): Promise<any> {
    // Lade Settings falls noch nicht geladen
    if (!this.merchantId) {
      await this.loadSettings();
    }

    try {
      // Endpoint: GET /online/link/v1/{payment_link}
      const response = await this.axiosInstance.get<{
        api_version?: number;
        id?: string;
        total?: number;
        subtotal?: number;
        tip_amount?: number;
        taxes?: Array<{ type: string; base: number; value: number }>;
        status?: 'ACTIVE' | 'PROCESSING' | 'PAID' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
        expiration_date?: number | null;
        creation_date?: number;
        description?: string | null;
        payment_method?: string;
        transaction_id?: string | null;
        amount_type?: 'OPEN' | 'CLOSE';
        is_sandbox?: boolean;
        reference?: string;
      }>(
        `/online/link/v1/${paymentLinkId}`
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        if (axiosError.response?.status === 404) {
          throw new Error('Zahlungslink nicht gefunden');
        }
        const errorMessage = axiosError.response?.data?.errors?.[0]?.message ||
          axiosError.response?.data?.message ||
          axiosError.message;
        throw new Error(`Bold Payment API Fehler: ${errorMessage}`);
      }
      throw error;
    }
  }

  /**
   * Verarbeitet einen Webhook von Bold Payment
   * 
   * @param payload - Webhook-Payload
   */
  async handleWebhook(payload: any): Promise<void> {
    try {
      const { event, data } = payload;

      console.log(`[Bold Payment Webhook] Event: ${event}`, data);

      // Finde Reservierung basierend auf Metadata oder Reference
      const reservationId = data.metadata?.reservation_id || 
        (data.reference ? parseInt(data.reference.replace('RES-', '')) : null);

      if (!reservationId) {
        console.warn('[Bold Payment Webhook] Reservierungs-ID nicht gefunden im Webhook');
        return;
      }

      const reservation = await prisma.reservation.findUnique({
        where: { id: reservationId }
      });

      if (!reservation) {
        console.warn(`[Bold Payment Webhook] Reservierung ${reservationId} nicht gefunden`);
        return;
      }

      // Aktualisiere Payment Status basierend auf Event
      switch (event) {
        case 'payment.paid':
        case 'payment.completed':
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { paymentStatus: 'paid' as any }
          });
          break;

        case 'payment.partially_paid':
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { paymentStatus: 'partially_paid' as any }
          });
          break;

        case 'payment.refunded':
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { paymentStatus: 'refunded' as any }
          });
          break;

        case 'payment.failed':
        case 'payment.cancelled':
          // Status bleibt "pending"
          break;

        default:
          console.log(`[Bold Payment Webhook] Unbekanntes Event: ${event}`);
      }
    } catch (error) {
      console.error('[Bold Payment Webhook] Fehler beim Verarbeiten:', error);
      throw error;
    }
  }
}


