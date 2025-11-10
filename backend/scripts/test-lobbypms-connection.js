/**
 * Test-Script für LobbyPMS-Verbindung
 * 
 * Verwendung:
 * node scripts/test-lobbypms-connection.js <organizationId>
 * 
 * Beispiel:
 * node scripts/test-lobbypms-connection.js 1
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000';

async function testLobbyPmsConnection(organizationId) {
  console.log('\n🔍 LobbyPMS-Verbindungstest');
  console.log('='.repeat(50));
  console.log(`Organisation ID: ${organizationId}`);
  console.log(`API URL: ${API_BASE_URL}`);
  console.log('='.repeat(50));

  try {
    // Schritt 1: Login (falls Token benötigt)
    console.log('\n📝 Schritt 1: Authentifizierung...');
    console.log('Bitte gib deine Login-Daten ein:');
    
    const username = await question('Username/Email: ');
    const password = await question('Password: ', true);
    
    const loginResponse = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      username,
      password
    });

    if (!loginResponse.data.token) {
      console.error('❌ Login fehlgeschlagen');
      return;
    }

    const token = loginResponse.data.token;
    console.log('✅ Login erfolgreich');

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
        }
      } else {
        console.error('❌ Netzwerkfehler:', error.message);
        console.error('   Prüfe ob der Server läuft auf:', API_BASE_URL);
      }
    }

    // Schritt 3: Reservierungen abrufen (optional)
    console.log('\n📋 Schritt 3: Reservierungen abrufen (optional)...');
    const testReservations = await question('Reservierungen abrufen? (j/n): ');
    
    if (testReservations.toLowerCase() === 'j') {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);

        const reservationsResponse = await axios.get(
          `${API_BASE_URL}/api/lobby-pms/reservations`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            params: {
              startDate: tomorrow.toISOString().split('T')[0],
              endDate: dayAfter.toISOString().split('T')[0]
            }
          }
        );

        if (reservationsResponse.data.success) {
          console.log(`✅ ${reservationsResponse.data.count || 0} Reservierungen gefunden`);
          if (reservationsResponse.data.data && reservationsResponse.data.data.length > 0) {
            console.log('\n   Erste Reservierung:');
            const first = reservationsResponse.data.data[0];
            console.log(`   - Gast: ${first.guest_name || first.guestName}`);
            console.log(`   - Check-in: ${first.check_in_date || first.checkInDate}`);
            console.log(`   - Status: ${first.status}`);
          }
        }
      } catch (error) {
        console.error('❌ Fehler beim Abrufen der Reservierungen:', error.response?.data?.message || error.message);
      }
    }

    console.log('\n✅ Test abgeschlossen!');
  } catch (error) {
    console.error('\n❌ Unerwarteter Fehler:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    rl.close();
  }
}

function question(prompt, hidden = false) {
  return new Promise((resolve) => {
    if (hidden) {
      process.stdout.write(prompt);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let input = '';
      process.stdin.on('data', (char) => {
        char = char.toString();
        
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdout.write('\n');
            resolve(input);
            break;
          case '\u0003':
            process.exit();
            break;
          case '\u007f':
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            input += char;
            process.stdout.write('*');
            break;
        }
      });
    } else {
      rl.question(prompt, resolve);
    }
  });
}

// Hauptfunktion
const organizationId = process.argv[2] || '1';
testLobbyPmsConnection(parseInt(organizationId));


