"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userLanguageCache = void 0;
class UserLanguageCache {
    constructor() {
        this.cache = new Map();
        this.TTL_MS = 10 * 60 * 1000; // 10 Minuten
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
     * Gibt die gecachte Sprache für einen User zurück
     *
     * @param userId - User-ID
     * @returns Gecachte Sprache oder null wenn nicht im Cache oder abgelaufen
     */
    get(userId) {
        const cached = this.cache.get(userId);
        if (this.isCacheValid(cached)) {
            return cached.language;
        }
        return null;
    }
    /**
     * Speichert die Sprache für einen User im Cache
     *
     * @param userId - User-ID
     * @param language - Sprache
     */
    set(userId, language) {
        this.cache.set(userId, {
            language,
            timestamp: Date.now()
        });
    }
    /**
     * Invalidiert Cache für einen bestimmten User
     * Wird aufgerufen, wenn User-Sprache aktualisiert wird
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
exports.userLanguageCache = new UserLanguageCache();
//# sourceMappingURL=userLanguageCache.js.map