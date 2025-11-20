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
exports.notificationSettingsCache = void 0;
const prisma_1 = require("../utils/prisma");
/**
 * In-Memory Cache für Notification Settings
 *
 * Reduziert Datenbank-Queries drastisch, da Settings bei jeder Notification-Erstellung
 * abgerufen werden. Mit Cache: Settings werden nur einmal pro TTL geladen.
 *
 * TTL: 5 Minuten (Settings ändern sich selten)
 */
class NotificationSettingsCache {
    constructor() {
        this.userSettingsCache = new Map();
        this.systemSettingsCache = null;
        this.TTL_MS = 5 * 60 * 1000; // 5 Minuten
    }
    /**
     * Prüft, ob ein Cache-Eintrag noch gültig ist
     */
    isCacheValid(entry) {
        if (!entry)
            return false;
        const now = Date.now();
        return (now - entry.timestamp) < entry.ttl;
    }
    /**
     * Lädt Benutzer-spezifische Notification Settings aus Cache oder Datenbank
     */
    getUserSettings(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Prüfe Cache
            const cached = this.userSettingsCache.get(userId);
            if (this.isCacheValid(cached)) {
                return cached.data;
            }
            // Cache abgelaufen oder nicht vorhanden: Lade von DB
            const userSettings = yield prisma_1.prisma.userNotificationSettings.findFirst({
                where: { userId }
            });
            // Speichere in Cache
            this.userSettingsCache.set(userId, {
                data: userSettings,
                timestamp: Date.now(),
                ttl: this.TTL_MS
            });
            return userSettings;
        });
    }
    /**
     * Lädt System-weite Notification Settings aus Cache oder Datenbank
     */
    getSystemSettings() {
        return __awaiter(this, void 0, void 0, function* () {
            // Prüfe Cache
            if (this.isCacheValid(this.systemSettingsCache)) {
                return this.systemSettingsCache.data;
            }
            // Cache abgelaufen oder nicht vorhanden: Lade von DB
            const systemSettings = yield prisma_1.prisma.notificationSettings.findFirst();
            // Speichere in Cache
            this.systemSettingsCache = {
                data: systemSettings,
                timestamp: Date.now(),
                ttl: this.TTL_MS
            };
            return systemSettings;
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten Benutzer
     * Wird aufgerufen, wenn Benutzer-Settings aktualisiert werden
     */
    invalidateUserSettings(userId) {
        this.userSettingsCache.delete(userId);
    }
    /**
     * Invalidiert System-weite Settings Cache
     * Wird aufgerufen, wenn System-Settings aktualisiert werden
     */
    invalidateSystemSettings() {
        this.systemSettingsCache = null;
    }
    /**
     * Invalidiert alle Caches (für Debugging/Testing)
     */
    invalidateAll() {
        this.userSettingsCache.clear();
        this.systemSettingsCache = null;
    }
    /**
     * Gibt Cache-Statistiken zurück (für Monitoring)
     */
    getStats() {
        return {
            userCacheSize: this.userSettingsCache.size,
            systemCacheValid: this.isCacheValid(this.systemSettingsCache)
        };
    }
}
// Singleton-Instanz
exports.notificationSettingsCache = new NotificationSettingsCache();
//# sourceMappingURL=notificationSettingsCache.js.map