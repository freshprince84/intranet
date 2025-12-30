import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixUserBranchMapping() {
  try {
    console.log('🔧 Korrigiere User-Branch Mapping\n');
    console.log('='.repeat(60));

    // 1. Finde User
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: '+41787192338'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                whatsappSettings: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error('User mit Telefonnummer +41787192338 nicht gefunden');
    }

    console.log(`✅ User gefunden: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    console.log(`   - Telefonnummer: ${user.phoneNumber}`);
    console.log(`   - Aktuelle Branches:`);
    for (const userBranch of user.branches) {
      const hasWhatsApp = !!userBranch.branch.whatsappSettings;
      console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branch.id}) ${hasWhatsApp ? '✅ (hat WhatsApp)' : '❌ (kein WhatsApp)'}`);
    }

    // 2. Finde Branch mit WhatsApp Settings
    const branchWithWhatsApp = await prisma.branch.findFirst({
      where: {
        whatsappSettings: { not: null }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!branchWithWhatsApp) {
      throw new Error('Kein Branch mit WhatsApp Settings gefunden');
    }

    console.log(`\n✅ Branch mit WhatsApp Settings: ${branchWithWhatsApp.name} (ID: ${branchWithWhatsApp.id})`);

    // 3. Prüfe ob User bereits diesem Branch zugeordnet ist
    const isAlreadyAssigned = user.branches.some(ub => ub.branchId === branchWithWhatsApp.id);

    if (isAlreadyAssigned) {
      console.log(`\n✅ User ist bereits dem Branch ${branchWithWhatsApp.name} zugeordnet`);
    } else {
      console.log(`\n⚠️  User ist NICHT dem Branch ${branchWithWhatsApp.name} zugeordnet`);
      console.log(`   → Füge User zum Branch hinzu...`);

      // Füge User zum Branch hinzu
      await prisma.usersBranches.create({
        data: {
          userId: user.id,
          branchId: branchWithWhatsApp.id
        }
      });

      console.log(`✅ User zum Branch ${branchWithWhatsApp.name} hinzugefügt`);
    }

    // 4. Verifiziere
    console.log('\n4. Verifiziere...');
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        branches: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                whatsappSettings: true
              }
            }
          }
        }
      }
    });

    if (updatedUser) {
      console.log(`   - User Branches:`);
      for (const userBranch of updatedUser.branches) {
        const hasWhatsApp = !!userBranch.branch.whatsappSettings;
        console.log(`     - ${userBranch.branch.name} (ID: ${userBranch.branch.id}) ${hasWhatsApp ? '✅ (hat WhatsApp)' : ''}`);
      }
    }

    console.log('\n✅ Mapping korrigiert!\n');

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

fixUserBranchMapping();

