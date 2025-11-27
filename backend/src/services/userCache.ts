import { prisma, executeWithRetry } from '../utils/prisma';

interface UserCacheEntry {
  data: {
    user: any;
    roleId?: string;
  };
  timestamp: number;
}

/**
 * In-Memory Cache für User-Daten aus authMiddleware
 * 
 * Reduziert Datenbank-Queries drastisch, da authMiddleware bei JEDEM Request
 * eine komplexe Query ausführt (User + Roles + Permissions + Settings).
 * 
 * TTL: 30 Sekunden (User-Daten ändern sich selten, aber müssen aktuell bleiben)
 */
class UserCache {
  private cache: Map<number, UserCacheEntry> = new Map();
  private readonly TTL_MS = 30 * 1000; // 30 Sekunden

  /**
   * Prüft, ob ein Cache-Eintrag noch gültig ist
   */
  private isCacheValid(entry: UserCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Lädt User-Daten aus Cache oder Datenbank
   * 
   * @param userId - User-ID
   * @returns User-Daten mit Roles, Permissions, Settings oder null wenn nicht gefunden
   */
  async get(userId: number): Promise<{ user: any; roleId?: string } | null> {
    // 1. Prüfe Cache
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    // 2. Lade aus Datenbank mit Retry-Logik
    try {
      const user = await executeWithRetry(() =>
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: true
                  }
                }
              }
            },
            settings: true
          }
        })
      );

      if (!user) {
        return null;
      }

      // Finde aktive Rolle
      const activeRole = user.roles.find(r => r.lastUsed);
      const roleId = activeRole ? String(activeRole.role.id) : undefined;

      const data = {
        user,
        roleId
      };

      // 3. Speichere im Cache
      this.cache.set(userId, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`[UserCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für einen bestimmten User
   * Wird aufgerufen, wenn User-Daten, Rollen oder Permissions geändert werden
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
export const userCache = new UserCache();

