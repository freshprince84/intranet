import { prisma } from '../utils/prisma';
import { cacheCleanupService } from './cacheCleanupService';

/**
 * Cache-Eintrag für Notification Settings
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-Memory Cache für Notification Settings
 * 
 * TTL: 5 Minuten
 * MAX_SIZE: 500 Einträge
 * Auto-Cleanup: Ja
 */
class NotificationSettingsCache {
  private userSettingsCache: Map<number, CacheEntry<any>> = new Map();
  private systemSettingsCache: CacheEntry<any> | null = null;
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly MAX_SIZE = 500;

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
  getStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    
    for (const entry of this.userSettingsCache.values()) {
      if ((now - entry.timestamp) < entry.ttl) {
        validEntries++;
      }
    }
    if (this.isCacheValid(this.systemSettingsCache)) {
      validEntries++;
    }

    return {
      size: this.userSettingsCache.size + (this.systemSettingsCache ? 1 : 0),
      validEntries
    };
  }

  cleanup(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.userSettingsCache) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.userSettingsCache.delete(key);
        deleted++;
      }
    }

    if (this.systemSettingsCache && !this.isCacheValid(this.systemSettingsCache)) {
      this.systemSettingsCache = null;
      deleted++;
    }

    if (this.userSettingsCache.size > this.MAX_SIZE) {
      const entries = Array.from(this.userSettingsCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = this.userSettingsCache.size - this.MAX_SIZE;
      for (let i = 0; i < toDelete; i++) {
        this.userSettingsCache.delete(entries[i][0]);
        deleted++;
      }
    }

    return deleted;
  }

  register(): void {
    cacheCleanupService.register({
      name: 'notificationSettingsCache',
      cleanup: () => this.cleanup(),
      getStats: () => this.getStats(),
      clear: () => this.invalidateAll()
    });
  }
}

// Singleton-Instanz
export const notificationSettingsCache = new NotificationSettingsCache();
notificationSettingsCache.register();

