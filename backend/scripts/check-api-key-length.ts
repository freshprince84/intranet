/**
 * Prüft Länge des LobbyPMS API-Keys
 * 
 * Verwendung:
 *   npx ts-node backend/scripts/check-api-key-length.ts
 */

import { prisma } from '../src/utils/prisma';
import { decryptBranchApiSettings } from '../src/utils/encryption';

async function checkApiKeyLength() {
  console.log('🔍 Prüfe LobbyPMS API-Key Länge\n');
  console.log('=' .repeat(80));
  
  try {
    // Hole Branches Manila und Parque Poblado
    const branches = await prisma.branch.findMany({
      where: {
        id: { in: [3, 4] } // Manila und Parque Poblado
      },
      select: {
        id: true,
        name: true,
        lobbyPmsSettings: true
      }
    });

    if (branches.length === 0) {
      console.error('❌ Keine Branches gefunden (Erwartet: Manila oder Parque Poblado)');
      process.exit(1);
    }

    for (const branch of branches) {
      console.log(`\n📋 Branch: ${branch.name} (ID: ${branch.id})`);
      
      if (!branch.lobbyPmsSettings) {
        console.log('   ⚠️  Keine LobbyPMS Settings gefunden');
        continue;
      }

      try {
        const settings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
        const lobbyPmsSettings = settings?.lobbyPms || settings;
        const apiKey = lobbyPmsSettings?.apiKey;

        if (!apiKey) {
          console.log('   ⚠️  Kein API-Key gefunden');
          continue;
        }

        const apiKeyLength = apiKey.length;
        const apiKeyLengthKB = apiKeyLength / 1024;
        const authHeader = `Bearer ${apiKey}`;
        const authHeaderLength = authHeader.length;
        const authHeaderLengthKB = authHeaderLength / 1024;

        console.log(`   API-Key Länge: ${apiKeyLength} Zeichen (${apiKeyLengthKB.toFixed(2)} KB)`);
        console.log(`   Authorization Header: ${authHeaderLength} Zeichen (${authHeaderLengthKB.toFixed(2)} KB)`);
        console.log(`   API-Key (erste 20 Zeichen): ${apiKey.substring(0, 20)}...`);
        console.log(`   API-Key (letzte 20 Zeichen): ...${apiKey.substring(apiKey.length - 20)}`);

        // Warnung wenn zu lang
        if (authHeaderLength > 4096) {
          console.log(`   ⚠️  WARNUNG: Authorization Header ist > 4KB!`);
          console.log(`   ⚠️  Das könnte das "400 Request Header Or Cookie Too Large" Problem verursachen.`);
        } else if (authHeaderLength > 2048) {
          console.log(`   ⚠️  WARNUNG: Authorization Header ist > 2KB!`);
          console.log(`   ⚠️  Könnte bei manchen Servern Probleme verursachen.`);
        } else {
          console.log(`   ✅ Authorization Header ist < 2KB, sollte kein Problem sein.`);
        }

        // Prüfe ob API-Key Base64-encoded ist (könnte länger sein als nötig)
        const isBase64 = /^[A-Za-z0-9+/=]+$/.test(apiKey) && apiKey.length % 4 === 0;
        if (isBase64 && apiKeyLength > 100) {
          console.log(`   ℹ️  API-Key scheint Base64-encoded zu sein (${apiKeyLength} Zeichen)`);
        }

      } catch (error: any) {
        console.error(`   ❌ Fehler beim Entschlüsseln:`, error.message);
      }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Prüfung abgeschlossen');

  } catch (error) {
    console.error('❌ Kritischer Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Führe Prüfung aus
checkApiKeyLength().catch(console.error);

