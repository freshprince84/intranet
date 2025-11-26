/**
 * Script: Prüft ALLE benötigten Environment-Variablen
 * 
 * WICHTIG: Dieses Script prüft, welche Environment-Variablen der Code benötigt
 * und ob sie in der .env Datei vorhanden sind.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Liste aller benötigten Environment-Variablen (aus Code-Analyse)
const requiredEnvVars = [
  // Database
  'DATABASE_URL',
  
  // Encryption
  'ENCRYPTION_KEY',
  
  // JWT
  'JWT_SECRET',
  'JWT_EXPIRATION',
  
  // Server
  'PORT',
  'NODE_ENV',
  
  // Frontend/App URLs
  'FRONTEND_URL',
  'APP_URL',
  
  // OpenAI (für WhatsApp AI)
  'OPENAI_API_KEY',
  
  // Redis (für Queue)
  'REDIS_HOST',
  'REDIS_PORT',
  'REDIS_PASSWORD',
  'REDIS_DB',
  
  // Queue
  'QUEUE_ENABLED',
  'QUEUE_CONCURRENCY',
  
  // Email (optional)
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];

// Optionale Variablen
const optionalEnvVars = [
  'UPLOAD_DIR',
  'MAX_FILE_SIZE',
  'REDIS_PASSWORD', // Kann leer sein
];

async function checkAllEnvVars() {
  try {
    console.log('🔍 Prüfe ALLE benötigten Environment-Variablen...\n');
    console.log('='.repeat(80));
    
    // 1. Prüfe ob .env Datei existiert
    const envPath = path.join(__dirname, '../.env');
    console.log(`\n1️⃣ Prüfe .env Datei: ${envPath}`);
    
    if (!fs.existsSync(envPath)) {
      console.log('❌ .env Datei existiert NICHT!');
      console.log('⚠️ KRITISCH: Alle APIs werden nicht funktionieren!');
      return;
    }
    
    console.log('✅ .env Datei existiert');
    
    // 2. Lade .env Datei
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envLines = envContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#'));
    
    console.log(`   Anzahl Zeilen: ${envLines.length}`);
    console.log('');
    
    // 3. Prüfe jede benötigte Variable
    console.log('2️⃣ Prüfe benötigte Environment-Variablen:\n');
    
    const missing: string[] = [];
    const present: string[] = [];
    const empty: string[] = [];
    
    for (const varName of requiredEnvVars) {
      const value = process.env[varName];
      
      if (value === undefined) {
        missing.push(varName);
        console.log(`❌ ${varName}: FEHLT`);
      } else if (value.trim() === '') {
        empty.push(varName);
        console.log(`⚠️  ${varName}: VORHANDEN aber LEER`);
      } else {
        present.push(varName);
        // Zeige nur ersten Teil des Werts (für Sicherheit)
        const displayValue = varName.includes('KEY') || varName.includes('SECRET') || varName.includes('PASS') || varName.includes('URL')
          ? `${value.substring(0, 20)}... (Länge: ${value.length})`
          : value;
        console.log(`✅ ${varName}: ${displayValue}`);
      }
    }
    
    console.log('');
    console.log('='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG:');
    console.log('='.repeat(80));
    console.log(`✅ Vorhanden: ${present.length}/${requiredEnvVars.length}`);
    console.log(`❌ Fehlend: ${missing.length}`);
    console.log(`⚠️  Leer: ${empty.length}`);
    console.log('');
    
    // 4. Kritische Variablen prüfen
    console.log('3️⃣ Kritische Variablen für APIs:\n');
    
    const criticalVars = ['DATABASE_URL', 'ENCRYPTION_KEY', 'JWT_SECRET'];
    let criticalMissing = false;
    
    for (const varName of criticalVars) {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        console.log(`🔴 ${varName}: FEHLT oder LEER → ALLE APIs werden nicht funktionieren!`);
        criticalMissing = true;
      } else {
        console.log(`✅ ${varName}: Vorhanden`);
      }
    }
    
    console.log('');
    
    // 5. API-spezifische Variablen
    console.log('4️⃣ API-spezifische Variablen:\n');
    
    // Bold Payment: Keine spezifischen Env-Vars (Settings in DB)
    console.log('Bold Payment: Settings in DB (keine Env-Vars benötigt)');
    
    // TTLock: Keine spezifischen Env-Vars (Settings in DB)
    console.log('TTLock: Settings in DB (keine Env-Vars benötigt)');
    
    // WhatsApp: Keine spezifischen Env-Vars (Settings in DB)
    console.log('WhatsApp: Settings in DB (keine Env-Vars benötigt)');
    
    // OpenAI (für WhatsApp AI)
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey || openaiKey.trim() === '') {
      console.log('⚠️  OPENAI_API_KEY: FEHLT → WhatsApp AI wird nicht funktionieren');
    } else {
      console.log('✅ OPENAI_API_KEY: Vorhanden');
    }
    
    console.log('');
    
    // 6. Fazit
    console.log('='.repeat(80));
    console.log('📋 FAZIT:');
    console.log('='.repeat(80));
    
    if (criticalMissing) {
      console.log('🔴 KRITISCH: Mindestens eine kritische Variable fehlt!');
      console.log('   → ALLE APIs werden nicht funktionieren!');
      console.log('   → Server muss neu gestartet werden nach .env-Update!');
    } else if (missing.length > 0) {
      console.log('⚠️  WARNUNG: Einige Variablen fehlen, aber kritische sind vorhanden.');
      console.log('   → APIs sollten grundsätzlich funktionieren.');
      console.log('   → Fehlende Features werden nicht funktionieren.');
    } else {
      console.log('✅ Alle benötigten Variablen sind vorhanden!');
      console.log('   → Wenn APIs trotzdem nicht funktionieren, liegt das Problem woanders.');
    }
    
    // 7. Zeige fehlende Variablen
    if (missing.length > 0) {
      console.log('');
      console.log('❌ Fehlende Variablen:');
      for (const varName of missing) {
        console.log(`   - ${varName}`);
      }
    }
    
    if (empty.length > 0) {
      console.log('');
      console.log('⚠️  Leere Variablen:');
      for (const varName of empty) {
        console.log(`   - ${varName}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  }
}

checkAllEnvVars()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

