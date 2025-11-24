import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Reservation } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from '../utils/encryption';
import { WhatsAppService } from './whatsappService';
import { TTLockService } from './ttlockService';
import { prisma } from '../utils/prisma';

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
  private organizationId?: number;
  private branchId?: number;
  private apiKey?: string;
  private merchantId?: string;
  private environment: 'sandbox' | 'production' = 'sandbox';
  private apiUrl: string;
  private axiosInstance: AxiosInstance;

  /**
   * Erstellt eine neue Bold Payment Service-Instanz
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
      baseURL: 'https://sandbox.bold.co', // Placeholder, wird in loadSettings überschrieben
      timeout: 30000
    });
  }

  /**
   * Lädt Bold Payment Settings aus Branch oder Organisation (mit Fallback)
   * Muss vor jedem API-Call aufgerufen werden
   */
  private async loadSettings(): Promise<void> {
    // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
    if (this.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: this.branchId },
        select: { 
          boldPaymentSettings: true, 
          organizationId: true 
        }
      });

      if (branch?.boldPaymentSettings) {
        try {
          const settings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
          const boldPaymentSettings = settings?.boldPayment || settings;

          if (boldPaymentSettings?.apiKey) {
            this.apiKey = boldPaymentSettings.apiKey;
            this.merchantId = boldPaymentSettings.merchantId;
            this.environment = boldPaymentSettings.environment || 'sandbox';
            this.apiUrl = 'https://integrations.api.bold.co';
            this.axiosInstance = this.createAxiosInstance();
            console.log(`[BoldPayment] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
            return; // Erfolgreich geladen
          }
        } catch (error) {
          console.warn(`[BoldPayment] Fehler beim Laden der Branch Settings:`, error);
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
    this.apiUrl = 'https://integrations.api.bold.co';
    this.axiosInstance = this.createAxiosInstance();
      return;
    }

    throw new Error('Bold Payment Settings nicht gefunden (weder Branch noch Organization)');
  }

  /**
   * Statische Factory-Methode: Erstellt Service für Branch
   * 
   * @param branchId - ID des Branches
   * @returns BoldPaymentService-Instanz
   */
  static async createForBranch(branchId: number): Promise<BoldPaymentService> {
    const service = new BoldPaymentService(undefined, branchId);
    await service.loadSettings();
    return service;
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
      // Mindestbeträge je nach Währung (basierend auf typischen Payment-Provider-Anforderungen)
      const MIN_AMOUNTS: Record<string, number> = {
        'COP': 10000,  // Kolumbien: Mindestens 10.000 COP (ca. 2-3 USD)
        'USD': 1,      // USA: Mindestens 1 USD
        'EUR': 1,      // Europa: Mindestens 1 EUR
      };

      const minAmount = MIN_AMOUNTS[currency] || 1;
      if (amount < minAmount) {
        throw new Error(
          `Betrag zu niedrig: ${amount} ${currency}. Mindestbetrag: ${minAmount} ${currency}`
        );
      }

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

      // Logge Payload für Debugging
      console.log('[Bold Payment] Payload:', JSON.stringify(payload, null, 2));

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
        const responseData = axiosError.response?.data;
        
        // Detailliertes Logging
        console.error('[Bold Payment] API Error Details:');
        console.error('  Status:', status);
        console.error('  Status Text:', axiosError.response?.statusText);
        console.error('  Response Data:', JSON.stringify(responseData, null, 2));
        
        // Extrahiere Fehlermeldungen
        let errorMessage = 'Unbekannter Fehler';
        if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          const errors = responseData.errors.map((e: any) => {
            if (typeof e === 'string') return e;
            if (e.message) return e.message;
            if (e.code) return `Code ${e.code}: ${e.message || JSON.stringify(e)}`;
            return JSON.stringify(e);
          });
          errorMessage = errors.join('; ');
          console.error('  Errors:', errors);
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (axiosError.message) {
          errorMessage = axiosError.message;
        }
        
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
        
        // Spezifische Fehlermeldung für 400 Bad Request
        if (status === 400) {
          throw new Error(
            `Bold Payment API Fehler (400 Bad Request): ${errorMessage}\n` +
            `Bitte prüfen Sie:\n` +
            `1. Sind alle erforderlichen Felder im Payload vorhanden?\n` +
            `2. Ist das Betragsformat korrekt?\n` +
            `3. Ist die Währung gültig?\n` +
            `4. Ist die Referenz eindeutig?\n` +
            `5. Details: ${JSON.stringify(responseData, null, 2)}`
          );
        }
        
        throw new Error(`Bold Payment API Fehler (${status}): ${errorMessage}`);
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
      // Reference-Format: "RES-{id}-{timestamp}" → extrahiere nur die ID
      let reservationId: number | null = null;
      
      if (data.metadata?.reservation_id) {
        reservationId = parseInt(String(data.metadata.reservation_id), 10);
      } else if (data.reference) {
        // Reference-Format: "RES-123-1704067200000" → extrahiere "123"
        const match = String(data.reference).match(/^RES-(\d+)-/);
        if (match && match[1]) {
          reservationId = parseInt(match[1], 10);
        }
      }

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
          // Aktualisiere Payment Status
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { paymentStatus: 'paid' as any }
          });
          
          // Prüfe ob Gast bereits eingecheckt ist
          const isAlreadyCheckedIn = reservation.status === 'checked_in';
          
          // Wenn bereits eingecheckt, aktualisiere Status nicht erneut
          // Aber sende trotzdem TTLock-Code wenn noch nicht vorhanden

          // Nach Zahlung: Erstelle TTLock Code und sende WhatsApp-Nachricht
          try {
            // Hole aktualisierte Reservierung mit Organisation und Branch
            const updatedReservation = await prisma.reservation.findUnique({
              where: { id: reservation.id },
              include: { organization: true, branch: true }
            });

            if (!updatedReservation) {
              console.warn(`[Bold Payment Webhook] Reservierung ${reservation.id} nicht gefunden nach Update`);
              break;
            }
            
            // Wenn noch nicht eingecheckt und Check-in-Datum erreicht/überschritten, setze Status auf checked_in
            const shouldAutoCheckIn = !isAlreadyCheckedIn && 
              updatedReservation.checkInDate && 
              new Date(updatedReservation.checkInDate) <= new Date();
            
            if (shouldAutoCheckIn) {
              await prisma.reservation.update({
                where: { id: reservation.id },
                data: { 
                  status: 'checked_in' as any,
                  onlineCheckInCompleted: true,
                  onlineCheckInCompletedAt: new Date()
                }
              });
              console.log(`[Bold Payment Webhook] ✅ Auto-Check-in durchgeführt für Reservierung ${reservation.id} (Zahlung erhalten)`);
            }

            // Erstelle TTLock Passcode (wenn konfiguriert und Kontaktinfo vorhanden)
            // TTLock-Code sollte auch erstellt werden, wenn nur Email vorhanden ist
            if (updatedReservation.guestPhone || updatedReservation.guestEmail) {
              let ttlockCode: string | null = null;
              
              try {
                const ttlockService = updatedReservation.branchId
                  ? await TTLockService.createForBranch(updatedReservation.branchId)
                  : new TTLockService(updatedReservation.organizationId);
                
                // Lade Settings aus Branch oder Organisation (WICHTIG: Entschlüsseln!)
                let doorSystemSettings: any = null;
                if (updatedReservation.branchId && updatedReservation.branch?.doorSystemSettings) {
                  const { decryptBranchApiSettings } = await import('../utils/encryption');
                  const branchSettings = decryptBranchApiSettings(updatedReservation.branch.doorSystemSettings as any);
                  doorSystemSettings = branchSettings?.doorSystem || branchSettings;
                } else {
                  const { decryptApiSettings } = await import('../utils/encryption');
                  const settings = decryptApiSettings(updatedReservation.organization.settings as any);
                  doorSystemSettings = settings?.doorSystem;
                }

                if (doorSystemSettings?.lockIds && doorSystemSettings.lockIds.length > 0) {
                  const lockId = doorSystemSettings.lockIds[0];
                  
                  // Erstelle temporären Passcode (30 Tage gültig)
                  const startDate = new Date();
                  const endDate = new Date();
                  endDate.setDate(endDate.getDate() + 30);
                  
                  ttlockCode = await ttlockService.createTemporaryPasscode(
                    lockId,
                    startDate,
                    endDate,
                    `Guest: ${updatedReservation.guestName}`
                  );

                  // Speichere TTLock Code in Reservierung
                  await prisma.reservation.update({
                    where: { id: reservation.id },
                    data: {
                      doorPin: ttlockCode,
                      doorAppName: 'TTLock',
                      ttlLockId: lockId,
                      ttlLockPassword: ttlockCode
                    }
                  });

                  console.log(`[Bold Payment Webhook] TTLock Code erstellt für Reservierung ${reservation.id}`);
                  
                  // Log erfolgreiche TTLock-Code-Erstellung
                  try {
                    await prisma.reservationNotificationLog.create({
                      data: {
                        reservationId: reservation.id,
                        notificationType: 'pin',
                        channel: updatedReservation.guestPhone && updatedReservation.guestEmail ? 'both' : (updatedReservation.guestPhone ? 'whatsapp' : 'email'),
                        success: true,
                        sentAt: new Date(),
                        message: `TTLock Code erstellt: ${ttlockCode}`
                      }
                    });
                  } catch (logError) {
                    console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für TTLock-Code:', logError);
                  }
                } else {
                  // Log: Keine Lock IDs konfiguriert
                  try {
                    await prisma.reservationNotificationLog.create({
                      data: {
                        reservationId: reservation.id,
                        notificationType: 'pin',
                        channel: updatedReservation.guestPhone && updatedReservation.guestEmail ? 'both' : (updatedReservation.guestPhone ? 'whatsapp' : 'email'),
                        success: false,
                        sentAt: new Date(),
                        errorMessage: 'TTLock Code konnte nicht erstellt werden - keine Lock IDs konfiguriert'
                      }
                    });
                  } catch (logError) {
                    console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags (keine Lock IDs):', logError);
                  }
                }
              } catch (ttlockError) {
                console.error('[Bold Payment Webhook] Fehler beim Erstellen des TTLock Passcodes:', ttlockError);
                const errorMessage = ttlockError instanceof Error ? ttlockError.message : 'Unbekannter Fehler beim Erstellen des TTLock Passcodes';
                
                // Log fehlgeschlagene TTLock-Code-Erstellung
                try {
                  await prisma.reservationNotificationLog.create({
                    data: {
                      reservationId: reservation.id,
                      notificationType: 'pin',
                      channel: updatedReservation.guestPhone && updatedReservation.guestEmail ? 'both' : (updatedReservation.guestPhone ? 'whatsapp' : 'email'),
                      success: false,
                      sentAt: new Date(),
                      errorMessage: `TTLock Code konnte nicht erstellt werden: ${errorMessage}`
                    }
                  });
                } catch (logError) {
                  console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für TTLock-Fehler:', logError);
                }
                // Weiter ohne TTLock Code
              }

              // ⚠️ TEMPORÄR DEAKTIVIERT: WhatsApp-Versendung nach TTLock-Webhook
              // TTLock-Code wird weiterhin erstellt und im Frontend angezeigt, aber nicht versendet
              console.log(`[Bold Payment Webhook] ⚠️ WhatsApp-Versendung temporär deaktiviert - TTLock-Code ${ttlockCode ? `(${ttlockCode})` : ''} wird nur im Frontend angezeigt`);
              
              // Log: Versendung deaktiviert
              try {
                await prisma.reservationNotificationLog.create({
                  data: {
                    reservationId: reservation.id,
                    notificationType: 'pin',
                    channel: 'whatsapp',
                    success: false,
                    sentAt: new Date(),
                    sentTo: updatedReservation.guestPhone || null,
                    errorMessage: 'WhatsApp-Versendung temporär deaktiviert - Code wird nur im Frontend angezeigt'
                  }
                });
              } catch (logError) {
                console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags:', logError);
              }

              // ⚠️ TEMPORÄR AUSKOMMENTIERT - WhatsApp-Versendung nach TTLock-Webhook
              // TODO: Wieder aktivieren, wenn gewünscht
              /*
              // Sende WhatsApp-Nachricht mit TTLock Code
              try {
                const whatsappService = updatedReservation.branchId
                  ? new WhatsAppService(undefined, updatedReservation.branchId)
                  : new WhatsAppService(updatedReservation.organizationId);
                
                // Wenn TTLock Code vorhanden, verwende sendCheckInConfirmation (mit Template-Fallback)
                if (ttlockCode) {
                  const roomNumber = updatedReservation.roomNumber || 'N/A';
                  const roomDescription = updatedReservation.roomDescription || 'N/A';
                  
                  console.log(`[Bold Payment Webhook] Versende Check-in-Bestätigung mit PIN für Reservierung ${reservation.id}...`);
                  const whatsappSuccess = await whatsappService.sendCheckInConfirmation(
                    updatedReservation.guestName,
                    updatedReservation.guestPhone,
                    roomNumber,
                    roomDescription,
                    ttlockCode,
                    'TTLock'
                  );
                  
                  const message = `Hola ${updatedReservation.guestName},

¡Gracias por tu pago!

Tu código de acceso TTLock:
${ttlockCode}

¡Te esperamos!`;

                  if (whatsappSuccess) {
                    // Speichere versendete Nachricht
                    await prisma.reservation.update({
                      where: { id: reservation.id },
                      data: {
                        sentMessage: message,
                        sentMessageAt: new Date()
                      }
                    });

                    console.log(`[Bold Payment Webhook] ✅ WhatsApp-Nachricht mit TTLock Code erfolgreich versendet für Reservierung ${reservation.id}`);
                    
                    // Log erfolgreiche WhatsApp-Notification
                    try {
                      await prisma.reservationNotificationLog.create({
                        data: {
                          reservationId: reservation.id,
                          notificationType: 'pin',
                          channel: 'whatsapp',
                          success: true,
                          sentAt: new Date(),
                          sentTo: updatedReservation.guestPhone,
                          message: message
                        }
                      });
                    } catch (logError) {
                      console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für WhatsApp:', logError);
                    }
                  } else {
                    console.error(`[Bold Payment Webhook] ❌ WhatsApp-Nachricht konnte nicht versendet werden (sendCheckInConfirmation gab false zurück)`);
                    
                    // Log fehlgeschlagene WhatsApp-Notification
                    try {
                      await prisma.reservationNotificationLog.create({
                        data: {
                          reservationId: reservation.id,
                          notificationType: 'pin',
                          channel: 'whatsapp',
                          success: false,
                          sentAt: new Date(),
                          sentTo: updatedReservation.guestPhone,
                          message: message,
                          errorMessage: 'WhatsApp-Nachricht konnte nicht versendet werden (sendCheckInConfirmation gab false zurück)'
                        }
                      });
                    } catch (logError) {
                      console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp:', logError);
                    }
                  }
                } else {
                  // Kein TTLock Code - sende einfache Bestätigung
                  const message = `Hola ${updatedReservation.guestName},

¡Gracias por tu pago!

¡Te esperamos!`;

                  console.log(`[Bold Payment Webhook] Versende einfache Zahlungsbestätigung (ohne PIN) für Reservierung ${reservation.id}...`);
                  // Basis-Template-Name (wird in sendMessageWithFallback basierend auf Sprache angepasst)
                  // Spanisch: reservation_checkin_invitation, Englisch: reservation_checkin_invitation_
                  const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_checkin_invitation';
                  const templateParams = [updatedReservation.guestName];
                  
                  const whatsappSuccess = await whatsappService.sendMessageWithFallback(
                    updatedReservation.guestPhone,
                    message,
                    templateName,
                    templateParams,
                    {
                      guestNationality: updatedReservation.guestNationality,
                      guestPhone: updatedReservation.guestPhone
                    }
                  );

                  if (whatsappSuccess) {
                    // Speichere versendete Nachricht
                    await prisma.reservation.update({
                      where: { id: reservation.id },
                      data: {
                        sentMessage: message,
                        sentMessageAt: new Date()
                      }
                    });
                    
                    console.log(`[Bold Payment Webhook] ✅ WhatsApp-Nachricht erfolgreich versendet für Reservierung ${reservation.id}`);
                    
                    // Log erfolgreiche WhatsApp-Notification (ohne PIN)
                    try {
                      await prisma.reservationNotificationLog.create({
                        data: {
                          reservationId: reservation.id,
                          notificationType: 'pin',
                          channel: 'whatsapp',
                          success: true,
                          sentAt: new Date(),
                          sentTo: updatedReservation.guestPhone,
                          message: message
                        }
                      });
                    } catch (logError) {
                      console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für WhatsApp:', logError);
                    }
                  } else {
                    console.error(`[Bold Payment Webhook] ❌ WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)`);
                    
                    // Log fehlgeschlagene WhatsApp-Notification
                    try {
                      await prisma.reservationNotificationLog.create({
                        data: {
                          reservationId: reservation.id,
                          notificationType: 'pin',
                          channel: 'whatsapp',
                          success: false,
                          sentAt: new Date(),
                          sentTo: updatedReservation.guestPhone,
                          message: message,
                          errorMessage: 'WhatsApp-Nachricht konnte nicht versendet werden (sendMessageWithFallback gab false zurück)'
                        }
                      });
                    } catch (logError) {
                      console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für fehlgeschlagene WhatsApp:', logError);
                    }
                  }
                }
              } catch (whatsappError) {
                console.error('[Bold Payment Webhook] ❌ Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
                const errorMessage = whatsappError instanceof Error ? whatsappError.message : 'Unbekannter Fehler beim Versenden der WhatsApp-Nachricht';
                if (whatsappError instanceof Error) {
                  console.error('[Bold Payment Webhook] Fehlermeldung:', whatsappError.message);
                  console.error('[Bold Payment Webhook] Stack:', whatsappError.stack);
                }
                
                // Log fehlgeschlagene WhatsApp-Notification
                try {
                  await prisma.reservationNotificationLog.create({
                    data: {
                      reservationId: reservation.id,
                      notificationType: 'pin',
                      channel: 'whatsapp',
                      success: false,
                      sentAt: new Date(),
                      sentTo: updatedReservation.guestPhone || null,
                      errorMessage: errorMessage
                    }
                  });
                } catch (logError) {
                  console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags für WhatsApp-Fehler:', logError);
                }
                // Fehler nicht weiterwerfen
              }
              */
            } else {
              // Keine Kontaktinfo vorhanden - Log erstellen
              try {
                await prisma.reservationNotificationLog.create({
                  data: {
                    reservationId: reservation.id,
                    notificationType: 'pin',
                    channel: 'whatsapp',
                    success: false,
                    sentAt: new Date(),
                    errorMessage: 'Keine Kontaktinformation (Telefonnummer oder E-Mail) vorhanden - TTLock-Code konnte nicht versendet werden'
                  }
                });
              } catch (logError) {
                console.error('[Bold Payment Webhook] ⚠️ Fehler beim Erstellen des Log-Eintrags (keine Kontaktinfo):', logError);
              }
            }
          } catch (error) {
            console.error('[Bold Payment Webhook] Fehler beim Verarbeiten der Zahlung (TTLock/WhatsApp):', error);
            // Fehler nicht weiterwerfen, Payment Status wurde bereits aktualisiert
          }
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


