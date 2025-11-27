/**
 * URL-Validierung für API-Endpunkte
 * 
 * Verhindert SSRF (Server-Side Request Forgery) durch Whitelist-basierte Validierung
 */

const ALLOWED_DOMAINS = {
  lobbyPms: ['app.lobbypms.com', 'api.lobbypms.com'], // app.lobbypms.com für Check-in Links, api.lobbypms.com für API
  ttlock: ['open.ttlock.com', 'euopen.ttlock.com', 'api.sciener.com'],
  boldPayment: ['api.bold.co', 'sandbox.bold.co'],
} as const;

export type ApiService = keyof typeof ALLOWED_DOMAINS;

/**
 * Validiert eine API-URL gegen eine Whitelist
 * 
 * @param url - Die zu validierende URL
 * @param service - Der API-Service (lobbyPms, ttlock, boldPayment)
 * @returns true wenn URL gültig ist, false sonst
 */
export const validateApiUrl = (url: string, service: ApiService): boolean => {
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
  } catch (error) {
    // Ungültige URL
    return false;
  }
};

/**
 * Validiert alle API-URLs in OrganizationSettings
 * 
 * @param settings - OrganizationSettings Objekt
 * @returns Array von Fehlermeldungen (leer wenn alle URLs gültig)
 */
export const validateAllApiUrls = (settings: any): string[] => {
  const errors: string[] = [];

  if (!settings || typeof settings !== 'object') {
    return errors;
  }

  // LobbyPMS API URL - nicht mehr validieren, da fest: https://api.lobbypms.com
  // URL wird automatisch gesetzt, wenn nicht vorhanden
  // Hinweis: app.lobbypms.com wird für Check-in Links verwendet (Web-URL für Gäste)

  // TTLock URL
  if (settings.doorSystem?.apiUrl) {
    if (!validateApiUrl(settings.doorSystem.apiUrl, 'ttlock')) {
      errors.push('Ungültige TTLock API URL');
    }
  }

  // Bold Payment URLs werden nicht validiert (können variieren)

  return errors;
};

