/**
 * Script zum Durchführen eines manuellen Email-Checks
 * Verarbeitet alle ungelesenen Reservation-Emails und erstellt Reservationen
 */

import { EmailReservationService } from '../src/services/emailReservationService';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function runEmailCheck() {
  try {
    const organizationId = 1;
    
    console.log('📧 Starte Email-Check für Organisation 1...\n');

    const processedCount = await EmailReservationService.checkForNewReservationEmails(organizationId);

    console.log(`\n✅ Email-Check abgeschlossen!`);
    console.log(`   ${processedCount} Reservation(s) aus Email(s) erstellt\n`);

    if (processedCount > 0) {
      console.log('📋 Erstellte Reservationen können im System unter /reservations eingesehen werden');
    } else {
      console.log('ℹ️  Keine neuen Reservation-Emails verarbeitet');
      console.log('   (Mögliche Gründe: Emails bereits verarbeitet, Parsing fehlgeschlagen, oder keine passenden Emails)');
    }

  } catch (error) {
    console.error('\n❌ Fehler beim Email-Check:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Check aus
runEmailCheck();

