import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { cacheCleanupService } from './cacheCleanupService';

interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingProgress: any;
  onboardingStartedAt: Date | null;
  onboardingCompletedAt: Date | null;
}

interface OnboardingCacheEntry {
  data: OnboardingStatus;
  timestamp: number;
}

/**
 * In-Memory Cache für Onboarding-Status
 * 
 * TTL: 5 Minuten
 * MAX_SIZE: 200 Einträge
 * Auto-Cleanup: Ja
 */
class OnboardingCache {
  private cache: Map<number, OnboardingCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000;
  private readonly MAX_SIZE = 200;

  private isCacheValid(entry: OnboardingCacheEntry | undefined): boolean {
    if (!entry) return false;
    const now = Date.now();
    return (now - entry.timestamp) < this.TTL_MS;
  }

  /**
   * Lädt Onboarding-Status aus Cache oder Datenbank
   * 
   * @param userId - User-ID
   * @returns Onboarding-Status oder null wenn nicht gefunden
   */
  async get(userId: number): Promise<OnboardingStatus | null> {
    const cached = this.cache.get(userId);
    if (this.isCacheValid(cached)) {
      return cached!.data;
    }

    try {
      // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          onboardingCompleted: true,
          onboardingProgress: true,
          onboardingStartedAt: true,
          onboardingCompletedAt: true
        }
      });

      if (!user) {
        return null;
      }

      const status: OnboardingStatus = {
        onboardingCompleted: user.onboardingCompleted,
        onboardingProgress: user.onboardingProgress,
        onboardingStartedAt: user.onboardingStartedAt,
        onboardingCompletedAt: user.onboardingCompletedAt
      };

      this.cache.set(userId, {
        data: status,
        timestamp: Date.now()
      });

      return status;
    } catch (error) {
      logger.error(`[OnboardingCache] Fehler beim Laden für User ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalidiert Cache für einen bestimmten User
   * Wird aufgerufen, wenn Onboarding-Status geändert wird
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
      name: 'onboardingCache',
      cleanup: () => this.cleanup(),
      getStats: () => this.getStats(),
      clear: () => this.clear()
    });
  }
}

// Singleton-Instanz
export const onboardingCache = new OnboardingCache();
onboardingCache.register();

