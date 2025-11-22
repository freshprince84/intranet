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
/**
 * In-Memory Cache für User-Daten aus authMiddleware
 *
 * Reduziert Datenbank-Queries drastisch, da authMiddleware bei JEDEM Request
 * eine komplexe Query ausführt (User + Roles + Permissions + Settings).
 *
 * TTL: 30 Sekunden (User-Daten ändern sich selten, aber müssen aktuell bleiben)
 */
class UserCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 30 * 1000; // 30 Sekunden
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
            // 2. Lade aus Datenbank
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
                console.error(`[UserCache] Fehler beim Laden für User ${userId}:`, error);
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
}
// Singleton-Instanz
exports.userCache = new UserCache();
//# sourceMappingURL=userCache.js.map