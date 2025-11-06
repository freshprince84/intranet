#!/usr/bin/env node
/**
 * Import-Skript für Daten aus dem alten Intranet-System
 * 
 * Importiert Branches, Roles, Users, User-Branches, User-Roles, Requests und Cerebro-Artikel
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Pfade
const IMPORT_DIR = path.join(process.cwd(), '..', 'import_data');

interface ImportStats {
  branches: { created: number; skipped: number };
  roles: { created: number; skipped: number };
  users: { created: number; skipped: number };
  userBranches: { created: number; skipped: number };
  userRoles: { created: number; skipped: number };
  requests: { created: number; skipped: number };
  cerebro: { created: number; skipped: number };
  tasks: { created: number; skipped: number };
}

// Mapping: old_id -> new_id
const idMappings = {
  branches: new Map<string, number>(),
  roles: new Map<string, number>(),
  users: new Map<string, number>(),
};

// Organisation ID für La Familia Hostel
const LA_FAMILIA_ORG_ID = 1;

async function ensureOrganization() {
  console.log('\n🏢 Stelle sicher, dass Organisation "La Familia Hostel" (ID 1) existiert...');
  
  // Prüfe ob Organisation mit ID 1 existiert
  let org = await prisma.organization.findUnique({
    where: { id: LA_FAMILIA_ORG_ID }
  });
  
  if (org && org.name === 'la-familia-hostel') {
    console.log(`  ✓ Organisation bereits vorhanden: ${org.displayName} (ID: ${org.id})`);
    return org;
  }
  
  // Falls Organisation mit ID 1 existiert aber falscher Name, müssen wir umbenennen
  if (org && org.name !== 'la-familia-hostel') {
    console.log(`  ⚠️  Organisation mit ID 1 hat anderen Namen (${org.name}), benenne um...`);
    // Prüfe ob Ziel-Organisation bereits existiert
    const conflictingOrg = await prisma.organization.findUnique({
      where: { name: 'la-familia-hostel' }
    });
    if (conflictingOrg) {
      await prisma.organization.delete({ where: { name: 'la-familia-hostel' } });
    }
    org = await prisma.organization.update({
      where: { id: LA_FAMILIA_ORG_ID },
      data: {
        name: 'la-familia-hostel',
        displayName: 'La Familia Hostel',
        domain: 'lafamilia-hostel.com',
        isActive: true,
        maxUsers: 1000,
        subscriptionPlan: 'enterprise'
      }
    });
    console.log(`  ✓ Organisation umbenannt: ${org.displayName} (ID: ${org.id})`);
    return org;
  }
  
  // Prüfe ob Organisation mit Namen existiert
  const orgByName = await prisma.organization.findUnique({
    where: { name: 'la-familia-hostel' }
  });
  
  if (orgByName) {
    if (orgByName.id !== LA_FAMILIA_ORG_ID) {
      console.log(`  ⚠️  Organisation existiert mit ID ${orgByName.id}, muss ID ${LA_FAMILIA_ORG_ID} haben`);
      // Setze Sequenz zurück und erstelle neu
      await prisma.organization.delete({ where: { id: orgByName.id } });
    } else {
      console.log(`  ✓ Organisation bereits vorhanden: ${orgByName.displayName} (ID: ${orgByName.id})`);
      return orgByName;
    }
  }
  
  // Setze Sequenz zurück falls nötig
  const maxId = await prisma.$queryRaw<[{ max: bigint | null }]>`
    SELECT MAX(id) as max FROM "Organization"
  `;
  if (maxId[0].max && maxId[0].max >= LA_FAMILIA_ORG_ID) {
    await prisma.$executeRaw`SELECT setval('"Organization_id_seq"', ${LA_FAMILIA_ORG_ID - 1}, true)`;
  }
  
  // Erstelle Organisation mit ID 1
  org = await prisma.organization.create({
    data: {
      name: 'la-familia-hostel',
      displayName: 'La Familia Hostel',
      domain: 'lafamilia-hostel.com',
      isActive: true,
      maxUsers: 1000,
      subscriptionPlan: 'enterprise'
    }
  });
  
  console.log(`  ✓ Organisation erstellt: ${org.displayName} (ID: ${org.id})`);
  return org;
}

function loadJsonFile(filename: string): any[] {
  const filePath = path.join(IMPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Datei nicht gefunden: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function importBranches(stats: ImportStats) {
  console.log('\n📂 Importiere Branches...');
  const branches = loadJsonFile('branches.json');
  
  for (const branch of branches) {
    try {
      // Prüfe ob bereits vorhanden
      const existing = await prisma.branch.findUnique({
        where: { name: branch.name }
      });
      
      if (existing) {
        console.log(`  ⏭️  Überspringe: ${branch.name} (bereits vorhanden)`);
        idMappings.branches.set(branch.old_id, existing.id);
        stats.branches.skipped++;
        continue;
      }
      
      const created = await prisma.branch.create({
        data: {
          name: branch.name,
          organizationId: LA_FAMILIA_ORG_ID,
        }
      });
      
      idMappings.branches.set(branch.old_id, created.id);
      console.log(`  ✓ ${branch.name} (ID: ${created.id})`);
      stats.branches.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Branch ${branch.name}:`, error.message);
    }
  }
}

async function importRoles(stats: ImportStats) {
  console.log('\n👤 Importiere Roles...');
  const roles = loadJsonFile('roles.json');
  
  for (const role of roles) {
    try {
      // Prüfe ob bereits vorhanden (mit organizationId = LA_FAMILIA_ORG_ID)
      const existing = await prisma.role.findUnique({
        where: {
          name_organizationId: {
            name: role.name,
            organizationId: LA_FAMILIA_ORG_ID
          }
        }
      });
      
      if (existing) {
        console.log(`  ⏭️  Überspringe: ${role.name} (bereits vorhanden)`);
        idMappings.roles.set(role.old_id, existing.id);
        stats.roles.skipped++;
        continue;
      }
      
      const created = await prisma.role.create({
        data: {
          name: role.name,
          description: role.description || null,
          organizationId: LA_FAMILIA_ORG_ID, // Roles gehören zur Organisation La Familia Hostel
        }
      });
      
      idMappings.roles.set(role.old_id, created.id);
      console.log(`  ✓ ${role.name} (ID: ${created.id})`);
      stats.roles.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Role ${role.name}:`, error.message);
    }
  }
}

async function importUsers(stats: ImportStats) {
  console.log('\n👥 Importiere Users...');
  const users = loadJsonFile('users.json');
  
  for (const user of users) {
    try {
      // Prüfe ob bereits vorhanden
      const existing = await prisma.user.findUnique({
        where: { username: user.username }
      });
      
      if (existing) {
        console.log(`  ⏭️  Überspringe: ${user.username} (bereits vorhanden)`);
        idMappings.users.set(user.old_id, existing.id);
        stats.users.skipped++;
        continue;
      }
      
      const created = await prisma.user.create({
        data: {
          username: user.username,
          email: user.email,
          password: user.password,
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          birthday: user.birthday ? new Date(user.birthday) : null,
          bankDetails: user.bankDetails || null,
          contract: user.contract || null,
          salary: user.salary || null,
          contractType: user.contractType || null,
          identificationNumber: user.identificationNumber || null,
        }
      });
      
      idMappings.users.set(user.old_id, created.id);
      console.log(`  ✓ ${user.username} (ID: ${created.id})`);
      stats.users.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei User ${user.username}:`, error.message);
    }
  }
}

async function importUserBranches(stats: ImportStats) {
  console.log('\n🔗 Importiere User-Branches...');
  const userBranches = loadJsonFile('user_branches.json');
  
  for (const ub of userBranches) {
    try {
      const userId = idMappings.users.get(ub.old_user_id);
      const branchId = idMappings.branches.get(ub.old_branch_id);
      
      if (!userId || !branchId) {
        console.log(`  ⏭️  Überspringe: User ${ub.old_user_id} / Branch ${ub.old_branch_id} (nicht gefunden)`);
        stats.userBranches.skipped++;
        continue;
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.usersBranches.findUnique({
        where: {
          userId_branchId: {
            userId: userId,
            branchId: branchId
          }
        }
      });
      
      if (existing) {
        // Update lastUsed falls nötig (nach Prisma Client Regeneration verfügbar)
        // @ts-ignore - lastUsed wird nach prisma generate verfügbar sein
        if (existing.lastUsed !== ub.lastUsed) {
          await prisma.usersBranches.update({
            where: { id: existing.id },
            // @ts-ignore - lastUsed wird nach prisma generate verfügbar sein
            data: { lastUsed: ub.lastUsed }
          });
          console.log(`  🔄 Update: User ${userId} / Branch ${branchId} (lastUsed: ${ub.lastUsed})`);
        } else {
          stats.userBranches.skipped++;
        }
        continue;
      }
      
      await prisma.usersBranches.create({
        data: {
          userId: userId,
          branchId: branchId,
          // @ts-ignore - lastUsed wird nach prisma generate verfügbar sein
          lastUsed: ub.lastUsed || false,
        }
      });
      
      stats.userBranches.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei User-Branch ${ub.old_user_id}/${ub.old_branch_id}:`, error.message);
    }
  }
}

async function importUserRoles(stats: ImportStats) {
  console.log('\n🔗 Importiere User-Roles...');
  const userRoles = loadJsonFile('user_roles.json');
  
  for (const ur of userRoles) {
    try {
      const userId = idMappings.users.get(ur.old_user_id);
      const roleId = idMappings.roles.get(ur.old_role_id);
      
      if (!userId || !roleId) {
        console.log(`  ⏭️  Überspringe: User ${ur.old_user_id} / Role ${ur.old_role_id} (nicht gefunden)`);
        stats.userRoles.skipped++;
        continue;
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: userId,
            roleId: roleId
          }
        }
      });
      
      if (existing) {
        // Update lastUsed falls nötig
        if (existing.lastUsed !== ur.lastUsed) {
          await prisma.userRole.update({
            where: { id: existing.id },
            data: { lastUsed: ur.lastUsed }
          });
          console.log(`  🔄 Update: User ${userId} / Role ${roleId} (lastUsed: ${ur.lastUsed})`);
        } else {
          stats.userRoles.skipped++;
        }
        continue;
      }
      
      await prisma.userRole.create({
        data: {
          userId: userId,
          roleId: roleId,
          lastUsed: ur.lastUsed || false,
        }
      });
      
      stats.userRoles.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei User-Role ${ur.old_user_id}/${ur.old_role_id}:`, error.message);
    }
  }
}

async function importRequests(stats: ImportStats) {
  console.log('\n📋 Importiere Requests...');
  const requests = loadJsonFile('requests.json');
  
  for (const req of requests) {
    try {
      const requesterId = idMappings.users.get(req.old_requester_id);
      const responsibleId = idMappings.users.get(req.old_responsible_id);
      const branchId = req.old_branch_id ? idMappings.branches.get(req.old_branch_id) : null;
      
      if (!requesterId || !responsibleId) {
        console.log(`  ⏭️  Überspringe: Request ${req.old_id} (User-IDs nicht gefunden)`);
        stats.requests.skipped++;
        continue;
      }
      
      // Falls kein Branch, verwende ersten Branch des Requesters
      let finalBranchId = branchId;
      if (!finalBranchId) {
        const userBranch = await prisma.usersBranches.findFirst({
          where: { userId: requesterId }
        });
        if (userBranch) {
          finalBranchId = userBranch.branchId;
        } else {
          console.log(`  ⏭️  Überspringe: Request ${req.old_id} (kein Branch gefunden)`);
          stats.requests.skipped++;
          continue;
        }
      }
      
      // Prüfe auf Duplikat (gleicher Titel + Organization)
      const existingRequest = await prisma.request.findFirst({
        where: {
          title: req.title,
          organizationId: LA_FAMILIA_ORG_ID
        }
      });
      
      if (existingRequest) {
        console.log(`  ⏭️  Überspringe: Request "${req.title}" (bereits vorhanden, ID: ${existingRequest.id})`);
        stats.requests.skipped++;
        continue;
      }
      
      await prisma.request.create({
        data: {
          title: req.title,
          description: req.description || null,
          status: req.status || 'approval',
          requesterId: requesterId,
          responsibleId: responsibleId,
          branchId: finalBranchId!,
          organizationId: LA_FAMILIA_ORG_ID,
          dueDate: req.dueDate ? new Date(req.dueDate) : null,
          createTodo: req.createTodo || false,
        }
      });
      
      stats.requests.created++;
      if (stats.requests.created % 50 === 0) {
        console.log(`  ... ${stats.requests.created} Requests importiert`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Request ${req.old_id}:`, error.message);
    }
  }
}

async function importCerebro(stats: ImportStats) {
  console.log('\n🧠 Importiere Cerebro-Artikel...');
  const cerebro = loadJsonFile('cerebro.json');
  
  for (const article of cerebro) {
    try {
      let authorId = null;
      
      // Versuche zuerst über old_author_id
      if (article.old_author_id) {
        authorId = idMappings.users.get(article.old_author_id);
      }
      
      // Falls nicht gefunden, suche über author_name
      if (!authorId && article.author_name) {
        // Suche User mit Namen
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { firstName: { contains: article.author_name.split(' ')[0] } },
              { lastName: { contains: article.author_name.split(' ')[0] } },
            ]
          }
        });
        if (user) {
          authorId = user.id;
        }
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.cerebroCarticle.findUnique({
        where: { slug: article.slug }
      });
      
      if (existing) {
        console.log(`  ⏭️  Überspringe: ${article.title} (bereits vorhanden)`);
        stats.cerebro.skipped++;
        continue;
      }
      
      // createdById ist Required - falls kein Author gefunden, verwende ersten Admin-User
      if (!authorId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            roles: {
              some: {
                role: {
                  name: { in: ['Admin', 'Owner'] }
                }
              }
            }
          }
        });
        if (adminUser) {
          authorId = adminUser.id;
          console.log(`  ⚠️  Kein Autor gefunden für "${article.title}", verwende Admin-User`);
        } else {
          console.log(`  ⚠️  Kein Autor gefunden für "${article.title}", überspringe`);
          stats.cerebro.skipped++;
          continue;
        }
      }
      
      await prisma.cerebroCarticle.create({
        data: {
          title: article.title,
          content: article.content || '',
          slug: article.slug,
          createdById: authorId,
          organizationId: LA_FAMILIA_ORG_ID,
          isPublished: true, // Alle importierten Artikel als published markieren
          createdAt: article.createdAt ? new Date(article.createdAt) : new Date(),
        }
      });
      
      console.log(`  ✓ ${article.title}`);
      stats.cerebro.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Cerebro-Artikel ${article.title}:`, error.message);
    }
  }
}

async function importTasks(stats: ImportStats) {
  console.log('\n✅ Importiere Tasks...');
  const tasks = loadJsonFile('tasks.json');
  
  // Hole ersten User als Fallback für qualityControlId (ist required)
  // User haben keine direkte organizationId, daher nehmen wir einfach den ersten importierten User
  const fallbackUser = await prisma.user.findFirst({
    orderBy: { id: 'asc' }
  });
  
  if (!fallbackUser) {
    console.error('  ❌ Kein User gefunden für Fallback! Tasks können nicht importiert werden.');
    return;
  }
  
  // Hole ersten Branch der Organisation als Fallback für branchId (ist required)
  const fallbackBranch = await prisma.branch.findFirst({
    where: { organizationId: LA_FAMILIA_ORG_ID },
    orderBy: { id: 'asc' }
  });
  
  if (!fallbackBranch) {
    console.error('  ❌ Kein Branch gefunden für Fallback! Tasks können nicht importiert werden.');
    return;
  }
  
  for (const task of tasks) {
    try {
      // Mappe IDs
      const responsibleId = task.old_responsible_id ? idMappings.users.get(task.old_responsible_id) : null;
      
      // Quality Control ID (required) - verwende Fallback wenn nicht vorhanden
      let qualityControlId = fallbackUser.id;
      if (task.old_quality_control_id && task.old_quality_control_id !== '0' && task.old_quality_control_id !== '') {
        const mappedQcId = idMappings.users.get(task.old_quality_control_id);
        if (mappedQcId) {
          qualityControlId = mappedQcId;
        }
      }
      
      // Branch-ID mappen (required)
      let branchId = fallbackBranch.id;
      if (task.old_branch_id && task.old_branch_id !== '0' && task.old_branch_id !== '') {
        const mappedBranchId = idMappings.branches.get(task.old_branch_id);
        if (mappedBranchId) {
          branchId = mappedBranchId;
        }
      }
      
      // Role-ID mappen (optional)
      const roleId = task.old_role_id ? idMappings.roles.get(task.old_role_id) : null;
      
      // Datum konvertieren
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const createdAt = task.createdAt ? new Date(task.createdAt) : new Date();
      
      // Prüfe auf Duplikat (gleicher Titel + Organization)
      const existingTask = await prisma.task.findFirst({
        where: {
          title: task.title || 'Unbenannter Task',
          organizationId: LA_FAMILIA_ORG_ID
        }
      });
      
      if (existingTask) {
        console.log(`  ⏭️  Überspringe: Task "${task.title || 'Unbenannter Task'}" (bereits vorhanden, ID: ${existingTask.id})`);
        stats.tasks.skipped++;
        continue;
      }
      
      await prisma.task.create({
        data: {
          title: task.title || 'Unbenannter Task',
          description: task.description || null,
          status: task.status || 'open',
          responsibleId: responsibleId || null,
          qualityControlId: qualityControlId,
          branchId: branchId,
          roleId: roleId || null,
          dueDate: dueDate,
          organizationId: LA_FAMILIA_ORG_ID,
          createdAt: createdAt,
        }
      });
      
      if (stats.tasks.created % 50 === 0) {
        console.log(`  ... ${stats.tasks.created} Tasks importiert`);
      }
      stats.tasks.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Task ${task.old_id}:`, error.message);
      stats.tasks.skipped++;
    }
  }
  
  if (stats.tasks.created > 0) {
    console.log(`  ... ${stats.tasks.created} Tasks importiert`);
  }
}

async function main() {
  console.log('🚀 Starte Datenimport...\n');
  
  const stats: ImportStats = {
    branches: { created: 0, skipped: 0 },
    roles: { created: 0, skipped: 0 },
    users: { created: 0, skipped: 0 },
    userBranches: { created: 0, skipped: 0 },
    userRoles: { created: 0, skipped: 0 },
    requests: { created: 0, skipped: 0 },
    cerebro: { created: 0, skipped: 0 },
    tasks: { created: 0, skipped: 0 },
  };
  
  try {
    // Stelle sicher, dass Organisation existiert
    await ensureOrganization();
    
    // Wichtige Reihenfolge beachten!
    await importBranches(stats);
    await importRoles(stats);
    await importUsers(stats);
    await importUserBranches(stats);
    await importUserRoles(stats);
    await importRequests(stats);
    await importCerebro(stats);
    await importTasks(stats);
    
    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import-Zusammenfassung:');
    console.log('='.repeat(60));
    console.log(`Branches:      ${stats.branches.created} erstellt, ${stats.branches.skipped} übersprungen`);
    console.log(`Roles:         ${stats.roles.created} erstellt, ${stats.roles.skipped} übersprungen`);
    console.log(`Users:         ${stats.users.created} erstellt, ${stats.users.skipped} übersprungen`);
    console.log(`User-Branches: ${stats.userBranches.created} erstellt, ${stats.userBranches.skipped} übersprungen`);
    console.log(`User-Roles:    ${stats.userRoles.created} erstellt, ${stats.userRoles.skipped} übersprungen`);
    console.log(`Requests:      ${stats.requests.created} erstellt, ${stats.requests.skipped} übersprungen`);
    console.log(`Cerebro:       ${stats.cerebro.created} erstellt, ${stats.cerebro.skipped} übersprungen`);
    console.log(`Tasks:         ${stats.tasks.created} erstellt, ${stats.tasks.skipped} übersprungen`);
    console.log('='.repeat(60));
    console.log('✅ Import abgeschlossen!');
    
  } catch (error) {
    console.error('❌ Fehler beim Import:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

