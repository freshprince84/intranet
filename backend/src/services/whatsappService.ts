import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../utils/encryption';

const prisma = new PrismaClient();

/**
 * WhatsApp Service für Versand von WhatsApp-Nachrichten
 * 
 * Unterstützt:
 * - Twilio WhatsApp API
 * - WhatsApp Business API
 */
export class WhatsAppService {
  private organizationId?: number;
  private branchId?: number;
  private apiKey?: string;
  private apiSecret?: string;
  private phoneNumberId?: string;
  private businessAccountId?: string;
  private provider?: 'twilio' | 'whatsapp-business-api' | 'other';
  private axiosInstance?: AxiosInstance;

  /**
   * Constructor: Akzeptiert entweder organizationId ODER branchId
   * @param organizationId - Organisation ID (für Rückwärtskompatibilität)
   * @param branchId - Branch ID (neu)
   */
  constructor(organizationId?: number, branchId?: number) {
    if (!organizationId && !branchId) {
      throw new Error('Entweder organizationId oder branchId muss angegeben werden');
    }
    this.organizationId = organizationId;
    this.branchId = branchId;
  }

  /**
   * Lädt WhatsApp Settings aus Branch oder Organisation (mit Fallback)
   */
  private async loadSettings(): Promise<void> {
    // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
    if (this.branchId) {
      console.log(`[WhatsApp Service] Lade Settings für Branch ${this.branchId}`);
      
      const branch = await prisma.branch.findUnique({
        where: { id: this.branchId },
        select: { 
          whatsappSettings: true, 
          organizationId: true 
        }
      });

      if (branch?.whatsappSettings) {
        // Branch hat eigene WhatsApp Settings
        console.log(`[WhatsApp Service] Branch hat eigene WhatsApp Settings`);
        
        try {
          // branch.whatsappSettings enthält direkt die WhatsApp Settings (nicht verschachtelt)
          // Versuche zu entschlüsseln (falls verschlüsselt)
          let whatsappSettings: any;
          try {
            // Versuche als verschachteltes Objekt zu entschlüsseln
            const decrypted = decryptApiSettings({ whatsapp: branch.whatsappSettings } as any);
            whatsappSettings = decrypted?.whatsapp;
          } catch {
            // Falls das fehlschlägt, versuche direkt zu entschlüsseln
            try {
              whatsappSettings = decryptApiSettings(branch.whatsappSettings as any);
            } catch {
              // Falls auch das fehlschlägt, verwende direkt (unverschlüsselt)
              whatsappSettings = branch.whatsappSettings as any;
            }
          }

          // Falls immer noch verschachtelt, extrahiere whatsapp
          if (whatsappSettings?.whatsapp) {
            whatsappSettings = whatsappSettings.whatsapp;
          }

          if (whatsappSettings?.apiKey) {
            this.provider = whatsappSettings.provider || 'twilio';
            this.apiKey = whatsappSettings.apiKey;
            this.apiSecret = whatsappSettings.apiSecret;
            this.phoneNumberId = whatsappSettings.phoneNumberId;
            this.businessAccountId = whatsappSettings.businessAccountId;

            console.log(`[WhatsApp Service] Branch Settings geladen:`, {
              provider: this.provider,
              hasApiKey: !!this.apiKey,
              phoneNumberId: this.phoneNumberId
            });

            this.axiosInstance = this.createAxiosInstance();
            return; // Erfolgreich geladen
          } else {
            console.warn(`[WhatsApp Service] Branch Settings gefunden, aber kein API Key vorhanden`);
          }
        } catch (error) {
          console.warn(`[WhatsApp Service] Fehler beim Laden der Branch Settings:`, error);
          // Fallback auf Organization Settings
        }

        // Fallback: Lade Organization Settings
        if (branch.organizationId) {
          console.log(`[WhatsApp Service] Fallback: Lade Organization Settings für Organisation ${branch.organizationId}`);
          this.organizationId = branch.organizationId;
        }
      } else if (branch?.organizationId) {
        // Branch hat keine Settings, aber Organization ID
        console.log(`[WhatsApp Service] Branch hat keine WhatsApp Settings, verwende Organization ${branch.organizationId}`);
        this.organizationId = branch.organizationId;
      }
    }

    // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
    if (this.organizationId) {
    console.log(`[WhatsApp Service] Lade Settings für Organisation ${this.organizationId}`);
    
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      console.error(`[WhatsApp Service] Keine Settings für Organisation ${this.organizationId} gefunden`);
      throw new Error(`WhatsApp ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    // Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.warn('[WhatsApp Service] ⚠️ ENCRYPTION_KEY nicht gesetzt - versuche Settings ohne Entschlüsselung zu laden');
    } else {
      console.log(`[WhatsApp Service] ENCRYPTION_KEY ist gesetzt (Länge: ${encryptionKey.length})`);
    }

    try {
      const settings = decryptApiSettings(organization.settings as any);
      const whatsappSettings = settings?.whatsapp;

      console.log(`[WhatsApp Service] WhatsApp Settings geladen:`, {
        provider: whatsappSettings?.provider,
        hasApiKey: !!whatsappSettings?.apiKey,
        apiKeyLength: whatsappSettings?.apiKey?.length || 0,
        hasPhoneNumberId: !!whatsappSettings?.phoneNumberId,
        phoneNumberId: whatsappSettings?.phoneNumberId
      });

      if (!whatsappSettings?.apiKey) {
        console.error(`[WhatsApp Service] WhatsApp API Key fehlt für Organisation ${this.organizationId}`);
        throw new Error(`WhatsApp API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
      }

      this.provider = whatsappSettings.provider || 'twilio';
      this.apiKey = whatsappSettings.apiKey;
      this.apiSecret = whatsappSettings.apiSecret;
      this.phoneNumberId = whatsappSettings.phoneNumberId;
      this.businessAccountId = whatsappSettings.businessAccountId;

      console.log(`[WhatsApp Service] Provider: ${this.provider}, Phone Number ID: ${this.phoneNumberId}`);

      // Erstelle Axios-Instanz basierend auf Provider
      this.axiosInstance = this.createAxiosInstance();
        return; // Erfolgreich geladen
    } catch (error) {
      console.error('[WhatsApp Service] Fehler beim Laden der Settings:', error);
      if (error instanceof Error) {
        console.error('[WhatsApp Service] Fehlermeldung:', error.message);
        console.error('[WhatsApp Service] Stack:', error.stack);
      }
      throw error;
    }
    }

    // Falls wir hier ankommen, wurde nichts gefunden
    throw new Error('WhatsApp Settings nicht gefunden (weder Branch noch Organization)');
  }

  /**
   * Erstellt eine konfigurierte Axios-Instanz für WhatsApp API-Requests
   */
  private createAxiosInstance(): AxiosInstance {
    if (this.provider === 'twilio') {
      // Twilio WhatsApp API
      return axios.create({
        baseURL: 'https://api.twilio.com/2010-04-01',
        timeout: 30000,
        auth: {
          username: this.apiKey || '',
          password: this.apiSecret || ''
        }
      });
    } else if (this.provider === 'whatsapp-business-api') {
      // WhatsApp Business API
      return axios.create({
        baseURL: `https://graph.facebook.com/v18.0/${this.phoneNumberId}`,
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
    } else {
      throw new Error(`Unbekannter WhatsApp Provider: ${this.provider}`);
    }
  }

  /**
   * Sendet eine WhatsApp-Nachricht
   * 
   * @param to - Telefonnummer des Empfängers (mit Ländercode, z.B. +573001234567)
   * @param message - Nachrichtentext
   * @param template - Optional: Template-Name (für WhatsApp Business API)
   * @returns true wenn erfolgreich
   */
  async sendMessage(to: string, message: string, template?: string): Promise<boolean> {
    try {
      console.log(`[WhatsApp Service] sendMessage aufgerufen für: ${to}`);
      await this.loadSettings();

      if (!this.axiosInstance) {
        console.error('[WhatsApp Service] Axios-Instanz nicht initialisiert');
        throw new Error('WhatsApp Service nicht initialisiert');
      }

      if (!this.apiKey) {
        console.error('[WhatsApp Service] API Key nicht gesetzt');
        throw new Error('WhatsApp API Key nicht gesetzt');
      }

      console.log(`[WhatsApp Service] Sende Nachricht via ${this.provider}...`);

      // Normalisiere Telefonnummer (entferne Leerzeichen, füge + hinzu falls fehlt)
      const normalizedPhone = this.normalizePhoneNumber(to);

      if (this.provider === 'twilio') {
        return await this.sendViaTwilio(normalizedPhone, message);
      } else if (this.provider === 'whatsapp-business-api') {
        return await this.sendViaWhatsAppBusiness(normalizedPhone, message, template);
      } else {
        throw new Error(`Unbekannter Provider: ${this.provider}`);
      }
    } catch (error) {
      console.error('[WhatsApp] Fehler beim Versenden:', error);
      throw error;
    }
  }

  /**
   * Sendet Nachricht über Twilio
   */
  private async sendViaTwilio(to: string, message: string): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('Twilio Service nicht initialisiert');
    }

    // Twilio Account SID ist der API Key
    const accountSid = this.apiKey;
    const fromNumber = this.phoneNumberId || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    try {
      const response = await this.axiosInstance.post(
        `/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({
          From: fromNumber,
          To: `whatsapp:${to}`,
          Body: message
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return response.status === 201;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('[WhatsApp Twilio] API Fehler:', axiosError.response?.data);
        throw new Error(`Twilio API Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Sendet Nachricht über WhatsApp Business API
   */
  private async sendViaWhatsAppBusiness(to: string, message: string, template?: string): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('WhatsApp Business Service nicht initialisiert');
    }

    if (!this.phoneNumberId) {
      console.error('[WhatsApp Business] Phone Number ID fehlt!');
      throw new Error('WhatsApp Phone Number ID ist nicht konfiguriert');
    }

    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };

      // Wenn Template angegeben, verwende Template-Nachricht
      if (template) {
        payload.type = 'template';
        payload.template = {
          name: template,
          language: { code: 'es' } // Standard: Spanisch
        };
      }

      console.log(`[WhatsApp Business] Sende Nachricht an ${to} via Phone Number ID ${this.phoneNumberId}`);
      console.log(`[WhatsApp Business] Payload:`, JSON.stringify(payload, null, 2));
      console.log(`[WhatsApp Business] Base URL:`, this.axiosInstance.defaults.baseURL);
      const authHeader = this.axiosInstance.defaults.headers?.['Authorization'] as string;
      if (authHeader) {
        console.log(`[WhatsApp Business] Authorization Header Länge: ${authHeader.length}`);
        console.log(`[WhatsApp Business] Authorization Header Vorschau: ${authHeader.substring(0, 50)}...`);
        console.log(`[WhatsApp Business] Token Start: ${authHeader.substring(7, 30)}...`);
        console.log(`[WhatsApp Business] Token Ende: ...${authHeader.substring(authHeader.length - 20)}`);
      } else {
        console.error(`[WhatsApp Business] ⚠️ Authorization Header fehlt!`);
      }

      const response = await this.axiosInstance.post('/messages', payload);

      console.log(`[WhatsApp Business] ✅ Nachricht erfolgreich gesendet. Status: ${response.status}`);
      console.log(`[WhatsApp Business] Response:`, JSON.stringify(response.data, null, 2));

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('[WhatsApp Business] API Fehler Details:');
        console.error('  Status:', axiosError.response?.status);
        console.error('  Status Text:', axiosError.response?.statusText);
        console.error('  Response Data:', JSON.stringify(axiosError.response?.data, null, 2));
        console.error('  Request URL:', axiosError.config?.url);
        console.error('  Request Method:', axiosError.config?.method);
        console.error('  Request Headers:', JSON.stringify(axiosError.config?.headers, null, 2));
        throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
      console.error('[WhatsApp Business] Unbekannter Fehler:', error);
      throw error;
    }
  }

  /**
   * Normalisiert Telefonnummer (entfernt Leerzeichen, fügt + hinzu)
   */
  private normalizePhoneNumber(phone: string): string {
    // Entferne alle Leerzeichen und Bindestriche
    let normalized = phone.replace(/[\s-]/g, '');

    // Füge + hinzu falls nicht vorhanden
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Sendet Check-in-Einladung per WhatsApp
   * 
   * @param guestName - Name des Gastes
   * @param guestPhone - Telefonnummer des Gastes
   * @param checkInLink - Link zum Online-Check-in
   * @param paymentLink - Link zur Zahlung (Bold Payment)
   * @returns true wenn erfolgreich
   */
  async sendCheckInInvitation(
    guestName: string,
    guestPhone: string,
    checkInLink: string,
    paymentLink: string
  ): Promise<boolean> {
    const message = `Hola ${guestName},

¡Nos complace darte la bienvenida a La Familia Hostel!

Como llegarás después de las 22:00, puedes realizar el check-in en línea ahora:

${checkInLink}

Por favor, realiza el pago por adelantado:
${paymentLink}

¡Te esperamos mañana!`;

    return await this.sendMessage(guestPhone, message);
  }

  /**
   * Sendet Check-in-Bestätigung per WhatsApp
   * 
   * @param guestName - Name des Gastes
   * @param guestPhone - Telefonnummer des Gastes
   * @param roomNumber - Zimmernummer
   * @param roomDescription - Zimmerbeschreibung
   * @param doorPin - PIN für Türsystem
   * @param doorAppName - App-Name (z.B. "TTLock")
   * @returns true wenn erfolgreich
   */
  async sendCheckInConfirmation(
    guestName: string,
    guestPhone: string,
    roomNumber: string,
    roomDescription: string,
    doorPin: string,
    doorAppName: string
  ): Promise<boolean> {
    const message = `Hola ${guestName},

¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${roomNumber}
- Descripción: ${roomDescription}

Acceso:
- PIN de la puerta: ${doorPin}
- App: ${doorAppName}

¡Te deseamos una estancia agradable!`;

    return await this.sendMessage(guestPhone, message);
  }

  /**
   * Statische Methode: Erstellt Service für Branch
   * @param branchId - Branch ID
   * @returns WhatsAppService-Instanz
   */
  static async getServiceForBranch(branchId: number): Promise<WhatsAppService> {
    const service = new WhatsAppService(undefined, branchId);
    await service.loadSettings();
    return service;
  }

  /**
   * Statische Methode: Erstellt Service für Organization (Rückwärtskompatibel)
   * @param organizationId - Organization ID
   * @returns WhatsAppService-Instanz
   */
  static async getServiceForOrganization(organizationId: number): Promise<WhatsAppService> {
    const service = new WhatsAppService(organizationId);
    await service.loadSettings();
    return service;
  }

  /**
   * Lädt Media von der WhatsApp Business API herunter
   * @param mediaId - Media ID von WhatsApp
   * @returns Buffer mit den Mediendaten und MIME-Type
   */
  async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    try {
      await this.loadSettings();

      if (this.provider !== 'whatsapp-business-api') {
        throw new Error('Media-Download nur für WhatsApp Business API unterstützt');
      }

      if (!this.axiosInstance || !this.apiKey) {
        throw new Error('WhatsApp Service nicht initialisiert');
      }

      console.log(`[WhatsApp Service] Lade Media ${mediaId} herunter...`);

      // Schritt 1: Hole Media-URL
      // WhatsApp Business API Endpoint: GET https://graph.facebook.com/v18.0/{media-id}
      // Erstelle separate Axios-Instanz für Media-Download (baseURL enthält phoneNumberId, was hier nicht benötigt wird)
      const mediaApiClient = axios.create({
        baseURL: 'https://graph.facebook.com/v18.0',
        timeout: 30000,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const mediaInfoResponse = await mediaApiClient.get(`/${mediaId}`);

      const mediaUrl = mediaInfoResponse.data.url;
      const mimeType = mediaInfoResponse.data.mime_type || 'image/jpeg';
      const fileName = mediaInfoResponse.data.filename || `whatsapp-media-${mediaId}.${this.getFileExtension(mimeType)}`;

      console.log(`[WhatsApp Service] Media-URL erhalten: ${mediaUrl.substring(0, 50)}...`);

      // Schritt 2: Lade die tatsächliche Datei herunter
      const mediaResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const buffer = Buffer.from(mediaResponse.data);

      console.log(`[WhatsApp Service] Media heruntergeladen: ${buffer.length} bytes, Type: ${mimeType}`);

      return {
        buffer,
        mimeType,
        fileName
      };
    } catch (error) {
      console.error('[WhatsApp Service] Fehler beim Herunterladen von Media:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('[WhatsApp Service] API Fehler:', axiosError.response?.data);
        throw new Error(`WhatsApp Media Download Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Hilfsmethode: Ermittelt Dateiendung aus MIME-Type
   */
  private getFileExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg'
    };
    return mimeToExt[mimeType] || 'bin';
  }
}


