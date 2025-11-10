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
  private organizationId: number;
  private apiKey?: string;
  private apiSecret?: string;
  private phoneNumberId?: string;
  private businessAccountId?: string;
  private provider?: 'twilio' | 'whatsapp-business-api' | 'other';
  private axiosInstance?: AxiosInstance;

  constructor(organizationId: number) {
    this.organizationId = organizationId;
  }

  /**
   * Lädt WhatsApp Settings aus der Organisation
   */
  private async loadSettings(): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error(`WhatsApp ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    const settings = decryptApiSettings(organization.settings as any);
    const whatsappSettings = settings?.whatsapp;

    if (!whatsappSettings?.apiKey) {
      throw new Error(`WhatsApp API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    this.provider = whatsappSettings.provider || 'twilio';
    this.apiKey = whatsappSettings.apiKey;
    this.apiSecret = whatsappSettings.apiSecret;
    this.phoneNumberId = whatsappSettings.phoneNumberId;
    this.businessAccountId = whatsappSettings.businessAccountId;

    // Erstelle Axios-Instanz basierend auf Provider
    this.axiosInstance = this.createAxiosInstance();
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
      await this.loadSettings();

      if (!this.axiosInstance) {
        throw new Error('WhatsApp Service nicht initialisiert');
      }

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

      const response = await this.axiosInstance.post('/messages', payload);

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error('[WhatsApp Business] API Fehler:', axiosError.response?.data);
        throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
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
}


