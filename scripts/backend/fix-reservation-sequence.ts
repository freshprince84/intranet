#!/usr/bin/env node
/**
 * Fix-Script für Reservation-ID-Sequenz
 * 
 * Repariert die PostgreSQL-Sequenz für Reservation.id, falls sie durch
 * manuelle Imports mit expliziten IDs aus dem Takt geraten ist.
 * 
 * Dieses Script sollte einmalig ausgeführt werden, wenn der Fehler
 * "Unique constraint failed on the fields: ('id')" auftritt.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixReservationSequence() {
  try {
    console.log('🔧 Repariere PostgreSQL-Sequenz für Reservation.id...\n');

    // Hole aktuellen Maximalwert
    const maxIdResult = await prisma.$queryRaw<[{ max: bigint | null }]>`
      SELECT MAX(id) as max FROM "Reservation"
    `;
    const maxId = maxIdResult[0].max;

    if (!maxId || maxId === BigInt(0)) {
      console.log('⚠️  Keine Reservationen gefunden. Setze Sequenz auf 0.');
      await prisma.$executeRaw`SELECT setval('"Reservation_id_seq"', 0, true)`;
      console.log('✅ Sequenz auf 0 gesetzt.\n');
      return;
    }

    console.log(`📊 Aktueller Maximalwert in Tabelle: ${maxId}`);

    // Hole aktuellen Sequenz-Wert
    const currentSeqResult = await prisma.$queryRaw<[{ last_value: bigint }]>`
      SELECT last_value FROM "Reservation_id_seq"
    `;
    const currentSeq = currentSeqResult[0].last_value;

    console.log(`📊 Aktueller Sequenz-Wert: ${currentSeq}`);

    if (currentSeq < maxId) {
      console.log(`\n⚠️  Sequenz ist veraltet! Aktualisiere auf ${maxId}...`);
      await prisma.$executeRaw`SELECT setval('"Reservation_id_seq"', ${maxId}, true)`;
      console.log(`✅ Sequenz erfolgreich auf ${maxId} aktualisiert!\n`);
      console.log('✅ Manuelle Reservierungserstellung und Email-Import sollten jetzt wieder funktionieren.\n');
    } else {
      console.log('\n✅ Sequenz ist bereits synchronisiert. Keine Änderung nötig.\n');
    }
  } catch (error) {
    console.error('❌ Fehler beim Reparieren der Sequenz:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixReservationSequence();

