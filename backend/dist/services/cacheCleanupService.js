"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheCleanupService = void 0;
const logger_1 = require("../utils/logger");
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
    constructor() {
        this.caches = new Map();
        this.cleanupInterval = null;
        this.CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 Minuten
        this.isRunning = false;
    }
    /**
     * Registriert einen Cache beim Cleanup-Service
     */
    register(cache) {
        if (this.caches.has(cache.name)) {
            logger_1.logger.warn(`[CacheCleanup] Cache "${cache.name}" ist bereits registriert`);
            return;
        }
        this.caches.set(cache.name, cache);
        logger_1.logger.log(`[CacheCleanup] ✅ Cache "${cache.name}" registriert`);
    }
    /**
     * Entfernt einen Cache aus dem Cleanup-Service
     */
    unregister(name) {
        this.caches.delete(name);
    }
    /**
     * Startet den periodischen Cleanup
     */
    start() {
        if (this.isRunning) {
            logger_1.logger.warn('[CacheCleanup] Service läuft bereits');
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
        logger_1.logger.log(`[CacheCleanup] 🚀 Service gestartet (Intervall: ${this.CLEANUP_INTERVAL_MS / 1000}s)`);
    }
    /**
     * Stoppt den periodischen Cleanup
     */
    stop() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.isRunning = false;
        logger_1.logger.log('[CacheCleanup] ⏹️ Service gestoppt');
    }
    /**
     * Führt Cleanup für alle registrierten Caches durch
     */
    runCleanup() {
        const startTime = Date.now();
        let totalDeleted = 0;
        const results = [];
        for (const [name, cache] of this.caches) {
            try {
                const deleted = cache.cleanup();
                totalDeleted += deleted;
                const stats = cache.getStats();
                results.push(`${name}: ${deleted} gelöscht, ${stats.size} verbleibend (${stats.validEntries} gültig)`);
            }
            catch (error) {
                logger_1.logger.error(`[CacheCleanup] Fehler bei Cache "${name}":`, error);
            }
        }
        const duration = Date.now() - startTime;
        if (totalDeleted > 0 || results.length > 0) {
            logger_1.logger.log(`[CacheCleanup] 🧹 Cleanup abgeschlossen in ${duration}ms:`);
            results.forEach(r => logger_1.logger.log(`  - ${r}`));
            logger_1.logger.log(`  → Gesamt gelöscht: ${totalDeleted} Einträge`);
        }
    }
    /**
     * Gibt Statistiken aller Caches zurück
     */
    getAllStats() {
        const stats = {};
        for (const [name, cache] of this.caches) {
            stats[name] = cache.getStats();
        }
        return stats;
    }
    /**
     * Leert alle Caches (für Debugging/Testing)
     */
    clearAll() {
        for (const [name, cache] of this.caches) {
            cache.clear();
            logger_1.logger.log(`[CacheCleanup] Cache "${name}" geleert`);
        }
    }
    /**
     * Gibt Memory-Statistiken zurück
     */
    getMemoryStats() {
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
exports.cacheCleanupService = new CacheCleanupService();
//# sourceMappingURL=cacheCleanupService.js.map