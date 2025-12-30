/**
 * Prüft den Status des LobbyPMS-Imports für alle Branches
 * 
 * Verwendet JavaScript (kein TypeScript) und kompilierte dist-Dateien
 * 
 * Verwendung:
 * node scripts/check-lobbypms-import-status.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLobbyPmsImportStatus() {
  try {
    console.log('🔍 LobbyPMS Import-Status Prüfung\n');
    console.log('='.repeat(80));

    // Hole alle Branches mit LobbyPMS-Konfiguration
    const branches = await prisma.branch.findMany({
      where: {
        organizationId: 1,
        id: { in: [3, 4] } // Manila (3) und Parque Poblado (4)
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            settings: true
          }
        }
      }
    });

    if (branches.length === 0) {
      console.log('❌ Keine Branches gefunden');
      return;
    }

    // Lade Encryption-Utils aus dist
    const { decryptBranchApiSettings, decryptApiSettings } = require('../dist/utils/encryption');
    const { LobbyPmsService } = require('../dist/services/lobbyPmsService');
    const { LobbyPmsReservationSyncService } = require('../dist/services/lobbyPmsReservationSyncService');

    for (const branch of branches) {
      console.log(`\n📋 Branch ${branch.id}: ${branch.name}`);
      console.log('-'.repeat(80));

      try {
        // Prüfe ob LobbyPMS konfiguriert ist
        const branchSettings = branch.lobbyPmsSettings;
        const orgSettings = branch.organization?.settings;
        
        console.log('  🔍 Debug: Prüfe Settings...');
        console.log(`     Branch Settings vorhanden: ${!!branchSettings}`);
        console.log(`     Org Settings vorhanden: ${!!orgSettings}`);
        
        const decryptedBranchSettings = branchSettings ? decryptBranchApiSettings(branchSettings) : null;
        const decryptedOrgSettings = orgSettings ? decryptApiSettings(orgSettings) : null;
        
        console.log(`     Decrypted Branch Settings: ${decryptedBranchSettings ? 'vorhanden' : 'null'}`);
        if (decryptedBranchSettings) {
          console.log(`     Branch Settings Keys: ${Object.keys(decryptedBranchSettings).join(', ')}`);
          console.log(`     Branch Settings hat lobbyPms: ${!!decryptedBranchSettings.lobbyPms}`);
          if (decryptedBranchSettings.lobbyPms) {
            console.log(`     Branch lobbyPms Keys: ${Object.keys(decryptedBranchSettings.lobbyPms).join(', ')}`);
          }
        }
        
        console.log(`     Decrypted Org Settings: ${decryptedOrgSettings ? 'vorhanden' : 'null'}`);
        if (decryptedOrgSettings) {
          console.log(`     Org Settings Keys: ${Object.keys(decryptedOrgSettings).join(', ')}`);
          console.log(`     Org Settings hat lobbyPms: ${!!decryptedOrgSettings.lobbyPms}`);
          if (decryptedOrgSettings.lobbyPms) {
            console.log(`     Org lobbyPms Keys: ${Object.keys(decryptedOrgSettings.lobbyPms).join(', ')}`);
            console.log(`     Org lobbyPms apiKey: ${decryptedOrgSettings.lobbyPms.apiKey ? 'vorhanden' : 'fehlt'}`);
          }
        }
        
        // Branch Settings können direkt LobbyPMS Settings sein oder verschachtelt unter lobbyPms
        // Org Settings sind immer verschachtelt unter lobbyPms
        const lobbyPmsSettings = (decryptedBranchSettings?.lobbyPms || decryptedBranchSettings) || decryptedOrgSettings?.lobbyPms;

        console.log(`     Final lobbyPmsSettings: ${lobbyPmsSettings ? 'vorhanden' : 'null'}`);
        if (lobbyPmsSettings) {
          console.log(`     Final Settings Keys: ${Object.keys(lobbyPmsSettings).join(', ')}`);
          console.log(`     Final apiKey: ${lobbyPmsSettings.apiKey ? 'vorhanden' : 'fehlt'}`);
        }

        if (!lobbyPmsSettings?.apiKey) {
          console.log('  ⚠️  Kein LobbyPMS API Key konfiguriert');
          continue;
        }

        if (lobbyPmsSettings.syncEnabled === false) {
          console.log('  ⚠️  LobbyPMS Sync ist deaktiviert');
          continue;
        }

        console.log('  ✅ LobbyPMS konfiguriert');
        console.log(`     API URL in Settings: ${lobbyPmsSettings.apiUrl || 'Nicht gesetzt (verwendet Fallback: https://api.lobbypms.com)'}`);
        console.log(`     Property ID: ${lobbyPmsSettings.propertyId || 'Nicht gesetzt'}`);
        console.log(`     Sync Enabled: ${lobbyPmsSettings.syncEnabled !== false ? 'Ja' : 'Nein'}`);
        
        // Zeige tatsächlich verwendete URL nach Service-Erstellung
        const serviceApiUrl = (service as any).apiUrl;
        console.log(`     Tatsächlich verwendete API URL: ${serviceApiUrl || 'Nicht geladen'}`);

        // Erstelle Service
        const service = await LobbyPmsService.createForBranch(branch.id);
        
        // Prüfe Verbindung
        console.log('\n  🔌 Prüfe API-Verbindung...');
        try {
          const isValid = await service.validateConnection();
          if (isValid) {
            console.log('  ✅ API-Verbindung erfolgreich');
          } else {
            console.log('  ❌ API-Verbindung fehlgeschlagen');
            continue;
          }
        } catch (error) {
          console.log(`  ❌ API-Verbindungsfehler: ${error.message}`);
          continue;
        }

        // Hole Reservierungen aus DB
        const dbReservations = await prisma.reservation.findMany({
          where: {
            branchId: branch.id
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        });

        console.log(`\n  📊 Reservierungen in DB: ${dbReservations.length} (letzte 10)`);
        if (dbReservations.length > 0) {
          const latest = dbReservations[0];
          const checkInDate = latest.checkInDate ? latest.checkInDate.toISOString().split('T')[0] : 'N/A';
          console.log(`     Neueste: ID ${latest.id}, LobbyID ${latest.lobbyReservationId}, Check-in: ${checkInDate}`);
        }

        // Hole Reservierungen von LobbyPMS API (letzte 7 Tage - reduziert für Performance)
        console.log('\n  📥 Hole Reservierungen von LobbyPMS API (letzte 7 Tage)...');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        console.log('  ⏱️  Starte API-Abruf (kann einige Sekunden dauern, max. 30 Sekunden)...');
        
        // Timeout für API-Abruf (30 Sekunden)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API-Abruf Timeout nach 30 Sekunden')), 30000);
        });
        
        let apiReservations = [];
        try {
          apiReservations = await Promise.race([
            service.fetchReservations(sevenDaysAgo, new Date()),
            timeoutPromise
          ]);
        } catch (error) {
          if (error.message.includes('Timeout')) {
            console.log('  ⚠️  API-Abruf dauerte zu lange (Timeout nach 30 Sekunden)');
            console.log('  💡 Tipp: Prüfe die Pagination-Logik im LobbyPmsService');
            continue;
          }
          throw error;
        }
        
        console.log(`  📊 Reservierungen von API: ${apiReservations.length} (letzte 7 Tage)`);
        
        if (apiReservations.length > 0) {
          const latestApi = apiReservations[0];
          const bookingId = latestApi.booking_id || latestApi.id || 'N/A';
          const checkIn = latestApi.check_in_date || latestApi.checkin_date || 'N/A';
          console.log(`     Neueste: Booking ID ${bookingId}, Check-in: ${checkIn}`);
        }

        // Prüfe Sync-History auf Fehler
        const recentErrors = await prisma.reservationSyncHistory.findMany({
          where: {
            reservation: {
              branchId: branch.id
            },
            syncType: 'error',
            syncedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          },
          orderBy: {
            syncedAt: 'desc'
          },
          take: 5
        });

        if (recentErrors.length > 0) {
          console.log(`\n  ⚠️  ${recentErrors.length} Fehler in Sync-History (letzte 7 Tage):`);
          for (const error of recentErrors) {
            console.log(`     - ${error.errorMessage || 'Unbekannter Fehler'} (${error.syncedAt.toISOString()})`);
          }
        } else {
          console.log('\n  ✅ Keine Fehler in Sync-History (letzte 7 Tage)');
        }

        // Teste manuellen Sync
        console.log('\n  🔄 Teste manuellen Sync (letzte 24 Stunden)...');
        try {
          const syncedCount = await LobbyPmsReservationSyncService.syncReservationsForBranch(branch.id);
          console.log(`  ✅ Sync erfolgreich: ${syncedCount} Reservierung(en) synchronisiert`);
        } catch (error) {
          console.log(`  ❌ Sync fehlgeschlagen: ${error.message}`);
        }

        // Vergleich: Welche Reservierungen fehlen?
        if (apiReservations.length > 0 && dbReservations.length > 0) {
          console.log('\n  🔍 Vergleich: Fehlende Reservierungen...');
          const dbLobbyIds = new Set(dbReservations.map(r => r.lobbyReservationId));
          const missing = apiReservations.filter(api => {
            const apiId = String(api.booking_id || api.id);
            return !dbLobbyIds.has(apiId);
          });

          if (missing.length > 0) {
            console.log(`  ⚠️  ${missing.length} Reservierung(en) fehlen in DB:`);
            for (const m of missing.slice(0, 5)) {
              const bookingId = m.booking_id || m.id || 'N/A';
              const checkIn = m.check_in_date || m.checkin_date || 'N/A';
              console.log(`     - Booking ID: ${bookingId}, Check-in: ${checkIn}`);
            }
            if (missing.length > 5) {
              console.log(`     ... und ${missing.length - 5} weitere`);
            }
          } else {
            console.log('  ✅ Alle API-Reservierungen sind in DB vorhanden');
          }
        }

      } catch (error) {
        console.error(`  ❌ Fehler bei Branch ${branch.id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Prüfung abgeschlossen');

  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLobbyPmsImportStatus();

