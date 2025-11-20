import { LobbyPmsReservationSyncService } from './lobbyPmsReservationSyncService';
import { prisma } from '../utils/prisma';

/**
 * Scheduler für automatische LobbyPMS-Reservation-Synchronisation
 * 
 * Prüft regelmäßig auf neue Reservierungen für alle Branches mit aktivierter LobbyPMS-Sync
 * Ersetzt den Email-basierten Import durch API-basierten Import
 */
export class LobbyPmsReservationScheduler {
  private static checkInterval: NodeJS.Timeout | null = null;
  public static isRunning = false;

  /**
   * Startet den Scheduler
   * 
   * Prüft alle 10 Minuten auf neue Reservierungen für alle Branches mit aktivierter LobbyPMS-Sync
   */
  static start(): void {
    if (this.isRunning) {
      console.log('[LobbyPmsReservationScheduler] Scheduler läuft bereits');
      return;
    }

    console.log('[LobbyPmsReservationScheduler] Scheduler gestartet');

    // Prüfe alle 10 Minuten
    const CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten

    this.checkInterval = setInterval(async () => {
      await this.checkAllBranches();
    }, CHECK_INTERVAL_MS);

    // Führe sofort einen Check aus beim Start
    this.checkAllBranches();

    this.isRunning = true;
  }

  /**
   * Stoppt den Scheduler
   */
  static stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.isRunning = false;
      console.log('[LobbyPmsReservationScheduler] Scheduler gestoppt');
    }
  }

  /**
   * Prüft alle Branches auf neue Reservierungen
   */
  private static async checkAllBranches(): Promise<void> {
    try {
      console.log('[LobbyPmsReservationScheduler] Starte Sync für alle Branches...');

      // Hole alle Branches mit Organisation
      const branches = await prisma.branch.findMany({
        where: {
          organizationId: { not: null }
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              settings: true
            }
          }
        }
      });

      let totalProcessed = 0;

      // Prüfe jede Branch
      for (const branch of branches) {
        try {
          // Prüfe ob LobbyPMS Sync aktiviert ist
          const branchSettings = branch.lobbyPmsSettings as any;
          const orgSettings = branch.organization?.settings as any;
          
          // Entschlüssele Settings falls nötig
          const { decryptBranchApiSettings, decryptApiSettings } = await import('../utils/encryption');
          const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
          const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
          
          const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

          if (!lobbyPmsSettings?.apiKey) {
            continue; // Kein API Key konfiguriert
          }

          if (lobbyPmsSettings.syncEnabled === false) {
            continue; // Sync deaktiviert
          }

          console.log(`[LobbyPmsReservationScheduler] Prüfe Branch ${branch.id} (${branch.name})...`);

          // Synchronisiere Reservierungen für diesen Branch
          const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(branch.id);
          totalProcessed += syncedCount;

          if (syncedCount > 0) {
            console.log(`[LobbyPmsReservationScheduler] ✅ Branch ${branch.id}: ${syncedCount} Reservation(s) synchronisiert`);
          }
        } catch (error) {
          console.error(`[LobbyPmsReservationScheduler] Fehler bei Branch ${branch.id}:`, error);
          // Weiter mit nächster Branch
        }
      }

      if (totalProcessed > 0) {
        console.log(`[LobbyPmsReservationScheduler] ✅ Insgesamt ${totalProcessed} Reservation(s) synchronisiert`);
      } else {
        console.log('[LobbyPmsReservationScheduler] Keine neuen Reservierungen gefunden');
      }
    } catch (error) {
      console.error('[LobbyPmsReservationScheduler] Fehler beim Branch-Check:', error);
    }
  }

  /**
   * Führt manuell einen Sync für eine bestimmte Branch aus (für Tests)
   */
  static async triggerManually(branchId?: number): Promise<number> {
    console.log('[LobbyPmsReservationScheduler] Manueller Trigger...');

    if (branchId) {
      // Prüfe nur eine Branch
      try {
        const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(branchId);
        console.log(`[LobbyPmsReservationScheduler] Manueller Sync für Branch ${branchId}: ${syncedCount} Reservation(s) synchronisiert`);
        return syncedCount;
      } catch (error) {
        console.error(`[LobbyPmsReservationScheduler] Fehler beim manuellen Sync für Branch ${branchId}:`, error);
        throw error;
      }
    } else {
      // Prüfe alle Branches
      await this.checkAllBranches();
      return 0; // Anzahl wird in checkAllBranches geloggt
    }
  }
}

