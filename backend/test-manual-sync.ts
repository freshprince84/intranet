import { LobbyPmsReservationSyncService } from './src/services/lobbyPmsReservationSyncService';
import { prisma } from './src/utils/prisma';

async function testManualSync() {
  try {
    console.log('=== MANUELLER SYNC TEST ===\n');
    
    // Test für Branch 3 (Manila)
    const branchId = 3;
    const startDate = new Date('2025-01-26T00:00:00Z');
    
    console.log(`Branch ID: ${branchId}`);
    console.log('StartDate:', startDate.toISOString());
    console.log('StartDate Local:', startDate.toLocaleString('de-DE'));
    console.log('\nStarte Sync...\n');
    
    const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(
      branchId, 
      startDate
    );
    
    console.log(`\n✅ Sync abgeschlossen: ${syncedCount} Reservierungen synchronisiert`);
    
    // Prüfe letzte Sync-Zeit
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { lobbyPmsLastSyncAt: true, name: true }
    });
    
    console.log(`\nLetzte Sync-Zeit für ${branch?.name}:`, branch?.lobbyPmsLastSyncAt?.toISOString() || 'NICHT GESETZT');
    
    await prisma.$disconnect();
    console.log('\n✅ Test abgeschlossen');
  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    await prisma.$disconnect();
    process.exit(1);
  }
}

testManualSync();

