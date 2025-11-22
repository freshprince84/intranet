import { prisma } from '../utils/prisma';

/**
 * Cache für User-Sprachen
 * 
 * Reduziert CPU-Last durch Vermeidung wiederholter komplexer DB-Queries
 * TTL: 10 Minuten (User-Sprache ändert sich selten)
 */

interface CacheEntry {
  language: string;
  timestamp: number;
}

class UserLanguageCache {
  private cache: Map<number, CacheEntry> = new Map();
  private readonly TTL_MS = 10 * 60 * 1000; // 10 Minuten

  /**
   * Prüft, ob ein Cache-Eintrag noch gültig ist
   */
  private isCacheValid(entry: CacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Gibt die gecachte Sprache für einen User zurück
   * 
   * @param userId - User-ID
   * @returns Gecachte Sprache oder null wenn nicht im Cache oder abgelaufen
   */
  get(userId: number): string | null {
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.language;
    }
    return null;
  }

  /**
   * Speichert die Sprache für einen User im Cache
   * 
   * @param userId - User-ID
   * @param language - Sprache
   */
  set(userId: number, language: string): void {
    this.cache.set(userId, {
      language,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidiert Cache für einen bestimmten User
   * Wird aufgerufen, wenn User-Sprache aktualisiert wird
   * 
   * @param userId - User-ID
   */
  invalidate(userId: number): void {
    this.cache.delete(userId);
  }

  /**
   * Leert den gesamten Cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gibt Cache-Statistiken zurück (für Monitoring)
   */
  getStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    
    for (const entry of this.cache.values()) {
      if ((now - entry.timestamp) < this.TTL_MS) {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      validEntries
    };
  }
}

// Singleton-Instanz
export const userLanguageCache = new UserLanguageCache();

