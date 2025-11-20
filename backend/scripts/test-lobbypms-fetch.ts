#!/usr/bin/env node
/**
 * Test-Script: Ruft die letzten 3 Reservierungen aus LobbyPMS ab
 * für Manila und Parque Poblado
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance } from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testLobbyPmsFetch() {
  try {
    console.log('🔍 Lade Branch-Settings für Manila und Parque Poblado...\n');

    const branches = await prisma.branch.findMany({
      where: {
        name: { in: ['Manila', 'Parque Poblado'] }
      },
      include: {
        organization: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (branches.length === 0) {
      console.log('❌ Keine Branches gefunden');
      return;
    }

    for (const branch of branches) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`${'='.repeat(60)}\n`);

      // Lade Settings
      const branchSettings = branch.lobbyPmsSettings as any;
      const orgSettings = branch.organization?.settings as any;

      // Entschlüssele Settings
      const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
      const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;

      const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.log('⚠️  Kein LobbyPMS API Key konfiguriert');
        console.log('   Branch Settings:', branchSettings ? 'vorhanden' : 'nicht vorhanden');
        console.log('   Org Settings:', orgSettings?.lobbyPms ? 'vorhanden' : 'nicht vorhanden');
        continue;
      }

      console.log('✅ LobbyPMS API Key gefunden');
      console.log(`   API URL: ${lobbyPmsSettings.apiUrl || 'https://app.lobbypms.com/api'}`);
      console.log(`   Property ID: ${lobbyPmsSettings.propertyId || 'nicht gesetzt'}`);
      console.log(`   Sync Enabled: ${lobbyPmsSettings.syncEnabled !== false ? 'ja' : 'nein'}\n`);

      // Erstelle LobbyPMS Service
      const lobbyPmsService = await LobbyPmsService.createForBranch(branch.id);

      // Berechne Datum-Bereich (letzte 30 Tage bis heute + 7 Tage)
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 7);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      console.log(`📅 Zeitraum: ${startDate.toISOString().split('T')[0]} bis ${endDate.toISOString().split('T')[0]}\n`);

      // Hole Reservierungen
      console.log('🔄 Rufe Reservierungen von LobbyPMS ab...\n');
      
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

      console.log(`📊 Letzte ${sortedReservations.length} Reservierungen:\n`);

      sortedReservations.forEach((reservation, index) => {
        console.log(`\n${'-'.repeat(60)}`);
        console.log(`Reservierung ${index + 1}:`);
        console.log(`${'-'.repeat(60)}`);
        console.log(`ID: ${reservation.id}`);
        console.log(`Gast: ${reservation.guest_name || 'N/A'}`);
        console.log(`Email: ${reservation.guest_email || 'N/A'}`);
        console.log(`Telefon: ${reservation.guest_phone || 'N/A'}`);
        console.log(`Check-in: ${reservation.check_in_date || 'N/A'}`);
        console.log(`Check-out: ${reservation.check_out_date || 'N/A'}`);
        console.log(`Ankunftszeit: ${reservation.arrival_time || 'N/A'}`);
        console.log(`Zimmer: ${reservation.room_number || 'N/A'}`);
        console.log(`Zimmer-Beschreibung: ${reservation.room_description || 'N/A'}`);
        console.log(`Status: ${reservation.status || 'N/A'}`);
        console.log(`Zahlungsstatus: ${reservation.payment_status || 'N/A'}`);
        console.log(`Property ID: ${reservation.property_id || 'N/A'}`);
        
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

      console.log(`\n${'='.repeat(60)}\n`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testLobbyPmsFetch()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

