/**
 * Einfacher LobbyPMS-Verbindungstest
 * 
 * Verwendung:
 * node scripts/test-lobbypms-simple.js <username> <password> [organizationId]
 * 
 * Beispiel:
 * node scripts/test-lobbypms-simple.js admin password123 1
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testLobbyPmsSimple(username, password, organizationId = 1) {
  console.log('\n🔍 LobbyPMS-Verbindungstest');
  console.log('='.repeat(50));
  console.log(`Organisation ID: ${organizationId}`);
  console.log(`API URL: ${API_BASE_URL}`);
  console.log('='.repeat(50));

  try {
    // Schritt 1: Login
    console.log('\n📝 Schritt 1: Authentifizierung...');
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username,
      password
    });

    if (!loginResponse.data.token) {
      console.error('❌ Login fehlgeschlagen');
      console.error('   Response:', loginResponse.data);
      process.exit(1);
    }

    const token = loginResponse.data.token;
    console.log('✅ Login erfolgreich');
    console.log(`   User: ${loginResponse.data.user?.username || 'N/A'}`);

    // Schritt 2: LobbyPMS-Verbindung testen
    console.log('\n📡 Schritt 2: LobbyPMS-Verbindung testen...');
    
    try {
      const validateResponse = await axios.get(
        `${API_BASE_URL}/api/lobby-pms/validate`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (validateResponse.data.success) {
        console.log('✅ LobbyPMS-Verbindung erfolgreich!');
        console.log(`   Message: ${validateResponse.data.message}`);
      } else {
        console.log('⚠️  LobbyPMS-Verbindung fehlgeschlagen');
        console.log(`   Message: ${validateResponse.data.message}`);
      }
    } catch (error) {
      if (error.response) {
        console.error('❌ Fehler bei LobbyPMS-Verbindungstest:');
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Message: ${error.response.data?.message || error.message}`);
        
        if (error.response.data?.message?.includes('nicht konfiguriert')) {
          console.error('\n💡 Lösung:');
          console.error('   1. Öffne die Organisation im Frontend');
          console.error('   2. Gehe zum Tab "API"');
          console.error('   3. Konfiguriere LobbyPMS:');
          console.error('      - API Token eintragen');
          console.error('      - Property ID eintragen');
          console.error('      - Synchronisation aktivieren');
          console.error('   4. Speichern');
        } else if (error.response.status === 404) {
          console.error('\n💡 Lösung:');
          console.error('   Server muss neu gestartet werden, damit neue Routen geladen werden');
        }
      } else {
        console.error('❌ Netzwerkfehler:', error.message);
        console.error('   Prüfe ob der Server läuft auf:', API_BASE_URL);
      }
      process.exit(1);
    }

    console.log('\n✅ Test abgeschlossen!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Unerwarteter Fehler:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Hauptfunktion
const username = process.argv[2];
const password = process.argv[3];
const organizationId = parseInt(process.argv[4] || '1');

if (!username || !password) {
  console.error('❌ Fehlende Parameter');
  console.error('Verwendung: node scripts/test-lobbypms-simple.js <username> <password> [organizationId]');
  process.exit(1);
}

testLobbyPmsSimple(username, password, organizationId);


