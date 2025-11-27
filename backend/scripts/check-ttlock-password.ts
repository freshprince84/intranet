/**
 * Prüft TTLock Password in Organization Settings
 * Zeigt ob Password MD5-hashed ist
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { decryptApiSettings } from '../src/utils/encryption';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkTTLockPassword() {
  try {
    console.log('🔍 Prüfe TTLock Password in Organization 1...\n');

    const organization = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!organization?.settings) {
      throw new Error('Organization 1 hat keine Settings!');
    }

    const decrypted = decryptApiSettings(organization.settings as any);
    const doorSystem = decrypted?.doorSystem;

    if (!doorSystem) {
      throw new Error('Organization hat keine doorSystem Settings!');
    }

    console.log('📋 TTLock Settings:');
    console.log(`   - clientId: ${doorSystem.clientId || 'nicht gesetzt'}`);
    console.log(`   - clientSecret: ${doorSystem.clientSecret ? '✅ vorhanden' : 'nicht gesetzt'}`);
    console.log(`   - username: ${doorSystem.username || 'nicht gesetzt'}`);
    console.log(`   - password: ${doorSystem.password ? `${doorSystem.password.substring(0, 10)}... (${doorSystem.password.length} Zeichen)` : 'nicht gesetzt'}`);
    console.log(`   - apiUrl: ${doorSystem.apiUrl || 'nicht gesetzt'}\n`);

    // Prüfe ob Password MD5-hashed ist
    if (doorSystem.password) {
      const passwordLength = doorSystem.password.length;
      const isMD5Hash = /^[a-f0-9]{32}$/i.test(doorSystem.password);
      
      console.log('🔐 Password-Status:');
      console.log(`   - Länge: ${passwordLength} Zeichen`);
      console.log(`   - Ist MD5-Hash: ${isMD5Hash ? '✅ Ja' : '❌ Nein'}`);
      
      if (!isMD5Hash) {
        console.log('\n⚠️  PROBLEM: Password ist NICHT MD5-hashed!');
        console.log('   → Password muss MD5-hashed werden (32-stelliger Hex-String)');
        console.log(`   → Aktueller Wert: ${doorSystem.password}\n`);
      } else {
        console.log('\n✅ Password ist korrekt MD5-hashed!\n');
      }
    } else {
      console.log('❌ Password ist nicht gesetzt!\n');
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

checkTTLockPassword()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });


