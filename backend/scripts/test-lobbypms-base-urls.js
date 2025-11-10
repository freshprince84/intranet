/**
 * Test verschiedene Base URLs für LobbyPMS API
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { decryptApiSettings } = require('../dist/utils/encryption');

const prisma = new PrismaClient();

async function testBaseUrls(organizationId = 1) {
  console.log('\n🔍 LobbyPMS Base URL Test');
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

    // Test verschiedene Base URLs
    const baseUrls = [
      'https://app.lobbypms.com/api',
      'https://app.lobbypms.com',
      'https://api.lobbypms.com',
      'https://app.lobbypms.com/api/v1',
      'https://app.lobbypms.com/api/v2',
    ];

    // Test verschiedene Endpoints
    const endpoints = [
      '/reservations',
      '/bookings',
      '/properties',
      '/health',
      '/status',
      '/api/reservations',
      '/api/bookings',
      '/v1/reservations',
      '/v1/bookings',
    ];

    console.log('\n🧪 Teste verschiedene Base URLs...\n');

    for (const baseURL of baseUrls) {
      console.log(`\n🌐 Base URL: ${baseURL}`);
      console.log('='.repeat(60));

      for (const endpoint of endpoints) {
        const fullUrl = baseURL + endpoint;
        
        try {
          const response = await axios.get(fullUrl, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            params: propertyId ? { property_id: propertyId } : {},
            timeout: 5000,
            validateStatus: () => true
          });

          const isHTML = typeof response.data === 'string' && response.data.includes('<!DOCTYPE');
          const isJSON = typeof response.data === 'object' || (typeof response.data === 'string' && response.data.startsWith('{'));

          if (response.status === 200 && !isHTML && isJSON) {
            console.log(`   ✅ ${endpoint}: Status ${response.status} - JSON Response`);
            const preview = JSON.stringify(response.data).substring(0, 150);
            console.log(`      Preview: ${preview}...`);
            break; // Erfolgreich gefunden!
          } else if (response.status === 401 || response.status === 403) {
            console.log(`   ⚠️  ${endpoint}: Status ${response.status} (Auth-Fehler - aber Endpoint existiert!)`);
            break; // Endpoint existiert, nur Auth fehlt
          } else if (response.status === 404 && !isHTML) {
            console.log(`   ❌ ${endpoint}: Status ${response.status} (JSON-404)`);
          } else if (isHTML) {
            // HTML-404 ignorieren (zu viele)
          } else {
            console.log(`   ⚠️  ${endpoint}: Status ${response.status}`);
          }
        } catch (error) {
          if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            // Verbindungsfehler ignorieren
          } else {
            // Andere Fehler ignorieren
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
testBaseUrls(organizationId);


