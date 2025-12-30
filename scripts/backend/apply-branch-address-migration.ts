#!/usr/bin/env ts-node
/**
 * Wendet die Branch Address Migration manuell an
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🚀 Wende Branch Address Migration an...\n');

    const migrationPath = join(__dirname, '../prisma/migrations/20250203000000_add_branch_address_and_fix_ota_listings/migration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Teile SQL in einzelne Statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Führe ${statements.length} SQL-Statements aus...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim() && statement.length > 10) {
        try {
          console.log(`[${i + 1}/${statements.length}] Führe Statement aus...`);
          // Entferne Kommentare aus dem Statement
          const cleanStatement = statement
            .split('\n')
            .map(line => {
              const commentIndex = line.indexOf('--');
              return commentIndex >= 0 ? line.substring(0, commentIndex).trim() : line.trim();
            })
            .filter(line => line.length > 0)
            .join(' ');

          if (cleanStatement.length > 0) {
            await prisma.$executeRawUnsafe(cleanStatement);
            console.log(`✅ Statement ${i + 1} erfolgreich\n`);
          } else {
            console.log(`⏭️  Statement ${i + 1} übersprungen (leer)\n`);
          }
        } catch (error: any) {
          // Ignoriere Fehler wenn Spalte bereits existiert
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate') ||
              error.message?.includes('does not exist') && error.message?.includes('DROP') ||
              error.code === '42P07' || // table already exists
              error.code === '42701') {  // duplicate column
            console.log(`⏭️  Statement ${i + 1} übersprungen (${error.message?.substring(0, 50)}...)\n`);
          } else {
            console.error(`❌ Fehler bei Statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration erfolgreich angewendet!');
    console.log('\n🔧 Bitte führe jetzt aus: npx prisma generate');

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

