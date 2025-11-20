import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from './lobbyPmsService';

const prisma = new PrismaClient();

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
        console.log(`[LobbyPmsSync] ⏭️  Branch ${branchId} (${branch.name}): Kein LobbyPMS API Key konfiguriert`);
        return 0;
      }

      if (lobbyPmsSettings.syncEnabled === false) {
        console.log(`[LobbyPmsSync] ⏭️  Branch ${branchId} (${branch.name}): LobbyPMS Sync ist deaktiviert`);
        return 0;
      }

      // Erstelle LobbyPMS Service für Branch
      const startTime = Date.now();
      console.log(`[LobbyPmsSync] 🔄 Branch ${branchId} (${branch.name}): Starte Synchronisation...`);
      
      const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);

      // Datum-Bereich bestimmen
      const syncStartDate = startDate || new Date();
      const syncEndDate = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 Tage

      console.log(`[LobbyPmsSync] 📅 Branch ${branchId}: Zeitraum ${syncStartDate.toISOString().split('T')[0]} bis ${syncEndDate.toISOString().split('T')[0]}`);

      // Hole Reservierungen von LobbyPMS und synchronisiere sie
      const syncedCount = await lobbyPmsService.syncReservations(syncStartDate, syncEndDate);

      const duration = Date.now() - startTime;
      console.log(`[LobbyPmsSync] ✅ Branch ${branchId} (${branch.name}): ${syncedCount} Reservierungen synchronisiert in ${duration}ms`);

      return syncedCount;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error(`[LobbyPmsSync] ❌ Fehler beim Synchronisieren für Branch ${branchId}:`, {
        message: errorMessage,
        stack: errorStack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

