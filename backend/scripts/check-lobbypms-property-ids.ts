#!/usr/bin/env node
/**
 * Prüft die LobbyPMS Property ID Zuordnung für Manila und Parque Poblado
 * Ruft die API auf und vergleicht mit den DB-Einträgen
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Verschlüsselungs-Funktionen
function decryptSecret(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText;
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

function decryptBranchApiSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const decrypted = { ...settings };
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = decryptSecret(decrypted[field]);
      } catch (error) {
        // Bei Fehler: Feld bleibt wie es ist
      }
    }
  }

  return decrypted;
}

async function fetchPropertyInfo(apiUrl: string, apiKey: string): Promise<any> {
  const axiosInstance: AxiosInstance = axios.create({
    baseURL: apiUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000
  });

  try {
    // Hole Bookings und extrahiere Property ID aus den Reservierungen
    // Das ist zuverlässiger als die Properties-API
    const bookingsResponse = await axiosInstance.get<any>('/api/v1/bookings', {
      params: {
        start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Letzte 60 Tage
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 Tage
        limit: 10
      },
      validateStatus: (status) => status < 500
    });

    console.log(`   API Response Status: ${bookingsResponse.status}`);

    if (bookingsResponse.data && typeof bookingsResponse.data === 'object') {
      let bookings: any[] = [];
      
      if (bookingsResponse.data.data && Array.isArray(bookingsResponse.data.data)) {
        bookings = bookingsResponse.data.data;
      } else if (Array.isArray(bookingsResponse.data)) {
        bookings = bookingsResponse.data;
      }

      if (bookings.length > 0) {
        // Extrahiere Property ID aus der ersten Reservierung
        const booking = bookings[0];
        const propertyId = booking.property_id || booking.property?.id || booking.property_id_number;
        const propertyName = booking.property?.name || booking.property_name || 'Unbekannt';
        
        if (propertyId) {
          console.log(`   ✅ Property ID gefunden in Reservierung: ${propertyId}`);
          return {
            id: String(propertyId),
            name: propertyName
          };
        }
        
        // Falls property_id nicht direkt vorhanden, schaue in alle Reservierungen
        for (const b of bookings) {
          const pid = b.property_id || b.property?.id || b.property_id_number;
          if (pid) {
            console.log(`   ✅ Property ID gefunden: ${pid}`);
            return {
              id: String(pid),
              name: b.property?.name || b.property_name || 'Unbekannt'
            };
          }
        }
      }
      
      console.log(`   ⚠️  Keine Property ID in Reservierungen gefunden`);
      console.log(`   Response-Struktur:`, JSON.stringify(bookingsResponse.data, null, 2).substring(0, 500));
    }

    return null;
  } catch (error: any) {
    console.error('   ❌ Fehler beim Abrufen der Property-Info:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2).substring(0, 500));
    }
    return null;
  }
}

async function checkPropertyIds() {
  try {
    console.log('🔍 Prüfe LobbyPMS Property ID Zuordnung...\n');

    const branches = await prisma.branch.findMany({
      where: {
        name: { in: ['Manila', 'Parque Poblado'] }
      },
      select: {
        id: true,
        name: true,
        lobbyPmsSettings: true
      }
    });

    if (branches.length !== 2) {
      console.log('❌ Nicht beide Branches gefunden');
      return;
    }

    const results: Array<{
      branchId: number;
      branchName: string;
      dbPropertyId: string | null;
      apiPropertyId: string | null;
      apiPropertyName: string | null;
      apiUrl: string | null;
      match: boolean;
    }> = [];

    for (const branch of branches) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`${'='.repeat(60)}\n`);

      const branchSettings = branch.lobbyPmsSettings as any;
      if (!branchSettings) {
        console.log('⚠️  Keine LobbyPMS Settings in DB');
        results.push({
          branchId: branch.id,
          branchName: branch.name,
          dbPropertyId: null,
          apiPropertyId: null,
          apiPropertyName: null,
          apiUrl: null,
          match: false
        });
        continue;
      }

      const decryptedSettings = decryptBranchApiSettings(branchSettings);
      const apiKey = decryptedSettings.apiKey;
      const dbPropertyId = decryptedSettings.propertyId || null;
      let apiUrl = decryptedSettings.apiUrl || 'https://api.lobbypms.com';

      if (apiUrl.includes('app.lobbypms.com')) {
        apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
      }
      if (apiUrl.endsWith('/api')) {
        apiUrl = apiUrl.replace(/\/api$/, '');
      }

      console.log(`📊 DB-Eintrag:`);
      console.log(`   Property ID: ${dbPropertyId || 'nicht gesetzt'}`);
      console.log(`   API URL: ${apiUrl}`);

      if (!apiKey) {
        console.log('⚠️  Kein API Key in DB');
        results.push({
          branchId: branch.id,
          branchName: branch.name,
          dbPropertyId: dbPropertyId,
          apiPropertyId: null,
          apiPropertyName: null,
          apiUrl: apiUrl,
          match: false
        });
        continue;
      }

      console.log(`\n🔄 Rufe Reservierungen von LobbyPMS API ab...`);
      
      // Rufe Reservierungen ab und teste mit Property ID 13543
      const axiosInstance: AxiosInstance = axios.create({
        baseURL: apiUrl,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      let apiPropertyId: string | null = null;
      let apiPropertyName: string | null = null;

      try {
        // Test 1: Rufe ohne Property ID ab
        const responseWithoutId = await axiosInstance.get<any>('/api/v1/bookings', {
          params: {
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            limit: 5
          },
          validateStatus: (status) => status < 500
        });

        if (responseWithoutId.data && responseWithoutId.data.data && Array.isArray(responseWithoutId.data.data) && responseWithoutId.data.data.length > 0) {
          const booking = responseWithoutId.data.data[0];
          // Versuche Property ID aus verschiedenen Feldern zu extrahieren
          apiPropertyId = booking.property_id || booking.property?.id || booking.property_id_number || null;
          apiPropertyName = booking.property?.name || booking.property_name || null;
        }

        // Test 2: Rufe MIT Property ID 13543 ab
        const responseWith13543 = await axiosInstance.get<any>('/api/v1/bookings', {
          params: {
            property_id: '13543',
            start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            limit: 5
          },
          validateStatus: (status) => status < 500
        });

        const hasReservationsWith13543 = responseWith13543.data && 
          responseWith13543.data.data && 
          Array.isArray(responseWith13543.data.data) && 
          responseWith13543.data.data.length > 0;

        console.log(`   Reservierungen ohne Property ID Filter: ${responseWithoutId.data?.data?.length || 0}`);
        console.log(`   Reservierungen MIT Property ID 13543: ${hasReservationsWith13543 ? responseWith13543.data.data.length : 0}`);

        // Wenn mit Property ID 13543 Reservierungen kommen, dann gehört dieser Token zu Property 13543
        if (hasReservationsWith13543) {
          apiPropertyId = '13543';
          console.log(`   ✅ Dieser API-Key gehört zu Property ID 13543`);
        } else if (apiPropertyId) {
          console.log(`   ✅ Property ID aus Reservierung extrahiert: ${apiPropertyId}`);
        } else {
          console.log(`   ⚠️  Konnte Property ID nicht bestimmen`);
        }

      } catch (error: any) {
        console.error(`   ❌ Fehler beim API-Aufruf: ${error.message}`);
      }

      const match = dbPropertyId === apiPropertyId;

      console.log(`\n${match ? '✅' : '❌'} Vergleich:`);
      console.log(`   DB Property ID: ${dbPropertyId || 'nicht gesetzt'}`);
      console.log(`   API Property ID: ${apiPropertyId || 'N/A'}`);
      console.log(`   ${match ? 'Stimmt überein' : 'STIMMT NICHT ÜBEREIN!'}`);

      results.push({
        branchId: branch.id,
        branchName: branch.name,
        dbPropertyId: dbPropertyId,
        apiPropertyId: apiPropertyId,
        apiPropertyName: apiPropertyName,
        apiUrl: apiUrl,
        match: match
      });
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 ZUSAMMENFASSUNG`);
    console.log(`${'='.repeat(60)}\n`);

    results.forEach(result => {
      console.log(`${result.branchName} (ID: ${result.branchId}):`);
      console.log(`  DB Property ID: ${result.dbPropertyId || 'nicht gesetzt'}`);
      console.log(`  API Property ID: ${result.apiPropertyId || 'N/A'}`);
      console.log(`  Property Name: ${result.apiPropertyName || 'N/A'}`);
      console.log(`  Status: ${result.match ? '✅ OK' : '❌ FEHLER'}\n`);
    });

    // Prüfe ob Parque Poblado die ID 13543 hat
    const parquePoblado = results.find(r => r.branchName === 'Parque Poblado');
    const manila = results.find(r => r.branchName === 'Manila');

    if (parquePoblado && parquePoblado.apiPropertyId === '13543') {
      console.log('✅ Parque Poblado hat korrekt die Property ID 13543 in der API');
    } else if (parquePoblado) {
      console.log(`⚠️  Parque Poblado hat Property ID ${parquePoblado.apiPropertyId} in der API (erwartet: 13543)`);
    }

    if (manila && manila.apiPropertyId === '13543') {
      console.log('⚠️  Manila hat die Property ID 13543 in der API - DAS IST FALSCH!');
      console.log('   → Die API-Tokens müssen getauscht werden!');
    }

    // Wenn Manila 13543 hat und Parque Poblado nicht, müssen wir tauschen
    if (manila && manila.apiPropertyId === '13543' && parquePoblado && parquePoblado.apiPropertyId !== '13543') {
      console.log('\n🔄 ERKENNTNIS: Tokens müssen getauscht werden!');
      console.log(`   Manila hat Property ID 13543, sollte aber ${parquePoblado.apiPropertyId} haben`);
      console.log(`   Parque Poblado hat Property ID ${parquePoblado.apiPropertyId}, sollte aber 13543 haben`);
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkPropertyIds()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

