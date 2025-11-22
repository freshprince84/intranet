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
      // Lade Branch mit Organisation
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: { 
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

      // Erstelle LobbyPMS Service für Branch
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);

      // Datum-Bereich bestimmen
      // Standard: Letzte 24 Stunden (nur Reservierungen, die in den letzten 24h ERSTELLT wurden)
      // WICHTIG: creation_date_from filtert nach Erstellungsdatum, nicht nach Check-in!
      const syncStartDate = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // -24 Stunden
      // endDate wird nicht mehr benötigt, da creation_date_from nur einen Start-Parameter hat

      // Hole Reservierungen von LobbyPMS und synchronisiere sie
      // fetchReservations filtert jetzt nach creation_date, nicht nach Check-in!
      const syncedCount = await lobbyPmsService.syncReservations(syncStartDate);

      console.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);

      return syncedCount;
    } catch (error) {
      console.error(`[LobbyPmsSync] Fehler beim Synchronisieren für Branch ${branchId}:`, error);
      throw error;
    }
  }
}

