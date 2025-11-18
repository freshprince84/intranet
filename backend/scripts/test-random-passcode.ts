import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import { TTLockService } from '../src/services/ttlockService';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Test-Script: Erstellt einen automatisch generierten 10-stelligen Passcode
 * über den /v3/keyboardPwd/get Endpunkt (Random Passcode)
 * 
 * Dieser Endpunkt funktioniert OHNE Gateway und OHNE App-Sync!
 */
async function testRandomPasscode() {
  try {
    console.log('🚀 Test: Random Passcode (automatisch generiert, 10-stellig)\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation: ${organization.displayName}\n`);

    if (!organization?.settings) {
      throw new Error('Organisation 1 nicht gefunden oder keine Settings!');
    }

    const settings = decryptApiSettings(organization.settings as any);
    const doorSystemSettings = settings?.doorSystem;

    console.log('📋 Door System Settings:');
    console.log(`   Client ID vorhanden: ${!!doorSystemSettings?.clientId}`);
    console.log(`   Client Secret vorhanden: ${!!doorSystemSettings?.clientSecret}`);
    console.log(`   Username vorhanden: ${!!doorSystemSettings?.username}`);
    console.log(`   Password vorhanden: ${!!doorSystemSettings?.password}`);
    console.log(`   Lock IDs: ${JSON.stringify(doorSystemSettings?.lockIds || [])}\n`);

    if (!doorSystemSettings?.clientId || !doorSystemSettings?.clientSecret) {
      throw new Error('TTLock Client ID/Secret nicht konfiguriert!');
    }

    if (!doorSystemSettings?.username || !doorSystemSettings?.password) {
      throw new Error('TTLock Username/Password nicht konfiguriert!');
    }

    if (!doorSystemSettings?.lockIds || doorSystemSettings.lockIds.length === 0) {
      throw new Error('Keine Lock IDs konfiguriert!');
    }

    const lockId = doorSystemSettings.lockIds[0];
    console.log(`✅ Verwende Lock ID: ${lockId}\n`);

    // Verwende TTLockService für OAuth-Token
    console.log('🔐 Initialisiere TTLockService...');
    const ttlockService = new TTLockService(1);
    await (ttlockService as any).loadSettings();
    
    // Hole Access Token
    const accessToken = await (ttlockService as any).getAccessToken();
    console.log(`✅ Access Token erhalten (Länge: ${accessToken.length})\n`);

    // Lade Settings für API URL und Client ID
    const apiUrl = (ttlockService as any).apiUrl || 'https://euopen.ttlock.com';
    const clientId = (ttlockService as any).clientId;
    
    console.log(`🌐 API URL: ${apiUrl}`);
    console.log(`🔑 Client ID: ${clientId}\n`);

    // WICHTIG: Verwende /v3/keyboardPwd/get für automatisch generierte 10-stellige Passcodes
    // OHNE Gateway funktionieren NUR automatisch generierte 10-stellige Passcodes!
    // Der keyboardPwd Parameter wird NICHT gesetzt - die API generiert automatisch!
    
    const currentTimestamp = Date.now();
    // WICHTIG: startDate muss in der Vergangenheit liegen, damit der Code sofort aktiv ist!
    // Setze startDate auf heute 00:00 (Mitternacht), damit der Code definitiv aktiv ist
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0); // Heute 00:00:00
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1); // +1 Tag

    // Erstelle Request Payload für /v3/keyboardPwd/get
    const payload = new URLSearchParams();
    payload.append('clientId', clientId);
    payload.append('accessToken', accessToken);
    payload.append('lockId', lockId);
    // WICHTIG: keyboardPwd NICHT setzen - API generiert automatisch 10-stellig!
    payload.append('keyboardPwdName', 'Test Random Passcode');
    payload.append('keyboardPwdType', '3'); // 3 = period (temporärer Passcode)
    payload.append('startDate', startDate.getTime().toString()); // Millisekunden
    payload.append('endDate', endDate.getTime().toString()); // Millisekunden
    payload.append('addType', '1'); // 1 = via phone bluetooth (ohne Gateway)
    payload.append('date', currentTimestamp.toString()); // Millisekunden

    console.log('📤 Request Details:');
    console.log(`   Endpoint: ${apiUrl}/v3/keyboardPwd/get`);
    console.log(`   Lock ID: ${lockId}`);
    console.log(`   keyboardPwdType: 3 (period)`);
    console.log(`   startDate: ${startDate.toISOString()} (heute 00:00 - Code ist sofort aktiv!)`);
    console.log(`   endDate: ${endDate.toISOString()}`);
    console.log(`   addType: 1 (via phone bluetooth)`);
    console.log(`   keyboardPwd: NICHT gesetzt (API generiert automatisch 10-stellig!)\n`);

    // Sende Request
    const axiosInstance = (ttlockService as any).axiosInstance;
    const response = await axiosInstance.post('/v3/keyboardPwd/get', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = response.data as any;

    console.log('📥 Response:');
    console.log(JSON.stringify(responseData, null, 2));
    console.log('');

    // Prüfe ob Passcode zurückgegeben wurde (mit oder ohne errcode)
    const generatedPasscode = responseData.keyboardPwd || responseData.passcode;
    const keyboardPwdId = responseData.keyboardPwdId;
    
    if (generatedPasscode) {
      // Erfolg - Passcode wurde generiert!
      console.log('✅ ERFOLG! Passcode wurde automatisch generiert!');
      console.log(`📌 Generierter Passcode: ${generatedPasscode}`);
      console.log(`🔢 Passcode-Länge: ${generatedPasscode.length} Ziffern`);
      console.log(`🆔 Passcode ID: ${keyboardPwdId || 'N/A'}`);
      
      if (generatedPasscode.length === 10) {
        console.log(`\n✅ Passcode ist 10-stellig - sollte ohne Gateway funktionieren!`);
      } else {
        console.log(`\n⚠️ Passcode ist ${generatedPasscode.length}-stellig (erwartet: 10-stellig)`);
        console.log(`   Die API hat einen ${generatedPasscode.length}-stelligen Code generiert.`);
      }
      
      console.log(`\n💡 Dieser Code sollte an der Tür funktionieren, da er automatisch generiert wurde!`);
      console.log(`💡 Teste diesen Code: ${generatedPasscode}`);
    } else if (responseData.errcode === 0) {
      // Erfolg aber kein Passcode zurückgegeben
      console.log('⚠️ API hat Erfolg gemeldet, aber keinen Passcode zurückgegeben!');
      console.log('   Response:', responseData);
    } else {
      // Fehler
      const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
      console.log(`❌ FEHLER: ${errorMsg}`);
      console.log(`   Error Code: ${responseData.errcode || 'N/A'}`);
    }

  } catch (error: any) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    if (error.response) {
      console.error('   Response Status:', error.response.status);
      console.error('   Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

testRandomPasscode();

