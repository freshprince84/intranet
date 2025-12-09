import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../utils/encryption';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

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
      logger.log(`[WhatsApp Service] Lade Settings für Branch ${this.branchId}`);
      
      const branch = await prisma.branch.findUnique({
        where: { id: this.branchId },
        select: { 
          whatsappSettings: true, 
          organizationId: true 
        }
      });

      if (branch?.whatsappSettings) {
        // Branch hat eigene WhatsApp Settings
        logger.log(`[WhatsApp Service] Branch hat eigene WhatsApp Settings`);
        
        try {
          // branch.whatsappSettings enthält direkt die WhatsApp Settings (kann verschachtelt sein)
          // Verwende decryptBranchApiSettings für Branch Settings (entschlüsselt verschachtelte Settings)
          const decrypted = decryptBranchApiSettings(branch.whatsappSettings as any);
          // WhatsApp Settings können direkt im Root sein oder verschachtelt in whatsapp
          let whatsappSettings = decrypted?.whatsapp || decrypted;

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

            logger.log(`[WhatsApp Service] Branch Settings geladen:`, {
              provider: this.provider,
              hasApiKey: !!this.apiKey,
              phoneNumberId: this.phoneNumberId
            });

            this.axiosInstance = this.createAxiosInstance();
            return; // Erfolgreich geladen
          } else {
            logger.warn(`[WhatsApp Service] Branch Settings gefunden, aber kein API Key vorhanden`);
          }
        } catch (error) {
          logger.warn(`[WhatsApp Service] Fehler beim Laden der Branch Settings:`, error);
          // Fallback auf Organization Settings
        }

        // Fallback: Lade Organization Settings
        if (branch.organizationId) {
          logger.log(`[WhatsApp Service] Fallback: Lade Organization Settings für Organisation ${branch.organizationId}`);
          this.organizationId = branch.organizationId;
        }
      } else if (branch?.organizationId) {
        // Branch hat keine Settings, aber Organization ID
        logger.log(`[WhatsApp Service] Branch hat keine WhatsApp Settings, verwende Organization ${branch.organizationId}`);
        this.organizationId = branch.organizationId;
      }
    }

    // 2. Lade Organization Settings (Fallback oder wenn nur organizationId)
    if (this.organizationId) {
    logger.log(`[WhatsApp Service] Lade Settings für Organisation ${this.organizationId}`);
    
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      logger.error(`[WhatsApp Service] Keine Settings für Organisation ${this.organizationId} gefunden`);
      throw new Error(`WhatsApp ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    // Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      logger.warn('[WhatsApp Service] ⚠️ ENCRYPTION_KEY nicht gesetzt - versuche Settings ohne Entschlüsselung zu laden');
    } else {
      logger.log(`[WhatsApp Service] ENCRYPTION_KEY ist gesetzt (Länge: ${encryptionKey.length})`);
    }

    try {
      const settings = decryptApiSettings(organization.settings as any);
      const whatsappSettings = settings?.whatsapp;

      logger.log(`[WhatsApp Service] WhatsApp Settings geladen:`, {
        provider: whatsappSettings?.provider,
        hasApiKey: !!whatsappSettings?.apiKey,
        apiKeyLength: whatsappSettings?.apiKey?.length || 0,
        apiKeyContainsColon: whatsappSettings?.apiKey?.includes(':') || false,
        apiKeyStart: whatsappSettings?.apiKey?.substring(0, 30) || 'N/A',
        hasPhoneNumberId: !!whatsappSettings?.phoneNumberId,
        phoneNumberId: whatsappSettings?.phoneNumberId
      });

      if (!whatsappSettings?.apiKey) {
        logger.error(`[WhatsApp Service] WhatsApp API Key fehlt für Organisation ${this.organizationId}`);
        throw new Error(`WhatsApp API Key ist nicht für Organisation ${this.organizationId} konfiguriert`);
      }

      this.provider = whatsappSettings.provider || 'twilio';
      this.apiKey = whatsappSettings.apiKey;
      this.apiSecret = whatsappSettings.apiSecret;
      this.phoneNumberId = whatsappSettings.phoneNumberId;
      this.businessAccountId = whatsappSettings.businessAccountId;

      logger.log(`[WhatsApp Service] Provider: ${this.provider}, Phone Number ID: ${this.phoneNumberId}`);

      // Erstelle Axios-Instanz basierend auf Provider
      this.axiosInstance = this.createAxiosInstance();
        return; // Erfolgreich geladen
    } catch (error) {
      logger.error('[WhatsApp Service] Fehler beim Laden der Settings:', error);
      if (error instanceof Error) {
        logger.error('[WhatsApp Service] Fehlermeldung:', error.message);
        logger.error('[WhatsApp Service] Stack:', error.stack);
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
   * @param to - Telefonnummer des Empfängers (mit Ländercode, z.B. +573001234567) oder Group ID (z.B. 120363123456789012@g.us)
   * @param message - Nachrichtentext
   * @param template - Optional: Template-Name (für WhatsApp Business API)
   * @param groupId - Optional: Group ID für Gruppen-Nachrichten (falls to bereits Group ID ist, wird dieser Parameter ignoriert)
   * @returns true wenn erfolgreich
   */
  async sendMessage(to: string, message: string, template?: string, groupId?: string): Promise<boolean> {
    try {
      logger.log(`[WhatsApp Service] sendMessage aufgerufen für: ${to}`);
      await this.loadSettings();

      if (!this.axiosInstance) {
        logger.error('[WhatsApp Service] Axios-Instanz nicht initialisiert');
        throw new Error('WhatsApp Service nicht initialisiert');
      }

      if (!this.apiKey) {
        logger.error('[WhatsApp Service] API Key nicht gesetzt');
        throw new Error('WhatsApp API Key nicht gesetzt');
      }

      logger.log(`[WhatsApp Service] Sende Nachricht via ${this.provider}...`);

      // Prüfe ob es eine Gruppen-Nachricht ist
      const isGroupMessage = groupId || (to.includes('@g.us'));
      const targetGroupId = groupId || (isGroupMessage ? to : null);
      
      if (isGroupMessage && targetGroupId) {
        // Gruppen-Nachricht
        logger.log(`[WhatsApp Service] Sende Gruppen-Nachricht an: ${targetGroupId}`);
        if (this.provider === 'whatsapp-business-api') {
          return await this.sendViaWhatsAppBusiness(targetGroupId, message, template, undefined, undefined, true);
        } else {
          throw new Error('Gruppen-Nachrichten werden nur mit WhatsApp Business API unterstützt');
        }
      } else {
        // Einzel-Chat
        // Normalisiere Telefonnummer (entferne Leerzeichen, füge + hinzu falls fehlt)
        const normalizedPhone = this.normalizePhoneNumber(to);

        if (this.provider === 'twilio') {
          return await this.sendViaTwilio(normalizedPhone, message);
        } else if (this.provider === 'whatsapp-business-api') {
          return await this.sendViaWhatsAppBusiness(normalizedPhone, message, template);
        } else {
          throw new Error(`Unbekannter Provider: ${this.provider}`);
        }
      }
    } catch (error) {
      logger.error('[WhatsApp] Fehler beim Versenden:', error);
      throw error;
    }
  }

  /**
   * Sendet ein Bild via WhatsApp
   */
  async sendImage(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    try {
      logger.log(`[WhatsApp Service] sendImage aufgerufen für: ${to}, Bild: ${imageUrl}`);
      await this.loadSettings();

      if (!this.axiosInstance) {
        logger.error('[WhatsApp Service] Axios-Instanz nicht initialisiert');
        throw new Error('WhatsApp Service nicht initialisiert');
      }

      if (!this.apiKey) {
        logger.error('[WhatsApp Service] API Key nicht gesetzt');
        throw new Error('WhatsApp API Key nicht gesetzt');
      }

      logger.log(`[WhatsApp Service] Sende Bild via ${this.provider}...`);

      // Normalisiere Telefonnummer
      const normalizedPhone = this.normalizePhoneNumber(to);

      if (this.provider === 'twilio') {
        // Twilio unterstützt Media Messages
        return await this.sendImageViaTwilio(normalizedPhone, imageUrl, caption);
      } else if (this.provider === 'whatsapp-business-api') {
        return await this.sendImageViaWhatsAppBusiness(normalizedPhone, imageUrl, caption);
      } else {
        throw new Error(`Unbekannter Provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error('[WhatsApp] Fehler beim Versenden des Bildes:', error);
      throw error;
    }
  }

  /**
   * Sendet Bild über Twilio
   */
  private async sendImageViaTwilio(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('Twilio Service nicht initialisiert');
    }

    const accountSid = this.apiKey;
    const fromNumber = this.phoneNumberId || process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

    try {
      const params: any = {
        From: fromNumber,
        To: `whatsapp:${to}`,
        MediaUrl: imageUrl
      };

      if (caption) {
        params.Body = caption;
      }

      const response = await this.axiosInstance.post(
        `/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams(params),
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
        logger.error('[WhatsApp Twilio] API Fehler:', axiosError.response?.data);
        throw new Error(`Twilio API Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Sendet Bild über WhatsApp Business API
   */
  private async sendImageViaWhatsAppBusiness(to: string, imageUrl: string, caption?: string): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('WhatsApp Business Service nicht initialisiert');
    }

    if (!this.phoneNumberId) {
      logger.error('[WhatsApp Business] Phone Number ID fehlt!');
      throw new Error('WhatsApp Phone Number ID ist nicht konfiguriert');
    }

    try {
      // WhatsApp Business API unterstützt Media Messages via URL
      // Die URL muss öffentlich erreichbar sein (HTTPS)
      const payload: any = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl // URL muss HTTPS sein und öffentlich erreichbar
        }
      };

      if (caption) {
        payload.image.caption = caption;
      }

      logger.log(`[WhatsApp Business] Sende Bild an ${to} via Phone Number ID ${this.phoneNumberId}`);
      logger.log(`[WhatsApp Business] Payload:`, JSON.stringify(payload, null, 2));

      const response = await this.axiosInstance.post('/messages', payload);

      logger.log(`[WhatsApp Business] Response Status: ${response.status}`);
      logger.log(`[WhatsApp Business] Response Data:`, JSON.stringify(response.data, null, 2));

      if (response.data?.error) {
        const errorData = response.data.error;
        logger.error(`[WhatsApp Business] ⚠️ Fehler in Response-Daten:`, errorData);
        throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(errorData)}`);
      }

      const returnedMessageId = response.data?.messages?.[0]?.id;
      if (returnedMessageId) {
        logger.log(`[WhatsApp Business] ✅ Bild gesendet, Message-ID: ${returnedMessageId}`);
      }

      return true;
    } catch (error) {
      logger.error('[WhatsApp Business] Fehler beim Senden des Bildes:', error);
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
        logger.error('[WhatsApp Twilio] API Fehler:', axiosError.response?.data);
        throw new Error(`Twilio API Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
      throw error;
    }
  }

  /**
   * Sendet Nachricht über WhatsApp Business API
   * @param templateParams - Optional: Template-Parameter (für Template Messages)
   * @param templateLanguage - Optional: Template-Sprache (Standard: 'en' oder aus Environment)
   * @param isGroup - Optional: true wenn es eine Gruppen-Nachricht ist
   */
  private async sendViaWhatsAppBusiness(
    to: string, 
    message: string, 
    template?: string,
    templateParams?: Array<{ type: 'text'; text: string }>,
    templateLanguage?: string,
    isGroup?: boolean
  ): Promise<boolean> {
    if (!this.axiosInstance) {
      throw new Error('WhatsApp Business Service nicht initialisiert');
    }

    if (!this.phoneNumberId) {
      logger.error('[WhatsApp Business] Phone Number ID fehlt!');
      throw new Error('WhatsApp Phone Number ID ist nicht konfiguriert');
    }

    try {
      let payload: any;

      // Wenn Template angegeben, verwende Template-Nachricht
      if (template) {
        // Template-Sprache: Parameter > Environment-Variable > Standard (Standard: Spanisch, da Templates auf Spanisch sind)
        const languageCode = templateLanguage || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
        
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
          name: template,
          language: { code: languageCode }
          }
        };

        // Füge Template-Parameter hinzu, falls vorhanden
        if (templateParams && templateParams.length > 0) {
          payload.template.components = [
            {
              type: 'body',
              parameters: templateParams
            }
          ];
        }
      } else {
        // Normale Text-Nachricht (Session Message)
        payload = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            body: message
          }
        };
      }

      logger.log(`[WhatsApp Business] Sende Nachricht an ${to} via Phone Number ID ${this.phoneNumberId}`);
      logger.log(`[WhatsApp Business] Payload:`, JSON.stringify(payload, null, 2));
      logger.log(`[WhatsApp Business] Base URL:`, this.axiosInstance.defaults.baseURL);
      const authHeader = this.axiosInstance.defaults.headers?.['Authorization'] as string;
      if (authHeader) {
        logger.log(`[WhatsApp Business] Authorization Header Länge: ${authHeader.length}`);
        logger.log(`[WhatsApp Business] Authorization Header Vorschau: ${authHeader.substring(0, 50)}...`);
        logger.log(`[WhatsApp Business] Token Start: ${authHeader.substring(7, 30)}...`);
        logger.log(`[WhatsApp Business] Token Ende: ...${authHeader.substring(authHeader.length - 20)}`);
      } else {
        logger.error(`[WhatsApp Business] ⚠️ Authorization Header fehlt!`);
      }

      const response = await this.axiosInstance.post('/messages', payload);

      logger.log(`[WhatsApp Business] Response Status: ${response.status}`);
      logger.log(`[WhatsApp Business] Response Headers:`, JSON.stringify(response.headers, null, 2));
      logger.log(`[WhatsApp Business] Response Data:`, JSON.stringify(response.data, null, 2));
      
      // WICHTIG: Prüfe Response-Daten auch bei Status 200
      // Die API kann Status 200 zurückgeben, aber trotzdem Fehler in response.data enthalten
      if (response.data?.error) {
        const errorData = response.data.error;
        const errorCode = errorData.code;
        const errorMessage = (errorData.message || '').toLowerCase();
        const errorSubcode = errorData.error_subcode;
        
        logger.error(`[WhatsApp Business] ⚠️ Fehler in Response-Daten (trotz Status 200):`, errorData);
        
        // Prüfe ob es ein 24h-Fenster-Fehler ist
        const is24HourWindowError = 
          errorCode === 131047 ||
          errorCode === 131026 ||
          errorSubcode === 131047 ||
          errorMessage.includes('24 hour') ||
          errorMessage.includes('outside window') ||
          errorMessage.includes('template required') ||
          errorMessage.includes('outside the 24 hour');
        
        if (is24HourWindowError) {
          logger.log(`[WhatsApp Business] ⚠️ 24h-Fenster-Fehler erkannt in Response-Daten`);
        }
        
        // Werfe Error, damit Template-Fallback ausgelöst wird
        throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(errorData)}`);
      }
      
      // Prüfe ob Message-ID zurückgegeben wurde
      const returnedMessageId = response.data?.messages?.[0]?.id;
      if (returnedMessageId) {
        logger.log(`[WhatsApp Business] ✅ Message-ID: ${returnedMessageId}`);
        logger.log(`[WhatsApp Business] ⚠️ WICHTIG: Status 200 bedeutet nur, dass die API die Nachricht akzeptiert hat.`);
        logger.log(`[WhatsApp Business] ⚠️ Die tatsächliche Zustellung kann über Webhook-Status-Updates verfolgt werden.`);
        
        // Speichere ausgehende Nachricht in Datenbank
        try {
          const normalizedPhone = this.normalizePhoneNumber(to);
          // Hole branchId (sollte bereits gesetzt sein, wenn Service mit branchId erstellt wurde)
          let branchId = this.branchId;
          if (!branchId && this.organizationId) {
            // Fallback: Suche ersten Branch der Organisation
            const branch = await prisma.branch.findFirst({
              where: { organizationId: this.organizationId },
              select: { id: true }
            });
            branchId = branch?.id;
          }
          
          if (branchId) {
            await prisma.whatsAppMessage.create({
              data: {
                direction: 'outgoing',
                phoneNumber: normalizedPhone,
                message: message,
                messageId: returnedMessageId,
                status: 'sent',
                branchId: branchId,
                sentAt: new Date()
              }
            });
            logger.log(`[WhatsApp Business] ✅ Ausgehende Nachricht in Datenbank gespeichert`);
          } else {
            logger.warn(`[WhatsApp Business] ⚠️ BranchId nicht verfügbar - Nachricht nicht in DB gespeichert`);
          }
        } catch (dbError) {
          logger.error(`[WhatsApp Business] ⚠️ Fehler beim Speichern der ausgehenden Nachricht:`, dbError);
          // Weiter mit Verarbeitung, auch wenn Speichern fehlschlägt
        }
        
        // Prüfe ob es Warnungen gibt (können auf mögliche Probleme hinweisen)
        if (response.data?.warnings && Array.isArray(response.data.warnings) && response.data.warnings.length > 0) {
          logger.warn(`[WhatsApp Business] ⚠️ Warnungen in Response:`, JSON.stringify(response.data.warnings, null, 2));
          // Prüfe ob Warnungen auf 24h-Fenster-Problem hinweisen
          const warningsText = JSON.stringify(response.data.warnings).toLowerCase();
          if (warningsText.includes('24 hour') || warningsText.includes('outside window') || warningsText.includes('template')) {
            logger.warn(`[WhatsApp Business] ⚠️ Warnungen deuten auf mögliches 24h-Fenster-Problem hin - Template-Fallback wird empfohlen`);
            // Wir werfen hier keinen Error, weil die API die Nachricht akzeptiert hat
            // Aber wir loggen es, damit der Template-Fallback später ausgelöst werden kann
          }
        }
      } else {
        // Keine Message-ID zurückgegeben - könnte ein Problem sein
        logger.error(`[WhatsApp Business] ❌ Keine Message-ID in Response zurückgegeben - möglicherweise wurde die Nachricht nicht akzeptiert`);
        logger.error(`[WhatsApp Business] Response-Daten:`, JSON.stringify(response.data, null, 2));
        
        // Prüfe ob es Warnungen gibt
        if (response.data?.warnings) {
          logger.warn(`[WhatsApp Business] ⚠️ Warnungen in Response:`, response.data.warnings);
        }
        
        // Prüfe ob response.data leer ist oder unerwartete Struktur hat
        if (!response.data || Object.keys(response.data).length === 0) {
          logger.error(`[WhatsApp Business] ❌ Response-Daten sind leer - möglicherweise wurde die Nachricht nicht akzeptiert`);
          throw new Error('WhatsApp Business API: Response-Daten sind leer - Nachricht wurde möglicherweise nicht akzeptiert');
        }
        
        // Wenn Template verwendet wird, ist Message-ID optional (kann später kommen)
        // Aber bei Session Messages sollte eine Message-ID vorhanden sein
        if (!template) {
          logger.error(`[WhatsApp Business] ❌ Session Message: Keine Message-ID zurückgegeben - Nachricht wurde möglicherweise nicht akzeptiert`);
          throw new Error('WhatsApp Business API: Session Message - Keine Message-ID zurückgegeben - Nachricht wurde möglicherweise nicht akzeptiert');
        } else {
          logger.warn(`[WhatsApp Business] ⚠️ Template Message: Keine Message-ID zurückgegeben (kann normal sein, wird später über Webhook bestätigt)`);
        }
      }

      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('[WhatsApp Business] API Fehler Details:');
        logger.error('  Status:', axiosError.response?.status);
        logger.error('  Status Text:', axiosError.response?.statusText);
        logger.error('  Response Data:', JSON.stringify(axiosError.response?.data, null, 2));
        logger.error('  Request URL:', axiosError.config?.url);
        logger.error('  Request Method:', axiosError.config?.method);
        logger.error('  Request Headers:', JSON.stringify(axiosError.config?.headers, null, 2));
        throw new Error(`WhatsApp Business API Fehler: ${JSON.stringify(axiosError.response?.data)}`);
      }
      logger.error('[WhatsApp Business] Unbekannter Fehler:', error);
      throw error;
    }
  }

  /**
   * Prüft ob ein Fehler auf "outside 24-hour window" hinweist
   */
  private isOutside24HourWindowError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data as any;
      const errorCode = errorData?.error?.code;
      const errorMessage = (errorData?.error?.message || '').toLowerCase();
      const errorSubcode = errorData?.error?.error_subcode;

      // WhatsApp Business API Fehlercodes für 24h-Fenster
      // 131047 = Message outside 24-hour window
      // 131026 = Template required (auch bei 24h-Fenster)
      return (
        errorCode === 131047 ||
        errorCode === 131026 ||
        errorSubcode === 131047 ||
        errorMessage.includes('24 hour') ||
        errorMessage.includes('outside window') ||
        errorMessage.includes('template required') ||
        errorMessage.includes('outside the 24 hour')
      );
    }
    return false;
  }

  /**
   * Sendet Nachricht mit Fallback auf Template Message
   * Versucht zuerst Session Message (24h-Fenster), bei Fehler: Template Message
   * 
   * @param to - Telefonnummer des Empfängers
   * @param message - Nachrichtentext (für Session Message)
   * @param templateName - Template-Name (für Fallback)
   * @param templateParams - Template-Parameter (Array von Text-Parametern)
   * @returns true wenn erfolgreich
   */
  async sendMessageWithFallback(
    to: string,
    message: string,
    templateName?: string,
    templateParams?: string[],
    reservation?: { guestNationality?: string | null; guestPhone?: string | null } // NEU: Für Sprache-Erkennung
  ): Promise<boolean> {
    // Prüfe ob 24h-Fenster aktiv ist (durch Datenbank-Prüfung auf eingehende Nachrichten)
    // Das 24h-Fenster wird durch eingehende Nachrichten aktiviert (wenn der Empfänger uns schreibt)
    if (templateName) {
      try {
        const { prisma } = await import('../utils/prisma');
        const normalizedPhone = this.normalizePhoneNumber(to);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Prüfe, ob es eine eingehende Nachricht von dieser Nummer in den letzten 24h gibt
        const lastIncomingMessage = await prisma.whatsAppMessage.findFirst({
          where: {
            phoneNumber: normalizedPhone,
            direction: 'incoming',
            sentAt: { gte: twentyFourHoursAgo }
          },
          orderBy: {
            sentAt: 'desc'
          }
        });
        
        if (!lastIncomingMessage) {
          logger.log(`[WhatsApp Service] ⚠️ Keine eingehende WhatsApp-Nachricht von ${to} in den letzten 24h gefunden - 24h-Fenster nicht aktiv - verwende direkt Template Message`);
          // Überspringe Session Message und verwende direkt Template
          await this.loadSettings();
          
          if (!this.axiosInstance || !this.phoneNumberId) {
            throw new Error('WhatsApp Service nicht initialisiert');
          }
          
          const normalizedPhone2 = this.normalizePhoneNumber(to);
          const formattedParams = templateParams?.map(text => ({
            type: 'text' as const,
            text: text
          })) || [];
          
          // Template-Sprache: Reservation > Environment-Variable > Fallback
          let languageCode: string;
          if (reservation) {
            const { CountryLanguageService } = require('./countryLanguageService');
            languageCode = CountryLanguageService.getLanguageForReservation(reservation);
          } else {
            languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
          }
          
          const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
          const templateResult = await this.sendViaWhatsAppBusiness(normalizedPhone2, message, adjustedTemplateName, formattedParams, languageCode);
          
          if (templateResult) {
            logger.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to} (direkt, da 24h-Fenster nicht aktiv)`);
            return true;
          } else {
            throw new Error('Template Message gab false zurück');
          }
        } else {
          const hoursAgo = Math.round((Date.now() - lastIncomingMessage.sentAt.getTime()) / (60 * 60 * 1000));
          logger.log(`[WhatsApp Service] ✅ Eingehende WhatsApp-Nachricht von ${to} vor ${hoursAgo} Stunden gefunden - 24h-Fenster ist aktiv - versuche Session Message`);
        }
      } catch (dbError) {
        logger.warn(`[WhatsApp Service] ⚠️ Fehler bei Datenbank-Prüfung für 24h-Fenster:`, dbError);
        // Bei Fehler: Versuche trotzdem Session Message
      }
    }
    
    try {
      // Versuche zuerst Session Message (24h-Fenster)
      logger.log(`[WhatsApp Service] Versuche Session Message (24h-Fenster) für ${to}...`);
      const sessionResult = await this.sendMessage(to, message);
      if (sessionResult) {
        logger.log(`[WhatsApp Service] ✅ Session Message erfolgreich gesendet an ${to}`);
        return true;
      } else {
        logger.warn(`[WhatsApp Service] ⚠️ Session Message gab false zurück für ${to}`);
        throw new Error('Session Message gab false zurück');
      }
    } catch (error) {
      // Detailliertes Logging des Fehlers
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[WhatsApp Service] Fehler bei Session Message für ${to}:`, errorMessage);
      
      // Prüfe ob Fehler "outside 24h window" ist
      const is24HourWindowError = this.isOutside24HourWindowError(error);
      
      if (is24HourWindowError) {
        logger.log(`[WhatsApp Service] ⚠️ 24h-Fenster abgelaufen, verwende Template Message...`);
      } else {
        logger.log(`[WhatsApp Service] ⚠️ Session Message fehlgeschlagen (${errorMessage}), versuche Template Message als Fallback...`);
      }
      
      // Template-Fallback versuchen (wenn Template-Name vorhanden)
      // WICHTIG: Template-Fallback wird jetzt bei ALLEN Fehlern versucht, nicht nur bei 24h-Fenster-Fehlern
      // Das macht Sinn, weil Templates auch bei anderen Fehlern funktionieren können (z.B. OAuth-Fehler, etc.)
      if (!templateName) {
        logger.error('[WhatsApp Service] Template-Name fehlt für Fallback!');
        if (is24HourWindowError) {
          throw new Error('Template Message erforderlich (24h-Fenster abgelaufen), aber kein Template-Name angegeben');
        } else {
          // Bei anderen Fehlern ist Template optional, aber empfohlen
          logger.warn('[WhatsApp Service] ⚠️ Template-Name fehlt - Session Message fehlgeschlagen, aber kein Fallback möglich');
          throw error;
        }
      }

      // Fallback: Template Message
      try {
        logger.log(`[WhatsApp Service] Lade Settings für Template Message...`);
        await this.loadSettings();
        
        if (!this.axiosInstance || !this.phoneNumberId) {
          throw new Error('WhatsApp Service nicht initialisiert');
        }

        const normalizedPhone = this.normalizePhoneNumber(to);
        logger.log(`[WhatsApp Service] Normalisierte Telefonnummer: ${normalizedPhone}`);
        
        // Formatiere Template-Parameter
        const formattedParams = templateParams?.map(text => ({
          type: 'text' as const,
          text: text
        })) || [];

        logger.log(`[WhatsApp Service] Template-Parameter: ${JSON.stringify(formattedParams)}`);

        // Template-Sprache: Reservation > Environment-Variable > Fallback
        let languageCode: string;
        if (reservation) {
          const { CountryLanguageService } = require('./countryLanguageService');
          languageCode = CountryLanguageService.getLanguageForReservation(reservation);
          logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (basierend auf Reservation)`);
        } else {
          languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
          logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (aus Environment-Variable)`);
        }
        
        // Passe Template-Namen basierend auf Sprache an
        // Englische Templates haben einen Unterstrich am Ende: reservation_checkin_invitation_
        // Spanische Templates haben keinen Unterstrich: reservation_checkin_invitation
        const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
        logger.log(`[WhatsApp Service] Template-Name (angepasst für Sprache ${languageCode}): ${adjustedTemplateName}`);
        
        const templateResult = await this.sendViaWhatsAppBusiness(normalizedPhone, message, adjustedTemplateName, formattedParams, languageCode);
        if (templateResult) {
          logger.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to} (Fallback nach Session Message Fehler)`);
          return true;
        } else {
          logger.error(`[WhatsApp Service] ❌ Template Message gab false zurück für ${to}`);
          throw new Error('Template Message gab false zurück');
        }
      } catch (templateError) {
        logger.error('[WhatsApp Service] ❌ Fehler bei Template Message:', templateError);
        const templateErrorMessage = templateError instanceof Error ? templateError.message : String(templateError);
        logger.error('[WhatsApp Service] Template Error Details:', templateErrorMessage);
        // Wenn Template auch fehlschlägt, werfe den ursprünglichen Fehler (Session Message Fehler)
        // Das gibt mehr Kontext über das ursprüngliche Problem
        throw new Error(`Session Message fehlgeschlagen: ${errorMessage}. Template-Fallback auch fehlgeschlagen: ${templateErrorMessage}`);
      }
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
   * Gibt den Template-Namen basierend auf der Sprache zurück
   * 
   * WhatsApp erlaubt Templates mit gleichem Namen in verschiedenen Sprachen.
   * Einige Templates haben einen Unterstrich am Ende für Englisch (z.B. reservation_checkin_invitation_),
   * andere haben den gleichen Namen für beide Sprachen (z.B. reservation_checkin_completed).
   * 
   * @param baseTemplateName - Basis-Template-Name (z.B. 'reservation_checkin_invitation')
   * @param languageCode - Sprache-Code ('en' oder 'es')
   * @returns Template-Name mit sprachspezifischem Suffix (wenn nötig)
   */
  private getTemplateNameForLanguage(baseTemplateName: string, languageCode: string): string {
    // Templates mit gleichem Namen für beide Sprachen (kein Unterstrich)
    const sameNameTemplates = ['reservation_checkin_completed'];
    
    if (sameNameTemplates.includes(baseTemplateName)) {
      // Gleicher Name für beide Sprachen
      return baseTemplateName;
    }
    
    // Englische Templates haben einen Unterstrich am Ende (für alte Templates)
    if (languageCode === 'en') {
      return `${baseTemplateName}_`;
    }
    // Spanische Templates haben keinen Unterstrich
    return baseTemplateName;
  }

  /**
   * Sendet direkt eine Template Message (ohne Session Message zu versuchen)
   * 
   * WICHTIG: Diese Methode verwendet NUR Template Messages, keine Session Messages.
   * Verwendung für Reservation-Einladungen, wo das 24h-Fenster meist nicht aktiv ist.
   * 
   * @param to - Telefonnummer des Empfängers
   * @param templateName - Template-Name (Basis, wird basierend auf Sprache angepasst)
   * @param templateParams - Template-Parameter (Array von Strings)
   * @param message - Nachrichtentext (wird ignoriert, da Template verwendet wird)
   * @param reservation - Optional: Reservation mit guestNationality und/oder guestPhone für Sprache-Erkennung
   * @returns true wenn erfolgreich
   */
  async sendTemplateMessageDirectly(
    to: string,
    templateName: string,
    templateParams: string[],
    message?: string, // Wird ignoriert, nur für Kompatibilität
    reservation?: { guestNationality?: string | null; guestPhone?: string | null } // NEU: Für Sprache-Erkennung
  ): Promise<boolean> {
    try {
      logger.log(`[WhatsApp Service] Sende DIREKT Template Message an ${to} (kein Session Message Fallback)`);
      await this.loadSettings();
      
      if (!this.axiosInstance || !this.phoneNumberId) {
        throw new Error('WhatsApp Service nicht initialisiert');
      }

      const normalizedPhone = this.normalizePhoneNumber(to);
      logger.log(`[WhatsApp Service] Normalisierte Telefonnummer: ${normalizedPhone}`);
      
      // Formatiere Template-Parameter
      const formattedParams = templateParams.map(text => ({
        type: 'text' as const,
        text: String(text)
      }));

      logger.log(`[WhatsApp Service] Template-Parameter: ${JSON.stringify(formattedParams)}`);

      // Template-Sprache: Reservation > Environment-Variable > Fallback
      let languageCode: string;
      if (reservation) {
        const { CountryLanguageService } = require('./countryLanguageService');
        languageCode = CountryLanguageService.getLanguageForReservation(reservation);
        logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (basierend auf Reservation)`);
      } else {
        languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
        logger.log(`[WhatsApp Service] Template-Sprache: ${languageCode} (aus Environment-Variable)`);
      }
      
      // Passe Template-Namen basierend auf Sprache an
      const adjustedTemplateName = this.getTemplateNameForLanguage(templateName, languageCode);
      logger.log(`[WhatsApp Service] Template-Name (angepasst für Sprache ${languageCode}): ${adjustedTemplateName}`);
      
      const templateResult = await this.sendViaWhatsAppBusiness(
        normalizedPhone, 
        message || '', // Wird ignoriert, da Template verwendet wird
        adjustedTemplateName, 
        formattedParams, 
        languageCode
      );
      
      if (templateResult) {
        logger.log(`[WhatsApp Service] ✅ Template Message erfolgreich gesendet an ${to}`);
        return true;
      } else {
        logger.error(`[WhatsApp Service] ❌ Template Message gab false zurück für ${to}`);
        throw new Error('Template Message gab false zurück');
      }
    } catch (error) {
      logger.error('[WhatsApp Service] ❌ Fehler bei Template Message:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('[WhatsApp Service] Template Error Details:', errorMessage);
      throw error;
    }
  }

  /**
   * Sendet Check-in-Einladung per WhatsApp
   * Verwendet Hybrid-Ansatz: Session Message mit Fallback auf Template
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

¡Nos complace darte la bienvenida a La Familia Hostel! 🎊

En caso de que llegues después de las 18:00 o antes de las 09:00, nuestra recepción 🛎️ estará cerrada.

Te pedimos amablemente que completes el check-in y el pago en línea con anticipación:

Check-In:

${checkInLink}

Por favor, realiza el pago por adelantado:

${paymentLink}

Por favor, escríbenos brevemente una vez que hayas completado tanto el check-in como el pago, para que podamos enviarte tu código PIN 🔑 para la puerta de entrada.

¡Gracias!

¡Esperamos verte pronto!`;

    // Template-Name aus Environment oder Settings (Standard: reservation_checkin_invitation)
    // Hinweis: Der tatsächliche Template-Name wird in sendMessageWithFallback basierend auf Sprache angepasst
    const baseTemplateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_INVITATION || 'reservation_checkin_invitation';
    
    // Template-Parameter (müssen in der Reihenfolge der {{1}}, {{2}}, {{3}} im Template sein)
    const templateParams = [guestName, checkInLink, paymentLink];

    return await this.sendMessageWithFallback(guestPhone, message, baseTemplateName, templateParams);
  }

  /**
   * Sendet Check-in-Bestätigung per WhatsApp
   * Verwendet Hybrid-Ansatz: Session Message mit Fallback auf Template
   * 
   * @param guestName - Name des Gastes
   * @param guestPhone - Telefonnummer des Gastes
   * @param roomNumber - Zimmernummer
   * @param roomDescription - Zimmerbeschreibung
   * @param doorPin - PIN für Türsystem
   * @param doorAppName - App-Name (z.B. "TTLock")
   * @param reservation - Optional: Reservation für Sprache-Erkennung
   * @returns true wenn erfolgreich
   */
  async sendCheckInConfirmation(
    guestName: string,
    guestPhone: string,
    roomNumber: string,
    roomDescription: string,
    doorPin: string,
    doorAppName: string,
    reservation?: { guestNationality?: string | null; guestPhone?: string | null }
  ): Promise<boolean> {
    // Erkenne Sprache für Template
    let languageCode: string;
    if (reservation) {
      const { CountryLanguageService } = require('./countryLanguageService');
      languageCode = CountryLanguageService.getLanguageForReservation(reservation);
    } else {
      languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'es';
    }

    // Baue Variablen für Template auf
    // {{1}} = Name mit Begrüßung
    const greeting = languageCode === 'en' ? `Hello ${guestName},` : `Hola ${guestName},`;
    
    // {{2}} = Kompletter Text mit Zimmerinfo und PIN
    let contentText: string;
    if (languageCode === 'en') {
      contentText = `Your check-in has been completed successfully!

Your room information:
- Room: ${roomNumber}
- Description: ${roomDescription}

Access:
- Door PIN: ${doorPin}
- App: ${doorAppName}`;
    } else {
      contentText = `¡Tu check-in se ha completado exitosamente!

Información de tu habitación:
- Habitación: ${roomNumber}
- Descripción: ${roomDescription}

Acceso:
- PIN de la puerta: ${doorPin}
- App: ${doorAppName}`;
    }

    // Session Message (Fallback)
    const message = languageCode === 'en' 
      ? `${greeting}\n\n${contentText}\n\nWe wish you a pleasant stay!`
      : `${greeting}\n\n${contentText}\n\n¡Te deseamos una estancia agradable!`;

    // Template-Name aus Environment oder Settings (Standard: reservation_checkin_completed)
    const templateName = process.env.WHATSAPP_TEMPLATE_CHECKIN_CONFIRMATION || 'reservation_checkin_completed';
    
    // Template-Parameter (müssen in der Reihenfolge der {{1}}, {{2}} im Template sein)
    // Format: Name mit Begrüßung, Kompletter Text mit Zimmerinfo und PIN
    const templateParams = [greeting, contentText];

    return await this.sendMessageWithFallback(guestPhone, message, templateName, templateParams, reservation);
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

      logger.log(`[WhatsApp Service] Lade Media ${mediaId} herunter...`);

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

      logger.log(`[WhatsApp Service] Media-URL erhalten: ${mediaUrl.substring(0, 50)}...`);

      // Schritt 2: Lade die tatsächliche Datei herunter
      const mediaResponse = await axios.get(mediaUrl, {
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const buffer = Buffer.from(mediaResponse.data);

      logger.log(`[WhatsApp Service] Media heruntergeladen: ${buffer.length} bytes, Type: ${mimeType}`);

      return {
        buffer,
        mimeType,
        fileName
      };
    } catch (error) {
      logger.error('[WhatsApp Service] Fehler beim Herunterladen von Media:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error('[WhatsApp Service] API Fehler:', axiosError.response?.data);
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


