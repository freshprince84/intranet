import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import { TTLockService } from '../src/services/ttlockService';

const prisma = new PrismaClient();

/**
 * Script: Vollständige Verifikation der TTLock-Konfiguration
 */

async function verifyTTLockComplete() {
  try {
    console.log('🔍 Vollständige Verifikation der TTLock-Konfiguration...\n');

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

    if (!organization.settings) {
      throw new Error('Keine Settings gefunden!');
    }

    // Entschlüssele Settings
    const settings = decryptApiSettings(organization.settings as any);
    const doorSystem = settings?.doorSystem;

    if (!doorSystem) {
      throw new Error('Keine doorSystem Settings gefunden!');
    }

    console.log('📋 Konfiguration in der Datenbank:');
    console.log('─'.repeat(60));
    console.log(`API URL:        ${doorSystem.apiUrl || '❌ FEHLT'}`);
    console.log(`Client ID:      ${doorSystem.clientId ? `✅ ${doorSystem.clientId}` : '❌ FEHLT'}`);
    console.log(`Client Secret:  ${doorSystem.clientSecret ? `✅ ${doorSystem.clientSecret.substring(0, 10)}... (${doorSystem.clientSecret.length} Zeichen)` : '❌ FEHLT'}`);
    console.log(`Username:       ${doorSystem.username || '❌ FEHLT'}`);
    console.log(`Password:       ${doorSystem.password ? `✅ ${doorSystem.password.substring(0, 10)}... (${doorSystem.password.length} Zeichen, MD5)` : '❌ FEHLT'}`);
    console.log(`Passcode-Typ:   ${doorSystem.passcodeType || 'auto'}`);
    console.log(`Lock IDs:       ${doorSystem.lockIds?.length ? `✅ ${doorSystem.lockIds.join(', ')}` : '❌ FEHLT'}`);
    console.log('─'.repeat(60));

    // Erwartete Werte
    const expectedClientId = 'c0128d6b496a4f848d06970a65210e8a';
    const expectedClientSecret = 'cdbb8ea148766914af14ef9e762a792d';
    const expectedUsername = '+573024498991';
    const expectedPasswordHash = '36942b24802cfdbb2c9d6e5d3bc944c6';

    console.log('\n🔍 Vergleich mit erwarteten Werten:');
    let allCorrect = true;

    if (doorSystem.clientId !== expectedClientId) {
      console.log(`❌ Client ID stimmt nicht!`);
      console.log(`   DB: ${doorSystem.clientId}`);
      console.log(`   Erwartet: ${expectedClientId}`);
      allCorrect = false;
    } else {
      console.log(`✅ Client ID korrekt`);
    }

    if (doorSystem.clientSecret !== expectedClientSecret) {
      console.log(`❌ Client Secret stimmt nicht!`);
      console.log(`   DB: ${doorSystem.clientSecret}`);
      console.log(`   Erwartet: ${expectedClientSecret}`);
      allCorrect = false;
    } else {
      console.log(`✅ Client Secret korrekt`);
    }

    if (doorSystem.username !== expectedUsername) {
      console.log(`❌ Username stimmt nicht!`);
      console.log(`   DB: ${doorSystem.username}`);
      console.log(`   Erwartet: ${expectedUsername}`);
      allCorrect = false;
    } else {
      console.log(`✅ Username korrekt`);
    }

    if (doorSystem.password !== expectedPasswordHash) {
      console.log(`❌ Password-Hash stimmt nicht!`);
      console.log(`   DB: ${doorSystem.password}`);
      console.log(`   Erwartet: ${expectedPasswordHash}`);
      allCorrect = false;
    } else {
      console.log(`✅ Password-Hash korrekt`);
    }

    if (!doorSystem.lockIds || doorSystem.lockIds.length === 0) {
      console.log(`❌ Keine Lock IDs gespeichert!`);
      allCorrect = false;
    } else {
      console.log(`✅ Lock IDs gespeichert: ${doorSystem.lockIds.join(', ')}`);
    }

    console.log('\n🔐 Teste Authentifizierung...');
    try {
      const ttlockService = new TTLockService(1);
      const locks = await ttlockService.getLocks();
      console.log(`✅ Authentifizierung erfolgreich! ${locks.length} Lock(s) gefunden.`);
      
      if (locks.length > 0 && doorSystem.lockIds && locks[0].toString() === doorSystem.lockIds[0]) {
        console.log(`✅ Lock ID in DB stimmt mit API überein!`);
      } else {
        console.log(`⚠️  Lock ID in DB stimmt nicht mit API überein!`);
        console.log(`   DB: ${doorSystem.lockIds?.[0]}`);
        console.log(`   API: ${locks[0]}`);
      }
    } catch (error: any) {
      console.error(`❌ Authentifizierung fehlgeschlagen: ${error.message}`);
      allCorrect = false;
    }

    console.log('\n' + '─'.repeat(60));
    if (allCorrect) {
      console.log('✅ ALLES KORREKT! TTLock-Konfiguration ist vollständig und funktioniert.');
    } else {
      console.log('❌ Es gibt noch Probleme mit der Konfiguration.');
    }
    console.log('─'.repeat(60));

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyTTLockComplete()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

