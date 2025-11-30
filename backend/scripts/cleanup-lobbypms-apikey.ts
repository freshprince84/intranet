/**
 * Script zur Bereinigung des LobbyPMS apiKey
 * 
 * Problem: apiKey ist 63 MB groß (sollte ~500 bytes sein)
 * 
 * Ziel: apiKey bereinigen und auf normale Größe reduzieren
 */

import { prisma } from '../src/utils/prisma';
import { decryptSecret, encryptSecret } from '../src/utils/encryption';

async function cleanupLobbyPmsApiKey() {
  try {
    console.log('🔍 Analysiere LobbyPMS apiKey für Organization ID 1...\n');

    // 1. Hole Organization mit Settings
    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        settings: true
      }
    });

    if (!organization) {
      console.error('❌ Organization ID 1 nicht gefunden');
      return;
    }

    const settings = organization.settings as any;
    const lobbyPms = settings?.lobbyPms;

    if (!lobbyPms?.apiKey) {
      console.log('ℹ️ Kein LobbyPMS apiKey gefunden');
      return;
    }

    const apiKey = lobbyPms.apiKey;
    const apiKeyLength = JSON.stringify(apiKey).length;

    console.log(`📊 Aktuelle apiKey-Größe: ${formatBytes(apiKeyLength)}`);
    console.log(`📊 apiKey-Typ: ${typeof apiKey}`);
    console.log(`📊 apiKey (erste 200 Zeichen): ${String(apiKey).substring(0, 200)}...\n`);

    // 2. Prüfe ob apiKey mehrfach verschlüsselt ist
    const colonCount = (String(apiKey).match(/:/g) || []).length;
    console.log(`🔍 Doppelpunkt-Anzahl: ${colonCount} (erwartet: 2 für iv:authTag:encrypted)`);

    if (colonCount > 2) {
      console.log('⚠️ apiKey scheint mehrfach verschlüsselt zu sein!\n');
    }

    // 3. Versuche apiKey zu entschlüsseln (Schritt für Schritt)
    let decryptedKey: string | null = null;
    let currentKey: string = String(apiKey);
    let iteration = 0;
    const maxIterations = 10; // Sicherheit gegen Endlosschleife

    console.log('🔓 Versuche apiKey zu entschlüsseln...\n');

    while (iteration < maxIterations) {
      try {
        // Prüfe ob es verschlüsselt ist (Format: iv:authTag:encrypted)
        if (currentKey.includes(':') && currentKey.split(':').length >= 3) {
          decryptedKey = decryptSecret(currentKey);
          console.log(`  Iteration ${iteration + 1}: Erfolgreich entschlüsselt (${formatBytes(decryptedKey.length)})`);
          
          // Prüfe ob entschlüsselter Wert wieder verschlüsselt ist
          if (decryptedKey.includes(':') && decryptedKey.split(':').length >= 3) {
            console.log(`  ⚠️ Entschlüsselter Wert ist wieder verschlüsselt - weiter entschlüsseln...`);
            currentKey = decryptedKey;
            iteration++;
          } else {
            // Erfolgreich - finaler entschlüsselter Key
            console.log(`  ✅ Finaler entschlüsselter Key gefunden (${formatBytes(decryptedKey.length)})\n`);
            break;
          }
        } else {
          // Nicht verschlüsselt - das ist der finale Key
          decryptedKey = currentKey;
          console.log(`  ✅ Key ist nicht verschlüsselt (${formatBytes(decryptedKey.length)})\n`);
          break;
        }
      } catch (error) {
        console.log(`  ❌ Fehler bei Iteration ${iteration + 1}:`, (error as Error).message);
        // Wenn Entschlüsselung fehlschlägt, ist der aktuelle Wert der finale Key
        decryptedKey = currentKey;
        break;
      }
    }

    if (!decryptedKey) {
      console.error('❌ Konnte apiKey nicht entschlüsseln');
      return;
    }

    // 4. Prüfe ob der entschlüsselte Key sinnvoll ist
    console.log(`📊 Finaler entschlüsselter Key:`);
    console.log(`  Länge: ${decryptedKey.length} Zeichen`);
    console.log(`  Vorschau: ${decryptedKey.substring(0, 50)}...\n`);

    // 5. Frage ob bereinigt werden soll
    console.log('💡 Empfehlung:');
    if (apiKeyLength > 10000) {
      console.log('  ⚠️ apiKey ist zu groß - sollte bereinigt werden');
      console.log('  📝 Neuer verschlüsselter Key wird ~500 bytes groß sein\n');
      
      // 6. Bereinigen: Neu verschlüsseln
      console.log('🔧 Bereinige apiKey...\n');
      
      const cleanedApiKey = encryptSecret(decryptedKey);
      const cleanedSize = cleanedApiKey.length;
      
      console.log(`✅ Neuer verschlüsselter Key:`);
      console.log(`  Größe: ${formatBytes(cleanedSize)}`);
      console.log(`  Verbesserung: ${formatBytes(apiKeyLength - cleanedSize)} weniger\n`);

      // 7. Update Settings
      const updatedSettings = {
        ...settings,
        lobbyPms: {
          ...lobbyPms,
          apiKey: cleanedApiKey
        }
      };

      console.log('💾 Speichere bereinigte Settings...');
      await prisma.organization.update({
        where: { id: 1 },
        data: {
          settings: updatedSettings
        }
      });

      console.log('✅ Settings erfolgreich bereinigt!\n');

      // 8. Prüfe neue Größe
      const updatedOrg = await prisma.organization.findUnique({
        where: { id: 1 },
        select: {
          settings: true
        }
      });

      if (updatedOrg?.settings) {
        const newSettings = updatedOrg.settings as any;
        const newLobbyPms = newSettings?.lobbyPms;
        const newApiKeySize = JSON.stringify(newLobbyPms?.apiKey || '').length;
        const newTotalSize = JSON.stringify(newSettings).length;

        console.log('📊 Neue Größen:');
        console.log(`  apiKey: ${formatBytes(newApiKeySize)}`);
        console.log(`  Gesamt Settings: ${formatBytes(newTotalSize)}`);
        console.log(`  Verbesserung: ${formatBytes(apiKeyLength - newApiKeySize)} weniger\n`);
      }

    } else {
      console.log('  ✅ apiKey-Größe ist normal - keine Bereinigung nötig');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Script ausführen
cleanupLobbyPmsApiKey()
  .then(() => {
    console.log('✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

