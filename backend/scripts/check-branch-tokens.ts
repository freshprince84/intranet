#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

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

function decryptBranchApiSettings(settings: any): any {
  if (!settings || typeof settings !== 'object') {
    return settings;
  }
  const decrypted = { ...settings };
  if (decrypted.apiKey && typeof decrypted.apiKey === 'string' && decrypted.apiKey.includes(':')) {
    try {
      decrypted.apiKey = decryptSecret(decrypted.apiKey);
    } catch (error) {}
  }
  return decrypted;
}

async function checkTokens() {
  try {
    const branches = await prisma.branch.findMany({
      where: { name: { in: ['Manila', 'Parque Poblado'] } },
      select: { id: true, name: true, lobbyPmsSettings: true }
    });

    for (const branch of branches) {
      const settings = branch.lobbyPmsSettings ? decryptBranchApiSettings(branch.lobbyPmsSettings as any) : null;
      const apiKey = settings?.apiKey || 'KEIN KEY';
      console.log(`${branch.name} (ID: ${branch.id}): ${typeof apiKey === 'string' ? apiKey.substring(0, 40) + '...' : 'KEIN KEY'}`);
    }
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTokens();

