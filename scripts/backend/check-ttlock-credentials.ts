import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: Prüft TTLock-Credentials in der Datenbank
 */

async function checkTTLockCredentials() {
  try {
    console.log('🔍 Prüfe TTLock-Credentials für Organisation 1...\n');

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
      console.log('❌ Keine Settings gefunden!');
      return;
    }

    // Versuche Settings zu entschlüsseln
    let settings: any;
    try {
      settings = decryptApiSettings(organization.settings as any);
      console.log('✅ Settings erfolgreich entschlüsselt\n');
    } catch (error) {
      console.log('⚠️  Fehler beim Entschlüsseln:');
      console.log(error);
      settings = organization.settings as any;
    }

    const doorSystem = settings?.doorSystem;

    if (!doorSystem) {
      console.log('❌ Keine doorSystem Settings gefunden!');
      return;
    }

    console.log('📋 TTLock-Credentials in der Datenbank:');
    console.log('─'.repeat(60));
    console.log(`API URL:        ${doorSystem.apiUrl || 'NICHT GESETZT'}`);
    console.log(`Client ID:      ${doorSystem.clientId || 'NICHT GESETZT'}`);
    console.log(`Client Secret:  ${doorSystem.clientSecret ? `${doorSystem.clientSecret.substring(0, 10)}... (${doorSystem.clientSecret.length} Zeichen)` : 'NICHT GESETZT'}`);
    console.log(`Username:       ${doorSystem.username || 'NICHT GESETZT'}`);
    console.log(`Password:       ${doorSystem.password ? `${doorSystem.password.substring(0, 16)}... (${doorSystem.password.length} Zeichen)` : 'NICHT GESETZT'}`);
    console.log(`Passcode-Typ:   ${doorSystem.passcodeType || 'auto'}`);
    console.log(`Lock IDs:       ${doorSystem.lockIds?.length ? `${doorSystem.lockIds.length} Lock(s): ${doorSystem.lockIds.join(', ')}` : 'NICHT GESETZT'}`);
    console.log('─'.repeat(60));

    // Erwartete Werte aus Frontend
    const expectedClientId = 'c0128d6b496a4f848d06970a65210e8a';
    const expectedClientSecret = '6cd592b8076fb40cdd14fca5dd18b1';
    const expectedUsername = '+573024498991';

    console.log('\n🔍 Vergleich mit Frontend-Werten:');
    console.log('─'.repeat(60));
    
    if (doorSystem.clientId === expectedClientId) {
      console.log(`✅ Client ID stimmt überein: ${doorSystem.clientId.substring(0, 10)}...`);
    } else {
      console.log(`❌ Client ID stimmt NICHT überein!`);
      console.log(`   DB:     ${doorSystem.clientId || 'FEHLT'}`);
      console.log(`   Frontend: ${expectedClientId}`);
    }

    if (doorSystem.clientSecret === expectedClientSecret) {
      console.log(`✅ Client Secret stimmt überein: ${doorSystem.clientSecret.substring(0, 10)}...`);
    } else {
      console.log(`❌ Client Secret stimmt NICHT überein!`);
      console.log(`   DB:     ${doorSystem.clientSecret ? doorSystem.clientSecret.substring(0, 20) + '...' : 'FEHLT'}`);
      console.log(`   Frontend: ${expectedClientSecret}`);
    }

    if (doorSystem.username === expectedUsername) {
      console.log(`✅ Username stimmt überein: ${doorSystem.username}`);
    } else {
      console.log(`❌ Username stimmt NICHT überein!`);
      console.log(`   DB:     ${doorSystem.username || 'FEHLT'}`);
      console.log(`   Frontend: ${expectedUsername}`);
    }

    console.log('─'.repeat(60));

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkTTLockCredentials()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

