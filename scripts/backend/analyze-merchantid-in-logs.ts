/**
 * Script: Analysiert Server-Logs auf merchantId-Werte
 * 
 * ZIEL: Prüfen ob merchantId wirklich einen Wert hat, wenn Request gesendet wird
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔍 Analysiere Server-Logs auf merchantId-Werte...\n');

async function analyzeLogs() {
  try {
    // 1. Prüfe PM2-Logs auf merchantId-Werte
    console.log('📋 1. Prüfe PM2-Logs auf merchantId-Werte...\n');
    
    const { stdout: pm2Logs } = await execAsync(
      'pm2 logs intranet-backend --lines 1000 --nostream'
    );
    
    // Suche nach merchantId-bezogenen Logs
    const merchantIdPatterns = [
      /merchantId Wert[:"\s]+([^\s"']+)/gi,
      /merchantId Länge[:\s]+(\d+)/gi,
      /Authorization Header[:\s]+([^\n]+)/gi,
      /\[Bold Payment\].*merchantId/gi,
      /Fehler beim Laden.*merchantId/gi,
    ];
    
    const foundEntries: Array<{ type: string; value: string; line: string }> = [];
    
    pm2Logs.split('\n').forEach((line, index) => {
      merchantIdPatterns.forEach(pattern => {
        const matches = line.match(pattern);
        if (matches) {
          foundEntries.push({
            type: pattern.source,
            value: matches[1] || matches[0],
            line: line.trim()
          });
        }
      });
    });
    
    console.log(`✅ Gefundene merchantId-Einträge: ${foundEntries.length}\n`);
    
    if (foundEntries.length > 0) {
      console.log('📋 Letzte 20 Einträge:\n');
      foundEntries.slice(-20).forEach((entry, idx) => {
        console.log(`${idx + 1}. [${entry.type}] ${entry.value}`);
        console.log(`   ${entry.line.substring(0, 150)}...\n`);
      });
    } else {
      console.log('⚠️ Keine merchantId-Einträge gefunden!\n');
    }
    
    // 2. Prüfe auf Authorization Header
    console.log('\n📋 2. Prüfe Authorization Header in Logs...\n');
    
    const authHeaderPattern = /Authorization Header[:\s]+([^\n]+)/gi;
    const authHeaders: string[] = [];
    
    pm2Logs.split('\n').forEach(line => {
      const matches = line.match(authHeaderPattern);
      if (matches) {
        authHeaders.push(matches[1].trim());
      }
    });
    
    console.log(`✅ Gefundene Authorization Header: ${authHeaders.length}\n`);
    
    if (authHeaders.length > 0) {
      console.log('📋 Letzte 10 Authorization Header:\n');
      authHeaders.slice(-10).forEach((header, idx) => {
        console.log(`${idx + 1}. ${header}`);
        console.log(`   Länge: ${header.length}`);
        console.log(`   Enthält "x-api-key": ${header.includes('x-api-key')}`);
        console.log(`   Enthält ":" (verschlüsselt?): ${header.includes(':')}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Keine Authorization Header gefunden!\n');
    }
    
    // 3. Prüfe auf Fehler beim Laden
    console.log('\n📋 3. Prüfe auf Fehler beim Laden...\n');
    
    const errorPatterns = [
      /Fehler beim Laden.*merchantId/gi,
      /Error.*merchantId/gi,
      /merchantId.*fehlt/gi,
      /merchantId.*undefined/gi,
      /merchantId.*null/gi,
    ];
    
    const errors: string[] = [];
    
    pm2Logs.split('\n').forEach(line => {
      errorPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          errors.push(line.trim());
        }
      });
    });
    
    console.log(`✅ Gefundene Fehler: ${errors.length}\n`);
    
    if (errors.length > 0) {
      console.log('📋 Letzte 10 Fehler:\n');
      errors.slice(-10).forEach((error, idx) => {
        console.log(`${idx + 1}. ${error}\n`);
      });
    } else {
      console.log('✅ Keine Fehler gefunden!\n');
    }
    
    // 4. Prüfe auf 403 Forbidden Fehler
    console.log('\n📋 4. Prüfe auf 403 Forbidden Fehler...\n');
    
    const forbiddenPattern = /403|Forbidden|Missing Authentication Token/gi;
    const forbiddenErrors: string[] = [];
    
    pm2Logs.split('\n').forEach(line => {
      if (forbiddenPattern.test(line)) {
        forbiddenErrors.push(line.trim());
      }
    });
    
    console.log(`✅ Gefundene 403-Fehler: ${forbiddenErrors.length}\n`);
    
    if (forbiddenErrors.length > 0) {
      console.log('📋 Letzte 10 403-Fehler:\n');
      forbiddenErrors.slice(-10).forEach((error, idx) => {
        console.log(`${idx + 1}. ${error}\n`);
      });
    } else {
      console.log('✅ Keine 403-Fehler gefunden!\n');
    }
    
    // 5. Korrelation: merchantId vs. 403-Fehler
    console.log('\n📋 5. Korrelation: merchantId vs. 403-Fehler...\n');
    
    // Finde Zeitstempel von merchantId-Logs und 403-Fehlern
    const merchantIdTimestamps: Array<{ time: string; value: string }> = [];
    const forbiddenTimestamps: Array<{ time: string; error: string }> = [];
    
    pm2Logs.split('\n').forEach(line => {
      // Extrahiere Zeitstempel (PM2-Log-Format)
      const timeMatch = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
      const time = timeMatch ? timeMatch[1] : 'unknown';
      
      if (/merchantId Wert/.test(line)) {
        const valueMatch = line.match(/merchantId Wert[:"\s]+([^\s"']+)/);
        if (valueMatch) {
          merchantIdTimestamps.push({
            time,
            value: valueMatch[1]
          });
        }
      }
      
      if (/403|Forbidden/.test(line)) {
        forbiddenTimestamps.push({
          time,
          error: line.trim()
        });
      }
    });
    
    console.log(`✅ merchantId-Logs: ${merchantIdTimestamps.length}`);
    console.log(`✅ 403-Fehler: ${forbiddenTimestamps.length}\n`);
    
    if (merchantIdTimestamps.length > 0 && forbiddenTimestamps.length > 0) {
      console.log('📋 Zeitliche Korrelation:\n');
      console.log('Letzte merchantId-Logs:');
      merchantIdTimestamps.slice(-5).forEach((entry, idx) => {
        console.log(`  ${idx + 1}. ${entry.time}: ${entry.value}`);
      });
      console.log('\nLetzte 403-Fehler:');
      forbiddenTimestamps.slice(-5).forEach((entry, idx) => {
        console.log(`  ${idx + 1}. ${entry.time}: ${entry.error.substring(0, 100)}...`);
      });
    }
    
    // 6. FAZIT
    console.log('\n\n📋 FAZIT:\n');
    
    if (merchantIdTimestamps.length === 0) {
      console.log('⚠️ PROBLEM: Keine merchantId-Logs gefunden!');
      console.log('   → merchantId wird möglicherweise nicht geloggt oder nicht gesetzt\n');
    } else {
      const lastMerchantId = merchantIdTimestamps[merchantIdTimestamps.length - 1];
      console.log(`✅ Letzte merchantId: ${lastMerchantId.value}`);
      console.log(`   Zeit: ${lastMerchantId.time}`);
      console.log(`   Länge: ${lastMerchantId.value.length}`);
      console.log(`   Enthält ":" (verschlüsselt?): ${lastMerchantId.value.includes(':')}`);
      
      if (lastMerchantId.value.includes(':')) {
        console.log('\n🔴 PROBLEM GEFUNDEN: merchantId ist noch verschlüsselt!');
        console.log('   → merchantId sollte entschlüsselt sein, enthält aber noch ":"');
        console.log('   → Das bedeutet: decryptBranchApiSettings() funktioniert nicht korrekt!');
      } else {
        console.log('\n✅ merchantId scheint entschlüsselt zu sein');
      }
    }
    
    if (forbiddenTimestamps.length > 0) {
      console.log(`\n⚠️ ${forbiddenTimestamps.length} 403-Fehler gefunden`);
      console.log('   → API gibt 403 Forbidden zurück');
      console.log('   → Mögliche Ursachen:');
      console.log('     1. merchantId ist falsch/verschlüsselt');
      console.log('     2. Header wird nicht korrekt gesendet');
      console.log('     3. API-Key ist ungültig');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Analysieren der Logs:', error);
  }
}

// Führe Analyse aus
analyzeLogs().catch(console.error);

