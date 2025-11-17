import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkTTLockConfig() {
  try {
    console.log('🔍 Prüfe TTLock Konfiguration...\n');

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

    const settings = decryptApiSettings(organization.settings as any);
    const doorSystem = settings?.doorSystem;

    console.log('📋 Door System Settings:');
    console.log(`   Provider: ${doorSystem?.provider || 'nicht gesetzt'}`);
    console.log(`   Lock IDs: ${JSON.stringify(doorSystem?.lockIds || [])}`);
    console.log(`   Client ID vorhanden: ${!!doorSystem?.clientId}`);
    console.log(`   Client Secret vorhanden: ${!!doorSystem?.clientSecret}`);
    console.log(`   Username vorhanden: ${!!doorSystem?.username}`);
    console.log(`   Password vorhanden: ${!!doorSystem?.password}`);
    console.log(`   API URL: ${doorSystem?.apiUrl || 'nicht gesetzt'}`);

    if (!doorSystem?.lockIds || doorSystem.lockIds.length === 0) {
      console.log('\n⚠️  Keine Lock IDs konfiguriert!');
      console.log('   Der PIN kann nicht generiert werden, wenn keine Lock IDs vorhanden sind.');
    } else {
      console.log(`\n✅ TTLock ist konfiguriert mit ${doorSystem.lockIds.length} Lock(s)`);
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkTTLockConfig()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
