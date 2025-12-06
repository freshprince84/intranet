// Prüft AI-Konfiguration für alle Branches
const { PrismaClient } = require('@prisma/client');
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
    
    console.log('AI-Konfiguration für alle Branches:\n');
    
    for (const branch of branches) {
      const settings = branch.whatsappSettings || {};
      const aiConfig = settings.ai;
      
      console.log(`Branch ${branch.id} (${branch.name}):`);
      console.log(`  - AI Config vorhanden: ${!!aiConfig}`);
      if (aiConfig) {
        console.log(`  - enabled: ${aiConfig.enabled}`);
        console.log(`  - model: ${aiConfig.model || 'nicht gesetzt'}`);
        console.log(`  - systemPrompt vorhanden: ${!!aiConfig.systemPrompt}`);
        console.log(`  - rules: ${(aiConfig.rules && aiConfig.rules.length) || 0}`);
      } else {
        console.log(`  - ❌ KEINE AI-KONFIGURATION!`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Fehler:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAiConfig();

