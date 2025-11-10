/**
 * Script zum Erstellen von Mock-Reservierungen in der Datenbank
 * 
 * Verwendet für Tests ohne echte LobbyPMS API
 */

import { PrismaClient, ReservationStatus, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function createMockReservations(organizationId: number = 1) {
  console.log(`\n🔧 Erstelle Mock-Reservierungen für Organisation ${organizationId}...\n`);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const mockReservations = [
    {
      lobbyReservationId: 'MOCK-RES-001',
      guestName: 'Juan Pérez',
      guestEmail: 'juan.perez@example.com',
      guestPhone: '+573001234567',
      checkInDate: tomorrow,
      checkOutDate: dayAfter,
      arrivalTime: new Date(tomorrow.getTime() + 23 * 60 * 60 * 1000), // 23:00
      roomNumber: '101',
      roomDescription: 'Einzelzimmer mit Bad',
      status: ReservationStatus.confirmed,
      paymentStatus: PaymentStatus.pending,
      guestNationality: 'CO',
      guestPassportNumber: 'AB123456',
      guestBirthDate: new Date('1990-01-15'),
      organizationId
    },
    {
      lobbyReservationId: 'MOCK-RES-002',
      guestName: 'Maria García',
      guestEmail: 'maria.garcia@example.com',
      guestPhone: '+573007654321',
      checkInDate: tomorrow,
      checkOutDate: new Date(dayAfter.getTime() - 24 * 60 * 60 * 1000),
      arrivalTime: new Date(tomorrow.getTime() + 22.5 * 60 * 60 * 1000), // 22:30
      roomNumber: '102',
      roomDescription: 'Doppelzimmer',
      status: ReservationStatus.confirmed,
      paymentStatus: PaymentStatus.pending,
      guestNationality: 'ES',
      guestPassportNumber: 'CD789012',
      guestBirthDate: new Date('1985-05-20'),
      organizationId
    },
    {
      lobbyReservationId: 'MOCK-RES-003',
      guestName: 'Carlos Rodríguez',
      guestEmail: 'carlos.rodriguez@example.com',
      guestPhone: '+573009876543',
      checkInDate: new Date(),
      checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      arrivalTime: new Date(Date.now() + 14 * 60 * 60 * 1000), // 14:00
      roomNumber: '201',
      roomDescription: 'Dormitorio 4-Bett',
      status: ReservationStatus.checked_in,
      paymentStatus: PaymentStatus.paid,
      guestNationality: 'MX',
      guestPassportNumber: 'EF345678',
      guestBirthDate: new Date('1992-08-10'),
      organizationId
    }
  ];

  try {
    for (const reservationData of mockReservations) {
      // Prüfe ob bereits vorhanden
      const existing = await prisma.reservation.findUnique({
        where: { lobbyReservationId: reservationData.lobbyReservationId }
      });

      if (existing) {
        console.log(`⏭️  Reservierung ${reservationData.lobbyReservationId} bereits vorhanden, überspringe...`);
        continue;
      }

      const reservation = await prisma.reservation.create({
        data: reservationData
      });

      console.log(`✅ Reservierung erstellt: ${reservation.guestName} (ID: ${reservation.id})`);
    }

    console.log(`\n✅ ${mockReservations.length} Mock-Reservierungen erstellt/geprüft\n`);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Mock-Reservierungen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Hauptfunktion
const organizationId = parseInt(process.argv[2] || '1');
createMockReservations(organizationId);

