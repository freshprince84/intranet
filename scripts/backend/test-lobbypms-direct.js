/**
 * Direkter LobbyPMS-Test ohne Login
 * Testet die Service-Logik direkt
 */

const { PrismaClient } = require('@prisma/client');
const { LobbyPmsService } = require('../dist/services/lobbyPmsService');

const prisma = new PrismaClient();

async function testLobbyPmsDirect(organizationId = 1) {
  console.log('\n🔍 Direkter LobbyPMS-Test');
  console.log('='.repeat(50));
  console.log(`Organisation ID: ${organizationId}`);
  console.log('='.repeat(50));

  try {
    // Schritt 1: Prüfe Settings in DB
    console.log('\n📋 Schritt 1: Settings prüfen...');
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true }
    });

    if (!organization?.settings) {
      console.error('❌ Keine Settings gefunden');
      process.exit(1);
    }

    const settings = organization.settings;
    const lobbyPmsSettings = settings?.lobbyPms;

    if (!lobbyPmsSettings) {
      console.error('❌ LobbyPMS Settings nicht gefunden');
      process.exit(1);
    }

    console.log('✅ Settings gefunden:');
    console.log(`   API URL: ${lobbyPmsSettings.apiUrl || 'NICHT GESETZT'}`);
    console.log(`   API Key: ${lobbyPmsSettings.apiKey ? 'GESETZT' : 'NICHT GESETZT'}`);
    console.log(`   Property ID: ${lobbyPmsSettings.propertyId || 'NICHT GESETZT'}`);
    console.log(`   Sync Enabled: ${lobbyPmsSettings.syncEnabled ? '✅' : '❌'}`);

    // Schritt 2: Service initialisieren
    console.log('\n🔧 Schritt 2: Service initialisieren...');
    const service = new LobbyPmsService(organizationId);
    console.log('✅ Service erstellt');

    // Schritt 3: Verbindung testen
    console.log('\n📡 Schritt 3: LobbyPMS-Verbindung testen...');
    try {
      const isValid = await service.validateConnection();
      if (isValid) {
        console.log('✅ LobbyPMS-Verbindung erfolgreich!');
      } else {
        console.log('⚠️  LobbyPMS-Verbindung fehlgeschlagen');
      }
    } catch (error) {
      console.error('❌ Fehler bei Verbindungstest:');
      console.error(`   ${error.message}`);
      
      if (error.message.includes('nicht konfiguriert')) {
        console.error('\n💡 Lösung:');
        console.error('   - Prüfe ob API Token in Organisation Settings eingetragen ist');
        console.error('   - Prüfe ob Property ID eingetragen ist');
        console.error('   - Prüfe ob Synchronisation aktiviert ist');
      } else if (error.message.includes('ENCRYPTION_KEY')) {
        console.error('\n💡 Lösung:');
        console.error('   - ENCRYPTION_KEY ist nicht gesetzt (optional für unverschlüsselte Keys)');
        console.error('   - Für Produktion sollte ENCRYPTION_KEY gesetzt werden');
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        console.error('\n💡 Lösung:');
        console.error('   - LobbyPMS API ist nicht erreichbar');
        console.error('   - Prüfe API URL: ' + (lobbyPmsSettings.apiUrl || 'NICHT GESETZT'));
        console.error('   - Prüfe Internetverbindung');
      }
      
      process.exit(1);
    }

    // Schritt 4: Reservierungen abrufen (optional)
    console.log('\n📋 Schritt 4: Reservierungen abrufen (Test)...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const reservations = await service.fetchTomorrowReservations('22:00');
      console.log(`✅ ${reservations.length} Reservierungen für morgen gefunden`);
      
      if (reservations.length > 0) {
        console.log('\n   Erste Reservierung:');
        const first = reservations[0];
        console.log(`   - ID: ${first.id}`);
        console.log(`   - Gast: ${first.guest_name || first.guestName || 'N/A'}`);
        console.log(`   - Check-in: ${first.check_in_date || first.checkInDate || 'N/A'}`);
      }
    } catch (error) {
      console.error('⚠️  Fehler beim Abrufen der Reservierungen:');
      console.error(`   ${error.message}`);
      console.error('   (Das ist OK, wenn keine Reservierungen vorhanden sind)');
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

// Hauptfunktion
const organizationId = parseInt(process.argv[2] || '1');
testLobbyPmsDirect(organizationId);


