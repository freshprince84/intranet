/**
 * Script zur Migration bestehender Reservationen in Gruppen
 * 
 * Führt die Gruppenzuweisung für alle Reservationen durch, die:
 * - Check-in-Datum heute oder in der Zukunft haben
 * - Noch keine Gruppen-ID haben
 * 
 * Ausführung:
 * npx ts-node scripts/migrate-reservation-groups.ts
 */

import { PrismaClient } from '@prisma/client';
import { ReservationGroupingService } from '../src/services/reservationGroupingService';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Reservation Gruppen-Migration ===\n');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Finde alle Reservationen ohne Gruppen-ID mit Check-in heute oder in Zukunft
  const reservations = await prisma.reservation.findMany({
    where: {
      checkInDate: { gte: today },
      reservationGroupId: null
    },
    orderBy: { createdAt: 'asc' }
  });
  
  console.log(`Gefundene Reservationen für Migration: ${reservations.length}\n`);
  
  if (reservations.length === 0) {
    console.log('Keine Reservationen zu migrieren.');
    return;
  }
  
  let processed = 0;
  let grouped = 0;
  const groupStats: Record<string, number> = {};
  
  for (const reservation of reservations) {
    try {
      const updated = await ReservationGroupingService.assignToGroup(reservation);
      
      if (updated.reservationGroupId) {
        grouped++;
        
        // Statistik
        const groupId = updated.reservationGroupId;
        groupStats[groupId] = (groupStats[groupId] || 0) + 1;
        
        console.log(`  ✓ Reservation ${reservation.id} (${reservation.guestName}) → Gruppe ${groupId.substring(0, 8)}... ${updated.isPrimaryInGroup ? '(primär)' : ''}`);
      } else {
        console.log(`  - Reservation ${reservation.id} (${reservation.guestName}) → keine Gruppe (fehlende Kontaktdaten)`);
      }
      
      processed++;
    } catch (error) {
      console.error(`  ✗ Fehler bei Reservation ${reservation.id}:`, error);
    }
  }
  
  // Statistik ausgeben
  console.log('\n=== Statistik ===');
  console.log(`Verarbeitet: ${processed}`);
  console.log(`Gruppiert: ${grouped}`);
  
  // Gruppen mit mehr als 1 Mitglied
  const multiMemberGroups = Object.entries(groupStats)
    .filter(([, count]) => count > 1);
  
  if (multiMemberGroups.length > 0) {
    console.log(`\nGruppen mit mehreren Mitgliedern: ${multiMemberGroups.length}`);
    for (const [groupId, count] of multiMemberGroups) {
      console.log(`  - Gruppe ${groupId.substring(0, 8)}...: ${count} Reservationen`);
    }
  }
  
  console.log('\n✓ Migration abgeschlossen');
}

main()
  .catch((error) => {
    console.error('Fehler bei der Migration:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

