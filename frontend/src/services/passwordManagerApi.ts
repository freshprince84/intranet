import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';

// WICHTIG: axiosInstance hat bereits baseURL mit /api, daher nur /password-manager hier
const API_BASE = '/password-manager';

export interface PasswordEntry {
  id: number;
  title: string;
  url?: string | null;
  username?: string | null;
  password?: string; // Nur wenn entschlüsselt
  notes?: string | null;
  organizationId?: number | null;
  createdById: number;
  createdBy?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePasswordEntryData {
  title: string;
  url?: string;
  username?: string;
  password: string;
  notes?: string;
  rolePermissions?: Array<{
    roleId: number;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
  userPermissions?: Array<{
    userId: number;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  }>;
}

export interface UpdatePasswordEntryData {
  title?: string;
  url?: string;
  username?: string;
  password?: string;
  notes?: string;
}

export interface GeneratePasswordOptions {
  length?: number;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

export interface PasswordEntryAuditLog {
  id: number;
  entryId: number;
  userId: number;
  user?: {
    id: number;
    firstName: string | null;
    lastName: string | null;
  };
  action: string;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export const passwordManagerApi = {
  /**
   * Alle Passwort-Einträge abrufen (nur Metadaten, keine Passwörter)
   */
  async getAll(): Promise<PasswordEntry[]> {
    const response = await axiosInstance.get(API_BASE);
    return response.data;
  },

  /**
   * Einzelnen Passwort-Eintrag abrufen (mit Passwort, wenn berechtigt)
   */
  async getById(id: number): Promise<PasswordEntry> {
    const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.BY_ID(id));
    return response.data;
  },

  /**
   * Nur Passwort abrufen (entschlüsselt)
   */
  async getPassword(id: number): Promise<{ password: string }> {
    const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.PASSWORD(id));
    return response.data;
  },

  /**
   * Neuen Passwort-Eintrag erstellen
   */
  async create(data: CreatePasswordEntryData): Promise<PasswordEntry> {
    const response = await axiosInstance.post(API_BASE, data);
    return response.data;
  },

  /**
   * Passwort-Eintrag aktualisieren
   */
  async update(id: number, data: UpdatePasswordEntryData): Promise<PasswordEntry> {
    const response = await axiosInstance.put(API_ENDPOINTS.PASSWORD_MANAGER.BY_ID(id), data);
    return response.data;
  },

  /**
   * Passwort-Eintrag löschen
   */
  async delete(id: number): Promise<void> {
    await axiosInstance.delete(API_ENDPOINTS.PASSWORD_MANAGER.BY_ID(id));
  },

  /**
   * Passwort generieren
   */
  async generatePassword(options: GeneratePasswordOptions = {}): Promise<{ password: string }> {
    const response = await axiosInstance.post(API_ENDPOINTS.PASSWORD_MANAGER.GENERATE_PASSWORD, options);
    return response.data;
  },

  /**
   * Audit-Logs für Eintrag abrufen
   */
  async getAuditLogs(id: number): Promise<PasswordEntryAuditLog[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.PASSWORD_MANAGER.AUDIT_LOGS(id));
    return response.data;
  }
};

