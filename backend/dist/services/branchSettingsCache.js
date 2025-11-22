"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branchSettingsCache = void 0;
const encryption_1 = require("../utils/encryption");
class BranchSettingsCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 10 * 60 * 1000; // 10 Minuten
    }
    /**
     * Gibt entschlüsselte Branch-Settings zurück (aus Cache oder neu entschlüsselt)
     *
     * @param branchId - Branch-ID
     * @param settingsType - Typ der Settings ('whatsapp' | 'lobbyPms' | 'boldPayment' | 'doorSystem' | 'email')
     * @param encryptedSettings - Verschlüsselte Settings aus Datenbank
     * @returns Entschlüsselte Settings
     */
    getDecryptedBranchSettings(branchId, settingsType, encryptedSettings) {
        if (!encryptedSettings) {
            return null;
        }
        const cacheKey = `branch-${branchId}-${settingsType}`;
        const now = Date.now();
        // Prüfe Cache
        const cached = this.cache.get(cacheKey);
        if (cached && (now - cached.timestamp) < this.TTL_MS) {
            return cached.data;
        }
        // Cache miss - entschlüssele neu
        try {
            const decrypted = (0, encryption_1.decryptBranchApiSettings)(encryptedSettings);
            const data = decrypted;
            // Speichere im Cache
            this.cache.set(cacheKey, {
                data,
                timestamp: now
            });
            return data;
        }
        catch (error) {
            console.error(`[BranchSettingsCache] Fehler beim Entschlüsseln für Branch ${branchId}, Type ${settingsType}:`, error);
            return null;
        }
    }
    /**
     * Gibt entschlüsselte Organization-Settings zurück (aus Cache oder neu entschlüsselt)
     *
     * @param organizationId - Organization-ID
     * @param settingsType - Typ der Settings
     * @param encryptedSettings - Verschlüsselte Settings aus Datenbank
     * @returns Entschlüsselte Settings
     */
    getDecryptedOrgSettings(organizationId, settingsType, encryptedSettings) {
        if (!encryptedSettings) {
            return null;
        }
        const cacheKey = `org-${organizationId}-${settingsType}`;
        const now = Date.now();
        // Prüfe Cache
        const cached = this.cache.get(cacheKey);
        if (cached && (now - cached.timestamp) < this.TTL_MS) {
            return cached.data;
        }
        // Cache miss - entschlüssele neu
        try {
            const decrypted = (0, encryption_1.decryptApiSettings)(encryptedSettings);
            // Extrahiere den spezifischen Settings-Typ
            const data = decrypted[settingsType] || decrypted;
            // Speichere im Cache
            this.cache.set(cacheKey, {
                data,
                timestamp: now
            });
            return data;
        }
        catch (error) {
            console.error(`[BranchSettingsCache] Fehler beim Entschlüsseln für Org ${organizationId}, Type ${settingsType}:`, error);
            return null;
        }
    }
    /**
     * Invalidiert Cache für einen Branch
     *
     * @param branchId - Branch-ID
     * @param settingsType - Optional: Nur bestimmten Settings-Typ invalidieren
     */
    invalidateBranch(branchId, settingsType) {
        if (settingsType) {
            const cacheKey = `branch-${branchId}-${settingsType}`;
            this.cache.delete(cacheKey);
        }
        else {
            // Lösche alle Settings für diesen Branch
            const prefix = `branch-${branchId}-`;
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) {
                    this.cache.delete(key);
                }
            }
        }
    }
    /**
     * Invalidiert Cache für eine Organization
     *
     * @param organizationId - Organization-ID
     * @param settingsType - Optional: Nur bestimmten Settings-Typ invalidieren
     */
    invalidateOrganization(organizationId, settingsType) {
        if (settingsType) {
            const cacheKey = `org-${organizationId}-${settingsType}`;
            this.cache.delete(cacheKey);
        }
        else {
            // Lösche alle Settings für diese Organization
            const prefix = `org-${organizationId}-`;
            for (const key of this.cache.keys()) {
                if (key.startsWith(prefix)) {
                    this.cache.delete(key);
                }
            }
        }
    }
    /**
     * Leert den gesamten Cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Gibt Cache-Statistiken zurück (für Debugging)
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}
// Singleton-Instanz
exports.branchSettingsCache = new BranchSettingsCache();
//# sourceMappingURL=branchSettingsCache.js.map