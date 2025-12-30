import { PrismaClient } from '@prisma/client';
import { EmailReadingService } from '../src/services/emailReadingService';
import { EmailReservationService } from '../src/services/emailReservationService';
import { EmailReservationScheduler } from '../src/services/emailReservationScheduler';

const prisma = new PrismaClient();

/**
 * Umfassende Prüfung des Email-Import-Systems
 */
async function debugEmailImport() {
  try {
    console.log('=== DEBUG: EMAIL-IMPORT-SYSTEM ===\n');

    const organizationId = 1; // La Familia Hostel
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Prüfe Reservationen von heute
    console.log('1. PRÜFE RESERVATIONEN VON HEUTE:');
    console.log('==========================================');
    const reservationsToday = await prisma.reservation.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`Gefunden: ${reservationsToday.length} Reservation(en) von heute`);
    if (reservationsToday.length > 0) {
      console.log('\nReservationen:');
      reservationsToday.forEach(res => {
        const dateStr = res.createdAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        console.log(`  - ID ${res.id} (Code: ${res.lobbyReservationId || 'N/A'}, Gast: ${res.guestName}) - ${dateStr}`);
      });
    }
    console.log('');

    // 2. Prüfe Email-Reading-Konfiguration
    console.log('2. PRÜFE EMAIL-READING-KONFIGURATION:');
    console.log('==========================================');
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, displayName: true, settings: true }
    });

    if (!organization) {
      console.log('❌ Organisation nicht gefunden!');
      return;
    }

    const settings = organization.settings as any;
    const emailReading = settings?.emailReading;

    if (!emailReading) {
      console.log('❌ Email-Reading ist NICHT konfiguriert!');
      return;
    }

    console.log(`✅ Email-Reading konfiguriert`);
    console.log(`   Enabled: ${emailReading.enabled}`);
    console.log(`   IMAP Host: ${emailReading.imap?.host || 'NICHT GESETZT'}`);
    console.log(`   IMAP User: ${emailReading.imap?.user || 'NICHT GESETZT'}`);
    console.log(`   IMAP Port: ${emailReading.imap?.port || 'NICHT GESETZT'}`);
    console.log(`   Passwort gesetzt: ${emailReading.imap?.password ? 'JA' : 'NEIN'}`);
    console.log(`   From Filter: ${emailReading.filters?.from?.join(', ') || 'KEIN FILTER'}`);
    console.log(`   Subject Filter: ${emailReading.filters?.subject?.join(', ') || 'KEIN FILTER'}`);
    console.log('');

    // 3. Prüfe ob Scheduler läuft
    console.log('3. PRÜFE SCHEDULER-STATUS:');
    console.log('==========================================');
    console.log(`Scheduler läuft: ${EmailReservationScheduler.isRunning ? 'JA' : 'NEIN'}`);
    console.log('');

    // 4. Versuche Email-Konfiguration zu laden
    console.log('4. PRÜFE EMAIL-KONFIGURATION LADEN:');
    console.log('==========================================');
    try {
      const emailConfig = await EmailReadingService.loadConfigFromOrganization(organizationId);
      if (emailConfig) {
        console.log('✅ Email-Konfiguration erfolgreich geladen');
        console.log(`   Host: ${emailConfig.host}`);
        console.log(`   Port: ${emailConfig.port}`);
        console.log(`   User: ${emailConfig.user}`);
        console.log(`   Folder: ${emailConfig.folder}`);
      } else {
        console.log('❌ Email-Konfiguration konnte NICHT geladen werden');
        console.log('   Mögliche Gründe:');
        console.log('   - Email-Reading nicht aktiviert');
        console.log('   - IMAP-Konfiguration unvollständig');
        console.log('   - Passwort fehlt');
      }
    } catch (error) {
      console.log(`❌ Fehler beim Laden der Email-Konfiguration: ${error instanceof Error ? error.message : error}`);
    }
    console.log('');

    // 5. Versuche Verbindung zum Email-Server
    console.log('5. PRÜFE EMAIL-SERVER-VERBINDUNG:');
    console.log('==========================================');
    try {
      const emailConfig = await EmailReadingService.loadConfigFromOrganization(organizationId);
      if (emailConfig) {
        console.log('Versuche Verbindung zum Email-Server...');
        const emailService = new EmailReadingService(emailConfig);
        await emailService.connect();
        console.log('✅ Verbindung zum Email-Server erfolgreich!');
        
        // Prüfe auf ungelesene Emails
        console.log('\nPrüfe auf ungelesene Emails...');
        const orgSettings = settings;
        const filters = emailReading?.filters || {};
        
        const emails = await emailService.fetchUnreadEmails({
          from: filters.from,
          subject: filters.subject
        });
        
        console.log(`📧 Gefunden: ${emails.length} ungelesene Email(s)`);
        
        if (emails.length > 0) {
          console.log('\nUngelesene Emails:');
          emails.forEach((email, index) => {
            console.log(`  ${index + 1}. Message-ID: ${email.messageId}`);
            console.log(`     From: ${email.from}`);
            console.log(`     Subject: ${email.subject}`);
            console.log(`     Date: ${email.date?.toLocaleString('de-DE') || 'N/A'}`);
            console.log('');
          });
        } else {
          console.log('⚠️ Keine ungelesenen Emails gefunden');
          console.log('   Mögliche Gründe:');
          console.log('   - Alle Emails wurden bereits gelesen');
          console.log('   - Filter sind zu restriktiv');
          console.log('   - Keine neuen Emails im Postfach');
        }
        
        await emailService.disconnect();
      } else {
        console.log('❌ Kann Verbindung nicht testen - Email-Konfiguration fehlt');
      }
    } catch (error) {
      console.log(`❌ Fehler bei Email-Server-Verbindung: ${error instanceof Error ? error.message : error}`);
      if (error instanceof Error && error.stack) {
        console.log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }
    }
    console.log('');

    // 6. Prüfe letzte Reservationen (zum Vergleich)
    console.log('6. LETZTE RESERVATIONEN (zum Vergleich):');
    console.log('==========================================');
    const lastReservations = await prisma.reservation.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        createdAt: true
      }
    });

    if (lastReservations.length > 0) {
      console.log('Letzte 10 Reservationen:');
      lastReservations.forEach(res => {
        const dateStr = res.createdAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
        console.log(`  - ID ${res.id} (Code: ${res.lobbyReservationId || 'N/A'}, Gast: ${res.guestName}) - ${dateStr}`);
      });
    } else {
      console.log('❌ Keine Reservationen in der Datenbank');
    }
    console.log('');

    // 7. Zusammenfassung
    console.log('=== ZUSAMMENFASSUNG ===');
    console.log(`Reservationen heute: ${reservationsToday.length}`);
    console.log(`Email-Reading aktiviert: ${emailReading?.enabled ? 'JA' : 'NEIN'}`);
    console.log(`Scheduler läuft: ${EmailReservationScheduler.isRunning ? 'JA' : 'NEIN'}`);
    console.log(`Email-Konfiguration: ${emailReading?.imap?.host ? 'VORHANDEN' : 'FEHLT'}`);
    console.log(`Passwort gesetzt: ${emailReading?.imap?.password ? 'JA' : 'NEIN'}`);

  } catch (error) {
    console.error('❌ FEHLER beim Debug:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
debugEmailImport()
  .then(() => {
    console.log('\n✅ Debug abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

