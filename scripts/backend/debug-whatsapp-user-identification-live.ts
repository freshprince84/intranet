import { PrismaClient } from '@prisma/client';
import { LanguageDetectionService } from '../../backend/src/services/languageDetectionService';

const prisma = new PrismaClient();

async function debugUserIdentification() {
  try {
    const userPhone = '+41787192338';
    const branchId = 2; // Manila

    console.log('=== WhatsApp User-Identifikation Debug ===\n');
    console.log('User Telefonnummer:', userPhone);
    console.log('Branch ID:', branchId, '(Manila)\n');

    // 1. Normalisiere Telefonnummer
    const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(userPhone);
    const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.substring(1) : normalizedPhone;
    const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
    
    const searchFormats = [
      normalizedPhone,
      phoneWithoutPlus,
      phoneWithPlus,
      userPhone,
      userPhone.replace(/[\s-]/g, ''),
    ];
    
    const uniqueFormats = [...new Set(searchFormats)];
    
    console.log('Normalisierte Telefonnummer:', normalizedPhone);
    console.log('Suchformate:', uniqueFormats);
    console.log('');

    // 2. Prüfe User in DB
    const user = await prisma.user.findFirst({
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

    if (!user) {
      console.log('❌ User NICHT gefunden!');
      console.log('\nPrüfe alle User mit Telefonnummern:');
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
        console.log(`  - ${u.firstName} ${u.lastName}: ${u.phoneNumber}`);
      });
    } else {
      console.log('✅ User gefunden:');
      console.log('  ID:', user.id);
      console.log('  Name:', `${user.firstName} ${user.lastName}`);
      console.log('  Email:', user.email);
      console.log('  Telefonnummer in DB:', user.phoneNumber);
      console.log('  Branches:', user.branches.map(b => `${b.branch.name} (ID: ${b.branchId})`).join(', '));
      console.log('');

      // 3. Prüfe ob User im Branch ist
      const isInBranch = user.branches.some(b => b.branchId === branchId);
      if (isInBranch) {
        console.log('✅ User ist im Branch Manila (ID: 2)');
      } else {
        console.log('⚠️  User ist NICHT im Branch Manila (ID: 2)');
        console.log('   User ist in:', user.branches.map(b => b.branch.name).join(', '));
      }
    }

    console.log('\n=== Branch Manila WhatsApp Mapping ===');
    const branchManila = await prisma.branch.findUnique({
      where: { id: 2 },
      select: {
        id: true,
        name: true,
        whatsappSettings: true,
        phoneNumberMappings: {
          select: {
            phoneNumberId: true,
            isPrimary: true
          }
        }
      }
    });

    if (branchManila) {
      console.log('Branch:', branchManila.name);
      console.log('WhatsApp Settings:', JSON.stringify(branchManila.whatsappSettings, null, 2));
      console.log('Phone Number Mappings:', branchManila.phoneNumberMappings);
    }

    // 4. Prüfe alle WhatsApp Phone Number Mappings
    console.log('\n=== Alle WhatsApp Phone Number Mappings ===');
    const allMappings = await prisma.whatsAppPhoneNumberMapping.findMany({
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    allMappings.forEach(m => {
      console.log(`  ${m.phoneNumberId} -> ${m.branch.name} (ID: ${m.branchId})${m.isPrimary ? ' [PRIMARY]' : ''}`);
    });

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserIdentification();

