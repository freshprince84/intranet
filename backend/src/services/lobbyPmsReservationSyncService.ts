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
      const syncStartDate = startDate || new Date();
      const syncEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 Tage

      // Hole Reservierungen von LobbyPMS und synchronisiere sie
      const syncedCount = await lobbyPmsService.syncReservations(syncStartDate, syncEndDate);

      console.log(`[LobbyPmsSync] Branch ${branchId}: ${syncedCount} Reservierungen synchronisiert`);

      return syncedCount;
    } catch (error) {
      console.error(`[LobbyPmsSync] Fehler beim Synchronisieren für Branch ${branchId}:`, error);
      throw error;
    }
  }
}

