#!/usr/bin/env node
/**
 * Test-Script: Prüft die Struktur von /api/v2/bookings/{id} um zu sehen, welche Felder updatet werden können
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function testBookingStructure(branchId: number) {
  console.log('\n🔍 LobbyPMS /api/v2/bookings/{id} Struktur-Analyse');
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

    const apiKey = lobbyPmsSettings.apiKey;

    // Erstelle Axios-Instanz
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: 'https://api.lobbypms.com',
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

    // Schritt 1: Hole Booking-Daten mit GET
    console.log('📥 Schritt 1: Hole Booking-Daten mit GET /api/v2/bookings/{id}...\n');
    
    try {
      const getResponse = await axiosInstance.get(`/api/v2/bookings/${reservationId}`, {
        validateStatus: (status) => status < 500
      });

      if (getResponse.status === 200) {
        console.log(`✅ GET erfolgreich (Status 200)`);
        console.log(`\n📊 Booking-Struktur:`);
        console.log(JSON.stringify(getResponse.data, null, 2));
        
        // Analysiere die Struktur
        const booking = getResponse.data?.data || getResponse.data;
        if (booking) {
          console.log(`\n🔍 Relevante Felder für Payment:`);
          console.log(`   paid_out: ${booking.paid_out || 'N/A'}`);
          console.log(`   total_to_pay: ${booking.total_to_pay || booking.total_to_pay_accommodation || 'N/A'}`);
          console.log(`   payment_status: ${booking.payment_status || 'N/A'}`);
          console.log(`   payment_method: ${booking.payment_method || 'N/A'}`);
        }
      } else {
        console.log(`⚠️  Status ${getResponse.status}`);
        console.log(`Response:`, JSON.stringify(getResponse.data, null, 2));
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        console.log(`❌ Status ${axiosError.response?.status || 'N/A'}`);
        console.log(`Error:`, axiosError.response?.data?.error || axiosError.message);
        if (axiosError.response?.data) {
          console.log(`Response:`, JSON.stringify(axiosError.response.data, null, 2));
        }
      }
    }

    console.log('\n');

    // Schritt 2: Teste Update mit exakt den Feldern, die in GET zurückkommen
    console.log('📤 Schritt 2: Teste Update mit Feldern aus GET-Response...\n');
    
    // Versuche verschiedene Update-Methoden mit den tatsächlichen Feldern
    const updateTests = [
      { method: 'PUT', body: { paid_out: 1 }, desc: 'PUT mit nur paid_out' },
      { method: 'PATCH', body: { paid_out: 1 }, desc: 'PATCH mit nur paid_out' },
      { method: 'PUT', body: { paid_out: 1, payment_status: 'paid' }, desc: 'PUT mit paid_out + payment_status' },
      { method: 'POST', body: { paid_out: 1 }, desc: 'POST mit paid_out' },
    ];

    for (const test of updateTests) {
      try {
        console.log(`📤 Teste: ${test.desc}`);
        console.log(`   ${test.method} /api/v2/bookings/${reservationId}`);
        console.log(`   Body:`, JSON.stringify(test.body, null, 2));
        
        const response = await axiosInstance.request({
          method: test.method as any,
          url: `/api/v2/bookings/${reservationId}`,
          data: test.body,
          validateStatus: (status) => status < 500
        });

        if (response.status >= 200 && response.status < 300) {
          console.log(`   ✅ ERFOLG (Status ${response.status})`);
          console.log(`   Response:`, JSON.stringify(response.data, null, 2));
        } else {
          console.log(`   ⚠️  Status ${response.status}`);
          if (response.status !== 404 && response.status !== 405) {
            console.log(`   Response:`, JSON.stringify(response.data, null, 2));
          }
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError<any>;
          if (axiosError.response?.status === 404) {
            console.log(`   ❌ 404 - Resource Not Found`);
          } else if (axiosError.response?.status === 405) {
            console.log(`   ❌ 405 - Method Not Allowed`);
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

testBookingStructure(branchId)
  .then(() => {
    console.log('✅ Test erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });













