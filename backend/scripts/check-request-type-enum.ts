// Prüft ob die neuen RequestType Enum-Werte in der Datenbank existieren
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRequestTypeEnum() {
  try {
    // Prüfe direkt in der Datenbank
    const result = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT unnest(enum_range(NULL::"RequestType")) AS status;
    `;
    
    console.log('Vorhandene RequestType Werte:');
    result.forEach(row => {
      console.log(`  - ${row.status}`);
    });
    
    const requiredValues = ['event', 'permit', 'buy_order', 'repair'];
    const existingValues = result.map(row => row.status);
    
    console.log('\nPrüfe neue Werte:');
    const missingValues: string[] = [];
    
    requiredValues.forEach(value => {
      if (existingValues.includes(value)) {
        console.log(`  ✅ "${value}" existiert`);
      } else {
        console.log(`  ❌ "${value}" fehlt`);
        missingValues.push(value);
      }
    });
    
    if (missingValues.length > 0) {
      console.log('\n⚠️  Fehlende Enum-Werte gefunden!');
      console.log('\nFühre manuell aus (auf dem Server):');
      missingValues.forEach(value => {
        console.log(`ALTER TYPE "RequestType" ADD VALUE '${value}';`);
      });
      console.log('\nOder wende die Migration an:');
      console.log('npx prisma migrate deploy');
    } else {
      console.log('\n✅ Alle neuen Enum-Werte existieren bereits!');
    }
  } catch (error: any) {
    console.error('Fehler:', error.message);
    if (error.message.includes('invalid input value for enum')) {
      console.log('\n❌ Enum-Werte fehlen definitiv!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkRequestTypeEnum();

