import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkFilter204() {
  try {
    const filter = await prisma.savedFilter.findUnique({
      where: { id: 204 },
      select: {
        id: true,
        name: true,
        userId: true,
        tableId: true,
        conditions: true,
        operators: true
      }
    });

    if (!filter) {
      console.log('❌ Filter ID 204 nicht gefunden!');
      return;
    }

    console.log('✅ Filter ID 204 gefunden:');
    console.log(JSON.stringify({
      id: filter.id,
      name: filter.name,
      userId: filter.userId,
      tableId: filter.tableId,
      conditions: filter.conditions.substring(0, 200) + '...',
      operators: filter.operators.substring(0, 200) + '...'
    }, null, 2));

    // Prüfe ob JSON valide ist
    try {
      const conditions = JSON.parse(filter.conditions);
      const operators = JSON.parse(filter.operators);
      console.log('\n✅ JSON ist valide:');
      console.log(`   Conditions: ${conditions.length} Bedingungen`);
      console.log(`   Operators: ${operators.length} Operatoren`);
    } catch (e) {
      console.error('\n❌ JSON-Parse Fehler:', e);
    }
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkFilter204();

