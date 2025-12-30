/**
 * Script zum Auflisten aller Benutzer, die NICHT zu den Seed-Benutzern gehören
 * Diese können gelöscht werden, da sie nicht im Seed-File definiert sind
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed-Benutzer (diese dürfen NICHT gelöscht werden)
const SEED_USERNAMES = ['admin', 'rebeca-benitez', 'christina-di-biaso'];

async function listNonSeedUsers() {
  try {
    console.log('🔍 Suche nach Benutzern, die NICHT zu Seed-Benutzern gehören...\n');

    // Finde alle Benutzer außer Seed-Benutzern
    const allUsers = await prisma.user.findMany({
      where: {
        username: {
          notIn: SEED_USERNAMES
        }
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        active: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        username: 'asc'
      }
    });

    if (allUsers.length === 0) {
      console.log('✅ Keine Benutzer gefunden (außer Seed-Benutzern).');
      return;
    }

    console.log(`📋 Gefundene Benutzer (außer Seed-Benutzern): ${allUsers.length}\n`);
    console.log('='.repeat(80));
    console.log('ID  | Username                    | Name                    | Email                          | Aktiv');
    console.log('='.repeat(80));

    allUsers.forEach(user => {
      const id = user.id.toString().padEnd(4);
      const username = (user.username || '').padEnd(28);
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim().padEnd(24);
      const email = (user.email || '').padEnd(32);
      const active = user.active ? '✅' : '❌';
      
      console.log(`${id} | ${username} | ${name} | ${email} | ${active}`);
    });

    console.log('='.repeat(80));
    console.log(`\n📊 Zusammenfassung:`);
    console.log(`   Gesamt: ${allUsers.length}`);
    console.log(`   Aktiv: ${allUsers.filter(u => u.active).length}`);
    console.log(`   Inaktiv: ${allUsers.filter(u => !u.active).length}`);
    console.log(`\n💡 Diese Benutzer können gelöscht werden, da sie nicht im Seed-File definiert sind.`);
    console.log(`   Verwende: npx ts-node scripts/deleteInactiveUsers.ts (für inaktive)`);
    console.log(`   Oder: npx ts-node scripts/deleteNonSeedUsers.ts (für alle außer Seed-Benutzern)`);

  } catch (error) {
    console.error('❌ Fehler:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

listNonSeedUsers()
  .catch((e) => {
    console.error('💥 Fataler Fehler:', e);
    process.exit(1);
  });
