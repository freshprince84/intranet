/**
 * Country Language Service
 * 
 * Mappt Länder zu Sprachen für WhatsApp-Template-Auswahl
 */
export class CountryLanguageService {
  /**
   * Mapping: Land-Name (verschiedene Schreibweisen) -> Sprachcode
   * 
   * Unterstützt:
   * - Spanische Namen (z.B. "Francia", "Colombia")
   * - Englische Namen (z.B. "France", "Colombia")
   * - Deutsche Namen (z.B. "Frankreich", "Kolumbien")
   */
  private static readonly COUNTRY_LANGUAGE_MAP: Record<string, string> = {
    // Spanisch-sprachige Länder
    'colombia': 'es',
    'colombie': 'es',
    'mexico': 'es',
    'méxico': 'es',
    'argentina': 'es',
    'spain': 'es',
    'españa': 'es',
    'espana': 'es',
    'chile': 'es',
    'peru': 'es',
    'perú': 'es',
    'venezuela': 'es',
    'ecuador': 'es',
    'bolivia': 'es',
    'paraguay': 'es',
    'uruguay': 'es',
    'costa rica': 'es',
    'panama': 'es',
    'panamá': 'es',
    'nicaragua': 'es',
    'honduras': 'es',
    'guatemala': 'es',
    'el salvador': 'es',
    'republica dominicana': 'es',
    'república dominicana': 'es',
    'cuba': 'es',
    'puerto rico': 'es',
    
    // Englisch-sprachige Länder
    'united states': 'en',
    'usa': 'en',
    'united kingdom': 'en',
    'uk': 'en',
    'canada': 'en',
    'australia': 'en',
    'new zealand': 'en',
    'south africa': 'en',
    'ireland': 'en',
    'singapore': 'en',
    'philippines': 'en',
    'filipinas': 'en',
    
    // Deutsch-sprachige Länder → Englisch (keine deutschen Templates)
    'germany': 'en',
    'alemania': 'en',
    'deutschland': 'en',
    'switzerland': 'es', // Schweiz: Spanisch (da hauptsächlich spanisch-sprachige Gäste)
    'suiza': 'es',
    'schweiz': 'es',
    'austria': 'en',
    'österreich': 'en',
    
    // Französisch-sprachige Länder
    'france': 'en', // Frankreich: Englisch als Fallback (keine französischen Templates)
    'francia': 'en',
    'frankreich': 'en',
    'belgium': 'en',
    'bélgica': 'en',
    'belgien': 'en',
    'belgique': 'en',
    
    // Italienisch-sprachige Länder
    'italy': 'en', // Italien: Englisch als Fallback
    'italia': 'en',
    'italien': 'en',
    
    // Portugiesisch-sprachige Länder
    'brazil': 'en', // Brasilien: Englisch als Fallback (keine portugiesischen Templates)
    'brasil': 'en',
    'brasilien': 'en',
    'portugal': 'en',
    
    // Weitere Länder (Fallback auf Englisch)
    'netherlands': 'en',
    'holanda': 'en',
    'niederlande': 'en',
    'poland': 'en',
    'polonia': 'en',
    'polen': 'en',
    'russia': 'en',
    'rusia': 'en',
    'russland': 'en',
    'china': 'en',
    'japan': 'en',
    'japón': 'en',
    'korea': 'en',
    'corea': 'en',
    'india': 'en',
    'turkey': 'en',
    'turquía': 'en',
    'türkei': 'en',
    'egypt': 'en',
    'egipto': 'en',
    'ägypten': 'en',
    'bielorrusia': 'en', // Belarus: Englisch als Fallback
    'belarus': 'en',
  };

  /**
   * Bestimmt Sprachcode basierend auf Land-Name
   * 
   * Regel: Alle spanischsprachigen Länder → 'es', alle anderen → 'en'
   * 
   * @param countryName - Land-Name (z.B. "Francia", "Colombia", "Germany")
   * @returns Sprachcode ('es' für spanischsprachige Länder, 'en' für alle anderen) oder 'es' als Fallback
   */
  static getLanguageForCountry(countryName: string | null | undefined): string {
    if (!countryName) {
      return 'es'; // Fallback: Spanisch (Standard für Kolumbien)
    }

    // Normalisiere: Kleinschreibung, entferne Leerzeichen
    const normalized = countryName
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

    // Direktes Mapping
    if (this.COUNTRY_LANGUAGE_MAP[normalized]) {
      return this.COUNTRY_LANGUAGE_MAP[normalized];
    }

    // Fallback: Prüfe ob Teilstring matcht (z.B. "United States" -> "united states")
    for (const [country, language] of Object.entries(this.COUNTRY_LANGUAGE_MAP)) {
      if (normalized.includes(country) || country.includes(normalized)) {
        return language;
      }
    }

    // Fallback: Spanisch (Standard für Kolumbien)
    return 'es';
  }

  /**
   * Bestimmt Sprachcode für Reservation
   * 
   * Priorität:
   * 1. reservation.guestNationality (wenn vorhanden)
   * 2. reservation.guestPhone (Telefonnummer-basierte Erkennung)
   * 3. Fallback: 'es' (Spanisch)
   * 
   * Regel: Alle spanischsprachigen Länder → 'es', alle anderen → 'en'
   * 
   * @param reservation - Reservation mit guestNationality und/oder guestPhone
   * @returns Sprachcode ('es' für spanischsprachige Länder, 'en' für alle anderen)
   */
  static getLanguageForReservation(reservation: {
    guestNationality?: string | null;
    guestPhone?: string | null;
  }): string {
    // Priorität 1: Land-basierte Erkennung
    if (reservation.guestNationality) {
      const language = this.getLanguageForCountry(reservation.guestNationality);
      console.log(`[CountryLanguageService] Sprache basierend auf Land "${reservation.guestNationality}": ${language}`);
      return language;
    }

    // Priorität 2: Telefonnummer-basierte Erkennung (Fallback)
    if (reservation.guestPhone) {
      const { LanguageDetectionService } = require('./languageDetectionService');
      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(reservation.guestPhone);
      console.log(`[CountryLanguageService] Sprache basierend auf Telefonnummer "${reservation.guestPhone}": ${language}`);
      return language;
    }

    // Fallback: Spanisch
    console.log(`[CountryLanguageService] Keine Sprache-Information gefunden, Fallback: es`);
    return 'es';
  }
}

