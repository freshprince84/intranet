#!/usr/bin/env node
/**
 * Test-Script: Prüft Endpoints mit einer echten Reservierung aus der DB
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testWithDbReservation(branchId: number) {
  console.log('\n🔍 LobbyPMS Endpoint-Test mit DB-Reservierung');
  console.log('='.repeat(60));

  try {
    // Lade Branch mit Settings
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        organization: {
          select: {
            id: true,
            settings: true
          }
        }
      }
    });

    if (!branch) {
      console.error(`❌ Branch ${branchId} nicht gefunden`);
      process.exit(1);
    }

    // Entschlüssele Settings
    const branchSettings = branch.lobbyPmsSettings as any;
    const orgSettings = branch.organization?.settings as any;
    
    const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
    const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
    
    const lobbyPmsSettings = decryptedBranchSettings || decryptedOrgSettings?.lobbyPms;

    if (!lobbyPmsSettings?.apiKey) {
      console.error('❌ LobbyPMS API Key nicht gefunden');
      process.exit(1);
    }

    // Base URL bestimmen
    let apiUrl = lobbyPmsSettings.apiUrl;
    if (!apiUrl) {
      apiUrl = 'https://api.lobbypms.com';
    }
    if (apiUrl.includes('app.lobbypms.com')) {
      apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
    }
    if (apiUrl.endsWith('/api')) {
      apiUrl = apiUrl.replace(/\/api$/, '');
    }

    const apiKey = lobbyPmsSettings.apiKey;

    console.log(`\n📋 Konfiguration:`);
    console.log(`   Branch: ${branch.name} (ID: ${branchId})`);
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...\n`);

    // Erstelle Axios-Instanz
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // Schritt 1: Hole Reservierung aus DB
    console.log('📥 Schritt 1: Hole Reservierung aus lokaler DB...\n');
    
    const dbReservation = await prisma.reservation.findFirst({
      where: { 
        branchId: branchId,
        lobbyReservationId: { not: null }
      },
      select: {
        id: true,
        lobbyReservationId: true,
        guestName: true,
        paymentStatus: true,
        status: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!dbReservation || !dbReservation.lobbyReservationId) {
      console.log('⚠️  Keine Reservierung mit lobbyReservationId gefunden in DB\n');
      return;
    }

    console.log(`✅ Reservierung aus DB:`);
    console.log(`   Lokale ID: ${dbReservation.id}`);
    console.log(`   LobbyPMS ID: ${dbReservation.lobbyReservationId}`);
    console.log(`   Gast: ${dbReservation.guestName}`);
    console.log(`   Status: ${dbReservation.status}`);
    console.log(`   Payment Status: ${dbReservation.paymentStatus}\n`);

    const lobbyId = dbReservation.lobbyReservationId;

    // Schritt 2: Teste Status-Update-Endpoint (wie im Code verwendet)
    console.log('📤 Schritt 2: Teste Status-Update-Endpoint (wie im Code)...\n');
    console.log(`   PUT /reservations/${lobbyId}/status`);
    console.log(`   Body: { status: 'confirmed' }`);
    
    try {
      const response = await axiosInstance.put(
        `/reservations/${lobbyId}/status`,
        { status: 'confirmed' },
        { validateStatus: (status) => status < 500 }
      );

      if (response.status >= 200 && response.status < 300) {
        console.log(`   ✅ ERFOLG (Status ${response.status})`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      } else {
        console.log(`   ⚠️  Status ${response.status}`);
        console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
        console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
        if (axiosError.response?.data) {
          console.log(`   Response:`, JSON.stringify(axiosError.response.data, null, 2));
        }
      }
    }

    console.log('');

    // Schritt 3: Teste Payment-Endpoints
    console.log('📤 Schritt 3: Teste Payment-Update-Endpoints...\n');
    
    const paymentTests = [
      { path: `/reservations/${lobbyId}/payment`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /reservations/{id}/payment' },
      { path: `/bookings/${lobbyId}/payment`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /bookings/{id}/payment' },
      { path: `/reservations/${lobbyId}`, method: 'PATCH', body: { paid_out: 1 }, desc: 'PATCH /reservations/{id}' },
      { path: `/bookings/${lobbyId}`, method: 'PATCH', body: { paid_out: 1 }, desc: 'PATCH /bookings/{id}' },
    ];

    for (const test of paymentTests) {
      try {
        console.log(`📤 Teste: ${test.desc}`);
        console.log(`   ${test.method} ${test.path}`);
        
        const response = await axiosInstance.request({
          method: test.method as any,
          url: test.path,
          data: test.body,
          validateStatus: (status) => status < 500
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          console.log(`   ⚠️  Status ${response.status}`);
          if (response.status !== 404) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else {
            console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
            console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
          }
        }
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const branchId = process.argv[2] ? parseInt(process.argv[2], 10) : 3;

if (isNaN(branchId)) {
  console.error('❌ Ungültige Branch-ID');
  process.exit(1);
}

testWithDbReservation(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });









