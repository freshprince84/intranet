/**
 * Debug-Script für LobbyPMS Settings
 * 
 * Prüft die Settings direkt in der Datenbank
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugLobbyPmsSettings(organizationId = 1) {
  console.log('\n🔍 LobbyPMS Settings Debug');
  console.log('='.repeat(50));
  console.log(`Organisation ID: ${organizationId}`);
  console.log('='.repeat(50));

  try {
    // Hole Organisation
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      console.error('❌ Organisation nicht gefunden');
      process.exit(1);
    }

    console.log(`\n✅ Organisation gefunden: ${organization.displayName} (${organization.name})`);

    // Prüfe Settings
    if (!organization.settings) {
      console.error('❌ Keine Settings gefunden');
      process.exit(1);
    }

    const settings = organization.settings;
    console.log('\n📋 Settings-Struktur:');
    console.log(JSON.stringify(settings, null, 2));

    // Prüfe LobbyPMS Settings
    const lobbyPmsSettings = settings?.lobbyPms;

    if (!lobbyPmsSettings) {
      console.error('\n❌ LobbyPMS Settings nicht gefunden');
      console.error('   Lösung: Settings im Frontend konfigurieren');
      process.exit(1);
    }

    console.log('\n📋 LobbyPMS Settings:');
    console.log(`   API URL: ${lobbyPmsSettings.apiUrl || 'NICHT GESETZT'}`);
    console.log(`   API Key: ${lobbyPmsSettings.apiKey ? 'GESETZT (' + lobbyPmsSettings.apiKey.substring(0, 10) + '...)' : 'NICHT GESETZT'}`);
    console.log(`   Property ID: ${lobbyPmsSettings.propertyId || 'NICHT GESETZT'}`);
    console.log(`   Sync Enabled: ${lobbyPmsSettings.syncEnabled ? '✅' : '❌'}`);
    console.log(`   Auto Create Tasks: ${lobbyPmsSettings.autoCreateTasks ? '✅' : '❌'}`);
    console.log(`   Late Check-in Threshold: ${lobbyPmsSettings.lateCheckInThreshold || 'NICHT GESETZT'}`);

    // Prüfe ob API Key verschlüsselt ist
    if (lobbyPmsSettings.apiKey) {
      const isEncrypted = lobbyPmsSettings.apiKey.includes(':');
      console.log(`\n🔐 API Key Status: ${isEncrypted ? 'VERSCHLÜSSELT' : 'UNVERSCHLÜSSELT'}`);
      
      if (isEncrypted) {
        console.log('   ✅ API Key ist verschlüsselt (gut)');
      } else {
        console.log('   ⚠️  API Key ist nicht verschlüsselt');
        console.log('   Hinweis: Beim nächsten Speichern wird er verschlüsselt');
      }
    }

    // Prüfe ENCRYPTION_KEY
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('\n❌ ENCRYPTION_KEY nicht gesetzt');
      console.error('   Lösung: Füge ENCRYPTION_KEY zur .env Datei hinzu');
    } else {
      console.log('\n✅ ENCRYPTION_KEY ist gesetzt');
      console.log(`   Länge: ${encryptionKey.length} Zeichen (erwartet: 64)`);
      if (encryptionKey.length !== 64) {
        console.error('   ⚠️  ENCRYPTION_KEY hat falsche Länge!');
      }
    }

    // Zusammenfassung
    console.log('\n📊 Zusammenfassung:');
    const issues = [];
    
    if (!lobbyPmsSettings.apiKey) {
      issues.push('❌ API Key fehlt');
    }
    if (!lobbyPmsSettings.propertyId) {
      issues.push('❌ Property ID fehlt');
    }
    if (!lobbyPmsSettings.syncEnabled) {
      issues.push('⚠️  Synchronisation nicht aktiviert');
    }
    if (!encryptionKey) {
      issues.push('❌ ENCRYPTION_KEY nicht gesetzt');
    }

    if (issues.length === 0) {
      console.log('✅ Alle Einstellungen korrekt!');
    } else {
      console.log('⚠️  Gefundene Probleme:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Hauptfunktion
const organizationId = parseInt(process.argv[2] || '1');
debugLobbyPmsSettings(organizationId);


