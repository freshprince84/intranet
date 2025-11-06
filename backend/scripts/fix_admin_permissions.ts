#!/usr/bin/env node
/**
 * Bereinigt falsche Berechtigungen und erstellt nur die korrekten
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Korrekte Listen (aus seed.ts)
const ALL_PAGES = [
  'dashboard',
  'worktracker', 
  'consultations',
  'team_worktime_control',
  'payroll',
  'organization_management',
  'cerebro',
  'settings',
  'profile'
];

const ALL_TABLES = [
  'requests',
  'tasks',
  'users',
  'roles',
  'organization',
  'team_worktime',
  'worktime',
  'clients',
  'consultation_invoices',
  'branches',
  'notifications',
  'settings',
  'monthly_reports',
  'organization_join_requests',
  'organization_users'
];

const ALL_BUTTONS = [
  'database_reset_table',
  'database_logs',
  'invoice_create',
  'invoice_download', 
  'invoice_mark_paid',
  'invoice_settings',
  'todo_create',
  'todo_edit',
  'todo_delete',
  'task_create',
  'task_edit', 
  'task_delete',
  'user_create',
  'user_edit',
  'user_delete',
  'role_assign',
  'role_create',
  'role_edit',
  'role_delete',
  'organization_create',
  'organization_edit',
  'organization_delete',
  'worktime_start',
  'worktime_stop', 
  'worktime_edit',
  'worktime_delete',
  'cerebro',
  'consultation_start',
  'consultation_stop',
  'consultation_edit',
  'client_create',
  'client_edit',
  'client_delete',
  'settings_system',
  'settings_notifications',
  'settings_profile',
  'payroll_generate',
  'payroll_export',
  'payroll_edit'
];

async function main() {
  try {
    console.log('🧹 Bereinige und korrigiere Berechtigungen für Admin-Rolle...\n');
    
    const adminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        organizationId: 1
      }
    });
    
    if (!adminRole) {
      console.error('❌ Admin-Rolle nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`✓ Admin-Rolle gefunden: ${adminRole.name} (ID: ${adminRole.id})\n`);
    
    // Lösche alle bestehenden Berechtigungen
    const deleted = await prisma.permission.deleteMany({
      where: { roleId: adminRole.id }
    });
    console.log(`🗑️  ${deleted.count} alte Berechtigungen gelöscht\n`);
    
    // Erstelle korrekte Berechtigungen
    console.log('📋 Erstelle korrekte Berechtigungen...\n');
    
    const permissions = [];
    
    // Pages
    for (const page of ALL_PAGES) {
      permissions.push({
        roleId: adminRole.id,
        entity: page,
        entityType: 'page',
        accessLevel: 'both'
      });
    }
    
    // Tables
    for (const table of ALL_TABLES) {
      permissions.push({
        roleId: adminRole.id,
        entity: table,
        entityType: 'table',
        accessLevel: 'both'
      });
    }
    
    // Buttons
    for (const button of ALL_BUTTONS) {
      permissions.push({
        roleId: adminRole.id,
        entity: button,
        entityType: 'button',
        accessLevel: 'both'
      });
    }
    
    await prisma.permission.createMany({
      data: permissions
    });
    
    console.log(`✅ ${permissions.length} Berechtigungen erstellt:`);
    console.log(`   - ${ALL_PAGES.length} Seiten`);
    console.log(`   - ${ALL_TABLES.length} Tabellen`);
    console.log(`   - ${ALL_BUTTONS.length} Buttons`);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

