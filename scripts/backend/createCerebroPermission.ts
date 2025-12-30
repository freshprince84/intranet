import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createCerebroPermission() {
  try {
    // Überprüfen, ob die Berechtigung bereits existiert
    const existingPermission = await prisma.permission.findFirst({
      where: {
        entity: 'cerebro',
        entityType: 'cerebro',
        roleId: 1 // Admin-Rolle
      }
    });

    if (existingPermission) {
      console.log('Berechtigung existiert bereits:', existingPermission);
      
      // Aktualisiere die Berechtigung auf 'both'
      const updatedPermission = await prisma.permission.update({
        where: { id: existingPermission.id },
        data: { accessLevel: 'both' }
      });
      
      console.log('Berechtigung aktualisiert:', updatedPermission);
    } else {
      // Neue Berechtigung erstellen
      const newPermission = await prisma.permission.create({
        data: {
          entity: 'cerebro',
          entityType: 'cerebro',
          accessLevel: 'both',
          roleId: 1 // Admin-Rolle
        }
      });
      
      console.log('Neue Berechtigung erstellt:', newPermission);
    }
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCerebroPermission()
  .then(() => console.log('Skript erfolgreich ausgeführt'))
  .catch(e => console.error('Fehler beim Ausführen des Skripts:', e)); 