#!/usr/bin/env node
/**
 * Tauscht die LobbyPMS API-Tokens zwischen Manila und Parque Poblado
 * 
 * Voraussetzung:
 * - Parque Poblado sollte Property ID 13543 haben
 * - Manila sollte eine andere Property ID haben
 * 
 * Aktion:
 * - Tauscht die lobbyPmsSettings zwischen den beiden Branches
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Verschlüsselungs-Funktionen
function decryptSecret(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(':')) {
    return encryptedText;
  }

  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    return encryptedText;
  }

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      return encryptedText;
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

function encryptSecret(plainText: string): string {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey || encryptionKey.length !== 64) {
    return plainText; // Nicht verschlüsselt, wenn Key fehlt
  }

  try {
    const key = Buffer.from(encryptionKey, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    return plainText;
  }
}

function decryptBranchApiSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const decrypted = { ...settings };
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  for (const field of encryptedFields) {
    if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[field].includes(':')) {
      try {
        decrypted[field] = decryptSecret(decrypted[field]);
      } catch (error) {
        // Bei Fehler: Feld bleibt wie es ist
      }
    }
  }

  return decrypted;
}

function encryptBranchApiSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }

  const encrypted = { ...settings };
  const encryptedFields = ['apiKey', 'apiSecret', 'merchantId', 'clientId', 'clientSecret', 'username', 'password', 'smtpPass'];
  
  for (const field of encryptedFields) {
    if (encrypted[field] && typeof encrypted[field] === 'string' && !encrypted[field].includes(':')) {
      // Nur verschlüsseln, wenn noch nicht verschlüsselt
      encrypted[field] = encryptSecret(encrypted[field]);
    }
  }

  return encrypted;
}

async function swapTokens() {
  try {
    console.log('🔄 Tausche LobbyPMS API-Tokens zwischen Manila und Parque Poblado...\n');

    const branches = await prisma.branch.findMany({
      where: {
        name: { in: ['Manila', 'Parque Poblado'] }
      },
      select: {
        id: true,
        name: true,
        lobbyPmsSettings: true
      }
    });

    if (branches.length !== 2) {
      console.log('❌ Nicht beide Branches gefunden');
      return;
    }

    const manila = branches.find(b => b.name === 'Manila');
    const parquePoblado = branches.find(b => b.name === 'Parque Poblado');

    if (!manila || !parquePoblado) {
      console.log('❌ Manila oder Parque Poblado nicht gefunden');
      return;
    }

    console.log(`📋 Manila (ID: ${manila.id}):`);
    const manilaSettings = manila.lobbyPmsSettings ? decryptBranchApiSettings(manila.lobbyPmsSettings as any) : null;
    console.log(`   Property ID: ${manilaSettings?.propertyId || 'nicht gesetzt'}`);
    console.log(`   API Key: ${manilaSettings?.apiKey ? manilaSettings.apiKey.substring(0, 20) + '...' : 'nicht gesetzt'}`);

    console.log(`\n📋 Parque Poblado (ID: ${parquePoblado.id}):`);
    const parquePobladoSettings = parquePoblado.lobbyPmsSettings ? decryptBranchApiSettings(parquePoblado.lobbyPmsSettings as any) : null;
    console.log(`   Property ID: ${parquePobladoSettings?.propertyId || 'nicht gesetzt'}`);
    console.log(`   API Key: ${parquePobladoSettings?.apiKey ? parquePobladoSettings.apiKey.substring(0, 20) + '...' : 'nicht gesetzt'}`);

    if (!manilaSettings || !parquePobladoSettings) {
      console.log('\n❌ Einer der Branches hat keine LobbyPMS Settings');
      return;
    }

    // Tausche die Settings
    const manilaSettingsNew = { ...parquePobladoSettings };
    const parquePobladoSettingsNew = { ...manilaSettings };

    // Setze Property IDs korrekt
    // Parque Poblado sollte 13543 haben
    parquePobladoSettingsNew.propertyId = '13543';
    // Manila sollte die andere Property ID haben (aus dem alten Parque Poblado)
    manilaSettingsNew.propertyId = manilaSettings.propertyId || null;

    console.log(`\n🔄 Tausche Settings...`);
    console.log(`   Manila bekommt: Property ID ${manilaSettingsNew.propertyId || 'nicht gesetzt'}`);
    console.log(`   Parque Poblado bekommt: Property ID ${parquePobladoSettingsNew.propertyId}`);

    // Verschlüssele die Settings wieder
    const encryptedManilaSettings = encryptBranchApiSettings(manilaSettingsNew);
    const encryptedParquePobladoSettings = encryptBranchApiSettings(parquePobladoSettingsNew);

    // Update in DB
    await prisma.branch.update({
      where: { id: manila.id },
      data: {
        lobbyPmsSettings: encryptedManilaSettings as any
      }
    });

    await prisma.branch.update({
      where: { id: parquePoblado.id },
      data: {
        lobbyPmsSettings: encryptedParquePobladoSettings as any
      }
    });

    console.log('\n✅ Tokens erfolgreich getauscht!');

    // Verifiziere
    const manilaUpdated = await prisma.branch.findUnique({
      where: { id: manila.id },
      select: { name: true, lobbyPmsSettings: true }
    });

    const parquePobladoUpdated = await prisma.branch.findUnique({
      where: { id: parquePoblado.id },
      select: { name: true, lobbyPmsSettings: true }
    });

    console.log('\n📊 Verifikation:');
    const manilaSettingsUpdated = manilaUpdated?.lobbyPmsSettings ? decryptBranchApiSettings(manilaUpdated.lobbyPmsSettings as any) : null;
    const parquePobladoSettingsUpdated = parquePobladoUpdated?.lobbyPmsSettings ? decryptBranchApiSettings(parquePobladoUpdated.lobbyPmsSettings as any) : null;

    console.log(`   Manila Property ID: ${manilaSettingsUpdated?.propertyId || 'nicht gesetzt'}`);
    console.log(`   Parque Poblado Property ID: ${parquePobladoSettingsUpdated?.propertyId || 'nicht gesetzt'}`);

    if (parquePobladoSettingsUpdated?.propertyId === '13543') {
      console.log('\n✅ Parque Poblado hat jetzt Property ID 13543');
    } else {
      console.log('\n⚠️  Parque Poblado hat NICHT Property ID 13543!');
    }

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

swapTokens()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });

