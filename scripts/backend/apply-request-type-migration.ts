// Wendet die RequestType Enum-Erweiterung manuell an
// Falls die Migration bereits als "applied" markiert wurde, aber nicht ausgeführt wurde
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyRequestTypeMigration() {
  try {
    console.log('Prüfe aktuelle RequestType Enum-Werte...');
    
    // Prüfe aktuelle Werte
    const result = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT unnest(enum_range(NULL::"RequestType")) AS status;
    `;
    
    const existingValues = result.map(row => row.status);
    console.log('Vorhandene Werte:', existingValues.join(', '));
    
    const requiredValues = ['event', 'permit', 'buy_order', 'repair'];
    const missingValues = requiredValues.filter(v => !existingValues.includes(v));
    
    if (missingValues.length === 0) {
      console.log('\n✅ Alle Enum-Werte existieren bereits!');
      console.log('Migration wurde bereits angewendet.');
      return;
    }
    
    console.log(`\nFehlende Werte: ${missingValues.join(', ')}`);
    console.log('\nFüge fehlende Enum-Werte hinzu...');
    
    // Füge fehlende Werte hinzu
    // WICHTIG: Jeder ALTER TYPE ADD VALUE muss einzeln ausgeführt werden
    // PostgreSQL erlaubt mehrere in einer Transaktion nur bei PostgreSQL 12+
    for (const value of missingValues) {
      try {
        console.log(`  Füge "${value}" hinzu...`);
        await prisma.$executeRawUnsafe(`ALTER TYPE "RequestType" ADD VALUE '${value}';`);
        console.log(`  ✅ "${value}" hinzugefügt`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`  ⚠️  "${value}" existiert bereits (übersprungen)`);
        } else if (error.message.includes('cannot be run inside a transaction block')) {
          console.log(`  ❌ Fehler: PostgreSQL erlaubt ALTER TYPE nicht in einer Transaktion`);
          console.log(`  Führe manuell aus: ALTER TYPE "RequestType" ADD VALUE '${value}';`);
        } else {
          throw error;
        }
      }
    }
    
    // Prüfe nochmal
    console.log('\nPrüfe finalen Status...');
    const finalResult = await prisma.$queryRaw<Array<{ status: string }>>`
      SELECT unnest(enum_range(NULL::"RequestType")) AS status;
    `;
    
    const finalValues = finalResult.map(row => row.status);
    console.log('Finale Werte:', finalValues.join(', '));
    
    const stillMissing = requiredValues.filter(v => !finalValues.includes(v));
    if (stillMissing.length > 0) {
      console.log(`\n⚠️  Noch fehlende Werte: ${stillMissing.join(', ')}`);
      console.log('Diese müssen manuell hinzugefügt werden (außerhalb einer Transaktion).');
    } else {
      console.log('\n✅ Alle Enum-Werte erfolgreich hinzugefügt!');
    }
    
  } catch (error: any) {
    console.error('Fehler:', error.message);
    console.error('\nFalls der Fehler "cannot be run inside a transaction block" ist,');
    console.error('müssen die ALTER TYPE Befehle manuell in separaten Transaktionen ausgeführt werden.');
    console.error('\nFühre auf dem Server aus:');
    console.error('psql -U intranetuser -d intranet -c "ALTER TYPE \\"RequestType\\" ADD VALUE \'event\';"');
    console.error('psql -U intranetuser -d intranet -c "ALTER TYPE \\"RequestType\\" ADD VALUE \'permit\';"');
    console.error('psql -U intranetuser -d intranet -c "ALTER TYPE \\"RequestType\\" ADD VALUE \'buy_order\';"');
    console.error('psql -U intranetuser -d intranet -c "ALTER TYPE \\"RequestType\\" ADD VALUE \'repair\';"');
  } finally {
    await prisma.$disconnect();
  }
}

applyRequestTypeMigration();

