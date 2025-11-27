/**
 * Prüft TTLock Settings für Branch 3 (Manila)
 * Zeigt aktuelle Settings und ob sie verschlüsselt sind
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptBranchApiSettings, decryptSecret } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkTTLockSettings() {
  try {
    console.log('🔍 Prüfe TTLock Settings für Branch 3 (Manila)...\n');

    // 1. Lade Branch 3
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        doorSystemSettings: true,
        organizationId: true
      }
    });

    if (!branch) {
      throw new Error('Branch 3 (Manila) nicht gefunden!');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);
    console.log(`   Organization ID: ${branch.organizationId || 'nicht gesetzt'}\n`);

    // 2. Prüfe doorSystemSettings
    if (!branch.doorSystemSettings) {
      console.log('❌ Keine doorSystemSettings für Branch 3 gefunden!');
      console.log('   → TTLock ist nicht konfiguriert für diesen Branch\n');
      
      // Prüfe Organization Settings als Fallback
      if (branch.organizationId) {
        console.log('🔍 Prüfe Organization Settings als Fallback...');
        const organization = await prisma.organization.findUnique({
          where: { id: branch.organizationId },
          select: { settings: true }
        });

        if (organization?.settings) {
          const orgSettings = organization.settings as any;
          const doorSystem = orgSettings?.doorSystem;
          
          if (doorSystem) {
            console.log('✅ Organization hat doorSystem Settings:');
            console.log(`   - clientId: ${doorSystem.clientId ? '✅ vorhanden' : '❌ fehlt'}`);
            console.log(`   - clientSecret: ${doorSystem.clientSecret ? '✅ vorhanden' : '❌ fehlt'}`);
            console.log(`   - username: ${doorSystem.username ? '✅ vorhanden' : '❌ fehlt'}`);
            console.log(`   - password: ${doorSystem.password ? '✅ vorhanden' : '❌ fehlt'}`);
            console.log(`   - apiUrl: ${doorSystem.apiUrl || 'nicht gesetzt'}`);
            console.log(`   - lockIds: ${doorSystem.lockIds ? JSON.stringify(doorSystem.lockIds) : 'nicht gesetzt'}\n`);
          } else {
            console.log('❌ Organization hat keine doorSystem Settings\n');
          }
        } else {
          console.log('❌ Organization hat keine Settings\n');
        }
      }
      
      return;
    }

    console.log('✅ doorSystemSettings gefunden\n');

    // 3. Zeige rohe Settings (verschlüsselt)
    console.log('📋 Rohe Settings (verschlüsselt):');
    const rawSettings = branch.doorSystemSettings as any;
    console.log(`   - Struktur: ${rawSettings.doorSystem ? 'verschachtelt (doorSystem)' : 'direkt'}`);
    
    if (rawSettings.doorSystem) {
      const doorSystem = rawSettings.doorSystem;
      console.log(`   - clientId: ${doorSystem.clientId ? `${doorSystem.clientId.substring(0, 20)}... (${doorSystem.clientId.length} Zeichen)` : 'nicht gesetzt'}`);
      console.log(`   - clientSecret: ${doorSystem.clientSecret ? `${doorSystem.clientSecret.substring(0, 20)}... (${doorSystem.clientSecret.length} Zeichen)` : 'nicht gesetzt'}`);
      console.log(`   - username: ${doorSystem.username || 'nicht gesetzt'}`);
      console.log(`   - password: ${doorSystem.password ? '*** (MD5-hashed)' : 'nicht gesetzt'}`);
      console.log(`   - apiUrl: ${doorSystem.apiUrl || 'nicht gesetzt'}`);
      console.log(`   - lockIds: ${doorSystem.lockIds ? JSON.stringify(doorSystem.lockIds) : 'nicht gesetzt'}\n`);
    } else {
      console.log(`   - clientId: ${rawSettings.clientId ? `${rawSettings.clientId.substring(0, 20)}... (${rawSettings.clientId.length} Zeichen)` : 'nicht gesetzt'}`);
      console.log(`   - clientSecret: ${rawSettings.clientSecret ? `${rawSettings.clientSecret.substring(0, 20)}... (${rawSettings.clientSecret.length} Zeichen)` : 'nicht gesetzt'}`);
      console.log(`   - username: ${rawSettings.username || 'nicht gesetzt'}`);
      console.log(`   - password: ${rawSettings.password ? '*** (MD5-hashed)' : 'nicht gesetzt'}`);
      console.log(`   - apiUrl: ${rawSettings.apiUrl || 'nicht gesetzt'}`);
      console.log(`   - lockIds: ${rawSettings.lockIds ? JSON.stringify(rawSettings.lockIds) : 'nicht gesetzt'}\n`);
    }

    // 4. Versuche zu entschlüsseln
    console.log('🔓 Versuche Settings zu entschlüsseln...\n');
    
    try {
      const decrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
      const doorSystemSettings = decrypted?.doorSystem || decrypted;

      if (!doorSystemSettings) {
        console.log('❌ Keine doorSystem Settings nach Entschlüsselung gefunden!\n');
        return;
      }

      console.log('✅ Entschlüsselung erfolgreich!\n');
      console.log('📋 Entschlüsselte Settings:');
      console.log(`   - clientId: ${doorSystemSettings.clientId || 'nicht gesetzt'}`);
      console.log(`   - clientSecret: ${doorSystemSettings.clientSecret ? '✅ entschlüsselt' : 'nicht gesetzt'}`);
      console.log(`   - username: ${doorSystemSettings.username || 'nicht gesetzt'}`);
      console.log(`   - password: ${doorSystemSettings.password ? '*** (MD5-hashed)' : 'nicht gesetzt'}`);
      console.log(`   - apiUrl: ${doorSystemSettings.apiUrl || 'nicht gesetzt'}`);
      console.log(`   - lockIds: ${doorSystemSettings.lockIds ? JSON.stringify(doorSystemSettings.lockIds) : 'nicht gesetzt'}\n`);

      // 5. Prüfe ob clientSecret verschlüsselt ist
      const rawDoorSystem = rawSettings.doorSystem || rawSettings;
      if (rawDoorSystem.clientSecret) {
        const isEncrypted = rawDoorSystem.clientSecret.includes(':');
        console.log(`🔐 clientSecret Status:`);
        console.log(`   - Verschlüsselt: ${isEncrypted ? '✅ Ja' : '❌ Nein'}`);
        console.log(`   - Länge: ${rawDoorSystem.clientSecret.length} Zeichen`);
        
        if (isEncrypted && doorSystemSettings.clientSecret) {
          console.log(`   - Entschlüsselung: ✅ Erfolgreich`);
          console.log(`   - Entschlüsselte Länge: ${doorSystemSettings.clientSecret.length} Zeichen\n`);
        } else if (isEncrypted && !doorSystemSettings.clientSecret) {
          console.log(`   - Entschlüsselung: ❌ FEHLGESCHLAGEN\n`);
          console.log('⚠️  PROBLEM: clientSecret ist verschlüsselt, aber Entschlüsselung schlägt fehl!');
          console.log('   → clientSecret muss mit aktuellem ENCRYPTION_KEY neu verschlüsselt werden\n');
        }
      }

      // 6. Prüfe ob Branch Settings leer sind - dann prüfe Organization Settings
      if (!doorSystemSettings.clientId || !doorSystemSettings.clientSecret || !doorSystemSettings.username || !doorSystemSettings.password) {
        console.log('⚠️  Branch Settings sind unvollständig! Prüfe Organization Settings als Fallback...\n');
        
        if (branch.organizationId) {
          const organization = await prisma.organization.findUnique({
            where: { id: branch.organizationId },
            select: { settings: true }
          });

          if (organization?.settings) {
            const { decryptApiSettings } = await import('../src/utils/encryption');
            const orgSettings = decryptApiSettings(organization.settings as any);
            const orgDoorSystem = orgSettings?.doorSystem;
            
            if (orgDoorSystem) {
              console.log('✅ Organization hat doorSystem Settings:');
              console.log(`   - clientId: ${orgDoorSystem.clientId ? '✅ vorhanden' : '❌ fehlt'}`);
              console.log(`   - clientSecret: ${orgDoorSystem.clientSecret ? '✅ vorhanden' : '❌ fehlt'}`);
              console.log(`   - username: ${orgDoorSystem.username ? '✅ vorhanden' : '❌ fehlt'}`);
              console.log(`   - password: ${orgDoorSystem.password ? '✅ vorhanden' : '❌ fehlt'}`);
              console.log(`   - apiUrl: ${orgDoorSystem.apiUrl || 'nicht gesetzt'}`);
              console.log(`   - lockIds: ${orgDoorSystem.lockIds ? JSON.stringify(orgDoorSystem.lockIds) : 'nicht gesetzt'}\n`);
              
              if (orgDoorSystem.clientId && orgDoorSystem.clientSecret && orgDoorSystem.username && orgDoorSystem.password) {
                console.log('✅ Organization Settings sind vollständig - TTLock sollte über Organization Settings funktionieren!\n');
              } else {
                console.log('❌ Organization Settings sind auch unvollständig - TTLock Credentials müssen konfiguriert werden!\n');
              }
            } else {
              console.log('❌ Organization hat keine doorSystem Settings\n');
            }
          } else {
            console.log('❌ Organization hat keine Settings\n');
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

checkTTLockSettings()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

