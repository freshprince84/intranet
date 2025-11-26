/**
 * Script: Diagnostiziert warum Request-Interceptor nicht ausgeführt wird
 * 
 * ZIEL: Finden warum der Request-Interceptor nicht ausgeführt wird, obwohl Code kompiliert ist
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

console.log('🔍 Diagnostiziere Request-Interceptor-Problem...\n');

async function diagnose() {
  try {
    // 1. Prüfe ob createPaymentLink() aufgerufen wird
    console.log('📋 1. Prüfe ob createPaymentLink() aufgerufen wird...\n');
    
    const { stdout: createPaymentLinkLogs } = await execAsync(
      'pm2 logs intranet-backend --lines 500 --nostream'
    );
    
    const createPaymentLinkPatterns = [
      'createPaymentLink',
      'Erstelle Payment-Link',
      'Payment-Link',
      '\\[Bold Payment\\] Payload',
      'ReservationNotification.*Payment-Link',
      'BoldPaymentService.*createPaymentLink'
    ];
    
    const foundCreatePaymentLink: string[] = [];
    
    createPaymentLinkLogs.split('\n').forEach(line => {
      createPaymentLinkPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(line)) {
          foundCreatePaymentLink.push(line.trim());
        }
      });
    });
    
    if (foundCreatePaymentLink.length > 0) {
      console.log(`✅ Gefundene createPaymentLink-Aufrufe: ${foundCreatePaymentLink.length}`);
      console.log('\nLetzte 10 Einträge:');
      foundCreatePaymentLink.slice(-10).forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ PROBLEM: createPaymentLink() wird NICHT aufgerufen!');
      console.log('   → Keine Logs für createPaymentLink gefunden');
      console.log('   → Mögliche Ursachen:');
      console.log('     1. createPaymentLink() wird nicht aufgerufen');
      console.log('     2. Logs werden nicht geschrieben');
      console.log('     3. Code-Pfad wird nicht erreicht');
    }
    
    // 2. Prüfe ob loadSettings() aufgerufen wird
    console.log('\n\n📋 2. Prüfe ob loadSettings() aufgerufen wird...\n');
    
    const loadSettingsPatterns = [
      'loadSettings',
      'Verwende Branch-spezifische',
      'Bold Payment Settings',
      'BoldPayment.*Settings',
      'decryptBranchApiSettings',
      'decryptApiSettings'
    ];
    
    const foundLoadSettings: string[] = [];
    
    createPaymentLinkLogs.split('\n').forEach(line => {
      loadSettingsPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(line)) {
          foundLoadSettings.push(line.trim());
        }
      });
    });
    
    if (foundLoadSettings.length > 0) {
      console.log(`✅ Gefundene loadSettings-Aufrufe: ${foundLoadSettings.length}`);
      console.log('\nLetzte 10 Einträge:');
      foundLoadSettings.slice(-10).forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ PROBLEM: loadSettings() wird NICHT aufgerufen!');
      console.log('   → Keine Logs für loadSettings gefunden');
      console.log('   → Mögliche Ursachen:');
      console.log('     1. loadSettings() wird nicht aufgerufen');
      console.log('     2. Settings sind bereits geladen (merchantId ist gesetzt)');
      console.log('     3. Code-Pfad wird nicht erreicht');
    }
    
    // 3. Prüfe ob createAxiosInstance() aufgerufen wird
    console.log('\n\n📋 3. Prüfe ob createAxiosInstance() aufgerufen wird...\n');
    
    const distPath = path.join(__dirname, '../dist/services/boldPaymentService.js');
    if (fs.existsSync(distPath)) {
      const distContent = fs.readFileSync(distPath, 'utf-8');
      
      // Prüfe ob createAxiosInstance im Code ist
      const hasCreateAxiosInstance = distContent.includes('createAxiosInstance');
      const hasAxiosInstanceAssignment = distContent.includes('this.axiosInstance = this.createAxiosInstance()');
      const hasInterceptorRegistration = distContent.includes('interceptors.request.use');
      
      console.log(`✅ createAxiosInstance() im Code: ${hasCreateAxiosInstance}`);
      console.log(`✅ this.axiosInstance = this.createAxiosInstance(): ${hasAxiosInstanceAssignment}`);
      console.log(`✅ interceptors.request.use im Code: ${hasInterceptorRegistration}`);
      
      if (!hasAxiosInstanceAssignment) {
        console.log('\n⚠️ PROBLEM: this.axiosInstance = this.createAxiosInstance() nicht gefunden!');
        console.log('   → createAxiosInstance() wird möglicherweise nicht aufgerufen');
      }
    } else {
      console.log('❌ dist/services/boldPaymentService.js existiert nicht!');
    }
    
    // 4. Prüfe ob Axios-Instance verwendet wird
    console.log('\n\n📋 4. Prüfe ob Axios-Instance verwendet wird...\n');
    
    if (fs.existsSync(distPath)) {
      const distContent = fs.readFileSync(distPath, 'utf-8');
      
      const hasAxiosPost = distContent.includes('this.axiosInstance.post');
      const hasAxiosGet = distContent.includes('this.axiosInstance.get');
      const hasAxiosInstance = distContent.includes('this.axiosInstance');
      
      console.log(`✅ this.axiosInstance.post im Code: ${hasAxiosPost}`);
      console.log(`✅ this.axiosInstance.get im Code: ${hasAxiosGet}`);
      console.log(`✅ this.axiosInstance im Code: ${hasAxiosInstance}`);
      
      if (!hasAxiosPost && !hasAxiosGet) {
        console.log('\n⚠️ PROBLEM: this.axiosInstance.post/get nicht gefunden!');
        console.log('   → Axios-Instance wird möglicherweise nicht verwendet');
      }
    }
    
    // 5. Prüfe ReservationNotificationService Logs
    console.log('\n\n📋 5. Prüfe ReservationNotificationService Logs...\n');
    
    const reservationNotificationPatterns = [
      'ReservationNotification',
      'sendReservationInvitation',
      'Einladung.*Reservierung',
      'Fehler beim.*Payment-Link'
    ];
    
    const foundReservationNotification: string[] = [];
    
    createPaymentLinkLogs.split('\n').forEach(line => {
      reservationNotificationPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(line)) {
          foundReservationNotification.push(line.trim());
        }
      });
    });
    
    if (foundReservationNotification.length > 0) {
      console.log(`✅ Gefundene ReservationNotification-Logs: ${foundReservationNotification.length}`);
      console.log('\nLetzte 10 Einträge:');
      foundReservationNotification.slice(-10).forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.substring(0, 200)}...`);
      });
    } else {
      console.log('⚠️ Keine ReservationNotification-Logs gefunden');
    }
    
    // 6. Prüfe ob BoldPaymentService.createForBranch() aufgerufen wird
    console.log('\n\n📋 6. Prüfe ob BoldPaymentService.createForBranch() aufgerufen wird...\n');
    
    const createForBranchPatterns = [
      'createForBranch',
      'BoldPaymentService.*createForBranch',
      'new BoldPaymentService'
    ];
    
    const foundCreateForBranch: string[] = [];
    
    createPaymentLinkLogs.split('\n').forEach(line => {
      createForBranchPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(line)) {
          foundCreateForBranch.push(line.trim());
        }
      });
    });
    
    if (foundCreateForBranch.length > 0) {
      console.log(`✅ Gefundene createForBranch-Aufrufe: ${foundCreateForBranch.length}`);
      console.log('\nLetzte 10 Einträge:');
      foundCreateForBranch.slice(-10).forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.substring(0, 200)}...`);
      });
    } else {
      console.log('⚠️ Keine createForBranch-Aufrufe gefunden');
    }
    
    // 7. Prüfe alle Bold Payment bezogenen Logs
    console.log('\n\n📋 7. Prüfe alle Bold Payment bezogenen Logs...\n');
    
    const allBoldPaymentPatterns = [
      'Bold Payment',
      'boldPayment',
      'BoldPayment',
      'bold.*payment'
    ];
    
    const foundAllBoldPayment: string[] = [];
    
    createPaymentLinkLogs.split('\n').forEach(line => {
      allBoldPaymentPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(line)) {
          foundAllBoldPayment.push(line.trim());
        }
      });
    });
    
    if (foundAllBoldPayment.length > 0) {
      console.log(`✅ Gefundene Bold Payment Logs: ${foundAllBoldPayment.length}`);
      console.log('\nLetzte 20 Einträge:');
      foundAllBoldPayment.slice(-20).forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.substring(0, 200)}...`);
      });
    } else {
      console.log('❌ PROBLEM: Keine Bold Payment Logs gefunden!');
      console.log('   → Bold Payment Service wird möglicherweise nicht verwendet');
    }
    
    // 8. Prüfe 403-Fehler im Kontext
    console.log('\n\n📋 8. Prüfe 403-Fehler im Kontext...\n');
    
    const forbiddenPatterns = [
      '403',
      'Forbidden',
      'Missing Authentication Token'
    ];
    
    const foundForbidden: string[] = [];
    
    createPaymentLinkLogs.split('\n').forEach(line => {
      forbiddenPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(line)) {
          foundForbidden.push(line.trim());
        }
      });
    });
    
    if (foundForbidden.length > 0) {
      console.log(`✅ Gefundene 403-Fehler: ${foundForbidden.length}`);
      console.log('\nLetzte 10 Einträge:');
      foundForbidden.slice(-10).forEach((log, idx) => {
        console.log(`  ${idx + 1}. ${log.substring(0, 200)}...`);
      });
    }
    
    // 9. FAZIT
    console.log('\n\n📋 FAZIT:\n');
    
    const problems: string[] = [];
    const findings: string[] = [];
    
    if (foundCreatePaymentLink.length === 0) {
      problems.push('createPaymentLink() wird NICHT aufgerufen');
    } else {
      findings.push(`createPaymentLink() wird aufgerufen (${foundCreatePaymentLink.length} mal)`);
    }
    
    if (foundLoadSettings.length === 0) {
      problems.push('loadSettings() wird NICHT aufgerufen');
    } else {
      findings.push(`loadSettings() wird aufgerufen (${foundLoadSettings.length} mal)`);
    }
    
    if (foundAllBoldPayment.length === 0) {
      problems.push('Keine Bold Payment Logs gefunden');
    } else {
      findings.push(`Bold Payment Logs gefunden (${foundAllBoldPayment.length} mal)`);
    }
    
    if (problems.length > 0) {
      console.log('🔴 PROBLEME GEFUNDEN:');
      problems.forEach((problem, idx) => {
        console.log(`  ${idx + 1}. ${problem}`);
      });
    }
    
    if (findings.length > 0) {
      console.log('\n✅ ERKENNTNISSE:');
      findings.forEach((finding, idx) => {
        console.log(`  ${idx + 1}. ${finding}`);
      });
    }
    
    console.log('\n💡 NÄCHSTE SCHRITTE:');
    if (foundCreatePaymentLink.length === 0) {
      console.log('  1. Prüfe ob createPaymentLink() überhaupt aufgerufen wird');
      console.log('  2. Prüfe ob ReservationNotificationService.sendReservationInvitation() aufgerufen wird');
      console.log('  3. Prüfe ob es einen frühen Return/Error gibt');
    } else if (foundLoadSettings.length === 0) {
      console.log('  1. Prüfe ob loadSettings() aufgerufen wird');
      console.log('  2. Prüfe ob Settings bereits geladen sind (merchantId ist gesetzt)');
      console.log('  3. Prüfe ob createAxiosInstance() aufgerufen wird');
    } else {
      console.log('  1. Prüfe ob createAxiosInstance() aufgerufen wird');
      console.log('  2. Prüfe ob Request-Interceptor registriert wird');
      console.log('  3. Prüfe ob this.axiosInstance.post() verwendet wird');
    }
    
  } catch (error) {
    console.error('❌ Fehler beim Diagnostizieren:', error);
  }
}

// Führe Diagnose aus
diagnose().catch(console.error);

