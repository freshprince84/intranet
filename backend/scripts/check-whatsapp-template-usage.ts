import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from '../src/services/whatsappService';

const prisma = new PrismaClient();

async function checkTemplateUsage() {
  try {
    const reservation = await prisma.reservation.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!reservation || !reservation.guestPhone) {
      console.log('Keine Reservierung mit Telefonnummer gefunden.');
      return;
    }

    console.log('\n=== WhatsApp Template-Verwendung Analyse ===');
    console.log(`Reservierung ID: ${reservation.id}`);
    console.log(`Gast: ${reservation.guestName}`);
    console.log(`Telefon: ${reservation.guestPhone}`);
    console.log(`Status: ${reservation.status}`);
    console.log(`Nachricht versendet: ${reservation.sentMessageAt ? 'JA' : 'NEIN'}`);
    
    console.log('\n--- Template-Konfiguration ---');
    const templateName = process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'reservation_confirmation';
    console.log(`Erwartetes Template: ${templateName}`);
    console.log(`Environment Variable: ${process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'NICHT GESETZT (verwendet Standard)'}`);
    
    console.log('\n--- Test: Session Message vs Template Message ---');
    console.log('Der Code versucht zuerst eine Session Message (24h-Fenster)');
    console.log('Nur wenn das fehlschlägt, wird das Template verwendet.');
    console.log('\n⚠️ PROBLEM: Wenn Session Message erfolgreich ist, wird KEIN Template verwendet!');
    console.log('Daher erscheint in der Business Console keine Template-Nachricht.');
    
    console.log('\n--- Lösung ---');
    console.log('1. Prüfe ob Template "reservation_confirmation" in Business Console existiert');
    console.log('2. Prüfe ob 24h-Fenster aktiv ist (User hat in letzten 24h geschrieben)');
    console.log('3. Wenn 24h-Fenster aktiv: Session Message wird verwendet (kein Template)');
    console.log('4. Wenn 24h-Fenster abgelaufen: Template Message wird verwendet');
    
    console.log('\n--- Test-Versand mit explizitem Template ---');
    const whatsappService = new WhatsAppService(reservation.organizationId);
    
    // Test: Versuche direkt Template Message zu senden (ohne Session Message)
    console.log('\nTeste direkten Template-Versand...');
    try {
      // Lade Settings
      await (whatsappService as any).loadSettings();
      
      const normalizedPhone = (whatsappService as any).normalizePhoneNumber(reservation.guestPhone);
      const templateParams = [
        reservation.guestName,
        'Test Betrag',
        'Test Link',
        reservation.paymentLink || 'Test Payment Link'
      ];
      
      const formattedParams = templateParams.map(text => ({
        type: 'text' as const,
        text: text
      }));
      
      const languageCode = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';
      
      console.log(`Template: ${templateName}`);
      console.log(`Sprache: ${languageCode}`);
      console.log(`Parameter: ${JSON.stringify(formattedParams)}`);
      
      // Direkter Template-Versand (ohne Session Message)
      const result = await (whatsappService as any).sendViaWhatsAppBusiness(
        normalizedPhone,
        'Test Message',
        templateName,
        formattedParams,
        languageCode
      );
      
      if (result) {
        console.log('\n✅ Template Message erfolgreich versendet!');
        console.log('Diese Nachricht sollte jetzt in der Business Console erscheinen.');
      } else {
        console.log('\n❌ Template Message konnte nicht versendet werden!');
      }
    } catch (error) {
      console.error('\n❌ Fehler beim Template-Versand:');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Fehlertyp:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Fehlermeldung:', errorMessage);
      
      if (errorMessage.includes('template') || errorMessage.includes('Template')) {
        console.error('\n⚠️ PROBLEM: Template-Fehler!');
        console.error('Mögliche Ursachen:');
        console.error('1. Template "reservation_confirmation" existiert nicht');
        console.error('2. Template ist nicht genehmigt (Status: Pending/Rejected)');
        console.error('3. Template-Name stimmt nicht überein');
        console.error('4. Template-Parameter stimmen nicht überein');
      }
    }
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTemplateUsage();

