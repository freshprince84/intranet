import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkAllBranchesWhatsApp() {
  try {
    console.log('🔍 Prüfe alle Branches mit WhatsApp Settings\n');
    console.log('='.repeat(60));

    const branches = await prisma.branch.findMany({
      where: {
        whatsappSettings: { not: null }
      },
      select: {
        id: true,
        name: true,
        whatsappSettings: true
      }
    });

    console.log(`\n✅ Branches mit WhatsApp Settings: ${branches.length}\n`);

    for (const branch of branches) {
      console.log(`Branch: ${branch.name} (ID: ${branch.id})`);
      if (branch.whatsappSettings) {
        const settings = branch.whatsappSettings as any;
        console.log(`   - Phone Number ID: ${settings.phoneNumberId || 'nicht gesetzt'}`);
        console.log(`   - Provider: ${settings.provider || 'nicht gesetzt'}`);
        console.log(`   - API Key vorhanden: ${!!settings.apiKey}`);
        console.log('');
      }
    }

    // Prüfe speziell für Phone Number ID 852832151250618
    console.log('\n🔍 Suche nach Phone Number ID: 852832151250618');
    console.log('-'.repeat(60));

    for (const branch of branches) {
      if (branch.whatsappSettings) {
        const settings = branch.whatsappSettings as any;
        if (settings.phoneNumberId === '852832151250618') {
          console.log(`✅ Gefunden in Branch: ${branch.name} (ID: ${branch.id})`);
        }
      }
    }

    console.log('\n✅ Prüfung abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkAllBranchesWhatsApp();

