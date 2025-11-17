import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import axios from 'axios';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: Liste alle existierenden TTLock Passcodes für einen Lock
 */

async function listAllTTLockPasscodes() {
  try {
    console.log('🔍 Liste alle existierenden TTLock Passcodes...\n');

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

    const settings = (organization.settings || {}) as any;
    const decryptedSettings = decryptApiSettings(settings);
    const doorSystem = decryptedSettings?.doorSystem;

    if (!doorSystem?.lockIds || doorSystem.lockIds.length === 0) {
      throw new Error('Keine Lock IDs konfiguriert!');
    }

    const lockId = doorSystem.lockIds[0];
    console.log(`🔑 Verwende Lock ID: ${lockId}\n`);

    const ttlockService = new TTLockService(1);
    const accessToken = await (ttlockService as any).getAccessToken();
    const currentTimestamp = Date.now();

    // TTLock API: Liste alle Passcodes für einen Lock
    // Endpunkt: /v3/keyboardPwd/list
    const payload = new URLSearchParams();
    payload.append('clientId', doorSystem.clientId || '');
    payload.append('accessToken', accessToken);
    payload.append('lockId', lockId.toString());
    payload.append('pageNo', '1');
    payload.append('pageSize', '100'); // Max 100 Codes pro Seite
    payload.append('date', currentTimestamp.toString());

    console.log('📤 Rufe alle Passcodes ab...\n');

    try {
      const response = await axios.post(
        'https://euapi.ttlock.com/v3/keyboardPwd/list',
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          validateStatus: () => true
        }
      );

      const responseData = response.data as any;

      if (responseData.errcode === 0) {
        const passcodes = responseData.list || [];
        
        console.log(`✅ ${passcodes.length} Passcode(s) gefunden:\n`);
        
        if (passcodes.length === 0) {
          console.log('   Keine Passcodes vorhanden.\n');
        } else {
          passcodes.forEach((code: any, index: number) => {
            console.log(`📋 Passcode #${index + 1}:`);
            console.log(`   keyboardPwdId: ${code.keyboardPwdId}`);
            console.log(`   keyboardPwd: ${code.keyboardPwd || 'N/A'}`);
            console.log(`   keyboardPwdName: ${code.keyboardPwdName || 'N/A'}`);
            console.log(`   keyboardPwdType: ${code.keyboardPwdType} (${code.keyboardPwdType === 2 ? 'permanent' : code.keyboardPwdType === 3 ? 'period' : 'unknown'})`);
            console.log(`   startDate: ${code.startDate ? new Date(code.startDate).toISOString() : 'N/A'}`);
            console.log(`   endDate: ${code.endDate ? new Date(code.endDate).toISOString() : 'N/A'}`);
            console.log(`   addType: ${code.addType || 'N/A'}`);
            console.log(`   createDate: ${code.createDate ? new Date(code.createDate).toISOString() : 'N/A'}`);
            console.log('');
          });
        }

        // Prüfe auf Probleme
        console.log('🔍 Analyse:\n');
        
        const permanentCodes = passcodes.filter((c: any) => c.keyboardPwdType === 2);
        const periodCodes = passcodes.filter((c: any) => c.keyboardPwdType === 3);
        const invalidCodes = passcodes.filter((c: any) => {
          if (c.keyboardPwdType === 3) {
            // Period codes: prüfe ob abgelaufen
            if (c.endDate && new Date(c.endDate).getTime() < Date.now()) {
              return true;
            }
          }
          return false;
        });

        console.log(`   Permanente Codes (keyboardPwdType: 2): ${permanentCodes.length}`);
        console.log(`   Period Codes (keyboardPwdType: 3): ${periodCodes.length}`);
        console.log(`   Abgelaufene Codes: ${invalidCodes.length}`);
        
        if (invalidCodes.length > 0) {
          console.log(`\n⚠️  ${invalidCodes.length} abgelaufene Code(s) gefunden:`);
          invalidCodes.forEach((code: any) => {
            console.log(`   - keyboardPwdId: ${code.keyboardPwdId}, Name: ${code.keyboardPwdName || 'N/A'}`);
          });
        }

        // Prüfe auf Codes ohne keyboardPwd (könnte Problem sein)
        const codesWithoutPassword = passcodes.filter((c: any) => !c.keyboardPwd);
        if (codesWithoutPassword.length > 0) {
          console.log(`\n⚠️  ${codesWithoutPassword.length} Code(s) ohne keyboardPwd gefunden:`);
          codesWithoutPassword.forEach((code: any) => {
            console.log(`   - keyboardPwdId: ${code.keyboardPwdId}, Name: ${code.keyboardPwdName || 'N/A'}`);
          });
        }

      } else {
        console.error('❌ Fehler beim Abrufen der Passcodes:');
        console.error(`   errcode: ${responseData.errcode}`);
        console.error(`   errmsg: ${responseData.errmsg || 'Unknown error'}`);
      }

    } catch (error: any) {
      console.error('❌ Fehler:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listAllTTLockPasscodes()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

