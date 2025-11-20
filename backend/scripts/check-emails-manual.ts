/**
 * Manueller Check aller Emails (auch bereits gelesene) um zu sehen, was im Postfach ist
 */
import { PrismaClient } from '@prisma/client';
import { EmailReservationService } from '../src/services/emailReservationService';

const prisma = new PrismaClient();

async function checkEmailsManual() {
  try {
    const organizationId = 1;
    
    console.log('=== MANUELLER EMAIL-CHECK (ALLE EMAILS) ===\n');

    // Hole Organisation-Settings für Filter
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    const orgSettings = organization?.settings as any;
    const emailReading = orgSettings?.emailReading;
    const filters = emailReading?.filters || {};

    console.log('Filter-Konfiguration:');
    console.log(`   From: ${filters.from?.join(', ') || 'KEIN FILTER'}`);
    console.log(`   Subject: ${filters.subject?.join(', ') || 'KEIN FILTER'}`);
    console.log('');

    // Versuche manuellen Email-Check
    console.log('Führe manuellen Email-Check durch...\n');
    const processedCount = await EmailReservationService.checkForNewReservationEmails(organizationId);
    
    console.log(`\n✅ Email-Check abgeschlossen: ${processedCount} Reservation(s) erstellt\n`);
    
    // Prüfe nochmal alle Reservationen von heute
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const reservationsToday = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n📊 Reservationen von heute: ${reservationsToday.length}`);
    if (reservationsToday.length > 0) {
      reservationsToday.forEach(res => {
        const dateStr = res.createdAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        console.log(`   - ID ${res.id} (Code: ${res.lobbyReservationId || 'N/A'}, Gast: ${res.guestName}) - ${dateStr}`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkEmailsManual()
  .then(() => {
    console.log('✅ Prüfung abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

