import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Script: Teste permanenten personalisierten Passcode (ohne Start/Endzeit)
 */

async function testPermanentPasscode() {
  try {
    console.log('🚀 Teste permanenten personalisierten Passcode...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation: ${organization.displayName}`);

    const settings = (organization.settings || {}) as any;
    const doorSystem = settings?.doorSystem;

    if (!doorSystem?.lockIds || doorSystem.lockIds.length === 0) {
      throw new Error('Keine Lock IDs konfiguriert!');
    }

    const lockId = doorSystem.lockIds[0];
    console.log(`🔑 Verwende Lock ID: ${lockId}\n`);

    const ttlockService = new TTLockService(1);
    const accessToken = await (ttlockService as any).getAccessToken();
    const currentTimestamp = Date.now();

    // Generiere 4-stelligen Passcode
    const generatedPasscode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`🔐 Generierter Passcode: ${generatedPasscode}\n`);

    // Test: Permanenter Passcode (keyboardPwdType: 2)
    const payload = new URLSearchParams();
    payload.append('clientId', doorSystem.clientId || '');
    payload.append('accessToken', accessToken);
    payload.append('lockId', lockId.toString());
    payload.append('keyboardPwd', generatedPasscode);
    payload.append('keyboardPwdName', 'Test Permanent');
    payload.append('keyboardPwdType', '2'); // 2 = permanent (keine Start/Endzeit)
    payload.append('addType', '2'); // 2 = via gateway/WiFi (versuche direkt)
    payload.append('date', currentTimestamp.toString());

    console.log('📤 Sende Request mit permanentem Passcode...');
    console.log('   keyboardPwdType: 2 (permanent)');
    console.log('   addType: 2 (via gateway/WiFi)');
    console.log('   Keine startDate/endDate\n');

    // Versuche zuerst mit addType: 2 (Gateway)
    let success = false;
    try {
      const response = await axios.post(
        'https://euapi.ttlock.com/v3/keyboardPwd/add',
        payload,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          validateStatus: () => true // Akzeptiere alle Status-Codes
        }
      );

      const responseData = response.data as any;
      
      if (responseData.errcode === 0 || responseData.keyboardPwdId) {
        console.log('✅ Permanenter Passcode erfolgreich erstellt (addType: 2)!');
        console.log(`   Passcode: ${generatedPasscode}`);
        console.log(`   keyboardPwdId: ${responseData.keyboardPwdId || responseData.data?.keyboardPwdId}`);
        console.log('\n💡 Teste jetzt, ob der Passcode ohne Synchronisation funktioniert!');
        success = true;
      } else if (responseData.errcode === -2012 || responseData.errmsg?.includes('Gateway')) {
        console.log('⚠️  Lock ist nicht mit Gateway verbunden.');
        console.log('   Versuche mit addType: 1 (via phone bluetooth)...\n');
      } else {
        console.error('❌ Fehler:', responseData);
      }
    } catch (error: any) {
      console.log('⚠️  Fehler beim Versuch mit addType: 2');
      console.log('   Versuche mit addType: 1 (via phone bluetooth)...\n');
    }

    // Falls addType: 2 nicht funktioniert hat, versuche addType: 1
    if (!success) {
      const payload2 = new URLSearchParams();
      payload2.append('clientId', doorSystem.clientId || '');
      payload2.append('accessToken', accessToken);
      payload2.append('lockId', lockId.toString());
      payload2.append('keyboardPwd', generatedPasscode);
      payload2.append('keyboardPwdName', 'Test Permanent');
      payload2.append('keyboardPwdType', '2'); // 2 = permanent
      payload2.append('addType', '1'); // 1 = via phone bluetooth
      payload2.append('date', currentTimestamp.toString());

      try {
        const response2 = await axios.post(
          'https://euapi.ttlock.com/v3/keyboardPwd/add',
          payload2,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            validateStatus: () => true
          }
        );

        const responseData2 = response2.data as any;
        
        if (responseData2.errcode === 0 || responseData2.keyboardPwdId) {
          console.log('✅ Permanenter Passcode erstellt (addType: 1)');
          console.log(`   Passcode: ${generatedPasscode}`);
          console.log(`   keyboardPwdId: ${responseData2.keyboardPwdId || responseData2.data?.keyboardPwdId}`);
          console.log('\n⚠️  WICHTIG: Passcode muss über TTLock App synchronisiert werden!');
          console.log('   💡 Teste jetzt, ob permanenter Passcode nach Synchronisation funktioniert.');
          console.log('   💡 Permanente Passcodes könnten ohne Start/Endzeit direkt funktionieren.');
        } else {
          console.error('❌ Fehler:', responseData2);
        }
      } catch (error2: any) {
        console.error('❌ Fehler beim Versuch mit addType: 1:', error2.response?.data || error2.message);
      }
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

testPermanentPasscode()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

