// Fügt "potential" zum ReservationStatus Enum hinzu (falls nicht vorhanden)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addPotentialEnum() {
  try {
    // Prüfe zuerst ob es existiert
    const checkResult = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"ReservationStatus")) AS status;
    `;
    
    const hasPotential = checkResult.some(row => row.status === 'potential');
    
    if (hasPotential) {
      console.log('✅ "potential" existiert bereits im Enum!');
      return;
    }
    
    // Füge hinzu
    console.log('Füge "potential" zum Enum hinzu...');
    await prisma.$executeRawUnsafe('ALTER TYPE "ReservationStatus" ADD VALUE \'potential\';');
    
    console.log('✅ "potential" erfolgreich hinzugefügt!');
    
    // Prüfe nochmal
    const verifyResult = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"ReservationStatus")) AS status;
    `;
    
    console.log('\nAktuelle Enum-Werte:');
    verifyResult.forEach(row => {
      console.log(`  - ${row.status}`);
    });
    
  } catch (error) {
    console.error('Fehler:', error.message);
    
    // PostgreSQL erlaubt ALTER TYPE nur in einer Transaktion
    // Wenn das fehlschlägt, muss es manuell gemacht werden
    if (error.message.includes('cannot be run inside a transaction block')) {
      console.log('\n⚠️  PostgreSQL erlaubt ALTER TYPE nicht in einer Transaktion.');
      console.log('Führe manuell aus:');
      console.log('psql -h localhost -p 5432 -U postgres -d intranet -c "ALTER TYPE \\"ReservationStatus\\" ADD VALUE \'potential\';"');
      console.log('\nOder verbinde dich direkt mit psql und führe aus:');
      console.log('ALTER TYPE "ReservationStatus" ADD VALUE \'potential\';');
    }
  } finally {
    await prisma.$disconnect();
  }
}

addPotentialEnum();

