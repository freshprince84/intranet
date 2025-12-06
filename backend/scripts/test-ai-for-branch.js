// Testet AI-Konfiguration für einen spezifischen Branch
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAiForBranch() {
  try {
    const branchId = 3; // Manila
    
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { 
        id: true,
        name: true,
        whatsappSettings: true 
      }
    });
    
    if (!branch) {
      console.log(`Branch ${branchId} nicht gefunden!`);
      return;
    }
    
    console.log(`Branch ${branch.id} (${branch.name}):\n`);
    
    const settings = branch.whatsappSettings || {};
    const aiConfig = settings.ai;
    
    console.log('WhatsApp Settings:');
    console.log(`  - Provider: ${settings.provider || 'nicht gesetzt'}`);
    console.log(`  - PhoneNumberId: ${settings.phoneNumberId || 'nicht gesetzt'}`);
    console.log(`  - API Key vorhanden: ${!!settings.apiKey}`);
    console.log('');
    
    console.log('AI-Konfiguration:');
    if (!aiConfig) {
      console.log('  - ❌ KEINE AI-KONFIGURATION!');
      return;
    }
    
    console.log(`  - enabled: ${aiConfig.enabled}`);
    console.log(`  - model: ${aiConfig.model || 'nicht gesetzt'}`);
    console.log(`  - systemPrompt: ${aiConfig.systemPrompt ? `vorhanden (${aiConfig.systemPrompt.length} Zeichen)` : 'nicht gesetzt'}`);
    console.log(`  - rules: ${(aiConfig.rules && aiConfig.rules.length) || 0}`);
    console.log(`  - sources: ${(aiConfig.sources && aiConfig.sources.length) || 0}`);
    console.log(`  - temperature: ${aiConfig.temperature || 'nicht gesetzt'}`);
    console.log(`  - maxTokens: ${aiConfig.maxTokens || 'nicht gesetzt'}`);
    console.log('');
    
    // Prüfe ob enabled wirklich true ist
    if (aiConfig.enabled === true) {
      console.log('✅ AI ist aktiviert!');
    } else if (aiConfig.enabled === false) {
      console.log('❌ AI ist deaktiviert!');
    } else {
      console.log('⚠️  enabled ist undefined (wird als aktiviert behandelt)');
    }
    
    // Prüfe ob alle notwendigen Settings vorhanden sind
    console.log('');
    console.log('Prüfung:');
    if (!settings.apiKey) {
      console.log('  ⚠️  API Key fehlt!');
    }
    if (!settings.phoneNumberId) {
      console.log('  ⚠️  PhoneNumberId fehlt!');
    }
    if (!aiConfig.model) {
      console.log('  ⚠️  AI Model fehlt!');
    }
    
  } catch (error) {
    console.error('Fehler:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testAiForBranch();

