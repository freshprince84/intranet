/**
 * Script zum Hinzufügen des invitationSentAt Feldes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addInvitationSentAt() {
  console.log('\n🔧 Füge invitationSentAt Feld zur Reservation Tabelle hinzu...\n');

  try {
    // Prüfe ob Feld bereits existiert
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Reservation' 
      AND column_name = 'invitationSentAt'
    `;

    if (Array.isArray(result) && result.length > 0) {
      console.log('✅ Feld invitationSentAt existiert bereits\n');
      return;
    }

    // Füge Feld hinzu
    await prisma.$executeRaw`
      ALTER TABLE "Reservation" 
      ADD COLUMN IF NOT EXISTS "invitationSentAt" TIMESTAMP(3)
    `;

    console.log('✅ Feld invitationSentAt erfolgreich hinzugefügt\n');
  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addInvitationSentAt();

