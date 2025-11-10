/**
 * URL-Validierung für API-Endpunkte (Frontend)
 * 
 * Verhindert SSRF durch Whitelist-basierte Validierung
 */

const ALLOWED_DOMAINS = {
  lobbyPms: ['app.lobbypms.com'],
  ttlock: ['open.ttlock.com'],
  sire: ['api.sire.gov.co'],
  boldPayment: ['api.bold.co', 'sandbox.bold.co'],
} as const;

export type ApiService = keyof typeof ALLOWED_DOMAINS;

/**
 * Validiert eine API-URL gegen eine Whitelist
 * 
 * @param url - Die zu validierende URL
 * @param service - Der API-Service
 * @returns true wenn URL gültig ist, false sonst
 */
export const validateApiUrl = (url: string, service: ApiService): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    const allowedDomains = ALLOWED_DOMAINS[service];

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


