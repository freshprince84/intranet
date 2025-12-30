import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createPayrollPermission() {
  try {
    // Berechtigung für die Lohnabrechnung
    const payrollPermission = {
      entity: 'payroll',
      entityType: 'payroll',
      accessLevel: 'both' // read und write
    };

    // Überprüfen, ob die Berechtigung bereits existiert
    const existingPermission = await prisma.permission.findFirst({
      where: {
        entity: payrollPermission.entity,
        entityType: payrollPermission.entityType,
        roleId: 1 // Admin-Rolle
      }
    });

    if (existingPermission) {
      console.log(`Berechtigung für ${payrollPermission.entity} existiert bereits:`, existingPermission);
      
      // Aktualisiere die Berechtigung auf die gewünschte Ebene
      if (existingPermission.accessLevel !== payrollPermission.accessLevel) {
        const updatedPermission = await prisma.permission.update({
          where: { id: existingPermission.id },
          data: { accessLevel: payrollPermission.accessLevel }
        });
        
        console.log(`Berechtigung für ${payrollPermission.entity} aktualisiert:`, updatedPermission);
      }
    } else {
      // Neue Berechtigung erstellen
      const newPermission = await prisma.permission.create({
        data: {
          entity: payrollPermission.entity,
          entityType: payrollPermission.entityType,
          accessLevel: payrollPermission.accessLevel,
          roleId: 1 // Admin-Rolle
        }
      });
      
      console.log(`Neue Berechtigung für ${payrollPermission.entity} erstellt:`, newPermission);
    }

    // Auch Berechtigung für HR-Rolle erstellen, falls vorhanden
    const hrRole = await prisma.role.findFirst({
      where: {
        name: 'HR'
      }
    });

    if (hrRole) {
      const existingHrPermission = await prisma.permission.findFirst({
        where: {
          entity: payrollPermission.entity,
          entityType: payrollPermission.entityType,
          roleId: hrRole.id
        }
      });

      if (!existingHrPermission) {
        const newHrPermission = await prisma.permission.create({
          data: {
            entity: payrollPermission.entity,
            entityType: payrollPermission.entityType,
            accessLevel: payrollPermission.accessLevel,
            roleId: hrRole.id
          }
        });
        
        console.log(`Neue Berechtigung für ${payrollPermission.entity} für HR-Rolle erstellt:`, newHrPermission);
      }
    }

    console.log('Berechtigungen erfolgreich erstellt/aktualisiert.');
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPayrollPermission()
  .then(() => console.log('Script abgeschlossen'))
  .catch(error => console.error('Script-Fehler:', error)); 