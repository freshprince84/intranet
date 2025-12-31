import { prisma } from '../../backend/src/utils/prisma';
import { LanguageDetectionService } from '../../backend/src/services/languageDetectionService';
import { logger } from '../../backend/src/utils/logger';

/**
 * Debug-Script: Prüft warum User-Identifikation fehlschlägt
 * 
 * Verwendung: npx ts-node scripts/backend/debug-whatsapp-user-identification.ts
 */
async function debugUserIdentification() {
  try {
    const phoneNumber = '+41787192338';
    
    console.log('\n=== WhatsApp User-Identifikation Debug ===\n');
    console.log('Gesuchte Telefonnummer:', phoneNumber);
    
    // 1. Normalisiere Telefonnummer
    const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
    const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.substring(1) : normalizedPhone;
    const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
    
    const searchFormats = [
      normalizedPhone,
      phoneWithoutPlus,
      phoneWithPlus,
      phoneNumber,
      phoneNumber.replace(/[\s-]/g, ''),
    ];
    
    const uniqueFormats = [...new Set(searchFormats)];
    
    console.log('\n1. Normalisierte Formate:');
    uniqueFormats.forEach(format => console.log(`   - "${format}"`));
    
    // 2. Suche User mit dieser Telefonnummer (ohne Branch-Filter)
    console.log('\n2. Suche User in Datenbank (ohne Branch-Filter):');
    const userWithoutBranch = await prisma.user.findFirst({
      where: {
        OR: uniqueFormats.map(format => ({ phoneNumber: format }))
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
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
      console.log('   ✅ User gefunden!');
      console.log(`   - ID: ${userWithoutBranch.id}`);
      console.log(`   - Name: ${userWithoutBranch.firstName} ${userWithoutBranch.lastName}`);
      console.log(`   - Email: ${userWithoutBranch.email}`);
      console.log(`   - Telefonnummer in DB: "${userWithoutBranch.phoneNumber}"`);
      console.log(`   - Branches:`, userWithoutBranch.branches.map(b => `${b.branch.name} (ID: ${b.branchId})`).join(', '));
      
      // 3. Prüfe alle Branches
      console.log('\n3. Alle Branches im System:');
      const allBranches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          organizationId: true
        }
      });
      
      allBranches.forEach(branch => {
        const isInBranch = userWithoutBranch.branches.some(b => b.branchId === branch.id);
        console.log(`   ${isInBranch ? '✅' : '❌'} Branch: ${branch.name} (ID: ${branch.id})`);
      });
      
      // 4. Teste Suche mit verschiedenen Branch-IDs
      console.log('\n4. Teste Suche mit verschiedenen Branch-IDs:');
      for (const branch of allBranches) {
        const userInBranch = await prisma.user.findFirst({
          where: {
            OR: uniqueFormats.map(format => ({ phoneNumber: format })),
            branches: {
              some: {
                branchId: branch.id
              }
            }
          },
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        });
        
        console.log(`   ${userInBranch ? '✅' : '❌'} Branch ${branch.name} (ID: ${branch.id}): ${userInBranch ? `User gefunden (${userInBranch.firstName} ${userInBranch.lastName})` : 'User NICHT gefunden'}`);
      }
      
      // 5. Prüfe exakte Telefonnummer-Übereinstimmung
      console.log('\n5. Prüfe exakte Telefonnummer-Übereinstimmung:');
      for (const format of uniqueFormats) {
        const exactMatch = await prisma.user.findFirst({
          where: {
            phoneNumber: format
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        });
        
        if (exactMatch) {
          console.log(`   ✅ Format "${format}": User gefunden (${exactMatch.firstName} ${exactMatch.lastName}, DB: "${exactMatch.phoneNumber}")`);
        } else {
          console.log(`   ❌ Format "${format}": Kein User gefunden`);
        }
      }
      
    } else {
      console.log('   ❌ Kein User mit dieser Telefonnummer gefunden!');
      
      // Zeige alle User mit Telefonnummern
      console.log('\n   Verfügbare User mit Telefonnummern:');
      const allUsers = await prisma.user.findMany({
        where: {
          phoneNumber: { not: null }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true
        },
        take: 20
      });
      
      allUsers.forEach(u => {
        console.log(`   - ${u.firstName} ${u.lastName}: "${u.phoneNumber}"`);
      });
    }
    
    console.log('\n=== Debug abgeschlossen ===\n');
    
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

debugUserIdentification();

