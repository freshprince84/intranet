/**
 * Script: Prüft rohe Werte in der Datenbank (ohne Entschlüsselung)
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkRawDbValues() {
  try {
    console.log('🔍 Prüfe rohe Werte in der Datenbank (Branch 3 - Manila)...\n');

    const branch = await prisma.branch.findUnique({
      where: { id: 3 },
      select: { 
        id: true,
        name: true,
        boldPaymentSettings: true 
      }
    });

    if (!branch?.boldPaymentSettings) {
      throw new Error('Branch 3 hat keine boldPaymentSettings!');
    }

    console.log(`✅ Branch ${branch.id} (${branch.name}) gefunden\n`);

    const rawSettings = branch.boldPaymentSettings as any;
    
    console.log('📋 ROHE STRUKTUR (wie in DB gespeichert):');
    console.log(JSON.stringify(rawSettings, null, 2));
    console.log('');

    if (rawSettings.boldPayment) {
      console.log('🔍 ANALYSE:');
      console.log(`   boldPayment.apiKey: ${rawSettings.boldPayment.apiKey ? `"${rawSettings.boldPayment.apiKey.substring(0, 50)}..." (Länge: ${rawSettings.boldPayment.apiKey.length})` : '❌ FEHLT'}`);
      console.log(`   Enthält ":" (verschlüsselt)? ${rawSettings.boldPayment.apiKey?.includes(':') ? '✅ JA - VERSCHLÜSSELT' : '❌ NEIN - UNVERSCHLÜSSELT'}`);
      console.log('');
      console.log(`   boldPayment.merchantId: ${rawSettings.boldPayment.merchantId ? `"${rawSettings.boldPayment.merchantId.substring(0, 50)}..." (Länge: ${rawSettings.boldPayment.merchantId.length})` : '❌ FEHLT'}`);
      console.log(`   Enthält ":" (verschlüsselt)? ${rawSettings.boldPayment.merchantId?.includes(':') ? '✅ JA - VERSCHLÜSSELT' : '❌ NEIN - UNVERSCHLÜSSELT'}`);
    } else {
      console.log('⚠️ KEINE boldPayment-Struktur (flach)');
      console.log(`   apiKey: ${rawSettings.apiKey ? `"${rawSettings.apiKey.substring(0, 50)}..."` : '❌ FEHLT'}`);
      console.log(`   merchantId: ${rawSettings.merchantId ? `"${rawSettings.merchantId.substring(0, 50)}..."` : '❌ FEHLT'}`);
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

checkRawDbValues()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });

