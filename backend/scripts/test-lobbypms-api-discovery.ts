/**
 * LobbyPMS API Discovery Script
 * 
 * Testet die LobbyPMS API um herauszufinden:
 * 1. Welche Endpoints existieren
 * 2. Wie Reservierungen abgerufen werden können
 * 3. Welche Datenstrukturen zurückgegeben werden
 */

import { PrismaClient } from '@prisma/client';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { decryptApiSettings } from '../src/utils/encryption';
import dotenv from 'dotenv';
import path from 'path';

// Lade Environment-Variablen
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

interface TestResult {
  endpoint: string;
  method: string;
  success: boolean;
  status?: number;
  data?: any;
  error?: string;
}

/**
 * Testet verschiedene LobbyPMS API Endpoints
 */
async function testLobbyPmsEndpoints(organizationId: number = 1, customApiKey?: string) {
  console.log('\n🔍 LobbyPMS API Discovery');
  console.log('='.repeat(60));
  console.log(`Organisation ID: ${organizationId}`);
  if (customApiKey) {
    console.log(`🔑 Verwende bereitgestellten API-Token`);
  }
  console.log('='.repeat(60));

  try {
    let apiUrl: string;
    let apiKey: string;
    let propertyId: string | undefined;

    if (customApiKey) {
      // Verwende bereitgestellten Token
      console.log('\n📋 Schritt 1: Verwende bereitgestellten API-Token...');
      apiKey = customApiKey;
      
      // Lade nur URL und Property ID aus DB
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (organization?.settings) {
        const settings = decryptApiSettings(organization.settings as any);
        const lobbyPmsSettings = settings?.lobbyPms;
        apiUrl = lobbyPmsSettings?.apiUrl || 'https://api.lobbypms.com';
        propertyId = lobbyPmsSettings?.propertyId;
      } else {
        apiUrl = 'https://api.lobbypms.com';
      }
    } else {
      // Schritt 1: Lade Settings aus DB
      console.log('\n📋 Schritt 1: Lade Settings aus Datenbank...');
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (!organization?.settings) {
        console.error('❌ Keine Settings gefunden');
        process.exit(1);
      }

      const settings = decryptApiSettings(organization.settings as any);
      const lobbyPmsSettings = settings?.lobbyPms;

      if (!lobbyPmsSettings?.apiKey) {
        console.error('❌ LobbyPMS API Key nicht gefunden');
        process.exit(1);
      }

      if (!lobbyPmsSettings?.apiUrl) {
        console.error('❌ LobbyPMS API URL nicht gefunden');
        process.exit(1);
      }

      apiUrl = lobbyPmsSettings.apiUrl;
      apiKey = lobbyPmsSettings.apiKey;
      propertyId = lobbyPmsSettings.propertyId;
    }

    console.log('✅ Settings geladen:');
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}`);
    console.log(`   Property ID: ${propertyId || 'NICHT GESETZT'}`);

    // Schritt 2: Erstelle Axios-Instanz
    console.log('\n🔧 Schritt 2: Erstelle API-Client...');
    const axiosInstance: AxiosInstance = axios.create({
      baseURL: apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      }
    });

    // Request Interceptor für Logging
    axiosInstance.interceptors.request.use(
      (config) => {
        console.log(`\n📤 ${config.method?.toUpperCase()} ${config.url}`);
        if (config.params) {
          console.log(`   Params:`, config.params);
        }
        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor für Logging
    axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`✅ Status: ${response.status}`);
        return response;
      },
      (error: AxiosError) => {
        console.log(`❌ Status: ${error.response?.status || 'NO RESPONSE'}`);
        if (error.response?.data) {
          console.log(`   Error Data:`, JSON.stringify(error.response.data, null, 2));
        }
        return Promise.reject(error);
      }
    );

    // Schritt 3: Teste verschiedene Endpoints
    console.log('\n🧪 Schritt 3: Teste verschiedene Endpoints...\n');
    const results: TestResult[] = [];

    // Teste zuerst mit der URL vom User (api.lobbypms.com statt app.lobbypms.com)
    const alternativeBaseUrl = 'https://api.lobbypms.com';
    
    // Liste der zu testenden Endpoints
    const endpointsToTest = [
      // Verfügbare Zimmer (vom User gegeben) - mit alternativer URL
      { path: '/api/v2/available-rooms', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      { path: '/api/v2/available-rooms', method: 'GET', params: { property_id: propertyId }, baseUrl: alternativeBaseUrl },
      
      // Reservierungen (verschiedene Varianten) - mit alternativer URL
      { path: '/api/v2/reservations', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      { path: '/api/v2/reservations', method: 'GET', params: { property_id: propertyId }, baseUrl: alternativeBaseUrl },
      { path: '/api/v2/bookings', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      { path: '/api/v2/bookings', method: 'GET', params: { property_id: propertyId }, baseUrl: alternativeBaseUrl },
      
      // Mit Datum-Filter
      { path: '/api/v2/reservations', method: 'GET', params: { 
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }, baseUrl: alternativeBaseUrl},
      
      // V1 Endpoints (falls v2 nicht existiert)
      { path: '/api/v1/reservations', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      { path: '/api/v1/bookings', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      
      // Weitere mögliche Endpoints
      { path: '/api/v2/properties', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      { path: '/api/v2/properties', method: 'GET', params: { property_id: propertyId }, baseUrl: alternativeBaseUrl },
      { path: '/api/v2/rooms', method: 'GET', params: {}, baseUrl: alternativeBaseUrl },
      
      // Auch mit der konfigurierten URL testen (falls beide funktionieren)
      { path: '/api/v2/available-rooms', method: 'GET', params: {}, baseUrl: apiUrl },
      { path: '/api/v2/reservations', method: 'GET', params: { property_id: propertyId }, baseUrl: apiUrl },
    ];

    for (const endpoint of endpointsToTest) {
      try {
        const baseUrl = (endpoint as any).baseUrl || apiUrl;
        const fullUrl = endpoint.path.startsWith('http') 
          ? endpoint.path 
          : `${baseUrl}${endpoint.path}`;
        
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔍 Teste: ${endpoint.method} ${fullUrl}`);
        
        // Erstelle temporäre Axios-Instanz für alternative URL
        const testAxiosInstance = baseUrl !== apiUrl 
          ? axios.create({
              baseURL: baseUrl,
              timeout: 30000,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              }
            })
          : axiosInstance;
        
        const response = await testAxiosInstance.request({
          method: endpoint.method as any,
          url: endpoint.path,
          params: endpoint.params,
          validateStatus: () => true // Akzeptiere alle Status-Codes
        });

        // Prüfe ob Response HTML ist (nicht JSON)
        const isHtml = typeof response.data === 'string' && 
          (response.data.includes('<!DOCTYPE') || response.data.includes('<html'));
        
        const result: TestResult = {
          endpoint: fullUrl,
          method: endpoint.method,
          success: response.status >= 200 && response.status < 300 && !isHtml,
          status: response.status,
          data: response.data
        };

        if (isHtml) {
          console.log(`⚠️ HTML-Response erhalten (kein JSON)`);
          console.log(`   → Endpoint existiert möglicherweise nicht oder benötigt andere Authentifizierung`);
          result.error = 'HTML-Response statt JSON';
          result.success = false;
        } else if (result.success) {
          console.log(`✅ ERFOLG! Status: ${response.status}`);
          
          // Analysiere Response-Struktur
          if (Array.isArray(response.data)) {
            console.log(`   📊 Array mit ${response.data.length} Einträgen`);
            if (response.data.length > 0) {
              console.log(`   📋 Erster Eintrag (Keys):`, Object.keys(response.data[0]));
              console.log(`   📋 Erster Eintrag (Sample):`, JSON.stringify(response.data[0], null, 2).substring(0, 500));
            }
          } else if (typeof response.data === 'object' && response.data !== null) {
            console.log(`   📊 Objekt mit Keys:`, Object.keys(response.data));
            if (response.data.data && Array.isArray(response.data.data)) {
              console.log(`   📊 data-Array mit ${response.data.data.length} Einträgen`);
              if (response.data.data.length > 0) {
                console.log(`   📋 Erster Eintrag (Keys):`, Object.keys(response.data.data[0]));
              }
            }
            console.log(`   📋 Sample:`, JSON.stringify(response.data, null, 2).substring(0, 500));
          } else {
            console.log(`   📊 Response-Type:`, typeof response.data);
            console.log(`   📋 Sample:`, String(response.data).substring(0, 500));
          }
        } else {
          console.log(`❌ FEHLER! Status: ${response.status}`);
          if (response.data && !isHtml) {
            console.log(`   Error:`, JSON.stringify(response.data, null, 2).substring(0, 300));
          }
          result.error = `Status ${response.status}`;
        }

        results.push(result);

        // Kurze Pause zwischen Requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        const axiosError = error as AxiosError;
        console.log(`❌ EXCEPTION!`);
        console.log(`   Error:`, axiosError.message);
        
        results.push({
          endpoint: endpoint.path,
          method: endpoint.method,
          success: false,
          error: axiosError.message
        });
      }
    }

    // Schritt 4: Zusammenfassung
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(60));

    const successfulEndpoints = results.filter(r => r.success);
    const failedEndpoints = results.filter(r => !r.success);

    console.log(`\n✅ Erfolgreiche Endpoints (${successfulEndpoints.length}):`);
    successfulEndpoints.forEach(r => {
      console.log(`   ${r.method} ${r.endpoint} - Status: ${r.status}`);
    });

    console.log(`\n❌ Fehlgeschlagene Endpoints (${failedEndpoints.length}):`);
    failedEndpoints.forEach(r => {
      console.log(`   ${r.method} ${r.endpoint} - ${r.error || 'Unbekannter Fehler'}`);
    });

    // Schritt 5: Empfehlungen
    console.log('\n\n' + '='.repeat(60));
    console.log('💡 EMPFEHLUNGEN');
    console.log('='.repeat(60));

    const reservationEndpoints = successfulEndpoints.filter(r => 
      r.endpoint.includes('reservation') || 
      r.endpoint.includes('booking')
    );

    if (reservationEndpoints.length > 0) {
      console.log('\n✅ Reservierungs-Endpoints gefunden:');
      reservationEndpoints.forEach(r => {
        console.log(`   ${r.method} ${r.endpoint}`);
        if (r.data) {
          if (Array.isArray(r.data)) {
            console.log(`      → Gibt Array mit ${r.data.length} Einträgen zurück`);
          } else if (r.data.data && Array.isArray(r.data.data)) {
            console.log(`      → Gibt Objekt mit data-Array (${r.data.data.length} Einträge) zurück`);
          }
        }
      });
    } else {
      console.log('\n⚠️ Keine Reservierungs-Endpoints gefunden');
      console.log('   Mögliche Gründe:');
      console.log('   - API-Endpoint existiert nicht');
      console.log('   - Authentifizierung fehlgeschlagen');
      console.log('   - Property ID fehlt oder ist falsch');
      console.log('   - API-Token hat keine Berechtigung');
    }

    // Speichere Ergebnisse in Datei
    const fs = require('fs');
    const outputPath = path.join(__dirname, '../lobbypms-api-discovery-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Ergebnisse gespeichert in: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Test aus
const organizationId = process.argv[2] ? parseInt(process.argv[2]) : 1;
const customApiKey = process.argv[3]; // Optional: API-Token als 3. Parameter
testLobbyPmsEndpoints(organizationId, customApiKey)
  .then(() => {
    console.log('\n✅ Test abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });

