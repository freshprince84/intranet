import { PrismaClient } from '@prisma/client';
import { decryptSecret } from '../src/utils/encryption';

const prisma = new PrismaClient();

/**
 * Script: Debuggt TTLock Client Secret Entschlüsselung
 */

async function debugTTLockSecret() {
  try {
    console.log('🔍 Debugge TTLock Client Secret Entschlüsselung...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        settings: true
      }
    });

    if (!organization?.settings) {
      throw new Error('Organisation nicht gefunden oder keine Settings!');
    }

    const settings = organization.settings as any;
    const doorSystem = settings?.doorSystem;

    if (!doorSystem?.clientSecret) {
      throw new Error('Kein Client Secret gefunden!');
    }

    const encryptedSecret = doorSystem.clientSecret;
    console.log('📋 Client Secret in DB:');
    console.log(`   Länge: ${encryptedSecret.length} Zeichen`);
    console.log(`   Format: ${encryptedSecret.substring(0, 50)}...`);
    console.log(`   Enthält ":"? ${encryptedSecret.includes(':') ? 'Ja' : 'Nein'}\n`);

    // Prüfe ob verschlüsselt (Format: iv:authTag:encrypted)
    if (encryptedSecret.includes(':')) {
      const parts = encryptedSecret.split(':');
      console.log(`   Teile: ${parts.length} (erwartet: 3)`);
      if (parts.length === 3) {
        console.log(`   IV Länge: ${parts[0].length} Zeichen`);
        console.log(`   AuthTag Länge: ${parts[1].length} Zeichen`);
        console.log(`   Encrypted Länge: ${parts[2].length} Zeichen\n`);
      }
    }

    // Versuche zu entschlüsseln
    console.log('🔐 Versuche Entschlüsselung...');
    try {
      const decryptedSecret = decryptSecret(encryptedSecret);
      console.log(`✅ Entschlüsselung erfolgreich!`);
      console.log(`   Entschlüsselt: ${decryptedSecret}`);
      console.log(`   Länge: ${decryptedSecret.length} Zeichen\n`);

      const expectedSecret = '6cd592b8076fb40cdd14fca5dd18b1';
      if (decryptedSecret === expectedSecret) {
        console.log('✅ Client Secret stimmt mit Frontend-Wert überein!');
      } else {
        console.log('❌ Client Secret stimmt NICHT überein!');
        console.log(`   DB:      ${decryptedSecret}`);
        console.log(`   Frontend: ${expectedSecret}`);
      }
    } catch (error: any) {
      console.error('❌ Fehler bei Entschlüsselung:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack?.substring(0, 200)}...\n`);
      
      // Prüfe ENCRYPTION_KEY
      const encryptionKey = process.env.ENCRYPTION_KEY;
      if (!encryptionKey) {
        console.error('❌ ENCRYPTION_KEY ist nicht gesetzt!');
      } else {
        console.log(`✅ ENCRYPTION_KEY ist gesetzt (${encryptionKey.length} Zeichen)`);
        if (encryptionKey.length !== 64) {
          console.error(`⚠️  ENCRYPTION_KEY sollte 64 hex Zeichen haben, hat aber ${encryptionKey.length}`);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugTTLockSecret()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

