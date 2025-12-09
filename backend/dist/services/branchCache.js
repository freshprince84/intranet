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
exports.branchCache = void 0;
const prisma_1 = require("../utils/prisma");
const organization_1 = require("../middleware/organization");
const logger_1 = require("../utils/logger");
/**
 * In-Memory Cache für User-Branches
 *
 * Reduziert Datenbank-Queries drastisch, da getUserBranches bei JEDEM Seitenaufruf
 * aufgerufen wird. Mit Cache: Branches werden nur einmal pro TTL geladen.
 *
 * ✅ SICHERHEIT: Berücksichtigt getDataIsolationFilter für Datenisolation
 *
 * TTL: 5 Minuten (Branches ändern sich selten)
 */
class BranchCache {
    constructor() {
        this.cache = new Map(); // Cache-Key: `${userId}:${organizationId}:${roleId}`
        this.TTL_MS = 5 * 60 * 1000; // 5 Minuten
    }
    isCacheValid(entry) {
        if (!entry)
            return false;
        const now = Date.now();
        return (now - entry.timestamp) < this.TTL_MS;
    }
    /**
     * Generiert Cache-Key unter Berücksichtigung von Datenisolation
     */
    getCacheKey(userId, organizationId, roleId) {
        return `${userId}:${organizationId || 'null'}:${roleId || 'null'}`;
    }
    /**
     * Lädt Branches aus Cache oder Datenbank
     *
     * @param userId - User-ID
     * @param req - Request-Objekt für getDataIsolationFilter
     * @returns Branches oder null wenn nicht gefunden
     */
    get(userId, req) {
        return __awaiter(this, void 0, void 0, function* () {
            // ✅ SICHERHEIT: Cache-Key unter Berücksichtigung von Datenisolation
            const organizationId = req.organizationId;
            const roleId = req.roleId;
            const cacheKey = this.getCacheKey(userId, organizationId, roleId);
            const cached = this.cache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                return cached.data;
            }
            try {
                // ✅ SICHERHEIT: getDataIsolationFilter berücksichtigen
                const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
                // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
                const userBranches = yield prisma_1.prisma.usersBranches.findMany({
                    where: {
                        userId: userId,
                        lastUsed: true,
                        branch: branchFilter // ✅ Datenisolation!
                    },
                    include: {
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    },
                    orderBy: {
                        branch: {
                            name: 'asc'
                        }
                    }
                });
                const branches = userBranches.map(ub => ({
                    id: ub.branch.id,
                    name: ub.branch.name,
                    lastUsed: ub.lastUsed
                }));
                this.cache.set(cacheKey, {
                    data: branches,
                    timestamp: Date.now()
                });
                return branches;
            }
            catch (error) {
                logger_1.logger.error(`[BranchCache] Fehler beim Laden für User ${userId}:`, error);
                return null;
            }
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten User
     * Wird aufgerufen, wenn User-Branches geändert werden
     *
     * @param userId - User-ID
     * @param organizationId - Organization-ID (optional)
     * @param roleId - Role-ID (optional)
     */
    invalidate(userId, organizationId, roleId) {
        const cacheKey = this.getCacheKey(userId, organizationId, roleId);
        this.cache.delete(cacheKey);
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
exports.branchCache = new BranchCache();
//# sourceMappingURL=branchCache.js.map