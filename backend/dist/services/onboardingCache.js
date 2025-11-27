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
/**
 * In-Memory Cache für Onboarding-Status
 *
 * Reduziert Datenbank-Queries drastisch, da getOnboardingStatus bei JEDEM Seitenaufruf
 * aufgerufen wird. Mit Cache: Onboarding-Status wird nur einmal pro TTL geladen.
 *
 * TTL: 5 Minuten (Onboarding-Status ändert sich selten)
 */
class OnboardingCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 5 * 60 * 1000; // 5 Minuten
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
                console.error(`[OnboardingCache] Fehler beim Laden für User ${userId}:`, error);
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
}
// Singleton-Instanz
exports.onboardingCache = new OnboardingCache();
//# sourceMappingURL=onboardingCache.js.map