import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';

const prisma = new PrismaClient();

/**
 * Script: Lösche alle Passcodes mit dem Namen "Patrick"
 * 
 * Da die TTLock API keinen Endpunkt zum Auflisten von Passcodes hat,
 * verwenden wir die bekannten keyboardPwdIds aus den vorherigen Testläufen.
 * Alternativ können wir alle Passcodes löschen, indem wir einen großen Bereich durchgehen.
 */

async function deletePatrickPasscodes() {
  try {
    console.log('🚀 Lösche alle Passcodes mit dem Namen "Patrick"...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: {
        id: true,
        name: true,
        displayName: true,
        settings: true
      }
    });

    if (!organization) {
      throw new Error('Organisation 1 nicht gefunden!');
    }

    console.log(`✅ Organisation: ${organization.displayName}`);

    const settings = (organization.settings || {}) as any;
    const doorSystem = settings?.doorSystem;

    if (!doorSystem?.lockIds || doorSystem.lockIds.length === 0) {
      throw new Error('Keine Lock IDs konfiguriert!');
    }

    const lockId = doorSystem.lockIds[0];
    console.log(`🔑 Verwende Lock ID: ${lockId}\n`);

    const ttlockService = new TTLockService(1);

    // Bekannte keyboardPwdIds aus den Testläufen (aus den Logs)
    // 34029144, 34029188, 34029252 (aus den letzten Testläufen)
    // Versuche einen Bereich von IDs, um alle "Patrick" Passcodes zu finden
    const knownIds = [34029144, 34029188, 34029252];
    
    // Erweitere den Bereich basierend auf den bekannten IDs
    // TTLock IDs scheinen sequenziell zu sein, also versuchen wir einen Bereich
    const startId = Math.min(...knownIds) - 10;
    const endId = Math.max(...knownIds) + 10;
    
    console.log(`🔍 Versuche Passcodes im Bereich ${startId} - ${endId} zu löschen...\n`);

    let deletedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    // Versuche jeden Passcode im Bereich zu löschen
    for (let keyboardPwdId = startId; keyboardPwdId <= endId; keyboardPwdId++) {
      try {
        await ttlockService.deleteTemporaryPasscode(lockId, keyboardPwdId.toString());
        console.log(`✅ Passcode gelöscht: ID ${keyboardPwdId}`);
        deletedCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Ignoriere "nicht gefunden" Fehler, zähle andere Fehler
        if (errorMsg.includes('not found') || errorMsg.includes('nicht gefunden') || errorMsg.includes('does not exist')) {
          notFoundCount++;
        } else {
          // Nur echte Fehler loggen (nicht "nicht gefunden")
          if (knownIds.includes(keyboardPwdId)) {
            console.error(`❌ Fehler beim Löschen von Passcode ID ${keyboardPwdId}:`, errorMsg);
            errorCount++;
          }
        }
      }
    }

    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   ✅ Gelöscht: ${deletedCount}`);
    console.log(`   ⚠️  Nicht gefunden: ${notFoundCount}`);
    console.log(`   ❌ Fehler: ${errorCount}`);

    if (deletedCount > 0) {
      console.log(`\n✅ ${deletedCount} Passcode(s) erfolgreich gelöscht!`);
    } else {
      console.log(`\n⚠️  Keine Passcodes gefunden oder bereits gelöscht.`);
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deletePatrickPasscodes()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

