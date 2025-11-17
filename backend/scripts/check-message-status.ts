import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function checkMessageStatus() {
  try {
    // Hole Settings
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

    if (!whatsappSettings?.apiKey) {
      console.error('Kein API Key gefunden');
      return;
    }

    const apiKey = whatsappSettings.apiKey;
    const phoneNumberId = whatsappSettings.phoneNumberId || '852832151250618';

    console.log('\n=== Prüfe Message Status ===');
    console.log(`Phone Number ID: ${phoneNumberId}`);
    
    // Die letzte Message-ID aus dem Test
    const messageId = 'wamid.HBgLNDE3ODcxOTIzMzgVAgARGBJDOUVFRThFMkM0MUVBMEY0ODEA';
    
    console.log(`\nPrüfe Message ID: ${messageId}`);
    
    // WhatsApp Business API: GET /{message-id}
    const url = `https://graph.facebook.com/v18.0/${messageId}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('\n✅ Message Status:');
      console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        console.error('\n❌ Fehler beim Abrufen des Message-Status:');
        console.error(`Status: ${error.response?.status}`);
        console.error(`Response:`, JSON.stringify(error.response?.data, null, 2));
      } else {
        console.error('Fehler:', error);
      }
    }
    
    // Prüfe auch, ob es ein Problem mit der Telefonnummer gibt
    console.log('\n--- Prüfe Telefonnummer-Format ---');
    const testPhone = '+41787192338';
    console.log(`Telefonnummer: ${testPhone}`);
    console.log(`Länge: ${testPhone.length}`);
    console.log(`Startet mit +: ${testPhone.startsWith('+')}`);
    console.log(`Nur Ziffern nach +: ${/^\+[0-9]+$/.test(testPhone)}`);
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMessageStatus();

