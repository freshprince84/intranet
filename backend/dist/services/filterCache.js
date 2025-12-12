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
exports.filterCache = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const cacheCleanupService_1 = require("./cacheCleanupService");
/**
 * In-Memory Cache für SavedFilter
 *
 * TTL: 5 Minuten
 * MAX_SIZE: 500 Einträge
 * Auto-Cleanup: Ja
 */
class FilterCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 5 * 60 * 1000;
        this.MAX_SIZE = 500;
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
     * Lädt einen Filter aus Cache oder Datenbank
     *
     * @param filterId - ID des Filters
     * @returns Filter-Daten oder null wenn nicht gefunden
     */
    get(filterId) {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Prüfe Cache
            const cached = this.cache.get(filterId);
            if (this.isCacheValid(cached)) {
                logger_1.logger.log(`[FilterCache] ✅ Cache-Hit für Filter ${filterId}`);
                return {
                    conditions: cached.filter.conditions,
                    operators: cached.filter.operators
                };
            }
            // 2. Lade aus Datenbank
            try {
                const savedFilter = yield prisma_1.prisma.savedFilter.findUnique({
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
                logger_1.logger.log(`[FilterCache] 💾 Cache-Miss für Filter ${filterId} - aus DB geladen und gecacht`);
                return {
                    conditions: savedFilter.conditions,
                    operators: savedFilter.operators
                };
            }
            catch (error) {
                logger_1.logger.error(`[FilterCache] Fehler beim Laden von Filter ${filterId}:`, error);
                return null;
            }
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten Filter
     * Wird aufgerufen, wenn Filter aktualisiert oder gelöscht wird
     *
     * @param filterId - ID des Filters
     */
    invalidate(filterId) {
        this.cache.delete(filterId);
    }
    /**
     * Leert den gesamten Cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Gibt Cache-Statistiken zurück (für Monitoring)
     */
    getStats() {
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
            name: 'filterCache',
            cleanup: () => this.cleanup(),
            getStats: () => this.getStats(),
            clear: () => this.clear()
        });
    }
}
// Singleton-Instanz
exports.filterCache = new FilterCache();
exports.filterCache.register();
//# sourceMappingURL=filterCache.js.map