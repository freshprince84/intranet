#!/usr/bin/env node
/**
 * Test-Script: Prüft ob LobbyPMS API Payment-Status-Updates unterstützt
 * 
 * Testet verschiedene Endpoint-Varianten basierend auf dem funktionierenden Status-Update-Pattern
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

async function testPaymentEndpoints(branchId: number, reservationId: string) {
  console.log('\n🔍 LobbyPMS Payment-Update Endpoint-Test');
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

    // Base URL bestimmen (wie in lobbyPmsService.ts)
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
    console.log(`   Reservation ID: ${reservationId}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...\n`);

    // Erstelle Axios-Instanz (wie in lobbyPmsService.ts)
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // ⚠️ WICHTIG: Wir testen mit einem sehr kleinen Betrag (1 COP) um keine echten Daten zu ändern
    // Falls ein Endpoint funktioniert, kann dieser kleine Betrag leicht rückgängig gemacht werden
    const testAmount = 1; // Minimaler Test-Betrag (1 COP)
    
    // Test-Varianten basierend auf dem funktionierenden Status-Update-Pattern
    // Pattern: PUT /reservations/${id}/status mit Body { status: 'checked_in' }
    const testCases: Array<{ path: string; method: string; body: any; description: string }> = [
      // Option 1: Analog zu Status-Update
      {
        path: `/reservations/${reservationId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /reservations/{id}/payment (analog zu /status) - ⚠️ TEST mit 1 COP'
      },
      {
        path: `/reservations/${reservationId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount, payment_method: 'card' },
        description: 'PUT /reservations/{id}/payment (mit payment_method) - ⚠️ TEST mit 1 COP'
      },
      // Option 2: Allgemeiner Update-Endpoint
      {
        path: `/reservations/${reservationId}`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /reservations/{id} (allgemeiner Update) - ⚠️ TEST mit 1 COP'
      },
      {
        path: `/reservations/${reservationId}`,
        method: 'PATCH',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PATCH /reservations/{id} (partieller Update) - ⚠️ TEST mit 1 COP'
      },
      // Option 3: Mit /api/v1 Prefix (wie bei GET /api/v1/bookings)
      {
        path: `/api/v1/reservations/${reservationId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /api/v1/reservations/{id}/payment - ⚠️ TEST mit 1 COP'
      },
      {
        path: `/api/v1/reservations/${reservationId}`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /api/v1/reservations/{id} - ⚠️ TEST mit 1 COP'
      },
      // Option 4: Mit bookings statt reservations
      {
        path: `/bookings/${reservationId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /bookings/{id}/payment - ⚠️ TEST mit 1 COP'
      },
      {
        path: `/api/v1/bookings/${reservationId}/payment`,
        method: 'PUT',
        body: { payment_status: 'paid', paid_out: testAmount },
        description: 'PUT /api/v1/bookings/{id}/payment - ⚠️ TEST mit 1 COP'
      },
    ];

    const results: TestResult[] = [];

    console.log('🧪 Teste Payment-Update-Endpoints...\n');

    for (const testCase of testCases) {
      try {
        console.log(`📤 Teste: ${testCase.description}`);
        console.log(`   ${testCase.method} ${testCase.path}`);
        console.log(`   Body:`, JSON.stringify(testCase.body, null, 2));

        const response = await axiosInstance.request({
          method: testCase.method as any,
          url: testCase.path,
          data: testCase.body,
          validateStatus: (status) => status < 500 // Akzeptiere 4xx als gültige Antwort
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
          console.log(`   ⚠️  Status ${response.status} (kein Fehler, aber nicht erfolgreich)`);
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
          results.push({
            endpoint: `${apiUrl}${testCase.path}`,
            method: testCase.method,
            body: testCase.body,
            success: false,
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
          });
        }
      }

      console.log(''); // Leerzeile zwischen Tests
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
    }

    if (failed.length > 0) {
      console.log('❌ FEHLGESCHLAGENE ENDPOINTS:\n');
      failed.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.endpoint}`);
        console.log(`   Status: ${result.status || 'N/A'}`);
        console.log(`   Error: ${result.error || 'Unbekannt'}`);
        if (result.data) {
          console.log(`   Response:`, JSON.stringify(result.data, null, 2));
        }
        console.log('');
      });
    }

    // Speichere Ergebnisse in JSON-Datei
    const fs = await import('fs');
    const outputPath = path.join(__dirname, '../lobbypms-payment-update-test-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Ergebnisse gespeichert in: ${outputPath}\n`);

  } catch (error) {
    console.error('❌ Fehler beim Testen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI-Argumente
const branchId = process.argv[2] ? parseInt(process.argv[2], 10) : 3; // Default: Manila (Branch 3)
const reservationId = process.argv[3] || '18113730'; // Default: Beispiel-ID aus discovery-results

if (isNaN(branchId)) {
  console.error('❌ Ungültige Branch-ID');
  console.log('Usage: npm run test:lobbypms-payment <branchId> <reservationId>');
  process.exit(1);
}

testPaymentEndpoints(branchId, reservationId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });

