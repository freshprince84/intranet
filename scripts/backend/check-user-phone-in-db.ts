import { PrismaClient } from '@prisma/client';
import { LanguageDetectionService } from '../../backend/src/services/languageDetectionService';

const prisma = new PrismaClient();

async function checkUserPhone() {
  try {
    const userPhone = '+41787192338';
    const branchId = 2; // Manila

    console.log('=== WhatsApp User-Identifikation DB-Prüfung ===\n');
    console.log('Gesuchte Telefonnummer:', userPhone);
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
    
    const uniqueFormats = [...new Set(searchFormats)].filter(f => f && f.length > 0);
    
    console.log('Normalisierte Telefonnummer:', normalizedPhone);
    console.log('Suchformate:', uniqueFormats);
    console.log('');

    // 2. Prüfe User in DB - EXAKTE Suche
    console.log('=== EXAKTE SUCHE ===');
    const userExact = await prisma.user.findFirst({
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

    if (userExact) {
      console.log('✅ User gefunden (exakt):');
      console.log('  ID:', userExact.id);
      console.log('  Name:', `${userExact.firstName} ${userExact.lastName}`);
      console.log('  Email:', userExact.email);
      console.log('  Telefonnummer in DB:', userExact.phoneNumber);
      console.log('  Branches:', userExact.branches.map(b => `${b.branch.name} (ID: ${b.branchId})`).join(', '));
      console.log('');

      // Prüfe ob User im Branch ist
      const isInBranch = userExact.branches.some(b => b.branchId === branchId);
      if (isInBranch) {
        console.log('✅ User ist im Branch Manila (ID: 2)');
      } else {
        console.log('⚠️  User ist NICHT im Branch Manila (ID: 2)');
        console.log('   User ist in:', userExact.branches.map(b => b.branch.name).join(', '));
      }
    } else {
      console.log('❌ User NICHT gefunden mit exakter Suche!');
    }

    // 3. Prüfe ALLE User mit Telefonnummern
    console.log('\n=== ALLE USER MIT TELEFONNUMMERN ===');
    const allUsers = await prisma.user.findMany({
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
      },
      orderBy: {
        id: 'asc'
      }
    });
    
    console.log(`Gefunden: ${allUsers.length} User mit Telefonnummern\n`);
    
    // Suche nach ähnlichen Telefonnummern
    const similarUsers = allUsers.filter(u => {
      if (!u.phoneNumber) return false;
      const userPhoneNormalized = LanguageDetectionService.normalizePhoneNumber(u.phoneNumber);
      return userPhoneNormalized.includes('41787192338') || 
             '41787192338'.includes(userPhoneNormalized.replace(/\+/g, ''));
    });

    if (similarUsers.length > 0) {
      console.log('🔍 Ähnliche Telefonnummern gefunden:');
      similarUsers.forEach(u => {
        console.log(`  - ${u.firstName} ${u.lastName} (ID: ${u.id}): "${u.phoneNumber}"`);
        console.log(`    Branches: ${u.branches.map(b => b.branch.name).join(', ')}`);
      });
    }

    // Zeige alle User (erste 20)
    console.log('\n📋 Alle User mit Telefonnummern (erste 20):');
    allUsers.slice(0, 20).forEach(u => {
      const normalized = LanguageDetectionService.normalizePhoneNumber(u.phoneNumber || '');
      const matches = uniqueFormats.some(f => f === normalized || f === u.phoneNumber);
      const marker = matches ? ' ⭐' : '';
      console.log(`  ${u.id}: ${u.firstName} ${u.lastName} - "${u.phoneNumber}" (normalisiert: "${normalized}")${marker}`);
    });

    // 4. Prüfe Branch Manila WhatsApp Mapping
    console.log('\n=== BRANCH MANILA WHATSAPP MAPPING ===');
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

    // 5. Prüfe alle WhatsApp Phone Number Mappings
    console.log('\n=== ALLE WHATSAPP PHONE NUMBER MAPPINGS ===');
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

    if (allMappings.length > 0) {
      allMappings.forEach(m => {
        console.log(`  ${m.phoneNumberId} -> ${m.branch.name} (ID: ${m.branchId})${m.isPrimary ? ' [PRIMARY]' : ''}`);
      });
    } else {
      console.log('  Keine Mappings gefunden');
    }

    // 6. Prüfe WhatsApp Conversations für diese Telefonnummer
    console.log('\n=== WHATSAPP CONVERSATIONS ===');
    const conversations = await prisma.whatsAppConversation.findMany({
      where: {
        OR: uniqueFormats.map(format => ({ phoneNumber: format }))
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (conversations.length > 0) {
      console.log(`Gefunden: ${conversations.length} Conversations\n`);
      conversations.forEach(c => {
        console.log(`  Conversation ID: ${c.id}`);
        console.log(`    Phone: "${c.phoneNumber}"`);
        console.log(`    Branch: ${c.branch.name} (ID: ${c.branchId})`);
        console.log(`    User: ${c.user ? `${c.user.firstName} ${c.user.lastName} (ID: ${c.user.id})` : 'NICHT ZUGEWIESEN'}`);
        console.log(`    State: ${c.state}`);
        console.log('');
      });
    } else {
      console.log('  Keine Conversations gefunden');
    }

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserPhone();

