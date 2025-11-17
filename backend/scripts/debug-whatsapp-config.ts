import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function debugWhatsAppConfig() {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      console.error('Keine Settings gefunden');
      return;
    }

    const settings = decryptApiSettings(org.settings as any);
    const whatsappSettings = settings?.whatsapp;

    console.log('\n=== WhatsApp Konfiguration ===');
    console.log(`Provider: ${whatsappSettings?.provider || 'N/A'}`);
    console.log(`API Key vorhanden: ${!!whatsappSettings?.apiKey}`);
    console.log(`API Key Länge: ${whatsappSettings?.apiKey?.length || 0}`);
    console.log(`Phone Number ID: ${whatsappSettings?.phoneNumberId || 'N/A'}`);
    console.log(`Business Account ID: ${whatsappSettings?.businessAccountId || 'N/A'}`);
    
    console.log('\n⚠️ WICHTIG:');
    console.log('1. Prüfe in WhatsApp Business Console, ob die Phone Number ID übereinstimmt');
    console.log('2. Prüfe, ob das Template für diese Phone Number ID erstellt wurde');
    console.log('3. Prüfe, ob das Template genehmigt ist (Status: APPROVED)');
    console.log('4. Prüfe, ob die Telefonnummer +41787192338 in WhatsApp blockiert ist');
    
    console.log('\n--- Test: Prüfe ob Session Message wirklich ankommt ---');
    console.log('Die Session Message gibt Status 200 zurück, aber die Nachricht kommt nicht an.');
    console.log('Mögliche Ursachen:');
    console.log('- Telefonnummer ist blockiert');
    console.log('- Telefonnummer ist falsch formatiert');
    console.log('- WhatsApp Business API hat ein Problem');
    console.log('- Die Nachricht wird als Spam gefiltert');
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWhatsAppConfig();

