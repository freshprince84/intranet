import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { cacheCleanupService } from './cacheCleanupService';

/**
 * Cache-Eintrag für Filter-Listen
 */
interface FilterListCacheEntry {
  filters: any[];
  timestamp: number;
}

/**
 * Cache-Eintrag für Filter-Gruppen
 */
interface FilterGroupListCacheEntry {
  groups: any[];
  timestamp: number;
}

/**
 * In-Memory Cache für Filter-Listen und Filter-Gruppen
 * 
 * TTL: 5 Minuten
 * MAX_SIZE: 500 Einträge pro Map
 * Auto-Cleanup: Ja
 */
class FilterListCache {
  private filterListCache: Map<string, FilterListCacheEntry> = new Map();
  private filterGroupListCache: Map<string, FilterGroupListCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly MAX_SIZE = 500;

  /**
   * Prüft, ob ein Cache-Eintrag noch gültig ist
   */
  private isCacheValid(entry: FilterListCacheEntry | FilterGroupListCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Lädt Filter-Listen aus Cache oder Datenbank
   * 
   * @param userId - User-ID
   * @param tableId - Table-ID
   * @returns Filter-Listen oder null wenn nicht gefunden
   */
  async getFilters(userId: number, tableId: string): Promise<any[] | null> {
    const cacheKey = `${userId}:${tableId}`;
    
    // 1. Prüfe Cache
    const cached = this.filterListCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      logger.log(`[FilterListCache] ✅ Cache-Hit für Filter-Liste ${cacheKey}`);
      return cached!.filters;
    }

    // 2. ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
    try {
      const savedFilters = await prisma.savedFilter.findMany({
        where: {
          userId,
          tableId
        }
      });

      // 3. Parse die JSON-Strings zurück in Arrays
      const parsedFilters = savedFilters.map(filter => {
        return {
          id: filter.id,
          userId: filter.userId,
          tableId: filter.tableId,
          name: filter.name,
          conditions: JSON.parse(filter.conditions),
          operators: JSON.parse(filter.operators),
          groupId: filter.groupId,
          order: filter.order,
          createdAt: filter.createdAt,
          updatedAt: filter.updatedAt
        };
      });

      // 4. Speichere im Cache
      this.filterListCache.set(cacheKey, {
        filters: parsedFilters,
        timestamp: Date.now()
      });

      logger.log(`[FilterListCache] 💾 Cache-Miss für Filter-Liste ${cacheKey} - aus DB geladen und gecacht`);

      return parsedFilters;
    } catch (error) {
      logger.error(`[FilterListCache] Fehler beim Laden von Filter-Liste ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Lädt Filter-Gruppen aus Cache oder Datenbank
   * 
   * @param userId - User-ID
   * @param tableId - Table-ID
   * @returns Filter-Gruppen oder null wenn nicht gefunden
   */
  async getFilterGroups(userId: number, tableId: string): Promise<any[] | null> {
    const cacheKey = `${userId}:${tableId}`;
    
    // 1. Prüfe Cache
    const cached = this.filterGroupListCache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      logger.log(`[FilterListCache] ✅ Cache-Hit für Filter-Gruppen ${cacheKey}`);
      return cached!.groups;
    }

    // 2. ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
    try {
      const groups = await prisma.filterGroup.findMany({
        where: {
          userId,
          tableId
        },
        include: {
          filters: {
            orderBy: {
              order: 'asc'
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      });

      // 3. Parse die JSON-Strings der Filter zurück in Arrays
      // ✅ FIX: Filtere User-Filter-Gruppen nach aktiven Usern
      const parsedGroups = await Promise.all(groups.map(async (group) => {
        let filters = group.filters.map(filter => {
          return {
            id: filter.id,
            userId: filter.userId,
            tableId: filter.tableId,
            name: filter.name,
            conditions: JSON.parse(filter.conditions),
            operators: JSON.parse(filter.operators),
            groupId: filter.groupId,
            order: filter.order,
            createdAt: filter.createdAt,
            updatedAt: filter.updatedAt
          };
        });

        // ✅ FIX: Filtere User-Filter-Gruppen nach aktiven Usern
        if (group.name === 'Users' || group.name === 'Benutzer' || group.name === 'Usuarios') {
          // Extrahiere User-IDs aus Filter-Bedingungen (Format: user-{id})
          const userIds: number[] = [];
          filters.forEach(filter => {
            if (Array.isArray(filter.conditions)) {
              filter.conditions.forEach((condition: any) => {
                if (condition.value && typeof condition.value === 'string' && condition.value.startsWith('user-')) {
                  const userId = parseInt(condition.value.replace('user-', ''), 10);
                  if (!isNaN(userId)) {
                    userIds.push(userId);
                  }
                }
              });
            }
          });

          // Prüfe welche User noch aktiv sind
          if (userIds.length > 0) {
            const activeUsers = await prisma.user.findMany({
              where: {
                id: { in: userIds },
                active: true
              },
              select: { id: true }
            });
            const activeUserIds = new Set(activeUsers.map(u => u.id));

            // Filtere Filter heraus, deren User nicht mehr aktiv sind
            filters = filters.filter(filter => {
              if (Array.isArray(filter.conditions)) {
                return filter.conditions.some((condition: any) => {
                  if (condition.value && typeof condition.value === 'string' && condition.value.startsWith('user-')) {
                    const userId = parseInt(condition.value.replace('user-', ''), 10);
                    return !isNaN(userId) && activeUserIds.has(userId);
                  }
                  return true; // Nicht-User-Filter behalten
                });
              }
              return true; // Filter ohne Bedingungen behalten
            });
          }
        }

        return {
          id: group.id,
          userId: group.userId,
          tableId: group.tableId,
          name: group.name,
          order: group.order,
          filters,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        };
      }));

      // 4. Speichere im Cache
      this.filterGroupListCache.set(cacheKey, {
        groups: parsedGroups,
        timestamp: Date.now()
      });

      logger.log(`[FilterListCache] 💾 Cache-Miss für Filter-Gruppen ${cacheKey} - aus DB geladen und gecacht`);

      return parsedGroups;
    } catch (error) {
      logger.error(`[FilterListCache] Fehler beim Laden von Filter-Gruppen ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für Filter-Listen eines Users und einer Tabelle
   * Wird aufgerufen, wenn Filter erstellt, aktualisiert oder gelöscht werden
   * 
   * @param userId - User-ID
   * @param tableId - Table-ID
   */
  invalidate(userId: number, tableId: string): void {
    const cacheKey = `${userId}:${tableId}`;
    this.filterListCache.delete(cacheKey);
    this.filterGroupListCache.delete(cacheKey);
    logger.log(`[FilterListCache] 🗑️ Cache invalidiert für ${cacheKey}`);
  }

  /**
   * Leert den gesamten Cache
   */
  clear(): void {
    this.filterListCache.clear();
    this.filterGroupListCache.clear();
  }

  /**
   * Gibt Cache-Statistiken zurück (für Monitoring)
   */
  getStats(): { size: number; validEntries: number } {
    const now = Date.now();
    let validEntries = 0;
    
    for (const entry of this.filterListCache.values()) {
      if ((now - entry.timestamp) < this.TTL_MS) {
        validEntries++;
      }
    }
    
    for (const entry of this.filterGroupListCache.values()) {
      if ((now - entry.timestamp) < this.TTL_MS) {
        validEntries++;
      }
    }

    return {
      size: this.filterListCache.size + this.filterGroupListCache.size,
      validEntries
    };
  }

  cleanup(): number {
    const now = Date.now();
    let deleted = 0;

    // Cleanup filterListCache
    for (const [key, entry] of this.filterListCache) {
      if ((now - entry.timestamp) >= this.TTL_MS) {
        this.filterListCache.delete(key);
        deleted++;
      }
    }

    // Cleanup filterGroupListCache
    for (const [key, entry] of this.filterGroupListCache) {
      if ((now - entry.timestamp) >= this.TTL_MS) {
        this.filterGroupListCache.delete(key);
        deleted++;
      }
    }

    // LRU-Eviction für filterListCache
    if (this.filterListCache.size > this.MAX_SIZE) {
      const entries = Array.from(this.filterListCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = this.filterListCache.size - this.MAX_SIZE;
      for (let i = 0; i < toDelete; i++) {
        this.filterListCache.delete(entries[i][0]);
        deleted++;
      }
    }

    // LRU-Eviction für filterGroupListCache
    if (this.filterGroupListCache.size > this.MAX_SIZE) {
      const entries = Array.from(this.filterGroupListCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = this.filterGroupListCache.size - this.MAX_SIZE;
      for (let i = 0; i < toDelete; i++) {
        this.filterGroupListCache.delete(entries[i][0]);
        deleted++;
      }
    }

    return deleted;
  }

  register(): void {
    cacheCleanupService.register({
      name: 'filterListCache',
      cleanup: () => this.cleanup(),
      getStats: () => this.getStats(),
      clear: () => this.clear()
    });
  }
}

// Singleton-Instanz
export const filterListCache = new FilterListCache();
filterListCache.register();
