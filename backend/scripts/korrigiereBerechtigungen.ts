import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function korrigiereBerechtigungen() {
  try {
    console.log('Starte Berechtigungskorrektur...');

    // 1. Falsche Berechtigungen mit entityType: 'cerebro' finden und löschen
    const falscheBerechtigungen = await prisma.permission.findMany({
      where: {
        entityType: 'cerebro'
      }
    });

    console.log(`Gefundene falsche Berechtigungen: ${falscheBerechtigungen.length}`);

    // Löschen der falschen Berechtigungen
    if (falscheBerechtigungen.length > 0) {
      for (const berechtigung of falscheBerechtigungen) {
        await prisma.permission.delete({
          where: { id: berechtigung.id }
        });
        console.log(`Gelöschte Berechtigung: ID ${berechtigung.id}, Entity: ${berechtigung.entity}, EntityType: ${berechtigung.entityType}`);
      }
    }

    // 2. Überprüfen und erstellen der korrekten Berechtigungen
    const requiredPermissions = [
      { entity: 'cerebro', entityType: 'page', accessLevel: 'both' },        // Hauptberechtigung
      { entity: 'cerebro_media', entityType: 'page', accessLevel: 'both' },  // Medienberechtigung
      { entity: 'cerebro_links', entityType: 'page', accessLevel: 'both' }   // Linksberechtigung
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

    console.log('Berechtigungskorrektur abgeschlossen.');
  } catch (error) {
    console.error('Fehler bei der Berechtigungskorrektur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

korrigiereBerechtigungen()
  .then(() => console.log('Skript erfolgreich ausgeführt'))
  .catch(e => console.error('Fehler beim Ausführen des Skripts:', e)); 