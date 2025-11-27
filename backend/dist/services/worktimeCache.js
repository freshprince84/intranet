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
/**
 * In-Memory Cache für aktive Worktime
 *
 * Reduziert Datenbank-Queries drastisch, da getActiveWorktime sehr häufig
 * aufgerufen wird (alle 30 Sekunden Polling).
 *
 * TTL: 5 Sekunden (kurz, da sich Status schnell ändern kann)
 */
class WorktimeCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 30 * 1000; // 30 Sekunden (gleich wie Polling-Intervall - reduziert DB-Queries um 83%)
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
                console.error(`[WorktimeCache] Fehler beim Laden für User ${userId}:`, error);
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
}
// Singleton-Instanz
exports.worktimeCache = new WorktimeCache();
//# sourceMappingURL=worktimeCache.js.map