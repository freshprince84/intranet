import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import { TTLockService } from '../src/services/ttlockService';
import axios from 'axios';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Helper: Erstellt Passcode direkt mit TTLockService
async function createPasscodeWithService(
  ttlockService: TTLockService,
  lockId: string,
  addType: string,
  length: number,
  name: string
): Promise<{ success: boolean; passcode?: string; error?: string }> {
  try {
    // Generiere Passcode
    let generatedPasscode: string;
    if (length === 9) {
      generatedPasscode = Math.floor(100000000 + Math.random() * 900000000).toString();
    } else {
      generatedPasscode = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    }

    // Hole Access Token
    const accessToken = await (ttlockService as any).getAccessToken();
    
    // Lade Settings für API URL
    await (ttlockService as any).loadSettings();
    const apiUrl = (ttlockService as any).apiUrl || 'https://euopen.ttlock.com';
    const clientId = (ttlockService as any).clientId;
    
    const currentTimestamp = Date.now();

    // Erstelle Request Payload
    const payload = new URLSearchParams();
    payload.append('clientId', clientId);
    payload.append('accessToken', accessToken);
    payload.append('lockId', lockId);
    payload.append('keyboardPwd', generatedPasscode);
    payload.append('keyboardPwdName', name);
    payload.append('keyboardPwdType', '2'); // 2 = permanent
    payload.append('addType', addType); // 1 = bluetooth, 2 = gateway/WiFi
    payload.append('date', currentTimestamp.toString());

    // Sende Request
    const axiosInstance = (ttlockService as any).axiosInstance;
    const response = await axiosInstance.post('/v3/keyboardPwd/add', payload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseData = response.data as any;

    if (responseData.errcode === 0 || responseData.keyboardPwdId) {
      return {
        success: true,
        passcode: generatedPasscode
      };
    } else {
      const errorMsg = responseData.errmsg || `Unknown error (errcode: ${responseData.errcode})`;
      return {
        success: false,
        error: errorMsg
      };
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.errmsg || error.message || 'Unknown error';
    return {
      success: false,
      error: errorMsg
    };
  }
}

/**
 * Script: Erstellt 4 Test-Passcodes mit allen Kombinationen:
 * 1. addType: 1, 9-stellig
 * 2. addType: 1, 10-stellig
 * 3. addType: 2, 9-stellig
 * 4. addType: 2, 10-stellig
 */

async function createTestPasscodes() {
  try {
    console.log('🚀 Erstelle 4 Test-Passcodes mit allen Kombinationen...\n');

    // Lade Organisation 1
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

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

    // Verwende TTLockService für korrekte API-URL und OAuth
    console.log('🔐 Initialisiere TTLockService...');
    const ttlockService = new TTLockService(1);
    await (ttlockService as any).loadSettings();
    const apiUrl = (ttlockService as any).apiUrl || 'https://euopen.ttlock.com';
    console.log(`🌐 Verwende API URL: ${apiUrl}\n`);

    // Test-Kombinationen
    const combinations = [
      { addType: '1', length: 9, name: 'Test 1: addType=1, 9-stellig' },
      { addType: '1', length: 10, name: 'Test 2: addType=1, 10-stellig' },
      { addType: '2', length: 9, name: 'Test 3: addType=2, 9-stellig' },
      { addType: '2', length: 10, name: 'Test 4: addType=2, 10-stellig' }
    ];

    const results: Array<{
      combination: string;
      success: boolean;
      passcode?: string;
      error?: string;
    }> = [];

    for (const combo of combinations) {
      console.log(`\n📝 Erstelle: ${combo.name}...`);
      const result = await createPasscodeWithService(
        ttlockService,
        lockId,
        combo.addType,
        combo.length,
        combo.name
      );
      
      if (result.success) {
        console.log(`   ✅ Erfolg! Passcode: ${result.passcode}`);
      } else {
        console.log(`   ❌ Fehler: ${result.error}`);
      }
      
      results.push({
        combination: combo.name,
        ...result
      });
    }

    // Zusammenfassung
    console.log('\n\n📊 ZUSAMMENFASSUNG:\n');
    console.log('═'.repeat(80));
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.combination}`);
      if (result.success) {
        console.log(`   ✅ ERFOLG`);
        console.log(`   📌 Passcode: ${result.passcode}`);
        console.log(`   🔑 Verwende diesen Code zum Testen an der Tür!`);
      } else {
        console.log(`   ❌ FEHLER: ${result.error}`);
      }
    });
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 Tipp: Teste jeden erfolgreichen Code an der Tür und notiere welcher funktioniert!');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestPasscodes()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

