import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: Prüft TTLock-Konfiguration in der Datenbank
 */

async function checkTTLockConfig() {
  try {
    console.log('🔍 Prüfe TTLock-Konfiguration für Organisation 1...\n');

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

    console.log(`✅ Organisation: ${organization.displayName} (${organization.name})\n`);

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
      console.log('⚠️  Fehler beim Entschlüsseln (möglicherweise unverschlüsselt):');
      console.log(error);
      settings = organization.settings as any;
    }

    const doorSystem = settings?.doorSystem;

    if (!doorSystem) {
      console.log('❌ Keine doorSystem Settings gefunden!');
      return;
    }

    console.log('📋 TTLock-Konfiguration:');
    console.log('─'.repeat(50));
    console.log(`API URL:        ${doorSystem.apiUrl || 'NICHT GESETZT'}`);
    console.log(`Client ID:      ${doorSystem.clientId ? '✅ GESETZT' : '❌ NICHT GESETZT'}`);
    console.log(`Client Secret:  ${doorSystem.clientSecret ? '✅ GESETZT' : '❌ NICHT GESETZT'}`);
    console.log(`Username:       ${doorSystem.username || '❌ NICHT GESETZT'}`);
    console.log(`Password:       ${doorSystem.password ? `✅ GESETZT (${doorSystem.password.length} Zeichen, MD5-Hash)` : '❌ NICHT GESETZT'}`);
    console.log(`Passcode-Typ:   ${doorSystem.passcodeType || 'auto (Standard)'}`);
    console.log(`Lock IDs:       ${doorSystem.lockIds?.length ? `✅ ${doorSystem.lockIds.length} Lock(s): ${doorSystem.lockIds.join(', ')}` : '❌ NICHT GESETZT'}`);
    console.log('─'.repeat(50));

    // Prüfe ob alle erforderlichen Felder gesetzt sind
    const requiredFields = ['clientId', 'clientSecret', 'username', 'password'];
    const missingFields = requiredFields.filter(field => !doorSystem[field]);

    if (missingFields.length > 0) {
      console.log(`\n❌ Fehlende Felder: ${missingFields.join(', ')}`);
    } else {
      console.log('\n✅ Alle erforderlichen Felder sind gesetzt!');
    }

    // Zeige Password-Hash (erste 8 Zeichen für Verifikation)
    if (doorSystem.password) {
      console.log(`\n🔐 Password-Hash (erste 8 Zeichen): ${doorSystem.password.substring(0, 8)}...`);
      console.log(`   Erwarteter MD5-Hash von "DigitalAccess123!": 8a5f... (32 hex Zeichen)`);
      
      // Prüfe ob es ein MD5-Hash ist (32 hex Zeichen)
      if (doorSystem.password.length === 32 && /^[a-f0-9]+$/i.test(doorSystem.password)) {
        console.log('   ✅ Format sieht nach MD5-Hash aus (32 hex Zeichen)');
      } else {
        console.log('   ⚠️  Format entspricht nicht einem MD5-Hash (sollte 32 hex Zeichen sein)');
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkTTLockConfig()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

