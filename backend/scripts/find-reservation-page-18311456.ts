/**
 * Findet auf welcher Seite die Reservation 18311456 liegt
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

async function findReservationPage() {
  console.log('\n🔍 Finde Seite für Reservation 18311456\n');
  console.log('='.repeat(80));

  const reservationId = '18311456';
  const branchId = 3; // Manila (wo sie gefunden wurde)

  try {
    const service = await LobbyPmsService.createForBranch(branchId);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    console.log(`Filter: check_out_date >= ${yesterday.toISOString()}\n`);

    const params: any = {
      per_page: 100,
    };

    let page = 1;
    let found = false;
    const maxPages = 200;

    while (page <= maxPages && !found) {
      console.log(`Prüfe Seite ${page}...`);
      
      const response = await (service as any).axiosInstance.get<any>('/api/v1/bookings', {
        params: { ...params, page },
        validateStatus: (status: number) => status < 500
      });

      const responseData = response.data;
      let pageReservations: any[] = [];
      
      if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
        pageReservations = responseData.data;
      }

      // Filtere nach check_out_date/end_date
      const matchingReservations = pageReservations.filter((reservation: any) => {
        const checkOutDateString = reservation.check_out_date || reservation.end_date;
        if (!checkOutDateString) {
          return false;
        }
        const checkOutDate = new Date(checkOutDateString);
        return checkOutDate >= yesterday;
      });

      console.log(`  Seite ${page}: ${matchingReservations.length} passende Reservierungen (von ${pageReservations.length} insgesamt)`);

      // Suche nach unserer Reservation
      const targetReservation = matchingReservations.find(r => 
        String(r.booking_id) === reservationId || 
        String(r.id) === reservationId
      );

      if (targetReservation) {
        console.log(`\n✅ Reservation gefunden auf Seite ${page}!`);
        console.log(`   Check-out: ${targetReservation.end_date || targetReservation.check_out_date}`);
        found = true;
        break;
      }

      // Prüfe ob es weitere Seiten gibt
      const meta = responseData.meta || {};
      const totalPages = meta.total_pages;
      
      if (pageReservations.length === 0 || (totalPages && page >= totalPages)) {
        console.log(`\n❌ Reservation nicht gefunden (letzte Seite: ${page})`);
        break;
      }

      page++;
    }

    if (!found) {
      console.log(`\n❌ Reservation nicht in den ersten ${page - 1} Seiten gefunden`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findReservationPage();











