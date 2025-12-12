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
exports.filterListCache = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const cacheCleanupService_1 = require("./cacheCleanupService");
/**
 * In-Memory Cache für Filter-Listen und Filter-Gruppen
 *
 * TTL: 5 Minuten
 * MAX_SIZE: 500 Einträge pro Map
 * Auto-Cleanup: Ja
 */
class FilterListCache {
    constructor() {
        this.filterListCache = new Map();
        this.filterGroupListCache = new Map();
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
     * Lädt Filter-Listen aus Cache oder Datenbank
     *
     * @param userId - User-ID
     * @param tableId - Table-ID
     * @returns Filter-Listen oder null wenn nicht gefunden
     */
    getFilters(userId, tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `${userId}:${tableId}`;
            // 1. Prüfe Cache
            const cached = this.filterListCache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                logger_1.logger.log(`[FilterListCache] ✅ Cache-Hit für Filter-Liste ${cacheKey}`);
                return cached.filters;
            }
            // 2. ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
            try {
                const savedFilters = yield prisma_1.prisma.savedFilter.findMany({
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
                logger_1.logger.log(`[FilterListCache] 💾 Cache-Miss für Filter-Liste ${cacheKey} - aus DB geladen und gecacht`);
                return parsedFilters;
            }
            catch (error) {
                logger_1.logger.error(`[FilterListCache] Fehler beim Laden von Filter-Liste ${cacheKey}:`, error);
                return null;
            }
        });
    }
    /**
     * Lädt Filter-Gruppen aus Cache oder Datenbank
     *
     * @param userId - User-ID
     * @param tableId - Table-ID
     * @returns Filter-Gruppen oder null wenn nicht gefunden
     */
    getFilterGroups(userId, tableId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheKey = `${userId}:${tableId}`;
            // 1. Prüfe Cache
            const cached = this.filterGroupListCache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                logger_1.logger.log(`[FilterListCache] ✅ Cache-Hit für Filter-Gruppen ${cacheKey}`);
                return cached.groups;
            }
            // 2. ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
            try {
                const groups = yield prisma_1.prisma.filterGroup.findMany({
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
                const parsedGroups = yield Promise.all(groups.map((group) => __awaiter(this, void 0, void 0, function* () {
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
                        const userIds = [];
                        filters.forEach(filter => {
                            if (Array.isArray(filter.conditions)) {
                                filter.conditions.forEach((condition) => {
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
                            const activeUsers = yield prisma_1.prisma.user.findMany({
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
                                    return filter.conditions.some((condition) => {
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
                })));
                // 4. Speichere im Cache
                this.filterGroupListCache.set(cacheKey, {
                    groups: parsedGroups,
                    timestamp: Date.now()
                });
                logger_1.logger.log(`[FilterListCache] 💾 Cache-Miss für Filter-Gruppen ${cacheKey} - aus DB geladen und gecacht`);
                return parsedGroups;
            }
            catch (error) {
                logger_1.logger.error(`[FilterListCache] Fehler beim Laden von Filter-Gruppen ${cacheKey}:`, error);
                return null;
            }
        });
    }
    /**
     * Invalidiert Cache für Filter-Listen eines Users und einer Tabelle
     * Wird aufgerufen, wenn Filter erstellt, aktualisiert oder gelöscht werden
     *
     * @param userId - User-ID
     * @param tableId - Table-ID
     */
    invalidate(userId, tableId) {
        const cacheKey = `${userId}:${tableId}`;
        this.filterListCache.delete(cacheKey);
        this.filterGroupListCache.delete(cacheKey);
        logger_1.logger.log(`[FilterListCache] 🗑️ Cache invalidiert für ${cacheKey}`);
    }
    /**
     * Leert den gesamten Cache
     */
    clear() {
        this.filterListCache.clear();
        this.filterGroupListCache.clear();
    }
    /**
     * Gibt Cache-Statistiken zurück (für Monitoring)
     */
    getStats() {
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
    cleanup() {
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
    register() {
        cacheCleanupService_1.cacheCleanupService.register({
            name: 'filterListCache',
            cleanup: () => this.cleanup(),
            getStats: () => this.getStats(),
            clear: () => this.clear()
        });
    }
}
// Singleton-Instanz
exports.filterListCache = new FilterListCache();
exports.filterListCache.register();
//# sourceMappingURL=filterListCache.js.map