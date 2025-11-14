import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Debug-Script für WhatsApp Webhook
 * 
 * Prüft:
 * 1. Branch WhatsApp Settings
 * 2. Phone Number ID Mapping
 * 3. User-Identifikation via Telefonnummer
 * 4. Branch-Identifikation via Phone Number ID
 */

async function debugWhatsAppWebhook() {
  try {
    console.log('🔍 WhatsApp Webhook Debugging\n');
    console.log('='.repeat(60));

    // 1. Prüfe alle Branches mit WhatsApp Settings
    console.log('\n1. Branches mit WhatsApp Settings:');
    console.log('-'.repeat(60));
    
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

    if (branches.length === 0) {
      console.log('❌ Keine Branches mit WhatsApp Settings gefunden!');
    } else {
      for (const branch of branches) {
        console.log(`\n✅ Branch: ${branch.name} (ID: ${branch.id})`);
        if (branch.whatsappSettings) {
          const settings = branch.whatsappSettings as any;
          console.log(`   - Provider: ${settings.provider || 'nicht gesetzt'}`);
          console.log(`   - Phone Number ID: ${settings.phoneNumberId || 'nicht gesetzt'}`);
          console.log(`   - API Key vorhanden: ${!!settings.apiKey}`);
          if (settings.apiKey) {
            const apiKeyStr = String(settings.apiKey);
            console.log(`   - API Key Länge: ${apiKeyStr.length} Zeichen`);
            console.log(`   - API Key Format: ${apiKeyStr.includes(':') ? 'Verschlüsselt' : 'Unverschlüsselt'}`);
          }
        }
      }
    }

    // 2. Prüfe Phone Number Mappings
    console.log('\n\n2. Phone Number Mappings:');
    console.log('-'.repeat(60));
    
    const mappings = await prisma.whatsAppPhoneNumberMapping.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (mappings.length === 0) {
      console.log('⚠️  Keine Phone Number Mappings gefunden');
      console.log('   (Das ist OK, wenn die Phone Number ID direkt in Branch Settings gespeichert ist)');
    } else {
      for (const mapping of mappings) {
        console.log(`\n✅ Phone Number ID: ${mapping.phoneNumberId}`);
        console.log(`   - Branch: ${mapping.branch.name} (ID: ${mapping.branchId})`);
        console.log(`   - Is Primary: ${mapping.isPrimary}`);
      }
    }

    // 3. Prüfe User mit Telefonnummer
    console.log('\n\n3. User mit Telefonnummer:');
    console.log('-'.repeat(60));
    
    const usersWithPhone = await prisma.user.findMany({
      where: {
        phoneNumber: { not: null }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
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

    if (usersWithPhone.length === 0) {
      console.log('❌ Keine User mit Telefonnummer gefunden!');
    } else {
      for (const user of usersWithPhone) {
        console.log(`\n✅ User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
        console.log(`   - Telefonnummer: ${user.phoneNumber}`);
        console.log(`   - Branches:`);
        if (user.branches.length === 0) {
          console.log(`     ⚠️  Keine Branches zugeordnet!`);
        } else {
          for (const userBranch of user.branches) {
            console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branchId})`);
          }
        }
      }
    }

    // 4. Test: Branch-Identifikation via Phone Number ID
    console.log('\n\n4. Test: Branch-Identifikation via Phone Number ID:');
    console.log('-'.repeat(60));
    
    // Beispiel Phone Number ID (kann als Argument übergeben werden)
    const testPhoneNumberId = process.argv[2];
    
    if (testPhoneNumberId) {
      console.log(`\n🔍 Teste Branch-Identifikation für Phone Number ID: ${testPhoneNumberId}`);
      
      // Prüfe Mapping
      const mapping = await prisma.whatsAppPhoneNumberMapping.findFirst({
        where: { phoneNumberId: testPhoneNumberId },
        include: {
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (mapping) {
        console.log(`✅ Branch via Mapping gefunden: ${mapping.branch.name} (ID: ${mapping.branchId})`);
      } else {
        console.log(`⚠️  Kein Mapping gefunden, prüfe Branch Settings...`);
        
        // Prüfe Branch Settings
        const branchesWithPhoneId = await prisma.branch.findMany({
          where: {
            whatsappSettings: { not: null }
          },
          select: {
            id: true,
            name: true,
            whatsappSettings: true
          }
        });

        let found = false;
        for (const branch of branchesWithPhoneId) {
          if (branch.whatsappSettings) {
            const settings = branch.whatsappSettings as any;
            if (settings.phoneNumberId === testPhoneNumberId) {
              console.log(`✅ Branch via Settings gefunden: ${branch.name} (ID: ${branch.id})`);
              found = true;
              break;
            }
          }
        }

        if (!found) {
          console.log(`❌ Kein Branch mit dieser Phone Number ID gefunden!`);
        }
      }
    } else {
      console.log('⚠️  Keine Phone Number ID zum Testen angegeben');
      console.log('   Verwendung: npx ts-node scripts/debug-whatsapp-webhook.ts <phoneNumberId>');
    }

    // 5. Test: User-Identifikation via Telefonnummer
    console.log('\n\n5. Test: User-Identifikation via Telefonnummer:');
    console.log('-'.repeat(60));
    
    const testPhoneNumber = process.argv[3] || '+41787192338';
    console.log(`\n🔍 Teste User-Identifikation für Telefonnummer: ${testPhoneNumber}`);
    
    // Normalisiere Telefonnummer
    const normalizedPhone = testPhoneNumber.replace(/[\s-]/g, '');
    const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : '+' + normalizedPhone;
    
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: phoneWithPlus
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
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

    if (user) {
      console.log(`✅ User gefunden: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      console.log(`   - Telefonnummer: ${user.phoneNumber}`);
      console.log(`   - Branches:`);
      if (user.branches.length === 0) {
        console.log(`     ⚠️  Keine Branches zugeordnet!`);
      } else {
        for (const userBranch of user.branches) {
          console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branchId})`);
        }
      }
    } else {
      console.log(`❌ Kein User mit Telefonnummer ${phoneWithPlus} gefunden!`);
      console.log(`   Prüfe auch Varianten:`);
      
      // Prüfe Varianten
      const variants = [
        testPhoneNumber,
        normalizedPhone,
        phoneWithPlus,
        testPhoneNumber.replace('+', ''),
        testPhoneNumber.replace('+', '00')
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
    }

    // 6. Zusammenfassung
    console.log('\n\n' + '='.repeat(60));
    console.log('📋 Zusammenfassung:');
    console.log('-'.repeat(60));
    console.log(`✅ Branches mit WhatsApp Settings: ${branches.length}`);
    console.log(`✅ Phone Number Mappings: ${mappings.length}`);
    console.log(`✅ User mit Telefonnummer: ${usersWithPhone.length}`);
    
    if (branches.length === 0) {
      console.log('\n⚠️  WICHTIG: Keine Branches mit WhatsApp Settings gefunden!');
      console.log('   → Gehe zu Branch-Verwaltung und konfiguriere WhatsApp Settings für den Branch');
    }
    
    if (usersWithPhone.length === 0) {
      console.log('\n⚠️  WICHTIG: Keine User mit Telefonnummer gefunden!');
      console.log('   → User müssen ihre Telefonnummer im Profil speichern');
    }

    console.log('\n✅ Debugging abgeschlossen!\n');

  } catch (error) {
    console.error('❌ Fehler beim Debugging:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
debugWhatsAppWebhook();

