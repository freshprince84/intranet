/**
 * Script zum Testen des WhatsApp-Versands
 */

import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from '../src/services/whatsappService';

const prisma = new PrismaClient();

async function testWhatsAppSend(organizationId: number = 1) {
  console.log(`\n📱 Teste WhatsApp-Versand für Organisation ${organizationId}...\n`);

  try {
    const whatsappService = new WhatsAppService(organizationId);
    
    // Test-Telefonnummer (ersetze mit deiner eigenen für Tests)
    const testPhone = process.argv[3] || '+573001234567';
    
    console.log(`📞 Sende Test-Nachricht an: ${testPhone}`);
    console.log('⚠️  WICHTIG: Verwende eine echte Telefonnummer für Tests!\n');

    const testMessage = `Hola! Esta es una prueba de WhatsApp desde el sistema Intranet.
    
Si recibes este mensaje, la configuración de WhatsApp está funcionando correctamente. ✅`;

    console.log('📤 Versende Nachricht...');
    const success = await whatsappService.sendMessage(testPhone, testMessage);

    if (success) {
      console.log('\n✅ WhatsApp-Nachricht erfolgreich versendet!');
      console.log(`📱 Prüfe WhatsApp auf: ${testPhone}\n`);
    } else {
      console.log('\n❌ WhatsApp-Nachricht konnte nicht versendet werden');
      process.exit(1);
    }

    console.log('🎉 WhatsApp Test erfolgreich!\n');
  } catch (error) {
    console.error('\n❌ Fehler beim Testen:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      if (error.stack) {
        console.error(`   Stack: ${error.stack.split('\n').slice(0, 5).join('\n')}`);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const organizationId = parseInt(process.argv[2] || '1');
testWhatsAppSend(organizationId);

