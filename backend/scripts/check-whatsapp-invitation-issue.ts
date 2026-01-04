import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkWhatsAppInvitationIssue() {
  try {
    console.log('🔍 Prüfe WhatsApp-Versand-Problem bei manueller Einladung...\n');

    // 1. Prüfe neueste Notification-Logs (invitation type)
    console.log('📋 Neueste Notification-Logs (invitation):');
    const invitationLogs = await prisma.reservationNotificationLog.findMany({
      where: {
        notificationType: 'invitation'
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 10,
      include: {
        reservation: {
          select: {
            id: true,
            guestName: true,
            guestPhone: true,
            guestEmail: true,
            branchId: true,
            organizationId: true
          }
        }
      }
    });

    if (invitationLogs.length === 0) {
      console.log('⚠️ KEINE invitation-Logs gefunden!\n');
    } else {
      invitationLogs.forEach((log, index) => {
        console.log(`\n${index + 1}. Reservation ${log.reservationId} (${log.reservation?.guestName || 'N/A'})`);
        console.log(`   Channel: ${log.channel}`);
        console.log(`   Success: ${log.success ? '✅' : '❌'}`);
        console.log(`   Sent To: ${log.sentTo || 'N/A'}`);
        console.log(`   Sent At: ${log.sentAt}`);
        if (log.errorMessage) {
          console.log(`   ❌ Error: ${log.errorMessage}`);
        }
        if (log.paymentLink) {
          console.log(`   Payment Link: ✅`);
        }
        if (log.checkInLink) {
          console.log(`   Check-in Link: ✅`);
        }
      });
    }

    // 2. Prüfe Reservierungen mit guestPhone (die WhatsApp hätten bekommen sollen)
    console.log('\n\n📱 Reservierungen mit Telefonnummer (die WhatsApp hätten bekommen sollen):');
    const reservationsWithPhone = await prisma.reservation.findMany({
      where: {
        guestPhone: {
          not: null
        },
        paymentLink: {
          not: null
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        paymentLink: true,
        sentMessageAt: true,
        branchId: true,
        organizationId: true,
        status: true
      }
    });

    if (reservationsWithPhone.length === 0) {
      console.log('⚠️ KEINE Reservierungen mit Telefonnummer gefunden!\n');
    } else {
      reservationsWithPhone.forEach((res, index) => {
        console.log(`\n${index + 1}. Reservation ${res.id}: ${res.guestName}`);
        console.log(`   Phone: ${res.guestPhone}`);
        console.log(`   Email: ${res.guestEmail || 'N/A'}`);
        console.log(`   Payment Link: ${res.paymentLink ? '✅' : '❌'}`);
        console.log(`   Sent At: ${res.sentMessageAt || '❌ NICHT GESENDET'}`);
        console.log(`   Branch ID: ${res.branchId || 'N/A'}`);
        console.log(`   Organization ID: ${res.organizationId}`);
        
        // Prüfe Notification-Logs für diese Reservation
        prisma.reservationNotificationLog.findMany({
          where: {
            reservationId: res.id,
            notificationType: 'invitation'
          }
        }).then(logs => {
          if (logs.length > 0) {
            console.log(`   📋 Notification-Logs: ${logs.length}`);
            logs.forEach(log => {
              console.log(`      - Channel: ${log.channel}, Success: ${log.success ? '✅' : '❌'}`);
              if (log.errorMessage) {
                console.log(`        Error: ${log.errorMessage}`);
              }
            });
          } else {
            console.log(`   📋 Notification-Logs: ❌ KEINE`);
          }
        });
      });
    }

    // 3. Prüfe Settings (notificationChannels) für Organization
    console.log('\n\n⚙️ Organization Settings (notificationChannels):');
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    for (const org of organizations) {
      console.log(`\n📌 Organization ${org.id}: ${org.displayName || org.name}`);
      const settings = org.settings as any;
      const notificationChannels = settings?.lobbyPms?.notificationChannels || ['email'];
      console.log(`   notificationChannels: ${JSON.stringify(notificationChannels)}`);
      console.log(`   WhatsApp aktiviert: ${notificationChannels.includes('whatsapp') ? '✅' : '❌'}`);
      console.log(`   Email aktiviert: ${notificationChannels.includes('email') ? '✅' : '❌'}`);
    }

    // 4. Prüfe Branch Settings (notificationChannels) für Branches
    console.log('\n\n⚙️ Branch Settings (notificationChannels):');
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        organizationId: true,
        lobbyPmsSettings: true
      }
    });

    if (branches.length === 0) {
      console.log('⚠️ KEINE Branches gefunden!\n');
    } else {
      for (const branch of branches) {
        console.log(`\n📌 Branch ${branch.id}: ${branch.name}`);
        if (branch.lobbyPmsSettings) {
          const settings = branch.lobbyPmsSettings as any;
          const notificationChannels = settings?.notificationChannels;
          if (notificationChannels) {
            console.log(`   notificationChannels: ${JSON.stringify(notificationChannels)}`);
            console.log(`   WhatsApp aktiviert: ${notificationChannels.includes('whatsapp') ? '✅' : '❌'}`);
            console.log(`   Email aktiviert: ${notificationChannels.includes('email') ? '✅' : '❌'}`);
          } else {
            console.log(`   notificationChannels: ❌ NICHT GESETZT (verwendet Organization-Fallback)`);
          }
        } else {
          console.log(`   lobbyPmsSettings: ❌ NICHT GESETZT (verwendet Organization-Fallback)`);
        }
      }
    }

    // 5. Prüfe WhatsApp-Settings für Branches
    console.log('\n\n📱 Branch WhatsApp-Settings:');
    for (const branch of branches) {
      console.log(`\n📌 Branch ${branch.id}: ${branch.name}`);
      const whatsappSettings = await prisma.branch.findUnique({
        where: { id: branch.id },
        select: { whatsappSettings: true }
      });
      
      if (whatsappSettings?.whatsappSettings) {
        const settings = whatsappSettings.whatsappSettings as any;
        console.log(`   WhatsApp API Key: ${settings?.apiKey ? '✅ VORHANDEN' : '❌ FEHLT'}`);
        console.log(`   WhatsApp aktiviert: ${settings?.enabled !== false ? '✅' : '❌'}`);
      } else {
        console.log(`   WhatsApp Settings: ❌ NICHT GESETZT`);
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhatsAppInvitationIssue();



