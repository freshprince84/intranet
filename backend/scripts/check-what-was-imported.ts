#!/usr/bin/env ts-node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWhatWasImported() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    console.log('='.repeat(80));
    console.log('PRÜFUNG: Was wurde seit gestern erstellt?');
    console.log('='.repeat(80));
    console.log(`Zeitraum: ${yesterday.toISOString()} bis jetzt\n`);
    
    // Prüfe Tasks
    const tasks = await prisma.task.findMany({
      where: { 
        createdAt: { gte: yesterday } 
      },
      include: {
        reservation: {
          select: {
            id: true,
            lobbyReservationId: true,
            guestName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nTASKS ERSTELLT: ${tasks.length}`);
    if (tasks.length > 0) {
      tasks.forEach(t => {
        console.log(`  Task ID ${t.id}: "${t.title}"`);
        console.log(`    Erstellt: ${t.createdAt.toISOString()}`);
        if (t.reservation) {
          console.log(`    Reservation: ${t.reservation.guestName} (Lobby ID: ${t.reservation.lobbyReservationId})`);
        }
        console.log('');
      });
    }
    
    // Prüfe Notifications
    const notifications = await prisma.notification.findMany({
      where: { 
        createdAt: { gte: yesterday } 
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nNOTIFICATIONS ERSTELLT: ${notifications.length}`);
    if (notifications.length > 0) {
      notifications.forEach(n => {
        console.log(`  Notification ID ${n.id}: "${n.title}"`);
        console.log(`    Type: ${n.type}`);
        console.log(`    Erstellt: ${n.createdAt.toISOString()}`);
        console.log('');
      });
    }
    
    // Prüfe Reservationen
    const reservations = await prisma.reservation.findMany({
      where: {
        createdAt: { gte: yesterday }
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\nRESERVATIONEN ERSTELLT: ${reservations.length}`);
    if (reservations.length > 0) {
      console.log('Erste 10:');
      reservations.slice(0, 10).forEach(r => {
        console.log(`  Reservation ID ${r.id}: ${r.guestName} (Lobby ID: ${r.lobbyReservationId}) - ${r.createdAt.toISOString()}`);
      });
      if (reservations.length > 10) {
        console.log(`  ... und ${reservations.length - 10} weitere`);
      }
    }
    
    // Prüfe welche Tasks zu den Reservationen gehören
    if (tasks.length > 0 && reservations.length > 0) {
      console.log(`\nVERKNÜPFUNG: Tasks zu Reservationen`);
      const reservationIds = new Set(reservations.map(r => r.id));
      const tasksWithReservations = tasks.filter(t => t.reservation && reservationIds.has(t.reservation.id));
      console.log(`Tasks die zu den neuen Reservationen gehören: ${tasksWithReservations.length}`);
    }
    
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkWhatWasImported();

