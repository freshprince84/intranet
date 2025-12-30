import { WhatsAppService } from '../src/services/whatsappService';

async function testWhatsAppSendDirect() {
  try {
    console.log('\n=== TEST: WhatsApp direkt senden ===\n');

    const testPhone = '+41787192338';
    const testMessage = 'Test-Nachricht vom Diagnose-Script';

    console.log(`Telefonnummer: ${testPhone}`);
    console.log(`Nachricht: ${testMessage}`);
    console.log('');

    const whatsappService = new WhatsAppService(1);
    
    console.log('Versuche Session Message zu senden...');
    const result = await whatsappService.sendMessage(testPhone, testMessage);
    
    if (result) {
      console.log('✅ Nachricht erfolgreich gesendet!');
    } else {
      console.log('❌ Nachricht konnte nicht gesendet werden (sendMessage gab false zurück)');
    }

    console.log('\n=== TEST ABGESCHLOSSEN ===\n');

  } catch (error) {
    console.error('\n❌ FEHLER beim Test:');
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Fehlertyp:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Fehlermeldung:', errorMessage);
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack Trace:');
      console.error(error.stack);
    }
  }
}

testWhatsAppSendDirect();

