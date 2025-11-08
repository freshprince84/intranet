// Script zum Prüfen der E-Mail-Konfiguration
import dotenv from 'dotenv';
import path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('📧 E-Mail-Konfiguration prüfen...\n');

// Prüfe SMTP-Konfiguration
console.log('SMTP-Konfiguration:');
console.log('  SMTP_HOST:', process.env.SMTP_HOST || '❌ NICHT GESETZT');
console.log('  SMTP_PORT:', process.env.SMTP_PORT || '❌ NICHT GESETZT');
console.log('  SMTP_USER:', process.env.SMTP_USER || '❌ NICHT GESETZT');
console.log('  SMTP_PASS:', process.env.SMTP_PASS ? '✅ GESETZT' : '❌ NICHT GESETZT');

// Prüfe Mailtrap API-Konfiguration
console.log('\nMailtrap API-Konfiguration:');
console.log('  MAILTRAP_API_TOKEN:', process.env.MAILTRAP_API_TOKEN ? '✅ GESETZT' : '❌ NICHT GESETZT');
console.log('  MAILTRAP_TEST_INBOX_ID:', process.env.MAILTRAP_TEST_INBOX_ID || '❌ NICHT GESETZT');
console.log('  MAILTRAP_TRANSACTIONAL_TOKEN:', process.env.MAILTRAP_TRANSACTIONAL_TOKEN ? '✅ GESETZT' : '❌ NICHT GESETZT');

// Prüfe Frontend URL
console.log('\nFrontend-Konfiguration:');
console.log('  FRONTEND_URL:', process.env.FRONTEND_URL || '❌ NICHT GESETZT (Standard: http://localhost:3000)');

console.log('\n📝 Zusammenfassung:');
const hasSMTP = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
const hasMailtrapAPI = process.env.MAILTRAP_API_TOKEN && process.env.MAILTRAP_TEST_INBOX_ID;

if (hasSMTP) {
  console.log('  ✅ SMTP-Konfiguration vorhanden');
} else {
  console.log('  ❌ SMTP-Konfiguration fehlt');
}

if (hasMailtrapAPI) {
  console.log('  ✅ Mailtrap API-Konfiguration vorhanden');
} else {
  console.log('  ❌ Mailtrap API-Konfiguration fehlt');
}

if (!hasSMTP && !hasMailtrapAPI) {
  console.log('\n⚠️  WARNUNG: Keine E-Mail-Konfiguration gefunden!');
  console.log('   Bitte konfiguriere entweder SMTP oder Mailtrap API in der .env Datei.');
  console.log('   Siehe: backend/EMAIL_SETUP.md');
}

