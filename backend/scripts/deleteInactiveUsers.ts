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

        await prisma.$transaction(async (tx) => {
          // 1. Organisation-bezogene Abhängigkeiten
          await tx.organizationJoinRequest.deleteMany({
            where: { requesterId: user.id }
          });
          // processedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)

          await tx.organizationInvitation.deleteMany({
            where: { invitedBy: user.id }
          });
          // acceptedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)

          // 2. Rollen und Branches
          await tx.userRole.deleteMany({
            where: { userId: user.id }
          });

          await tx.usersBranches.deleteMany({
            where: { userId: user.id }
          });

          // 3. Einstellungen und Benachrichtigungen
          await tx.settings.deleteMany({
            where: { userId: user.id }
          });

          await tx.notification.deleteMany({
            where: { userId: user.id }
          });

          await tx.userNotificationSettings.deleteMany({
            where: { userId: user.id }
          });

          // 4. Filter und Tabelleneinstellungen
          await tx.savedFilter.deleteMany({
            where: { userId: user.id }
          });

          await tx.filterGroup.deleteMany({
            where: { userId: user.id }
          });

          await tx.userTableSettings.deleteMany({
            where: { userId: user.id }
          });

          // 5. Tasks (wo User verantwortlich/ersteller ist)
          // Setze responsibleId, createdById, deletedById auf NULL
          await tx.task.updateMany({
            where: { responsibleId: user.id },
            data: { responsibleId: null }
          });

          await tx.task.updateMany({
            where: { createdById: user.id },
            data: { createdById: null }
          });

          await tx.task.updateMany({
            where: { deletedById: user.id },
            data: { deletedById: null }
          });

          await tx.task.updateMany({
            where: { qualityControlId: user.id },
            data: { qualityControlId: null }
          });

          // 6. Requests (wo User requester/responsible ist)
          // WICHTIG: Requests können nicht einfach gelöscht werden, da sie wichtige Daten enthalten
          // Setze requesterId/responsibleId auf NULL oder einen anderen User
          // Für jetzt: Setze auf NULL (kann später angepasst werden)
          await tx.request.updateMany({
            where: { requesterId: user.id },
            data: { requesterId: 1 } // Setze auf Admin (ID 1) als Fallback
          });

          await tx.request.updateMany({
            where: { responsibleId: user.id },
            data: { responsibleId: null }
          });

          await tx.request.updateMany({
            where: { deletedById: user.id },
            data: { deletedById: null }
          });

          // 7. WorkTimes
          await tx.workTime.deleteMany({
            where: { userId: user.id }
          });

          // 8. Shifts
          await tx.shift.updateMany({
            where: { userId: user.id },
            data: { userId: null }
          });

          await tx.shift.updateMany({
            where: { createdBy: user.id },
            data: { createdBy: 1 } // Setze auf Admin als Fallback
          });

          await tx.shift.updateMany({
            where: { confirmedBy: user.id },
            data: { confirmedBy: null }
          });

          // 9. ShiftSwapRequests
          await tx.shiftSwapRequest.deleteMany({
            where: { requesterId: user.id }
          });

          await tx.shiftSwapRequest.deleteMany({
            where: { requesteeId: user.id }
          });

          // 10. UserAvailability
          await tx.userAvailability.deleteMany({
            where: { userId: user.id }
          });

          // 11. Cerebro
          await tx.cerebroCarticle.updateMany({
            where: { createdById: user.id },
            data: { createdById: 1 } // Setze auf Admin als Fallback
          });

          await tx.cerebroCarticle.updateMany({
            where: { updatedById: user.id },
            data: { updatedById: null }
          });

          await tx.cerebroExternalLink.deleteMany({
            where: { userId: user.id }
          });

          await tx.cerebroMedia.deleteMany({
            where: { userId: user.id }
          });

          // 12. ConsultationInvoices
          await tx.consultationInvoice.deleteMany({
            where: { userId: user.id }
          });

          // 13. MonthlyReports
          await tx.monthlyConsultationReport.deleteMany({
            where: { userId: user.id }
          });

          // 14. Payrolls
          await tx.employeePayroll.deleteMany({
            where: { userId: user.id }
          });

          // 15. IdentificationDocuments
          await tx.identificationDocument.deleteMany({
            where: { userId: user.id }
          });

          // 16. InvoiceSettings
          await tx.invoiceSettings.deleteMany({
            where: { userId: user.id }
          });

          // 17. RequestStatusHistory
          await tx.requestStatusHistory.deleteMany({
            where: { userId: user.id }
          });

          // 18. TaskStatusHistory
          await tx.taskStatusHistory.deleteMany({
            where: { userId: user.id }
          });

          // 19. EmployeeLifecycle
          await tx.employeeLifecycle.deleteMany({
            where: { userId: user.id }
          });

          // 20. LifecycleEvents (wo User Triggerer ist)
          await tx.lifecycleEvent.updateMany({
            where: { triggeredBy: user.id },
            data: { triggeredBy: 1 } // Setze auf Admin als Fallback
          });

          // 21. EmploymentCertificates
          await tx.employmentCertificate.updateMany({
            where: { generatedBy: user.id },
            data: { generatedBy: 1 } // Setze auf Admin als Fallback
          });

          // 22. EmploymentContracts
          await tx.employmentContract.updateMany({
            where: { generatedBy: user.id },
            data: { generatedBy: 1 } // Setze auf Admin als Fallback
          });

          // 23. PasswordResetTokens
          await tx.passwordResetToken.deleteMany({
            where: { userId: user.id }
          });

          // 24. OnboardingEvents
          await tx.onboardingEvent.deleteMany({
            where: { userId: user.id }
          });

          // 25. WhatsAppConversations
          await tx.whatsAppConversation.deleteMany({
            where: { userId: user.id }
          });

          // 26. Tours (wo User Ersteller ist)
          await tx.tour.updateMany({
            where: { createdById: user.id },
            data: { createdById: null }
          });

          // 27. TourBookings
          await tx.tourBooking.deleteMany({
            where: { bookedBy: user.id }
          });

          // 28. PasswordEntries (wo User Ersteller ist)
          await tx.passwordEntry.updateMany({
            where: { createdById: user.id },
            data: { createdById: 1 } // Setze auf Admin als Fallback
          });

          // 29. PasswordEntryUserPermissions
          await tx.passwordEntryUserPermission.deleteMany({
            where: { userId: user.id }
          });

          // 30. PasswordEntryAuditLogs
          await tx.passwordEntryAuditLog.deleteMany({
            where: { userId: user.id }
          });

          // 31. PricingRules
          await tx.pricingRule.updateMany({
            where: { createdById: user.id },
            data: { createdById: 1 } // Setze auf Admin als Fallback
          });

          // 32. WhatsAppConversations (userId Feld)
          await tx.whatsAppConversation.deleteMany({
            where: { userId: user.id }
          });

          // 33. Lösche den Benutzer selbst
          await tx.user.delete({
            where: { id: user.id }
          });
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
