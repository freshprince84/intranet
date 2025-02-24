const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Erstelle Admin-Rolle
  const adminRole = await prisma.role.create({
    data: {
      name: 'admin',
      description: 'Administrator mit allen Rechten'
    }
  });

  // Erstelle Hauptfiliale
  const mainBranch = await prisma.branch.create({
    data: {
      name: 'Hauptfiliale',
      address: 'Hauptstraße 1'
    }
  });

  // Erstelle Admin-Benutzer
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      roles: {
        create: {
          roleId: adminRole.id,
          lastUsed: true
        }
      },
      branches: {
        create: {
          branchId: mainBranch.id
        }
      }
    }
  });

  // Erstelle Basis-Berechtigungen für Admin
  const pages = ['dashboard', 'users', 'roles', 'branches', 'requests', 'tasks', 'settings'];
  for (const page of pages) {
    await prisma.permission.create({
      data: {
        roleId: adminRole.id,
        page: page,
        accessLevel: 'full'
      }
    });
  }

  console.log('Seed erfolgreich ausgeführt!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 