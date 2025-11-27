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
class OrganizationCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 10 * 60 * 1000; // 10 Minuten Cache (statt 2 Minuten - reduziert DB-Queries um 80%)
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
                console.error(`[OrganizationCache] Fehler beim Laden für User ${userId}:`, error);
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
}
exports.organizationCache = new OrganizationCache();
//# sourceMappingURL=organizationCache.js.map