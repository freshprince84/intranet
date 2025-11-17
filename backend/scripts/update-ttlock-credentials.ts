import { PrismaClient } from '@prisma/client';
import { encryptSecret } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function updateTTLockCredentials() {
  try {
    console.log('🔧 Aktualisiere TTLock Credentials...\n');

    const organizationId = 1; // La Familia Hostel

    // Neue Credentials aus dem TTLock Developer Portal
    const clientId = 'c0128d6b496a4f848d06970a65210e8a';
    const clientSecret = 'cdbb8ea148766914af14ef9e762a792d';

    console.log('📋 Neue Credentials:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Client Secret: ${clientSecret.substring(0, 10)}...`);
    console.log('');

    // Hole Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization || !organization.settings) {
      throw new Error('Organisation nicht gefunden oder keine Settings vorhanden');
    }

    const settings = organization.settings as any;

    // Verschlüssele Credentials
    const encryptedClientId = encryptSecret(clientId);
    const encryptedClientSecret = encryptSecret(clientSecret);

    console.log('🔐 Verschlüssele Credentials...');

    // Aktualisiere Settings
    if (!settings.doorSystem) {
      settings.doorSystem = {};
    }

    settings.doorSystem.clientId = encryptedClientId;
    settings.doorSystem.clientSecret = encryptedClientSecret;

    // Speichere in Datenbank
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: settings
      }
    });

    console.log('✅ TTLock Credentials erfolgreich aktualisiert!');
    console.log('');
    console.log('📝 Bitte prüfe:');
    console.log('   1. Username und Password sind korrekt gesetzt');
    console.log('   2. Lock IDs sind korrekt konfiguriert');
    console.log('   3. API URL ist korrekt (https://euopen.ttlock.com)');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

updateTTLockCredentials()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

