import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Löscht alle Nóminas (EmployeePayroll) für November 2025
 * 
 * Ein Payroll wird gelöscht, wenn:
 * - periodStart im November 2025 liegt (2025-11-01 bis 2025-11-30)
 * - ODER periodEnd im November 2025 liegt
 * - ODER die Periode den November 2025 überschneidet
 */
async function deleteNovember2025Payrolls() {
  try {
    console.log('🔍 Suche nach Nóminas für November 2025...');

    // Definiere November 2025
    const novemberStart = new Date('2025-11-01T00:00:00.000Z');
    const novemberEnd = new Date('2025-11-30T23:59:59.999Z');

    // Finde alle Payrolls, die November 2025 überschneiden
    const payrollsToDelete = await prisma.employeePayroll.findMany({
      where: {
        OR: [
          // periodStart liegt im November
          {
            periodStart: {
              gte: novemberStart,
              lte: novemberEnd
            }
          },
          // periodEnd liegt im November
          {
            periodEnd: {
              gte: novemberStart,
              lte: novemberEnd
            }
          },
          // Periode überschneidet November (startet vor November, endet nach November)
          {
            periodStart: { lte: novemberStart },
            periodEnd: { gte: novemberEnd }
          },
          // Periode überschneidet November (startet vor November, endet im November)
          {
            periodStart: { lte: novemberStart },
            periodEnd: {
              gte: novemberStart,
              lte: novemberEnd
            }
          },
          // Periode überschneidet November (startet im November, endet nach November)
          {
            periodStart: {
              gte: novemberStart,
              lte: novemberEnd
            },
            periodEnd: { gte: novemberEnd }
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    console.log(`📊 Gefunden: ${payrollsToDelete.length} Nóminas für November 2025`);

    if (payrollsToDelete.length === 0) {
      console.log('✅ Keine Nóminas für November 2025 gefunden. Nichts zu löschen.');
      return;
    }

    // Zeige Details der zu löschenden Payrolls
    console.log('\n📋 Zu löschende Nóminas:');
    payrollsToDelete.forEach((payroll, index) => {
      console.log(
        `  ${index + 1}. ID: ${payroll.id} | User: ${payroll.user.firstName} ${payroll.user.lastName} (${payroll.user.username}) | ` +
        `Periode: ${payroll.periodStart.toISOString().split('T')[0]} bis ${payroll.periodEnd.toISOString().split('T')[0]}`
      );
    });

    // Lösche alle gefundenen Payrolls
    const deleteResult = await prisma.employeePayroll.deleteMany({
      where: {
        id: {
          in: payrollsToDelete.map(p => p.id)
        }
      }
    });

    console.log(`\n✅ Erfolgreich gelöscht: ${deleteResult.count} Nóminas für November 2025`);
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Nóminas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Script ausführen
deleteNovember2025Payrolls()
  .then(() => {
    console.log('\n✅ Script erfolgreich abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script fehlgeschlagen:', error);
    process.exit(1);
  });


