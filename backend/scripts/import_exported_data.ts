#!/usr/bin/env node
/**
 * Import-Skript für exportierte Datenbank-Daten
 * 
 * Importiert Daten aus export_data/, mit Schutz für Seed-Daten.
 * Seed-Daten werden identifiziert und NICHT überschrieben.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Pfade
const EXPORT_DIR = path.join(process.cwd(), 'export_data');

// ========================================
// SEED-DATEN DEFINITIONEN (wie im Export)
// ========================================

const SEED_ROLE_IDS = [1, 2, 999];
const SEED_ROLE_NAMES = ['Admin', 'User', 'Hamburger'];
const SEED_ORG_IDS = [1, 2];
const SEED_ORG_NAMES = ['la-familia-hostel', 'mosaik', 'default'];
const SEED_USERNAMES = ['admin', 'rebeca-benitez', 'christina-di-biaso'];
const SEED_BRANCH_NAMES = ['Parque Poblado', 'Manila', 'Sonnenhalden', 'Hauptsitz'];
const SEED_CLIENT_NAMES = ['Hampi', 'Heinz Hunziker', 'Rebeca Benitez', 'Stiven Pino', 'Urs Schmidlin'];
const SEED_DEMO_CLIENT_NAMES = ['Musterfirma GmbH', 'Max Müller', 'Beispiel AG', 'Tech Startup XYZ'];

interface ImportStats {
  organizations: { created: number; updated: number; skipped: number };
  roles: { created: number; updated: number; skipped: number };
  users: { created: number; updated: number; skipped: number };
  branches: { created: number; updated: number; skipped: number };
  clients: { created: number; updated: number; skipped: number };
  workTimes: { created: number; skipped: number };
  tasks: { created: number; skipped: number };
  requests: { created: number; skipped: number };
  cerebro: { created: number; skipped: number };
  userRoles: { created: number; skipped: number };
  userBranches: { created: number; skipped: number };
  permissions: { created: number; skipped: number };
}

// ID-Mappings für Referenzen
const idMappings = {
  organizations: new Map<number, number>(),
  roles: new Map<number, number>(),
  users: new Map<number, number>(),
  branches: new Map<number, number>(),
  clients: new Map<number, number>()
};

// ========================================
// HILFSFUNKTIONEN
// ========================================

function loadJsonFile(filename: string): any[] {
  const filePath = path.join(EXPORT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Datei nicht gefunden: ${filename}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function isSeedRole(role: any): boolean {
  return SEED_ROLE_IDS.includes(role.id) || 
         (SEED_ROLE_NAMES.includes(role.name) && role.organizationId === null);
}

function isSeedOrganization(org: any): boolean {
  return SEED_ORG_IDS.includes(org.id) || SEED_ORG_NAMES.includes(org.name);
}

function isSeedUser(user: any): boolean {
  return SEED_USERNAMES.includes(user.username);
}

function isSeedBranch(branch: any): boolean {
  return SEED_BRANCH_NAMES.includes(branch.name);
}

function isSeedClient(client: any): boolean {
  return SEED_CLIENT_NAMES.includes(client.name) || 
         SEED_DEMO_CLIENT_NAMES.includes(client.name);
}

// ========================================
// IMPORT-FUNKTIONEN
// ========================================

async function importOrganizations(stats: ImportStats) {
  console.log('\n🏢 Importiere Organisationen...');
  const orgs = loadJsonFile('organizations.json');
  
  for (const org of orgs) {
    try {
      // Prüfe ob Seed-Daten (sollte nicht vorkommen, aber sicherheitshalber)
      if (isSeedOrganization(org)) {
        console.log(`  ⏭️  Überspringe Seed-Organisation: ${org.name}`);
        stats.organizations.skipped++;
        continue;
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.organization.findUnique({
        where: { name: org.name }
      });
      
      if (existing) {
        // Update falls nötig
        await prisma.organization.update({
          where: { id: existing.id },
          data: {
            displayName: org.displayName,
            domain: org.domain,
            logo: org.logo,
            isActive: org.isActive,
            maxUsers: org.maxUsers,
            subscriptionPlan: org.subscriptionPlan,
            subscriptionEnd: org.subscriptionEnd ? new Date(org.subscriptionEnd) : null,
            settings: org.settings
          }
        });
        idMappings.organizations.set(org.id, existing.id);
        stats.organizations.updated++;
        console.log(`  🔄 Aktualisiert: ${org.name} (ID: ${existing.id})`);
      } else {
        // Erstelle neu
        const created = await prisma.organization.create({
          data: {
            name: org.name,
            displayName: org.displayName,
            domain: org.domain,
            logo: org.logo,
            isActive: org.isActive,
            maxUsers: org.maxUsers,
            subscriptionPlan: org.subscriptionPlan,
            subscriptionEnd: org.subscriptionEnd ? new Date(org.subscriptionEnd) : null,
            settings: org.settings
          }
        });
        idMappings.organizations.set(org.id, created.id);
        stats.organizations.created++;
        console.log(`  ✓ Erstellt: ${org.name} (ID: ${created.id})`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Organisation ${org.name}:`, error.message);
    }
  }
}

async function importRoles(stats: ImportStats) {
  console.log('\n👤 Importiere Rollen...');
  const roles = loadJsonFile('roles.json');
  
  for (const role of roles) {
    try {
      // Prüfe ob Seed-Daten
      if (isSeedRole(role)) {
        console.log(`  ⏭️  Überspringe Seed-Rolle: ${role.name}`);
        stats.roles.skipped++;
        continue;
      }
      
      // Mappe organizationId falls nötig
      let organizationId = role.organizationId;
      if (organizationId && idMappings.organizations.has(organizationId)) {
        organizationId = idMappings.organizations.get(organizationId)!;
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.role.findFirst({
        where: {
          name: role.name,
          organizationId: organizationId
        }
      });
      
      if (existing) {
        // Update falls nötig
        await prisma.role.update({
          where: { id: existing.id },
          data: {
            description: role.description
          }
        });
        idMappings.roles.set(role.id, existing.id);
        stats.roles.updated++;
        console.log(`  🔄 Aktualisiert: ${role.name} (ID: ${existing.id})`);
      } else {
        // Erstelle neu
        const created = await prisma.role.create({
          data: {
            name: role.name,
            description: role.description,
            organizationId: organizationId
          }
        });
        idMappings.roles.set(role.id, created.id);
        stats.roles.created++;
        console.log(`  ✓ Erstellt: ${role.name} (ID: ${created.id})`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Rolle ${role.name}:`, error.message);
    }
  }
}

async function importUsers(stats: ImportStats) {
  console.log('\n👥 Importiere Benutzer...');
  const users = loadJsonFile('users.json');
  
  for (const user of users) {
    try {
      // Prüfe ob Seed-Daten
      if (isSeedUser(user)) {
        console.log(`  ⏭️  Überspringe Seed-User: ${user.username}`);
        stats.users.skipped++;
        continue;
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.user.findUnique({
        where: { username: user.username }
      });
      
      if (existing) {
        // Update falls nötig (aber NICHT das Passwort!)
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            birthday: user.birthday ? new Date(user.birthday) : null,
            bankDetails: user.bankDetails,
            contract: user.contract,
            salary: user.salary,
            country: user.country,
            hourlyRate: user.hourlyRate ? parseFloat(user.hourlyRate) : null,
            language: user.language,
            normalWorkingHours: user.normalWorkingHours,
            payrollCountry: user.payrollCountry,
            approvedOvertimeHours: user.approvedOvertimeHours,
            contractType: user.contractType,
            monthlySalary: user.monthlySalary,
            employeeNumber: user.employeeNumber,
            identificationNumber: user.identificationNumber,
            taxIdentificationNumber: user.taxIdentificationNumber,
            active: user.active !== undefined ? user.active : true
          }
        });
        idMappings.users.set(user.id, existing.id);
        stats.users.updated++;
        console.log(`  🔄 Aktualisiert: ${user.username} (ID: ${existing.id})`);
      } else {
        // Erstelle neu
        const created = await prisma.user.create({
          data: {
            username: user.username,
            email: user.email,
            password: user.password,
            firstName: user.firstName,
            lastName: user.lastName,
            birthday: user.birthday ? new Date(user.birthday) : null,
            bankDetails: user.bankDetails,
            contract: user.contract,
            salary: user.salary,
            country: user.country,
            hourlyRate: user.hourlyRate ? parseFloat(user.hourlyRate) : null,
            language: user.language,
            normalWorkingHours: user.normalWorkingHours,
            payrollCountry: user.payrollCountry,
            approvedOvertimeHours: user.approvedOvertimeHours,
            contractType: user.contractType,
            monthlySalary: user.monthlySalary,
            employeeNumber: user.employeeNumber,
            identificationNumber: user.identificationNumber,
            taxIdentificationNumber: user.taxIdentificationNumber,
            active: user.active !== undefined ? user.active : true
          }
        });
        idMappings.users.set(user.id, created.id);
        stats.users.created++;
        console.log(`  ✓ Erstellt: ${user.username} (ID: ${created.id})`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei User ${user.username}:`, error.message);
    }
  }
}

async function importBranches(stats: ImportStats) {
  console.log('\n📂 Importiere Branches...');
  const branches = loadJsonFile('branches.json');
  
  for (const branch of branches) {
    try {
      // Prüfe ob Seed-Daten
      if (isSeedBranch(branch)) {
        console.log(`  ⏭️  Überspringe Seed-Branch: ${branch.name}`);
        stats.branches.skipped++;
        continue;
      }
      
      // Mappe organizationId falls nötig
      let organizationId = branch.organizationId;
      if (organizationId && idMappings.organizations.has(organizationId)) {
        organizationId = idMappings.organizations.get(organizationId)!;
      }
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.branch.findUnique({
        where: { name: branch.name }
      });
      
      if (existing) {
        // Update falls nötig
        await prisma.branch.update({
          where: { id: existing.id },
          data: {
            organizationId: organizationId
          }
        });
        idMappings.branches.set(branch.id, existing.id);
        stats.branches.updated++;
        console.log(`  🔄 Aktualisiert: ${branch.name} (ID: ${existing.id})`);
      } else {
        // Erstelle neu
        const created = await prisma.branch.create({
          data: {
            name: branch.name,
            organizationId: organizationId
          }
        });
        idMappings.branches.set(branch.id, created.id);
        stats.branches.created++;
        console.log(`  ✓ Erstellt: ${branch.name} (ID: ${created.id})`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Branch ${branch.name}:`, error.message);
    }
  }
}

async function importClients(stats: ImportStats) {
  console.log('\n👥 Importiere Clients...');
  const clients = loadJsonFile('clients.json');
  
  for (const client of clients) {
    try {
      // Prüfe ob Seed-Daten
      if (isSeedClient(client)) {
        console.log(`  ⏭️  Überspringe Seed-Client: ${client.name}`);
        stats.clients.skipped++;
        continue;
      }
      
      // Prüfe ob bereits vorhanden (basierend auf Name)
      const existing = await prisma.client.findFirst({
        where: { name: client.name }
      });
      
      if (existing) {
        // Update falls nötig
        await prisma.client.update({
          where: { id: existing.id },
          data: {
            company: client.company,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            isActive: client.isActive
          }
        });
        idMappings.clients.set(client.id, existing.id);
        stats.clients.updated++;
        console.log(`  🔄 Aktualisiert: ${client.name} (ID: ${existing.id})`);
      } else {
        // Erstelle neu
        const created = await prisma.client.create({
          data: {
            name: client.name,
            company: client.company,
            email: client.email,
            phone: client.phone,
            address: client.address,
            notes: client.notes,
            isActive: client.isActive
          }
        });
        idMappings.clients.set(client.id, created.id);
        stats.clients.created++;
        console.log(`  ✓ Erstellt: ${client.name} (ID: ${created.id})`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Client ${client.name}:`, error.message);
    }
  }
}

async function importWorkTimes(stats: ImportStats) {
  console.log('\n🕐 Importiere WorkTimes...');
  const workTimes = loadJsonFile('worktimes.json');
  
  for (const wt of workTimes) {
    try {
      // Mappe IDs
      const userId = idMappings.users.has(wt.userId) ? idMappings.users.get(wt.userId)! : wt.userId;
      const branchId = idMappings.branches.has(wt.branchId) ? idMappings.branches.get(wt.branchId)! : wt.branchId;
      const clientId = wt.clientId && idMappings.clients.has(wt.clientId) ? idMappings.clients.get(wt.clientId)! : wt.clientId;
      
      // Prüfe ob User/Branch existieren
      const userExists = await prisma.user.findUnique({ where: { id: userId } });
      const branchExists = await prisma.branch.findUnique({ where: { id: branchId } });
      
      if (!userExists || !branchExists) {
        console.log(`  ⏭️  Überspringe WorkTime (User/Branch nicht gefunden)`);
        stats.workTimes.skipped++;
        continue;
      }
      
      // Prüfe auf Duplikat (gleicher User, gleiche Startzeit)
      const existing = await prisma.workTime.findFirst({
        where: {
          userId: userId,
          startTime: new Date(wt.startTime)
        }
      });
      
      if (existing) {
        stats.workTimes.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.workTime.create({
        data: {
          userId: userId,
          branchId: branchId,
          startTime: new Date(wt.startTime),
          endTime: wt.endTime ? new Date(wt.endTime) : null,
          timezone: wt.timezone,
          clientId: clientId,
          notes: wt.notes,
          monthlyReportId: wt.monthlyReportId,
          organizationId: wt.organizationId && idMappings.organizations.has(wt.organizationId) 
            ? idMappings.organizations.get(wt.organizationId)! 
            : wt.organizationId
        }
      });
      
      stats.workTimes.created++;
      if (stats.workTimes.created % 50 === 0) {
        console.log(`  ... ${stats.workTimes.created} WorkTimes importiert`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei WorkTime:`, error.message);
      stats.workTimes.skipped++;
    }
  }
  
  if (stats.workTimes.created > 0) {
    console.log(`  ✓ ${stats.workTimes.created} WorkTimes importiert`);
  }
}

async function importTasks(stats: ImportStats) {
  console.log('\n✅ Importiere Tasks...');
  const tasks = loadJsonFile('tasks.json');
  
  for (const task of tasks) {
    try {
      // Mappe IDs
      const responsibleId = task.responsibleId && idMappings.users.has(task.responsibleId) 
        ? idMappings.users.get(task.responsibleId)! 
        : task.responsibleId;
      const qualityControlId = idMappings.users.has(task.qualityControlId) 
        ? idMappings.users.get(task.qualityControlId)! 
        : task.qualityControlId;
      const branchId = idMappings.branches.has(task.branchId) 
        ? idMappings.branches.get(task.branchId)! 
        : task.branchId;
      const roleId = task.roleId && idMappings.roles.has(task.roleId) 
        ? idMappings.roles.get(task.roleId)! 
        : task.roleId;
      
      // Prüfe ob bereits vorhanden (gleicher Titel + Organization)
      const existing = await prisma.task.findFirst({
        where: {
          title: task.title,
          organizationId: task.organizationId && idMappings.organizations.has(task.organizationId)
            ? idMappings.organizations.get(task.organizationId)!
            : task.organizationId
        }
      });
      
      if (existing) {
        stats.tasks.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          status: task.status,
          responsibleId: responsibleId,
          qualityControlId: qualityControlId,
          branchId: branchId,
          roleId: roleId,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          organizationId: task.organizationId && idMappings.organizations.has(task.organizationId)
            ? idMappings.organizations.get(task.organizationId)!
            : task.organizationId
        }
      });
      
      stats.tasks.created++;
      if (stats.tasks.created % 50 === 0) {
        console.log(`  ... ${stats.tasks.created} Tasks importiert`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Task:`, error.message);
      stats.tasks.skipped++;
    }
  }
  
  if (stats.tasks.created > 0) {
    console.log(`  ✓ ${stats.tasks.created} Tasks importiert`);
  }
}

async function importRequests(stats: ImportStats) {
  console.log('\n📋 Importiere Requests...');
  const requests = loadJsonFile('requests.json');
  
  for (const req of requests) {
    try {
      // Mappe IDs
      const requesterId = idMappings.users.has(req.requesterId) 
        ? idMappings.users.get(req.requesterId)! 
        : req.requesterId;
      const responsibleId = idMappings.users.has(req.responsibleId) 
        ? idMappings.users.get(req.responsibleId)! 
        : req.responsibleId;
      const branchId = idMappings.branches.has(req.branchId) 
        ? idMappings.branches.get(req.branchId)! 
        : req.branchId;
      
      // Prüfe ob bereits vorhanden (gleicher Titel + Organization)
      const existing = await prisma.request.findFirst({
        where: {
          title: req.title,
          organizationId: req.organizationId && idMappings.organizations.has(req.organizationId)
            ? idMappings.organizations.get(req.organizationId)!
            : req.organizationId
        }
      });
      
      if (existing) {
        stats.requests.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.request.create({
        data: {
          title: req.title,
          description: req.description,
          status: req.status,
          requesterId: requesterId,
          responsibleId: responsibleId,
          branchId: branchId,
          dueDate: req.dueDate ? new Date(req.dueDate) : null,
          createTodo: req.createTodo,
          organizationId: req.organizationId && idMappings.organizations.has(req.organizationId)
            ? idMappings.organizations.get(req.organizationId)!
            : req.organizationId
        }
      });
      
      stats.requests.created++;
      if (stats.requests.created % 50 === 0) {
        console.log(`  ... ${stats.requests.created} Requests importiert`);
      }
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Request:`, error.message);
      stats.requests.skipped++;
    }
  }
  
  if (stats.requests.created > 0) {
    console.log(`  ✓ ${stats.requests.created} Requests importiert`);
  }
}

async function importCerebro(stats: ImportStats) {
  console.log('\n🧠 Importiere Cerebro-Artikel...');
  const articles = loadJsonFile('cerebro.json');
  
  for (const article of articles) {
    try {
      // Mappe IDs
      const createdById = idMappings.users.has(article.createdById) 
        ? idMappings.users.get(article.createdById)! 
        : article.createdById;
      const updatedById = article.updatedById && idMappings.users.has(article.updatedById) 
        ? idMappings.users.get(article.updatedById)! 
        : article.updatedById;
      
      // Prüfe ob bereits vorhanden (gleicher Slug)
      const existing = await prisma.cerebroCarticle.findUnique({
        where: { slug: article.slug }
      });
      
      if (existing) {
        stats.cerebro.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.cerebroCarticle.create({
        data: {
          title: article.title,
          content: article.content,
          slug: article.slug,
          createdById: createdById,
          updatedById: updatedById,
          organizationId: article.organizationId && idMappings.organizations.has(article.organizationId)
            ? idMappings.organizations.get(article.organizationId)!
            : article.organizationId,
          isPublished: article.isPublished,
          position: article.position,
          githubPath: article.githubPath
        }
      });
      
      stats.cerebro.created++;
      console.log(`  ✓ ${article.title}`);
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Cerebro-Artikel ${article.title}:`, error.message);
      stats.cerebro.skipped++;
    }
  }
}

async function importUserRoles(stats: ImportStats) {
  console.log('\n🔗 Importiere User-Roles...');
  const userRoles = loadJsonFile('user_roles.json');
  
  for (const ur of userRoles) {
    try {
      // Mappe IDs
      const userId = idMappings.users.has(ur.userId) ? idMappings.users.get(ur.userId)! : ur.userId;
      const roleId = idMappings.roles.has(ur.roleId) ? idMappings.roles.get(ur.roleId)! : ur.roleId;
      
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
        stats.userRoles.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.userRole.create({
        data: {
          userId: userId,
          roleId: roleId,
          lastUsed: ur.lastUsed || false
        }
      });
      
      stats.userRoles.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei User-Role:`, error.message);
      stats.userRoles.skipped++;
    }
  }
  
  if (stats.userRoles.created > 0) {
    console.log(`  ✓ ${stats.userRoles.created} User-Roles importiert`);
  }
}

async function importUserBranches(stats: ImportStats) {
  console.log('\n🔗 Importiere User-Branches...');
  const userBranches = loadJsonFile('user_branches.json');
  
  for (const ub of userBranches) {
    try {
      // Mappe IDs
      const userId = idMappings.users.has(ub.userId) ? idMappings.users.get(ub.userId)! : ub.userId;
      const branchId = idMappings.branches.has(ub.branchId) ? idMappings.branches.get(ub.branchId)! : ub.branchId;
      
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
        stats.userBranches.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.usersBranches.create({
        data: {
          userId: userId,
          branchId: branchId,
          lastUsed: ub.lastUsed || false
        }
      });
      
      stats.userBranches.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei User-Branch:`, error.message);
      stats.userBranches.skipped++;
    }
  }
  
  if (stats.userBranches.created > 0) {
    console.log(`  ✓ ${stats.userBranches.created} User-Branches importiert`);
  }
}

async function importPermissions(stats: ImportStats) {
  console.log('\n🔑 Importiere Permissions...');
  const permissions = loadJsonFile('permissions.json');
  
  for (const perm of permissions) {
    try {
      // Mappe roleId
      const roleId = idMappings.roles.has(perm.roleId) ? idMappings.roles.get(perm.roleId)! : perm.roleId;
      
      // Prüfe ob bereits vorhanden
      const existing = await prisma.permission.findFirst({
        where: {
          roleId: roleId,
          entity: perm.entity,
          entityType: perm.entityType
        }
      });
      
      if (existing) {
        stats.permissions.skipped++;
        continue;
      }
      
      // Erstelle neu
      await prisma.permission.create({
        data: {
          roleId: roleId,
          entity: perm.entity,
          entityType: perm.entityType,
          accessLevel: perm.accessLevel
        }
      });
      
      stats.permissions.created++;
    } catch (error: any) {
      console.error(`  ❌ Fehler bei Permission:`, error.message);
      stats.permissions.skipped++;
    }
  }
  
  if (stats.permissions.created > 0) {
    console.log(`  ✓ ${stats.permissions.created} Permissions importiert`);
  }
}

// ========================================
// HAUPTFUNKTION
// ========================================

async function main() {
  console.log('🚀 Starte Datenimport (mit Seed-Schutz)...\n');
  
  const stats: ImportStats = {
    organizations: { created: 0, updated: 0, skipped: 0 },
    roles: { created: 0, updated: 0, skipped: 0 },
    users: { created: 0, updated: 0, skipped: 0 },
    branches: { created: 0, updated: 0, skipped: 0 },
    clients: { created: 0, updated: 0, skipped: 0 },
    workTimes: { created: 0, skipped: 0 },
    tasks: { created: 0, skipped: 0 },
    requests: { created: 0, skipped: 0 },
    cerebro: { created: 0, skipped: 0 },
    userRoles: { created: 0, skipped: 0 },
    userBranches: { created: 0, skipped: 0 },
    permissions: { created: 0, skipped: 0 }
  };
  
  try {
    // Importiere in korrekter Reihenfolge (abhängig von Abhängigkeiten)
    await importOrganizations(stats);
    await importRoles(stats);
    await importUsers(stats);
    await importBranches(stats);
    await importClients(stats);
    await importWorkTimes(stats);
    await importTasks(stats);
    await importRequests(stats);
    await importCerebro(stats);
    await importUserRoles(stats);
    await importUserBranches(stats);
    await importPermissions(stats);
    
    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 Import-Zusammenfassung:');
    console.log('='.repeat(60));
    console.log(`Organisationen: ${stats.organizations.created} erstellt, ${stats.organizations.updated} aktualisiert, ${stats.organizations.skipped} übersprungen`);
    console.log(`Rollen:         ${stats.roles.created} erstellt, ${stats.roles.updated} aktualisiert, ${stats.roles.skipped} übersprungen`);
    console.log(`Benutzer:       ${stats.users.created} erstellt, ${stats.users.updated} aktualisiert, ${stats.users.skipped} übersprungen`);
    console.log(`Branches:       ${stats.branches.created} erstellt, ${stats.branches.updated} aktualisiert, ${stats.branches.skipped} übersprungen`);
    console.log(`Clients:        ${stats.clients.created} erstellt, ${stats.clients.updated} aktualisiert, ${stats.clients.skipped} übersprungen`);
    console.log(`WorkTimes:      ${stats.workTimes.created} erstellt, ${stats.workTimes.skipped} übersprungen`);
    console.log(`Tasks:          ${stats.tasks.created} erstellt, ${stats.tasks.skipped} übersprungen`);
    console.log(`Requests:       ${stats.requests.created} erstellt, ${stats.requests.skipped} übersprungen`);
    console.log(`Cerebro:        ${stats.cerebro.created} erstellt, ${stats.cerebro.skipped} übersprungen`);
    console.log(`User-Roles:     ${stats.userRoles.created} erstellt, ${stats.userRoles.skipped} übersprungen`);
    console.log(`User-Branches:  ${stats.userBranches.created} erstellt, ${stats.userBranches.skipped} übersprungen`);
    console.log(`Permissions:    ${stats.permissions.created} erstellt, ${stats.permissions.skipped} übersprungen`);
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

