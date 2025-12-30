#!/usr/bin/env node
/**
 * Bereinigt doppelte Requests und falsche Filter
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🧹 Bereinige doppelte Requests und falsche Filter...\n');
    
    // 1. Lösche Filter mit Übersetzungsschlüsseln
    console.log('🗑️  Lösche Filter mit Übersetzungsschlüsseln...');
    const deletedFilters = await prisma.savedFilter.deleteMany({
      where: {
        OR: [
          { name: 'tasks.filters.archive' },
          { name: 'tasks.filters.current' },
          { name: 'requests.filters.archiv' },
          { name: 'requests.filters.aktuell' }
        ]
      }
    });
    console.log(`✓ ${deletedFilters.count} falsche Filter gelöscht\n`);
    
    // 2. Prüfe doppelte Requests (gleicher Titel + Requester + Branch)
    console.log('🔍 Prüfe doppelte Requests...');
    const allRequests = await prisma.request.findMany({
      where: { organizationId: 1 },
      orderBy: { createdAt: 'asc' }
    });
    
    const seen = new Map<string, number[]>();
    const duplicates: number[] = [];
    
    for (const req of allRequests) {
      const key = `${req.title}|${req.requesterId}|${req.branchId}`;
      if (seen.has(key)) {
        seen.get(key)!.push(req.id);
        duplicates.push(req.id);
      } else {
        seen.set(key, [req.id]);
      }
    }
    
    if (duplicates.length > 0) {
      console.log(`⚠️  ${duplicates.length} doppelte Requests gefunden`);
      console.log('   Lösche Duplikate (behalte die ältesten)...');
      
      // Lösche alle außer dem ersten (ältesten) von jeder Gruppe
      for (const [key, ids] of seen.entries()) {
        if (ids.length > 1) {
          // Behalte den ersten (ältesten), lösche die restlichen
          const toDelete = ids.slice(1);
          await prisma.request.deleteMany({
            where: { id: { in: toDelete } }
          });
          console.log(`   - ${toDelete.length} Duplikate gelöscht für: ${key.split('|')[0]}`);
        }
      }
    } else {
      console.log('✓ Keine doppelten Requests gefunden');
    }
    
    // Finale Statistik
    const finalCount = await prisma.request.count({ where: { organizationId: 1 } });
    console.log(`\n✅ Fertig!`);
    console.log(`   - ${finalCount} Requests verbleiben`);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

