#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkManilaRooms() {
  try {
    console.log('🔍 Prüfe Reservierungen für Manila (Branch 3)...\n');

    // 1. Prüfe Branch Manila
    const manila = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { id: true, name: true }
    });

    if (!manila) {
      console.error('❌ Branch Manila (ID 3) nicht gefunden!');
      return;
    }

    console.log(`✅ Branch gefunden: ${manila.name} (ID: ${manila.id})\n`);

    // 2. Zähle alle Reservierungen für Manila
    const totalCount = await prisma.reservation.count({
      where: { branchId: 3 }
    });

    console.log(`📊 Gesamtanzahl Reservierungen für Manila: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('❌ KEINE Reservierungen für Manila gefunden!');
      console.log('💡 Lösung: Reservierungen müssen zuerst aus LobbyPMS importiert werden.\n');
      return;
    }

    // 3. Prüfe Reservierungen MIT categoryId und roomNumber
    const withRoomData = await prisma.reservation.count({
      where: {
        branchId: 3,
        categoryId: { not: null },
        roomNumber: { not: null }
      }
    });

    console.log(`✅ Reservierungen MIT categoryId UND roomNumber: ${withRoomData}`);
    console.log(`⚠️  Reservierungen OHNE categoryId oder roomNumber: ${totalCount - withRoomData}\n`);

    // 4. Zeige Beispiele
    const examples = await prisma.reservation.findMany({
      where: {
        branchId: 3,
        categoryId: { not: null },
        roomNumber: { not: null }
      },
      take: 5,
      select: {
        id: true,
        guestName: true,
        categoryId: true,
        roomNumber: true,
        roomDescription: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (examples.length > 0) {
      console.log('📋 Beispiele (neueste 5 Reservierungen mit Zimmer-Daten):');
      examples.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.guestName}`);
        console.log(`   - categoryId: ${r.categoryId}`);
        console.log(`   - roomNumber: ${r.roomNumber}`);
        console.log(`   - roomDescription: ${r.roomDescription || 'N/A'}`);
        console.log(`   - Erstellt: ${r.createdAt.toISOString()}`);
      });
    } else {
      console.log('❌ KEINE Reservierungen mit categoryId UND roomNumber gefunden!');
      console.log('\n💡 Mögliche Ursachen:');
      console.log('   1. Reservierungen wurden importiert, aber ohne categoryId/roomNumber');
      console.log('   2. LobbyPMS API liefert keine categoryId/roomNumber');
      console.log('   3. Import-Script speichert categoryId/roomNumber nicht');
    }

    // 5. Prüfe Reservierungen OHNE categoryId oder roomNumber
    const withoutRoomData = await prisma.reservation.findMany({
      where: {
        branchId: 3,
        OR: [
          { categoryId: null },
          { roomNumber: null }
        ]
      },
      take: 5,
      select: {
        id: true,
        guestName: true,
        categoryId: true,
        roomNumber: true,
        lobbyReservationId: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (withoutRoomData.length > 0) {
      console.log('\n\n⚠️  Beispiele (neueste 5 Reservierungen OHNE vollständige Zimmer-Daten):');
      withoutRoomData.forEach((r, i) => {
        console.log(`\n${i + 1}. ${r.guestName}`);
        console.log(`   - categoryId: ${r.categoryId || 'NULL'}`);
        console.log(`   - roomNumber: ${r.roomNumber || 'NULL'}`);
        console.log(`   - lobbyReservationId: ${r.lobbyReservationId || 'N/A'}`);
        console.log(`   - Erstellt: ${r.createdAt.toISOString()}`);
      });
    }

    console.log('\n\n✅ Analyse abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkManilaRooms();

