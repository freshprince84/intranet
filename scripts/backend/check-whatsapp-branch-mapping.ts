import { prisma } from '../../backend/src/utils/prisma';

/**
 * Prüft WhatsApp Branch-Zuordnungen
 * 
 * Verwendung: npx ts-node scripts/backend/check-whatsapp-branch-mapping.ts
 */
async function checkBranchMappings() {
  try {
    console.log('\n=== WhatsApp Branch-Zuordnungen ===\n');
    
    // 1. Prüfe Phone Number Mappings
    console.log('1. Phone Number Mappings:');
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
      console.log('   Keine Mappings gefunden');
    } else {
      mappings.forEach(m => {
        console.log(`   - phoneNumberId: ${m.phoneNumberId} → Branch: ${m.branch.name} (ID: ${m.branchId})`);
      });
    }
    
    // 2. Prüfe Branch WhatsApp Settings
    console.log('\n2. Branch WhatsApp Settings:');
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
    
    branches.forEach(branch => {
      const settings = branch.whatsappSettings as any;
      const whatsappSettings = settings?.whatsapp || settings;
      const phoneNumberId = whatsappSettings?.phoneNumberId;
      
      if (phoneNumberId) {
        console.log(`   - Branch: ${branch.name} (ID: ${branch.id}) → phoneNumberId: ${phoneNumberId}`);
      } else {
        console.log(`   - Branch: ${branch.name} (ID: ${branch.id}) → Keine phoneNumberId`);
      }
    });
    
    // 3. Prüfe User-Branch-Zuordnungen
    console.log('\n3. User-Branch-Zuordnungen für Patrick Ammann:');
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: '+41787192338'
      },
      include: {
        branches: {
          include: {
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
      console.log(`   User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      console.log(`   Branches:`);
      user.branches.forEach(ub => {
        console.log(`     - ${ub.branch.name} (ID: ${ub.branchId})`);
      });
    } else {
      console.log('   User nicht gefunden');
    }
    
    console.log('\n=== Prüfung abgeschlossen ===\n');
    
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

checkBranchMappings();


