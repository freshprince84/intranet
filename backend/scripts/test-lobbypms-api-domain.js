/**
 * Test LobbyPMS API mit api.lobbypms.com
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { decryptApiSettings } = require('../dist/utils/encryption');

const prisma = new PrismaClient();

async function testApiDomain(organizationId = 1) {
  console.log('\n🔍 LobbyPMS API Domain Test (api.lobbypms.com)');
  console.log('='.repeat(60));

  try {
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
    const apiKey = lobbyPms.apiKey;
    const propertyId = lobbyPms.propertyId;

    console.log(`\n📋 Konfiguration:`);
    console.log(`   Property ID: ${propertyId}`);
    console.log(`   API Key: ${apiKey ? 'GESETZT (' + apiKey.substring(0, 10) + '...)' : 'NICHT GESETZT'}`);

    const baseURL = 'https://api.lobbypms.com';
    const endpoints = [
      '/reservations',
      '/bookings',
      '/properties',
      '/health',
      '/status',
    ];

    console.log(`\n🧪 Teste Base URL: ${baseURL}\n`);

    for (const endpoint of endpoints) {
      const fullUrl = baseURL + endpoint;
      console.log(`\n📍 ${endpoint}`);
      console.log('-'.repeat(60));

      // Test verschiedene Auth-Methoden
      const authMethods = [
        { name: 'Bearer Token', headers: { 'Authorization': `Bearer ${apiKey}` } },
        { name: 'X-API-Key', headers: { 'X-API-Key': apiKey } },
        { name: 'X-API-Token', headers: { 'X-API-Token': apiKey } },
        { name: 'api-key Header', headers: { 'api-key': apiKey } },
        { name: 'Query Parameter', params: { api_key: apiKey } },
      ];

      for (const authMethod of authMethods) {
        try {
          const params = { ...authMethod.params };
          if (propertyId && (endpoint.includes('reservation') || endpoint.includes('booking'))) {
            params.property_id = propertyId;
          }

          const response = await axios.get(fullUrl, {
            headers: {
              'Content-Type': 'application/json',
              ...authMethod.headers
            },
            params,
            timeout: 10000,
            validateStatus: () => true
          });

          const isHTML = typeof response.data === 'string' && response.data.includes('<!DOCTYPE');
          const isJSON = typeof response.data === 'object' || (typeof response.data === 'string' && response.data.startsWith('{') || response.data.startsWith('['));

          if (response.status === 200 && !isHTML) {
            console.log(`   ✅ ${authMethod.name}: Status ${response.status} - ${isJSON ? 'JSON' : 'Text'}`);
            if (isJSON) {
              const preview = JSON.stringify(response.data).substring(0, 300);
              console.log(`      Response: ${preview}...`);
            } else {
              const preview = String(response.data).substring(0, 200);
              console.log(`      Response: ${preview}...`);
            }
            break; // Erfolgreich!
          } else if (response.status === 401 || response.status === 403) {
            console.log(`   ⚠️  ${authMethod.name}: Status ${response.status} (Auth-Fehler, aber Endpoint existiert!)`);
            if (response.data && typeof response.data === 'object') {
              console.log(`      Error: ${JSON.stringify(response.data)}`);
            }
          } else if (response.status === 404 && !isHTML) {
            const errorMsg = typeof response.data === 'object' ? JSON.stringify(response.data) : response.data;
            console.log(`   ❌ ${authMethod.name}: Status ${response.status}`);
            console.log(`      ${errorMsg.substring(0, 100)}`);
          } else if (isHTML) {
            console.log(`   ❌ ${authMethod.name}: Status ${response.status} (HTML-404)`);
          } else {
            console.log(`   ⚠️  ${authMethod.name}: Status ${response.status}`);
            if (response.data && typeof response.data === 'object') {
              const preview = JSON.stringify(response.data).substring(0, 150);
              console.log(`      ${preview}...`);
            }
          }
        } catch (error) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            console.log(`   ❌ ${authMethod.name}: Verbindungsfehler (${error.code})`);
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
testApiDomain(organizationId);

