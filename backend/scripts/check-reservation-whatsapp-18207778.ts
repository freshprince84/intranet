/**
 * Prüft Reservation 18207778 und WhatsApp-Versand
 * 
 * Prüft:
 * - Reservation-Details (Land, Sprache, Telefonnummer)
 * - Wie wurde die Nachricht versendet (Template vs. Session Message)
 * - Notification-Logs
 * - Template-Name und Sprache
 */

import { PrismaClient } from '@prisma/client';
import { CountryLanguageService } from '../src/services/countryLanguageService';

const prisma = new PrismaClient();

async function checkReservation18207778() {
  console.log('\n🔍 Prüfe Reservation 18207778 (LobbyPMS ID)\n');
  console.log('='.repeat(80));

  try {
    // Suche Reservation nach lobbyReservationId ODER interner ID
    let reservation = await prisma.reservation.findFirst({
      where: {
        lobbyReservationId: '18207778'
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!reservation) {
      console.log('❌ Reservation mit LobbyPMS ID 18207778 nicht gefunden');
      console.log('\n📋 Suche nach ähnlichen IDs...');
      
      // Suche nach ähnlichen IDs
      const similar = await prisma.reservation.findMany({
        where: {
          lobbyReservationId: {
            contains: '182077'
          }
        },
        select: {
          id: true,
          lobbyReservationId: true,
          guestName: true
        },
        take: 10
      });
      
      if (similar.length > 0) {
        console.log('Gefundene ähnliche Reservierungen:');
        similar.forEach(r => {
          console.log(`  - ID: ${r.id}, LobbyID: ${r.lobbyReservationId}, Name: ${r.guestName}`);
        });
      }
      
      // Versuche auch interne ID
      const reservationId = parseInt('18207778', 10);
      if (!isNaN(reservationId)) {
        reservation = await prisma.reservation.findUnique({
          where: {
            id: reservationId
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      }
      
      if (!reservation) {
        return;
      }
    }

    console.log('✅ Reservation gefunden!\n');
    console.log('📋 Reservation-Details:');
    console.log(`   ID: ${reservation.id}`);
    console.log(`   LobbyPMS ID: ${reservation.lobbyReservationId}`);
    console.log(`   Gast: ${reservation.guestName}`);
    console.log(`   E-Mail: ${reservation.guestEmail || 'Nicht gesetzt'}`);
    console.log(`   Telefon: ${reservation.guestPhone || 'Nicht gesetzt'}`);
    console.log(`   Nationalität: ${reservation.guestNationality || 'Nicht gesetzt'}`);
    console.log(`   Organisation: ${reservation.organization.name} (ID: ${reservation.organizationId})`);
    console.log(`   Branch: ${reservation.branch?.name || 'N/A'} (ID: ${reservation.branchId || 'N/A'})`);
    console.log(`   Einladung versendet: ${reservation.invitationSentAt ? reservation.invitationSentAt.toISOString() : 'Nein'}`);

    // Prüfe Sprache
    console.log('\n🌍 Sprache-Erkennung:');
    const languageCode = CountryLanguageService.getLanguageForReservation({
      guestNationality: reservation.guestNationality,
      guestPhone: reservation.guestPhone
    });
    console.log(`   Erkannte Sprache: ${languageCode}`);
    console.log(`   Basierend auf: ${reservation.guestNationality ? `Land "${reservation.guestNationality}"` : reservation.guestPhone ? `Telefonnummer "${reservation.guestPhone}"` : 'Fallback'}`);

    // Prüfe Notification-Logs
    console.log('\n📨 Notification-Logs:');
    const notifications = await prisma.reservationNotificationLog.findMany({
      where: {
        reservationId: reservation.id
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 10
    });

    if (notifications.length === 0) {
      console.log('   ⚠️  Keine Notification-Logs gefunden');
    } else {
      notifications.forEach((notif, index) => {
        console.log(`\n   ${index + 1}. Notification (${notif.sentAt.toISOString()}):`);
        console.log(`      Typ: ${notif.notificationType}`);
        console.log(`      Kanal: ${notif.channel}`);
        console.log(`      Erfolg: ${notif.success ? '✅' : '❌'}`);
        console.log(`      Gesendet an: ${notif.sentTo || 'N/A'}`);
        if (notif.errorMessage) {
          console.log(`      Fehler: ${notif.errorMessage}`);
        }
        if (notif.message) {
          const messagePreview = notif.message.length > 100 
            ? notif.message.substring(0, 100) + '...' 
            : notif.message;
          console.log(`      Nachricht: ${messagePreview}`);
        }
      });
    }

    // Prüfe WhatsApp-spezifische Details
    if (reservation.guestPhone) {
      console.log('\n📱 WhatsApp-Versand-Details:');
      
      // Prüfe ob Template verwendet wurde
      const whatsappNotifications = notifications.filter(n => 
        n.channel === 'whatsapp' && n.success
      );
      
      if (whatsappNotifications.length > 0) {
        console.log(`   ✅ ${whatsappNotifications.length} WhatsApp-Nachricht(en) erfolgreich versendet`);
        
        // Prüfe letzte WhatsApp-Notification
        const lastWhatsApp = whatsappNotifications[0];
        if (lastWhatsApp.message) {
          // Prüfe ob Template-Name in der Nachricht erwähnt wird
          if (lastWhatsApp.message.includes('template') || lastWhatsApp.message.includes('Template')) {
            console.log('   📋 Template-Nachricht erkannt');
          } else {
            console.log('   📋 Session Message (24h-Fenster) erkannt');
          }
        }
      } else {
        console.log('   ⚠️  Keine erfolgreichen WhatsApp-Nachrichten gefunden');
      }
    }

    // Prüfe Branch WhatsApp Settings
    if (reservation.branchId) {
      console.log('\n⚙️  Branch WhatsApp Settings:');
      const branch = await prisma.branch.findUnique({
        where: { id: reservation.branchId },
        select: {
          whatsappSettings: true
        }
      });

      if (branch?.whatsappSettings) {
        const { decryptBranchApiSettings } = require('../src/utils/encryption');
        const decrypted = decryptBranchApiSettings(branch.whatsappSettings as any);
        const whatsappSettings = decrypted?.whatsapp || decrypted;
        
        console.log(`   Provider: ${whatsappSettings?.provider || 'N/A'}`);
        console.log(`   API Key vorhanden: ${!!whatsappSettings?.apiKey}`);
        console.log(`   Phone Number ID: ${whatsappSettings?.phoneNumberId || 'N/A'}`);
      } else {
        console.log('   ⚠️  Keine Branch WhatsApp Settings gefunden');
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Prüfung abgeschlossen\n');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReservation18207778();

