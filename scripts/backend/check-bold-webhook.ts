import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBoldWebhook() {
  try {
    console.log('🔍 Prüfe Bold Payment Webhook-Status...\n');

    // 1. Prüfe Reservation 96
    const reservation = await prisma.reservation.findUnique({
      where: { id: 96 },
      select: {
        id: true,
        guestName: true,
        paymentStatus: true,
        paymentLink: true,
        updatedAt: true
      }
    });

    if (!reservation) {
      console.log('❌ Reservation 96 nicht gefunden');
      return;
    }

    console.log('📋 Reservation 96:');
    console.log('   ID:', reservation.id);
    console.log('   Gast:', reservation.guestName);
    console.log('   Payment Status:', reservation.paymentStatus);
    console.log('   Payment Link:', reservation.paymentLink || 'NICHT GESETZT');
    console.log('   Letzte Aktualisierung:', reservation.updatedAt);
    console.log('');

    // 2. Prüfe ob Payment-Link vorhanden ist
    if (reservation.paymentLink) {
      console.log('✅ Payment-Link vorhanden');
      console.log('   Link:', reservation.paymentLink);
      
      // Extrahiere Reference aus Payment-Link (falls möglich)
      const linkParts = reservation.paymentLink.split('/');
      const linkId = linkParts[linkParts.length - 1];
      console.log('   Link ID:', linkId);
      console.log('');

      // 3. Prüfe ob Webhook-URL korrekt ist
      const appUrl = process.env.APP_URL || 'https://65.109.228.106.nip.io';
      const webhookUrl = `${appUrl}/api/bold-payment/webhook`;
      console.log('📡 Webhook-URL (sollte in Bold Payment konfiguriert sein):');
      console.log('   ', webhookUrl);
      console.log('');

      // 4. Prüfe ob Payment Status "paid" ist
      if (reservation.paymentStatus === 'paid') {
        console.log('✅ Payment Status ist bereits "paid"');
        console.log('   → Webhook wurde wahrscheinlich bereits verarbeitet');
      } else {
        console.log('⚠️ Payment Status ist noch nicht "paid"');
        console.log('   Aktueller Status:', reservation.paymentStatus);
        console.log('   → Webhook wurde möglicherweise noch nicht verarbeitet');
        console.log('   → Oder Webhook ist nicht angekommen');
        console.log('   → Oder Webhook konnte Reservation nicht finden');
      }
    } else {
      console.log('⚠️ Kein Payment-Link vorhanden');
    }

    console.log('\n🔍 Mögliche Probleme:');
    console.log('   1. Webhook kommt nicht an (URL nicht konfiguriert in Bold Payment)');
    console.log('   2. Webhook kann Reservation nicht finden (Reference-Format stimmt nicht)');
    console.log('   3. Webhook kommt an, aber Reservation-Update schlägt fehl');
    console.log('   4. Frontend lädt Reservation nicht neu (kein Polling/Refresh)');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBoldWebhook();



