// Prüft ob "potential" im ReservationStatus Enum existiert
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnumStatus() {
  try {
    // Prüfe direkt in der Datenbank
    const result = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"ReservationStatus")) AS status;
    `;
    
    console.log('Vorhandene ReservationStatus Werte:');
    result.forEach(row => {
      console.log(`  - ${row.status}`);
    });
    
    const hasPotential = result.some(row => row.status === 'potential');
    
    if (hasPotential) {
      console.log('\n✅ "potential" existiert bereits im Enum!');
    } else {
      console.log('\n❌ "potential" fehlt im Enum!');
      console.log('\nFühre manuell aus:');
      console.log('ALTER TYPE "ReservationStatus" ADD VALUE \'potential\';');
    }
  } catch (error) {
    console.error('Fehler:', error.message);
    if (error.message.includes('invalid input value for enum')) {
      console.log('\n❌ "potential" fehlt definitiv im Enum!');
      console.log('\nFühre manuell aus:');
      console.log('ALTER TYPE "ReservationStatus" ADD VALUE \'potential\';');
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkEnumStatus();

