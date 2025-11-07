#!/usr/bin/env node
/**
 * Export-Skript für Datenbank-Daten
 * 
 * Exportiert alle Daten aus der lokalen Datenbank, AUSSER Seed-Daten.
 * Seed-Daten werden identifiziert und ausgeschlossen.
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Ausgabe-Verzeichnis
const EXPORT_DIR = path.join(process.cwd(), 'export_data');
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
}

// ========================================
// SEED-DATEN DEFINITIONEN
// ========================================

// Seed-Rollen (IDs und Namen)
const SEED_ROLE_IDS = [1, 2, 999];
const SEED_ROLE_NAMES = ['Admin', 'User', 'Hamburger'];

// Seed-Organisationen
const SEED_ORG_IDS = [1, 2];
const SEED_ORG_NAMES = ['la-familia-hostel', 'mosaik', 'default'];

// Seed-User (usernames)
const SEED_USERNAMES = ['admin', 'rebeca-benitez', 'christina-di-biaso'];

// Seed-Branches (Namen)
const SEED_BRANCH_NAMES = ['Parque Poblado', 'Manila', 'Sonnenhalden', 'Hauptsitz'];

// Seed-Clients (Namen für Org 2)
const SEED_CLIENT_NAMES = ['Hampi', 'Heinz Hunziker', 'Rebeca Benitez', 'Stiven Pino', 'Urs Schmidlin'];
const SEED_DEMO_CLIENT_NAMES = ['Musterfirma GmbH', 'Max Müller', 'Beispiel AG', 'Tech Startup XYZ'];

interface ExportStats {
  organizations: { exported: number; skipped: number };
  roles: { exported: number; skipped: number };
  users: { exported: number; skipped: number };
  branches: { exported: number; skipped: number };
  clients: { exported: number; skipped: number };
  workTimes: { exported: number; skipped: number };
  tasks: { exported: number; skipped: number };
  requests: { exported: number; skipped: number };
  cerebro: { exported: number; skipped: number };
  userRoles: { exported: number; skipped: number };
  userBranches: { exported: number; skipped: number };
  permissions: { exported: number; skipped: number };
  [key: string]: { exported: number; skipped: number };
}

// ========================================
// HILFSFUNKTIONEN FÜR SEED-ERKENNUNG
// ========================================

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
// EXPORT-FUNKTIONEN
// ========================================

async function exportOrganizations(stats: ExportStats) {
  console.log('\n🏢 Exportiere Organisationen...');
  const orgs = await prisma.organization.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const org of orgs) {
    if (isSeedOrganization(org)) {
      console.log(`  ⏭️  Überspringe Seed-Organisation: ${org.name} (ID: ${org.id})`);
      stats.organizations.skipped++;
      continue;
    }
    
    exported.push({
      id: org.id,
      name: org.name,
      displayName: org.displayName,
      domain: org.domain,
      logo: org.logo,
      isActive: org.isActive,
      maxUsers: org.maxUsers,
      subscriptionPlan: org.subscriptionPlan,
      subscriptionEnd: org.subscriptionEnd?.toISOString() || null,
      settings: org.settings,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString()
    });
    stats.organizations.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'organizations.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.organizations.exported} Organisationen exportiert`);
}

async function exportRoles(stats: ExportStats) {
  console.log('\n👤 Exportiere Rollen...');
  const roles = await prisma.role.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const role of roles) {
    if (isSeedRole(role)) {
      console.log(`  ⏭️  Überspringe Seed-Rolle: ${role.name} (ID: ${role.id})`);
      stats.roles.skipped++;
      continue;
    }
    
    exported.push({
      id: role.id,
      name: role.name,
      description: role.description,
      organizationId: role.organizationId
    });
    stats.roles.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'roles.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.roles.exported} Rollen exportiert`);
}

async function exportUsers(stats: ExportStats) {
  console.log('\n👥 Exportiere Benutzer...');
  const users = await prisma.user.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const user of users) {
    if (isSeedUser(user)) {
      console.log(`  ⏭️  Überspringe Seed-User: ${user.username} (ID: ${user.id})`);
      stats.users.skipped++;
      continue;
    }
    
    exported.push({
      id: user.id,
      username: user.username,
      email: user.email,
      password: user.password, // Wird für Import benötigt
      firstName: user.firstName,
      lastName: user.lastName,
      birthday: user.birthday?.toISOString() || null,
      bankDetails: user.bankDetails,
      contract: user.contract,
      salary: user.salary,
      country: user.country,
      hourlyRate: user.hourlyRate?.toString() || null,
      language: user.language,
      normalWorkingHours: user.normalWorkingHours,
      payrollCountry: user.payrollCountry,
      approvedOvertimeHours: user.approvedOvertimeHours,
      contractType: user.contractType,
      monthlySalary: user.monthlySalary,
      employeeNumber: user.employeeNumber,
      identificationNumber: user.identificationNumber,
      taxIdentificationNumber: user.taxIdentificationNumber,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    });
    stats.users.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'users.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.users.exported} Benutzer exportiert`);
}

async function exportBranches(stats: ExportStats) {
  console.log('\n📂 Exportiere Branches...');
  const branches = await prisma.branch.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const branch of branches) {
    if (isSeedBranch(branch)) {
      console.log(`  ⏭️  Überspringe Seed-Branch: ${branch.name} (ID: ${branch.id})`);
      stats.branches.skipped++;
      continue;
    }
    
    exported.push({
      id: branch.id,
      name: branch.name,
      organizationId: branch.organizationId,
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString()
    });
    stats.branches.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'branches.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.branches.exported} Branches exportiert`);
}

async function exportClients(stats: ExportStats) {
  console.log('\n👥 Exportiere Clients...');
  const clients = await prisma.client.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const client of clients) {
    if (isSeedClient(client)) {
      console.log(`  ⏭️  Überspringe Seed-Client: ${client.name} (ID: ${client.id})`);
      stats.clients.skipped++;
      continue;
    }
    
    exported.push({
      id: client.id,
      name: client.name,
      company: client.company,
      email: client.email,
      phone: client.phone,
      address: client.address,
      notes: client.notes,
      isActive: client.isActive,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString()
    });
    stats.clients.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'clients.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.clients.exported} Clients exportiert`);
}

async function exportWorkTimes(stats: ExportStats) {
  console.log('\n🕐 Exportiere WorkTimes...');
  
  // Hole alle Seed-User-IDs
  const seedUsers = await prisma.user.findMany({
    where: { username: { in: SEED_USERNAMES } },
    select: { id: true }
  });
  const seedUserIds = seedUsers.map(u => u.id);
  
  // Exportiere nur WorkTimes, die NICHT von Seed-Usern sind
  // UND nicht Demo-Daten (erkennbar an bestimmten Notes)
  const workTimes = await prisma.workTime.findMany({
    where: {
      NOT: {
        OR: [
          { userId: { in: seedUserIds } },
          { notes: { contains: 'Demo-WorkTime' } },
          { notes: { contains: 'Demo-Beratung' } }
        ]
      }
    },
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const wt of workTimes) {
    exported.push({
      id: wt.id,
      userId: wt.userId,
      branchId: wt.branchId,
      startTime: wt.startTime.toISOString(),
      endTime: wt.endTime?.toISOString() || null,
      timezone: wt.timezone,
      clientId: wt.clientId,
      notes: wt.notes,
      monthlyReportId: wt.monthlyReportId,
      organizationId: wt.organizationId,
      createdAt: wt.createdAt.toISOString(),
      updatedAt: wt.updatedAt.toISOString()
    });
    stats.workTimes.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'worktimes.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.workTimes.exported} WorkTimes exportiert`);
}

async function exportTasks(stats: ExportStats) {
  console.log('\n✅ Exportiere Tasks...');
  
  // Exportiere ALLE Tasks (auch die zu Seed-Organisationen gehören)
  // Seed-Daten sind nur die Demo-Daten, nicht alle Daten der Organisationen
  const tasks = await prisma.task.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const task of tasks) {
    exported.push({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      responsibleId: task.responsibleId,
      qualityControlId: task.qualityControlId,
      branchId: task.branchId,
      roleId: task.roleId,
      dueDate: task.dueDate?.toISOString() || null,
      organizationId: task.organizationId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    });
    stats.tasks.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'tasks.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.tasks.exported} Tasks exportiert`);
}

async function exportRequests(stats: ExportStats) {
  console.log('\n📋 Exportiere Requests...');
  
  // Exportiere ALLE Requests (auch die zu Seed-Organisationen gehören)
  // Seed-Daten sind nur die Demo-Daten, nicht alle Daten der Organisationen
  const requests = await prisma.request.findMany({
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const req of requests) {
    exported.push({
      id: req.id,
      title: req.title,
      description: req.description,
      status: req.status,
      requesterId: req.requesterId,
      responsibleId: req.responsibleId,
      branchId: req.branchId,
      dueDate: req.dueDate?.toISOString() || null,
      createTodo: req.createTodo,
      organizationId: req.organizationId,
      createdAt: req.createdAt.toISOString(),
      updatedAt: req.updatedAt.toISOString()
    });
    stats.requests.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'requests.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.requests.exported} Requests exportiert`);
}

async function exportCerebro(stats: ExportStats) {
  console.log('\n🧠 Exportiere Cerebro-Artikel...');
  
  // Exportiere nur Cerebro-Artikel, die NICHT zu Seed-Organisationen gehören
  const articles = await prisma.cerebroCarticle.findMany({
    where: {
      organizationId: { notIn: SEED_ORG_IDS }
    },
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const article of articles) {
    exported.push({
      id: article.id,
      title: article.title,
      content: article.content,
      slug: article.slug,
      createdById: article.createdById,
      updatedById: article.updatedById,
      organizationId: article.organizationId,
      isPublished: article.isPublished,
      position: article.position,
      githubPath: article.githubPath,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString()
    });
    stats.cerebro.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'cerebro.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.cerebro.exported} Cerebro-Artikel exportiert`);
}

async function exportUserRoles(stats: ExportStats) {
  console.log('\n🔗 Exportiere User-Roles...');
  
  // Hole Seed-User- und Seed-Rollen-IDs
  const seedUsers = await prisma.user.findMany({
    where: { username: { in: SEED_USERNAMES } },
    select: { id: true }
  });
  const seedUserIds = seedUsers.map(u => u.id);
  
  const seedRoles = await prisma.role.findMany({
    where: {
      OR: [
        { id: { in: SEED_ROLE_IDS } },
        { name: { in: SEED_ROLE_NAMES }, organizationId: null }
      ]
    },
    select: { id: true }
  });
  const seedRoleIds = seedRoles.map(r => r.id);
  
  // Exportiere nur UserRoles, die NICHT Seed-Daten betreffen
  const userRoles = await prisma.userRole.findMany({
    where: {
      AND: [
        { userId: { notIn: seedUserIds } },
        { roleId: { notIn: seedRoleIds } }
      ]
    },
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const ur of userRoles) {
    exported.push({
      userId: ur.userId,
      roleId: ur.roleId,
      lastUsed: ur.lastUsed,
      createdAt: ur.createdAt.toISOString(),
      updatedAt: ur.updatedAt.toISOString()
    });
    stats.userRoles.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'user_roles.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.userRoles.exported} User-Roles exportiert`);
}

async function exportUserBranches(stats: ExportStats) {
  console.log('\n🔗 Exportiere User-Branches...');
  
  // Hole Seed-User- und Seed-Branch-IDs
  const seedUsers = await prisma.user.findMany({
    where: { username: { in: SEED_USERNAMES } },
    select: { id: true }
  });
  const seedUserIds = seedUsers.map(u => u.id);
  
  const seedBranches = await prisma.branch.findMany({
    where: { name: { in: SEED_BRANCH_NAMES } },
    select: { id: true }
  });
  const seedBranchIds = seedBranches.map(b => b.id);
  
  // Exportiere nur UserBranches, die NICHT Seed-Daten betreffen
  const userBranches = await prisma.usersBranches.findMany({
    where: {
      AND: [
        { userId: { notIn: seedUserIds } },
        { branchId: { notIn: seedBranchIds } }
      ]
    },
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const ub of userBranches) {
    exported.push({
      userId: ub.userId,
      branchId: ub.branchId,
      lastUsed: ub.lastUsed,
      createdAt: ub.createdAt.toISOString(),
      updatedAt: ub.updatedAt.toISOString()
    });
    stats.userBranches.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'user_branches.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.userBranches.exported} User-Branches exportiert`);
}

async function exportPermissions(stats: ExportStats) {
  console.log('\n🔑 Exportiere Permissions...');
  
  // Hole Seed-Rollen-IDs
  const seedRoles = await prisma.role.findMany({
    where: {
      OR: [
        { id: { in: SEED_ROLE_IDS } },
        { name: { in: SEED_ROLE_NAMES }, organizationId: null }
      ]
    },
    select: { id: true }
  });
  const seedRoleIds = seedRoles.map(r => r.id);
  
  // Exportiere nur Permissions für NICHT-Seed-Rollen
  const permissions = await prisma.permission.findMany({
    where: {
      roleId: { notIn: seedRoleIds }
    },
    orderBy: { id: 'asc' }
  });
  
  const exported: any[] = [];
  
  for (const perm of permissions) {
    exported.push({
      id: perm.id,
      roleId: perm.roleId,
      entity: perm.entity,
      entityType: perm.entityType,
      accessLevel: perm.accessLevel,
      createdAt: perm.createdAt.toISOString(),
      updatedAt: perm.updatedAt.toISOString()
    });
    stats.permissions.exported++;
  }
  
  fs.writeFileSync(
    path.join(EXPORT_DIR, 'permissions.json'),
    JSON.stringify(exported, null, 2),
    'utf-8'
  );
  console.log(`  ✓ ${stats.permissions.exported} Permissions exportiert`);
}

// ========================================
// HAUPTFUNKTION
// ========================================

async function main() {
  console.log('🚀 Starte Datenexport (ohne Seed-Daten)...\n');
  
  const stats: ExportStats = {
    organizations: { exported: 0, skipped: 0 },
    roles: { exported: 0, skipped: 0 },
    users: { exported: 0, skipped: 0 },
    branches: { exported: 0, skipped: 0 },
    clients: { exported: 0, skipped: 0 },
    workTimes: { exported: 0, skipped: 0 },
    tasks: { exported: 0, skipped: 0 },
    requests: { exported: 0, skipped: 0 },
    cerebro: { exported: 0, skipped: 0 },
    userRoles: { exported: 0, skipped: 0 },
    userBranches: { exported: 0, skipped: 0 },
    permissions: { exported: 0, skipped: 0 }
  };
  
  try {
    // Exportiere in korrekter Reihenfolge (abhängig von Abhängigkeiten)
    await exportOrganizations(stats);
    await exportRoles(stats);
    await exportUsers(stats);
    await exportBranches(stats);
    await exportClients(stats);
    await exportWorkTimes(stats);
    await exportTasks(stats);
    await exportRequests(stats);
    await exportCerebro(stats);
    await exportUserRoles(stats);
    await exportUserBranches(stats);
    await exportPermissions(stats);
    
    // Zusammenfassung
    console.log('\n' + '='.repeat(60));
    console.log('📊 Export-Zusammenfassung:');
    console.log('='.repeat(60));
    console.log(`Organisationen: ${stats.organizations.exported} exportiert, ${stats.organizations.skipped} übersprungen`);
    console.log(`Rollen:         ${stats.roles.exported} exportiert, ${stats.roles.skipped} übersprungen`);
    console.log(`Benutzer:       ${stats.users.exported} exportiert, ${stats.users.skipped} übersprungen`);
    console.log(`Branches:       ${stats.branches.exported} exportiert, ${stats.branches.skipped} übersprungen`);
    console.log(`Clients:        ${stats.clients.exported} exportiert, ${stats.clients.skipped} übersprungen`);
    console.log(`WorkTimes:      ${stats.workTimes.exported} exportiert`);
    console.log(`Tasks:          ${stats.tasks.exported} exportiert`);
    console.log(`Requests:       ${stats.requests.exported} exportiert`);
    console.log(`Cerebro:        ${stats.cerebro.exported} exportiert`);
    console.log(`User-Roles:     ${stats.userRoles.exported} exportiert`);
    console.log(`User-Branches:  ${stats.userBranches.exported} exportiert`);
    console.log(`Permissions:    ${stats.permissions.exported} exportiert`);
    console.log('='.repeat(60));
    console.log(`✅ Export abgeschlossen! Daten gespeichert in: ${EXPORT_DIR}`);
    
  } catch (error) {
    console.error('❌ Fehler beim Export:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

