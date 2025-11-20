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
    // Versuche Property-Info abzurufen
    const response = await axiosInstance.get<any>('/api/v1/properties', {
      validateStatus: (status) => status < 500
    });

    if (response.data && typeof response.data === 'object') {
      if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data[0]; // Erstes Property
      }
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data[0];
      }
      if (response.data.id || response.data.property_id) {
        return response.data;
      }
    }

    // Alternativ: Hole Bookings und extrahiere Property ID aus den Reservierungen
    const bookingsResponse = await axiosInstance.get<any>('/api/v1/bookings', {
      params: {
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        limit: 1
      },
      validateStatus: (status) => status < 500
    });

    if (bookingsResponse.data && bookingsResponse.data.data && Array.isArray(bookingsResponse.data.data) && bookingsResponse.data.data.length > 0) {
      const booking = bookingsResponse.data.data[0];
      if (booking.property_id || booking.property?.id) {
        return {
          id: booking.property_id || booking.property?.id,
          name: booking.property?.name || 'Unbekannt'
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Fehler beim Abrufen der Property-Info:', error);
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

      console.log(`\n🔄 Rufe Property-Info von LobbyPMS API ab...`);
      const propertyInfo = await fetchPropertyInfo(apiUrl, apiKey);

      if (!propertyInfo) {
        console.log('⚠️  Konnte Property-Info nicht abrufen');
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

      const apiPropertyId = String(propertyInfo.id || propertyInfo.property_id || 'N/A');
      const apiPropertyName = propertyInfo.name || propertyInfo.property_name || 'Unbekannt';

      console.log(`\n📊 API-Response:`);
      console.log(`   Property ID: ${apiPropertyId}`);
      console.log(`   Property Name: ${apiPropertyName}`);

      const match = dbPropertyId === apiPropertyId;

      console.log(`\n${match ? '✅' : '❌'} Vergleich:`);
      console.log(`   DB Property ID: ${dbPropertyId || 'nicht gesetzt'}`);
      console.log(`   API Property ID: ${apiPropertyId}`);
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

