# Plan: Manueller Sync-Button für Reservierungen

## Problem

Der manuelle Sync-Button (`POST /api/lobby-pms/sync`) verwendet aktuell:
- `new LobbyPmsService(organizationId)` - nur Organisation-Settings
- Sync nur für Organisation, nicht pro Branch
- Funktioniert nicht, weil Organisation-Settings keine/ungültige LobbyPMS-Konfiguration haben

## Lösung

Der manuelle Sync soll genauso funktionieren wie der automatische Scheduler:
- Alle Branches der Organisation syncen (pro Branch, nacheinander)
- Fallback auf Organisation-Settings beibehalten (wie im automatischen Scheduler)
- Gleiche Logik wie `LobbyPmsReservationScheduler.checkAllBranches()`

## Implementierung

### Datei: `backend/src/controllers/lobbyPmsController.ts`

**Aktueller Code (Zeile 147-194):**
```typescript
export const syncReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, reservationIds } = req.body;
    const organizationId = req.organizationId;

    const service = new LobbyPmsService(organizationId);
    // ... nur Organisation-Settings
  }
}
```

**Neuer Code:**
```typescript
export const syncReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { startDate, endDate, reservationIds } = req.body;
    const organizationId = req.organizationId;

    // Wenn spezifische Reservierungen: Alte Logik beibehalten
    if (reservationIds && Array.isArray(reservationIds)) {
      const service = new LobbyPmsService(organizationId);
      let syncedCount = 0;
      let errors: string[] = [];
      
      for (const reservationId of reservationIds) {
        try {
          const lobbyReservation = await service.fetchReservationById(reservationId);
          await service.syncReservation(lobbyReservation);
          syncedCount++;
        } catch (error) {
          errors.push(`Reservierung ${reservationId}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
        }
      }
      
      return res.json({
        success: true,
        syncedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // NEU: Sync alle Branches der Organisation (wie automatischer Scheduler)
    const { LobbyPmsReservationSyncService } = await import('../services/lobbyPmsReservationSyncService');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();

    // Hole alle Branches der Organisation
    const branches = await prisma.branch.findMany({
      where: {
        organizationId: organizationId
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

    let totalSynced = 0;
    const branchResults: Array<{ branchId: number; branchName: string; syncedCount: number; error?: string }> = [];

    // Sync jede Branch (wie im automatischen Scheduler)
    for (const branch of branches) {
      try {
        // Prüfe ob LobbyPMS Sync aktiviert ist (gleiche Logik wie Scheduler)
        const branchSettings = branch.lobbyPmsSettings as any;
        const orgSettings = branch.organization?.settings as any;
        
        const { decryptBranchApiSettings, decryptApiSettings } = await import('../utils/encryption');
        const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
        const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
        
        const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

        if (!lobbyPmsSettings?.apiKey) {
          branchResults.push({
            branchId: branch.id,
            branchName: branch.name,
            syncedCount: 0,
            error: 'Kein LobbyPMS API Key konfiguriert'
          });
          continue; // Kein API Key konfiguriert
        }

        if (lobbyPmsSettings.syncEnabled === false) {
          branchResults.push({
            branchId: branch.id,
            branchName: branch.name,
            syncedCount: 0,
            error: 'LobbyPMS Sync ist deaktiviert'
          });
          continue; // Sync deaktiviert
        }

        // Synchronisiere Reservierungen für diesen Branch
        const syncStartDate = startDate ? new Date(startDate) : undefined;
        const syncEndDate = endDate ? new Date(endDate) : undefined;
        
        const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(
          branch.id,
          syncStartDate,
          syncEndDate
        );
        
        totalSynced += syncedCount;
        branchResults.push({
          branchId: branch.id,
          branchName: branch.name,
          syncedCount: syncedCount
        });
      } catch (error) {
        branchResults.push({
          branchId: branch.id,
          branchName: branch.name,
          syncedCount: 0,
          error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
        // Weiter mit nächster Branch
      }
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      syncedCount: totalSynced,
      branchResults: branchResults,
      errors: branchResults.filter(r => r.error).map(r => `${r.branchName}: ${r.error}`)
    });
  } catch (error) {
    console.error('Error syncing reservations:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Fehler beim Synchronisieren der Reservierungen'
    });
  }
};
```

## Zusammenfassung

**Änderungen:**
1. ✅ Manueller Sync verwendet jetzt `LobbyPmsReservationSyncService.syncReservationsForBranch()` (wie automatischer Scheduler)
2. ✅ Sync alle Branches der Organisation (pro Branch, nacheinander)
3. ✅ Fallback auf Organisation-Settings beibehalten (wie im automatischen Scheduler)
4. ✅ Gleiche Prüfungen: `apiKey` vorhanden? `syncEnabled !== false`?
5. ✅ Optional: `startDate` und `endDate` Parameter werden an `syncReservationsForBranch()` weitergegeben
6. ✅ Detaillierte Ergebnisse pro Branch zurückgeben

**Rückwärtskompatibilität:**
- Wenn `reservationIds` übergeben wird: Alte Logik beibehalten (für spezifische Reservierungen)
- Wenn `startDate`/`endDate` oder nichts übergeben wird: Neue Logik (alle Branches)

**Ergebnis:**
- Manueller Sync funktioniert genauso wie automatischer Sync
- Gleiche Fallback-Logik
- Gleiche Fehlerbehandlung
- Detaillierte Ergebnisse pro Branch

