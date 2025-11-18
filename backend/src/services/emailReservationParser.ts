/**
 * Email Reservation Parser für LobbyPMS Reservation-Emails
 * 
 * Parst Emails im Format von lobbybookings.com:
 * 
 * Hola, La Familia Hostel - Manila
 * 
 * Recibiste una nueva reserva de Booking.com para La Familia Hostel - Manila
 * 
 * Reserva: 6057955462
 * Titular: Nastassia Yankouskaya
 * Bielorrusia
 * Email del huésped: nyanko.690495@guest.booking.com
 * 
 * 4 noches, 1 habitaciones, 1 huéspedes
 * Check in: 17/11/2025
 * Check out: 21/11/2025
 * 
 * Total: COP 186600
 * Comisión: COP 27990
 */

export interface ParsedReservationEmail {
  reservationCode: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: Date;
  checkOutDate: Date;
  amount: number;
  currency: string;
  nights?: number;
  rooms?: number;
  guests?: number;
  nationality?: string;
  commission?: number;
}

export class EmailReservationParser {
  /**
   * Parst eine Reservation-Email
   * 
   * @param emailText - Der Text-Inhalt der Email
   * @param emailHtml - Optional: HTML-Inhalt der Email
   * @returns Geparste Daten oder null wenn Format nicht erkannt
   */
  static parseReservationEmail(
    emailText: string,
    emailHtml?: string
  ): ParsedReservationEmail | null {
    try {
      // Prüfe ob es eine Reservation-Email ist
      // Unterstützt: Booking.com, Hostelworld, Airbnb
      const isReservationEmail = 
        emailText.includes('nueva reserva') ||
        emailText.includes('new reservation') ||
        emailText.includes('Recibiste una nueva reserva') ||
        emailText.includes('Booking.com') ||
        emailText.includes('Hostelworld') ||
        emailText.includes('Airbnb') ||
        emailText.includes('reserva confirmada') ||
        emailText.includes('reservation confirmed');

      if (!isReservationEmail) {
        return null;
      }

      // Ignoriere Stornierungen
      if (emailText.includes('cancelada') || emailText.includes('cancelled') || emailText.includes('cancelada en')) {
        console.log('[EmailReservationParser] Email ist eine Stornierung, wird übersprungen');
        return null;
      }

      // Verwende Text (HTML wird zu Text konvertiert, aber Text ist meist besser strukturiert)
      // Entferne HTML-Tags aus Text falls vorhanden
      let textToParse = emailText;
      if (emailHtml) {
        // Konvertiere HTML zu Text: Entferne Tags, aber behalte Inhalt
        textToParse = emailHtml
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<\/div>/gi, '\n')
          .replace(/<[^>]+>/g, '') // Entferne alle HTML-Tags
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/\n\s*\n\s*\n/g, '\n\n') // Entferne mehrfache Leerzeilen
          .trim();
        
        // Falls HTML-Parsing nicht gut funktioniert, verwende Text als Fallback
        if (textToParse.length < 100) {
          textToParse = emailText;
        }
      }

      const data: Partial<ParsedReservationEmail> = {};

      // Extrahiere Reservation Code
      data.reservationCode = this.extractReservationCode(textToParse);
      if (!data.reservationCode) {
        console.warn('[EmailReservationParser] Reservation Code nicht gefunden');
        return null;
      }

      // Extrahiere Gast-Name
      data.guestName = this.extractGuestName(textToParse);
      if (!data.guestName) {
        console.warn('[EmailReservationParser] Gast-Name nicht gefunden');
        return null;
      }

      // Extrahiere Kontaktinformationen
      const contactInfo = this.extractContactInfo(textToParse);
      data.guestEmail = contactInfo.email;
      // Prüfe ob "phone" tatsächlich eine Telefonnummer ist (nicht der Reservation Code)
      if (contactInfo.phone && contactInfo.phone !== data.reservationCode) {
        data.guestPhone = contactInfo.phone;
      }

      // Extrahiere Daten
      const dates = this.extractDates(textToParse);
      if (!dates) {
        console.warn('[EmailReservationParser] Daten nicht gefunden');
        return null;
      }
      data.checkInDate = dates.checkIn;
      data.checkOutDate = dates.checkOut;

      // Extrahiere Betrag
      const amountInfo = this.extractAmount(textToParse);
      if (!amountInfo) {
        console.warn('[EmailReservationParser] Betrag nicht gefunden');
        return null;
      }
      data.amount = amountInfo.amount;
      data.currency = amountInfo.currency;

      // Optionale Felder
      data.nights = this.extractNights(textToParse);
      data.rooms = this.extractRooms(textToParse);
      data.guests = this.extractGuests(textToParse);
      data.nationality = this.extractNationality(textToParse);
      data.commission = this.extractCommission(textToParse);

      return {
        reservationCode: data.reservationCode,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        amount: data.amount,
        currency: data.currency,
        nights: data.nights,
        rooms: data.rooms,
        guests: data.guests,
        nationality: data.nationality,
        commission: data.commission
      };
    } catch (error) {
      console.error('[EmailReservationParser] Fehler beim Parsen:', error);
      return null;
    }
  }

  /**
   * Extrahiert Reservation Code
   * Unterstützt: Zahlen (Booking.com) und alphanumerische Codes (Airbnb, Hostelworld)
   */
  private static extractReservationCode(text: string): string | null {
    const patterns = [
      /Código de reserva:\s*([A-Z0-9]+)/i,  // Alphanumerisch (Airbnb: HMZHEFTJDS)
      /código de reserva:\s*([A-Z0-9]+)/i,
      /Reserva:\s*([A-Z0-9]+)/i,
      /reservation code:\s*([A-Z0-9]+)/i,
      /Reservation:\s*([A-Z0-9]+)/i,
      /(\d{10,})/,  // Fallback: 10+ stellige Zahl (Booking.com)
      /([A-Z]{8,})/  // Fallback: 8+ Buchstaben (Airbnb-Codes)
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const code = match[1].trim();
        // Validiere: Mindestens 6 Zeichen (für sinnvolle Codes)
        if (code.length >= 6) {
          return code;
        }
      }
    }

    return null;
  }

  /**
   * Extrahiert Gast-Name
   */
  private static extractGuestName(text: string): string | null {
    // Suche nach "Titular:" und nimm die nächste Zeile (kann über mehrere Zeilen gehen)
    const titularMatch = text.match(/Titular:[\s\n]+([^\n]+)/i);
    if (titularMatch && titularMatch[1]) {
      let name = titularMatch[1].trim();
      // Entferne mögliche Nationalität am Ende (z.B. "Laura Corominas España")
      const countryPattern = /\s+(Bielorrusia|Belarus|Colombia|Germany|USA|España|Spain|France|Italy|UK|Mexico|Argentina|Brazil|China|Japan|Korea|India|Russia|Turkey|Egypt|South Africa|Australia|New Zealand)$/i;
      name = name.replace(countryPattern, '').trim();
      return name;
    }

    // Fallback: Alte Patterns
    const patterns = [
      /Titular:\s*([^\n]+)/i,
      /Guest:\s*([^\n]+)/i,
      /Huésped:\s*([^\n]+)/i,
      /Name:\s*([^\n]+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        const countryPattern = /\s+(Bielorrusia|Belarus|Colombia|Germany|USA|España|Spain|France|Italy|UK|Mexico|Argentina|Brazil|China|Japan|Korea|India|Russia|Turkey|Egypt|South Africa|Australia|New Zealand)$/i;
        name = name.replace(countryPattern, '').trim();
        return name;
      }
    }

    return null;
  }

  /**
   * Extrahiert Kontaktinformationen (Email oder Telefon)
   */
  private static extractContactInfo(text: string): { email?: string; phone?: string } {
    const result: { email?: string; phone?: string } = {};

    // Email-Patterns
    const emailPatterns = [
      /Email del huésped:\s*([^\s\n]+)/i,
      /Guest email:\s*([^\s\n]+)/i,
      /Email:\s*([^\s\n]+)/i,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i // Allgemeines Email-Pattern
    ];

    for (const pattern of emailPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const email = match[1].trim();
        // Validiere Email-Format
        if (email.includes('@') && email.includes('.')) {
          result.email = email;
          break;
        }
      }
    }

    // Telefon-Patterns
    const phonePatterns = [
      /Teléfono:\s*([^\s\n]+)/i,
      /Phone:\s*([^\s\n]+)/i,
      /Tel:\s*([^\s\n]+)/i,
      /(\+?\d{7,15})/ // Allgemeines Telefon-Pattern (7-15 Ziffern)
    ];

    for (const pattern of phonePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const phone = match[1].trim();
        // Validiere Telefon-Format (nicht Email)
        if (!phone.includes('@')) {
          result.phone = phone;
          break;
        }
      }
    }

    return result;
  }

  /**
   * Extrahiert Check-in und Check-out Daten
   */
  private static extractDates(text: string): { checkIn: Date; checkOut: Date } | null {
    const checkInPatterns = [
      /Check in:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
      /Check-in:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
      /Entrada:\s*(\d{2})\/(\d{2})\/(\d{4})/i
    ];

    const checkOutPatterns = [
      /Check out:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
      /Check-out:\s*(\d{2})\/(\d{2})\/(\d{4})/i,
      /Salida:\s*(\d{2})\/(\d{2})\/(\d{4})/i
    ];

    let checkInDate: Date | null = null;
    let checkOutDate: Date | null = null;

    // Check-in
    for (const pattern of checkInPatterns) {
      const match = text.match(pattern);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // Monate sind 0-indexiert
        const year = parseInt(match[3], 10);
        checkInDate = new Date(year, month, day);
        break;
      }
    }

    // Check-out
    for (const pattern of checkOutPatterns) {
      const match = text.match(pattern);
      if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const year = parseInt(match[3], 10);
        checkOutDate = new Date(year, month, day);
        break;
      }
    }

    if (!checkInDate || !checkOutDate) {
      return null;
    }

    return { checkIn: checkInDate, checkOut: checkOutDate };
  }

  /**
   * Extrahiert Betrag und Währung
   */
  private static extractAmount(text: string): { amount: number; currency: string } | null {
    const patterns = [
      /Total:\s*([A-Z]{3})\s+(\d+[\d,.]*)/i,  // "Total: COP 111841" (mit Leerzeichen)
      /Total:\s*(\d+[\d,.]*)\s+([A-Z]{3})/i,  // "Total: 111841 COP" (mit Leerzeichen)
      /Total:\s*([A-Z]{3})\s*(\d+[\d,.]*)/i,  // "Total: COP111841" (ohne Leerzeichen)
      /Total:\s*(\d+[\d,.]*)\s*([A-Z]{3})/i,  // "Total: 111841COP" (ohne Leerzeichen)
      /Cargos:\s*([A-Z]{3})\s+(\d+[\d,.]*)/i,
      /Cargos:\s*(\d+[\d,.]*)\s+([A-Z]{3})/i,
      /Cargos:\s*([A-Z]{3})\s*(\d+[\d,.]*)/i,
      /Cargos:\s*(\d+[\d,.]*)\s*([A-Z]{3})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let currency = 'COP';
        let amountStr = '';

        // Prüfe ob Währung zuerst oder zuletzt kommt
        if (match[1].match(/^[A-Z]{3}$/)) {
          currency = match[1];
          amountStr = match[2];
        } else {
          amountStr = match[1];
          currency = match[2];
        }

        // Entferne Kommas und Punkte (außer Dezimalpunkt)
        const cleanAmount = amountStr.replace(/,/g, '').replace(/\./g, '');
        const amount = parseFloat(cleanAmount);

        if (!isNaN(amount) && amount > 0) {
          return { amount, currency };
        }
      }
    }

    return null;
  }

  /**
   * Extrahiert Anzahl Nächte
   */
  private static extractNights(text: string): number | undefined {
    const patterns = [
      /(\d+)\s*noches?/i,
      /(\d+)\s*nights?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Extrahiert Anzahl Zimmer
   */
  private static extractRooms(text: string): number | undefined {
    const patterns = [
      /(\d+)\s*habitaciones?/i,
      /(\d+)\s*rooms?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Extrahiert Anzahl Gäste
   */
  private static extractGuests(text: string): number | undefined {
    const patterns = [
      /(\d+)\s*huéspedes?/i,
      /(\d+)\s*guests?/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
    }

    return undefined;
  }

  /**
   * Extrahiert Nationalität
   */
  private static extractNationality(text: string): string | undefined {
    // Suche nach bekannten Ländern nach dem Gast-Namen
    const countries = [
      'Bielorrusia', 'Belarus', 'Colombia', 'Germany', 'USA', 'Spain', 'France',
      'Italy', 'UK', 'Mexico', 'Argentina', 'Brazil', 'China', 'Japan', 'Korea',
      'India', 'Russia', 'Turkey', 'Egypt', 'South Africa', 'Australia', 'New Zealand'
    ];

    for (const country of countries) {
      const pattern = new RegExp(`\\b${country}\\b`, 'i');
      if (pattern.test(text)) {
        return country;
      }
    }

    return undefined;
  }

  /**
   * Extrahiert Kommission
   */
  private static extractCommission(text: string): number | undefined {
    const patterns = [
      /Comisión:\s*([A-Z]{3})\s*(\d+[\d,.]*)/i,
      /Comisión:\s*(\d+[\d,.]*)\s*([A-Z]{3})/i,
      /Commission:\s*([A-Z]{3})\s*(\d+[\d,.]*)/i,
      /Commission:\s*(\d+[\d,.]*)\s*([A-Z]{3})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let amountStr = '';

        if (match[1].match(/^[A-Z]{3}$/)) {
          amountStr = match[2];
        } else {
          amountStr = match[1];
        }

        const cleanAmount = amountStr.replace(/,/g, '').replace(/\./g, '');
        const amount = parseFloat(cleanAmount);

        if (!isNaN(amount) && amount > 0) {
          return amount;
        }
      }
    }

    return undefined;
  }
}

