import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugTTLockCredentials() {
  try {
    console.log('🔍 Debug TTLock Credentials...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!organization || !organization.settings) {
      throw new Error('Organisation nicht gefunden');
    }

    const settings = organization.settings as any;
    const doorSystem = settings.doorSystem;

    console.log('📋 Rohe Settings (verschlüsselt):');
    console.log(`   clientId vorhanden: ${!!doorSystem?.clientId}`);
    console.log(`   clientId Länge: ${doorSystem?.clientId?.length || 0}`);
    console.log(`   clientId Start: ${doorSystem?.clientId?.substring(0, 30) || 'N/A'}`);
    console.log(`   clientSecret vorhanden: ${!!doorSystem?.clientSecret}`);
    console.log(`   clientSecret Länge: ${doorSystem?.clientSecret?.length || 0}`);
    console.log(`   clientSecret Start: ${doorSystem?.clientSecret?.substring(0, 30) || 'N/A'}`);
    console.log('');

    const decrypted = decryptApiSettings(settings);
    const decryptedDoorSystem = decrypted.doorSystem;

    console.log('🔓 Entschlüsselte Settings:');
    console.log(`   clientId: ${decryptedDoorSystem?.clientId || 'N/A'}`);
    console.log(`   clientId Länge: ${decryptedDoorSystem?.clientId?.length || 0}`);
    console.log(`   clientSecret: ${decryptedDoorSystem?.clientSecret?.substring(0, 10)}...`);
    console.log(`   clientSecret Länge: ${decryptedDoorSystem?.clientSecret?.length || 0}`);
    console.log('');

    console.log('✅ Erwartete Werte:');
    console.log(`   clientId: c0128d6b496a4f848d06970a65210e8a`);
    console.log(`   clientSecret: cdbb8ea148766914af14ef9e762a792d`);
    console.log('');

    if (decryptedDoorSystem?.clientId === 'c0128d6b496a4f848d06970a65210e8a') {
      console.log('✅ Client ID ist korrekt!');
    } else {
      console.log('❌ Client ID stimmt nicht überein!');
    }

    if (decryptedDoorSystem?.clientSecret?.startsWith('cdbb8ea148')) {
      console.log('✅ Client Secret beginnt korrekt!');
    } else {
      console.log('❌ Client Secret stimmt nicht überein!');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTTLockCredentials();

