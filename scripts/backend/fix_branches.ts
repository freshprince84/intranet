#!/usr/bin/env node
/**
 * Korrigiert Branches: Ordnet Parque Poblado und Manila der Organisation 1 zu
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔧 Korrigiere Branches für Organisation "La Familia Hostel"...\n');
    
    // Finde Branches die zur Organisation gehören sollten
    const branchesToFix = [
      { name: 'Parque Poblado', oldId: '1' },
      { name: 'Manila', oldId: '2' }
    ];
    
    for (const branchInfo of branchesToFix) {
      const branch = await prisma.branch.findFirst({
        where: { name: branchInfo.name }
      });
      
      if (branch) {
        if (branch.organizationId !== 1) {
          await prisma.branch.update({
            where: { id: branch.id },
            data: { organizationId: 1 }
          });
          console.log(`✓ ${branchInfo.name} zur Organisation 1 zugeordnet`);
        } else {
          console.log(`⏭️  ${branchInfo.name} bereits korrekt zugeordnet`);
        }
      } else {
        console.log(`⚠️  ${branchInfo.name} nicht gefunden`);
      }
    }
    
    console.log('\n✅ Fertig!');
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

