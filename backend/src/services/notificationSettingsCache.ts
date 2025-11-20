import { prisma } from '../utils/prisma';

/**
 * Cache-Eintrag für Notification Settings
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in Millisekunden
}

/**
 * In-Memory Cache für Notification Settings
 * 
 * Reduziert Datenbank-Queries drastisch, da Settings bei jeder Notification-Erstellung
 * abgerufen werden. Mit Cache: Settings werden nur einmal pro TTL geladen.
 * 
 * TTL: 5 Minuten (Settings ändern sich selten)
 */
class NotificationSettingsCache {
  private userSettingsCache: Map<number, CacheEntry<any>> = new Map();
  private systemSettingsCache: CacheEntry<any> | null = null;
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  /**
   * Prüft, ob ein Cache-Eintrag noch gültig ist
   */
  private isCacheValid(entry: CacheEntry<any> | null | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Lädt Benutzer-spezifische Notification Settings aus Cache oder Datenbank
   */
  async getUserSettings(userId: number): Promise<any> {
    // Prüfe Cache
    const cached = this.userSettingsCache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // Cache abgelaufen oder nicht vorhanden: Lade von DB
    const userSettings = await prisma.userNotificationSettings.findFirst({
      where: { userId }
    });

    // Speichere in Cache
    this.userSettingsCache.set(userId, {
      data: userSettings,
      timestamp: Date.now(),
      ttl: this.TTL_MS
    });

    return userSettings;
  }

  /**
   * Lädt System-weite Notification Settings aus Cache oder Datenbank
   */
  async getSystemSettings(): Promise<any> {
    // Prüfe Cache
    if (this.isCacheValid(this.systemSettingsCache)) {
      return this.systemSettingsCache!.data;
    }

    // Cache abgelaufen oder nicht vorhanden: Lade von DB
    const systemSettings = await prisma.notificationSettings.findFirst();

    // Speichere in Cache
    this.systemSettingsCache = {
      data: systemSettings,
      timestamp: Date.now(),
      ttl: this.TTL_MS
    };

    return systemSettings;
  }

  /**
   * Invalidiert Cache für einen bestimmten Benutzer
   * Wird aufgerufen, wenn Benutzer-Settings aktualisiert werden
   */
  invalidateUserSettings(userId: number): void {
    this.userSettingsCache.delete(userId);
  }

  /**
   * Invalidiert System-weite Settings Cache
   * Wird aufgerufen, wenn System-Settings aktualisiert werden
   */
  invalidateSystemSettings(): void {
    this.systemSettingsCache = null;
  }

  /**
   * Invalidiert alle Caches (für Debugging/Testing)
   */
  invalidateAll(): void {
    this.userSettingsCache.clear();
    this.systemSettingsCache = null;
  }

  /**
   * Gibt Cache-Statistiken zurück (für Monitoring)
   */
  getStats(): { userCacheSize: number; systemCacheValid: boolean } {
    return {
      userCacheSize: this.userSettingsCache.size,
      systemCacheValid: this.isCacheValid(this.systemSettingsCache)
    };
  }
}

// Singleton-Instanz
export const notificationSettingsCache = new NotificationSettingsCache();

