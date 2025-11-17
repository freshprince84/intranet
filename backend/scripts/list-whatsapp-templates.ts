import axios from 'axios';

async function listWhatsAppTemplates() {
  try {
    // Hole API Key aus Settings (vereinfacht - normalerweise aus DB)
    const apiKey = process.env.WHATSAPP_API_KEY || '';
    const phoneNumberId = '852832151250618';
    
    if (!apiKey) {
      console.error('⚠️ WHATSAPP_API_KEY nicht in Environment-Variablen gefunden');
      console.log('Versuche Settings aus Datenbank zu laden...');
      
      // Lade aus DB
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      const org = await prisma.organization.findUnique({
        where: { id: 1 },
        select: { settings: true }
      });
      
      if (org?.settings) {
        const settings = org.settings as any;
        const whatsappSettings = settings.whatsapp;
        if (whatsappSettings?.apiKey) {
          const finalApiKey = whatsappSettings.apiKey;
          console.log('✅ API Key aus Datenbank geladen');
          
          // Liste Templates
          await listTemplates(finalApiKey, phoneNumberId);
        } else {
          console.error('❌ Kein API Key in Settings gefunden');
        }
      }
      await prisma.$disconnect();
    } else {
      await listTemplates(apiKey, phoneNumberId);
    }
  } catch (error) {
    console.error('Fehler:', error);
  }
}

async function listTemplates(apiKey: string, phoneNumberId: string) {
  try {
    console.log('\n=== Verfügbare WhatsApp Templates ===');
    console.log(`Phone Number ID: ${phoneNumberId}`);
    console.log(`API Key Länge: ${apiKey.length}`);
    
    // WhatsApp Business API: GET /{whatsapp-business-account-id}/message_templates
    // Wir brauchen die Business Account ID, nicht die Phone Number ID
    // Alternative: Verwende WABA ID aus Settings oder hole sie über die Phone Number ID
    
    // Versuche zuerst mit Phone Number ID (kann funktionieren je nach API-Version)
    // Wenn das nicht funktioniert, müssen wir die WABA ID verwenden
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/message_templates`;
    
    // Alternative: Wenn WABA ID bekannt ist, verwende diese:
    // const wabaId = 'DEINE_WABA_ID';
    // const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates`;
    
    console.log(`\nRufe API auf: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`\n✅ API Response Status: ${response.status}`);
    console.log(`\nVerfügbare Templates:`);
    
    if (response.data?.data && Array.isArray(response.data.data)) {
      const templates = response.data.data;
      console.log(`\nAnzahl Templates: ${templates.length}\n`);
      
      templates.forEach((template: any, index: number) => {
        console.log(`${index + 1}. Template: ${template.name}`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Kategorie: ${template.category}`);
        console.log(`   Sprachen:`);
        
        if (template.language) {
          console.log(`     - ${template.language} (${template.language})`);
        }
        
        if (template.components) {
          template.components.forEach((comp: any, compIndex: number) => {
            if (comp.type === 'BODY') {
              console.log(`   Body: ${comp.text?.substring(0, 50)}...`);
            }
          });
        }
        
        console.log('');
      });
      
      // Prüfe speziell nach reservation_checkin_invitation
      const targetTemplate = templates.find((t: any) => t.name === 'reservation_checkin_invitation');
      if (targetTemplate) {
        console.log('\n✅ Template "reservation_checkin_invitation" gefunden!');
        console.log(`   Status: ${targetTemplate.status}`);
        console.log(`   Kategorie: ${targetTemplate.category}`);
        console.log(`   Sprache: ${targetTemplate.language || 'N/A'}`);
        
        if (targetTemplate.status !== 'APPROVED') {
          console.log(`\n⚠️ PROBLEM: Template Status ist "${targetTemplate.status}", nicht "APPROVED"!`);
          console.log('Template kann erst verwendet werden, wenn Status "APPROVED" ist.');
        }
      } else {
        console.log('\n❌ Template "reservation_checkin_invitation" NICHT gefunden!');
        console.log('Verfügbare Template-Namen:');
        templates.forEach((t: any) => {
          console.log(`  - ${t.name}`);
        });
      }
    } else {
      console.log('Keine Templates gefunden oder unerwartetes Response-Format:');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error('\n❌ Fehler beim Abrufen der Templates:');
    if (axios.isAxiosError(error)) {
      console.error(`Status: ${error.response?.status}`);
      console.error(`Response:`, JSON.stringify(error.response?.data, null, 2));
    } else {
      console.error(error);
    }
  }
}

listWhatsAppTemplates();

