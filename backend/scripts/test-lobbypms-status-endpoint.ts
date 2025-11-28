#!/usr/bin/env node
/**
 * Test-Script: Prüft ob der funktionierende Status-Update-Endpoint mit einer Test-ID funktioniert
 * 
 * WICHTIG: Testet nur die Endpoint-Struktur, ändert keine echten Daten
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testStatusEndpoint(branchId: number, reservationId: string) {
  console.log('\n🔍 LobbyPMS Status-Update Endpoint-Test (Referenz-Test)');
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

    // Test: Status-Update-Endpoint (der funktionieren sollte)
    console.log('🧪 Teste Status-Update-Endpoint (Referenz)...\n');
    console.log(`📤 PUT /reservations/${reservationId}/status`);
    console.log(`   Body: { status: 'checked_in' }`);

    try {
      const response = await axiosInstance.put(
        `/reservations/${reservationId}/status`,
        { status: 'checked_in' },
        { validateStatus: (status) => status < 500 }
      );

      console.log(`   ✅ Status: ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      
      if (response.status === 200 || response.status === 201) {
        console.log('\n✅ Status-Update-Endpoint funktioniert!');
        console.log('   → Dies bestätigt, dass die ID und der Endpoint-Pfad korrekt sind\n');
      } else {
        console.log(`\n⚠️  Status ${response.status} - Endpoint antwortet, aber nicht erfolgreich\n`);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.log(`   ❌ Status: ${axiosError.response?.status || 'N/A'}`);
        console.log(`   Error:`, axiosError.response?.data?.error || axiosError.message);
        if (axiosError.response?.data) {
          console.log(`   Response:`, JSON.stringify(axiosError.response.data, null, 2));
        }
        
        if (axiosError.response?.status === 404) {
          console.log('\n⚠️  404 - Reservierungs-ID möglicherweise nicht gefunden');
          console.log('   → Prüfe ob die ID korrekt ist oder ob der Endpoint-Pfad anders ist\n');
        }
      } else {
        console.log(`   ❌ UNBEKANNTER FEHLER:`, error);
      }
    }

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
  console.log('Usage: npx ts-node scripts/test-lobbypms-status-endpoint.ts <branchId> <reservationId>');
  process.exit(1);
}

testStatusEndpoint(branchId, reservationId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });















