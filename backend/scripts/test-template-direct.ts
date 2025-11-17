import { WhatsAppService } from '../src/services/whatsappService';

async function testTemplateDirect() {
  try {
    const phoneNumber = '+41787192338';
    const organizationId = 1; // La Familia Hostel
    
    console.log('\n=== Direkter Template-Versand (ohne Session Message) ===');
    console.log(`Telefonnummer: ${phoneNumber}`);
    console.log(`Organisation ID: ${organizationId}`);
    
    const templateName = 'reservation_checkin_invitation';
    const guestName = 'Patrick';
    const checkInLink = 'http://localhost:3000/check-in/12';
    const paymentLink = 'https://checkout.bold.co/payment/LNK_1H36J8Y05O';
    
    // Template-Parameter: {{1}} = Gast-Name, {{2}} = Check-in-Link, {{3}} = Payment-Link
    const templateParams = [
      guestName,
      checkInLink,
      paymentLink
    ];
    
    console.log(`\nTemplate: ${templateName}`);
    console.log(`Parameter:`);
    console.log(`  {{1}} = ${templateParams[0]}`);
    console.log(`  {{2}} = ${templateParams[1]}`);
    console.log(`  {{3}} = ${templateParams[2]}`);
    
    const whatsappService = new WhatsAppService(organizationId);
    
    // Lade Settings
    await (whatsappService as any).loadSettings();
    
    if (!(whatsappService as any).axiosInstance || !(whatsappService as any).phoneNumberId) {
      throw new Error('WhatsApp Service nicht initialisiert');
    }
    
    const normalizedPhone = (whatsappService as any).normalizePhoneNumber(phoneNumber);
    console.log(`\nNormalisierte Telefonnummer: ${normalizedPhone}`);
    
    // Formatiere Template-Parameter
    const formattedParams = templateParams.map(text => ({
      type: 'text' as const,
      text: text
    }));
    
    // Versuche verschiedene Sprachen
    const languages = ['es', 'en', 'de'];
    let success = false;
    
    for (const languageCode of languages) {
      console.log(`\nVersuche Template-Sprache: ${languageCode}`);
      
      try {
        const result = await (whatsappService as any).sendViaWhatsAppBusiness(
          normalizedPhone,
          '', // Message wird nicht verwendet bei Template
          templateName,
          formattedParams,
          languageCode
        );
        
        if (result) {
          console.log(`\n✅ Template Message erfolgreich versendet mit Sprache: ${languageCode}!`);
          console.log('Die Nachricht sollte jetzt in der Business Console erscheinen.');
          console.log('Bitte prüfe dein WhatsApp auf +41787192338');
          success = true;
          break;
        }
      } catch (langError) {
        const langErrorMessage = langError instanceof Error ? langError.message : String(langError);
        if (langErrorMessage.includes('does not exist in')) {
          console.log(`  ❌ Template existiert nicht in ${languageCode}, versuche nächste Sprache...`);
        } else {
          throw langError; // Anderer Fehler, weiterwerfen
        }
      }
    }
    
    if (!success) {
      throw new Error('Template konnte in keiner Sprache gefunden werden (es, en, de)');
    }
    
    console.log('\n--- Versende Template Message direkt ---');
  } catch (error) {
    console.error('\n❌ FEHLER beim Template-Versand:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Fehlertyp:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Fehlermeldung:', errorMessage);
    
    if (errorMessage.includes('template') || errorMessage.includes('Template')) {
      console.error('\n⚠️ Template-Fehler!');
      console.error('Mögliche Ursachen:');
      console.error(`1. Template "reservation_checkin_invitation" existiert nicht`);
      console.error('2. Template ist nicht genehmigt (Status: Pending/Rejected)');
      console.error('3. Template-Name stimmt nicht überein');
      console.error('4. Template-Parameter stimmen nicht überein');
      console.error('5. Template-Sprache stimmt nicht (aktuell: ' + (process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en') + ')');
    }
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
  }
}

testTemplateDirect();

