import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Lade .env Datei
const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('🔍 Prüfe ENCRYPTION_KEY Konfiguration...\n');

// 1. Prüfe ob .env Datei existiert
if (!fs.existsSync(envPath)) {
  console.log('❌ .env Datei nicht gefunden!');
  console.log(`   Erwarteter Pfad: ${envPath}`);
  process.exit(1);
}

console.log(`✅ .env Datei gefunden: ${envPath}\n`);

// 2. Prüfe ob ENCRYPTION_KEY in .env gesetzt ist
const encryptionKey = process.env.ENCRYPTION_KEY;

if (!encryptionKey) {
  console.log('❌ ENCRYPTION_KEY ist NICHT in .env gesetzt!');
  console.log('');
  console.log('⚠️  WICHTIG: API-Keys werden unverschlüsselt gespeichert!');
  console.log('');
  console.log('💡 Lösung:');
  console.log('   1. Generiere einen neuen ENCRYPTION_KEY:');
  console.log('      node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.log('   2. Füge ihn in .env ein:');
  console.log('      ENCRYPTION_KEY=<generierter_key>');
  console.log('   3. Starte den Server neu');
  process.exit(1);
}

console.log('✅ ENCRYPTION_KEY ist gesetzt');

// 3. Prüfe Key-Länge (sollte 64 Zeichen sein = 32 bytes hex)
if (encryptionKey.length !== 64) {
  console.log(`⚠️  WARNUNG: ENCRYPTION_KEY hat falsche Länge!`);
  console.log(`   Aktuelle Länge: ${encryptionKey.length} Zeichen`);
  console.log(`   Erwartete Länge: 64 Zeichen (32 bytes hex)`);
  console.log('');
  console.log('💡 Lösung: Generiere einen neuen Key mit korrekter Länge');
  process.exit(1);
}

console.log(`✅ ENCRYPTION_KEY Länge korrekt: ${encryptionKey.length} Zeichen`);

// 4. Prüfe ob Key gültiges Hex ist
if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
  console.log('⚠️  WARNUNG: ENCRYPTION_KEY enthält ungültige Zeichen!');
  console.log('   Key sollte nur hexadezimale Zeichen (0-9, a-f, A-F) enthalten');
  process.exit(1);
}

console.log('✅ ENCRYPTION_KEY Format korrekt (hex)');
console.log(`   Key Vorschau: ${encryptionKey.substring(0, 20)}...${encryptionKey.substring(44)}`);

console.log('');
console.log('✅ ENCRYPTION_KEY ist korrekt konfiguriert!');
console.log('   API-Keys werden verschlüsselt gespeichert.');

