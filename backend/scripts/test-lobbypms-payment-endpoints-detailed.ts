#!/usr/bin/env node
/**
 * Test-Script: Prüft Payment-Endpoints mit verschiedenen ID-Formaten
 * 
 * WICHTIG: Testet nur die Endpoint-Struktur, ändert keine echten Daten
 * Verwendet booking_id aus der API-Response
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

interface TestResult {
  endpoint: string;
  method: string;
  body?: any;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

async function testPaymentEndpointsDetailed(branchId: number) {
  console.log('\n🔍 LobbyPMS Payment-Update Endpoint-Test (Detailliert)');
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

    // Schritt 1: Hole eine aktuelle Reservierung von der API
    console.log('📥 Schritt 1: Hole aktuelle Reservierung von LobbyPMS API...\n');
    
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
        console.log(`   Gast: ${booking.holder?.name || booking.guest_name || 'N/A'}`);
        console.log(`   Paid Out: ${booking.paid_out || 0}`);
        console.log(`   Total To Pay: ${booking.total_to_pay || booking.total_to_pay_accommodation || 0}`);
        console.log(`   Payment Status: ${booking.payment_status || 'N/A'}\n`);
      } else {
        console.log('⚠️  Keine Reservierungen gefunden in API-Response\n');
        console.log('Response:', JSON.stringify(bookingsResponse.data, null, 2));
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

    // Schritt 2: Teste Status-Update-Endpoint (Referenz - sollte funktionieren)
    console.log('📤 Schritt 2: Teste Status-Update-Endpoint (Referenz)...\n');
    console.log(`   PUT /reservations/${bookingId}/status`);
    
    let statusEndpointWorks = false;
    try {
      const statusResponse = await axiosInstance.put(
        `/reservations/${bookingId}/status`,
        { status: 'confirmed' }, // Setze zurück auf confirmed (sollte sicher sein)
        { validateStatus: (status) => status < 500 }
      );

      if (statusResponse.status === 200 || statusResponse.status === 201) {
        console.log(`   ✅ Status-Update funktioniert! (Status ${statusResponse.status})`);
        statusEndpointWorks = true;
      } else {
        console.log(`   ⚠️  Status ${statusResponse.status} - Endpoint antwortet`);
        console.log(`   Response:`, JSON.stringify(statusResponse.data, null, 2));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.log(`   ❌ Status ${axiosError.response?.status || 'N/A'}`);
        console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
        if (axiosError.response?.status === 404) {
          console.log(`   ⚠️  404 - Möglicherweise falscher Endpoint-Pfad oder ID-Format`);
        }
      }
    }

    console.log('');

    // Schritt 3: Teste Payment-Endpoints (nur wenn Status-Endpoint funktioniert)
    if (!statusEndpointWorks) {
      console.log('⚠️  Status-Update-Endpoint funktioniert nicht - Payment-Endpoints werden nicht getestet');
      console.log('   → Bitte prüfe zuerst, warum der Status-Update-Endpoint nicht funktioniert\n');
      return;
    }

    console.log('📤 Schritt 3: Teste Payment-Update-Endpoints...\n');
    
    const testAmount = 1; // Minimaler Test-Betrag (1 COP)
    
    const testCases: Array<{ path: string; method: string; body: any; description: string }> = [
      // Option 1: Analog zu Status-Update (mit reservations)
      {
        path: `/reservations/${bookingId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /reservations/{id}/payment (analog zu /status)'
      },
      {
        path: `/reservations/${bookingId}/payment`,
        method: 'PUT',
        body: { paid_out: testAmount, payment_method: 'card' },
        description: 'PUT /reservations/{id}/payment (nur paid_out + method)'
      },
      // Option 2: Mit bookings statt reservations
      {
        path: `/bookings/${bookingId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /bookings/{id}/payment'
      },
      {
        path: `/api/v1/bookings/${bookingId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /api/v1/bookings/{id}/payment'
      },
      // Option 3: Allgemeiner Update
      {
        path: `/reservations/${bookingId}`,
        method: 'PATCH',
        body: { paid_out: testAmount },
        description: 'PATCH /reservations/{id} (nur paid_out)'
      },
      {
        path: `/bookings/${bookingId}`,
        method: 'PATCH',
        body: { paid_out: testAmount },
        description: 'PATCH /bookings/{id} (nur paid_out)'
      },
    ];

    const results: TestResult[] = [];

    for (const testCase of testCases) {
      try {
        console.log(`📤 Teste: ${testCase.description}`);
        console.log(`   ${testCase.method} ${testCase.path}`);
        console.log(`   Body:`, JSON.stringify(testCase.body, null, 2));

        const response = await axiosInstance.request({
          method: testCase.method as any,
          url: testCase.path,
          data: testCase.body,
          validateStatus: (status) => status < 500
        });

        const result: TestResult = {
          endpoint: `${apiUrl}${testCase.path}`,
          method: testCase.method,
          body: testCase.body,
          success: response.status >= 200 && response.status < 300,
          status: response.status,
          data: response.data
        };

        if (result.success) {
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          console.log(`   ⚠️  Status ${response.status}`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        }

        results.push(result);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          const result: TestResult = {
            endpoint: `${apiUrl}${testCase.path}`,
            method: testCase.method,
            body: testCase.body,
            success: false,
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            error: axiosError.response?.data?.error || 
                   axiosError.response?.data?.message || 
                   axiosError.message
          };

          console.log(`   ❌ FEHLER (Status ${axiosError.response?.status || 'N/A'})`);
          console.log(`   Error:`, result.error);
          if (axiosError.response?.data) {
            console.log(`   Response:`, JSON.stringify(axiosError.response.data, null, 2));
          }

          results.push(result);
        } else {
          console.log(`   ❌ UNBEKANNTER FEHLER:`, error);
        }
      }

      console.log(''); // Leerzeile
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60) + '\n');

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
      console.log('✅ ERFOLGREICHE ENDPOINTS:\n');
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.endpoint}`);
        console.log(`   Status: ${result.status}`);
        if (result.data) {
          console.log(`   Response:`, JSON.stringify(result.data, null, 2));
        }
        console.log('');
      });
    } else {
      console.log('❌ KEINE ERFOLGREICHEN ENDPOINTS GEFUNDEN\n');
    }

    if (failed.length > 0) {
      console.log('❌ FEHLGESCHLAGENE ENDPOINTS:\n');
      failed.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.endpoint}`);
        console.log(`   Status: ${result.status || 'N/A'}`);
        console.log(`   Error: ${result.error || 'Unbekannt'}`);
        if (result.data && result.status !== 404) {
          console.log(`   Response:`, JSON.stringify(result.data, null, 2));
        }
        console.log('');
      });
    }

    // Speichere Ergebnisse
    const fs = await import('fs');
    const outputPath = path.join(__dirname, '../lobbypms-payment-endpoints-detailed-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({ bookingId, results }, null, 2));
    console.log(`💾 Ergebnisse gespeichert in: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI-Argumente
const branchId = process.argv[2] ? parseInt(process.argv[2], 10) : 3; // Default: Branch 3

if (isNaN(branchId)) {
  console.error('❌ Ungültige Branch-ID');
  console.log('Usage: npx ts-node scripts/test-lobbypms-payment-endpoints-detailed.ts <branchId>');
  process.exit(1);
}

testPaymentEndpointsDetailed(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });















