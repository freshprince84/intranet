import { prisma } from '../utils/prisma';
import { LanguageDetectionService } from './languageDetectionService';
import { BoldPaymentService } from './boldPaymentService';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';
import { ReservationStatus, PaymentStatus } from '@prisma/client';

/**
 * WhatsApp Guest Service
 * 
 * Identifiziert Gäste und sendet Codes, Payment Links und Check-in Links
 */
export class WhatsAppGuestService {
  /**
   * Identifiziert Gast via Telefonnummer (Primär)
   */
  static async identifyGuestByPhone(
    phoneNumber: string,
    branchId: number
  ): Promise<any | null> {
    try {
      const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
      
      // Suche aktive Reservationen
      const now = new Date();
      const reservation = await prisma.reservation.findFirst({
        where: {
          guestPhone: normalizedPhone,
          branchId: branchId,
          checkInDate: { lte: now }, // Heute oder in der Vergangenheit
          checkOutDate: { gte: now }, // Heute oder in der Zukunft
          status: {
            in: ['confirmed', 'notification_sent', 'checked_in']
          }
        },
        orderBy: {
          checkInDate: 'desc' // Neueste zuerst
        }
      });

      return reservation;
    } catch (error) {
      console.error('[WhatsApp Guest Service] Fehler bei Gast-Identifikation via Telefonnummer:', error);
      return null;
    }
  }

  /**
   * Sucht Reservationen via Gast-Details (Sekundär)
   * 
   * @param firstName - Vorname
   * @param lastName - Nachname
   * @param nationality - Land
   * @param birthDate - Geburtsdatum (optional)
   * @param branchId - Branch ID
   */
  static async findReservationsByDetails(
    firstName: string,
    lastName: string,
    nationality: string,
    birthDate?: Date | null,
    branchId?: number
  ): Promise<any[]> {
    try {
      const now = new Date();
      
      // Parse guestName: Suche nach Vorname und Nachname
      // guestName ist ein einzelnes Feld (z.B. "Juan Pérez")
      // Wir müssen Fuzzy-Matching machen
      const searchName = `${firstName} ${lastName}`.toLowerCase().trim();
      
      // Suche alle aktiven Reservationen
      const reservations = await prisma.reservation.findMany({
        where: {
          ...(branchId ? { branchId: branchId } : {}),
          checkInDate: { lte: now },
          checkOutDate: { gte: now },
          status: {
            in: ['confirmed', 'notification_sent', 'checked_in']
          },
          // Fuzzy-Matching für Name
          guestName: {
            contains: searchName,
            mode: 'insensitive'
          },
          // Case-insensitive Übereinstimmung für Nationalität
          guestNationality: {
            equals: nationality,
            mode: 'insensitive'
          },
          // Optional: Geburtsdatum
          ...(birthDate ? {
            guestBirthDate: {
              equals: birthDate
            }
          } : {})
        },
        orderBy: {
          checkInDate: 'desc'
        }
      });

      // Zusätzliche Filterung: Prüfe ob Vorname und Nachname wirklich enthalten sind
      const filtered = reservations.filter(res => {
        const name = res.guestName.toLowerCase();
        const firstNameLower = firstName.toLowerCase();
        const lastNameLower = lastName.toLowerCase();
        
        // Prüfe ob Vorname UND Nachname enthalten sind
        return name.includes(firstNameLower) && name.includes(lastNameLower);
      });

      return filtered;
    } catch (error) {
      console.error('[WhatsApp Guest Service] Fehler bei Suche nach Gast-Details:', error);
      return [];
    }
  }

  /**
   * Prüft Reservation-Status (Zahlung & Check-in)
   */
  static checkReservationStatus(reservation: any): {
    needsPayment: boolean;
    needsCheckIn: boolean;
    paymentStatus: PaymentStatus;
    checkInStatus: boolean;
  } {
    const needsPayment = reservation.paymentStatus !== 'paid';
    const needsCheckIn = !reservation.onlineCheckInCompleted;
    
    return {
      needsPayment,
      needsCheckIn,
      paymentStatus: reservation.paymentStatus,
      checkInStatus: reservation.onlineCheckInCompleted
    };
  }

  /**
   * Holt oder erstellt Payment Link
   */
  static async getPaymentLink(reservation: any): Promise<string | null> {
    try {
      // Verwende bestehenden Payment Link
      if (reservation.paymentLink) {
        return reservation.paymentLink;
      }

      // Erstelle neuen Payment Link
      if (reservation.amount && reservation.branchId) {
        const boldPaymentService = await BoldPaymentService.createForBranch(reservation.branchId);
        const amount = typeof reservation.amount === 'number' 
          ? reservation.amount 
          : Number(reservation.amount);
        const currency = reservation.currency || 'COP';
        
        const paymentLink = await boldPaymentService.createPaymentLink(
          reservation,
          amount,
          currency,
          `Zahlung für Reservierung ${reservation.guestName}`
        );
        
        return paymentLink;
      }

      return null;
    } catch (error) {
      console.error('[WhatsApp Guest Service] Fehler beim Erstellen des Payment Links:', error);
      return null;
    }
  }

  /**
   * Generiert Check-in Link
   */
  static getCheckInLink(reservation: any): string | null {
    try {
      // Check-in Link benötigt lobbyReservationId und guestEmail
      if (!reservation.lobbyReservationId || !reservation.guestEmail) {
        return null;
      }

      const checkInLink = generateLobbyPmsCheckInLink({
        id: reservation.id,
        lobbyReservationId: reservation.lobbyReservationId,
        guestEmail: reservation.guestEmail
      });

      return checkInLink;
    } catch (error) {
      console.error('[WhatsApp Guest Service] Fehler beim Generieren des Check-in Links:', error);
      return null;
    }
  }

  /**
   * Findet Code für Reservation
   * Priorität: lobbyReservationId → doorPin → ttlLockPassword
   */
  static getReservationCode(reservation: any): {
    code: string | null;
    codeType: 'lobbyReservationId' | 'doorPin' | 'ttlLockPassword' | null;
  } {
    if (reservation.lobbyReservationId) {
      return {
        code: reservation.lobbyReservationId,
        codeType: 'lobbyReservationId'
      };
    }

    if (reservation.doorPin) {
      return {
        code: reservation.doorPin,
        codeType: 'doorPin'
      };
    }

    if (reservation.ttlLockPassword) {
      return {
        code: reservation.ttlLockPassword,
        codeType: 'ttlLockPassword'
      };
    }

    return {
      code: null,
      codeType: null
    };
  }

  /**
   * Erstellt Status-Nachricht mit Code und Links
   */
  static async buildStatusMessage(
    reservation: any,
    language: string = 'es'
  ): Promise<string> {
    const status = this.checkReservationStatus(reservation);
    const codeInfo = this.getReservationCode(reservation);
    
    // Übersetzungen
    const translations: Record<string, any> = {
      es: {
        greeting: (name: string) => `Hola ${name}!`,
        paymentPending: 'Por favor, realiza el pago:',
        checkInPending: 'Realiza el check-in en línea:',
        code: 'Tu código de acceso:',
        noCode: 'No hay código disponible para esta reservación.',
        seeYou: '¡Te esperamos!',
        bothPending: 'Por favor, completa el pago y el check-in antes de tu llegada.'
      },
      de: {
        greeting: (name: string) => `Hallo ${name}!`,
        paymentPending: 'Bitte zahle:',
        checkInPending: 'Führe den Check-in online durch:',
        code: 'Dein Zugangscode:',
        noCode: 'Kein Code für diese Reservierung verfügbar.',
        seeYou: 'Wir freuen uns auf dich!',
        bothPending: 'Bitte schließe Zahlung und Check-in vor deiner Ankunft ab.'
      },
      en: {
        greeting: (name: string) => `Hello ${name}!`,
        paymentPending: 'Please make the payment:',
        checkInPending: 'Complete the online check-in:',
        code: 'Your access code:',
        noCode: 'No code available for this reservation.',
        seeYou: 'We look forward to seeing you!',
        bothPending: 'Please complete payment and check-in before your arrival.'
      }
    };

    const t = translations[language] || translations.es;
    let message = t.greeting(reservation.guestName) + '\n\n';

    // Payment Link
    if (status.needsPayment) {
      const paymentLink = await this.getPaymentLink(reservation);
      if (paymentLink) {
        message += `${t.paymentPending}\n${paymentLink}\n\n`;
      }
    }

    // Check-in Link
    if (status.needsCheckIn) {
      const checkInLink = this.getCheckInLink(reservation);
      if (checkInLink) {
        message += `${t.checkInPending}\n${checkInLink}\n\n`;
      }
    }

    // Code
    if (codeInfo.code) {
      message += `${t.code} ${codeInfo.code}\n\n`;
    } else {
      message += `${t.noCode}\n\n`;
    }

    // Hinweis wenn beide ausstehend
    if (status.needsPayment && status.needsCheckIn) {
      message += `${t.bothPending}\n\n`;
    }

    message += t.seeYou;

    return message;
  }

  /**
   * Gibt BEREITS GENERIERTEN TTLock Passcode zurück (aus DB)
   * IGNORIERT lobbyReservationId komplett!
   * Code wird NICHT generiert, nur gelesen!
   */
  static getTTLockPasscode(reservation: any): string | null {
    // doorPin ist das Feld, das verwendet wird
    return reservation.doorPin || null;
  }

  /**
   * Erkennt Sprache für Gast-Nachricht
   * Priorität: 1. Nachricht, 2. Telefonnummer, 3. Spanisch (Fallback)
   */
  static detectLanguage(messageText: string | null, phoneNumber: string): string {
    // Priorität 1: Sprache aus Nachricht
    if (messageText) {
      const { WhatsAppAiService } = require('./whatsappAiService');
      const detectedLang = WhatsAppAiService.detectLanguageFromMessage(messageText);
      if (detectedLang) {
        return detectedLang;
      }
    }
    
    // Priorität 2: Sprache aus Telefonnummer
    const { LanguageDetectionService } = require('./languageDetectionService');
    return LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
  }

  /**
   * Erstellt Nachricht mit NUR dem BEREITS GENERIERTEN TTLock Passcode
   * Code wird NICHT generiert, nur aus DB gelesen!
   */
  static buildPincodeMessage(
    reservation: any,
    language?: string,
    messageText?: string | null
  ): string {
    // Erkenne Sprache falls nicht übergeben
    if (!language && reservation.guestPhone) {
      language = this.detectLanguage(messageText || null, reservation.guestPhone);
    }
    language = language || 'es'; // Fallback
    const translations: Record<string, any> = {
      es: {
        greeting: (name: string) => `Hola ${name}!`,
        pincode: 'Tu código PIN:',
        noPincode: 'No hay código PIN disponible para esta reservación. Por favor, contacta con el personal.',
        seeYou: '¡Te esperamos!'
      },
      de: {
        greeting: (name: string) => `Hallo ${name}!`,
        pincode: 'Dein PIN-Code:',
        noPincode: 'Kein PIN-Code für diese Reservierung verfügbar. Bitte kontaktiere das Personal.',
        seeYou: 'Wir freuen uns auf dich!'
      },
      en: {
        greeting: (name: string) => `Hello ${name}!`,
        pincode: 'Your PIN code:',
        noPincode: 'No PIN code available for this reservation. Please contact the staff.',
        seeYou: 'We look forward to seeing you!'
      }
    };

    const t = translations[language] || translations.es;
    let message = t.greeting(reservation.guestName) + '\n\n';

    const pincode = this.getTTLockPasscode(reservation);
    if (pincode) {
      message += `${t.pincode} ${pincode}\n\n`;
      message += t.seeYou;
    } else {
      // Code wurde noch nicht generiert - Fehlermeldung
      message += t.noPincode;
    }

    return message;
  }
}

