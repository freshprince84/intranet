#!/usr/bin/env node
/**
 * Test-Script: Prüft verschiedene Endpoint-Varianten mit booking_id
 * 
 * Testet sowohl /reservations/ als auch /bookings/ Endpoints
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testEndpointsWithBookingId(branchId: number) {
  console.log('\n🔍 LobbyPMS Endpoint-Test mit booking_id');
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

    // Schritt 1: Hole eine aktuelle Reservierung
    console.log('📥 Schritt 1: Hole aktuelle Reservierung...\n');
    
    let bookingId: string | null = null;
    try {
      const bookingsResponse = await axiosInstance.get('/api/v1/bookings', {
        params: { per_page: 1, page: 1 },
        validateStatus: (status) => status < 500
      });

      if (bookingsResponse.data?.data && Array.isArray(bookingsResponse.data.data) && bookingsResponse.data.data.length > 0) {
        const booking = bookingsResponse.data.data[0];
        bookingId = String(booking.booking_id || booking.id);
        console.log(`✅ Reservierung gefunden:`);
        console.log(`   Booking ID: ${bookingId}`);
        console.log(`   Gast: ${booking.holder?.name || booking.guest_name || 'N/A'}\n`);
      } else {
        console.log('⚠️  Keine Reservierungen gefunden\n');
        return;
      }
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Reservierungen:', error);
      return;
    }

    if (!bookingId) {
      console.error('❌ Keine Booking-ID gefunden');
      return;
    }

    // Schritt 2: Teste verschiedene Endpoint-Varianten
    console.log('📤 Schritt 2: Teste verschiedene Endpoint-Varianten...\n');
    
    const testCases = [
      // Status-Update mit /reservations/
      { path: `/reservations/${bookingId}/status`, method: 'PUT', body: { status: 'confirmed' }, desc: 'PUT /reservations/{id}/status' },
      // Status-Update mit /bookings/
      { path: `/bookings/${bookingId}/status`, method: 'PUT', body: { status: 'confirmed' }, desc: 'PUT /bookings/{id}/status' },
      // Payment-Update mit /reservations/
      { path: `/reservations/${bookingId}/payment`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /reservations/{id}/payment' },
      // Payment-Update mit /bookings/
      { path: `/bookings/${bookingId}/payment`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /bookings/{id}/payment' },
      // Payment-Update mit /api/v1/bookings/
      { path: `/api/v1/bookings/${bookingId}/payment`, method: 'PUT', body: { paid_out: 1 }, desc: 'PUT /api/v1/bookings/{id}/payment' },
      // Allgemeiner Update mit /reservations/
      { path: `/reservations/${bookingId}`, method: 'PATCH', body: { paid_out: 1 }, desc: 'PATCH /reservations/{id}' },
      // Allgemeiner Update mit /bookings/
      { path: `/bookings/${bookingId}`, method: 'PATCH', body: { paid_out: 1 }, desc: 'PATCH /bookings/{id}' },
    ];

    for (const testCase of testCases) {
      try {
        console.log(`📤 Teste: ${testCase.desc}`);
        console.log(`   ${testCase.method} ${testCase.path}`);
        
        const response = await axiosInstance.request({
          method: testCase.method as any,
          url: testCase.path,
          data: testCase.body,
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
        } else {
          console.log(`   ❌ UNBEKANNTER FEHLER:`, error);
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

testEndpointsWithBookingId(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });












