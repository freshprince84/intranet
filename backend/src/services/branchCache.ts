import { prisma } from '../utils/prisma';
import { getDataIsolationFilter } from '../middleware/organization';
import { Request } from 'express';
import { logger } from '../utils/logger';
import { cacheCleanupService } from './cacheCleanupService';

interface Branch {
  id: number;
  name: string;
  lastUsed?: boolean;
}

interface BranchCacheEntry {
  data: Branch[];
  timestamp: number;
}

/**
 * In-Memory Cache für User-Branches
 * 
 * TTL: 5 Minuten
 * MAX_SIZE: 500 Einträge
 * Auto-Cleanup: Ja
 */
class BranchCache {
  private cache: Map<string, BranchCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly MAX_SIZE = 500;

  private isCacheValid(entry: BranchCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Generiert Cache-Key unter Berücksichtigung von Datenisolation
   */
  private getCacheKey(userId: number, organizationId?: number, roleId?: string): string {
    return `${userId}:${organizationId || 'null'}:${roleId || 'null'}`;
  }

  /**
   * Lädt Branches aus Cache oder Datenbank
   * 
   * @param userId - User-ID
   * @param req - Request-Objekt für getDataIsolationFilter
   * @returns Branches oder null wenn nicht gefunden
   */
  async get(userId: number, req: Request): Promise<Branch[] | null> {
    // ✅ SICHERHEIT: Cache-Key unter Berücksichtigung von Datenisolation
    const organizationId = (req as any).organizationId;
    const roleId = (req as any).roleId;
    const cacheKey = this.getCacheKey(userId, organizationId, roleId);
    
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      // ✅ SICHERHEIT: getDataIsolationFilter berücksichtigen
      const branchFilter = getDataIsolationFilter(req, 'branch');
      
      // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
      const userBranches = await prisma.usersBranches.findMany({
        where: {
          userId: userId,
          lastUsed: true,
          branch: branchFilter // ✅ Datenisolation!
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          branch: {
            name: 'asc'
          }
        }
      });

      const branches = userBranches.map(ub => ({
        id: ub.branch.id,
        name: ub.branch.name,
        lastUsed: ub.lastUsed
      }));

      this.cache.set(cacheKey, {
        data: branches,
        timestamp: Date.now()
      });

      return branches;
    } catch (error) {
      logger.error(`[BranchCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für einen bestimmten User
   * Wird aufgerufen, wenn User-Branches geändert werden
   * 
   * @param userId - User-ID
   * @param organizationId - Organization-ID (optional)
   * @param roleId - Role-ID (optional)
   */
  invalidate(userId: number, organizationId?: number, roleId?: string): void {
    const cacheKey = this.getCacheKey(userId, organizationId, roleId);
    this.cache.delete(cacheKey);
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
      name: 'branchCache',
      cleanup: () => this.cleanup(),
      getStats: () => this.getStats(),
      clear: () => this.clear()
    });
  }
}

// Singleton-Instanz
export const branchCache = new BranchCache();
branchCache.register();

