/**
 * Script: Prüft Bold Payment Settings für eine spezifische Reservierung
 * 
 * Analysiert:
 * - Hat die Reservierung eine branchId?
 * - Welche Settings werden geladen (Branch oder Organization)?
 * - Sind die Settings korrekt?
 */

import { PrismaClient } from '@prisma/client';
import { decryptApiSettings, decryptBranchApiSettings } from '../src/utils/encryption';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkReservationBoldPaymentSettings(reservationId: number) {
  try {
    console.log(`🔍 Prüfe Bold Payment Settings für Reservierung ${reservationId}...\n`);

    // Lade Reservation (wie in sendReservationInvitation)
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
      throw new Error(`Reservierung ${reservationId} nicht gefunden!`);
    }

    console.log('='.repeat(80));
    console.log('📋 RESERVATION DETAILS');
    console.log('='.repeat(80));
    console.log(`ID: ${reservation.id}`);
    console.log(`Gast: ${reservation.guestName}`);
    console.log(`Organisation ID: ${reservation.organizationId}`);
    console.log(`Branch ID: ${reservation.branchId || 'KEINE'}`);
    console.log(`Betrag: ${reservation.amount} ${reservation.currency || 'COP'}`);
    console.log('');

    // Prüfe welche Settings verwendet werden würden
    if (reservation.branchId) {
      console.log('='.repeat(80));
      console.log('🔍 BRANCH SETTINGS PRÜFUNG');
      console.log('='.repeat(80));
      console.log(`Branch ID: ${reservation.branchId}`);
      console.log(`Branch Name: ${reservation.branch?.name || 'NICHT GEFUNDEN'}`);
      console.log('');

      if (!reservation.branch) {
        console.log('❌ Branch nicht gefunden!');
        return;
      }

      if (!reservation.branch.boldPaymentSettings) {
        console.log('⚠️  Branch hat KEINE Bold Payment Settings');
        console.log('   → Fallback auf Organization Settings');
        console.log('');
      } else {
        console.log('✅ Branch hat Bold Payment Settings');
        try {
          const branchSettings = decryptBranchApiSettings(reservation.branch.boldPaymentSettings as any);
          const boldPaymentSettings = branchSettings?.boldPayment || branchSettings;

          if (boldPaymentSettings?.apiKey) {
            const apiKey = String(boldPaymentSettings.apiKey);
            console.log(`   API Key vorhanden: ${apiKey.substring(0, 20)}... (${apiKey.length} Zeichen)`);
            console.log(`   Merchant ID: ${boldPaymentSettings.merchantId || 'NICHT GESETZT'}`);
            console.log(`   Environment: ${boldPaymentSettings.environment || 'sandbox (Standard)'}`);
            console.log('');
            console.log('✅ Branch Settings sind konfiguriert und würden verwendet werden');
          } else {
            console.log('❌ Branch Settings vorhanden, aber KEIN API Key!');
            console.log('   → Fallback auf Organization Settings');
            console.log('');
          }
        } catch (error) {
          console.log('❌ Fehler beim Entschlüsseln der Branch Settings:');
          if (error instanceof Error) {
            console.log(`   ${error.message}`);
          }
          console.log('   → Fallback auf Organization Settings');
          console.log('');
        }
      }
    }

    // Prüfe Organization Settings (Fallback)
    console.log('='.repeat(80));
    console.log('🔍 ORGANIZATION SETTINGS PRÜFUNG');
    console.log('='.repeat(80));
    console.log(`Organisation ID: ${reservation.organizationId}`);
    console.log(`Organisation Name: ${reservation.organization?.displayName || reservation.organization?.name || 'NICHT GEFUNDEN'}`);
    console.log('');

    if (!reservation.organization?.settings) {
      console.log('❌ Organisation hat KEINE Settings!');
      return;
    }

    try {
      const orgSettings = decryptApiSettings(reservation.organization.settings as any);
      const boldPaymentSettings = orgSettings?.boldPayment;

      if (!boldPaymentSettings) {
        console.log('❌ Organisation hat KEINE Bold Payment Settings!');
        return;
      }

      if (boldPaymentSettings.apiKey) {
        const apiKey = String(boldPaymentSettings.apiKey);
        console.log(`✅ API Key vorhanden: ${apiKey.substring(0, 20)}... (${apiKey.length} Zeichen)`);
        console.log(`✅ Merchant ID: ${boldPaymentSettings.merchantId || 'NICHT GESETZT'}`);
        console.log(`✅ Environment: ${boldPaymentSettings.environment || 'sandbox (Standard)'}`);
        console.log('');
        console.log('✅ Organization Settings sind konfiguriert');
      } else {
        console.log('❌ Organization Settings vorhanden, aber KEIN API Key!');
        return;
      }
    } catch (error) {
      console.log('❌ Fehler beim Entschlüsseln der Organization Settings:');
      if (error instanceof Error) {
        console.log(`   ${error.message}`);
      }
      return;
    }

    // Zusammenfassung
    console.log('='.repeat(80));
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('='.repeat(80));
    console.log('');

    if (reservation.branchId) {
      if (reservation.branch?.boldPaymentSettings) {
        try {
          const branchSettings = decryptBranchApiSettings(reservation.branch.boldPaymentSettings as any);
          const boldPaymentSettings = branchSettings?.boldPayment || branchSettings;
          if (boldPaymentSettings?.apiKey) {
            console.log('✅ WÜRDE VERWENDET: Branch Settings');
            console.log(`   Merchant ID: ${boldPaymentSettings.merchantId}`);
            console.log(`   Environment: ${boldPaymentSettings.environment || 'sandbox'}`);
          } else {
            console.log('⚠️  WÜRDE VERWENDET: Organization Settings (Branch Settings haben keinen API Key)');
            const orgSettings = decryptApiSettings(reservation.organization!.settings as any);
            console.log(`   Merchant ID: ${orgSettings?.boldPayment?.merchantId}`);
            console.log(`   Environment: ${orgSettings?.boldPayment?.environment || 'sandbox'}`);
          }
        } catch (error) {
          console.log('⚠️  WÜRDE VERWENDET: Organization Settings (Fehler beim Laden der Branch Settings)');
          const orgSettings = decryptApiSettings(reservation.organization!.settings as any);
          console.log(`   Merchant ID: ${orgSettings?.boldPayment?.merchantId}`);
          console.log(`   Environment: ${orgSettings?.boldPayment?.environment || 'sandbox'}`);
        }
      } else {
        console.log('⚠️  WÜRDE VERWENDET: Organization Settings (Branch hat keine Settings)');
        const orgSettings = decryptApiSettings(reservation.organization!.settings as any);
        console.log(`   Merchant ID: ${orgSettings?.boldPayment?.merchantId}`);
        console.log(`   Environment: ${orgSettings?.boldPayment?.environment || 'sandbox'}`);
      }
    } else {
      console.log('✅ WÜRDE VERWENDET: Organization Settings (keine Branch ID)');
      const orgSettings = decryptApiSettings(reservation.organization!.settings as any);
      console.log(`   Merchant ID: ${orgSettings?.boldPayment?.merchantId}`);
      console.log(`   Environment: ${orgSettings?.boldPayment?.environment || 'sandbox'}`);
    }

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

// Reservierung ID aus Argumenten oder Standard
const reservationId = parseInt(process.argv[2] || '18185589'); // ID aus Screenshot
checkReservationBoldPaymentSettings(reservationId)
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });













