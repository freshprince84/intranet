/**
 * Debug: Prüft welche Settings TTLockService lädt
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptBranchApiSettings, decryptApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function debugTTLockSettingsLoading() {
  try {
    console.log('🔍 Debug: Prüfe welche Settings TTLockService für Branch 3 lädt...\n');

    // 1. Lade Branch 3
    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        id: true,
        name: true,
        organizationId: true,
        doorSystemSettings: true
      }
    });

    if (!branch) {
      throw new Error('Branch 3 nicht gefunden!');
    }

    console.log(`✅ Branch gefunden: ${branch.name} (ID: ${branch.id})`);
    console.log(`   Organization ID: ${branch.organizationId}\n`);

    // 2. Prüfe Branch Settings
    console.log('📋 Branch doorSystemSettings:');
    if (branch.doorSystemSettings) {
      const rawSettings = branch.doorSystemSettings as any;
      console.log(`   - Existiert: ✅ Ja`);
      console.log(`   - Typ: ${typeof rawSettings}`);
      console.log(`   - Ist Objekt: ${typeof rawSettings === 'object' ? '✅ Ja' : '❌ Nein'}`);
      console.log(`   - Keys: ${Object.keys(rawSettings).join(', ') || 'keine'}`);
      
      if (rawSettings.doorSystem) {
        const doorSystem = rawSettings.doorSystem;
        console.log(`   - doorSystem existiert: ✅ Ja`);
        console.log(`   - doorSystem Keys: ${Object.keys(doorSystem).join(', ') || 'keine'}`);
        console.log(`   - clientId: ${doorSystem.clientId ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - clientSecret: ${doorSystem.clientSecret ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - username: ${doorSystem.username ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - password: ${doorSystem.password ? `✅ vorhanden (${doorSystem.password.length} Zeichen)` : '❌ fehlt'}`);
      } else {
        console.log(`   - doorSystem existiert: ❌ Nein`);
        console.log(`   - Direkte Keys: ${Object.keys(rawSettings).join(', ') || 'keine'}`);
        console.log(`   - clientId: ${rawSettings.clientId ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - clientSecret: ${rawSettings.clientSecret ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - username: ${rawSettings.username ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - password: ${rawSettings.password ? `✅ vorhanden (${rawSettings.password.length} Zeichen)` : '❌ fehlt'}`);
      }

      // Versuche zu entschlüsseln
      try {
        const decrypted = decryptBranchApiSettings(branch.doorSystemSettings as any);
        const doorSystemSettings = decrypted?.doorSystem || decrypted;
        
        console.log('\n🔓 Entschlüsselte Branch Settings:');
        console.log(`   - clientId: ${doorSystemSettings?.clientId ? `✅ ${doorSystemSettings.clientId.substring(0, 10)}...` : '❌ fehlt'}`);
        console.log(`   - clientSecret: ${doorSystemSettings?.clientSecret ? '✅ vorhanden' : '❌ fehlt'}`);
        console.log(`   - username: ${doorSystemSettings?.username ? `✅ ${doorSystemSettings.username}` : '❌ fehlt'}`);
        console.log(`   - password: ${doorSystemSettings?.password ? `✅ ${doorSystemSettings.password.substring(0, 10)}... (${doorSystemSettings.password.length} Zeichen)` : '❌ fehlt'}`);
        
        // Prüfe ob alle Werte vorhanden sind (wie in TTLockService)
        const hasAllValues = doorSystemSettings?.clientId && 
                             doorSystemSettings?.clientSecret && 
                             doorSystemSettings?.username && 
                             doorSystemSettings?.password;
        
        console.log(`\n✅ Alle Werte vorhanden: ${hasAllValues ? '✅ Ja' : '❌ Nein'}`);
        
        if (hasAllValues) {
          console.log('⚠️  PROBLEM: Branch Settings würden verwendet werden, obwohl sie leer sein sollten!');
        } else {
          console.log('✅ Branch Settings sind unvollständig - Fallback auf Organization Settings korrekt');
        }
      } catch (error) {
        console.error('❌ Fehler beim Entschlüsseln:', error);
      }
    } else {
      console.log(`   - Existiert: ❌ Nein`);
      console.log('✅ Branch hat keine Settings - Fallback auf Organization Settings korrekt');
    }

    // 3. Prüfe Organization Settings
    console.log('\n📋 Organization Settings:');
    if (branch.organizationId) {
      const organization = await prisma.organization.findUnique({
        where: { id: branch.organizationId },
        select: { settings: true }
      });

      if (organization?.settings) {
        const decrypted = decryptApiSettings(organization.settings as any);
        const doorSystem = decrypted?.doorSystem;
        
        if (doorSystem) {
          console.log(`   - doorSystem existiert: ✅ Ja`);
          console.log(`   - clientId: ${doorSystem.clientId ? `✅ ${doorSystem.clientId.substring(0, 10)}...` : '❌ fehlt'}`);
          console.log(`   - clientSecret: ${doorSystem.clientSecret ? '✅ vorhanden' : '❌ fehlt'}`);
          console.log(`   - username: ${doorSystem.username ? `✅ ${doorSystem.username}` : '❌ fehlt'}`);
          console.log(`   - password: ${doorSystem.password ? `✅ ${doorSystem.password.substring(0, 10)}... (${doorSystem.password.length} Zeichen)` : '❌ fehlt'}`);
          
          const isMD5Hash = doorSystem.password && /^[a-f0-9]{32}$/i.test(doorSystem.password);
          console.log(`   - password ist MD5-Hash: ${isMD5Hash ? '✅ Ja' : '❌ Nein'}`);
        } else {
          console.log(`   - doorSystem existiert: ❌ Nein`);
        }
      } else {
        console.log(`   - Organization hat keine Settings`);
      }
    }

  } catch (error) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

debugTTLockSettingsLoading()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });


