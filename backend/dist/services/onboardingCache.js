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
exports.onboardingCache = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const cacheCleanupService_1 = require("./cacheCleanupService");
/**
 * In-Memory Cache für Onboarding-Status
 *
 * TTL: 5 Minuten
 * MAX_SIZE: 200 Einträge
 * Auto-Cleanup: Ja
 */
class OnboardingCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 5 * 60 * 1000;
        this.MAX_SIZE = 200;
    }
    isCacheValid(entry) {
        if (!entry)
            return false;
        const now = Date.now();
        return (now - entry.timestamp) < this.TTL_MS;
    }
    /**
     * Lädt Onboarding-Status aus Cache oder Datenbank
     *
     * @param userId - User-ID
     * @returns Onboarding-Status oder null wenn nicht gefunden
     */
    get(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cached = this.cache.get(userId);
            if (this.isCacheValid(cached)) {
                return cached.data;
            }
            try {
                // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
                const user = yield prisma_1.prisma.user.findUnique({
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
                const status = {
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
            }
            catch (error) {
                logger_1.logger.error(`[OnboardingCache] Fehler beim Laden für User ${userId}:`, error);
                return null;
            }
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten User
     * Wird aufgerufen, wenn Onboarding-Status geändert wird
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
            name: 'onboardingCache',
            cleanup: () => this.cleanup(),
            getStats: () => this.getStats(),
            clear: () => this.clear()
        });
    }
}
// Singleton-Instanz
exports.onboardingCache = new OnboardingCache();
exports.onboardingCache.register();
//# sourceMappingURL=onboardingCache.js.map