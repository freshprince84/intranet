import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function checkAiConfig() {
  try {
    const branches = await prisma.branch.findMany({
      select: {
        id: true,
        name: true,
        whatsappSettings: true
      }
    });

    console.log('\n🔍 Prüfe KI-Konfiguration für alle Branches:\n');

    for (const branch of branches) {
      console.log(`Branch: ${branch.name} (ID: ${branch.id})`);
      
      if (!branch.whatsappSettings) {
        console.log('  ❌ Keine WhatsApp Settings');
        continue;
      }

      const settings = branch.whatsappSettings as any;
      const aiConfig = settings?.ai;

      if (!aiConfig) {
        console.log('  ❌ Keine KI-Konfiguration (ai)');
        continue;
      }

      console.log('  KI-Konfiguration:');
      console.log(`    - Aktiviert: ${aiConfig.enabled ? '✅ Ja' : '❌ Nein'}`);
      console.log(`    - Modell: ${aiConfig.model || 'nicht gesetzt'}`);
      console.log(`    - System Prompt: ${aiConfig.systemPrompt ? '✅ Vorhanden' : '❌ Leer'}`);
      console.log(`    - Regeln: ${aiConfig.rules?.length || 0}`);
      console.log(`    - Temperature: ${aiConfig.temperature || 'nicht gesetzt'}`);
      console.log(`    - Max Tokens: ${aiConfig.maxTokens || 'nicht gesetzt'}`);
      console.log('');
    }

    // Prüfe OPENAI_API_KEY
    console.log('\n🔑 Environment-Variablen:');
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const preview = openaiKey.substring(0, 10) + '...' + openaiKey.substring(openaiKey.length - 10);
      console.log(`  ✅ OPENAI_API_KEY: ${preview}`);
    } else {
      console.log('  ❌ OPENAI_API_KEY nicht gesetzt');
    }
    console.log('');

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAiConfig();

