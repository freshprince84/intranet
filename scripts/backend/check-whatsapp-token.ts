import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings } from '../src/utils/encryption';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkWhatsAppToken() {
  try {
    const organizationId = parseInt(process.argv[2] || '1', 10);

    console.log('🔍 Prüfe WhatsApp Token...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error('Keine Settings gefunden!');
    }

    const settings = decryptApiSettings(organization.settings as any);
    const token = settings?.whatsapp?.apiKey;

    console.log('Token Status:');
    console.log(`  Länge: ${token?.length || 0}`);
    console.log(`  Enthält Doppelpunkt: ${token?.includes(':') || false}`);
    console.log(`  Start: ${token?.substring(0, 50) || 'N/A'}...`);
    console.log(`  End: ...${token?.substring((token?.length || 0) - 30) || 'N/A'}`);
    console.log(`  Gültiges Format: ${token ? /^[A-Za-z0-9]+$/.test(token) : false}`);

    if (token && token.includes(':')) {
      console.log('\n⚠️  WARNUNG: Token enthält noch Doppelpunkte - möglicherweise noch verschlüsselt!');
    } else if (token && /^[A-Za-z0-9]+$/.test(token)) {
      console.log('\n✅ Token sieht gültig aus!');
    } else {
      console.log('\n❌ Token-Format ist ungültig!');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhatsAppToken();

