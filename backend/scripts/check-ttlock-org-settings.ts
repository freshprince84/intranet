/**
 * Prüft TTLock Settings in Organization Settings
 * Zeigt ob Credentials verschlüsselt sind und ob Entschlüsselung funktioniert
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings, decryptSecret } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkTTLockOrgSettings() {
  try {
    console.log('🔍 Prüfe TTLock Settings in Organization 1...\n');

    // 1. Lade Organization 1
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
      throw new Error('Organization 1 nicht gefunden!');
    }

    console.log(`✅ Organization gefunden: ${organization.displayName || organization.name} (ID: ${organization.id})\n`);

    if (!organization.settings) {
      console.log('❌ Organization hat keine Settings\n');
      return;
    }

    // 2. Zeige rohe Settings (verschlüsselt)
    const rawSettings = organization.settings as any;
    const rawDoorSystem = rawSettings?.doorSystem;

    if (!rawDoorSystem) {
      console.log('❌ Organization hat keine doorSystem Settings\n');
      return;
    }

    console.log('📋 Rohe doorSystem Settings (verschlüsselt):');
    console.log(`   - clientId: ${rawDoorSystem.clientId ? `${rawDoorSystem.clientId.substring(0, 20)}... (${rawDoorSystem.clientId.length} Zeichen)` : 'nicht gesetzt'}`);
    console.log(`   - clientSecret: ${rawDoorSystem.clientSecret ? `${rawDoorSystem.clientSecret.substring(0, 20)}... (${rawDoorSystem.clientSecret.length} Zeichen)` : 'nicht gesetzt'}`);
    console.log(`   - username: ${rawDoorSystem.username || 'nicht gesetzt'}`);
    console.log(`   - password: ${rawDoorSystem.password ? '*** (MD5-hashed)' : 'nicht gesetzt'}`);
    console.log(`   - apiUrl: ${rawDoorSystem.apiUrl || 'nicht gesetzt'}`);
    console.log(`   - lockIds: ${rawDoorSystem.lockIds ? JSON.stringify(rawDoorSystem.lockIds) : 'nicht gesetzt'}\n`);

    // 3. Prüfe ob Credentials verschlüsselt sind
    console.log('🔐 Prüfe Verschlüsselungs-Status:');
    const clientIdEncrypted = rawDoorSystem.clientId && rawDoorSystem.clientId.includes(':');
    const clientSecretEncrypted = rawDoorSystem.clientSecret && rawDoorSystem.clientSecret.includes(':');
    console.log(`   - clientId verschlüsselt: ${clientIdEncrypted ? '✅ Ja' : '❌ Nein'}`);
    console.log(`   - clientSecret verschlüsselt: ${clientSecretEncrypted ? '✅ Ja' : '❌ Nein'}\n`);

    // 4. Versuche zu entschlüsseln
    console.log('🔓 Versuche Settings zu entschlüsseln...\n');
    
    try {
      const decrypted = decryptApiSettings(organization.settings as any);
      const doorSystem = decrypted?.doorSystem;

      if (!doorSystem) {
        console.log('❌ Keine doorSystem Settings nach Entschlüsselung gefunden!\n');
        return;
      }

      console.log('✅ Entschlüsselung erfolgreich!\n');
      console.log('📋 Entschlüsselte Settings:');
      console.log(`   - clientId: ${doorSystem.clientId || 'nicht gesetzt'}`);
      console.log(`   - clientSecret: ${doorSystem.clientSecret ? '✅ entschlüsselt' : 'nicht gesetzt'}`);
      console.log(`   - username: ${doorSystem.username || 'nicht gesetzt'}`);
      console.log(`   - password: ${doorSystem.password ? '*** (MD5-hashed)' : 'nicht gesetzt'}`);
      console.log(`   - apiUrl: ${doorSystem.apiUrl || 'nicht gesetzt'}`);
      console.log(`   - lockIds: ${doorSystem.lockIds ? JSON.stringify(doorSystem.lockIds) : 'nicht gesetzt'}\n`);

      // 5. Prüfe ob clientSecret erfolgreich entschlüsselt wurde
      if (clientSecretEncrypted) {
        if (doorSystem.clientSecret) {
          console.log('✅ clientSecret erfolgreich entschlüsselt!');
          console.log(`   - Verschlüsselte Länge: ${rawDoorSystem.clientSecret.length} Zeichen`);
          console.log(`   - Entschlüsselte Länge: ${doorSystem.clientSecret.length} Zeichen\n`);
        } else {
          console.log('❌ clientSecret Entschlüsselung FEHLGESCHLAGEN!\n');
          console.log('⚠️  PROBLEM: clientSecret ist verschlüsselt, aber Entschlüsselung schlägt fehl!');
          console.log('   → clientSecret muss mit aktuellem ENCRYPTION_KEY neu verschlüsselt werden\n');
          
          // Versuche manuelle Entschlüsselung
          console.log('🔧 Versuche manuelle Entschlüsselung...');
          try {
            const manualDecrypt = decryptSecret(rawDoorSystem.clientSecret);
            console.log('✅ Manuelle Entschlüsselung erfolgreich!');
            console.log(`   - Entschlüsselte Länge: ${manualDecrypt.length} Zeichen\n`);
          } catch (error) {
            console.error('❌ Manuelle Entschlüsselung fehlgeschlagen:', error);
            if (error instanceof Error) {
              console.error(`   Fehlermeldung: ${error.message}\n`);
            }
            console.log('⚠️  clientSecret wurde mit altem ENCRYPTION_KEY verschlüsselt!');
            console.log('   → Muss mit aktuellem ENCRYPTION_KEY neu verschlüsselt werden\n');
          }
        }
      }

    } catch (error) {
      console.error('❌ Fehler beim Entschlüsseln:', error);
      if (error instanceof Error) {
        console.error(`   Fehlermeldung: ${error.message}\n`);
      }
      
      console.log('⚠️  PROBLEM: Entschlüsselung schlägt fehl!');
      console.log('   → Settings müssen mit aktuellem ENCRYPTION_KEY neu verschlüsselt werden\n');
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkTTLockOrgSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });




