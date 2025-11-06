#!/usr/bin/env node
/**
 * Fügt das lastUsed Feld zu UsersBranches hinzu
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Füge lastUsed Spalte zu UsersBranches hinzu...');
  
  try {
    await prisma.$executeRaw`
      ALTER TABLE "UsersBranches" 
      ADD COLUMN IF NOT EXISTS "lastUsed" BOOLEAN NOT NULL DEFAULT false;
    `;
    
    console.log('✅ Spalte erfolgreich hinzugefügt!');
    
    // Prisma Client neu generieren
    console.log('🔄 Generiere Prisma Client neu...');
    // Das muss manuell gemacht werden: npx prisma generate
    
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Spalte existiert bereits.');
    } else {
      console.error('❌ Fehler:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

