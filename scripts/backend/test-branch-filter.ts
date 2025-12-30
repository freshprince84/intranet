import { PrismaClient } from '@prisma/client';
import { LanguageDetectionService } from '../src/services/languageDetectionService';

const prisma = new PrismaClient();

async function testBranchFilter() {
  try {
    const phoneNumber = '+41787192338';
    const branchId = 1; // Poblado
    
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
    
    console.log('=== Test Branch-Filter ===\n');
    console.log('Suche nach:', uniqueFormats);
    console.log('Branch ID:', branchId);
    
    // 1. Prüfe User direkt
    const user = await prisma.user.findFirst({
      where: {
        OR: uniqueFormats.map(format => ({ phoneNumber: format }))
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
      console.log('\n✅ User gefunden:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Telefonnummer: ${user.phoneNumber}`);
      console.log(`  Branches: ${user.branches.length}`);
      user.branches.forEach(b => {
        console.log(`    - Branch ${b.branchId}: ${b.branch.name}`);
      });
      
      // Prüfe ob User in Branch 1 ist
      const isInBranch = user.branches.some(b => b.branchId === branchId);
      console.log(`\n  Ist in Branch ${branchId}? ${isInBranch ? '✅ JA' : '❌ NEIN'}`);
      
      // 2. Teste Query MIT Branch-Filter
      const userWithBranchFilter = await prisma.user.findFirst({
        where: {
          OR: uniqueFormats.map(format => ({ phoneNumber: format })),
          branches: {
            some: {
              branchId: branchId
            }
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true
        }
      });
      
      console.log(`\n  Query MIT Branch-Filter: ${userWithBranchFilter ? '✅ Gefunden' : '❌ Nicht gefunden'}`);
      
      // 3. Teste Rollen-Query
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          roles: {
            select: {
              roleId: true,
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            take: 1
          }
        }
      });
      
      console.log(`\n  Rollen-Query: ${userWithRoles?.roles.length || 0} Rollen gefunden`);
      if (userWithRoles?.roles && userWithRoles.roles.length > 0) {
        console.log(`    - RoleId: ${userWithRoles.roles[0].roleId}`);
      }
    } else {
      console.log('\n❌ User nicht gefunden!');
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBranchFilter();

