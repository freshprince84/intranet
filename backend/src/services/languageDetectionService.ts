/**
 * Language Detection Service
 * 
 * Erkennt Sprache basierend auf Landesvorwahl der Telefonnummer
 */

export class LanguageDetectionService {
  /**
   * Erkennt Sprache basierend auf Landesvorwahl
   * @param phoneNumber - Telefonnummer mit Ländercode (z.B. +573001234567)
   * @returns Sprachcode (z.B. "es", "de", "en")
   */
  static detectLanguageFromPhoneNumber(phoneNumber: string): string {
    // Mapping: Ländercode -> Sprache
    // Regel: Alle spanischsprachigen Länder → 'es', alle anderen → 'en'
    const countryCodeMap: Record<string, string> = {
      '57': 'es', // Kolumbien
      '49': 'en', // Deutschland → Englisch
      '41': 'es', // Schweiz → Spanisch (da hauptsächlich spanischsprachige Gäste)
      '1': 'en',  // USA/Kanada
      '34': 'es', // Spanien
      '33': 'en', // Frankreich → Englisch
      '39': 'en', // Italien → Englisch
      '44': 'en', // UK
      '52': 'es', // Mexiko
      '54': 'es', // Argentinien
      '55': 'en', // Brasilien → Englisch
      '86': 'en', // China → Englisch
      '81': 'en', // Japan → Englisch
      '82': 'en', // Südkorea → Englisch
      '91': 'en', // Indien → Englisch
      '7': 'en',  // Russland → Englisch
      '90': 'en', // Türkei → Englisch
      '20': 'en', // Ägypten → Englisch
      '27': 'en', // Südafrika
      '61': 'en', // Australien
      '64': 'en', // Neuseeland
    };
    
    // Normalisiere Telefonnummer (entferne Leerzeichen, Bindestriche)
    const normalized = phoneNumber.replace(/[\s-]/g, '');
    
    if (normalized.startsWith('+')) {
      // Prüfe 1-3 stellige Ländercodes (von lang nach kurz)
      for (let len = 3; len >= 1; len--) {
        const code = normalized.substring(1, 1 + len);
        if (countryCodeMap[code]) {
          return countryCodeMap[code];
        }
      }
    } else if (normalized.startsWith('00')) {
      // Internationales Format mit 00 (z.B. 0049123456789)
      for (let len = 3; len >= 1; len--) {
        const code = normalized.substring(2, 2 + len);
        if (countryCodeMap[code]) {
          return countryCodeMap[code];
        }
      }
    }
    
    // Fallback: Spanisch (da hauptsächlich Kolumbien)
    return 'es';
  }

  /**
   * Validiert Telefonnummer-Format
   * @param phoneNumber - Telefonnummer
   * @returns true wenn Format gültig
   */
  static isValidPhoneNumber(phoneNumber: string): boolean {
    // Validiere Format: + gefolgt von 1-15 Ziffern
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''));
  }

  /**
   * Normalisiert Telefonnummer (entfernt Leerzeichen, fügt + hinzu falls fehlt)
   * @param phoneNumber - Telefonnummer
   * @returns Normalisierte Telefonnummer
   */
  static normalizePhoneNumber(phoneNumber: string): string {
    // Entferne alle Leerzeichen und Bindestriche
    let normalized = phoneNumber.replace(/[\s-]/g, '');

    // Füge + hinzu falls nicht vorhanden
    if (!normalized.startsWith('+')) {
      // Wenn mit 00 beginnt, ersetze durch +
      if (normalized.startsWith('00')) {
        normalized = '+' + normalized.substring(2);
      } else {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  }
}

