const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAllTasks() {
  console.log('Adding all tasks...');

  // Task 8
  await prisma.task.upsert({
    where: { id: 8 },
    update: {
      title: 'Tasks löschbar',
      description: 'Löschen Button im Tasks-Edit-Modal implementieren. Dadurch kann eine Task endgültig gelöscht werden. Implementieren wie beim Button Speichern, da das Design ähnlich sein kann.',
      status: 'improval'
    },
    create: {
      id: 8,
      title: 'Tasks löschbar',
      description: 'Löschen Button im Tasks-Edit-Modal implementieren. Dadurch kann eine Task endgültig gelöscht werden. Implementieren wie beim Button Speichern, da das Design ähnlich sein kann.',
      status: 'improval',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #8');

  // Task 10
  await prisma.task.upsert({
    where: { id: 10 },
    update: {
      title: 'Workflow Dokumentation erstellen',
      description: 'Erstellen einer Dokumentation für den Workflow der Taskabarbeitung anhand des Status und die Automatisierung davon.',
      status: 'improval'
    },
    create: {
      id: 10,
      title: 'Workflow Dokumentation erstellen',
      description: 'Erstellen einer Dokumentation für den Workflow der Taskabarbeitung anhand des Status und die Automatisierung davon.',
      status: 'improval',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #10');

  // Task 17
  await prisma.task.upsert({
    where: { id: 17 },
    update: {
      title: 'Worktracker -> To Dos',
      description: 'Info Icon bei To Dos braucht einen Hover-Text. Der Text soll die Filterfunktion der Tabelle beschreiben. Benutzbar durch Klick auf die Titelzeile.',
      status: 'quality_control'
    },
    create: {
      id: 17,
      title: 'Worktracker -> To Dos',
      description: 'Info Icon bei To Dos braucht einen Hover-Text. Der Text soll die Filterfunktion der Tabelle beschreiben. Benutzbar durch Klick auf die Titelzeile.',
      status: 'quality_control',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #17');

  // Task 19
  await prisma.task.upsert({
    where: { id: 19 },
    update: {
      title: 'Filter Funktion bei Tabellen',
      description: 'Die Filter-Funktion bei Tabellen muss angepasst werden. Wenn User eine Spalte filtert, und dann den Text löscht, sollte die Filterung auch wieder aufgehoben werden. Aktuell muss man alle auswählen.',
      status: 'improval'
    },
    create: {
      id: 19,
      title: 'Filter Funktion bei Tabellen',
      description: 'Die Filter-Funktion bei Tabellen muss angepasst werden. Wenn User eine Spalte filtert, und dann den Text löscht, sollte die Filterung auch wieder aufgehoben werden. Aktuell muss man alle auswählen.',
      status: 'improval',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #19');

  // Task 23
  await prisma.task.upsert({
    where: { id: 23 },
    update: {
      title: 'Neuer Task erstellen-Kopie',
      description: 'Alle Felder sollen beim Modal Neuen Task erstellen vorausgefüllt werden können, wenn das Modal durch einen Button-Klick aufgerufen wird (z.B. von Requests Seite).',
      status: 'improval'
    },
    create: {
      id: 23,
      title: 'Neuer Task erstellen-Kopie',
      description: 'Alle Felder sollen beim Modal Neuen Task erstellen vorausgefüllt werden können, wenn das Modal durch einen Button-Klick aufgerufen wird (z.B. von Requests Seite).',
      status: 'improval',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #23');

  // Task 28
  await prisma.task.upsert({
    where: { id: 28 },
    update: {
      title: 'Worktracker -> To Dos',
      description: 'Die Tabelle mit allen Tasks soll in der Box To Dos angezeigt werden und nicht darunter. Die Box soll entsprechend größer gemacht werden.',
      status: 'in_progress'
    },
    create: {
      id: 28,
      title: 'Worktracker -> To Dos',
      description: 'Die Tabelle mit allen Tasks soll in der Box To Dos angezeigt werden und nicht darunter. Die Box soll entsprechend größer gemacht werden.',
      status: 'in_progress',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #28');

  // Task 30
  await prisma.task.upsert({
    where: { id: 30 },
    update: {
      title: 'Worktracker -> To Dos',
      description: 'Implementierung von Bild- und Dateianhängen',
      status: 'open'
    },
    create: {
      id: 30,
      title: 'Worktracker -> To Dos',
      description: 'Implementierung von Bild- und Dateianhängen',
      status: 'open',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #30');

  // Task 32
  await prisma.task.upsert({
    where: { id: 32 },
    update: {
      title: 'Integration von Cerebro in Task Management',
      description: 'Implementierung einer Möglichkeit, Cerebro-Artikel mit Tasks zu verknüpfen. Ähnlich wie die Implementierung von Cerebro in Requests.',
      status: 'improval'
    },
    create: {
      id: 32,
      title: 'Integration von Cerebro in Task Management',
      description: 'Implementierung einer Möglichkeit, Cerebro-Artikel mit Tasks zu verknüpfen. Ähnlich wie die Implementierung von Cerebro in Requests.',
      status: 'improval',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #32');

  // Task 33
  await prisma.task.upsert({
    where: { id: 33 },
    update: {
      title: 'Filter Teil 2 (Worktracker -> To Dos)',
      description: 'Speicherbare Filter',
      status: 'open'
    },
    create: {
      id: 33,
      title: 'Filter Teil 2 (Worktracker -> To Dos)',
      description: 'Speicherbare Filter',
      status: 'open',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #33');

  // Task 56
  await prisma.task.upsert({
    where: { id: 56 },
    update: {
      title: 'Results Limit',
      description: 'Begrenzung der Tabellenergebnisse',
      status: 'open'
    },
    create: {
      id: 56,
      title: 'Results Limit',
      description: 'Begrenzung der Tabellenergebnisse',
      status: 'open',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #56');

  // Task 57
  await prisma.task.upsert({
    where: { id: 57 },
    update: {
      title: 'Standardformat von Sidepanes',
      description: 'Anpassung der Sidepane-Formatierung',
      status: 'open'
    },
    create: {
      id: 57,
      title: 'Standardformat von Sidepanes',
      description: 'Anpassung der Sidepane-Formatierung',
      status: 'open',
      qualityControlId: 1,
      branchId: 1
    }
  });
  console.log('Added Task #57');

  console.log('All tasks added successfully!');
}

addAllTasks()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect()); 