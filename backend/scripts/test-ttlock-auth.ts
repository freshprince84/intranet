import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import { TTLockService } from '../src/services/ttlockService';

const prisma = new PrismaClient();

/**
 * Script: Testet TTLock-Authentifizierung
 */

async function testTTLockAuth() {
  try {
    console.log('🔍 Teste TTLock-Authentifizierung...\n');

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

    const settings = decryptApiSettings(organization.settings as any);
    const doorSystem = settings?.doorSystem;

    if (!doorSystem) {
      throw new Error('Keine doorSystem Settings gefunden!');
    }

    console.log('📋 Konfiguration:');
    console.log(`   Username: ${doorSystem.username}`);
    console.log(`   Password-Hash: ${doorSystem.password?.substring(0, 16)}...`);
    console.log(`   API URL: ${doorSystem.apiUrl}\n`);

    // Teste TTLock Service
    console.log('🔐 Teste TTLock Service...');
    const ttlockService = new TTLockService(1);
    
    try {
      // Versuche Locks abzurufen (erfordert Authentifizierung)
      console.log('📋 Rufe Locks ab (testet Authentifizierung)...');
      const locks = await ttlockService.getLocks();
      console.log(`✅ Authentifizierung erfolgreich! ${locks.length} Lock(s) gefunden.`);
      if (locks.length > 0) {
        console.log(`   Lock IDs: ${locks.join(', ')}`);
      }
    } catch (error: any) {
      console.error('❌ Authentifizierungsfehler:');
      console.error(`   Message: ${error.message}`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testTTLockAuth()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

