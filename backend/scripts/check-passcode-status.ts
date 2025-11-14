import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Script: Prüfe ob erstellte Passcodes bereits aktiv sind
 */

async function checkPasscodeStatus() {
  try {
    console.log('🔍 Prüfe Passcode-Status...\n');

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
    console.log(`🔑 Lock ID: ${lockId}\n`);

    const ttlockService = new TTLockService(1);
    const accessToken = await (ttlockService as any).getAccessToken();

    // Versuche verschiedene Endpunkte, um Passcodes abzurufen
    const endpoints = [
      '/v3/keyboardPwd/list',
      '/v3/keyboardPwd/query',
      '/v3/lock/query'
    ];

    for (const endpoint of endpoints) {
      console.log(`\n📡 Teste Endpunkt: ${endpoint}`);
      try {
        const response = await axios.post(
          `https://euapi.ttlock.com${endpoint}`,
          new URLSearchParams({
            clientId: doorSystem.clientId || '',
            accessToken: accessToken,
            lockId: lockId.toString(),
            date: Date.now().toString()
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            validateStatus: () => true
          }
        );

        if (response.data && typeof response.data === 'object') {
          console.log(`✅ Response erhalten:`);
          console.log(JSON.stringify(response.data, null, 2));
        } else {
          console.log(`⚠️  Ungültige Response:`, response.status);
        }
      } catch (error: any) {
        console.log(`❌ Fehler:`, error.response?.status || error.message);
      }
    }

    console.log('\n💡 Mögliche Lösungen:');
    console.log('   1. TTLock App öffnen und Lock-Details öffnen (kann automatisch synchronisieren)');
    console.log('   2. In der App: Lock → Passcodes → "Aktualisieren" oder "Synchronisieren"');
    console.log('   3. Prüfe, ob die Passcodes in der App sichtbar sind');
    console.log('   4. Falls nicht sichtbar: Passcodes müssen manuell über Bluetooth synchronisiert werden');

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

checkPasscodeStatus()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

