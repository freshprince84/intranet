"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.worktimeCache = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const cacheCleanupService_1 = require("./cacheCleanupService");
/**
 * In-Memory Cache für aktive Worktime
 *
 * TTL: 30 Sekunden
 * MAX_SIZE: 200 Einträge
 * Auto-Cleanup: Ja
 */
class WorktimeCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 30 * 1000;
        this.MAX_SIZE = 200;
    }
    /**
     * Prüft, ob ein Cache-Eintrag noch gültig ist
     */
    isCacheValid(entry) {
        if (!entry)
            return false;
        const now = Date.now();
        return (now - entry.timestamp) < this.TTL_MS;
    }
    /**
     * Lädt aktive Worktime aus Cache oder Datenbank
     *
     * @param userId - User-ID
     * @returns Worktime-Daten oder null wenn nicht gefunden
     */
    get(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Prüfe Cache
            const cached = this.cache.get(userId);
            if (this.isCacheValid(cached)) {
                return cached.data;
            }
            // 2. ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
            try {
                const activeWorktime = yield prisma_1.prisma.workTime.findFirst({
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
            }
            catch (error) {
                logger_1.logger.error(`[WorktimeCache] Fehler beim Laden für User ${userId}:`, error);
                return null;
            }
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten User
     * Wird aufgerufen, wenn Worktime gestartet oder gestoppt wird
     *
     * @param userId - User-ID
     */
    invalidate(userId) {
        this.cache.delete(userId);
    }
    /**
     * Leert den gesamten Cache
     */
    clear() {
        this.cache.clear();
    }
    getStats() {
        const now = Date.now();
        let validEntries = 0;
        for (const entry of this.cache.values()) {
            if ((now - entry.timestamp) < this.TTL_MS) {
                validEntries++;
            }
        }
        return { size: this.cache.size, validEntries };
    }
    cleanup() {
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
    register() {
        cacheCleanupService_1.cacheCleanupService.register({
            name: 'worktimeCache',
            cleanup: () => this.cleanup(),
            getStats: () => this.getStats(),
            clear: () => this.clear()
        });
    }
}
// Singleton-Instanz
exports.worktimeCache = new WorktimeCache();
exports.worktimeCache.register();
//# sourceMappingURL=worktimeCache.js.map