import { prisma } from '../../backend/src/utils/prisma';
import { LanguageDetectionService } from '../../backend/src/services/languageDetectionService';
import { WhatsAppMessageHandler } from '../../backend/src/services/whatsappMessageHandler';

/**
 * Test-Script: Prüft User-Identifikation für WhatsApp
 * 
 * Verwendung: npx ts-node scripts/backend/test-whatsapp-user-identification.ts
 */
async function testUserIdentification() {
  try {
    const phoneNumber = '+41787192338';
    const branchId = 2; // Manila (User ist in diesem Branch)
    
    console.log('\n=== WhatsApp User-Identifikation Test ===\n');
    console.log('Telefonnummer:', phoneNumber);
    console.log('Branch ID:', branchId);
    
    // Test: Identifiziere User
    const user = await (WhatsAppMessageHandler as any).identifyUser(phoneNumber, branchId);
    
    if (user) {
      console.log('\n✅ User identifiziert!');
      console.log(`- ID: ${user.id}`);
      console.log(`- Name: ${user.firstName} ${user.lastName}`);
      console.log(`- Email: ${user.email}`);
      console.log(`- Telefonnummer: ${user.phoneNumber}`);
    } else {
      console.log('\n❌ User NICHT identifiziert!');
      
      // Prüfe warum
      const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
      const userWithoutBranch = await prisma.user.findFirst({
        where: {
          OR: [
            { phoneNumber: normalizedPhone },
            { phoneNumber: phoneNumber.replace('+', '') },
            { phoneNumber: `+${phoneNumber.replace('+', '')}` }
          ]
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
      
      if (userWithoutBranch) {
        console.log('\n⚠️ User existiert, aber nicht im Branch!');
        console.log(`- User ID: ${userWithoutBranch.id}`);
        console.log(`- Name: ${userWithoutBranch.firstName} ${userWithoutBranch.lastName}`);
        console.log(`- Telefonnummer: ${userWithoutBranch.phoneNumber}`);
        console.log(`- Branches:`, userWithoutBranch.branches.map(b => `${b.branch.name} (ID: ${b.branchId})`).join(', '));
        console.log(`- Gesuchter Branch: ${branchId}`);
      } else {
        console.log('\n❌ User existiert nicht in Datenbank!');
      }
    }
    
    console.log('\n=== Test abgeschlossen ===\n');
    
  } catch (error) {
    console.error('Fehler:', error);
    if (error instanceof Error) {
      console.error('Fehlermeldung:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testUserIdentification();


