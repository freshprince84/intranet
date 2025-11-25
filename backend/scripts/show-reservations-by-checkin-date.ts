#!/usr/bin/env ts-node
/**
 * TEMPORÄRES SCRIPT - NUR ZUM ANZEIGEN
 * Zeigt Reservationen an, die ein Check-in-Datum seit gestern haben
 * IMPORTIERT NICHTS!
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

interface ReservationPreview {
  bookingId: string;
  guestName: string;
  checkInDate: Date;
  checkOutDate: Date;
  creationDate?: Date;
  propertyId?: string;
  branchId?: number;
  branchName?: string;
  status?: string;
  paymentStatus?: string;
  alreadyImported: boolean;
  localReservationId?: number;
}

/**
 * Parst ein Datum als lokales Datum (ohne Zeitzone)
 * Verhindert UTC-Konvertierung bei Datumsstrings im Format YYYY-MM-DD
 */
function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    throw new Error('Datum-String ist leer');
  }
  
  // Wenn das Datum im Format YYYY-MM-DD ist (ohne Zeit), parse es als lokales Datum
  const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    // new Date(year, monthIndex, day) erstellt ein lokales Datum (keine UTC-Konvertierung)
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Fallback: Normales Parsing für andere Formate
  return new Date(dateString);
}

async function showReservationsByCheckInDate() {
  try {
    console.log('='.repeat(80));
    console.log('ANZEIGE: Reservationen mit Check-in-Datum seit gestern');
    console.log('='.repeat(80));
    console.log('');

    // Berechne "gestern" (00:00:00)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    console.log(`Filter: Check-in-Datum >= ${yesterday.toISOString().split('T')[0]}`);
    console.log('');

    // Hole alle Branches mit LobbyPMS-Konfiguration
    const branches = await prisma.branch.findMany({
      where: {
        lobbyPmsSettings: {
          not: null
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`Gefundene Branches mit LobbyPMS: ${branches.length}`);
    console.log('');

    const allReservationPreviews: ReservationPreview[] = [];
    let totalFromLobby = 0;
    let totalAlreadyImported = 0;
    let totalToImport = 0;

    // Für jeden Branch
    for (const branch of branches) {
      try {
        console.log(`\n--- Branch ${branch.id}: ${branch.name} ---`);
        
        // Erstelle LobbyPMS Service für Branch
        const service = await LobbyPmsService.createForBranch(branch.id);
        
        // Hole ALLE Reservationen direkt von der API (ohne creation_date Filter)
        // Wir müssen die interne Logik von fetchReservations nachbauen, aber OHNE creation_date Filter
        console.log(`  Lade Reservationen direkt von LobbyPMS API...`);
        
        // Zugriff auf interne Axios-Instanz (nach loadSettings)
        const axiosInstance = (service as any).axiosInstance;
        if (!axiosInstance) {
          throw new Error('Axios-Instanz nicht verfügbar');
        }

        // Hole alle Seiten mit Pagination (wie in fetchReservations)
        let allReservations: any[] = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 200; // Sicherheitslimit (20.000 Reservierungen max)
        const params: any = {
          per_page: 100,
        };

        const propertyId = (service as any).propertyId;
        if (propertyId) {
          params.property_id = propertyId;
        }

        while (hasMore && page <= maxPages) {
          try {
            const response = await axiosInstance.get<any>('/api/v1/bookings', {
              params: { ...params, page },
              validateStatus: (status: number) => status < 500
            });

            const responseData = response.data;
            if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
              throw new Error('LobbyPMS API Endpoint nicht gefunden');
            }

            let pageReservations: any[] = [];
            if (responseData && typeof responseData === 'object' && responseData.data && Array.isArray(responseData.data)) {
              pageReservations = responseData.data;
            } else if (Array.isArray(responseData)) {
              pageReservations = responseData;
            } else if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
              pageReservations = responseData.data;
            }

            allReservations = allReservations.concat(pageReservations);

            const meta = responseData.meta || {};
            const totalPages = meta.total_pages || 1;
            if (pageReservations.length === 0 || page >= totalPages) {
              hasMore = false;
            } else {
              page++;
            }
          } catch (error) {
            console.error(`  Fehler beim Laden von Seite ${page}:`, error instanceof Error ? error.message : error);
            hasMore = false;
          }
        }

        console.log(`  Gefunden: ${allReservations.length} Reservationen insgesamt (OHNE creation_date Filter)`);
        
        // Debug: Zeige erste Reservation falls vorhanden
        if (allReservations.length > 0) {
          console.log(`  Beispiel-Reservation (erste) - VOLLSTÄNDIGE STRUKTUR:`);
          const first = allReservations[0];
          console.log(JSON.stringify(first, null, 2));
          console.log(`  Verfügbare Felder: ${Object.keys(first).join(', ')}`);
        }

        const lobbyReservations = allReservations;

        // Filtere nach Check-in-Datum (seit gestern)
        const filteredByCheckIn = lobbyReservations.filter((reservation: any) => {
          const checkInDateString = reservation.start_date || reservation.check_in_date;
          if (!checkInDateString) {
            return false; // Keine Check-in-Datum = nicht inkludieren
          }
          
          try {
            const checkInDate = parseLocalDate(checkInDateString);
            return checkInDate >= yesterday;
          } catch (error) {
            console.warn(`    Warnung: Konnte Check-in-Datum nicht parsen: ${checkInDateString}`);
            return false;
          }
        });

        console.log(`  Mit Check-in seit gestern: ${filteredByCheckIn.length}`);

        // Hole bereits importierte Reservationen
        const bookingIds = filteredByCheckIn.map((r: any) => String(r.booking_id || r.id));
        const existingReservations = await prisma.reservation.findMany({
          where: {
            lobbyReservationId: {
              in: bookingIds
            }
          },
          select: {
            id: true,
            lobbyReservationId: true
          }
        });

        const existingIds = new Set(existingReservations.map(r => r.lobbyReservationId));

        // Erstelle Preview-Liste
        for (const reservation of filteredByCheckIn) {
          const bookingId = String(reservation.booking_id || reservation.id);
          const checkInDateString = reservation.start_date || reservation.check_in_date;
          const checkOutDateString = reservation.end_date || reservation.check_out_date;
          
          const guestName = reservation.holder?.name && reservation.holder?.surname
            ? `${reservation.holder.name} ${reservation.holder.surname}${reservation.holder.second_surname ? ' ' + reservation.holder.second_surname : ''}`.trim()
            : (reservation.guest_name || 'Unbekannt');

          const preview: ReservationPreview = {
            bookingId: bookingId,
            guestName: guestName,
            checkInDate: parseLocalDate(checkInDateString),
            checkOutDate: parseLocalDate(checkOutDateString),
            creationDate: reservation.creation_date ? new Date(reservation.creation_date) : undefined,
            propertyId: reservation.property_id,
            branchId: branch.id,
            branchName: branch.name,
            status: reservation.status,
            paymentStatus: reservation.payment_status,
            alreadyImported: existingIds.has(bookingId),
            localReservationId: existingReservations.find(r => r.lobbyReservationId === bookingId)?.id
          };

          allReservationPreviews.push(preview);
          totalFromLobby++;
          if (preview.alreadyImported) {
            totalAlreadyImported++;
          } else {
            totalToImport++;
          }
        }

      } catch (error) {
        console.error(`  Fehler bei Branch ${branch.id} (${branch.name}):`, error instanceof Error ? error.message : error);
      }
    }

    // Zeige Zusammenfassung
    console.log('\n');
    console.log('='.repeat(80));
    console.log('ZUSAMMENFASSUNG');
    console.log('='.repeat(80));
    console.log(`Gesamt Reservationen mit Check-in seit gestern: ${totalFromLobby}`);
    console.log(`  Bereits importiert: ${totalAlreadyImported}`);
    console.log(`  Noch zu importieren: ${totalToImport}`);
    console.log('');

    // Zeige Details - zuerst die noch zu importierenden
    const toImport = allReservationPreviews.filter(r => !r.alreadyImported);
    const alreadyImported = allReservationPreviews.filter(r => r.alreadyImported);

    if (toImport.length > 0) {
      console.log('='.repeat(80));
      console.log(`NOCH ZU IMPORTIEREN (${toImport.length}):`);
      console.log('='.repeat(80));
      
      // Sortiere nach Check-in-Datum
      toImport.sort((a, b) => a.checkInDate.getTime() - b.checkInDate.getTime());
      
      // Gruppiere nach Branch
      const byBranch = new Map<number, ReservationPreview[]>();
      for (const reservation of toImport) {
        if (!reservation.branchId) continue;
        if (!byBranch.has(reservation.branchId)) {
          byBranch.set(reservation.branchId, []);
        }
        byBranch.get(reservation.branchId)!.push(reservation);
      }

      for (const [branchId, reservations] of byBranch.entries()) {
        const branchName = reservations[0]?.branchName || `Branch ${branchId}`;
        console.log(`\n--- ${branchName} (${reservations.length} Reservationen) ---`);
        
        // Zeige alle Reservationen (nicht nur erste)
        for (const reservation of reservations) {
          const checkInStr = reservation.checkInDate.toISOString().split('T')[0];
          const checkOutStr = reservation.checkOutDate.toISOString().split('T')[0];
          const creationStr = reservation.creationDate ? reservation.creationDate.toISOString().split('T')[0] : 'N/A';
          
          console.log(`  • ${reservation.guestName}`);
          console.log(`    Booking ID: ${reservation.bookingId}`);
          console.log(`    Check-in: ${checkInStr} | Check-out: ${checkOutStr}`);
          console.log(`    Erstellt: ${creationStr}`);
          console.log(`    Status: ${reservation.status || 'N/A'} | Payment: ${reservation.paymentStatus || 'N/A'}`);
          console.log('');
        }
      }
    } else {
      console.log('Keine Reservationen zu importieren - alle sind bereits importiert!');
    }

    if (alreadyImported.length > 0) {
      console.log('='.repeat(80));
      console.log(`BEREITS IMPORTIERT (${alreadyImported.length}):`);
      console.log('='.repeat(80));
      console.log('(Details werden aus Platzgründen nicht angezeigt)');
      console.log('');
    }

  } catch (error) {
    console.error('Fehler:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
showReservationsByCheckInDate();

