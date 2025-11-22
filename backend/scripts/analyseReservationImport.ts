import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyseReservationImport() {
  console.log('='.repeat(80));
  console.log('ANALYSE: Reservation Import System');
  console.log('='.repeat(80));
  
  // 1. Prüfe Rik Pols vs Hendrik Gebhardt
  console.log('\n1. RIK POLS vs HENDRIK GEBHARDT:');
  console.log('-'.repeat(80));
  const rik = await prisma.reservation.findMany({
    where: {
      organizationId: 1,
      guestName: { contains: 'Rik', mode: 'insensitive' }
    },
    select: { id: true, guestName: true, lobbyReservationId: true, branchId: true, createdAt: true }
  });
  const hendrik = await prisma.reservation.findMany({
    where: {
      organizationId: 1,
      guestName: { contains: 'Hendrik', mode: 'insensitive' }
    },
    select: { id: true, guestName: true, lobbyReservationId: true, branchId: true, createdAt: true }
  });
  console.log('Rik Pols Reservierungen:', rik.length);
  rik.forEach(r => console.log('  ', JSON.stringify(r)));
  console.log('\nHendrik Gebhardt Reservierungen:', hendrik.length);
  hendrik.forEach(r => console.log('  ', JSON.stringify(r)));
  
  // 2. Prüfe Beispiel-Reservierungen aus Screenshots
  console.log('\n\n2. BEISPIEL-RESERVIERUNGEN AUS SCREENSHOTS:');
  console.log('-'.repeat(80));
  
  const melina = await prisma.reservation.findMany({
    where: {
      organizationId: 1,
      guestName: { contains: 'Melina Bourdin', mode: 'insensitive' }
    },
    include: { branch: { select: { id: true, name: true } } }
  });
  console.log('Melina Bourdin Gonzalez:', melina.length);
  melina.forEach(r => console.log('  ', JSON.stringify({
    id: r.id,
    guestName: r.guestName,
    lobbyReservationId: r.lobbyReservationId,
    branchId: r.branchId,
    branch: r.branch,
    createdAt: r.createdAt,
    status: r.status,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate
  }, null, 2)));
  
  const manfred = await prisma.reservation.findMany({
    where: {
      organizationId: 1,
      guestName: { contains: 'Manfred Schmidt', mode: 'insensitive' }
    },
    include: { branch: { select: { id: true, name: true } } }
  });
  console.log('\nManfred Schmidt:', manfred.length);
  manfred.forEach(r => console.log('  ', JSON.stringify({
    id: r.id,
    guestName: r.guestName,
    lobbyReservationId: r.lobbyReservationId,
    branchId: r.branchId,
    branch: r.branch,
    createdAt: r.createdAt,
    status: r.status,
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate
  }, null, 2)));
  
  // 3. Prüfe LobbyPMS IDs aus Screenshots
  console.log('\n\n3. LOBBYPMS RESERVATION IDs AUS SCREENSHOTS:');
  console.log('-'.repeat(80));
  const lobbyIds = ['18139169', '18135093', '18137083', '18138648', '18137087'];
  for (const lobbyId of lobbyIds) {
    const res = await prisma.reservation.findMany({
      where: {
        organizationId: 1,
        lobbyReservationId: lobbyId
      },
      include: { branch: { select: { id: true, name: true } } }
    });
    console.log(`LobbyPMS ID ${lobbyId}:`, res.length, 'Reservierungen');
    res.forEach(r => console.log('  ', JSON.stringify({
      id: r.id,
      guestName: r.guestName,
      lobbyReservationId: r.lobbyReservationId,
      branchId: r.branchId,
      branch: r.branch,
      createdAt: r.createdAt
    }, null, 2)));
  }
  
  // 4. Prüfe Branch-Konfiguration
  console.log('\n\n4. BRANCH-KONFIGURATION:');
  console.log('-'.repeat(80));
  const branches = await prisma.branch.findMany({
    where: { organizationId: 1 },
    select: {
      id: true,
      name: true,
      lobbyPmsSettings: true
    }
  });
  branches.forEach(b => {
    const settings = b.lobbyPmsSettings as any;
    console.log(`Branch ${b.id} (${b.name}):`);
    console.log('  lobbyPmsSettings:', settings ? 'vorhanden' : 'NULL');
    if (settings) {
      try {
        const { decryptBranchApiSettings } = require('../src/utils/encryption');
        const decrypted = decryptBranchApiSettings(settings);
        console.log('  apiKey:', decrypted?.apiKey ? 'vorhanden' : 'FEHLT');
        console.log('  syncEnabled:', decrypted?.syncEnabled);
      } catch (e) {
        console.log('  Fehler beim Entschlüsseln:', e.message);
      }
    }
  });
  
  // 5. Prüfe neueste Reservierungen
  console.log('\n\n5. NEUESTE RESERVIERUNGEN (letzte 20):');
  console.log('-'.repeat(80));
  const newest = await prisma.reservation.findMany({
    where: { organizationId: 1 },
    include: { branch: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  newest.forEach(r => {
    console.log(`  ID ${r.id}: ${r.guestName} - Branch: ${r.branch?.name || 'NULL'} (${r.branchId}) - LobbyID: ${r.lobbyReservationId || 'NULL'} - Created: ${r.createdAt.toISOString()}`);
  });
  
  // 6. Prüfe Sync-History
  console.log('\n\n6. SYNC-HISTORY (letzte 10):');
  console.log('-'.repeat(80));
  const syncHistory = await prisma.reservationSyncHistory.findMany({
    orderBy: { syncedAt: 'desc' },
    take: 10
  });
  for (const sh of syncHistory) {
    const reservation = await prisma.reservation.findUnique({
      where: { id: sh.reservationId },
      select: { id: true, guestName: true }
    });
    console.log(`  ${sh.syncedAt.toISOString()}: Reservation ${sh.reservationId} (${reservation?.guestName || 'N/A'}) - Type: ${sh.syncType}`);
  }
  
  await prisma.$disconnect();
}

analyseReservationImport().catch(console.error);

