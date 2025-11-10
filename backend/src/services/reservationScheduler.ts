import { ReservationNotificationService } from './reservationNotificationService';

/**
 * Scheduler für automatische Reservierungs-Benachrichtigungen
 * 
 * Führt täglich um 20:00 Uhr den Versand von Check-in-Einladungen aus
 */
export class ReservationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  private static lastCheckDate: string = '';

  /**
   * Startet den Scheduler
   * 
   * Prüft alle 10 Minuten, ob es 20:00 Uhr ist
   * Wenn ja, sendet Check-in-Einladungen
   */
  static start(): void {
    console.log('[ReservationScheduler] Scheduler gestartet');

    // Prüfe alle 10 Minuten
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

    this.checkInterval = setInterval(async () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDate = now.toDateString();

      // Prüfe ob es zwischen 20:00 und 20:10 Uhr ist
      // Und ob wir heute noch nicht gesendet haben
      if (currentHour === 20 && this.lastCheckDate !== currentDate) {
        console.log('[ReservationScheduler] Starte tägliche Check-in-Einladungen...');
        this.lastCheckDate = currentDate;

        try {
          await ReservationNotificationService.sendLateCheckInInvitations();
          console.log('[ReservationScheduler] Check-in-Einladungen erfolgreich versendet');
        } catch (error) {
          console.error('[ReservationScheduler] Fehler beim Versand:', error);
        }
      }
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[ReservationScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Führt manuell den Versand aus (für Tests)
   */
  static async triggerManually(): Promise<void> {
    console.log('[ReservationScheduler] Manueller Trigger...');
    try {
      await ReservationNotificationService.sendLateCheckInInvitations();
      console.log('[ReservationScheduler] Manueller Versand erfolgreich');
    } catch (error) {
      console.error('[ReservationScheduler] Fehler beim manuellen Versand:', error);
      throw error;
    }
  }
}


