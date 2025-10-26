import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFilters() {
  try {
    console.log('🔍 Suche nach "Aktuell"-Filtern...\n');

    const aktuellFilters = await prisma.savedFilter.findMany({
      where: {
        name: 'Aktuell'
      },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });

    console.log(`Gefundene "Aktuell"-Filter: ${aktuellFilters.length}\n`);

    for (const filter of aktuellFilters) {
      console.log(`Filter ID: ${filter.id}`);
      console.log(`User: ${filter.user.username} (${filter.user.email})`);
      console.log(`Table ID: ${filter.tableId}`);
      console.log(`Conditions: ${filter.conditions}`);
      console.log(`Operators: ${filter.operators || 'none'}`);
      console.log('---');
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFilters();

