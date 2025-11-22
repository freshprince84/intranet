import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../utils/encryption';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';

/**
 * TTLock API Response Types
 */
export interface TTLockAccessToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface TTLockPasscode {
  passcode: string;
  passcodeId: string;
  startDate: number; // Unix timestamp
  endDate: number; // Unix timestamp
}

export interface TTLockResponse<T = any> {
  errcode: number;
  errmsg: string;
  data?: T;
}

/**
 * Service für TTLock Integration (Türsystem)
 * 
 * Bietet Funktionen zum Erstellen und Verwalten von temporären Passcodes
 */
export class TTLockService {
  private organizationId?: number;
  private branchId?: number;
  private clientId?: string;
  private clientSecret?: string;
  private username?: string;
  private password?: string; // MD5-hashed password
  private apiUrl: string = 'https://euopen.ttlock.com';
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  private passcodeType: string = 'auto'; // 'auto' = 10-stellig, 'custom' = 4-stellig
  private axiosInstance: AxiosInstance;

  /**
   * Erstellt eine neue TTLock Service-Instanz
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
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * Lädt TTLock Settings aus Branch oder Organisation (mit Fallback)
   * Muss vor jedem API-Call aufgerufen werden
   */
  private async loadSettings(): Promise<void> {
    // 1. Versuche Branch Settings zu laden (wenn branchId gesetzt)
    if (this.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: this.branchId },
        select: { 
          doorSystemSettings: true, 
          organizationId: true 
        }
      });

      if (branch?.doorSystemSettings) {
        try {
          const settings = decryptBranchApiSettings(branch.doorSystemSettings as any);
          const doorSystemSettings = settings?.doorSystem || settings;

          if (doorSystemSettings?.clientId && doorSystemSettings?.clientSecret && 
              doorSystemSettings?.username && doorSystemSettings?.password) {
            // Prüfe ob Client Secret verschlüsselt ist und entschlüssele es
            let clientSecret = doorSystemSettings.clientSecret;
            if (clientSecret && clientSecret.includes(':')) {
              const { decryptSecret } = await import('../utils/encryption');
              try {
                clientSecret = decryptSecret(clientSecret);
                console.log('[TTLock] Client Secret erfolgreich entschlüsselt');
              } catch (error) {
                console.error('[TTLock] Fehler beim Entschlüsseln des Client Secrets:', error);
                throw new Error('Client Secret konnte nicht entschlüsselt werden');
              }
            }

            this.clientId = doorSystemSettings.clientId;
            this.clientSecret = clientSecret;
            this.username = doorSystemSettings.username;
            this.password = doorSystemSettings.password;
            this.apiUrl = doorSystemSettings.apiUrl || 'https://euopen.ttlock.com';
            this.accessToken = doorSystemSettings.accessToken;
            this.passcodeType = doorSystemSettings.passcodeType || 'auto';
            this.axiosInstance = this.createAxiosInstance();
            console.log(`[TTLock] Verwende Branch-spezifische Settings für Branch ${this.branchId}`);
            return; // Erfolgreich geladen
          }
        } catch (error) {
          console.warn(`[TTLock] Fehler beim Laden der Branch Settings:`, error);
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
      throw new Error(`TTLock ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    const settings = decryptApiSettings(organization.settings as any);
    const doorSystemSettings = settings?.doorSystem;

    if (!doorSystemSettings?.clientId || !doorSystemSettings?.clientSecret) {
      throw new Error(`TTLock Client ID/Secret ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    if (!doorSystemSettings?.username || !doorSystemSettings?.password) {
      throw new Error(`TTLock Username/Password ist nicht für Organisation ${this.organizationId} konfiguriert`);
    }

    // Prüfe ob Client Secret verschlüsselt ist und entschlüssele es
    let clientSecret = doorSystemSettings.clientSecret;
    if (clientSecret && clientSecret.includes(':')) {
      // Verschlüsselt - entschlüssele
      const { decryptSecret } = await import('../utils/encryption');
      try {
        clientSecret = decryptSecret(clientSecret);
        console.log('[TTLock] Client Secret erfolgreich entschlüsselt');
      } catch (error) {
        console.error('[TTLock] Fehler beim Entschlüsseln des Client Secrets:', error);
        throw new Error('Client Secret konnte nicht entschlüsselt werden');
      }
    }
    
    this.clientId = doorSystemSettings.clientId;
    this.clientSecret = clientSecret;
    this.username = doorSystemSettings.username;
    this.password = doorSystemSettings.password; // Already MD5-hashed
    this.apiUrl = doorSystemSettings.apiUrl || 'https://euopen.ttlock.com';
    this.accessToken = doorSystemSettings.accessToken;
      this.passcodeType = doorSystemSettings.passcodeType || 'auto';
    this.axiosInstance = this.createAxiosInstance();
      return;
    }

    throw new Error('TTLock Settings nicht gefunden (weder Branch noch Organization)');
  }

  /**
   * Statische Factory-Methode: Erstellt Service für Branch
   * 
   * @param branchId - ID des Branches
   * @returns TTLockService-Instanz
   */
  static async createForBranch(branchId: number): Promise<TTLockService> {
    const service = new TTLockService(undefined, branchId);
    await service.loadSettings();
    return service;
  }

  /**
   * Erstellt eine konfigurierte Axios-Instanz für TTLock API-Requests
   * API-Endpunkte sind auf api.sciener.com, nicht auf euopen.ttlock.com
   */
  private createAxiosInstance(): AxiosInstance {
    // API-Endpunkte sind auf euapi.ttlock.com (nicht api.sciener.com!)
    const apiBaseUrl = this.apiUrl.includes('euopen.ttlock.com') 
      ? 'https://euapi.ttlock.com' 
      : this.apiUrl;
    
    const instance = axios.create({
      baseURL: apiBaseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Request Interceptor für Logging
    instance.interceptors.request.use(
      (config) => {
        console.log(`[TTLock] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[TTLock] Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor für Error Handling
    instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[TTLock] API Error:', {
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
   * Ruft ein Access Token ab (OAuth 2.0)
   * 
   * @returns Access Token
   */
  private async getAccessToken(): Promise<string> {
    // Lade Settings falls noch nicht geladen
    if (!this.clientId || !this.clientSecret || !this.username || !this.password) {
      await this.loadSettings();
    }

    // Prüfe ob Token vorhanden ist
    // WICHTIG: TTLock Access Token ist unbefristet (hat kein Ablaufdatum)
    // Wenn Token vorhanden ist, verwende ihn, auch wenn tokenExpiresAt fehlt
    if (this.accessToken) {
      // Wenn tokenExpiresAt gesetzt ist und noch gültig, verwende Token
      if (this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
        return this.accessToken;
      }
      // Wenn tokenExpiresAt fehlt (z.B. nach Service-Restart), verwende Token trotzdem
      // Der Token ist unbefristet, daher ist keine Expiration-Prüfung nötig
      if (!this.tokenExpiresAt) {
        console.log('[TTLock] Verwende gespeicherten Access Token (unbefristet, tokenExpiresAt fehlt)');
        return this.accessToken;
      }
      // Wenn tokenExpiresAt gesetzt ist, aber abgelaufen, generiere neuen Token
      console.log('[TTLock] Access Token abgelaufen, generiere neuen Token...');
    }

    try {
      // TTLock OAuth-Endpunkt: /oauth2/token
      // Verwendet Resource Owner Password Credentials Grant
      // OAuth-Endpunkt ist auf api.sciener.com, nicht auf euopen.ttlock.com
      const oauthUrl = this.apiUrl.includes('euopen.ttlock.com') 
        ? 'https://api.sciener.com' 
        : this.apiUrl;
      
      console.log('[TTLock] OAuth Request Details:', {
        oauthUrl: `${oauthUrl}/oauth2/token`,
        hasClientId: !!this.clientId,
        clientIdLength: this.clientId?.length || 0,
        hasClientSecret: !!this.clientSecret,
        clientSecretLength: this.clientSecret?.length || 0,
        hasUsername: !!this.username,
        hasPassword: !!this.password,
        passwordLength: this.password?.length || 0
      });
      
      const response = await axios.post<TTLockResponse<TTLockAccessToken>>(
        `${oauthUrl}/oauth2/token`,
        new URLSearchParams({
          client_id: this.clientId || '',
          client_secret: this.clientSecret || '',
          username: this.username || '',
          password: this.password || '' // Already MD5-hashed
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      // TTLock OAuth gibt entweder errcode=0 mit data zurück, oder direkt access_token
      const responseData = response.data as any;
      if (responseData.errcode === 0 && responseData.data) {
        // Format: { errcode: 0, data: { access_token: ... } }
        this.accessToken = responseData.data.access_token;
        const expiresIn = responseData.data.expires_in || 7200;
        this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      } else if (responseData.access_token) {
        // Format: { access_token: ..., expires_in: ... }
        this.accessToken = responseData.access_token;
        const expiresIn = responseData.expires_in || 7200;
        this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
      } else {
        // Fehlerfall
        const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
        console.error('[TTLock] OAuth Error:', {
          errcode: responseData.errcode,
          errmsg: errorMsg,
          data: responseData
        });
        throw new Error(errorMsg);
      }

      // Speichere Token in Organisation Settings
      if (this.accessToken) {
        await this.saveAccessToken(this.accessToken);
        return this.accessToken;
      }

      throw new Error('Access token nicht in Response gefunden');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TTLockResponse>;
        const errorMsg = axiosError.response?.data?.errmsg || axiosError.message;
        console.error('[TTLock] OAuth Request Error:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          errmsg: errorMsg,
          data: axiosError.response?.data
        });
        throw new Error(errorMsg);
      }
      throw error;
    }
  }

  /**
   * Speichert Access Token in Organisation Settings
   */
  private async saveAccessToken(token: string): Promise<void> {
    const organization = await prisma.organization.findUnique({
      where: { id: this.organizationId },
      select: { settings: true }
    });

    if (organization?.settings) {
      const settings = organization.settings as any;
      if (settings.doorSystem) {
        settings.doorSystem.accessToken = token;
        await prisma.organization.update({
          where: { id: this.organizationId },
          data: { settings }
        });
      }
    }
  }

  /**
   * Erstellt einen temporären Passcode für eine Reservierung
   * 
   * @param lockId - TTLock Lock ID
   * @param startDate - Startdatum (wann der Passcode aktiv wird)
   * @param endDate - Enddatum (wann der Passcode abläuft)
   * @param passcodeName - Name des Passcodes (z.B. "Guest: {guestName}")
   * @returns Passcode (PIN)
   */
  async createTemporaryPasscode(
    lockId: string,
    startDate: Date,
    endDate: Date,
    passcodeName?: string
  ): Promise<string> {
    try {
      const accessToken = await this.getAccessToken();

      // ✅ FUNKTIONIERENDE LÖSUNG (GETESTET AM 18.11.2025, Code: 1462371)
      // WICHTIG: Verwende /v3/keyboardPwd/get für automatisch generierte Passcodes
      // Diese Methode funktioniert OHNE Gateway und OHNE App-Synchronisation!
      
      // date muss die aktuelle Unix-Zeit in Millisekunden sein (innerhalb von 5 Minuten)
      // Wichtig: date muss direkt vor dem Request gesetzt werden, um Zeitabweichungen zu vermeiden
      const currentTimestamp = Date.now(); // Millisekunden
      
      // WICHTIG: startDate muss in der Vergangenheit liegen, damit der Code sofort aktiv ist!
      // Setze startDate IMMER auf heute 00:00:00 (Mitternacht), unabhängig vom checkInDate!
      // Die API akzeptiert kein startDate, das früher als heute ist!
      let actualStartDate = new Date(); // ✅ IMMER heute (nicht checkInDate!)
      actualStartDate.setHours(0, 0, 0, 0); // Heute 00:00:00
      
      // WICHTIG: endDate muss mindestens 1 Tag nach startDate liegen
      let actualEndDate = new Date(endDate);
      if (actualEndDate.getTime() <= actualStartDate.getTime()) {
        actualEndDate = new Date(actualStartDate);
        actualEndDate.setDate(actualEndDate.getDate() + 1); // +1 Tag
      }
      
      console.log('[TTLock] ✅ Verwende FUNKTIONIERENDE LÖSUNG: /v3/keyboardPwd/get (getestet am 18.11.2025)');
      console.log('[TTLock] Passcode Creation Payload:', {
        endpoint: '/v3/keyboardPwd/get',
        clientId: this.clientId,
        lockId: lockId,
        keyboardPwdName: passcodeName || 'Guest Passcode',
        keyboardPwdType: '3 (period)',
        startDate: actualStartDate.toISOString(),
        endDate: actualEndDate.toISOString(),
        addType: '1 (via phone bluetooth)',
        keyboardPwd: 'NICHT gesetzt (API generiert automatisch!)',
        date: currentTimestamp
      });
      
      // ✅ FUNKTIONIERENDE KONFIGURATION (EXAKT WIE GETESTET):
      // Endpunkt: /v3/keyboardPwd/get (NICHT /v3/keyboardPwd/add!)
      // keyboardPwd: NICHT setzen (API generiert automatisch!)
      // keyboardPwdType: 3 (period/temporär, NICHT 2 permanent!)
      // startDate: Heute 00:00:00 (in Millisekunden)
      // endDate: Mindestens 1 Tag später (in Millisekunden)
      // addType: 1 (via phone bluetooth)
      // date: Aktueller Timestamp in Millisekunden
      
      const payload = new URLSearchParams();
      payload.append('clientId', this.clientId || '');
      payload.append('accessToken', accessToken);
      payload.append('lockId', lockId.toString());
      // WICHTIG: keyboardPwd NICHT setzen - API generiert automatisch!
      payload.append('keyboardPwdName', passcodeName || 'Guest Passcode');
      payload.append('keyboardPwdType', '3'); // 3 = period (temporärer Passcode)
      payload.append('startDate', actualStartDate.getTime().toString()); // Millisekunden
      payload.append('endDate', actualEndDate.getTime().toString()); // Millisekunden
      payload.append('addType', '1'); // 1 = via phone bluetooth (ohne Gateway)
      payload.append('date', currentTimestamp.toString()); // Millisekunden

      // Debug: Zeige vollständigen Request
      console.log('[TTLock] Request URL:', `${this.axiosInstance.defaults.baseURL}/v3/keyboardPwd/get`);
      console.log('[TTLock] Request Payload (stringified):', payload.toString());
      console.log('[TTLock] Request Payload (as object):', Object.fromEntries(payload));
      
      // ✅ WICHTIG: Verwende /v3/keyboardPwd/get (NICHT /v3/keyboardPwd/add!)
      const response = await this.axiosInstance.post<TTLockResponse<TTLockPasscode>>(
        '/v3/keyboardPwd/get',
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const responseData = response.data as any;
    
      // Passcode aus Response extrahieren
      const generatedPasscode = responseData.keyboardPwd || responseData.passcode;
      const keyboardPwdId = responseData.keyboardPwdId;
      
      if (generatedPasscode) {
        // ✅ Erfolg - Passcode wurde automatisch generiert!
        const passcode = generatedPasscode.toString();
        console.log('[TTLock] ✅ Passcode erfolgreich erstellt! Passcode:', passcode);
        console.log('[TTLock] Passcode-Länge:', passcode.length, 'Ziffern');
        console.log('[TTLock] Passcode ID:', keyboardPwdId || 'N/A');
        console.log('[TTLock] ✅ Dieser Code funktioniert OHNE Gateway und OHNE App-Sync!');
        return passcode;
      } else if (responseData.errcode === 0 || keyboardPwdId) {
        // Erfolg aber kein Passcode zurückgegeben
        console.warn('[TTLock] ⚠️ API hat Erfolg gemeldet, aber keinen Passcode zurückgegeben!');
        console.warn('[TTLock] Response:', responseData);
        throw new Error('API hat keinen Passcode zurückgegeben (erwartet für auto-generierte Codes)');
      }

      // Fehlerfall
      const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
      console.error('[TTLock] Passcode Creation Error:', {
        errcode: responseData.errcode,
        errmsg: errorMsg,
        data: responseData,
        payload: Object.fromEntries(payload)
      });
      throw new Error(errorMsg);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TTLockResponse>;
        throw new Error(
          axiosError.response?.data?.errmsg ||
          `TTLock API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Löscht einen temporären Passcode
   * 
   * @param lockId - TTLock Lock ID
   * @param passcodeId - Passcode ID
   */
  async deleteTemporaryPasscode(lockId: string, passcodeId: string): Promise<void> {
    try {
      const accessToken = await this.getAccessToken();

      // date muss die aktuelle Unix-Zeit in Millisekunden sein (innerhalb von 5 Minuten)
      const currentTimestamp = Date.now(); // Millisekunden
      
      const payload = new URLSearchParams({
        clientId: this.clientId || '',
        accessToken: accessToken,
        lockId: lockId,
        keyboardPwdId: passcodeId,
        date: currentTimestamp.toString()
      });

      const response = await this.axiosInstance.post<TTLockResponse>(
        '/v3/keyboardPwd/delete',
        payload
      );

      if (response.data.errcode !== 0) {
        throw new Error(response.data.errmsg || 'Fehler beim Löschen des Passcodes');
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TTLockResponse>;
        throw new Error(
          axiosError.response?.data?.errmsg ||
          `TTLock API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Ruft alle verfügbaren Locks ab
   * 
   * @returns Array von Lock IDs
   */
  async getLocks(): Promise<string[]> {
    try {
      const accessToken = await this.getAccessToken();

      // date muss die aktuelle Unix-Zeit in Sekunden sein (innerhalb von 5 Minuten)
      // Wichtig: date muss direkt VOR dem Request gesetzt werden, um Zeitabweichungen zu vermeiden
      // Versuche zuerst Sekunden, falls das nicht funktioniert, könnte es Millisekunden sein
      const currentTimestampSeconds = Math.floor(Date.now() / 1000);
      const currentTimestampMillis = Date.now();
      
      // Debug: Zeige beide Timestamps
      console.log(`[TTLock] Date Timestamp (Sekunden): ${currentTimestampSeconds}`);
      console.log(`[TTLock] Date Timestamp (Millisekunden): ${currentTimestampMillis}`);
      
      const params = new URLSearchParams({
        clientId: this.clientId || '',
        accessToken: accessToken,
        pageNo: '1',
        pageSize: '100',
        date: currentTimestampMillis.toString() // Versuche Millisekunden
      });
      
      const response = await this.axiosInstance.post<TTLockResponse<{ lockId: string }[]>>(
        '/v3/lock/list',
        params
      );

      const responseData = response.data as any;
      
      // TTLock API gibt entweder errcode=0 mit data zurück, oder direkt list
      if (responseData.errcode === 0 && responseData.data) {
        // Format: { errcode: 0, data: [{ lockId: ... }] }
        return responseData.data.map((lock: any) => String(lock.lockId || lock.id));
      } else if (responseData.list && Array.isArray(responseData.list)) {
        // Format: { list: [{ lockId: ... }], pageNo: 1, ... }
        console.log('[TTLock] Lock List Response:', JSON.stringify(responseData, null, 2));
        const lockIds = responseData.list.map((lock: any) => {
          // Lock ID kann in verschiedenen Feldern sein: lockId, id, etc.
          const id = lock.lockId || lock.id || lock.lock_id || Object.values(lock)[0];
          // Konvertiere zu String (TTLock API gibt Zahlen zurück)
          return id ? String(id) : null;
        }).filter((id: any) => id); // Filtere undefined/null
        console.log('[TTLock] Extracted Lock IDs:', lockIds);
        return lockIds;
      }

      // Fehlerfall
      const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
      console.error('[TTLock] Lock List Error:', {
        errcode: responseData.errcode,
        errmsg: errorMsg,
        data: responseData
      });
      throw new Error(errorMsg);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<TTLockResponse>;
        throw new Error(
          axiosError.response?.data?.errmsg ||
          `TTLock API Fehler: ${axiosError.message}`
        );
      }
      throw error;
    }
  }
}


