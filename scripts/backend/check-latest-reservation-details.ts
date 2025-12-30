import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestReservationDetails() {
  try {
    console.log('\n=== LETZTE RESERVIERUNG - VOLLSTÄNDIGE DETAILS ===\n');

    const latestReservation = await prisma.reservation.findFirst({
      where: {
        organizationId: 1
      },
      orderBy: {
        id: 'desc'
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!latestReservation) {
      console.log('❌ Keine Reservierung gefunden');
      return;
    }

    console.log('RESERVIERUNG:');
    console.log('-----------------------------------');
    console.log(`ID: ${latestReservation.id}`);
    console.log(`Gast: ${latestReservation.guestName}`);
    console.log(`Telefon: ${latestReservation.guestPhone || 'N/A'}`);
    console.log(`Email: ${latestReservation.guestEmail || 'N/A'}`);
    console.log(`Status: ${latestReservation.status}`);
    console.log(`Payment Status: ${latestReservation.paymentStatus}`);
    console.log(`Check-in: ${latestReservation.checkInDate.toISOString()}`);
    console.log(`Check-out: ${latestReservation.checkOutDate.toISOString()}`);
    console.log(`Zimmer: ${latestReservation.roomNumber || 'N/A'}`);
    console.log(`Zimmer-Beschreibung: ${latestReservation.roomDescription || 'N/A'}`);
    console.log(`Erstellt: ${latestReservation.createdAt.toISOString()}`);
    console.log('');

    console.log('WHATSAPP:');
    console.log('-----------------------------------');
    console.log(`Nachricht gesendet: ${latestReservation.sentMessage ? '✅' : '❌'}`);
    console.log(`Gesendet am: ${latestReservation.sentMessageAt ? latestReservation.sentMessageAt.toISOString() : 'N/A'}`);
    if (latestReservation.sentMessage) {
      console.log(`Nachricht (erste 200 Zeichen):`);
      console.log(latestReservation.sentMessage.substring(0, 200) + '...');
    }
    console.log('');

    console.log('PAYMENT:');
    console.log('-----------------------------------');
    console.log(`Payment Link: ${latestReservation.paymentLink ? '✅' : '❌'}`);
    if (latestReservation.paymentLink) {
      console.log(`Link: ${latestReservation.paymentLink}`);
    }
    console.log(`Betrag: ${latestReservation.amount || 'N/A'} ${latestReservation.currency || ''}`);
    console.log('');

    console.log('TÜR-PIN:');
    console.log('-----------------------------------');
    console.log(`Door PIN: ${latestReservation.doorPin ? `✅ ${latestReservation.doorPin}` : '❌'}`);
    console.log(`Door App: ${latestReservation.doorAppName || 'N/A'}`);
    console.log(`TTLock ID: ${latestReservation.ttlLockId || 'N/A'}`);
    console.log(`TTLock Password: ${latestReservation.ttlLockPassword || 'N/A'}`);
    console.log('');

    console.log('CHECK-IN:');
    console.log('-----------------------------------');
    console.log(`Online Check-in abgeschlossen: ${latestReservation.onlineCheckInCompleted ? '✅' : '❌'}`);
    console.log(`Check-in abgeschlossen am: ${latestReservation.onlineCheckInCompletedAt ? latestReservation.onlineCheckInCompletedAt.toISOString() : 'N/A'}`);
    console.log(`Einladung gesendet: ${latestReservation.invitationSentAt ? latestReservation.invitationSentAt.toISOString() : 'N/A'}`);
    console.log('');

    // Prüfe ob alle Felder vorhanden sind für WhatsApp-Versand
    console.log('DIAGNOSE:');
    console.log('-----------------------------------');
    const issues: string[] = [];
    
    if (!latestReservation.guestPhone) {
      issues.push('❌ Keine Telefonnummer vorhanden');
    }
    
    if (!latestReservation.sentMessage) {
      issues.push('❌ WhatsApp-Nachricht wurde nicht versendet');
    }
    
    if (latestReservation.paymentStatus === 'paid' && !latestReservation.doorPin) {
      issues.push('⚠️ Zahlung abgeschlossen, aber kein PIN generiert');
    }
    
    if (latestReservation.doorPin && !latestReservation.sentMessage) {
      issues.push('⚠️ PIN vorhanden, aber WhatsApp-Nachricht fehlt');
    }

    if (issues.length === 0) {
      console.log('✅ Keine offensichtlichen Probleme gefunden');
    } else {
      issues.forEach(issue => console.log(issue));
    }

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLatestReservationDetails();

