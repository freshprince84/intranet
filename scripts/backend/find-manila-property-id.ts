#!/usr/bin/env node
/**
 * Findet die richtige Property ID für Manila
 * Ruft die API mit beiden Tokens auf und vergleicht die Reservierungen
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

async function fetchAllProperties(apiUrl: string, apiKey: string): Promise<any[]> {
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
    // Versuche Properties-Liste abzurufen
    const response = await axiosInstance.get<any>('/api/v1/properties', {
      validateStatus: (status) => status < 500
    });

    if (response.data && typeof response.data === 'object') {
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
    }

    return [];
  } catch (error: any) {
    console.log(`   ⚠️  Properties-API nicht verfügbar: ${error.message}`);
    return [];
  }
}

async function analyzeReservationsForPropertyId(apiUrl: string, apiKey: string): Promise<Set<string>> {
  const axiosInstance: AxiosInstance = axios.create({
    baseURL: apiUrl,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000
  });

  const propertyIds = new Set<string>();

  try {
    // Hole Reservierungen der letzten 90 Tage
    const response = await axiosInstance.get<any>('/api/v1/bookings', {
      params: {
        start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        limit: 200
      },
      validateStatus: (status) => status < 500
    });

    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      response.data.data.forEach((booking: any) => {
        const propertyId = booking.property_id || booking.property?.id || booking.property_id_number;
        if (propertyId) {
          propertyIds.add(String(propertyId));
        }
      });
    }

    return propertyIds;
  } catch (error: any) {
    console.error(`   ❌ Fehler: ${error.message}`);
    return propertyIds;
  }
}

async function findManilaPropertyId() {
  try {
    console.log('🔍 Finde die richtige Property ID für Manila...\n');

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

    const manila = branches.find(b => b.name === 'Manila');
    const parquePoblado = branches.find(b => b.name === 'Parque Poblado');

    if (!manila || !parquePoblado) {
      console.log('❌ Manila oder Parque Poblado nicht gefunden');
      return;
    }

    console.log(`📋 Analysiere beide Branches...\n`);

    const results: Array<{
      branchName: string;
      apiKey: string;
      apiUrl: string;
      propertyIds: Set<string>;
      properties: any[];
    }> = [];

    for (const branch of [manila, parquePoblado]) {
      console.log(`${'='.repeat(60)}`);
      console.log(`📋 Branch: ${branch.name} (ID: ${branch.id})`);
      console.log(`${'='.repeat(60)}\n`);

      const branchSettings = branch.lobbyPmsSettings as any;
      if (!branchSettings) {
        console.log('⚠️  Keine LobbyPMS Settings');
        continue;
      }

      const decryptedSettings = decryptBranchApiSettings(branchSettings);
      const apiKey = decryptedSettings.apiKey;
      let apiUrl = decryptedSettings.apiUrl || 'https://api.lobbypms.com';

      if (apiUrl.includes('app.lobbypms.com')) {
        apiUrl = apiUrl.replace('app.lobbypms.com', 'api.lobbypms.com');
      }
      if (apiUrl.endsWith('/api')) {
        apiUrl = apiUrl.replace(/\/api$/, '');
      }

      if (!apiKey) {
        console.log('⚠️  Kein API Key');
        continue;
      }

      console.log(`🔄 Rufe Properties-Liste ab...`);
      const properties = await fetchAllProperties(apiUrl, apiKey);
      console.log(`   ${properties.length} Properties gefunden`);

      console.log(`🔄 Analysiere Reservierungen (letzte 90 Tage)...`);
      const propertyIds = await analyzeReservationsForPropertyId(apiUrl, apiKey);
      console.log(`   Property IDs in Reservierungen: ${Array.from(propertyIds).join(', ') || 'keine gefunden'}`);

      results.push({
        branchName: branch.name,
        apiKey: apiKey.substring(0, 20) + '...',
        apiUrl: apiUrl,
        propertyIds: propertyIds,
        properties: properties
      });
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 ZUSAMMENFASSUNG`);
    console.log(`${'='.repeat(60)}\n`);

    const parquePobladoResult = results.find(r => r.branchName === 'Parque Poblado');
    const manilaResult = results.find(r => r.branchName === 'Manila');

    if (parquePobladoResult) {
      console.log(`Parque Poblado:`);
      console.log(`  Property IDs: ${Array.from(parquePobladoResult.propertyIds).join(', ') || 'keine'}`);
      if (parquePobladoResult.propertyIds.has('13543')) {
        console.log(`  ✅ Enthält Property ID 13543 (korrekt)`);
      }
    }

    if (manilaResult) {
      console.log(`\nManila:`);
      console.log(`  Property IDs: ${Array.from(manilaResult.propertyIds).join(', ') || 'keine'}`);
      
      // Finde die Property ID, die Manila hat, aber Parque Poblado nicht
      const manilaOnlyIds = Array.from(manilaResult.propertyIds).filter(id => 
        !parquePobladoResult?.propertyIds.has(id)
      );

      if (manilaOnlyIds.length > 0) {
        console.log(`  ✅ Manila-spezifische Property IDs: ${manilaOnlyIds.join(', ')}`);
        console.log(`  → Manila sollte Property ID ${manilaOnlyIds[0]} haben!`);
      } else if (manilaResult.propertyIds.size > 0) {
        const allIds = Array.from(manilaResult.propertyIds);
        console.log(`  ⚠️  Manila hat Property IDs: ${allIds.join(', ')}`);
        if (allIds.length === 1 && allIds[0] !== '13543') {
          console.log(`  → Manila sollte Property ID ${allIds[0]} haben!`);
        }
      } else {
        console.log(`  ⚠️  Keine Property IDs in Reservierungen gefunden`);
      }
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findManilaPropertyId()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

