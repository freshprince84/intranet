// Prüft welche Branches welche phoneNumberId haben
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPhoneNumberIds() {
  try {
    const branches = await prisma.branch.findMany({
      where: {
        whatsappSettings: { not: null }
      },
      select: {
        id: true,
        name: true,
        whatsappSettings: true
      }
    });
    
    console.log('Phone Number IDs pro Branch:\n');
    
    const phoneNumberIdMap = {};
    
    for (const branch of branches) {
      if (branch.whatsappSettings) {
        const settings = branch.whatsappSettings || {};
        const phoneNumberId = settings.phoneNumberId;
        
        if (phoneNumberId) {
          if (!phoneNumberIdMap[phoneNumberId]) {
            phoneNumberIdMap[phoneNumberId] = [];
          }
          phoneNumberIdMap[phoneNumberId].push({
            branchId: branch.id,
            branchName: branch.name
          });
        }
        
        console.log(`Branch ${branch.id} (${branch.name}):`);
        console.log(`  - phoneNumberId: ${phoneNumberId || 'NICHT GESETZT'}`);
        console.log('');
      }
    }
    
    console.log('\n=== DUPLIKATE (mehrere Branches mit gleicher phoneNumberId) ===\n');
    
    let hasDuplicates = false;
    for (const [phoneNumberId, branches] of Object.entries(phoneNumberIdMap)) {
      if (branches.length > 1) {
        hasDuplicates = true;
        console.log(`⚠️  phoneNumberId "${phoneNumberId}" wird von ${branches.length} Branches verwendet:`);
        branches.forEach(b => {
          console.log(`     - Branch ${b.branchId} (${b.branchName})`);
        });
        console.log('');
      }
    }
    
    if (!hasDuplicates) {
      console.log('✅ Keine Duplikate gefunden - jede phoneNumberId ist eindeutig.');
    }
    
    // Prüfe spezifisch für die problematische phoneNumberId
    const problemPhoneNumberId = '852832151250618';
    console.log(`\n=== Prüfe phoneNumberId "${problemPhoneNumberId}" ===\n`);
    
    if (phoneNumberIdMap[problemPhoneNumberId]) {
      console.log(`Gefundene Branches:`);
      phoneNumberIdMap[problemPhoneNumberId].forEach(b => {
        console.log(`  - Branch ${b.branchId} (${b.branchName})`);
      });
      
      if (phoneNumberIdMap[problemPhoneNumberId].length > 1) {
        console.log(`\n❌ PROBLEM: Diese phoneNumberId wird von mehreren Branches verwendet!`);
        console.log(`Der erste gefundene Branch wird verwendet (kann falsch sein).`);
      }
    } else {
      console.log(`❌ Diese phoneNumberId wurde nicht gefunden!`);
    }
    
  } catch (error) {
    console.error('Fehler:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkPhoneNumberIds();



