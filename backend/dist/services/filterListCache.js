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
/**
 * In-Memory Cache für Filter-Listen und Filter-Gruppen
 *
 * Reduziert Datenbank-Queries drastisch, da Filter-Listen bei JEDEM Seitenaufruf
 * abgerufen werden. Mit Cache: Filter-Listen werden nur einmal pro TTL geladen.
 *
 * TTL: 5 Minuten (Filter-Listen ändern sich selten)
 */
class FilterListCache {
    constructor() {
        this.filterListCache = new Map();
        this.filterGroupListCache = new Map();
        this.TTL_MS = 5 * 60 * 1000; // 5 Minuten
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
                console.log(`[FilterListCache] ✅ Cache-Hit für Filter-Liste ${cacheKey}`);
                return cached.filters;
            }
            // 2. Lade aus Datenbank mit Retry-Logik
            try {
                const savedFilters = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.savedFilter.findMany({
                    where: {
                        userId,
                        tableId
                    }
                }));
                // 3. Parse die JSON-Strings zurück in Arrays
                const parsedFilters = savedFilters.map(filter => {
                    let sortDirections = [];
                    if (filter.sortDirections) {
                        try {
                            // Prüfe, ob es ein "null" String ist
                            if (filter.sortDirections.trim() === 'null' || filter.sortDirections.trim() === '') {
                                sortDirections = [];
                            }
                            else {
                                const parsed = JSON.parse(filter.sortDirections);
                                // Migration: Altes Format (Record) zu neuem Format (Array) konvertieren
                                if (Array.isArray(parsed)) {
                                    sortDirections = parsed;
                                }
                                else if (typeof parsed === 'object' && parsed !== null) {
                                    // Altes Format: { "status": "asc", "branch": "desc" }
                                    sortDirections = Object.entries(parsed).map(([column, direction], index) => ({
                                        column,
                                        direction: direction,
                                        priority: index + 1
                                    }));
                                }
                            }
                        }
                        catch (e) {
                            console.error('Fehler beim Parsen von sortDirections:', e);
                            sortDirections = [];
                        }
                    }
                    return {
                        id: filter.id,
                        userId: filter.userId,
                        tableId: filter.tableId,
                        name: filter.name,
                        conditions: JSON.parse(filter.conditions),
                        operators: JSON.parse(filter.operators),
                        sortDirections,
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
                console.log(`[FilterListCache] 💾 Cache-Miss für Filter-Liste ${cacheKey} - aus DB geladen und gecacht`);
                return parsedFilters;
            }
            catch (error) {
                console.error(`[FilterListCache] Fehler beim Laden von Filter-Liste ${cacheKey}:`, error);
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
                console.log(`[FilterListCache] ✅ Cache-Hit für Filter-Gruppen ${cacheKey}`);
                return cached.groups;
            }
            // 2. Lade aus Datenbank mit Retry-Logik
            try {
                const groups = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.filterGroup.findMany({
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
                }));
                // 3. Parse die JSON-Strings der Filter zurück in Arrays
                const parsedGroups = groups.map(group => ({
                    id: group.id,
                    userId: group.userId,
                    tableId: group.tableId,
                    name: group.name,
                    order: group.order,
                    filters: group.filters.map(filter => {
                        let sortDirections = [];
                        if (filter.sortDirections) {
                            try {
                                const parsed = JSON.parse(filter.sortDirections);
                                if (Array.isArray(parsed)) {
                                    sortDirections = parsed;
                                }
                                else if (typeof parsed === 'object' && parsed !== null) {
                                    sortDirections = Object.entries(parsed).map(([column, direction], index) => ({
                                        column,
                                        direction: direction,
                                        priority: index + 1
                                    }));
                                }
                            }
                            catch (e) {
                                console.error('Fehler beim Parsen von sortDirections:', e);
                                sortDirections = [];
                            }
                        }
                        return {
                            id: filter.id,
                            userId: filter.userId,
                            tableId: filter.tableId,
                            name: filter.name,
                            conditions: JSON.parse(filter.conditions),
                            operators: JSON.parse(filter.operators),
                            sortDirections,
                            groupId: filter.groupId,
                            order: filter.order,
                            createdAt: filter.createdAt,
                            updatedAt: filter.updatedAt
                        };
                    }),
                    createdAt: group.createdAt,
                    updatedAt: group.updatedAt
                }));
                // 4. Speichere im Cache
                this.filterGroupListCache.set(cacheKey, {
                    groups: parsedGroups,
                    timestamp: Date.now()
                });
                console.log(`[FilterListCache] 💾 Cache-Miss für Filter-Gruppen ${cacheKey} - aus DB geladen und gecacht`);
                return parsedGroups;
            }
            catch (error) {
                console.error(`[FilterListCache] Fehler beim Laden von Filter-Gruppen ${cacheKey}:`, error);
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
        console.log(`[FilterListCache] 🗑️ Cache invalidiert für ${cacheKey}`);
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
            filterListSize: this.filterListCache.size,
            filterGroupListSize: this.filterGroupListCache.size,
            validEntries
        };
    }
}
// Singleton-Instanz
exports.filterListCache = new FilterListCache();
//# sourceMappingURL=filterListCache.js.map