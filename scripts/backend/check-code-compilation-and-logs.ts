/**
 * Script: Prüft ob Code kompiliert wurde und Debug-Logs vorhanden sind
 * 
 * ZIEL: Prüfen ob der Code-Pfad erreicht wird und Debug-Logs ausgeführt werden
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

console.log('🔍 Prüfe Code-Kompilierung und Debug-Logs...\n');

async function checkCodeCompilation() {
  try {
    // 1. Prüfe ob dist/services/boldPaymentService.js existiert
    console.log('📋 1. Prüfe ob Code kompiliert wurde...\n');
    
    const distPath = path.join(__dirname, '../dist/services/boldPaymentService.js');
    const distExists = fs.existsSync(distPath);
    
    if (!distExists) {
      console.log('❌ PROBLEM: dist/services/boldPaymentService.js existiert nicht!');
      console.log('   → Code wurde nicht kompiliert!');
      console.log('   → Lösung: npm run build ausführen\n');
      return;
    }
    
    console.log('✅ dist/services/boldPaymentService.js existiert\n');
    
    // 2. Prüfe ob Debug-Logs im kompilierten Code sind
    console.log('📋 2. Prüfe ob Debug-Logs im kompilierten Code sind...\n');
    
    const distContent = fs.readFileSync(distPath, 'utf-8');
    
    const debugLogs = [
      'merchantId Wert',
      'merchantId Länge',
      'Authorization Header',
      'Header Länge',
      'Full Headers'
    ];
    
    const foundLogs: string[] = [];
    const missingLogs: string[] = [];
    
    debugLogs.forEach(log => {
      if (distContent.includes(log)) {
        foundLogs.push(log);
      } else {
        missingLogs.push(log);
      }
    });
    
    console.log(`✅ Gefundene Debug-Logs: ${foundLogs.length}/${debugLogs.length}`);
    if (foundLogs.length > 0) {
      console.log('   Gefunden:');
      foundLogs.forEach(log => console.log(`     - ${log}`));
    }
    
    if (missingLogs.length > 0) {
      console.log(`\n❌ Fehlende Debug-Logs: ${missingLogs.length}`);
      console.log('   Fehlt:');
      missingLogs.forEach(log => console.log(`     - ${log}`));
      console.log('\n⚠️ PROBLEM: Debug-Logs sind nicht im kompilierten Code!');
      console.log('   → Code muss neu kompiliert werden!');
      console.log('   → Lösung: npm run build ausführen\n');
    } else {
      console.log('\n✅ Alle Debug-Logs sind im kompilierten Code vorhanden!\n');
    }
    
    // 3. Prüfe ob Request-Interceptor im Code ist
    console.log('📋 3. Prüfe ob Request-Interceptor im Code ist...\n');
    
    const interceptorPatterns = [
      'interceptors.request.use',
      'config.headers.Authorization',
      'x-api-key'
    ];
    
    const foundPatterns: string[] = [];
    const missingPatterns: string[] = [];
    
    interceptorPatterns.forEach(pattern => {
      if (distContent.includes(pattern)) {
        foundPatterns.push(pattern);
      } else {
        missingPatterns.push(pattern);
      }
    });
    
    console.log(`✅ Gefundene Interceptor-Patterns: ${foundPatterns.length}/${interceptorPatterns.length}`);
    if (foundPatterns.length > 0) {
      console.log('   Gefunden:');
      foundPatterns.forEach(pattern => console.log(`     - ${pattern}`));
    }
    
    if (missingPatterns.length > 0) {
      console.log(`\n❌ Fehlende Interceptor-Patterns: ${missingPatterns.length}`);
      console.log('   Fehlt:');
      missingPatterns.forEach(pattern => console.log(`     - ${pattern}`));
      console.log('\n⚠️ PROBLEM: Request-Interceptor ist nicht im kompilierten Code!');
    } else {
      console.log('\n✅ Request-Interceptor ist im kompilierten Code vorhanden!\n');
    }
    
    // 4. Prüfe PM2 Status
    console.log('📋 4. Prüfe PM2 Status...\n');
    
    try {
      const { stdout: pm2Status } = await execAsync('pm2 list');
      console.log('PM2 Status:');
      console.log(pm2Status);
      
      if (pm2Status.includes('intranet-backend')) {
        const isOnline = pm2Status.includes('online');
        const isErrored = pm2Status.includes('errored');
        
        if (isOnline) {
          console.log('\n✅ PM2 Prozess läuft (online)');
        } else if (isErrored) {
          console.log('\n❌ PM2 Prozess ist im Fehlerzustand (errored)');
        } else {
          console.log('\n⚠️ PM2 Prozess Status unbekannt');
        }
      } else {
        console.log('\n❌ PROBLEM: intranet-backend Prozess nicht gefunden!');
      }
    } catch (error) {
      console.log('⚠️ Konnte PM2 Status nicht prüfen:', error);
    }
    
    // 5. Prüfe ob Bold Payment Logs in PM2 erscheinen
    console.log('\n📋 5. Prüfe ob Bold Payment Logs in PM2 erscheinen...\n');
    
    try {
      const { stdout: pm2Logs } = await execAsync(
        'pm2 logs intranet-backend --lines 100 --nostream'
      );
      
      const boldPaymentPatterns = [
        '\\[Bold Payment\\]',
        'Bold Payment',
        'boldPayment'
      ];
      
      const foundBoldPaymentLogs: string[] = [];
      
      pm2Logs.split('\n').forEach(line => {
        boldPaymentPatterns.forEach(pattern => {
          if (new RegExp(pattern, 'i').test(line)) {
            foundBoldPaymentLogs.push(line.trim());
          }
        });
      });
      
      if (foundBoldPaymentLogs.length > 0) {
        console.log(`✅ Gefundene Bold Payment Logs: ${foundBoldPaymentLogs.length}`);
        console.log('\nLetzte 5 Logs:');
        foundBoldPaymentLogs.slice(-5).forEach((log, idx) => {
          console.log(`  ${idx + 1}. ${log.substring(0, 150)}...`);
        });
      } else {
        console.log('⚠️ Keine Bold Payment Logs gefunden!');
        console.log('   → Request-Interceptor wird möglicherweise nicht ausgeführt');
        console.log('   → Oder Logs werden nicht geschrieben');
      }
    } catch (error) {
      console.log('⚠️ Konnte PM2 Logs nicht prüfen:', error);
    }
    
    // 6. FAZIT
    console.log('\n\n📋 FAZIT:\n');
    
    if (missingLogs.length > 0) {
      console.log('🔴 PROBLEM: Code wurde nicht neu kompiliert!');
      console.log('   → Debug-Logs fehlen im kompilierten Code');
      console.log('   → Lösung: npm run build ausführen');
      console.log('   → Dann: pm2 restart intranet-backend\n');
    } else if (missingPatterns.length > 0) {
      console.log('🔴 PROBLEM: Request-Interceptor fehlt im kompilierten Code!');
      console.log('   → Code muss neu kompiliert werden');
      console.log('   → Lösung: npm run build ausführen\n');
    } else {
      console.log('✅ Code ist kompiliert und Debug-Logs sind vorhanden');
      console.log('   → Wenn trotzdem keine Logs erscheinen:');
      console.log('     1. Request-Interceptor wird nicht ausgeführt');
      console.log('     2. Logs werden nicht geschrieben');
      console.log('     3. Code-Pfad wird nicht erreicht\n');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Prüfen:', error);
  }
}

// Führe Prüfung aus
checkCodeCompilation().catch(console.error);

