/**
 * Script zum endgültigen Löschen aller inaktiven Benutzer
 * Löscht alle Benutzer mit active = false inkl. aller zugehörigen Daten
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteInactiveUsers() {
  try {
    console.log('🔍 Suche nach inaktiven Benutzern...\n');

    // Finde alle inaktiven Benutzer
    const inactiveUsers = await prisma.user.findMany({
      where: {
        active: false
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });

    if (inactiveUsers.length === 0) {
      console.log('✅ Keine inaktiven Benutzer gefunden.');
      return;
    }

    console.log(`📋 Gefundene inaktive Benutzer: ${inactiveUsers.length}\n`);
    inactiveUsers.forEach(user => {
      console.log(`   - ${user.username} (${user.firstName} ${user.lastName}) - ID: ${user.id}`);
    });

    console.log('\n⚠️  WARNUNG: Diese Operation ist ENDGÜLTIG und kann nicht rückgängig gemacht werden!');
    console.log('   Es werden alle zugehörigen Daten gelöscht:\n');
    console.log('   - UserRoles, UsersBranches');
    console.log('   - Settings, Notifications, UserNotificationSettings');
    console.log('   - SavedFilters, FilterGroups, UserTableSettings');
    console.log('   - OrganizationJoinRequests, OrganizationInvitations');
    console.log('   - Tasks, Requests (wo User verantwortlich/ersteller ist)');
    console.log('   - WorkTimes, Shifts, Availabilities');
    console.log('   - Cerebro-Artikel, -Links, -Media');
    console.log('   - ConsultationInvoices, MonthlyReports');
    console.log('   - Payrolls, IdentificationDocuments');
    console.log('   - PasswordEntries, PasswordEntryPermissions, PasswordEntryAuditLogs');
    console.log('   - TourBookings, Tours (wo User Ersteller ist)');
    console.log('   - PricingRules');
    console.log('   - RequestStatusHistory, TaskStatusHistory');
    console.log('   - EmployeeLifecycle, LifecycleEvents');
    console.log('   - EmploymentCertificates, EmploymentContracts');
    console.log('   - PasswordResetTokens');
    console.log('   - OnboardingEvents');
    console.log('   - WhatsAppConversations');
    console.log('   - ShiftSwapRequests');
    console.log('   - InvoiceSettings');
    console.log('   - Und alle weiteren zugehörigen Daten\n');

    let deletedCount = 0;
    let errorCount = 0;

    for (const user of inactiveUsers) {
      try {
        console.log(`\n🗑️  Lösche Benutzer: ${user.username} (ID: ${user.id})...`);

        // Hilfsfunktion für sichere Operationen
        const safeOperation = async (operation: () => Promise<any>, name: string) => {
          try {
            await operation();
          } catch (error: any) {
            if (error.message?.includes('does not exist')) {
              // Tabelle existiert nicht - ignorieren
              return;
            }
            throw error;
          }
        };

        // Führe alle Operationen ohne Transaktion aus (robuster bei fehlenden Tabellen)
        // 1. Organisation-bezogene Abhängigkeiten
        await prisma.organizationJoinRequest.deleteMany({
          where: { requesterId: user.id }
        });
        // processedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)

        await prisma.organizationInvitation.deleteMany({
          where: { invitedBy: user.id }
        });
        // acceptedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)

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

        // 5. Tasks (wo User verantwortlich/ersteller ist)
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

        // 33. Lösche den Benutzer selbst
        await prisma.user.delete({
          where: { id: user.id }
        });

        deletedCount++;
        console.log(`   ✅ Benutzer ${user.username} erfolgreich gelöscht`);

      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Fehler beim Löschen von ${user.username}:`, error.message);
        // Weiter mit nächstem Benutzer
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Zusammenfassung:');
    console.log(`   ✅ Erfolgreich gelöscht: ${deletedCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);
    console.log(`   📋 Gesamt: ${inactiveUsers.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Fataler Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe das Script aus
deleteInactiveUsers()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
