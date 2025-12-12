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
exports.organizationCache = void 0;
const prisma_1 = require("./prisma");
const logger_1 = require("./logger");
const cacheCleanupService_1 = require("../services/cacheCleanupService");
/**
 * In-Memory Cache für Organization-Daten
 *
 * TTL: 10 Minuten
 * MAX_SIZE: 200 Einträge
 * Auto-Cleanup: Ja
 */
class OrganizationCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 10 * 60 * 1000;
        this.MAX_SIZE = 200;
    }
    isCacheValid(entry) {
        if (!entry)
            return false;
        const now = Date.now();
        return (now - entry.timestamp) < this.TTL_MS;
    }
    get(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cached = this.cache.get(userId);
            if (this.isCacheValid(cached)) {
                return cached.data;
            }
            try {
                // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
                const userRole = yield prisma_1.prisma.userRole.findFirst({
                    where: {
                        userId: Number(userId),
                        lastUsed: true
                    },
                    include: {
                        role: {
                            include: {
                                organization: {
                                    // ✅ PERFORMANCE: Settings NICHT laden (19.8 MB!)
                                    // Settings werden nur geladen wenn explizit angefragt (in getCurrentOrganization)
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        domain: true,
                                        logo: true,
                                        isActive: true,
                                        maxUsers: true,
                                        subscriptionPlan: true,
                                        country: true,
                                        nit: true,
                                        createdAt: true,
                                        updatedAt: true
                                        // settings wird NICHT geladen
                                    }
                                },
                                permissions: true
                            }
                        }
                    }
                });
                if (!userRole) {
                    return null;
                }
                // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
                const userBranch = yield prisma_1.prisma.usersBranches.findFirst({
                    where: {
                        userId: Number(userId),
                        lastUsed: true
                    },
                    select: {
                        branchId: true
                    }
                });
                const data = {
                    organizationId: userRole.role.organizationId,
                    branchId: userBranch === null || userBranch === void 0 ? void 0 : userBranch.branchId,
                    userRole: userRole
                };
                this.cache.set(userId, {
                    data,
                    timestamp: Date.now()
                });
                return data;
            }
            catch (error) {
                logger_1.logger.error(`[OrganizationCache] Fehler beim Laden für User ${userId}:`, error);
                return null;
            }
        });
    }
    invalidate(userId) {
        this.cache.delete(userId);
    }
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
            name: 'organizationCache',
            cleanup: () => this.cleanup(),
            getStats: () => this.getStats(),
            clear: () => this.clear()
        });
    }
}
exports.organizationCache = new OrganizationCache();
exports.organizationCache.register();
//# sourceMappingURL=organizationCache.js.map