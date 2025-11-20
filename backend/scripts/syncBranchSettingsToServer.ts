import { PrismaClient } from '@prisma/client';
import { decryptBranchApiSettings, encryptBranchApiSettings } from '../src/utils/encryption';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const localPrisma = new PrismaClient();

// LobbyPMS Tokens für Server (nur Produktivumgebung)
const LOBBYPMS_TOKENS = {
  'Manila': '8LwykKjLq7uziBRLxL1INGCLSsKfYWc5KIXTnRqZ28wTvSQehrIsToUJ3a5V',
  'Parque Poblado': 'Q3LiVD4A6438JatGPmNkBUPrErWM2HIU3KrJ0O2BoIWpNW3Q0l3ZC1JmRtri',
};

interface BranchSettings {
  id: number;
  name: string;
  organizationId: number | null;
  whatsappSettings: any;
  lobbyPmsSettings: any;
  boldPaymentSettings: any;
  doorSystemSettings: any;
  emailSettings: any;
}

async function syncBranchSettings() {
  try {
    console.log('🔄 Synchronisiere Branch-Settings von lokal auf Server...\n');

    // 1. Lokale Branches lesen
    console.log('📥 Lese lokale Branches...');
    const localBranches = await localPrisma.branch.findMany({
      orderBy: { name: 'asc' },
      include: {
        organization: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    console.log(`✅ ${localBranches.length} lokale Branches gefunden\n`);

    // 2. Settings vorbereiten (entschlüsseln für Vergleich)
    const localSettings: BranchSettings[] = [];
    for (const branch of localBranches) {
      const settings: BranchSettings = {
        id: branch.id,
        name: branch.name,
        organizationId: branch.organizationId,
        whatsappSettings: null,
        lobbyPmsSettings: null,
        boldPaymentSettings: null,
        doorSystemSettings: null,
        emailSettings: null,
      };

      // Entschlüssele Settings für Vergleich
      if (branch.whatsappSettings) {
        try {
          settings.whatsappSettings = decryptBranchApiSettings(branch.whatsappSettings as any);
        } catch (error) {
          console.warn(`⚠️  Fehler beim Entschlüsseln von WhatsApp Settings für ${branch.name}`);
        }
      }

      if (branch.lobbyPmsSettings) {
        try {
          settings.lobbyPmsSettings = decryptBranchApiSettings(branch.lobbyPmsSettings as any);
        } catch (error) {
          console.warn(`⚠️  Fehler beim Entschlüsseln von LobbyPMS Settings für ${branch.name}`);
        }
      }

      if (branch.boldPaymentSettings) {
        try {
          settings.boldPaymentSettings = decryptBranchApiSettings(branch.boldPaymentSettings as any);
        } catch (error) {
          console.warn(`⚠️  Fehler beim Entschlüsseln von Bold Payment Settings für ${branch.name}`);
        }
      }

      if (branch.doorSystemSettings) {
        try {
          settings.doorSystemSettings = decryptBranchApiSettings(branch.doorSystemSettings as any);
        } catch (error) {
          console.warn(`⚠️  Fehler beim Entschlüsseln von Door System Settings für ${branch.name}`);
        }
      }

      if (branch.emailSettings) {
        try {
          settings.emailSettings = decryptBranchApiSettings(branch.emailSettings as any);
        } catch (error) {
          console.warn(`⚠️  Fehler beim Entschlüsseln von Email Settings für ${branch.name}`);
        }
      }

      localSettings.push(settings);
    }

    // 3. JSON-Datei erstellen
    const jsonFile = path.join(__dirname, 'sync_branch_settings.json');
    fs.writeFileSync(jsonFile, JSON.stringify(localSettings, null, 2));
    console.log(`📝 JSON-Datei erstellt: ${jsonFile}\n`);

    // 4. Script für Server erstellen
    const serverScript = `import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

// LobbyPMS Tokens für Server (nur Produktivumgebung)
const LOBBYPMS_TOKENS: Record<string, string> = {
  'Manila': '8LwykKjLq7uziBRLxL1INGCLSsKfYWc5KIXTnRqZ28wTvSQehrIsToUJ3a5V',
  'Parque Poblado': 'Q3LiVD4A6438JatGPmNkBUPrErWM2HIU3KrJ0O2BoIWpNW3Q0l3ZC1JmRtri',
};

interface BranchSettings {
  id: number;
  name: string;
  organizationId: number | null;
  whatsappSettings: any;
  lobbyPmsSettings: any;
  boldPaymentSettings: any;
  doorSystemSettings: any;
  emailSettings: any;
}

// Encryption-Funktionen inline (um Import-Probleme zu vermeiden)
async function getEncryptionUtils() {
  const encryption = await import('../src/utils/encryption');
  return {
    decryptBranchApiSettings: encryption.decryptBranchApiSettings,
    encryptBranchApiSettings: encryption.encryptBranchApiSettings,
  };
}

async function syncBranchSettingsOnServer() {
  try {
    console.log('🔄 Synchronisiere Branch-Settings auf Server...\\n');

    const { decryptBranchApiSettings, encryptBranchApiSettings } = await getEncryptionUtils();

    // 1. JSON-Datei lesen
    const data = JSON.parse(fs.readFileSync('/var/www/intranet/backend/scripts/sync_branch_settings.json', 'utf-8')) as BranchSettings[];
    console.log(\`📥 \${data.length} Branches zum Synchronisieren gefunden\\n\`);

    let updated = 0;
    let skipped = 0;
    let conflicts = 0;

    for (const localSettings of data) {
      console.log(\`\\n📍 Branch: \${localSettings.name} (ID: \${localSettings.id})\`);

      // Finde Branch auf Server (nach Name, nicht ID) - mit allen Feldern
      const serverBranch = await prisma.branch.findUnique({
        where: { name: localSettings.name },
        select: {
          id: true,
          name: true,
          whatsappSettings: true,
          lobbyPmsSettings: true,
          boldPaymentSettings: true,
          doorSystemSettings: true,
          emailSettings: true,
        },
      }) as any;

      if (!serverBranch) {
        console.log(\`   ⚠️  Branch "\${localSettings.name}" existiert auf Server nicht, überspringe\`);
        skipped++;
        continue;
      }

      console.log(\`   ✅ Branch gefunden auf Server (ID: \${serverBranch.id})\`);

      // Lade aktuelle Server-Settings (entschlüsselt)
      const serverWhatsApp = serverBranch.whatsappSettings ? decryptBranchApiSettings(serverBranch.whatsappSettings as any) : null;
      const serverLobbyPMS = serverBranch.lobbyPmsSettings ? decryptBranchApiSettings(serverBranch.lobbyPmsSettings as any) : null;
      const serverBoldPayment = serverBranch.boldPaymentSettings ? decryptBranchApiSettings(serverBranch.boldPaymentSettings as any) : null;
      const serverDoorSystem = serverBranch.doorSystemSettings ? decryptBranchApiSettings(serverBranch.doorSystemSettings as any) : null;
      const serverEmail = serverBranch.emailSettings ? decryptBranchApiSettings(serverBranch.emailSettings as any) : null;

      const updateData: any = {};

      // WhatsApp Settings
      if (localSettings.whatsappSettings && !serverWhatsApp) {
        console.log(\`   ✅ Übertrage WhatsApp Settings (fehlt auf Server)\`);
        updateData.whatsappSettings = encryptBranchApiSettings(localSettings.whatsappSettings);
      } else if (localSettings.whatsappSettings && serverWhatsApp) {
        console.log(\`   ⚠️  WhatsApp Settings existiert bereits auf Server, überspringe\`);
        conflicts++;
      }

      // LobbyPMS Settings
      if (localSettings.lobbyPmsSettings || LOBBYPMS_TOKENS[localSettings.name]) {
        // Spezielle Behandlung: LobbyPMS Token für Manila und Parque Poblado aktualisieren
        if (LOBBYPMS_TOKENS[localSettings.name]) {
          console.log(\`   🔑 Aktualisiere LobbyPMS Token für \${localSettings.name}\`);
          const newLobbyPmsSettings = localSettings.lobbyPmsSettings ? { ...localSettings.lobbyPmsSettings } : {};
          newLobbyPmsSettings.apiKey = LOBBYPMS_TOKENS[localSettings.name];
          if (localSettings.lobbyPmsSettings?.apiUrl) {
            newLobbyPmsSettings.apiUrl = localSettings.lobbyPmsSettings.apiUrl;
          }
          if (localSettings.lobbyPmsSettings?.propertyId) {
            newLobbyPmsSettings.propertyId = localSettings.lobbyPmsSettings.propertyId;
          }
          updateData.lobbyPmsSettings = encryptBranchApiSettings(newLobbyPmsSettings);
        } else if (localSettings.lobbyPmsSettings && !serverLobbyPMS) {
          console.log(\`   ✅ Übertrage LobbyPMS Settings (fehlt auf Server)\`);
          updateData.lobbyPmsSettings = encryptBranchApiSettings(localSettings.lobbyPmsSettings);
        } else if (localSettings.lobbyPmsSettings && serverLobbyPMS) {
          console.log(\`   ⚠️  LobbyPMS Settings existiert bereits auf Server, überspringe\`);
          conflicts++;
        }
      }

      // Bold Payment Settings
      if (localSettings.boldPaymentSettings && !serverBoldPayment) {
        console.log(\`   ✅ Übertrage Bold Payment Settings (fehlt auf Server)\`);
        updateData.boldPaymentSettings = encryptBranchApiSettings(localSettings.boldPaymentSettings);
      } else if (localSettings.boldPaymentSettings && serverBoldPayment) {
        console.log(\`   ⚠️  Bold Payment Settings existiert bereits auf Server, überspringe\`);
        conflicts++;
      }

      // Door System Settings
      if (localSettings.doorSystemSettings && !serverDoorSystem) {
        console.log(\`   ✅ Übertrage Door System Settings (fehlt auf Server)\`);
        updateData.doorSystemSettings = encryptBranchApiSettings(localSettings.doorSystemSettings);
      } else if (localSettings.doorSystemSettings && serverDoorSystem) {
        console.log(\`   ⚠️  Door System Settings existiert bereits auf Server, überspringe\`);
        conflicts++;
      }

      // Email Settings
      if (localSettings.emailSettings && !serverEmail) {
        console.log(\`   ✅ Übertrage Email Settings (fehlt auf Server)\`);
        updateData.emailSettings = encryptBranchApiSettings(localSettings.emailSettings);
      } else if (localSettings.emailSettings && serverEmail) {
        console.log(\`   ⚠️  Email Settings existiert bereits auf Server, überspringe\`);
        conflicts++;
      }

      // Update durchführen, wenn es Änderungen gibt
      if (Object.keys(updateData).length > 0) {
        await prisma.branch.update({
          where: { id: serverBranch.id },
          data: updateData,
        });
        console.log(\`   ✅ Branch aktualisiert\`);
        updated++;
      } else {
        console.log(\`   ⏭️  Keine Änderungen erforderlich\`);
        skipped++;
      }
    }

    console.log(\`\\n✅ Synchronisation abgeschlossen:\\n\`);
    console.log(\`   - Aktualisiert: \${updated}\`);
    console.log(\`   - Übersprungen: \${skipped}\`);
    console.log(\`   - Konflikte (bestehende Settings): \${conflicts}\`);
  } catch (error) {
    console.error('❌ Fehler bei der Synchronisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

syncBranchSettingsOnServer();
`;

    const scriptFile = path.join(__dirname, 'sync_branch_settings_server.ts');
    fs.writeFileSync(scriptFile, serverScript);
    console.log(`📝 Server-Script erstellt: ${scriptFile}\n`);

    // 5. Dateien auf Server kopieren
    console.log('📤 Kopiere Dateien auf den Server...');
    const copyJsonCommand = `scp -i ~/.ssh/intranet_rsa ${jsonFile} root@65.109.228.106:/var/www/intranet/backend/scripts/sync_branch_settings.json`;
    await execAsync(copyJsonCommand);
    console.log('   ✅ JSON-Datei kopiert');

    const copyScriptCommand = `scp -i ~/.ssh/intranet_rsa ${scriptFile} root@65.109.228.106:/var/www/intranet/backend/scripts/sync_branch_settings_server.ts`;
    await execAsync(copyScriptCommand);
    console.log('   ✅ Server-Script kopiert\n');

    // 6. Script auf Server ausführen
    console.log('🔄 Führe Synchronisation auf dem Server aus...\n');
    const executeCommand = `ssh -i ~/.ssh/intranet_rsa root@65.109.228.106 "cd /var/www/intranet/backend && npx ts-node scripts/sync_branch_settings_server.ts && rm scripts/sync_branch_settings_server.ts scripts/sync_branch_settings.json"`;

    try {
      const { stdout, stderr } = await execAsync(executeCommand);
      console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error: any) {
      console.error('❌ Fehler beim Ausführen:', error.message);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
    }

    // 7. Lokale temporäre Dateien löschen
    fs.unlinkSync(jsonFile);
    fs.unlinkSync(scriptFile);

    console.log('\n✅ Branch-Settings-Synchronisation abgeschlossen!\n');
  } catch (error) {
    console.error('❌ Fehler bei der Synchronisation:', error);
    process.exit(1);
  } finally {
    await localPrisma.$disconnect();
  }
}

syncBranchSettings();

