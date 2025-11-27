const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWhatsAppMessages() {
  try {
    console.log('🔍 Prüfe WhatsApp-Nachrichten in Datenbank...\n');
    
    // Prüfe eingehende Nachrichten (letzte 24h)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const incomingMessages = await prisma.whatsAppMessage.findMany({
      where: {
        direction: 'incoming',
        sentAt: { gte: twentyFourHoursAgo }
      },
      orderBy: { sentAt: 'desc' },
      take: 10
    });
    
    console.log(`📥 Eingehende Nachrichten (letzte 24h): ${incomingMessages.length}`);
    incomingMessages.forEach(msg => {
      console.log(`   - ${msg.phoneNumber} (${msg.sentAt.toISOString()}): ${msg.message.substring(0, 50)}...`);
    });
    console.log('');
    
    // Prüfe ausgehende Nachrichten (letzte 24h)
    const outgoingMessages = await prisma.whatsAppMessage.findMany({
      where: {
        direction: 'outgoing',
        sentAt: { gte: twentyFourHoursAgo }
      },
      orderBy: { sentAt: 'desc' },
      take: 10
    });
    
    console.log(`📤 Ausgehende Nachrichten (letzte 24h): ${outgoingMessages.length}`);
    outgoingMessages.forEach(msg => {
      console.log(`   - ${msg.phoneNumber} (${msg.sentAt.toISOString()}, Status: ${msg.status || 'N/A'}): ${msg.message.substring(0, 50)}...`);
    });
    console.log('');
    
    // Prüfe spezifische Reservation (14679)
    const reservationMessages = await prisma.whatsAppMessage.findMany({
      where: { reservationId: 14679 },
      orderBy: { sentAt: 'desc' }
    });
    
    console.log(`📋 WhatsApp-Nachrichten für Reservation 14679: ${reservationMessages.length}`);
    reservationMessages.forEach(msg => {
      console.log(`   - ${msg.direction === 'incoming' ? '📥' : '📤'} ${msg.phoneNumber} (${msg.sentAt.toISOString()}, Status: ${msg.status || 'N/A'})`);
      if (msg.message) {
        console.log(`     ${msg.message.substring(0, 80)}...`);
      }
    });
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhatsAppMessages();

