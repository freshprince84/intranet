/**
 * Script: Prüft DATABASE_URL Connection Pool Einstellungen
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const databaseUrl = process.env.DATABASE_URL;

console.log('🔍 Prüfe DATABASE_URL Connection Pool Einstellungen...\n');
console.log('='.repeat(80));

if (!databaseUrl) {
  console.log('❌ DATABASE_URL ist nicht gesetzt!');
  process.exit(1);
}

console.log('DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@')); // Verstecke Passwort
console.log('');

// Prüfe ob connection_limit vorhanden ist
const hasConnectionLimit = databaseUrl.includes('connection_limit=');
const hasPoolTimeout = databaseUrl.includes('pool_timeout=');

console.log('📊 Connection Pool Einstellungen:');
console.log(`   connection_limit: ${hasConnectionLimit ? '✅ Vorhanden' : '❌ FEHLT!'}`);
console.log(`   pool_timeout: ${hasPoolTimeout ? '✅ Vorhanden' : '❌ FEHLT!'}`);
console.log('');

if (hasConnectionLimit) {
  const match = databaseUrl.match(/connection_limit=(\d+)/);
  const limit = match ? parseInt(match[1]) : null;
  console.log(`   Aktueller Wert: ${limit}`);
  if (limit && limit < 20) {
    console.log(`   ⚠️  WARNUNG: connection_limit=${limit} ist zu niedrig! Empfohlen: 20-30`);
  } else if (limit && limit >= 20) {
    console.log(`   ✅ connection_limit=${limit} ist ausreichend`);
  }
}

if (hasPoolTimeout) {
  const match = databaseUrl.match(/pool_timeout=(\d+)/);
  const timeout = match ? parseInt(match[1]) : null;
  console.log(`   Aktueller Wert: ${timeout}`);
  if (timeout && timeout < 20) {
    console.log(`   ⚠️  WARNUNG: pool_timeout=${timeout} ist zu niedrig! Empfohlen: 20`);
  } else if (timeout && timeout >= 20) {
    console.log(`   ✅ pool_timeout=${timeout} ist ausreichend`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('📋 FAZIT:');
console.log('='.repeat(80));

if (!hasConnectionLimit || !hasPoolTimeout) {
  console.log('🔴 KRITISCH: Connection Pool Einstellungen fehlen!');
  console.log('');
  console.log('Das erklärt:');
  console.log('  - Warum alle APIs nicht funktionieren (DB-Verbindungen blockiert)');
  console.log('  - Warum das System langsam wird (Requests warten auf freie Verbindung)');
  console.log('  - Warum Prisma Connection Pool Timeouts auftreten');
  console.log('');
  console.log('LÖSUNG:');
  console.log('DATABASE_URL muss erweitert werden:');
  console.log('');
  console.log('VORHER:');
  console.log('DATABASE_URL="postgresql://user:password@host:port/database"');
  console.log('');
  console.log('NACHHER:');
  console.log('DATABASE_URL="postgresql://user:password@host:port/database?connection_limit=20&pool_timeout=20"');
  console.log('');
  console.log('⚠️  WICHTIG: Nach Änderung der .env Datei muss der Server neu gestartet werden!');
} else {
  console.log('✅ Connection Pool Einstellungen sind vorhanden');
  console.log('   → Wenn das Problem weiterhin besteht, liegt es woanders');
}









