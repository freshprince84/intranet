import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllReservations() {
  try {
    // Hole ALLE Reservierungen
    const reservations = await prisma.reservation.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    console.log(`\n=== Detaillierte Prüfung aller Reservierungen ===`);
    console.log(`Gesamt Reservierungen: ${reservations.length}\n`);

    let problemCount = 0;
    const problems: Array<{id: number, issues: string[]}> = [];

    for (const reservation of reservations) {
      const issues: string[] = [];
      
      // Prüfe alle Felder, die in getFieldValue verwendet werden
      const fieldsToCheck = [
        'guestName',
        'status',
        'paymentStatus',
        'roomNumber',
        'guestEmail',
        'guestPhone',
        'lobbyReservationId',
        'checkInDate',
        'checkOutDate',
        'amount',
        'arrivalTime'
      ];

      for (const field of fieldsToCheck) {
        const value = (reservation as any)[field];
        
        // Prüfe auf undefined
        if (value === undefined) {
          issues.push(`${field} ist undefined`);
        }
        
        // Prüfe auf Objekte statt Strings (außer für Dates und Decimal)
        if (field !== 'checkInDate' && field !== 'checkOutDate' && field !== 'arrivalTime' && field !== 'amount') {
          if (value !== null && value !== undefined && typeof value !== 'string') {
            issues.push(`${field} ist kein String: ${typeof value} (Wert: ${JSON.stringify(value)})`);
          }
        }
        
        // Spezielle Prüfung für String-Felder
        if (['guestName', 'guestEmail', 'guestPhone', 'roomNumber', 'lobbyReservationId'].includes(field)) {
          if (value !== null && value !== undefined) {
            // Prüfe, ob toLowerCase() funktioniert
            try {
              const lower = String(value).toLowerCase();
              if (lower === undefined || lower === null) {
                issues.push(`${field}: toLowerCase() gibt undefined/null zurück`);
              }
            } catch (error) {
              issues.push(`${field}: toLowerCase() wirft Fehler: ${error}`);
            }
            
            // Prüfe, ob endsWith() funktioniert
            try {
              const testEndsWith = String(value).toLowerCase().endsWith('test');
              // Wenn es keinen Fehler gibt, ist es OK
            } catch (error) {
              issues.push(`${field}: endsWith() wirft Fehler: ${error}`);
            }
          }
        }
      }
      
      // Prüfe auf spezielle Zeichen, die Probleme verursachen könnten
      const searchChars = ['p', 'w', 'x'];
      for (const char of searchChars) {
        for (const field of ['guestName', 'guestEmail', 'guestPhone', 'roomNumber', 'lobbyReservationId']) {
          const value = (reservation as any)[field];
          if (value !== null && value !== undefined && typeof value === 'string') {
            try {
              const lower = value.toLowerCase();
              if (lower.includes(char)) {
                // Prüfe, ob endsWith mit diesem Zeichen funktioniert
                try {
                  const testEndsWith = lower.endsWith(char);
                  // Wenn es keinen Fehler gibt, ist es OK
                } catch (error) {
                  issues.push(`${field} enthält "${char}" und endsWith() wirft Fehler: ${error}`);
                }
              }
            } catch (error) {
              issues.push(`${field} enthält "${char}" und toLowerCase() wirft Fehler: ${error}`);
            }
          }
        }
      }
      
      if (issues.length > 0) {
        problemCount++;
        problems.push({ id: reservation.id, issues });
        
        console.log(`\n⚠️  Reservierung ID: ${reservation.id}`);
        console.log(`   Probleme: ${issues.length}`);
        issues.forEach(issue => console.log(`   - ${issue}`));
        console.log(`   guestName: ${JSON.stringify(reservation.guestName)} (${typeof reservation.guestName})`);
        console.log(`   guestEmail: ${JSON.stringify(reservation.guestEmail)} (${typeof reservation.guestEmail})`);
        console.log(`   guestPhone: ${JSON.stringify(reservation.guestPhone)} (${typeof reservation.guestPhone})`);
        console.log(`   roomNumber: ${JSON.stringify(reservation.roomNumber)} (${typeof reservation.roomNumber})`);
        console.log(`   lobbyReservationId: ${JSON.stringify(reservation.lobbyReservationId)} (${typeof reservation.lobbyReservationId})`);
        console.log(`   status: ${JSON.stringify(reservation.status)} (${typeof reservation.status})`);
        console.log(`   paymentStatus: ${JSON.stringify(reservation.paymentStatus)} (${typeof reservation.paymentStatus})`);
      }
    }

    console.log(`\n=== Zusammenfassung ===`);
    console.log(`Gesamt Reservierungen geprüft: ${reservations.length}`);
    console.log(`Reservierungen mit Problemen: ${problemCount}`);
    
    if (problemCount > 0) {
      console.log(`\n⚠️  PROBLEME GEFUNDEN:`);
      problems.forEach(p => {
        console.log(`\nReservierung ID ${p.id}:`);
        p.issues.forEach(issue => console.log(`  - ${issue}`));
      });
    } else {
      console.log(`\n✅ Keine Probleme gefunden in den Reservierungen.`);
    }
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Reservierungen:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllReservations();

