#!/usr/bin/env ts-node
/**
 * IMPORT-SCRIPT: Importiert Reservationen mit Check-in-Datum seit gestern
 * Führt den Import direkt auf dem Server aus
 */

import { PrismaClient } from '@prisma/client';
import { LobbyPmsService } from '../src/services/lobbyPmsService';

const prisma = new PrismaClient();

/**
 * Parst ein Datum als lokales Datum (ohne Zeitzone)
 */
function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    throw new Error('Datum-String ist leer');
  }
  
  const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  return new Date(dateString);
}

async function importReservationsByCheckInDate() {
  try {
    console.log('='.repeat(80));
    console.log('IMPORT: Reservationen mit Check-in-Datum seit gestern');
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
            name: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`Gefundene Branches mit LobbyPMS: ${branches.length}`);
    console.log('');

    let totalImported = 0;
    let totalErrors = 0;
    const errors: Array<{ branchId: number; branchName: string; bookingId: string; error: string }> = [];

    // Für jeden Branch
    for (const branch of branches) {
      try {
        console.log(`\n--- Branch ${branch.id}: ${branch.name} ---`);
        
        // Erstelle LobbyPMS Service für Branch
        const service = await LobbyPmsService.createForBranch(branch.id);
        
        // Hole ALLE Reservationen direkt von der API (ohne creation_date Filter)
        console.log(`  Lade Reservationen von LobbyPMS API...`);
        
        const axiosInstance = (service as any).axiosInstance;
        if (!axiosInstance) {
          throw new Error('Axios-Instanz nicht verfügbar');
        }

        let allReservations: any[] = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 200;
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

        console.log(`  Gefunden: ${allReservations.length} Reservationen insgesamt`);

        // Filtere nach Check-in-Datum (seit gestern)
        const filteredByCheckIn = allReservations.filter((reservation: any) => {
          const checkInDateString = reservation.start_date || reservation.check_in_date;
          if (!checkInDateString) {
            return false;
          }
          
          try {
            const checkInDate = parseLocalDate(checkInDateString);
            return checkInDate >= yesterday;
          } catch (error) {
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
            lobbyReservationId: true
          }
        });

        const existingIds = new Set(existingReservations.map(r => r.lobbyReservationId));

        // Importiere nur die, die noch nicht importiert sind
        const toImport = filteredByCheckIn.filter((r: any) => {
          const bookingId = String(r.booking_id || r.id);
          return !existingIds.has(bookingId);
        });

        console.log(`  Noch zu importieren: ${toImport.length}`);

        // Importiere jede Reservation DIREKT (ohne syncReservation, damit keine Tasks erstellt werden)
        for (const reservation of toImport) {
          try {
            const bookingId = String(reservation.booking_id || reservation.id);
            
            // Extrahiere Daten (wie in syncReservation, aber OHNE Task-Erstellung)
            const holder = reservation.holder || {};
            const guestName = (holder.name && holder.surname) 
              ? `${holder.name} ${holder.surname}${holder.second_surname ? ' ' + holder.second_surname : ''}`.trim()
              : (reservation.guest_name || 'Unbekannt');
            const guestEmail = holder.email || reservation.guest_email || null;
            const guestPhone = holder.phone || reservation.guest_phone || null;
            const guestNationality = holder.country || null;
            
            const checkInDateString = reservation.start_date || reservation.check_in_date;
            const checkOutDateString = reservation.end_date || reservation.check_out_date;
            
            if (!checkInDateString || !checkOutDateString) {
              throw new Error('Check-in oder Check-out Datum fehlt');
            }
            
            const checkInDate = parseLocalDate(checkInDateString);
            const checkOutDate = parseLocalDate(checkOutDateString);
            
            // Status-Mapping
            let status = 'confirmed';
            if (reservation.checked_out) {
              status = 'checked_out';
            } else if (reservation.checked_in) {
              status = 'checked_in';
            }
            
            // Payment Status
            let paymentStatus = 'pending';
            const paidOut = parseFloat(reservation.paid_out || '0');
            const totalToPay = parseFloat(reservation.total_to_pay || reservation.total_to_pay_accommodation || '0');
            if (paidOut >= totalToPay && totalToPay > 0) {
              paymentStatus = 'paid';
            } else if (paidOut > 0) {
              paymentStatus = 'partially_paid';
            }
            
            const amount = totalToPay > 0 ? totalToPay : null;
            const currency = reservation.currency || 'COP';
            
            // Room-Daten
            const assignedRoom = reservation.assigned_room;
            const isDorm = assignedRoom?.type === 'compartida';
            let roomNumber: string | null = null;
            let roomDescription: string | null = null;
            
            if (isDorm) {
              const dormName = reservation.category?.name || null;
              const bedNumber = assignedRoom?.name || null;
              roomNumber = bedNumber;
              roomDescription = dormName;
            } else {
              // Für Privatzimmer: assigned_room.name = Zimmername
              // roomNumber bleibt leer (nur bei Dorms gefüllt)
              roomNumber = null;
              // roomDescription = Zimmername
              roomDescription = assignedRoom?.name || reservation.room_number || null;
            }
            
            // Erstelle Reservation DIREKT in DB (OHNE Tasks, OHNE Notifications)
            await prisma.reservation.upsert({
              where: {
                lobbyReservationId: bookingId
              },
              create: {
                lobbyReservationId: bookingId,
                guestName: guestName,
                guestEmail: guestEmail,
                guestPhone: guestPhone,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                arrivalTime: reservation.arrival_time ? new Date(reservation.arrival_time) : null,
                roomNumber: roomNumber,
                roomDescription: roomDescription,
                status: status as any,
                paymentStatus: paymentStatus as any,
                amount: amount,
                currency: currency,
                guestNationality: guestNationality,
                organizationId: branch.organizationId!,
                branchId: branch.id,
              },
              update: {
                guestName: guestName,
                guestEmail: guestEmail,
                guestPhone: guestPhone,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                arrivalTime: reservation.arrival_time ? new Date(reservation.arrival_time) : null,
                roomNumber: roomNumber,
                roomDescription: roomDescription,
                status: status as any,
                paymentStatus: paymentStatus as any,
                amount: amount,
                currency: currency,
                guestNationality: guestNationality,
              }
            });
            
            // Erstelle Sync-History (optional, für Tracking)
            const createdReservation = await prisma.reservation.findUnique({
              where: { lobbyReservationId: bookingId }
            });
            
            if (createdReservation) {
              await prisma.reservationSyncHistory.create({
                data: {
                  reservationId: createdReservation.id,
                  syncType: 'created',
                  syncData: reservation as any,
                }
              });
            }
            
            totalImported++;
            if (totalImported % 10 === 0) {
              console.log(`    ... ${totalImported} importiert ...`);
            }
          } catch (error) {
            totalErrors++;
            const bookingId = String(reservation.booking_id || reservation.id || 'unknown');
            const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
            errors.push({
              branchId: branch.id,
              branchName: branch.name,
              bookingId: bookingId,
              error: errorMsg
            });
            console.error(`    Fehler bei Booking ID ${bookingId}: ${errorMsg}`);
          }
        }

        console.log(`  ✅ Branch ${branch.id}: ${toImport.length} Reservationen verarbeitet`);

      } catch (error) {
        console.error(`  ❌ Fehler bei Branch ${branch.id} (${branch.name}):`, error instanceof Error ? error.message : error);
        totalErrors++;
      }
    }

    // Zeige Zusammenfassung
    console.log('\n');
    console.log('='.repeat(80));
    console.log('ZUSAMMENFASSUNG');
    console.log('='.repeat(80));
    console.log(`Erfolgreich importiert: ${totalImported}`);
    console.log(`Fehler: ${totalErrors}`);
    console.log('');

    if (errors.length > 0) {
      console.log('='.repeat(80));
      console.log('FEHLER-DETAILS:');
      console.log('='.repeat(80));
      for (const err of errors) {
        console.log(`  Branch ${err.branchId} (${err.branchName}): Booking ID ${err.bookingId} - ${err.error}`);
      }
      console.log('');
    }

    console.log('✅ Import abgeschlossen!');

  } catch (error) {
    console.error('❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Import aus
importReservationsByCheckInDate();

