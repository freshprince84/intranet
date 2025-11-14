import { PrismaClient } from '@prisma/client';
import { TTLockService } from '../src/services/ttlockService';

const prisma = new PrismaClient();

/**
 * Script: Generiere einen Test-Passcode für TTLock
 * Name: Patrick
 */

async function generateTestPasscode(lockIdArg?: string) {
  try {
    console.log('🚀 Generiere Test-Passcode für TTLock...\n');

    // Lade Organisation 1
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

    if (!doorSystem?.clientId || !doorSystem?.clientSecret) {
      throw new Error('TTLock ist nicht konfiguriert! Bitte zuerst Client ID und Secret einfügen.');
    }

    console.log(`✅ TTLock konfiguriert`);
    console.log(`   API URL: ${doorSystem.apiUrl || 'https://euopen.ttlock.com'}`);

    // Prüfe Lock IDs
    let lockIds = doorSystem.lockIds || [];
    let lockId: string;
    
    if (lockIds.length === 0) {
      console.log('\n⚠️  KEINE LOCK IDs IN DB GEFUNDEN!');
      console.log('   Versuche Lock IDs über TTLock API abzurufen...');
      
      try {
        const ttlockService = new TTLockService(1);
        lockIds = await ttlockService.getLocks();
        
        if (lockIds.length > 0) {
          console.log(`   ✅ ${lockIds.length} Lock(s) über API gefunden!`);
          // Speichere Lock IDs in DB
          const updatedSettings = {
            ...settings,
            doorSystem: {
              ...doorSystem,
              lockIds: lockIds
            }
          };
          await prisma.organization.update({
            where: { id: 1 },
            data: { settings: updatedSettings }
          });
          console.log('   💾 Lock IDs in DB gespeichert');
        } else {
          throw new Error('Keine Locks über API gefunden');
        }
      } catch (apiError) {
        console.error('   ❌ Fehler beim Abruf der Lock IDs:', apiError instanceof Error ? apiError.message : apiError);
        
        // Falls Lock ID als Argument übergeben wurde, verwende diese
        if (lockIdArg) {
          console.log(`\n   ✅ Verwende übergebene Lock ID: ${lockIdArg}`);
          lockId = lockIdArg;
        } else {
          throw new Error('Keine Lock IDs verfügbar. Bitte Lock ID als Argument übergeben: npx ts-node scripts/generate-test-passcode.ts <lock-id>');
        }
      }
    } else {
      lockId = lockIds[0];
    }
    
    // Falls Lock ID als Argument übergeben wurde, überschreibe
    if (lockIdArg) {
      lockId = lockIdArg;
      console.log(`\n   ℹ️  Verwende übergebene Lock ID (überschreibt DB): ${lockId}`);
    }
    console.log(`\n🔑 Verwende Lock ID: ${lockId}`);

    // Erstelle TTLock Service
    const ttlockService = new TTLockService(1);

    // Test-Daten: Passcode für heute bis in 7 Tagen
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);

    console.log(`\n📅 Zeitraum:`);
    console.log(`   Start: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Ende:  ${endDate.toLocaleString('de-DE')}`);
    console.log(`   Name:  Patrick`);

    console.log(`\n🔐 Erstelle Passcode...`);
    
    const passcode = await ttlockService.createTemporaryPasscode(
      lockId,
      startDate,
      endDate,
      'Patrick'
    );

    console.log(`\n✅ PASSCODE ERFOLGREICH GENERIERT!`);
    console.log(`\n📋 Details:`);
    console.log(`   Lock ID: ${lockId}`);
    console.log(`   Name: Patrick`);
    console.log(`   Passcode: ${passcode}`);
    console.log(`   Gültig von: ${startDate.toLocaleString('de-DE')}`);
    console.log(`   Gültig bis: ${endDate.toLocaleString('de-DE')}`);
    console.log(`\n🧪 Du kannst diesen Code jetzt in der TTLock-App testen!`);

  } catch (error) {
    console.error('\n❌ Fehler beim Generieren des Passcodes:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      
      if (error.message.includes('Lock IDs')) {
        console.log('\n💡 Lösung:');
        console.log('   1. Öffne die TTLock-App oder das TTLock-Dashboard');
        console.log('   2. Finde deine Lock ID(s)');
        console.log('   3. Setze sie in der DB: organization.settings.doorSystem.lockIds = ["deine-lock-id"]');
        console.log('   4. Oder verwende das Frontend: Organisation → API Tab → TTLock');
      }
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Lock ID als Kommandozeilenargument
const lockIdArg = process.argv[2];

generateTestPasscode(lockIdArg)
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

