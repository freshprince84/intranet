/**
 * Script zur Analyse der LobbyPMS Settings-Größe
 * 
 * Ziel: Verstehen was in den 63 MB Settings ist
 */

import { prisma } from '../src/utils/prisma';

async function analyzeLobbyPmsSettings() {
  try {
    console.log('🔍 Analysiere LobbyPMS Settings für Organization ID 1...\n');

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

    if (!lobbyPms) {
      console.log('ℹ️ Keine LobbyPMS Settings gefunden');
      return;
    }

    console.log('📊 LobbyPMS Settings-Struktur:');
    console.log('Keys:', Object.keys(lobbyPms));
    console.log('\n');

    // 2. Analysiere Größe pro Key
    console.log('📏 Größe pro Key:');
    const keySizes: Array<{ key: string; size: number; sizePretty: string }> = [];

    for (const key of Object.keys(lobbyPms)) {
      const value = lobbyPms[key];
      const size = JSON.stringify(value).length;
      const sizePretty = formatBytes(size);
      keySizes.push({ key, size, sizePretty });
    }

    keySizes.sort((a, b) => b.size - a.size);

    for (const { key, size, sizePretty } of keySizes) {
      console.log(`  ${key}: ${sizePretty} (${size} bytes)`);
    }

    console.log('\n');

    // 3. Zeige größte Keys im Detail
    console.log('🔍 Größte Keys (erste 100 Zeichen):');
    for (const { key, size } of keySizes.slice(0, 5)) {
      const value = lobbyPms[key];
      const preview = JSON.stringify(value).substring(0, 100);
      console.log(`\n  ${key} (${formatBytes(size)}):`);
      console.log(`    ${preview}...`);
    }

    console.log('\n');

    // 4. Empfehlungen
    console.log('💡 Empfehlungen:');
    const largeKeys = keySizes.filter(k => k.size > 1024); // > 1 kB
    if (largeKeys.length > 0) {
      console.log('  ⚠️ Große Keys gefunden (sollten möglicherweise entfernt werden):');
      for (const { key, sizePretty } of largeKeys) {
        console.log(`    - ${key}: ${sizePretty}`);
      }
    } else {
      console.log('  ✅ Alle Keys sind klein (< 1 kB)');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
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
analyzeLobbyPmsSettings();

