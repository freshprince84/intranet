import { LobbyPmsService } from './lobbyPmsService';
import { prisma } from '../utils/prisma';

/**
 * Service für die Synchronisation von Reservierungen von LobbyPMS API pro Branch
 * 
 * Ersetzt den Email-basierten Import durch API-basierten Import
 */
export class LobbyPmsReservationSyncService {
  /**
   * Synchronisiert Reservierungen für einen Branch
   * 
   * @param branchId - Branch-ID
   * @param startDate - Startdatum (optional, default: heute)
   * @param endDate - Enddatum (optional, default: +30 Tage)
   * @returns Anzahl synchronisierter Reservierungen
   */
  static async syncReservationsForBranch(
    branchId: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      // Lade Branch mit Organisation und lastSyncAt
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: {
          lobbyPmsLastSyncAt: true, // OPTIMIERUNG: Letzte Sync-Zeit für Caching
          organizationId: true,
          lobbyPmsSettings: true,
          organization: {
            select: {
              id: true,
              settings: true
            }
          }
        }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      if (!branch.organizationId) {
        throw new Error(`Branch ${branchId} hat keine Organisation`);
      }

      // Prüfe ob LobbyPMS für Branch konfiguriert ist
      const branchSettings = branch.lobbyPmsSettings as any;
      const orgSettings = branch.organization?.settings as any;
      
      // Entschlüssele Settings falls nötig
      const { decryptBranchApiSettings, decryptApiSettings } = await import('../utils/encryption');
      const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
      const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
      
      const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.log(`[LobbyPmsSync] Branch ${branchId} hat keinen LobbyPMS API Key konfiguriert`);
        return 0;
      }

      if (lobbyPmsSettings.syncEnabled === false) {
        console.log(`[LobbyPmsSync] LobbyPMS Sync ist für Branch ${branchId} deaktiviert`);
        return 0;
      }

      // WICHTIG: Immer die letzten 24 Stunden prüfen (Erstellungsdatum)
      let syncStartDate: Date;
      if (startDate) {
        // Explizites startDate übergeben (z.B. manueller Sync)
        syncStartDate = startDate;
        console.log(`[LobbyPmsSync] Branch ${branchId}: Verwende explizites startDate: ${syncStartDate.toISOString()}`);
      } else {
        // Immer letzte 24 Stunden (Erstellungsdatum)
        syncStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log(`[LobbyPmsSync] Branch ${branchId}: Prüfe Reservierungen mit Erstellungsdatum in den letzten 24 Stunden`);
      }

      // Erstelle LobbyPMS Service für Branch
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);

      // Hole Reservierungen von LobbyPMS und synchronisiere sie
      // fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
      const syncedCount = await lobbyPmsService.syncReservations(syncStartDate);

      console.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);

      // OPTIMIERUNG: Speichere erfolgreiche Sync-Zeit
      if (syncedCount >= 0) { // Auch bei 0 (keine neuen Reservierungen) speichern
        await prisma.branch.update({
          where: { id: branchId },
          data: {
            lobbyPmsLastSyncAt: new Date(), // Aktuelle Zeit
          }
        });
        console.log(`[LobbyPmsSync] Branch ${branchId}: Sync-Zeit gespeichert`);
      }

      return syncedCount;
    } catch (error) {
      console.error(`[LobbyPmsSync] Fehler beim Synchronisieren für Branch ${branchId}:`, error);
      throw error;
    }
  }
}

