import { prisma } from '../utils/prisma';

/**
 * Cache-Eintrag für SavedFilter
 */
interface FilterCacheEntry {
  filter: {
    id: number;
    conditions: string;
    operators: string;
  };
  timestamp: number;
}

/**
 * In-Memory Cache für SavedFilter
 * 
 * Reduziert Datenbank-Queries drastisch, da Filter bei jedem Request
 * abgerufen werden. Mit Cache: Filter werden nur einmal pro TTL geladen.
 * 
 * TTL: 5 Minuten (Filter ändern sich selten)
 */
class FilterCache {
  private cache: Map<number, FilterCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  /**
   * Prüft, ob ein Cache-Eintrag noch gültig ist
   */
  private isCacheValid(entry: FilterCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Lädt einen Filter aus Cache oder Datenbank
   * 
   * @param filterId - ID des Filters
   * @returns Filter-Daten oder null wenn nicht gefunden
   */
  async get(filterId: number): Promise<{ conditions: string; operators: string } | null> {
    // 1. Prüfe Cache
    const cached = this.cache.get(filterId);
    if (this.isCacheValid(cached)) {
      console.log(`[FilterCache] ✅ Cache-Hit für Filter ${filterId}`);
      return {
        conditions: cached!.filter.conditions,
        operators: cached!.filter.operators
      };
    }

    // 2. Lade aus Datenbank
    try {
      const savedFilter = await prisma.savedFilter.findUnique({
        where: { id: filterId },
        select: {
          id: true,
          conditions: true,
          operators: true
        }
      });

      if (!savedFilter) {
        return null;
      }

      // 3. Speichere im Cache
      this.cache.set(filterId, {
        filter: {
          id: savedFilter.id,
          conditions: savedFilter.conditions,
          operators: savedFilter.operators
        },
        timestamp: Date.now()
      });

      console.log(`[FilterCache] 💾 Cache-Miss für Filter ${filterId} - aus DB geladen und gecacht`);

      return {
        conditions: savedFilter.conditions,
        operators: savedFilter.operators
      };
    } catch (error) {
      console.error(`[FilterCache] Fehler beim Laden von Filter ${filterId}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für einen bestimmten Filter
   * Wird aufgerufen, wenn Filter aktualisiert oder gelöscht wird
   * 
   * @param filterId - ID des Filters
   */
  invalidate(filterId: number): void {
    this.cache.delete(filterId);
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
export const filterCache = new FilterCache();

