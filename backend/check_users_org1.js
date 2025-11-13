const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    // Finde alle Benutzer, die zu Organisation 1 gehören
    // (über WorkTime-Einträge)
    const users = await prisma.user.findMany({
      where: {
        workTimes: {
          some: {
            organizationId: 1
          }
        }
      },
      include: {
        workTimes: {
          where: {
            organizationId: 1
          },
          take: 1
        }
      }
    });

    console.log(`\n=== Benutzer mit WorkTime-Einträgen in Organisation 1 ===\n`);
    users.forEach(user => {
      console.log(`Username: ${user.username}, ID: ${user.id}, Name: ${user.firstName} ${user.lastName}`);
    });

    if (users.length === 0) {
      console.log('Keine Benutzer gefunden. Prüfe alle Benutzer...\n');
      const allUsers = await prisma.user.findMany({
        take: 10
      });
      allUsers.forEach(user => {
        console.log(`Username: ${user.username}, ID: ${user.id}`);
      });
    }

  } catch (error) {
    console.error('Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();


