/**
 * Script zum Prüfen der WhatsApp-Logs für die versendete Nachricht
 * Prüft ob die Nachricht wirklich versendet wurde oder nur der Status gesetzt wurde
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkWhatsAppLogs() {
  try {
    console.log('🔍 Prüfe versendete WhatsApp-Nachricht (Reservation ID 18)...\n');

    const reservation = await prisma.reservation.findUnique({
      where: { id: 18 },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        guestPhone: true,
        sentMessage: true,
        sentMessageAt: true,
        paymentLink: true,
        status: true,
        createdAt: true
      }
    });

    if (!reservation) {
      console.log('❌ Reservation ID 18 nicht gefunden');
      process.exit(1);
    }

    console.log('=== Reservation Details ===\n');
    console.log(`ID: ${reservation.id}`);
    console.log(`Code: ${reservation.lobbyReservationId}`);
    console.log(`Gast: ${reservation.guestName}`);
    console.log(`Telefon: ${reservation.guestPhone}`);
    console.log(`Status: ${reservation.status}`);
    console.log(`Versendet am: ${reservation.sentMessageAt?.toLocaleString('de-DE') || 'unbekannt'}`);
    console.log(`Payment-Link: ${reservation.paymentLink ? 'Ja' : 'Nein'}`);
    if (reservation.paymentLink) {
      console.log(`   Link: ${reservation.paymentLink.substring(0, 80)}...`);
    }
    console.log('');

    if (reservation.sentMessage) {
      console.log('=== Versendete Nachricht ===\n');
      console.log(reservation.sentMessage);
      console.log('');
    }

    console.log('=== WICHTIGE INFORMATIONEN ===\n');
    console.log('⚠️  Diese Reservation hat Status "notification_sent"');
    console.log('⚠️  sentMessageAt ist gesetzt');
    console.log('⚠️  Payment-Link wurde erstellt');
    console.log('');
    console.log('💡 Um zu prüfen ob die Nachricht wirklich versendet wurde:');
    console.log('   1. Prüfe WhatsApp Business Manager für Nachrichten an diese Nummer');
    console.log(`   2. Prüfe Server-Logs zum Zeitpunkt ${reservation.sentMessageAt?.toLocaleString('de-DE')}`);
    console.log('   3. Prüfe ob der Gast die Nachricht erhalten hat');
    console.log('');
    console.log('🔒 WhatsApp-Versand ist jetzt DEAKTIVIERT für neue Email-Reservationen');
    console.log('   (Setze EMAIL_RESERVATION_WHATSAPP_ENABLED=true in .env um zu aktivieren)');

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhatsAppLogs();

