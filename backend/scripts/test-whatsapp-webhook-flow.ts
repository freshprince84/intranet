import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings } from '../src/utils/encryption';
import { LanguageDetectionService } from '../src/services/languageDetectionService';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Test: Simuliere WhatsApp Webhook Flow
 * 
 * Prüft:
 * 1. Branch-Identifikation via Phone Number ID
 * 2. User-Identifikation via Telefonnummer
 * 3. Message Handler Flow
 */

async function testWhatsAppWebhookFlow() {
  try {
    console.log('🔍 Test: WhatsApp Webhook Flow\n');
    console.log('='.repeat(60));

    // Simuliere eingehende Nachricht
    const fromNumber = '+41787192338'; // User Nummer
    const messageText = 'request';
    const phoneNumberId = '852832151250618'; // Phone Number ID der Empfänger-Nummer

    console.log('\n📨 Simulierte eingehende Nachricht:');
    console.log(`   - Von: ${fromNumber}`);
    console.log(`   - Text: ${messageText}`);
    console.log(`   - Phone Number ID: ${phoneNumberId}`);

    // 1. Branch-Identifikation
    console.log('\n\n1. Branch-Identifikation:');
    console.log('-'.repeat(60));
    
    // Prüfe Phone Number Mapping
    const mapping = await prisma.whatsAppPhoneNumberMapping.findFirst({
      where: { phoneNumberId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            whatsappSettings: true
          }
        }
      }
    });

    let branchId: number | null = null;

    if (mapping) {
      console.log(`✅ Branch via Mapping gefunden: ${mapping.branch.name} (ID: ${mapping.branchId})`);
      branchId = mapping.branchId;
    } else {
      console.log(`⚠️  Kein Mapping gefunden, prüfe Branch Settings...`);
      
      // Prüfe Branch Settings
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

      for (const branch of branches) {
        if (branch.whatsappSettings) {
          const settings = branch.whatsappSettings as any;
          if (settings.phoneNumberId === phoneNumberId) {
            console.log(`✅ Branch via Settings gefunden: ${branch.name} (ID: ${branch.id})`);
            branchId = branch.id;
            break;
          }
        }
      }

      if (!branchId) {
        console.log(`❌ Kein Branch mit Phone Number ID ${phoneNumberId} gefunden!`);
        console.log(`\n   Verfügbare Branches mit WhatsApp Settings:`);
        for (const branch of branches) {
          if (branch.whatsappSettings) {
            const settings = branch.whatsappSettings as any;
            console.log(`   - ${branch.name} (ID: ${branch.id}): Phone Number ID = ${settings.phoneNumberId || 'nicht gesetzt'}`);
          }
        }
        return;
      }
    }

    // 2. User-Identifikation
    console.log('\n\n2. User-Identifikation:');
    console.log('-'.repeat(60));
    
    // Normalisiere Telefonnummer
    const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(fromNumber);
    console.log(`   - Normalisierte Telefonnummer: ${normalizedPhone}`);

    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        branches: {
          some: {
            branchId: branchId
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        branches: {
          where: {
            branchId: branchId
          },
          select: {
            branchId: true
          }
        }
      }
    });

    if (user) {
      console.log(`✅ User gefunden: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      console.log(`   - Telefonnummer: ${user.phoneNumber}`);
      console.log(`   - Ist dem Branch zugeordnet: ${user.branches.length > 0 ? 'Ja' : 'Nein'}`);
    } else {
      console.log(`❌ Kein User mit Telefonnummer ${normalizedPhone} gefunden!`);
      console.log(`   Prüfe Varianten...`);
      
      // Prüfe Varianten
      const variants = [
        fromNumber,
        normalizedPhone,
        fromNumber.replace('+', ''),
        fromNumber.replace('+', '00')
      ];

      for (const variant of variants) {
        const foundUser = await prisma.user.findFirst({
          where: {
            phoneNumber: { contains: variant.replace(/[\s-]/g, '') }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        });
        
        if (foundUser) {
          console.log(`   ⚠️  Ähnliche Telefonnummer gefunden: ${foundUser.phoneNumber} (User: ${foundUser.firstName} ${foundUser.lastName})`);
        }
      }

      // Prüfe ob User im Branch ist
      const userInBranch = await prisma.user.findFirst({
        where: {
          phoneNumber: normalizedPhone
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          branches: {
            select: {
              branchId: true,
              branch: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      if (userInBranch) {
        console.log(`\n   ⚠️  User gefunden, aber nicht im Branch ${branchId}:`);
        console.log(`   - User Branches:`);
        for (const userBranch of userInBranch.branches) {
          console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branchId})`);
        }
      }
    }

    // 3. Message Handler Test
    console.log('\n\n3. Message Handler Test:');
    console.log('-'.repeat(60));
    
    if (!branchId) {
      console.log('❌ Kann nicht testen - Branch nicht gefunden');
      return;
    }

    if (!user) {
      console.log('⚠️  User nicht gefunden - Message Handler wird User-Identifikation versuchen');
    }

    console.log(`\n✅ Webhook Flow sollte funktionieren:`);
    console.log(`   - Branch ID: ${branchId}`);
    console.log(`   - User ID: ${user?.id || 'wird identifiziert'}`);
    console.log(`   - Message Text: ${messageText}`);
    console.log(`   - Normalisierte Phone: ${normalizedPhone}`);

    // 4. Prüfe WhatsApp Settings
    console.log('\n\n4. WhatsApp Settings Check:');
    console.log('-'.repeat(60));
    
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        whatsappSettings: true
      }
    });

    if (branch?.whatsappSettings) {
      const settings = branch.whatsappSettings as any;
      console.log(`✅ WhatsApp Settings vorhanden`);
      console.log(`   - Provider: ${settings.provider || 'nicht gesetzt'}`);
      console.log(`   - API Key vorhanden: ${!!settings.apiKey}`);
      console.log(`   - Phone Number ID: ${settings.phoneNumberId || 'nicht gesetzt'}`);
      
      // Versuche zu entschlüsseln
      try {
        const decrypted = decryptApiSettings({ whatsapp: settings } as any);
        const decryptedWhatsapp = decrypted?.whatsapp || decrypted;
        if (decryptedWhatsapp?.apiKey) {
          console.log(`   ✅ Entschlüsselung erfolgreich`);
        }
      } catch (error) {
        console.log(`   ⚠️  Entschlüsselung fehlgeschlagen (vermutlich unverschlüsselt)`);
      }
    } else {
      console.log(`❌ Keine WhatsApp Settings im Branch gefunden!`);
    }

    console.log('\n✅ Test abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testWhatsAppWebhookFlow();

