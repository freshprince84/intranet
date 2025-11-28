/**
 * Script: Fügt fehlende Felder zu den Settings hinzu
 * 
 * WICHTIG: Dieses Script muss mit den korrekten Werten aufgerufen werden!
 */

import { PrismaClient } from '@prisma/client';
import { encryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function fixMissingSettingsFields() {
  try {
    console.log('🔧 Füge fehlende Felder zu den Settings hinzu...\n');

    // ==========================================
    // MANILA (Branch 3)
    // ==========================================
    console.log('='.repeat(80));
    console.log('BRANCH MANILA (ID 3)');
    console.log('='.repeat(80));

    const manilaBranch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: {
        whatsappSettings: true,
        doorSystemSettings: true
      }
    });

    if (!manilaBranch) {
      throw new Error('Branch Manila nicht gefunden!');
    }

    // Lade aktuelle Settings
    const { decryptBranchApiSettings } = await import('../src/utils/encryption');
    const currentWhatsapp = manilaBranch.whatsappSettings 
      ? decryptBranchApiSettings(manilaBranch.whatsappSettings as any)
      : null;
    const currentTTLock = manilaBranch.doorSystemSettings
      ? decryptBranchApiSettings(manilaBranch.doorSystemSettings as any)
      : null;

    // WhatsApp: Füge phoneNumberId hinzu (WENN NICHT VORHANDEN)
    if (currentWhatsapp?.whatsapp && !currentWhatsapp.whatsapp.phoneNumberId) {
      console.log('\n📱 WhatsApp: phoneNumberId fehlt!');
      console.log('   Bitte gib die phoneNumberId für Manila ein:');
      // TODO: Hier muss der Wert eingegeben werden
      const phoneNumberId = process.env.MANILA_WHATSAPP_PHONE_NUMBER_ID || '';
      
      if (!phoneNumberId) {
        console.log('   ⚠️  phoneNumberId nicht gesetzt - überspringe WhatsApp Update');
      } else {
        const updatedWhatsapp = {
          whatsapp: {
            ...currentWhatsapp.whatsapp,
            phoneNumberId: phoneNumberId
          }
        };
        const encrypted = encryptBranchApiSettings(updatedWhatsapp);
        await prisma.branch.update({
          where: { id: 3 },
          data: { whatsappSettings: encrypted as any }
        });
        console.log('   ✅ phoneNumberId hinzugefügt');
      }
    } else {
      console.log('\n📱 WhatsApp: phoneNumberId bereits vorhanden');
    }

    // TTLock: Füge lockIds, username, password hinzu (WENN NICHT VORHANDEN)
    if (currentTTLock?.doorSystem) {
      const needsUpdate = !currentTTLock.doorSystem.lockIds || 
                          !currentTTLock.doorSystem.username || 
                          !currentTTLock.doorSystem.password;
      
      if (needsUpdate) {
        console.log('\n🔐 TTLock: Fehlende Felder gefunden!');
        console.log('   lockIds:', currentTTLock.doorSystem.lockIds ? '✅' : '❌');
        console.log('   username:', currentTTLock.doorSystem.username ? '✅' : '❌');
        console.log('   password:', currentTTLock.doorSystem.password ? '✅' : '❌');
        console.log('\n   Bitte gib die fehlenden Werte ein:');
        // TODO: Hier müssen die Werte eingegeben werden
        const lockIds = process.env.MANILA_TTLOCK_LOCK_IDS ? 
          process.env.MANILA_TTLOCK_LOCK_IDS.split(',').map(id => id.trim()) : 
          currentTTLock.doorSystem.lockIds || [];
        const username = process.env.MANILA_TTLOCK_USERNAME || currentTTLock.doorSystem.username || '';
        const password = process.env.MANILA_TTLOCK_PASSWORD || currentTTLock.doorSystem.password || '';
        
        if (!lockIds.length || !username || !password) {
          console.log('   ⚠️  Fehlende Werte - überspringe TTLock Update');
          console.log('   lockIds:', lockIds);
          console.log('   username:', username ? 'gesetzt' : 'FEHLT');
          console.log('   password:', password ? 'gesetzt' : 'FEHLT');
        } else {
          const updatedTTLock = {
            doorSystem: {
              ...currentTTLock.doorSystem,
              lockIds: lockIds,
              username: username,
              password: password
            }
          };
          const encrypted = encryptBranchApiSettings(updatedTTLock);
          await prisma.branch.update({
            where: { id: 3 },
            data: { doorSystemSettings: encrypted as any }
          });
          console.log('   ✅ Fehlende Felder hinzugefügt');
        }
      } else {
        console.log('\n🔐 TTLock: Alle Felder vorhanden');
      }
    } else {
      console.log('\n🔐 TTLock: Settings nicht gefunden');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ FERTIG');
    console.log('='.repeat(80));
    console.log('\n⚠️  WICHTIG: Dieses Script benötigt die fehlenden Werte als Environment-Variablen:');
    console.log('   - MANILA_WHATSAPP_PHONE_NUMBER_ID');
    console.log('   - MANILA_TTLOCK_LOCK_IDS (komma-separiert)');
    console.log('   - MANILA_TTLOCK_USERNAME');
    console.log('   - MANILA_TTLOCK_PASSWORD');
    console.log('');

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

fixMissingSettingsFields()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });











