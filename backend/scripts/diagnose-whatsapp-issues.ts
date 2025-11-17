import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../src/utils/encryption';

const prisma = new PrismaClient();

async function diagnoseWhatsAppIssues() {
  try {
    console.log('\n=== DIAGNOSE: WhatsApp-Probleme ===\n');

    // 1. Prüfe WhatsApp Settings
    console.log('1. PRÜFE WHATSAPP SETTINGS:');
    console.log('-----------------------------------');
    const org = await prisma.organization.findUnique({
      where: { id: 1 },
      select: { settings: true }
    });

    if (!org?.settings) {
      console.error('❌ Keine Settings gefunden für Organisation 1');
    } else {
      try {
        const settings = decryptApiSettings(org.settings as any);
        const whatsappSettings = settings?.whatsapp;

        if (!whatsappSettings) {
          console.error('❌ Keine WhatsApp Settings gefunden');
        } else {
          console.log('✅ WhatsApp Settings gefunden:');
          console.log(`   Provider: ${whatsappSettings.provider || 'N/A'}`);
          console.log(`   API Key vorhanden: ${!!whatsappSettings.apiKey}`);
          console.log(`   API Key Länge: ${whatsappSettings.apiKey?.length || 0}`);
          console.log(`   Phone Number ID: ${whatsappSettings.phoneNumberId || 'N/A'}`);
          console.log(`   Business Account ID: ${whatsappSettings.businessAccountId || 'N/A'}`);
        }
      } catch (error) {
        console.error('❌ Fehler beim Entschlüsseln der Settings:', error);
        console.error('   Mögliche Ursache: ENCRYPTION_KEY fehlt oder ist falsch');
      }
    }

    // 2. Prüfe letzte Reservierungen
    console.log('\n2. PRÜFE LETZTE RESERVIERUNGEN:');
    console.log('-----------------------------------');
    const recentReservations = await prisma.reservation.findMany({
      where: {
        organizationId: 1
      },
      orderBy: {
        id: 'desc'
      },
      take: 5,
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        status: true,
        sentMessage: true,
        sentMessageAt: true,
        paymentLink: true,
        doorPin: true,
        doorAppName: true,
        createdAt: true
      }
    });

    if (recentReservations.length === 0) {
      console.log('⚠️ Keine Reservierungen gefunden');
    } else {
      console.log(`✅ ${recentReservations.length} Reservierungen gefunden:\n`);
      recentReservations.forEach((res, index) => {
        console.log(`${index + 1}. Reservierung #${res.id} - ${res.guestName}`);
        console.log(`   Telefon: ${res.guestPhone || 'N/A'}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   WhatsApp gesendet: ${res.sentMessage ? '✅' : '❌'}`);
        console.log(`   Gesendet am: ${res.sentMessageAt ? res.sentMessageAt.toISOString() : 'N/A'}`);
        console.log(`   Payment Link: ${res.paymentLink ? '✅' : '❌'}`);
        console.log(`   Door PIN: ${res.doorPin ? `✅ ${res.doorPin}` : '❌'}`);
        console.log(`   Erstellt am: ${res.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 3. Prüfe Reservierungen mit PIN aber ohne WhatsApp
    console.log('3. RESERVIERUNGEN MIT PIN ABER OHNE WHATSAPP:');
    console.log('-----------------------------------');
    const reservationsWithPinNoWhatsApp = await prisma.reservation.findMany({
      where: {
        organizationId: 1,
        doorPin: { not: null },
        sentMessage: null
      },
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        doorPin: true,
        paymentStatus: true
      }
    });

    if (reservationsWithPinNoWhatsApp.length === 0) {
      console.log('✅ Keine Reservierungen mit PIN aber ohne WhatsApp gefunden');
    } else {
      console.log(`⚠️ ${reservationsWithPinNoWhatsApp.length} Reservierungen mit PIN aber ohne WhatsApp:\n`);
      reservationsWithPinNoWhatsApp.forEach((res, index) => {
        console.log(`${index + 1}. Reservierung #${res.id} - ${res.guestName}`);
        console.log(`   PIN: ${res.doorPin}`);
        console.log(`   Telefon: ${res.guestPhone || 'N/A'}`);
        console.log(`   Payment Status: ${res.paymentStatus}`);
        console.log('');
      });
    }

    // 4. Prüfe Reservierungen mit Telefon aber ohne WhatsApp
    console.log('4. RESERVIERUNGEN MIT TELEFON ABER OHNE WHATSAPP:');
    console.log('-----------------------------------');
    const reservationsWithPhoneNoWhatsApp = await prisma.reservation.findMany({
      where: {
        organizationId: 1,
        guestPhone: { not: null },
        sentMessage: null,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Letzte 24 Stunden
        }
      },
      select: {
        id: true,
        guestName: true,
        guestPhone: true,
        status: true,
        createdAt: true
      }
    });

    if (reservationsWithPhoneNoWhatsApp.length === 0) {
      console.log('✅ Keine Reservierungen mit Telefon aber ohne WhatsApp in den letzten 24h gefunden');
    } else {
      console.log(`⚠️ ${reservationsWithPhoneNoWhatsApp.length} Reservierungen mit Telefon aber ohne WhatsApp (letzte 24h):\n`);
      reservationsWithPhoneNoWhatsApp.forEach((res, index) => {
        console.log(`${index + 1}. Reservierung #${res.id} - ${res.guestName}`);
        console.log(`   Telefon: ${res.guestPhone}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Erstellt: ${res.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 5. Environment-Variablen prüfen
    console.log('5. ENVIRONMENT-VARIABLEN:');
    console.log('-----------------------------------');
    console.log(`ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✅ Gesetzt' : '❌ FEHLT'}`);
    console.log(`WHATSAPP_TEMPLATE_LANGUAGE: ${process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'Nicht gesetzt (Standard: es)'}`);
    console.log(`WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION: ${process.env.WHATSAPP_TEMPLATE_RESERVATION_CONFIRMATION || 'Nicht gesetzt (Standard: reservation_checkin_invitation)'}`);
    console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Nicht gesetzt (Standard: http://localhost:3000)'}`);

    console.log('\n=== DIAGNOSE ABGESCHLOSSEN ===\n');

  } catch (error) {
    console.error('Fehler bei Diagnose:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseWhatsAppIssues();

