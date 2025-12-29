#!/usr/bin/env ts-node
/**
 * Prüft, ob die Branch-Spalten address, city, country existieren
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkColumns() {
  try {
    console.log('🔍 Prüfe Branch-Spalten in der Datenbank...\n');

    // Prüfe, ob die Spalten existieren
    const result = await prisma.$queryRaw<Array<{ column_name: string; data_type: string }>>`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Branch' 
      AND column_name IN ('address', 'city', 'country')
      ORDER BY column_name;
    `;

    console.log(`✅ Gefundene Spalten: ${result.length}`);
    result.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    if (result.length === 3) {
      console.log('\n✅ Alle Spalten existieren in der Datenbank!');
      console.log('⚠️  Problem: Prisma Client muss neu generiert werden.');
      console.log('   Lösung: Server stoppen → npx prisma generate → Server starten');
    } else {
      console.log('\n❌ Fehlende Spalten!');
      console.log('   Erwartet: address, city, country');
      console.log('   Gefunden:', result.map(r => r.column_name).join(', ') || 'keine');
      console.log('\n   Lösung: Migration ausführen: npx prisma migrate deploy');
    }

    // Prüfe Migration-Status
    console.log('\n📋 Prüfe Migration-Status...');
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; applied_steps_count: number }>>`
      SELECT migration_name, applied_steps_count 
      FROM "_prisma_migrations" 
      WHERE migration_name LIKE '%branch_address%'
      ORDER BY finished_at DESC
      LIMIT 1;
    `;

    if (migrations.length > 0) {
      console.log(`✅ Migration gefunden: ${migrations[0].migration_name}`);
      console.log(`   Applied steps: ${migrations[0].applied_steps_count}`);
    } else {
      console.log('⚠️  Keine Branch-Address-Migration in der Datenbank gefunden');
    }

  } catch (error: any) {
    console.error('❌ Fehler beim Prüfen:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();

