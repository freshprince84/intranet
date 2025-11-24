import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Erweitert WhatsApp KI-Prompt für Gast-Code-Versand
 * 
 * Fügt Informationen zum Gast-Code-Versand hinzu:
 * - Gast-Identifikation via Telefonnummer oder Abfragen
 * - Status-Prüfung (Zahlung & Check-in)
 * - Link-Versand (Payment & Check-in Links)
 * 
 * Verwendung:
 *   npx ts-node scripts/update-whatsapp-ai-prompt-guest.ts [branchId]
 * 
 * Ohne branchId: Aktualisiert alle Branches mit WhatsApp Settings
 * 
 * WICHTIG: Für Gäste-Gruppen muss die guestGroup.ai Konfiguration separat aktualisiert werden!
 */

async function updateWhatsAppAiPromptForGuests(branchId?: number) {
  try {
    console.log('🚀 Erweitere WhatsApp KI-Prompt für Gast-Code-Versand...\n');

    // Gast-Code-Versand-Informationen
    const guestCodeInfo = `
WICHTIG: Gast-Code-Versand

Wenn ein Gast nach seinem Code, PIN, Passwort oder Zugangscode fragt:
1. Verweise auf die Keywords: "code", "código", "pin", "password", "verloren", "lost", "perdido", "acceso"
2. Der Bot identifiziert Gäste automatisch via Telefonnummer oder durch Abfragen (Name, Land, Geburtsdatum)
3. Der Bot prüft automatisch den Zahlungsstatus und Check-in-Status
4. Falls Zahlung ausstehend: Bot sendet automatisch Payment Link
5. Falls Check-in ausstehend: Bot sendet automatisch Check-in Link
6. Bot sendet automatisch den Code (lobbyReservationId, doorPin oder ttlLockPassword)

Du musst NICHT selbst Codes versenden - verweise einfach auf die Keywords.
`;

    // Finde Branches
    const whereClause = branchId 
      ? { id: branchId }
      : {
          whatsappSettings: { not: null }
        };

    const branches = await prisma.branch.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        whatsappSettings: true
      }
    });

    if (branches.length === 0) {
      console.log('⚠️  Keine Branches mit WhatsApp Settings gefunden.');
      return;
    }

    console.log(`📋 Gefundene Branches: ${branches.length}\n`);

    let updatedCount = 0;

    for (const branch of branches) {
      if (!branch.whatsappSettings) {
        console.log(`⏭️  Branch "${branch.name}" (ID: ${branch.id}): Keine WhatsApp Settings, überspringe.`);
        continue;
      }

      const settings = branch.whatsappSettings as any;
      
      // 1. Aktualisiere normale AI-Config (für Mitarbeiter)
      const aiConfig = settings?.ai;
      if (aiConfig && aiConfig.enabled) {
        const currentPrompt = aiConfig.systemPrompt || '';
        if (!currentPrompt.includes('Gast-Code-Versand') && !currentPrompt.includes('gast-code-versand')) {
          const updatedPrompt = currentPrompt.trim() + '\n\n' + guestCodeInfo.trim();
          settings.ai.systemPrompt = updatedPrompt;
          console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): Mitarbeiter-KI-Prompt erweitert.`);
          updatedCount++;
        } else {
          console.log(`⏭️  Branch "${branch.name}" (ID: ${branch.id}): Mitarbeiter-KI-Prompt bereits erweitert, überspringe.`);
        }
      }

      // 2. Aktualisiere Gäste-Gruppen-KI-Config (falls vorhanden)
      const guestGroupAi = settings?.guestGroup?.ai;
      if (guestGroupAi && guestGroupAi.enabled) {
        const currentGuestPrompt = guestGroupAi.systemPrompt || '';
        if (!currentGuestPrompt.includes('Gast-Code-Versand') && !currentGuestPrompt.includes('gast-code-versand')) {
          const updatedGuestPrompt = currentGuestPrompt.trim() + '\n\n' + guestCodeInfo.trim();
          settings.guestGroup.ai.systemPrompt = updatedGuestPrompt;
          console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): Gäste-Gruppen-KI-Prompt erweitert.`);
          if (!aiConfig || !aiConfig.enabled) {
            updatedCount++;
          }
        } else {
          console.log(`⏭️  Branch "${branch.name}" (ID: ${branch.id}): Gäste-Gruppen-KI-Prompt bereits erweitert, überspringe.`);
        }
      }

      // Aktualisiere Settings in DB
      const updatedSettings = settings;

      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          whatsappSettings: updatedSettings
        }
      });

      console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): KI-Prompt erweitert.`);
      updatedCount++;
    }

    console.log(`\n✅ Fertig! ${updatedCount} Branch(es) aktualisiert.`);
    console.log('\n📝 Nächste Schritte:');
    console.log('   1. Prüfe die erweiterten Prompts in der Branch-Konfiguration');
    console.log('   2. Teste den Gast-Code-Versand mit einem Test-Gast');
    console.log('   3. Für Gäste-Gruppen: Konfiguriere separate AI-Config in guestGroup.ai');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Hauptfunktion
const branchIdArg = process.argv[2];
const branchId = branchIdArg ? parseInt(branchIdArg, 10) : undefined;

if (branchIdArg && isNaN(branchId)) {
  console.error('❌ Ungültige Branch ID:', branchIdArg);
  process.exit(1);
}

updateWhatsAppAiPromptForGuests(branchId);

