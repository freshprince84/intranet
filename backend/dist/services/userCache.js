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
exports.userCache = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const cacheCleanupService_1 = require("./cacheCleanupService");
/**
 * In-Memory Cache für User-Daten aus authMiddleware
 *
 * Reduziert Datenbank-Queries drastisch, da authMiddleware bei JEDEM Request
 * eine komplexe Query ausführt (User + Roles + Permissions + Settings).
 *
 * TTL: 5 Minuten
 * MAX_SIZE: 200 Einträge (LRU-Eviction bei Überschreitung)
 * Auto-Cleanup: Ja (via CacheCleanupService)
 */
class UserCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 5 * 60 * 1000; // 5 Minuten
        this.MAX_SIZE = 200; // Maximale Anzahl Einträge
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
     * Lädt User-Daten aus Cache oder Datenbank
     *
     * @param userId - User-ID
     * @returns User-Daten mit Roles, Permissions, Settings oder null wenn nicht gefunden
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
                const user = yield prisma_1.prisma.user.findUnique({
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
                });
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
            }
            catch (error) {
                logger_1.logger.error(`[UserCache] Fehler beim Laden für User ${userId}:`, error);
                return null;
            }
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten User
     * Wird aufgerufen, wenn User-Daten, Rollen oder Permissions geändert werden
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
    /**
     * Entfernt abgelaufene Einträge und führt LRU-Eviction durch
     * Wird vom CacheCleanupService aufgerufen
     *
     * @returns Anzahl gelöschter Einträge
     */
    cleanup() {
        const now = Date.now();
        let deleted = 0;
        // 1. Entferne abgelaufene Einträge
        for (const [key, entry] of this.cache) {
            if ((now - entry.timestamp) >= this.TTL_MS) {
                this.cache.delete(key);
                deleted++;
            }
        }
        // 2. LRU-Eviction wenn MAX_SIZE überschritten
        if (this.cache.size > this.MAX_SIZE) {
            // Sortiere nach Timestamp (älteste zuerst)
            const entries = Array.from(this.cache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            // Lösche älteste Einträge bis unter MAX_SIZE
            const toDelete = this.cache.size - this.MAX_SIZE;
            for (let i = 0; i < toDelete; i++) {
                this.cache.delete(entries[i][0]);
                deleted++;
            }
        }
        return deleted;
    }
    /**
     * Registriert Cache beim CacheCleanupService
     */
    register() {
        cacheCleanupService_1.cacheCleanupService.register({
            name: 'userCache',
            cleanup: () => this.cleanup(),
            getStats: () => this.getStats(),
            clear: () => this.clear()
        });
    }
}
// Singleton-Instanz
exports.userCache = new UserCache();
// Registriere beim CacheCleanupService
exports.userCache.register();
//# sourceMappingURL=userCache.js.map