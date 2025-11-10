import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../utils/encryption';

const prisma = new PrismaClient();

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
  private organizationId: number;
  private clientId?: string;
  private clientSecret?: string;
  private apiUrl: string = 'https://open.ttlock.com';
  private accessToken?: string;
  private tokenExpiresAt?: Date;
  private axiosInstance: AxiosInstance;

  /**
   * Erstellt eine neue TTLock Service-Instanz
   * 
   * @param organizationId - ID der Organisation
   * @throws Error wenn TTLock nicht konfiguriert ist
   */
  constructor(organizationId: number) {
    this.organizationId = organizationId;
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
   * Lädt TTLock Settings aus der Organisation
   * Muss vor jedem API-Call aufgerufen werden
   */
  private async loadSettings(): Promise<void> {
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

    this.clientId = doorSystemSettings.clientId;
    this.clientSecret = doorSystemSettings.clientSecret;
    this.apiUrl = doorSystemSettings.apiUrl || 'https://open.ttlock.com';
    this.accessToken = doorSystemSettings.accessToken;

    // Re-initialisiere Axios-Instanz mit korrekten Settings
    this.axiosInstance = this.createAxiosInstance();
  }

  /**
   * Erstellt eine konfigurierte Axios-Instanz für TTLock API-Requests
   */
  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.apiUrl,
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
    if (!this.clientId || !this.clientSecret) {
      await this.loadSettings();
    }

    // Prüfe ob Token noch gültig ist
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.accessToken;
    }

    try {
      const response = await this.axiosInstance.post<TTLockResponse<TTLockAccessToken>>(
        '/oauth2/token',
        new URLSearchParams({
          client_id: this.clientId || '',
          client_secret: this.clientSecret || '',
          grant_type: 'client_credentials'
        })
      );

      if (response.data.errcode === 0 && response.data.data) {
        this.accessToken = response.data.data.access_token;
        const expiresIn = response.data.data.expires_in || 7200; // Standard: 2 Stunden
        this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        // Speichere Token in Organisation Settings
        await this.saveAccessToken(this.accessToken);

        return this.accessToken;
      }

      throw new Error(response.data.errmsg || 'Fehler beim Abrufen des Access Tokens');
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

      const payload = new URLSearchParams({
        clientId: this.clientId || '',
        accessToken: accessToken,
        lockId: lockId,
        keyboardPwdName: passcodeName || 'Guest Passcode',
        startDate: Math.floor(startDate.getTime() / 1000).toString(), // Unix timestamp
        endDate: Math.floor(endDate.getTime() / 1000).toString(),
        keyboardPwdType: '2', // Temporärer Passcode
        date: Math.floor(Date.now() / 1000).toString()
      });

      const response = await this.axiosInstance.post<TTLockResponse<TTLockPasscode>>(
        '/v3/keyboardPwd/add',
        payload
      );

      if (response.data.errcode === 0 && response.data.data) {
        return response.data.data.passcode;
      }

      throw new Error(response.data.errmsg || 'Fehler beim Erstellen des Passcodes');
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

      const payload = new URLSearchParams({
        clientId: this.clientId || '',
        accessToken: accessToken,
        lockId: lockId,
        keyboardPwdId: passcodeId,
        date: Math.floor(Date.now() / 1000).toString()
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

      const response = await this.axiosInstance.post<TTLockResponse<{ lockId: string }[]>>(
        '/v3/lock/list',
        new URLSearchParams({
          clientId: this.clientId || '',
          accessToken: accessToken,
          pageNo: '1',
          pageSize: '100',
          date: Math.floor(Date.now() / 1000).toString()
        })
      );

      if (response.data.errcode === 0 && response.data.data) {
        return response.data.data.map(lock => lock.lockId);
      }

      throw new Error(response.data.errmsg || 'Fehler beim Abrufen der Locks');
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


