import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestReservation() {
  try {
    const latestReservation = await prisma.reservation.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            displayName: true
          }
        }
      }
    });

    if (!latestReservation) {
      console.log('Keine Reservierung gefunden.');
      return;
    }

    console.log('\n=== Neueste Reservierung ===');
    console.log(`ID: ${latestReservation.id}`);
    console.log(`Gast: ${latestReservation.guestName}`);
    console.log(`Telefon: ${latestReservation.guestPhone || 'N/A'}`);
    console.log(`Email: ${latestReservation.guestEmail || 'N/A'}`);
    console.log(`Status: ${latestReservation.status}`);
    console.log(`Payment Status: ${latestReservation.paymentStatus}`);
    console.log(`Organisation: ${latestReservation.organization.displayName} (ID: ${latestReservation.organizationId})`);
    console.log(`\nWhatsApp-Versand:`);
    console.log(`  Nachricht versendet: ${latestReservation.sentMessageAt ? '✅ JA' : '❌ NEIN'}`);
    console.log(`  Versendet am: ${latestReservation.sentMessageAt || 'N/A'}`);
    console.log(`  Payment Link: ${latestReservation.paymentLink ? '✅ Vorhanden' : '❌ Fehlt'}`);
    console.log(`  Nachricht: ${latestReservation.sentMessage ? 'Vorhanden' : 'Fehlt'}`);
    
    if (!latestReservation.sentMessageAt) {
      console.log('\n⚠️ PROBLEM: WhatsApp-Nachricht wurde NICHT versendet!');
      console.log('Bitte Server-Console-Logs prüfen für Fehlerdetails.');
    } else {
      console.log('\n✅ WhatsApp-Nachricht wurde erfolgreich versendet!');
    }

    console.log(`\nErstellt am: ${latestReservation.createdAt}`);
    console.log(`Aktualisiert am: ${latestReservation.updatedAt}`);
  } catch (error) {
    console.error('Fehler beim Abrufen der Reservierung:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestReservation();

