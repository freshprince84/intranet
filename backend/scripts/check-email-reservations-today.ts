import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Prüft Reservationen, die heute (19.11.25) durch Email-Import angelegt wurden
 * 
 * Führe dieses Script auf dem Hetzner-Server aus:
 * cd /var/www/intranet/backend
 * npx ts-node scripts/check-email-reservations-today.ts
 */
async function checkEmailReservationsToday() {
  try {
    console.log('=== PRÜFE RESERVATIONEN VON HEUTE (19.11.2025) ===\n');

    // Heute: 19.11.2025
    const today = new Date('2025-11-19');
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log(`Prüfe Reservationen von: ${today.toISOString()} bis ${tomorrow.toISOString()}\n`);

    // Finde alle Reservationen, die heute erstellt wurden
    const reservationsToday = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 GEFUNDEN: ${reservationsToday.length} Reservation(en) von heute\n`);

    if (reservationsToday.length === 0) {
      console.log('❌ KEINE Reservationen von heute gefunden!\n');
      console.log('=== ANALYSE WARUM KEINE RESERVATIONEN ANGELEGT WURDEN ===\n');

      // Prüfe Email-Reading-Konfiguration
      console.log('1. PRÜFE EMAIL-READING-KONFIGURATION:');
      console.log('==========================================');

      const organizations = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          displayName: true,
          settings: true
        }
      });

      let hasEmailReadingConfig = false;

      for (const org of organizations) {
        const settings = org.settings as any;
        const emailReading = settings?.emailReading;

        if (emailReading && emailReading.enabled) {
          hasEmailReadingConfig = true;
          console.log(`✅ Organisation ${org.id} (${org.name}): Email-Reading ist AKTIVIERT`);
          console.log(`   - IMAP Host: ${emailReading.imapHost || 'NICHT GESETZT'}`);
          console.log(`   - IMAP Port: ${emailReading.imapPort || 'NICHT GESETZT'}`);
          console.log(`   - Email: ${emailReading.email || 'NICHT GESETZT'}`);
          console.log(`   - Filter From: ${emailReading.filters?.from || 'KEIN FILTER'}`);
          console.log(`   - Filter Subject: ${emailReading.filters?.subject || 'KEIN FILTER'}`);
          console.log('');
        } else {
          console.log(`❌ Organisation ${org.id} (${org.name}): Email-Reading ist DEAKTIVIERT oder nicht konfiguriert`);
        }
      }

      if (!hasEmailReadingConfig) {
        console.log('\n⚠️ PROBLEM: Keine Organisation hat Email-Reading aktiviert!\n');
      }

      // Prüfe ob Scheduler läuft (via Logs)
      console.log('\n2. PRÜFE OB EMAIL-RESERVATION-SCHEDULER LÄUFT:');
      console.log('==========================================');
      console.log('⚠️ Bitte manuell prüfen:');
      console.log('   - PM2 Logs: pm2 logs intranet-backend | grep EmailReservationScheduler');
      console.log('   - Oder: journalctl -u intranet* | grep EmailReservationScheduler');
      console.log('   - Erwartete Logs: "[EmailReservationScheduler] Scheduler gestartet"');
      console.log('   - Erwartete Logs: "[EmailReservationScheduler] Starte Email-Check für alle Organisationen..."');

      // Prüfe letzte Reservationen (um zu sehen, wann zuletzt eine angelegt wurde)
      console.log('\n3. LETZTE RESERVATIONEN (zum Vergleich):');
      console.log('==========================================');

      const lastReservations = await prisma.reservation.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          lobbyReservationId: true,
          guestName: true,
          createdAt: true,
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (lastReservations.length > 0) {
        console.log('Letzte 5 Reservationen:');
        for (const res of lastReservations) {
          const dateStr = res.createdAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
          console.log(`  - ID ${res.id} (Code: ${res.lobbyReservationId || 'N/A'}, Gast: ${res.guestName})`);
          console.log(`    Erstellt: ${dateStr}`);
          console.log(`    Organisation: ${res.organization.name} (ID: ${res.organization.id})`);
          console.log('');
        }
      } else {
        console.log('❌ Keine Reservationen in der Datenbank gefunden!');
      }

      console.log('\n=== ZUSAMMENFASSUNG ===');
      console.log('❌ KEINE Reservationen von heute (19.11.2025) gefunden.');
      console.log('\nMögliche Gründe:');
      console.log('1. Email-Reading ist nicht aktiviert für die Organisation');
      console.log('2. EmailReservationScheduler läuft nicht');
      console.log('3. Keine neuen Reservation-Emails im Postfach');
      console.log('4. Email-Parsing schlägt fehl (Logs prüfen)');
      console.log('5. Server wurde heute nicht neu gestartet (Scheduler startet nur beim Server-Start)');

    } else {
      console.log('✅ RESERVATIONEN VON HEUTE GEFUNDEN:\n');
      
      for (const reservation of reservationsToday) {
        const dateStr = reservation.createdAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        console.log(`📋 Reservation ID: ${reservation.id}`);
        console.log(`   Code: ${reservation.lobbyReservationId || 'N/A'}`);
        console.log(`   Gast: ${reservation.guestName}`);
        console.log(`   Check-in: ${reservation.checkInDate.toLocaleDateString('de-DE')}`);
        console.log(`   Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')}`);
        console.log(`   Betrag: ${reservation.amount} ${reservation.currency}`);
        console.log(`   Erstellt: ${dateStr}`);
        console.log(`   Organisation: ${reservation.organization.name} (ID: ${reservation.organization.id})`);
        console.log('');
      }

      console.log('=== ZUSAMMENFASSUNG ===');
      console.log(`✅ ${reservationsToday.length} Reservation(en) wurden heute durch Email-Import angelegt.`);
    }

  } catch (error) {
    console.error('❌ FEHLER beim Prüfen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
checkEmailReservationsToday()
  .then(() => {
    console.log('\n✅ Prüfung abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

