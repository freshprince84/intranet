import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';
import { TTLockService } from '../src/services/ttlockService';
import axios from 'axios';

const prisma = new PrismaClient();

/**
 * Script: Prüfe die Passcode-Version des Schlosses
 * Nur Schlösser mit Passcode-Version 4 unterstützen das Hinzufügen benutzerdefinierter Passcodes über Bluetooth oder Gateway
 */
async function checkLockPasscodeVersion() {
  try {
    console.log('🔍 Prüfe Passcode-Version des Schlosses...\n');

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

    console.log(`✅ Organisation: ${organization.displayName}\n`);

    if (!organization?.settings) {
      throw new Error('Organisation 1 nicht gefunden oder keine Settings!');
    }

    const settings = decryptApiSettings(organization.settings as any);
    const doorSystemSettings = settings?.doorSystem;

    console.log('📋 Door System Settings:');
    console.log(`   Client ID vorhanden: ${!!doorSystemSettings?.clientId}`);
    console.log(`   Client Secret vorhanden: ${!!doorSystemSettings?.clientSecret}`);
    console.log(`   Username vorhanden: ${!!doorSystemSettings?.username}`);
    console.log(`   Password vorhanden: ${!!doorSystemSettings?.password}`);
    console.log(`   Lock IDs: ${JSON.stringify(doorSystemSettings?.lockIds || [])}\n`);

    if (!doorSystemSettings?.clientId || !doorSystemSettings?.clientSecret) {
      throw new Error('TTLock Client ID/Secret nicht konfiguriert!');
    }

    if (!doorSystemSettings?.username || !doorSystemSettings?.password) {
      throw new Error('TTLock Username/Password nicht konfiguriert!');
    }

    if (!doorSystemSettings?.lockIds || doorSystemSettings.lockIds.length === 0) {
      throw new Error('Keine Lock IDs konfiguriert!');
    }

    const lockId = doorSystemSettings.lockIds[0];
    console.log(`✅ Verwende Lock ID: ${lockId}\n`);

    // Verwende TTLockService für korrekte API-URL und OAuth
    console.log('🔐 Initialisiere TTLockService...');
    const ttlockService = new TTLockService(1);
    await (ttlockService as any).loadSettings();
    const apiUrl = (ttlockService as any).apiUrl || 'https://euopen.ttlock.com';
    const clientId = (ttlockService as any).clientId;
    
    console.log(`🌐 Verwende API URL: ${apiUrl}\n`);

    // Hole Access Token
    const accessToken = await (ttlockService as any).getAccessToken();
    console.log('✅ Access Token erhalten\n');

    // Rufe /v3/lock/queryOpenState auf, um Lock-Informationen zu erhalten
    // Alternativ: /v3/lock/list oder /v3/lock/detail
    console.log('📡 Rufe Lock-Details ab...\n');
    
    const axiosInstance = (ttlockService as any).axiosInstance;
    
    // Versuche /v3/lock/detail für Lock-Informationen
    const detailPayload = new URLSearchParams();
    detailPayload.append('clientId', clientId);
    detailPayload.append('accessToken', accessToken);
    detailPayload.append('lockId', lockId);
    detailPayload.append('date', Date.now().toString());

    try {
      const detailResponse = await axiosInstance.post('/v3/lock/detail', detailPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const detailData = detailResponse.data as any;
      console.log('📥 Lock-Details Response:');
      console.log(JSON.stringify(detailData, null, 2));
      console.log('');

      if (detailData.errcode === 0 && detailData.lockData) {
        const lockData = detailData.lockData;
        console.log('🔑 Lock-Informationen:');
        console.log(`   Lock ID: ${lockData.lockId || lockId}`);
        console.log(`   Lock Name: ${lockData.lockName || 'N/A'}`);
        console.log(`   Lock Alias: ${lockData.lockAlias || 'N/A'}`);
        console.log(`   Lock Mac: ${lockData.lockMac || 'N/A'}`);
        console.log(`   Firmware Version: ${lockData.firmwareRevision || 'N/A'}`);
        console.log(`   Hardware Version: ${lockData.hardwareRevision || 'N/A'}`);
        console.log(`   Lock Version: ${lockData.lockVersion || 'N/A'}`);
        console.log(`   Passcode Version: ${lockData.passcodeVersion || lockData.keyboardPwdVersion || 'N/A'}`);
        console.log('');

        const passcodeVersion = lockData.passcodeVersion || lockData.keyboardPwdVersion;
        if (passcodeVersion) {
          console.log(`⚠️  WICHTIG: Passcode-Version ist ${passcodeVersion}`);
          if (passcodeVersion >= 4) {
            console.log('   ✅ Passcode-Version 4 oder höher - unterstützt benutzerdefinierte Passcodes über Bluetooth/Gateway');
          } else {
            console.log('   ❌ Passcode-Version unter 4 - möglicherweise keine Unterstützung für benutzerdefinierte Passcodes');
          }
        } else {
          console.log('   ⚠️  Passcode-Version konnte nicht ermittelt werden');
        }
      } else {
        console.log(`   ⚠️  API-Fehler: ${detailData.errmsg || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Fehler beim Abrufen der Lock-Details:', error.message);
      if (error.response) {
        console.error('   Response Data:', error.response.data);
        console.error('   Status:', error.response.status);
      }
    }

    // Versuche auch /v3/lock/list für weitere Informationen
    console.log('\n📡 Rufe Lock-Liste ab...\n');
    const listPayload = new URLSearchParams();
    listPayload.append('clientId', clientId);
    listPayload.append('accessToken', accessToken);
    listPayload.append('pageNo', '1');
    listPayload.append('pageSize', '20');
    listPayload.append('date', Date.now().toString());

    try {
      const listResponse = await axiosInstance.post('/v3/lock/list', listPayload, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const listData = listResponse.data as any;
      console.log('📥 Lock-Liste Response:');
      console.log(JSON.stringify(listData, null, 2));
      console.log('');

      if (listData.errcode === 0 && listData.list) {
        const lock = listData.list.find((l: any) => l.lockId === lockId || l.lockId === String(lockId));
        if (lock) {
          console.log('🔑 Lock gefunden in Liste:');
          console.log(`   Lock ID: ${lock.lockId}`);
          console.log(`   Lock Name: ${lock.lockName || 'N/A'}`);
          console.log(`   Passcode Version: ${lock.passcodeVersion || lock.keyboardPwdVersion || 'N/A'}`);
          console.log('');
        }
      }
    } catch (error: any) {
      console.error('❌ Fehler beim Abrufen der Lock-Liste:', error.message);
      if (error.response) {
        console.error('   Response Data:', error.response.data);
        console.error('   Status:', error.response.status);
      }
    }

  } catch (error: any) {
    console.error('\n❌ Fehler:', error);
    if (error instanceof Error) {
      console.error('   Fehlermeldung:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkLockPasscodeVersion();

