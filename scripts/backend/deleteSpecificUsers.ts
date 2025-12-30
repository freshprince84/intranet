/**
 * Script zum endgültigen Löschen spezifischer Benutzer
 * Löscht genau die angegebenen Benutzer inkl. aller zugehörigen Daten
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Liste der zu löschenden Benutzernamen (aus den Screenshots)
const USERS_TO_DELETE = [
  'Beatriz',
  'alejandromv20',
  'Laura',
  'JustinLondonoC',
  'Martina',
  'Katherine09',
  'Pat2',
  'Manuelaflor',
  'Yessicaasprilla',
  'joseraulsp',
  'Alejohd4224',
  'MariaFernanda',
  'Fulano',
  'Santiago',
  'Issa',
  'Elenabaptista',
  'Sara',
  'vielsapi',
  'YeidyR20',
  'AEROTUREX',
  'Valley2025',
  'ValleySpanish',
  'Laura_Junod',
  'Rumbaysalsa',
  'carolina27',
  'Tatiana',
  'Camila',
  'JuanYela',
  'Melissa',
  'Sofia',
  'CristianVLO',
  'Geraltriana04',
  'Paolarojas',
  'Angyrios',
  'wilkindata',
  'Manuela',
  'Gloria',
  'Sebastian',
  'Pao',
  'Moni',
  'Gilmaryleal',
  'Mariar',
  'majo27',
  'Johana',
  'Efrainz',
  'AdrianAvila',
  'Elemilio11',
  'Melisa',
  'Monica',
  'MauricioBula',
  'Mbalzan',
  'and22',
  'Luis',
  'Favio',
  'SebastianHiguita',
  'Claralondonop',
  'Mariangel0515'
];

async function deleteSpecificUsers() {
  try {
    console.log('🔍 Suche nach spezifischen Benutzern zum Löschen...\n');

    // Finde alle Benutzer mit den angegebenen Usernames
    const usersToDelete = await prisma.user.findMany({
      where: {
        username: {
          in: USERS_TO_DELETE
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

    if (usersToDelete.length === 0) {
      console.log('✅ Keine der angegebenen Benutzer gefunden.');
      return;
    }

    console.log(`📋 Gefundene Benutzer zum Löschen: ${usersToDelete.length} von ${USERS_TO_DELETE.length}\n`);
    usersToDelete.forEach(user => {
      console.log(`   - ${user.username} (${user.firstName} ${user.lastName}) - ID: ${user.id} - Active: ${user.active}`);
    });

    const notFound = USERS_TO_DELETE.filter(username => 
      !usersToDelete.some(u => u.username === username)
    );
    if (notFound.length > 0) {
      console.log(`\n⚠️  Nicht gefundene Benutzer (${notFound.length}):`);
      notFound.forEach(username => console.log(`   - ${username}`));
    }

    console.log('\n⚠️  WARNUNG: Diese Operation ist ENDGÜLTIG und kann nicht rückgängig gemacht werden!');
    console.log('   Es werden alle zugehörigen Daten gelöscht.\n');

    let deletedCount = 0;
    let errorCount = 0;

    // Hilfsfunktion für sichere Operationen
    const safeOperation = async (operation: () => Promise<any>, name: string) => {
      try {
        await operation();
      } catch (error: any) {
        if (error.message?.includes('does not exist')) {
          return;
        }
        throw error;
      }
    };

    for (const user of usersToDelete) {
      try {
        console.log(`\n🗑️  Lösche Benutzer: ${user.username} (ID: ${user.id})...`);

        // 1. Organisation-bezogene Abhängigkeiten
        await prisma.organizationJoinRequest.deleteMany({
          where: { requesterId: user.id }
        });
        await prisma.organizationInvitation.deleteMany({
          where: { invitedBy: user.id }
        });

        // 2. Rollen und Branches
        await prisma.userRole.deleteMany({
          where: { userId: user.id }
        });
        await prisma.usersBranches.deleteMany({
          where: { userId: user.id }
        });

        // 3. Einstellungen und Benachrichtigungen
        await safeOperation(() => prisma.settings.deleteMany({ where: { userId: user.id } }), 'Settings');
        await prisma.notification.deleteMany({ where: { userId: user.id } });
        await prisma.userNotificationSettings.deleteMany({ where: { userId: user.id } });

        // 4. Filter und Tabelleneinstellungen
        await prisma.savedFilter.deleteMany({ where: { userId: user.id } });
        await prisma.filterGroup.deleteMany({ where: { userId: user.id } });
        await prisma.userTableSettings.deleteMany({ where: { userId: user.id } });

        // 5. Tasks
        await prisma.task.updateMany({
          where: { responsibleId: user.id },
          data: { responsibleId: null }
        });
        await prisma.task.updateMany({
          where: { createdById: user.id },
          data: { createdById: null }
        });
        await prisma.task.updateMany({
          where: { deletedById: user.id },
          data: { deletedById: null }
        });
        await prisma.task.updateMany({
          where: { qualityControlId: user.id },
          data: { qualityControlId: 1 }
        });

        // 6. Requests
        await prisma.request.updateMany({
          where: { requesterId: user.id },
          data: { requesterId: 1 }
        });
        await prisma.request.updateMany({
          where: { responsibleId: user.id },
          data: { responsibleId: 1 }
        });
        await prisma.request.updateMany({
          where: { deletedById: user.id },
          data: { deletedById: null }
        });

        // 7. WorkTimes
        await prisma.workTime.deleteMany({ where: { userId: user.id } });

        // 8. Shifts
        await prisma.shift.updateMany({
          where: { userId: user.id },
          data: { userId: null }
        });
        await prisma.shift.updateMany({
          where: { createdBy: user.id },
          data: { createdBy: 1 }
        });
        await prisma.shift.updateMany({
          where: { confirmedBy: user.id },
          data: { confirmedBy: null }
        });

        // 9. ShiftSwapRequests
        await prisma.shiftSwapRequest.deleteMany({ where: { requestedBy: user.id } });
        await prisma.shiftSwapRequest.deleteMany({ where: { requestedFrom: user.id } });

        // 10. UserAvailability
        await prisma.userAvailability.deleteMany({ where: { userId: user.id } });

        // 11. Cerebro
        await prisma.cerebroCarticle.updateMany({
          where: { createdById: user.id },
          data: { createdById: 1 }
        });
        await prisma.cerebroCarticle.updateMany({
          where: { updatedById: user.id },
          data: { updatedById: null }
        });
        await prisma.cerebroExternalLink.deleteMany({ where: { createdById: user.id } });
        await prisma.cerebroMedia.deleteMany({ where: { createdById: user.id } });

        // 12-22. Weitere Abhängigkeiten
        await safeOperation(() => prisma.consultationInvoice.deleteMany({ where: { userId: user.id } }), 'ConsultationInvoices');
        await safeOperation(() => prisma.monthlyConsultationReport.deleteMany({ where: { userId: user.id } }), 'MonthlyReports');
        await safeOperation(() => prisma.employeePayroll.deleteMany({ where: { userId: user.id } }), 'Payrolls');
        await safeOperation(() => prisma.identificationDocument.deleteMany({ where: { userId: user.id } }), 'IdentificationDocuments');
        await safeOperation(() => prisma.invoiceSettings.deleteMany({ where: { userId: user.id } }), 'InvoiceSettings');
        await prisma.requestStatusHistory.deleteMany({ where: { userId: user.id } });
        await prisma.taskStatusHistory.deleteMany({ where: { userId: user.id } });
        await safeOperation(() => prisma.employeeLifecycle.deleteMany({ where: { userId: user.id } }), 'EmployeeLifecycle');
        await safeOperation(() => prisma.lifecycleEvent.updateMany({
          where: { triggeredBy: user.id },
          data: { triggeredBy: 1 }
        }), 'LifecycleEvents');
        await safeOperation(() => prisma.employmentCertificate.updateMany({
          where: { generatedBy: user.id },
          data: { generatedBy: 1 }
        }), 'EmploymentCertificates');
        await safeOperation(() => prisma.employmentContract.updateMany({
          where: { generatedBy: user.id },
          data: { generatedBy: 1 }
        }), 'EmploymentContracts');

        // 23-25. Optionale Tabellen
        await safeOperation(() => prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }), 'PasswordResetTokens');
        await safeOperation(() => prisma.onboardingEvent.deleteMany({ where: { userId: user.id } }), 'OnboardingEvents');
        await safeOperation(() => prisma.whatsAppConversation.deleteMany({ where: { userId: user.id } }), 'WhatsAppConversations');

        // 26-31. Weitere Abhängigkeiten
        await prisma.tour.updateMany({
          where: { createdById: user.id },
          data: { createdById: null }
        });
        await prisma.tourBooking.deleteMany({ where: { bookedById: user.id } });
        await prisma.passwordEntry.updateMany({
          where: { createdById: user.id },
          data: { createdById: 1 }
        });
        await prisma.passwordEntryUserPermission.deleteMany({ where: { userId: user.id } });
        await prisma.passwordEntryAuditLog.deleteMany({ where: { userId: user.id } });
        await prisma.pricingRule.updateMany({
          where: { createdBy: user.id },
          data: { createdBy: 1 }
        });

        // Lösche den Benutzer selbst
        await prisma.user.delete({
          where: { id: user.id }
        });

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
    console.log(`   📋 Gesamt gefunden: ${usersToDelete.length} von ${USERS_TO_DELETE.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe das Script aus
deleteSpecificUsers()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
