#!/usr/bin/env node
/**
 * Wendet WhatsApp Branch Migration direkt an
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🚀 Wende WhatsApp Branch Migration an...\n');

    const migrationSQL = readFileSync(
      join(__dirname, '../prisma/migrations/20251114153449_add_whatsapp_branch_support/migration.sql'),
      'utf-8'
    );

    // Teile SQL in einzelne Statements
    // Entferne Kommentare und teile nach Semikolons
    const cleanedSQL = migrationSQL
      .split('\n')
      .map(line => {
        // Entferne Kommentare
        const commentIndex = line.indexOf('--');
        if (commentIndex >= 0) {
          return line.substring(0, commentIndex);
        }
        return line;
      })
      .join('\n');

    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length > 10); // Mindestens 10 Zeichen (um leere zu filtern)

    console.log(`📝 Führe ${statements.length} SQL-Statements aus...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`[${i + 1}/${statements.length}] Führe Statement aus...`);
          await prisma.$executeRawUnsafe(statement);
          console.log(`✅ Statement ${i + 1} erfolgreich\n`);
        } catch (error: any) {
          // Ignoriere Fehler wenn Spalte/Tabelle bereits existiert
          if (error.message?.includes('already exists') || 
              error.message?.includes('duplicate') ||
              error.code === '42P07' || // table already exists
              error.code === '42701') {  // duplicate column
            console.log(`⏭️  Statement ${i + 1} übersprungen (bereits vorhanden)\n`);
          } else {
            console.error(`❌ Fehler bei Statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration erfolgreich angewendet!');

  } catch (error) {
    console.error('❌ Fehler bei Migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

