#!/usr/bin/env ts-node

/**
 * Script: Prüft Connection Pool Einstellungen und Status
 * 
 * Prüft:
 * 1. DATABASE_URL Connection Pool Parameter
 * 2. Aktuelle Prisma Connection Pool Status
 * 3. Empfohlene Einstellungen
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Lade Environment-Variablen
dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Prüfe Connection Pool Einstellungen und Status...\n');

if (!databaseUrl) {
  console.error('❌ DATABASE_URL ist nicht gesetzt!');
  process.exit(1);
}

// Verstecke Passwort in der Ausgabe
const maskedUrl = databaseUrl.replace(/:[^:@]+@/, ':****@');
console.log('DATABASE_URL:', maskedUrl);
console.log('');

// 1. Prüfe DATABASE_URL Parameter
console.log('📋 1. DATABASE_URL Connection Pool Parameter:');
console.log('─'.repeat(60));

const hasConnectionLimit = databaseUrl.includes('connection_limit=');
const hasPoolTimeout = databaseUrl.includes('pool_timeout=');

if (hasConnectionLimit) {
  const match = databaseUrl.match(/connection_limit=(\d+)/);
  if (match) {
    const limit = parseInt(match[1], 10);
    if (limit < 10) {
      console.log(`   ⚠️  WARNUNG: connection_limit=${limit} ist zu niedrig! Empfohlen: 20-30`);
    } else if (limit < 20) {
      console.log(`   ⚠️  WARNUNG: connection_limit=${limit} ist niedrig. Empfohlen: 20-30`);
    } else {
      console.log(`   ✅ connection_limit=${limit} ist ausreichend`);
    }
  }
} else {
  console.log('   ❌ connection_limit: FEHLT! (Standard: 5)');
  console.log('   ⚠️  KRITISCH: Nur 5 Verbindungen erlaubt!');
}

if (hasPoolTimeout) {
  const match = databaseUrl.match(/pool_timeout=(\d+)/);
  if (match) {
    const timeout = parseInt(match[1], 10);
    if (timeout < 10) {
      console.log(`   ⚠️  WARNUNG: pool_timeout=${timeout} ist zu niedrig! Empfohlen: 20`);
    } else {
      console.log(`   ✅ pool_timeout=${timeout} ist ausreichend`);
    }
  }
} else {
  console.log('   ❌ pool_timeout: FEHLT! (Standard: 10 Sekunden)');
  console.log('   ⚠️  KRITISCH: Nur 10 Sekunden Timeout!');
}

console.log('');

// 2. Prüfe Prisma Connection Pool Status
console.log('📋 2. Prisma Connection Pool Status:');
console.log('─'.repeat(60));

async function checkPrismaConnectionPool() {
  const prisma = new PrismaClient({
    log: ['error'],
  });

  try {
    // Teste Verbindung
    await prisma.$connect();
    console.log('   ✅ Prisma Client verbunden');

    // Prisma gibt keine direkte API für Connection Pool Status
    // Aber wir können die DATABASE_URL Parameter prüfen
    const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
    const connectionLimit = url.searchParams.get('connection_limit');
    const poolTimeout = url.searchParams.get('pool_timeout');

    if (connectionLimit) {
      console.log(`   ✅ Connection Limit: ${connectionLimit}`);
    } else {
      console.log('   ⚠️  Connection Limit: Nicht in DATABASE_URL (Standard: 5)');
    }

    if (poolTimeout) {
      console.log(`   ✅ Pool Timeout: ${poolTimeout} Sekunden`);
    } else {
      console.log('   ⚠️  Pool Timeout: Nicht in DATABASE_URL (Standard: 10 Sekunden)');
    }

    // Teste einfache Query
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const queryTime = Date.now() - startTime;
    console.log(`   ✅ Test-Query erfolgreich (${queryTime}ms)`);

  } catch (error) {
    console.error('   ❌ Fehler beim Prüfen der Verbindung:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 3. Empfehlungen
console.log('');
console.log('📋 3. Empfehlungen:');
console.log('─'.repeat(60));

if (!hasConnectionLimit || !hasPoolTimeout) {
  console.log('   ⚠️  KRITISCH: Connection Pool Parameter fehlen!');
  console.log('');
  console.log('   DATABASE_URL muss erweitert werden:');
  console.log('');
  
  // Extrahiere Basis-URL
  const urlMatch = databaseUrl.match(/^(postgresql:\/\/[^?]+)/);
  if (urlMatch) {
    const baseUrl = urlMatch[1];
    const hasSchema = databaseUrl.includes('schema=');
    const separator = hasSchema ? '&' : '?';
    
    console.log(`   Aktuell: ${maskedUrl}`);
    console.log('');
    console.log(`   Empfohlen: ${baseUrl}${separator}connection_limit=20&pool_timeout=20`);
    console.log('');
    console.log('   Oder wenn schema=public bereits vorhanden:');
    console.log(`   ${maskedUrl}&connection_limit=20&pool_timeout=20`);
  } else {
    console.log('   DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20"');
  }
  
  console.log('');
  console.log('   Nach Änderung:');
  console.log('   1. Server neu starten (pm2 restart intranet-backend)');
  console.log('   2. Dieses Script erneut ausführen');
} else {
  console.log('   ✅ Connection Pool Parameter sind vorhanden');
  console.log('   ⚠️  Falls Probleme bestehen, prüfe:');
  console.log('      - Server-Logs auf Connection Pool Timeouts');
  console.log('      - Anzahl gleichzeitiger Requests');
  console.log('      - DB-Server Last');
}

console.log('');

// Führe Prisma-Check aus
checkPrismaConnectionPool()
  .then(() => {
    console.log('');
    console.log('✅ Prüfung abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fehler bei der Prüfung:', error);
    process.exit(1);
  });

