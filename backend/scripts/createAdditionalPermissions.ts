import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function createAdditionalPermissions() {
  try {
    // Array aller benötigten Berechtigungen für Cerebro
    const requiredPermissions = [
      { entity: 'cerebro', entityType: 'cerebro', accessLevel: 'both' }, // Hauptberechtigung
      { entity: 'cerebro_media', entityType: 'cerebro', accessLevel: 'both' }, // Medienberechtigung
      { entity: 'cerebro_links', entityType: 'cerebro', accessLevel: 'both' }, // Linksberechtigung
    ];

    for (const permission of requiredPermissions) {
      // Überprüfen, ob die Berechtigung bereits existiert
      const existingPermission = await prisma.permission.findFirst({
        where: {
          entity: permission.entity,
          entityType: permission.entityType,
          roleId: 1 // Admin-Rolle
        }
      });

      if (existingPermission) {
        console.log(`Berechtigung für ${permission.entity} existiert bereits:`, existingPermission);
        
        // Aktualisiere die Berechtigung auf die gewünschte Ebene
        if (existingPermission.accessLevel !== permission.accessLevel) {
          const updatedPermission = await prisma.permission.update({
            where: { id: existingPermission.id },
            data: { accessLevel: permission.accessLevel }
          });
          
          console.log(`Berechtigung für ${permission.entity} aktualisiert:`, updatedPermission);
        }
      } else {
        // Neue Berechtigung erstellen
        const newPermission = await prisma.permission.create({
          data: {
            entity: permission.entity,
            entityType: permission.entityType,
            accessLevel: permission.accessLevel,
            roleId: 1 // Admin-Rolle
          }
        });
        
        console.log(`Neue Berechtigung für ${permission.entity} erstellt:`, newPermission);
      }
    }
  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdditionalPermissions()
  .then(() => console.log('Skript erfolgreich ausgeführt'))
  .catch(e => console.error('Fehler beim Ausführen des Skripts:', e)); 