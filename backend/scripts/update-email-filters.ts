/**
 * Script zum Aktualisieren der Email-Filter für alle Reservation-Quellen
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function updateFilters() {
  try {
    const organizationId = 1;
    
    console.log('📧 Aktualisiere Email-Filter...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization) {
      console.error('❌ Organisation nicht gefunden');
      process.exit(1);
    }

    const settings = (organization.settings || {}) as any;
    
    if (!settings.emailReading) {
      settings.emailReading = {};
    }
    
    if (!settings.emailReading.filters) {
      settings.emailReading.filters = {};
    }

    // Erweitere Filter für alle Reservation-Quellen
    settings.emailReading.filters.from = ['notification@lobbybookings.com'];
    settings.emailReading.filters.subject = [
      'Nueva reserva',
      'New reservation',
      'Airbnb',
      'Hostelworld',
      'Booking.com',
      'reserva',
      'reservation'
    ];

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings }
    });

    console.log('✅ Filter aktualisiert!\n');
    console.log('From:', settings.emailReading.filters.from);
    console.log('Subject:', settings.emailReading.filters.subject);
    console.log('\n💡 Jetzt können Booking.com, Airbnb und Hostelworld-Emails verarbeitet werden!');

  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateFilters();

