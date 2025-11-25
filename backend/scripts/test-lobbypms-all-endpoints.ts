#!/usr/bin/env node
/**
 * Test-Script: Testet ALLE möglichen Endpoint-Varianten systematisch
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testAllEndpoints(branchId: number) {
  console.log('\n🔍 LobbyPMS Alle Endpoint-Varianten Test');
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

    // Hole Reservierung aus DB
    const dbReservation = await prisma.reservation.findFirst({
      where: { 
        branchId: branchId,
        lobbyReservationId: { not: null }
      },
      select: {
        lobbyReservationId: true,
        guestName: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!dbReservation || !dbReservation.lobbyReservationId) {
      console.log('⚠️  Keine Reservierung gefunden\n');
      return;
    }

    const reservationId = dbReservation.lobbyReservationId;
    console.log(`📋 Test-Reservierung: ${reservationId} (${dbReservation.guestName})\n`);

    // Systematisch ALLE möglichen Varianten testen
    const basePaths = [
      '', // Root
      '/api',
      '/api/v1',
      '/api/v2',
      '/v1',
      '/v2'
    ];

    const resourceNames = [
      'reservations',
      'bookings',
      'reservation',
      'booking'
    ];

    const actions = [
      { suffix: '/status', method: 'PUT', body: { status: 'confirmed' }, desc: 'Status Update' },
      { suffix: '/payment', method: 'PUT', body: { paid_out: 1 }, desc: 'Payment Update' },
      { suffix: '/payments', method: 'PUT', body: { paid_out: 1 }, desc: 'Payments Update' },
      { suffix: '', method: 'PUT', body: { paid_out: 1 }, desc: 'Full Update (PUT)' },
      { suffix: '', method: 'PATCH', body: { paid_out: 1 }, desc: 'Partial Update (PATCH)' },
      { suffix: '/update', method: 'POST', body: { paid_out: 1 }, desc: 'Update via POST' },
    ];

    const successful: any[] = [];
    const failed: any[] = [];

    console.log('🧪 Teste alle Endpoint-Varianten...\n');

    for (const basePath of basePaths) {
      for (const resourceName of resourceNames) {
        for (const action of actions) {
          const fullPath = `${basePath}/${resourceName}/${reservationId}${action.suffix}`.replace(/\/+/g, '/');
          
          try {
            const response = await axiosInstance.request({
              method: action.method as any,
              url: fullPath,
              data: action.body,
              validateStatus: (status) => status < 500
            });

            if (response.status >= 200 && response.status < 300) {
              successful.push({
                path: fullPath,
                method: action.method,
                status: response.status,
                response: response.data
              });
              console.log(`✅ ${action.method} ${fullPath} - Status ${response.status}`);
            } else if (response.status !== 404) {
              // Nicht 404, aber auch nicht erfolgreich - könnte interessant sein
              console.log(`⚠️  ${action.method} ${fullPath} - Status ${response.status}`);
              failed.push({
                path: fullPath,
                method: action.method,
                status: response.status,
                error: response.data
              });
            }
          } catch (error) {
            if (axios.isAxiosError(error)) {
              const axiosError = error as AxiosError<any>;
              if (axiosError.response?.status !== 404) {
                // Nur nicht-404 Fehler loggen (404 ist zu häufig)
                failed.push({
                  path: fullPath,
                  method: action.method,
                  status: axiosError.response?.status,
                  error: axiosError.response?.data
                });
              }
            }
          }
        }
      }
    }

    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60) + '\n');

    if (successful.length > 0) {
      console.log(`✅ ${successful.length} ERFOLGREICHE ENDPOINTS:\n`);
      successful.forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
        console.log('');
      });
    } else {
      console.log('❌ KEINE ERFOLGREICHEN ENDPOINTS GEFUNDEN\n');
    }

    if (failed.length > 0) {
      console.log(`⚠️  ${failed.length} ENDPOINTS MIT NICHT-404 FEHLERN:\n`);
      failed.slice(0, 10).forEach((result, index) => {
        console.log(`${index + 1}. ${result.method} ${result.path}`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Error:`, JSON.stringify(result.error, null, 2));
        console.log('');
      });
      if (failed.length > 10) {
        console.log(`   ... und ${failed.length - 10} weitere\n`);
      }
    }

    // Speichere Ergebnisse
    const fs = await import('fs');
    const outputPath = path.join(__dirname, '../lobbypms-all-endpoints-results.json');
    fs.writeFileSync(outputPath, JSON.stringify({ successful, failed }, null, 2));
    console.log(`💾 Ergebnisse gespeichert in: ${outputPath}\n`);

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

testAllEndpoints(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });


