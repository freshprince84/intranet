/**
 * Script zum endgültigen Löschen aller Benutzer, die NICHT zu den Seed-Benutzern gehören
 * Löscht alle Benutzer außer: admin, rebeca-benitez, christina-di-biaso
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed-Benutzer (diese dürfen NICHT gelöscht werden)
const SEED_USERNAMES = ['admin', 'rebeca-benitez', 'christina-di-biaso'];

async function deleteNonSeedUsers() {
  try {
    console.log('🔍 Suche nach Benutzern, die NICHT zu Seed-Benutzern gehören...\n');

    // Finde alle Benutzer außer Seed-Benutzern
    const nonSeedUsers = await prisma.user.findMany({
      where: {
        username: {
          notIn: SEED_USERNAMES
        }
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        active: true
      }
    });

    if (nonSeedUsers.length === 0) {
      console.log('✅ Keine Benutzer gefunden (außer Seed-Benutzern).');
      return;
    }

    console.log(`📋 Gefundene Benutzer (außer Seed-Benutzern): ${nonSeedUsers.length}\n`);
    nonSeedUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.firstName} ${user.lastName}) - ID: ${user.id} - ${user.active ? 'Aktiv' : 'Inaktiv'}`);
    });

    console.log('\n⚠️  WARNUNG: Diese Operation ist ENDGÜLTIG und kann nicht rückgängig gemacht werden!');
    console.log(`   Es werden ${nonSeedUsers.length} Benutzer gelöscht (außer Seed-Benutzern).\n`);

    let deletedCount = 0;
    let errorCount = 0;

    // Hilfsfunktion für sichere Operationen
    const safeOperation = async (operation: () => Promise<any>) => {
      try {
        await operation();
      } catch (error: any) {
        if (error.message?.includes('does not exist')) {
          return;
        }
        throw error;
      }
    };

    for (const user of nonSeedUsers) {
      try {
        console.log(`\n🗑️  Lösche Benutzer: ${user.username} (ID: ${user.id})...`);

        // Führe alle Operationen ohne Transaktion aus (robuster bei fehlenden Tabellen)
        await prisma.organizationJoinRequest.deleteMany({ where: { requesterId: user.id } });
        await prisma.organizationInvitation.deleteMany({ where: { invitedBy: user.id } });
        await prisma.userRole.deleteMany({ where: { userId: user.id } });
        await prisma.usersBranches.deleteMany({ where: { userId: user.id } });
        await safeOperation(() => prisma.settings.deleteMany({ where: { userId: user.id } }));
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        await prisma.userNotificationSettings.deleteMany({ where: { userId: user.id } });
        await prisma.savedFilter.deleteMany({ where: { userId: user.id } });
        await prisma.filterGroup.deleteMany({ where: { userId: user.id } });
        await prisma.userTableSettings.deleteMany({ where: { userId: user.id } });
        await prisma.task.updateMany({ where: { responsibleId: user.id }, data: { responsibleId: null } });
        await prisma.task.updateMany({ where: { createdById: user.id }, data: { createdById: null } });
        await prisma.task.updateMany({ where: { deletedById: user.id }, data: { deletedById: null } });
        await prisma.task.updateMany({ where: { qualityControlId: user.id }, data: { qualityControlId: 1 } });
        await prisma.request.updateMany({ where: { requesterId: user.id }, data: { requesterId: 1 } });
        await prisma.request.updateMany({ where: { responsibleId: user.id }, data: { responsibleId: 1 } });
        await prisma.request.updateMany({ where: { deletedById: user.id }, data: { deletedById: null } });
        await prisma.workTime.deleteMany({ where: { userId: user.id } });
        await prisma.shift.updateMany({ where: { userId: user.id }, data: { userId: null } });
        await prisma.shift.updateMany({ where: { createdBy: user.id }, data: { createdBy: 1 } });
        await prisma.shift.updateMany({ where: { confirmedBy: user.id }, data: { confirmedBy: null } });
        await prisma.shiftSwapRequest.deleteMany({ where: { requestedBy: user.id } });
        await prisma.shiftSwapRequest.deleteMany({ where: { requestedFrom: user.id } });
        await prisma.userAvailability.deleteMany({ where: { userId: user.id } });
        await prisma.cerebroCarticle.updateMany({ where: { createdById: user.id }, data: { createdById: 1 } });
        await prisma.cerebroCarticle.updateMany({ where: { updatedById: user.id }, data: { updatedById: null } });
        await prisma.cerebroExternalLink.deleteMany({ where: { createdById: user.id } });
        await prisma.cerebroMedia.deleteMany({ where: { createdById: user.id } });
        await safeOperation(() => prisma.consultationInvoice.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.monthlyConsultationReport.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.employeePayroll.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.identificationDocument.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.invoiceSettings.deleteMany({ where: { userId: user.id } }));
        await prisma.requestStatusHistory.deleteMany({ where: { userId: user.id } });
        await prisma.taskStatusHistory.deleteMany({ where: { userId: user.id } });
        await safeOperation(() => prisma.employeeLifecycle.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.lifecycleEvent.updateMany({ where: { triggeredBy: user.id }, data: { triggeredBy: 1 } }));
        await safeOperation(() => prisma.employmentCertificate.updateMany({ where: { generatedBy: user.id }, data: { generatedBy: 1 } }));
        await safeOperation(() => prisma.employmentContract.updateMany({ where: { generatedBy: user.id }, data: { generatedBy: 1 } }));
        await safeOperation(() => prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.onboardingEvent.deleteMany({ where: { userId: user.id } }));
        await safeOperation(() => prisma.whatsAppConversation.deleteMany({ where: { userId: user.id } }));
        await prisma.tour.updateMany({ where: { createdById: user.id }, data: { createdById: null } });
        await prisma.tourBooking.deleteMany({ where: { bookedById: user.id } });
        await prisma.passwordEntry.updateMany({ where: { createdById: user.id }, data: { createdById: 1 } });
        await prisma.passwordEntryUserPermission.deleteMany({ where: { userId: user.id } });
        await prisma.passwordEntryAuditLog.deleteMany({ where: { userId: user.id } });
        await prisma.pricingRule.updateMany({ where: { createdBy: user.id }, data: { createdBy: 1 } });

        // Lösche den Benutzer selbst
        await prisma.user.delete({ where: { id: user.id } });

        deletedCount++;
        console.log(`   ✅ Benutzer ${user.username} erfolgreich gelöscht`);

      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Fehler beim Löschen von ${user.username}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Zusammenfassung:');
    console.log(`   ✅ Erfolgreich gelöscht: ${deletedCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);
    console.log(`   📋 Gesamt: ${nonSeedUsers.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteNonSeedUsers()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
