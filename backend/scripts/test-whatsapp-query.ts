import { PrismaClient } from '@prisma/client';
import { LanguageDetectionService } from '../src/services/languageDetectionService';

const prisma = new PrismaClient();

async function testQuery() {
  try {
    // Simuliere die Query aus whatsappMessageHandler
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
    
    console.log('Suche mit Formaten:', uniqueFormats);
    
    // 1. Query wie in identifyUser
    const user = await prisma.user.findFirst({
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
        lastName: true,
        email: true,
        phoneNumber: true
      }
    });
    
    console.log('\n=== User gefunden (identifyUser) ===');
    console.log(JSON.stringify(user, null, 2));
    
    if (user) {
      // 2. Query wie in handleIncomingMessage (Zeile 54-75)
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
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
            take: 1 // Erste Rolle für Berechtigungsprüfung
          }
        }
      });
      
      console.log('\n=== User mit Rollen (handleIncomingMessage) ===');
      console.log(JSON.stringify(userWithRoles, null, 2));
      console.log(`\nAnzahl Rollen: ${userWithRoles?.roles.length || 0}`);
      
      if (userWithRoles?.roles && userWithRoles.roles.length > 0) {
        const roleId = userWithRoles.roles[0].roleId;
        console.log(`\n✅ roleId gefunden: ${roleId}`);
      } else {
        console.log('\n❌ roleId ist null!');
      }
      
      // 3. Teste ohne take: 1
      const userWithAllRoles = await prisma.user.findUnique({
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
            }
          }
        }
      });
      
      console.log('\n=== User mit ALLEN Rollen (ohne take: 1) ===');
      console.log(`Anzahl Rollen: ${userWithAllRoles?.roles.length || 0}`);
      if (userWithAllRoles?.roles && userWithAllRoles.roles.length > 0) {
        userWithAllRoles.roles.forEach(r => {
          console.log(`  - RoleId: ${r.roleId}, Name: ${r.role.name}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();

