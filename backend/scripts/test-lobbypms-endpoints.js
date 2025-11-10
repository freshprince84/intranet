/**
 * Test verschiedene LobbyPMS API Endpoints
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { decryptApiSettings } = require('../dist/utils/encryption');

const prisma = new PrismaClient();

async function testEndpoints(organizationId = 1) {
  console.log('\n🔍 LobbyPMS API Endpoint-Test');
  console.log('='.repeat(60));

  try {
    // Settings laden
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization?.settings?.lobbyPms) {
      console.error('❌ LobbyPMS Settings nicht gefunden');
      process.exit(1);
    }

    const settings = decryptApiSettings(organization.settings);
    const lobbyPms = settings.lobbyPms;

    const baseURL = lobbyPms.apiUrl || 'https://app.lobbypms.com/api';
    const apiKey = lobbyPms.apiKey;
    const propertyId = lobbyPms.propertyId;

    console.log(`\n📋 Konfiguration:`);
    console.log(`   Base URL: ${baseURL}`);
    console.log(`   Property ID: ${propertyId}`);
    console.log(`   API Key: ${apiKey ? 'GESETZT (' + apiKey.substring(0, 10) + '...)' : 'NICHT GESETZT'}`);

    // Test verschiedene Endpoints
    const endpoints = [
      '/reservations',
      '/api/reservations',
      '/v1/reservations',
      '/bookings',
      '/api/bookings',
      '/v1/bookings',
      '/properties',
      '/api/properties',
      '/v1/properties',
      '/health',
      '/api/health',
      '/status',
      '/api/status',
    ];

    // Test verschiedene Authentifizierungsmethoden
    const authMethods = [
      { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${apiKey}` } },
      { name: 'X-API-Key', headers: { 'X-API-Key': apiKey } },
      { name: 'X-API-Token', headers: { 'X-API-Token': apiKey } },
      { name: 'api-key Header', headers: { 'api-key': apiKey } },
      { name: 'Query Parameter', params: { api_key: apiKey } },
    ];

    console.log('\n🧪 Teste Endpoints mit verschiedenen Authentifizierungsmethoden...\n');

    for (const endpoint of endpoints) {
      console.log(`\n📍 Endpoint: ${endpoint}`);
      console.log('-'.repeat(60));

      for (const authMethod of authMethods) {
        try {
          const config = {
            baseURL,
            url: endpoint,
            method: 'GET',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              ...authMethod.headers
            },
            params: authMethod.params || {},
            validateStatus: () => true // Akzeptiere alle Status Codes
          };

          if (propertyId && endpoint.includes('reservation') || endpoint.includes('booking')) {
            config.params.property_id = propertyId;
          }

          const response = await axios(config);

          // Prüfe ob Response HTML ist
          const isHTML = typeof response.data === 'string' && response.data.includes('<!DOCTYPE');
          const isJSON = typeof response.data === 'object' || (typeof response.data === 'string' && response.data.startsWith('{'));

          if (response.status === 200 && !isHTML) {
            console.log(`   ✅ ${authMethod.name}: Status ${response.status} - ${isJSON ? 'JSON' : 'Text'}`);
            if (isJSON && response.data) {
              const preview = JSON.stringify(response.data).substring(0, 100);
              console.log(`      Preview: ${preview}...`);
            }
            break; // Erfolgreich, teste nächsten Endpoint
          } else if (response.status === 401 || response.status === 403) {
            console.log(`   ⚠️  ${authMethod.name}: Status ${response.status} (Auth-Fehler)`);
          } else if (response.status === 404) {
            console.log(`   ❌ ${authMethod.name}: Status ${response.status} (Nicht gefunden)`);
          } else if (isHTML) {
            console.log(`   ❌ ${authMethod.name}: Status ${response.status} (HTML-404)`);
          } else {
            console.log(`   ⚠️  ${authMethod.name}: Status ${response.status}`);
          }
        } catch (error) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.log(`   ❌ ${authMethod.name}: Verbindungsfehler`);
          } else {
            console.log(`   ❌ ${authMethod.name}: ${error.message}`);
          }
        }
      }
    }

    console.log('\n✅ Test abgeschlossen!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Unerwarteter Fehler:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const organizationId = parseInt(process.argv[2] || '1');
testEndpoints(organizationId);


