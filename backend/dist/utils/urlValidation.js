"use strict";
/**
 * URL-Validierung für API-Endpunkte
 *
 * Verhindert SSRF (Server-Side Request Forgery) durch Whitelist-basierte Validierung
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAllApiUrls = exports.validateApiUrl = void 0;
const ALLOWED_DOMAINS = {
    lobbyPms: ['app.lobbypms.com'],
    ttlock: ['open.ttlock.com'],
    sire: ['api.sire.gov.co'],
    boldPayment: ['api.bold.co', 'sandbox.bold.co'],
};
/**
 * Validiert eine API-URL gegen eine Whitelist
 *
 * @param url - Die zu validierende URL
 * @param service - Der API-Service (lobbyPms, ttlock, sire, boldPayment)
 * @returns true wenn URL gültig ist, false sonst
 */
const validateApiUrl = (url, service) => {
    if (!url || typeof url !== 'string') {
        return false;
    }
    try {
        const parsed = new URL(url);
        const allowedDomains = ALLOWED_DOMAINS[service];
        // Prüfe ob Hostname exakt übereinstimmt oder Subdomain ist
        return allowedDomains.some(domain => {
            // Exakte Übereinstimmung
            if (parsed.hostname === domain) {
                return true;
            }
            // Subdomain (z.B. api.app.lobbypms.com)
            if (parsed.hostname.endsWith(`.${domain}`)) {
                return true;
            }
            return false;
        });
    }
    catch (error) {
        // Ungültige URL
        return false;
    }
};
exports.validateApiUrl = validateApiUrl;
/**
 * Validiert alle API-URLs in OrganizationSettings
 *
 * @param settings - OrganizationSettings Objekt
 * @returns Array von Fehlermeldungen (leer wenn alle URLs gültig)
 */
const validateAllApiUrls = (settings) => {
    var _a, _b;
    const errors = [];
    if (!settings || typeof settings !== 'object') {
        return errors;
    }
    // LobbyPMS URL - nicht mehr validieren, da fest: https://app.lobbypms.com/api
    // URL wird automatisch gesetzt, wenn nicht vorhanden
    // TTLock URL
    if ((_a = settings.doorSystem) === null || _a === void 0 ? void 0 : _a.apiUrl) {
        if (!(0, exports.validateApiUrl)(settings.doorSystem.apiUrl, 'ttlock')) {
            errors.push('Ungültige TTLock API URL');
        }
    }
    // SIRE URL
    if ((_b = settings.sire) === null || _b === void 0 ? void 0 : _b.apiUrl) {
        if (!(0, exports.validateApiUrl)(settings.sire.apiUrl, 'sire')) {
            errors.push('Ungültige SIRE API URL');
        }
    }
    // Bold Payment URLs werden nicht validiert (können variieren)
    return errors;
};
exports.validateAllApiUrls = validateAllApiUrls;
//# sourceMappingURL=urlValidation.js.map