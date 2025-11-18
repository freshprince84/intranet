/**
 * Script zum Prüfen, ob beim Erstellen der Reservationen aus Emails
 * bereits WhatsApp-Nachrichten oder Emails versendet wurden
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkSentMessages() {
  try {
    const organizationId = 1;
    
    console.log('🔍 Prüfe versendete Nachrichten bei Reservationen aus Emails...\n');

    // Hole alle Reservationen mit lobbyReservationId (aus Emails erstellt)
    const reservations = await prisma.reservation.findMany({
      where: {
        organizationId: organizationId,
        lobbyReservationId: {
          not: null
        }
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        guestPhone: true,
        guestEmail: true,
        sentMessage: true,
        sentMessageAt: true,
        paymentLink: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Gesamt: ${reservations.length} Reservationen aus Emails\n`);

    // Prüfe auf versendete Nachrichten
    const withMessages = reservations.filter(r => r.sentMessage || r.sentMessageAt);
    const withPaymentLinks = reservations.filter(r => r.paymentLink);
    const withPhone = reservations.filter(r => r.guestPhone);

    console.log('=== STATISTIK ===\n');
    console.log(`Reservationen mit Telefonnummer: ${withPhone.length}`);
    console.log(`Reservationen mit versendeter Nachricht: ${withMessages.length}`);
    console.log(`Reservationen mit Payment-Link: ${withPaymentLinks.length}\n`);

    if (withMessages.length > 0) {
      console.log('⚠️  WARNUNG: Es wurden bereits Nachrichten versendet!\n');
      console.log('=== Reservationen mit versendeten Nachrichten ===\n');
      
      withMessages.forEach((res, index) => {
        console.log(`${index + 1}. Reservation ID: ${res.id}`);
        console.log(`   Code: ${res.lobbyReservationId}`);
        console.log(`   Gast: ${res.guestName}`);
        console.log(`   Telefon: ${res.guestPhone || 'keine'}`);
        console.log(`   Versendet am: ${res.sentMessageAt?.toLocaleString('de-DE') || 'unbekannt'}`);
        console.log(`   Status: ${res.status}`);
        if (res.paymentLink) {
          console.log(`   ⚠️  Payment-Link erstellt: ${res.paymentLink.substring(0, 50)}...`);
        }
        console.log('');
      });
    } else {
      console.log('✅ KEINE Nachrichten wurden versendet!\n');
    }

    if (withPaymentLinks.length > 0 && withMessages.length === 0) {
      console.log('ℹ️  Payment-Links wurden erstellt, aber keine Nachrichten versendet');
      console.log('   (Das ist OK - Links wurden nur erstellt, aber nicht verwendet)\n');
    }

    // Prüfe Status
    const notificationSent = reservations.filter(r => r.status === 'notification_sent');
    if (notificationSent.length > 0) {
      console.log(`⚠️  ${notificationSent.length} Reservationen haben Status 'notification_sent'`);
      console.log('   (Prüfe ob diese wirklich Nachrichten versendet haben)\n');
    }

    console.log('=== ZUSAMMENFASSUNG ===\n');
    if (withMessages.length === 0) {
      console.log('✅ SICHER: Keine Nachrichten wurden an echte Empfänger versendet!');
      console.log('   Das System ist sicher zum Testen.\n');
    } else {
      console.log('❌ WARNUNG: Es wurden Nachrichten versendet!');
      console.log(`   ${withMessages.length} Reservationen haben versendete Nachrichten.`);
      console.log('   Bitte prüfe die oben aufgeführten Reservationen.\n');
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkSentMessages();

