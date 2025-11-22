import { decryptBranchApiSettings, decryptApiSettings } from '../utils/encryption';

/**
 * Cache für entschlüsselte Branch-Settings
 * 
 * Reduziert CPU-Last durch Vermeidung wiederholter AES-256-GCM Entschlüsselungen
 * TTL: 10 Minuten (Settings ändern sich selten)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class BranchSettingsCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 Minuten

  /**
   * Gibt entschlüsselte Branch-Settings zurück (aus Cache oder neu entschlüsselt)
   * 
   * @param branchId - Branch-ID
   * @param settingsType - Typ der Settings ('whatsapp' | 'lobbyPms' | 'boldPayment' | 'doorSystem' | 'email')
   * @param encryptedSettings - Verschlüsselte Settings aus Datenbank
   * @returns Entschlüsselte Settings
   */
  getDecryptedBranchSettings<T = any>(
    branchId: number,
    settingsType: 'whatsapp' | 'lobbyPms' | 'boldPayment' | 'doorSystem' | 'email',
    encryptedSettings: any
  ): T | null {
    if (!encryptedSettings) {
      return null;
    }

    const cacheKey = `branch-${branchId}-${settingsType}`;
    const now = Date.now();

    // Prüfe Cache
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.TTL_MS) {
      return cached.data as T;
    }

    // Cache miss - entschlüssele neu
    try {
      const decrypted = decryptBranchApiSettings(encryptedSettings);
      const data = decrypted as T;

      // Speichere im Cache
      this.cache.set(cacheKey, {
        data,
        timestamp: now
      });

      return data;
    } catch (error) {
      console.error(`[BranchSettingsCache] Fehler beim Entschlüsseln für Branch ${branchId}, Type ${settingsType}:`, error);
      return null;
    }
  }

  /**
   * Gibt entschlüsselte Organization-Settings zurück (aus Cache oder neu entschlüsselt)
   * 
   * @param organizationId - Organization-ID
   * @param settingsType - Typ der Settings
   * @param encryptedSettings - Verschlüsselte Settings aus Datenbank
   * @returns Entschlüsselte Settings
   */
  getDecryptedOrgSettings<T = any>(
    organizationId: number,
    settingsType: 'whatsapp' | 'lobbyPms' | 'boldPayment' | 'doorSystem' | 'email',
    encryptedSettings: any
  ): T | null {
    if (!encryptedSettings) {
      return null;
    }

    const cacheKey = `org-${organizationId}-${settingsType}`;
    const now = Date.now();

    // Prüfe Cache
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.TTL_MS) {
      return cached.data as T;
    }

    // Cache miss - entschlüssele neu
    try {
      const decrypted = decryptApiSettings(encryptedSettings);
      // Extrahiere den spezifischen Settings-Typ
      const data = (decrypted as any)[settingsType] || decrypted as T;

      // Speichere im Cache
      this.cache.set(cacheKey, {
        data,
        timestamp: now
      });

      return data as T;
    } catch (error) {
      console.error(`[BranchSettingsCache] Fehler beim Entschlüsseln für Org ${organizationId}, Type ${settingsType}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für einen Branch
   * 
   * @param branchId - Branch-ID
   * @param settingsType - Optional: Nur bestimmten Settings-Typ invalidieren
   */
  invalidateBranch(branchId: number, settingsType?: 'whatsapp' | 'lobbyPms' | 'boldPayment' | 'doorSystem' | 'email'): void {
    if (settingsType) {
      const cacheKey = `branch-${branchId}-${settingsType}`;
      this.cache.delete(cacheKey);
    } else {
      // Lösche alle Settings für diesen Branch
      const prefix = `branch-${branchId}-`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Invalidiert Cache für eine Organization
   * 
   * @param organizationId - Organization-ID
   * @param settingsType - Optional: Nur bestimmten Settings-Typ invalidieren
   */
  invalidateOrganization(organizationId: number, settingsType?: 'whatsapp' | 'lobbyPms' | 'boldPayment' | 'doorSystem' | 'email'): void {
    if (settingsType) {
      const cacheKey = `org-${organizationId}-${settingsType}`;
      this.cache.delete(cacheKey);
    } else {
      // Lösche alle Settings für diese Organization
      const prefix = `org-${organizationId}-`;
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Leert den gesamten Cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gibt Cache-Statistiken zurück (für Debugging)
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton-Instanz
export const branchSettingsCache = new BranchSettingsCache();

