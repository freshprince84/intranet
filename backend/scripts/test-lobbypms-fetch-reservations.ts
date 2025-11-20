#!/usr/bin/env node
/**
 * Test-Script: Ruft Reservierungen von LobbyPMS API ab
 * 
 * Ruft die letzten Reservierungen für Manila und Parque Poblado ab
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Dynamische Imports um TypeScript-Fehler zu vermeiden
let LobbyPmsService: any;
let decryptBranchApiSettings: any;
let decryptApiSettings: any;

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Lade Services dynamisch
async function loadServices() {
  const lobbyPmsModule = await import('../src/services/lobbyPmsService');
  LobbyPmsService = lobbyPmsModule.LobbyPmsService;
  
  const encryptionModule = await import('../src/utils/encryption');
  decryptBranchApiSettings = encryptionModule.decryptBranchApiSettings;
  decryptApiSettings = encryptionModule.decryptApiSettings;
}

async function fetchReservationsForBranches() {
  try {
    // Lade Services
    await loadServices();
    
    console.log('🔍 Suche Branches "Manila" und "Parque Poblado"...\n');

    // Finde Branches
    const branches = await prisma.branch.findMany({
      where: {
        name: { in: ['Manila', 'Parque Poblado'] }
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        }
      }
    });

    if (branches.length === 0) {
      console.log('❌ Keine Branches gefunden');
      return;
    }

    console.log(`✅ ${branches.length} Branch(es) gefunden\n`);

    for (const branch of branches) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`${'='.repeat(80)}\n`);

      // Prüfe LobbyPMS Settings
      const branchSettings = branch.lobbyPmsSettings as any;
      const orgSettings = branch.organization?.settings as any;
      
      // Entschlüssele Settings
      const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
      const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
      
      const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.log('⚠️  Kein LobbyPMS API Key konfiguriert');
        console.log('   Branch Settings:', branchSettings ? 'vorhanden' : 'fehlt');
        console.log('   Org Settings:', orgSettings?.lobbyPms ? 'vorhanden' : 'fehlt');
        continue;
      }

      console.log('✅ LobbyPMS API Key gefunden');
      console.log(`   API URL: ${lobbyPmsSettings.apiUrl || 'https://app.lobbypms.com/api'}`);
      console.log(`   Property ID: ${lobbyPmsSettings.propertyId || 'nicht gesetzt'}`);
      console.log(`   Sync Enabled: ${lobbyPmsSettings.syncEnabled !== false ? 'ja' : 'nein'}\n`);

      try {
        // Erstelle LobbyPMS Service für Branch
        const lobbyPmsService = await LobbyPmsService.createForBranch(branch.id);

        // Hole Reservierungen: Letzte 30 Tage bis +30 Tage
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // 30 Tage zurück
        
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30); // 30 Tage voraus

        console.log(`📥 Rufe Reservierungen ab (${startDate.toISOString().split('T')[0]} bis ${endDate.toISOString().split('T')[0]})...\n`);

        const reservations = await lobbyPmsService.fetchReservations(startDate, endDate);

        console.log(`✅ ${reservations.length} Reservierungen abgerufen\n`);

        // Sortiere nach Check-in-Datum (neueste zuerst) und nimm die letzten 3
        const sortedReservations = reservations
          .sort((a, b) => {
            const dateA = new Date(a.check_in_date || 0).getTime();
            const dateB = new Date(b.check_in_date || 0).getTime();
            return dateB - dateA; // Neueste zuerst
          })
          .slice(0, 3);

        if (sortedReservations.length === 0) {
          console.log('⚠️  Keine Reservierungen gefunden\n');
          continue;
        }

        console.log(`📋 Zeige die letzten ${sortedReservations.length} Reservierungen:\n`);

        sortedReservations.forEach((reservation, index) => {
          console.log(`\n${'-'.repeat(80)}`);
          console.log(`Reservierung ${index + 1}:`);
          console.log(`${'-'.repeat(80)}`);
          console.log(`ID: ${reservation.id}`);
          console.log(`Gast: ${reservation.guest_name || 'Unbekannt'}`);
          console.log(`Email: ${reservation.guest_email || 'Nicht angegeben'}`);
          console.log(`Telefon: ${reservation.guest_phone || 'Nicht angegeben'}`);
          console.log(`Check-in: ${reservation.check_in_date || 'Nicht angegeben'}`);
          console.log(`Check-out: ${reservation.check_out_date || 'Nicht angegeben'}`);
          console.log(`Ankunftszeit: ${reservation.arrival_time || 'Nicht angegeben'}`);
          console.log(`Zimmer: ${reservation.room_number || 'Nicht angegeben'}`);
          console.log(`Zimmer-Beschreibung: ${reservation.room_description || 'Nicht angegeben'}`);
          console.log(`Status: ${reservation.status || 'Nicht angegeben'}`);
          console.log(`Zahlungsstatus: ${reservation.payment_status || 'Nicht angegeben'}`);
          console.log(`Property ID: ${reservation.property_id || 'Nicht angegeben'}`);
          
          // Zeige alle weiteren Felder
          const knownFields = ['id', 'guest_name', 'guest_email', 'guest_phone', 'check_in_date', 'check_out_date', 'arrival_time', 'room_number', 'room_description', 'status', 'payment_status', 'property_id'];
          const additionalFields = Object.keys(reservation).filter(key => !knownFields.includes(key));
          if (additionalFields.length > 0) {
            console.log(`\nWeitere Felder:`);
            additionalFields.forEach(field => {
              console.log(`  ${field}: ${JSON.stringify(reservation[field])}`);
            });
          }
        });

      } catch (error) {
        console.error(`❌ Fehler beim Abrufen der Reservierungen:`, error);
        if (error instanceof Error) {
          console.error(`   Fehlermeldung: ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Script aus
fetchReservationsForBranches()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

