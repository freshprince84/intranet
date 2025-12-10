import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { cacheCleanupService } from './cacheCleanupService';

interface WorktimeCacheEntry {
  data: {
    active: boolean;
    worktime?: any;
  };
  timestamp: number;
}

/**
 * In-Memory Cache für aktive Worktime
 * 
 * TTL: 30 Sekunden
 * MAX_SIZE: 200 Einträge
 * Auto-Cleanup: Ja
 */
class WorktimeCache {
  private cache: Map<number, WorktimeCacheEntry> = new Map();
  private readonly TTL_MS = 30 * 1000;
  private readonly MAX_SIZE = 200;

  /**
   * Prüft, ob ein Cache-Eintrag noch gültig ist
   */
  private isCacheValid(entry: WorktimeCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Lädt aktive Worktime aus Cache oder Datenbank
   * 
   * @param userId - User-ID
   * @returns Worktime-Daten oder null wenn nicht gefunden
   */
  async get(userId: number): Promise<{ active: boolean; worktime?: any } | null> {
    // 1. Prüfe Cache
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // 2. ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
    try {
      const activeWorktime = await prisma.workTime.findFirst({
        where: {
          userId: userId,
          endTime: null
        },
        include: {
          branch: true
        }
      });

      const data = activeWorktime
        ? {
            active: true,
            worktime: activeWorktime
          }
        : {
            active: false
          };

      // 3. Speichere im Cache
      this.cache.set(userId, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      logger.error(`[WorktimeCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für einen bestimmten User
   * Wird aufgerufen, wenn Worktime gestartet oder gestoppt wird
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

  getStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    for (const entry of this.cache.values()) {
      if ((now - entry.timestamp) < this.TTL_MS) {
        validEntries++;
      }
    }
    return { size: this.cache.size, validEntries };
  }

  cleanup(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [key, entry] of this.cache) {
      if ((now - entry.timestamp) >= this.TTL_MS) {
        this.cache.delete(key);
        deleted++;
      }
    }

    if (this.cache.size > this.MAX_SIZE) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = this.cache.size - this.MAX_SIZE;
      for (let i = 0; i < toDelete; i++) {
        this.cache.delete(entries[i][0]);
        deleted++;
      }
    }

    return deleted;
  }

  register(): void {
    cacheCleanupService.register({
      name: 'worktimeCache',
      cleanup: () => this.cleanup(),
      getStats: () => this.getStats(),
      clear: () => this.clear()
    });
  }
}

// Singleton-Instanz
export const worktimeCache = new WorktimeCache();
worktimeCache.register();

