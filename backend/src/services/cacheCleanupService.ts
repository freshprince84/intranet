import { logger } from '../utils/logger';

/**
 * Interface für Cache-Instanzen die sich beim CleanupService registrieren
 */
interface CacheInstance {
  name: string;
  cleanup: () => number; // Gibt Anzahl gelöschter Einträge zurück
  getStats: () => { size: number; validEntries: number };
  clear: () => void;
}

/**
 * Zentraler Cache-Cleanup-Service
 * 
 * Löst das Memory-Leak-Problem durch:
 * 1. Periodisches Cleanup aller registrierten Caches (alle 5 Minuten)
 * 2. Entfernt abgelaufene Einträge automatisch
 * 3. Logging für Monitoring
 * 
 * WICHTIG: Alle Cache-Services müssen sich hier registrieren!
 */
class CacheCleanupService {
  private caches: Map<string, CacheInstance> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten
  private isRunning = false;

  /**
   * Registriert einen Cache beim Cleanup-Service
   */
  register(cache: CacheInstance): void {
    if (this.caches.has(cache.name)) {
      logger.warn(`[CacheCleanup] Cache "${cache.name}" ist bereits registriert`);
      return;
    }
    this.caches.set(cache.name, cache);
    logger.log(`[CacheCleanup] ✅ Cache "${cache.name}" registriert`);
  }

  /**
   * Entfernt einen Cache aus dem Cleanup-Service
   */
  unregister(name: string): void {
    this.caches.delete(name);
  }

  /**
   * Startet den periodischen Cleanup
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[CacheCleanup] Service läuft bereits');
      return;
    }

    this.isRunning = true;
    
    // Initialer Cleanup nach 1 Minute (Server-Start abwarten)
    setTimeout(() => {
      this.runCleanup();
    }, 60 * 1000);

    // Periodischer Cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);

    logger.log(`[CacheCleanup] 🚀 Service gestartet (Intervall: ${this.CLEANUP_INTERVAL_MS / 1000}s)`);
  }

  /**
   * Stoppt den periodischen Cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    logger.log('[CacheCleanup] ⏹️ Service gestoppt');
  }

  /**
   * Führt Cleanup für alle registrierten Caches durch
   */
  runCleanup(): void {
    const startTime = Date.now();
    let totalDeleted = 0;
    const results: string[] = [];

    for (const [name, cache] of this.caches) {
      try {
        const deleted = cache.cleanup();
        totalDeleted += deleted;
        const stats = cache.getStats();
        results.push(`${name}: ${deleted} gelöscht, ${stats.size} verbleibend (${stats.validEntries} gültig)`);
      } catch (error) {
        logger.error(`[CacheCleanup] Fehler bei Cache "${name}":`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    if (totalDeleted > 0 || results.length > 0) {
      logger.log(`[CacheCleanup] 🧹 Cleanup abgeschlossen in ${duration}ms:`);
      results.forEach(r => logger.log(`  - ${r}`));
      logger.log(`  → Gesamt gelöscht: ${totalDeleted} Einträge`);
    }
  }

  /**
   * Gibt Statistiken aller Caches zurück
   */
  getAllStats(): Record<string, { size: number; validEntries: number }> {
    const stats: Record<string, { size: number; validEntries: number }> = {};
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Leert alle Caches (für Debugging/Testing)
   */
  clearAll(): void {
    for (const [name, cache] of this.caches) {
      cache.clear();
      logger.log(`[CacheCleanup] Cache "${name}" geleert`);
    }
  }

  /**
   * Gibt Memory-Statistiken zurück
   */
  getMemoryStats(): { heapUsed: number; heapTotal: number; external: number; cacheCount: number } {
    const mem = process.memoryUsage();
    return {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(mem.external / 1024 / 1024 * 100) / 100, // MB
      cacheCount: this.caches.size
    };
  }
}

// Singleton-Instanz
export const cacheCleanupService = new CacheCleanupService();

