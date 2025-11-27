import { prisma, executeWithRetry } from '../utils/prisma';

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
 * Reduziert Datenbank-Queries drastisch, da getActiveWorktime sehr häufig
 * aufgerufen wird (alle 30 Sekunden Polling).
 * 
 * TTL: 5 Sekunden (kurz, da sich Status schnell ändern kann)
 */
class WorktimeCache {
  private cache: Map<number, WorktimeCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 1000; // 5 Sekunden

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

    // 2. Lade aus Datenbank mit Retry-Logik
    try {
      const activeWorktime = await executeWithRetry(() =>
        prisma.workTime.findFirst({
          where: {
            userId: userId,
            endTime: null
          },
          include: {
            branch: true
          }
        })
      );

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
      console.error(`[WorktimeCache] Fehler beim Laden für User ${userId}:`, error);
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
}

// Singleton-Instanz
export const worktimeCache = new WorktimeCache();

