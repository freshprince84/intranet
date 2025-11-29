#!/bin/bash

# Script zum Prüfen der Bold Payment Settings für eine Reservierung auf dem Server
# Verwendung: bash scripts/check-reservation-on-server.sh [RESERVATION_ID]

RESERVATION_ID=${1:-18185589}

echo "🔍 Prüfe Bold Payment Settings für Reservierung $RESERVATION_ID auf dem Server..."
echo ""

cd /var/www/intranet/backend

# Führe TypeScript-Script aus
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from './src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function check() {
  const reservationId = $RESERVATION_ID;
  
  const reservation = await prisma.reservation.findUnique({
    where: { id: reservationId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          displayName: true,
          settings: true
        }
      },
      branch: {
        select: {
          id: true,
          name: true,
          organizationId: true,
          boldPaymentSettings: true
        }
      }
    }
  });

  if (!reservation) {
    console.log('❌ Reservierung nicht gefunden!');
    await prisma.\$disconnect();
    return;
  }

  console.log('📋 RESERVATION:');
  console.log('   ID:', reservation.id);
  console.log('   Gast:', reservation.guestName);
  console.log('   Organisation ID:', reservation.organizationId);
  console.log('   Branch ID:', reservation.branchId || 'KEINE');
  console.log('   Betrag:', reservation.amount, reservation.currency || 'COP');
  console.log('');

  if (reservation.branchId) {
    console.log('🔍 BRANCH SETTINGS:');
    if (!reservation.branch) {
      console.log('   ❌ Branch nicht gefunden!');
    } else if (!reservation.branch.boldPaymentSettings) {
      console.log('   ⚠️  Branch hat KEINE Bold Payment Settings');
      console.log('   → Fallback auf Organization Settings');
    } else {
      try {
        const branchSettings = decryptBranchApiSettings(reservation.branch.boldPaymentSettings as any);
        const boldPaymentSettings = branchSettings?.boldPayment || branchSettings;
        if (boldPaymentSettings?.apiKey) {
          const apiKey = String(boldPaymentSettings.apiKey);
          console.log('   ✅ API Key vorhanden:', apiKey.substring(0, 20) + '...');
          console.log('   ✅ Merchant ID:', boldPaymentSettings.merchantId || 'NICHT GESETZT');
          console.log('   ✅ Environment:', boldPaymentSettings.environment || 'sandbox');
          console.log('   → WÜRDE VERWENDET: Branch Settings');
        } else {
          console.log('   ❌ Branch Settings vorhanden, aber KEIN API Key!');
          console.log('   → Fallback auf Organization Settings');
        }
      } catch (error) {
        console.log('   ❌ Fehler beim Entschlüsseln:', error instanceof Error ? error.message : String(error));
        console.log('   → Fallback auf Organization Settings');
      }
    }
    console.log('');
  }

  console.log('🔍 ORGANIZATION SETTINGS:');
  if (!reservation.organization?.settings) {
    console.log('   ❌ Organisation hat KEINE Settings!');
  } else {
    try {
      const orgSettings = decryptApiSettings(reservation.organization.settings as any);
      const boldPaymentSettings = orgSettings?.boldPayment;
      if (boldPaymentSettings?.apiKey) {
        const apiKey = String(boldPaymentSettings.apiKey);
        console.log('   ✅ API Key vorhanden:', apiKey.substring(0, 20) + '...');
        console.log('   ✅ Merchant ID:', boldPaymentSettings.merchantId || 'NICHT GESETZT');
        console.log('   ✅ Environment:', boldPaymentSettings.environment || 'sandbox');
        if (!reservation.branchId || !reservation.branch?.boldPaymentSettings) {
          console.log('   → WÜRDE VERWENDET: Organization Settings');
        }
      } else {
        console.log('   ❌ Organization Settings vorhanden, aber KEIN API Key!');
      }
    } catch (error) {
      console.log('   ❌ Fehler beim Entschlüsseln:', error instanceof Error ? error.message : String(error));
    }
  }

  await prisma.\$disconnect();
}

check().catch(console.error);
"












