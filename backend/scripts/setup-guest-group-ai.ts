import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Lade .env Datei
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Script: Erstellt/Erweitert Gäste-Gruppen-KI-Konfiguration
 * 
 * Erstellt oder erweitert die guestGroup.ai Konfiguration für WhatsApp-Gruppen für Gäste.
 * 
 * Verwendung:
 *   npx ts-node scripts/setup-guest-group-ai.ts [branchId] [groupId]
 * 
 * branchId: Branch ID (optional, ohne: alle Branches)
 * groupId: WhatsApp Group ID (optional, z.B. "120363123456789012@g.us")
 * 
 * Beispiel:
 *   npx ts-node scripts/setup-guest-group-ai.ts 2 120363123456789012@g.us
 */

async function setupGuestGroupAi(branchId?: number, groupId?: string) {
  try {
    console.log('🚀 Erstelle/Erweitere Gäste-Gruppen-KI-Konfiguration...\n');

    // Frontend URL für Cerebro-Artikel (wird später verwendet)
    const frontendUrl = process.env.FRONTEND_URL || 'https://65.109.228.106.nip.io';
    
    // System Prompt für Gäste-Gruppen
    const guestGroupSystemPrompt = `Du bist ein hilfreicher Assistent für Gäste in Medellin. Du informierst über Touren, Events, Aktionen, Services und bietest Hilfestellung für Reisende.

WICHTIG: Gast-Code-Versand

Wenn ein Gast nach seinem Code, PIN, Passwort oder Zugangscode fragt:
1. Verweise auf die Keywords: "code", "código", "pin", "password", "verloren", "lost", "perdido", "acceso"
2. Der Bot identifiziert Gäste automatisch via Telefonnummer oder durch Abfragen (Name, Land, Geburtsdatum)
3. Der Bot prüft automatisch den Zahlungsstatus und Check-in-Status
4. Falls Zahlung ausstehend: Bot sendet automatisch Payment Link
5. Falls Check-in ausstehend: Bot sendet automatisch Check-in Link
6. Bot sendet automatisch den Code (lobbyReservationId, doorPin oder ttlLockPassword)

Du musst NICHT selbst Codes versenden - verweise einfach auf die Keywords.

Hinweis zu Tours, Services, Events:
- Wenn Gäste nach Tours, Services, Events oder Produkten fragen, informiere sie über die verfügbaren Angebote
- Verwende die verfügbaren Quellen (siehe unten) als Referenz, wenn vorhanden
- Falls keine Quellen konfiguriert sind, informiere die Gäste, dass sie sich an das Personal wenden können`;

    // Standard-Regeln für Gäste
    const guestGroupRules = [
      'Antworte immer auf Spanisch, es sei denn der Gast fragt auf Deutsch oder Englisch',
      'Sei freundlich, hilfreich und professionell',
      'Informiere über verfügbare Touren, Events, Services und Produkte',
      'Wenn du eine Frage nicht beantworten kannst, verweise auf das Personal',
      'Verwende keine Umgangssprache oder Slang',
      'Bei Fragen zu Codes: Verweise auf die Keywords "code" oder "código"'
    ];

    // Standard-Sources (werden später mit Cerebro-Artikel-URLs gefüllt)
    // Diese URLs zeigen auf Cerebro-Artikel, die später erstellt werden
    const defaultSources: string[] = [
      // Diese URLs werden aktiv, sobald die Cerebro-Artikel erstellt sind
      // Beispiel-URLs (müssen später angepasst werden):
      // `${frontendUrl}/cerebro/tours-medellin`,
      // `${frontendUrl}/cerebro/services`,
      // `${frontendUrl}/cerebro/events`,
      // `${frontendUrl}/cerebro/products`
    ];

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

    let createdCount = 0;
    let updatedCount = 0;

    for (const branch of branches) {
      if (!branch.whatsappSettings) {
        console.log(`⏭️  Branch "${branch.name}" (ID: ${branch.id}): Keine WhatsApp Settings, überspringe.`);
        continue;
      }

      const settings = branch.whatsappSettings as any;
      
      // Prüfe ob guestGroup bereits existiert
      const hasGuestGroup = !!settings?.guestGroup;
      const hasGuestGroupAi = !!settings?.guestGroup?.ai;

      if (!hasGuestGroup) {
        // Erstelle neue guestGroup Konfiguration
        settings.guestGroup = {
          groupId: groupId || null,
          ai: {
            enabled: true,
            model: 'gpt-4o',
            systemPrompt: guestGroupSystemPrompt,
            rules: guestGroupRules,
            sources: defaultSources,
            temperature: 0.7,
            maxTokens: 500
          }
        };
        createdCount++;
        console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): Gäste-Gruppen-KI-Konfiguration ERSTELLT.`);
      } else if (!hasGuestGroupAi) {
        // guestGroup existiert, aber ai fehlt
        settings.guestGroup.ai = {
          enabled: true,
          model: 'gpt-4o',
          systemPrompt: guestGroupSystemPrompt,
          rules: guestGroupRules,
          sources: defaultSources,
          temperature: 0.7,
          maxTokens: 500
        };
        createdCount++;
        console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): Gäste-Gruppen-KI-Konfiguration ERSTELLT (ai fehlte).`);
      } else {
        // guestGroup.ai existiert bereits - erweitere nur System Prompt falls nötig
        const currentPrompt = settings.guestGroup.ai.systemPrompt || '';
        
        // Erweitere System Prompt falls Gast-Code-Info fehlt
        if (!currentPrompt.includes('Gast-Code-Versand') && !currentPrompt.includes('gast-code-versand')) {
          const updatedPrompt = currentPrompt.trim() + '\n\n' + guestGroupSystemPrompt.split('\n\n')[1]; // Nur Gast-Code-Info hinzufügen
          settings.guestGroup.ai.systemPrompt = updatedPrompt;
          updatedCount++;
          console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): Gäste-Gruppen-KI-Prompt ERWEITERT.`);
        } else {
          console.log(`⏭️  Branch "${branch.name}" (ID: ${branch.id}): Gäste-Gruppen-KI-Prompt bereits erweitert, überspringe.`);
        }

        // Aktualisiere groupId falls angegeben
        if (groupId && settings.guestGroup.groupId !== groupId) {
          settings.guestGroup.groupId = groupId;
          console.log(`✅ Branch "${branch.name}" (ID: ${branch.id}): Group ID aktualisiert.`);
        }

        // Stelle sicher, dass alle Felder vorhanden sind
        if (!settings.guestGroup.ai.model) {
          settings.guestGroup.ai.model = 'gpt-4o';
        }
        if (!settings.guestGroup.ai.rules || settings.guestGroup.ai.rules.length === 0) {
          settings.guestGroup.ai.rules = guestGroupRules;
        }
        if (!settings.guestGroup.ai.sources) {
          settings.guestGroup.ai.sources = defaultSources;
        }
        if (!settings.guestGroup.ai.temperature) {
          settings.guestGroup.ai.temperature = 0.7;
        }
        if (!settings.guestGroup.ai.maxTokens) {
          settings.guestGroup.ai.maxTokens = 500;
        }
      }

      // Aktualisiere Settings in DB
      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          whatsappSettings: settings
        }
      });
    }

    console.log(`\n✅ Fertig!`);
    console.log(`   - ${createdCount} Gäste-Gruppen-KI-Konfiguration(en) erstellt`);
    console.log(`   - ${updatedCount} Gäste-Gruppen-KI-Prompt(s) erweitert`);
    
    console.log('\n📝 WICHTIG: URLs in sources Array:');
    console.log('   Die URLs im "sources" Array sind Links zu Cerebro-Artikeln.');
    console.log('   Format: https://65.109.228.106.nip.io/cerebro/[slug]');
    console.log('   Beispiel: https://65.109.228.106.nip.io/cerebro/tours-medellin');
    console.log('\n   Aktuell sind noch KEINE URLs konfiguriert, da die Cerebro-Artikel noch nicht erstellt wurden.');
    console.log('   Sobald du die Cerebro-Artikel erstellt hast:');
    console.log('   1. Öffne Branch-Konfiguration im Frontend');
    console.log('   2. Gehe zu WhatsApp-Konfiguration → Gäste-Gruppe');
    console.log('   3. Füge die URLs zu den Cerebro-Artikeln in "Sources" hinzu');
    console.log('   4. Oder: Führe das Script erneut aus mit --add-sources Flag (wird implementiert)');

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Hauptfunktion
const branchIdArg = process.argv[2];
const groupIdArg = process.argv[3];

const branchId = branchIdArg ? parseInt(branchIdArg, 10) : undefined;
const groupId = groupIdArg || undefined;

if (branchIdArg && isNaN(branchId)) {
  console.error('❌ Ungültige Branch ID:', branchIdArg);
  process.exit(1);
}

setupGuestGroupAi(branchId, groupId);



