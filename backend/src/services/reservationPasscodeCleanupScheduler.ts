import { prisma } from '../utils/prisma';
import { TTLockService } from './ttlockService';
import { getTimezoneForCountry } from '../utils/timeUtils';
import { fromZonedTime } from 'date-fns-tz';

/**
 * Scheduler für automatische Löschung von TTLock Passcodes nach Checkout
 * 
 * Prüft regelmäßig Reservations mit abgelaufenem Checkout (11:00 lokale Zeit)
 * und löscht die Passcodes per TTLock API
 */
export class ReservationPasscodeCleanupScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 5 * 60 * 1000; // Alle 5 Minuten prüfen

  /**
   * Startet den Scheduler
   */
  static start(): void {
    if (this.checkInterval) {
      console.log('[ReservationPasscodeCleanup] Scheduler läuft bereits');
      return;
    }

    console.log('[ReservationPasscodeCleanup] Starte Scheduler...');
    
    // Sofortige Prüfung beim Start
    this.checkAndCleanupPasscodes();

    // Regelmäßige Prüfung
    this.checkInterval = setInterval(() => {
      this.checkAndCleanupPasscodes();
    }, this.CHECK_INTERVAL);

    console.log('[ReservationPasscodeCleanup] Scheduler gestartet (alle 5 Minuten)');
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[ReservationPasscodeCleanup] Scheduler gestoppt');
    }
  }

  /**
   * Prüft und löscht Passcodes von Reservations mit abgelaufenem Checkout
   * Öffentlich für Timer-Zugriff
   */
  static async checkAndCleanupPasscodes(): Promise<void> {
    try {
      const now = new Date();

      // Finde alle Reservations mit:
      // 1. doorPin vorhanden (Passcode existiert)
      // 2. ttlLockId vorhanden (TTLock konfiguriert)
      // 3. checkOutDate vorhanden
      // 4. Noch nicht gelöscht (doorPin ist noch gesetzt)
      const reservationsWithPasscodes = await prisma.reservation.findMany({
        where: {
          doorPin: { not: null },
          ttlLockId: { not: null },
          checkOutDate: { not: null }
        },
        include: {
          organization: {
            select: {
              id: true,
              country: true
            }
          },
          branch: {
            select: {
              id: true,
              doorSystemSettings: true
            }
          }
        }
      });

      if (reservationsWithPasscodes.length === 0) {
        return; // Keine Reservations mit Passcodes
      }

      console.log(`[ReservationPasscodeCleanup] ${reservationsWithPasscodes.length} Reservations mit Passcodes gefunden`);

      let deletedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const reservation of reservationsWithPasscodes) {
        try {
          // Prüfe ob Checkout + 11:00 lokale Zeit überschritten ist
          const shouldDelete = await this.shouldDeletePasscode(reservation, now);
          
          if (!shouldDelete) {
            skippedCount++;
            continue;
          }

          // Lösche Passcode
          const deleted = await this.deletePasscode(reservation);
          
          if (deleted) {
            deletedCount++;
            console.log(`[ReservationPasscodeCleanup] ✅ Passcode für Reservation ${reservation.id} gelöscht`);
          } else {
            skippedCount++;
            console.log(`[ReservationPasscodeCleanup] ⚠️ Passcode für Reservation ${reservation.id} nicht gefunden oder bereits gelöscht`);
          }
        } catch (error) {
          errorCount++;
          console.error(`[ReservationPasscodeCleanup] ❌ Fehler beim Löschen des Passcodes für Reservation ${reservation.id}:`, error);
          // Weiter mit nächster Reservierung
        }
      }

      if (deletedCount > 0 || skippedCount > 0 || errorCount > 0) {
        console.log(`[ReservationPasscodeCleanup] Zusammenfassung: ${deletedCount} gelöscht, ${skippedCount} übersprungen, ${errorCount} Fehler`);
      }
    } catch (error) {
      console.error('[ReservationPasscodeCleanup] Fehler beim Prüfen der Reservations:', error);
    }
  }

  /**
   * Prüft ob der Passcode gelöscht werden sollte (Checkout + 11:00 lokale Zeit überschritten)
   */
  private static async shouldDeletePasscode(reservation: any, now: Date): Promise<boolean> {
    if (!reservation.checkOutDate || !reservation.organization?.country) {
      return false;
    }

    // Bestimme Zeitzone der Organisation
    const timezone = getTimezoneForCountry(reservation.organization.country);
    
    // Checkout-Datum extrahieren (ist UTC in DB)
    const checkoutDate = new Date(reservation.checkOutDate);
    
    // Hole lokales Datum (ohne Zeit) in der Zeitzone der Organisation
    const checkoutLocalDate = checkoutDate.toLocaleDateString('en-CA', { timeZone: timezone }); // Format: YYYY-MM-DD
    
    // Erstelle Datum 11:00:00 in lokaler Zeitzone
    const checkoutAt11Local = new Date(`${checkoutLocalDate}T11:00:00`);
    
    // Konvertiere lokale Zeit (11:00 in timezone) zu UTC für Vergleich
    const checkoutAt11UTC = fromZonedTime(checkoutAt11Local, timezone);
    
    // Prüfe ob jetzt nach Checkout + 11:00 ist
    return now >= checkoutAt11UTC;
  }

  /**
   * Löscht den Passcode einer Reservation per TTLock API
   */
  private static async deletePasscode(reservation: any): Promise<boolean> {
    if (!reservation.doorPin || !reservation.ttlLockId) {
      return false;
    }

    try {
      // Erstelle TTLockService für Branch oder Organisation
      let ttlockService: TTLockService;
      
      if (reservation.branchId && reservation.branch?.doorSystemSettings) {
        // Verwende Branch-spezifische Settings
        ttlockService = await TTLockService.createForBranch(reservation.branchId);
      } else {
        // Verwende Organisation-Settings
        ttlockService = new TTLockService(reservation.organizationId);
      }

      // Lösche Passcode per doorPin
      const deleted = await ttlockService.deletePasscodeByPin(
        reservation.ttlLockId,
        reservation.doorPin
      );

      if (deleted) {
        // Passcode erfolgreich gelöscht - markiere in DB (optional, für Frontend-Anzeige)
        // Wir löschen NICHT doorPin aus der DB, sondern markieren nur als gelöscht
        // Frontend zeigt dann durchgestrichen & rot an
        // TODO: Optional - Flag hinzufügen wenn gewünscht
        console.log(`[ReservationPasscodeCleanup] Passcode für Reservation ${reservation.id} erfolgreich gelöscht`);
      }

      return deleted;
    } catch (error) {
      console.error(`[ReservationPasscodeCleanup] Fehler beim Löschen des Passcodes:`, error);
      throw error;
    }
  }
}

