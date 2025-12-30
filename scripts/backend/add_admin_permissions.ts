#!/usr/bin/env node
/**
 * Fügt alle Berechtigungen für die Admin-Rolle der Organisation "La Familia Hostel" hinzu
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Definiere AccessLevel als String-Literale entsprechend dem Enum in schema.prisma
type AccessLevel = 'read' | 'write' | 'both' | 'none';

// ALLE SEITEN IM SYSTEM
const ALL_PAGES = [
  'dashboard',
  'worktracker', 
  'consultations',
  'team_worktime_control', // = workcenter
  'payroll', // = lohnabrechnung
  'organization_management', // = organisation (Hauptseite)
  'cerebro',
  'settings',
  'profile'
];

// ALLE TABELLEN IM SYSTEM
const ALL_TABLES = [
  'requests',           // auf dashboard
  'tasks',             // auf worktracker
  'users',             // auf organization_management
  'roles',             // auf organization_management
  'organization',      // auf organization_management
  'team_worktime',     // auf team_worktime_control
  'worktime',          // auf worktracker
  'clients',           // auf consultations
  'consultation_invoices', // auf consultations
  'branches',          // auf settings/system
  'notifications',     // allgemein
  'settings',          // auf settings
  'monthly_reports',    // auf consultations/reports
  'organization_join_requests', // auf organization_management
  'organization_users'  // auf organization_management
];

// ALLE BUTTONS IM SYSTEM
const ALL_BUTTONS = [
  // Database Management Buttons (Settings/System)
  'database_reset_table',
  'database_logs',
  
  // Invoice Functions Buttons
  'invoice_create',
  'invoice_download', 
  'invoice_mark_paid',
  'invoice_settings',
  
  // Todo/Task Buttons (Worktracker)
  'todo_create',
  'todo_edit',
  'todo_delete',
  'task_create',
  'task_edit', 
  'task_delete',
  
  // User Management Buttons
  'user_create',
  'user_edit',
  'user_delete',
  'role_assign',
  'role_create',
  'role_edit',
  'role_delete',
  
  // Organization Management Buttons
  'organization_create',
  'organization_edit',
  'organization_delete',
  
  // Worktime Buttons
  'worktime_start',
  'worktime_stop', 
  'worktime_edit',
  'worktime_delete',
  
  // General Cerebro Button
  'cerebro',
  
  // Consultation Buttons
  'consultation_start',
  'consultation_stop',
  'consultation_edit',
  
  // Client Management Buttons
  'client_create',
  'client_edit',
  'client_delete',
  
  // Settings Buttons
  'settings_system',
  'settings_notifications',
  'settings_profile',
  
  // Payroll Buttons
  'payroll_generate',
  'payroll_export',
  'payroll_edit'
];

// Hilfsfunktion zum idempotenten Erstellen von Berechtigungen
async function ensurePermission(roleId: number, entity: string, entityType: string, accessLevel: string) {
  const existingPermission = await prisma.permission.findFirst({
    where: {
      roleId: roleId,
      entity: entity,
      entityType: entityType
    }
  });
  
  if (existingPermission) {
    // Nur aktualisieren wenn sich accessLevel geändert hat
    if (existingPermission.accessLevel !== accessLevel) {
      await prisma.permission.update({
        where: { id: existingPermission.id },
        data: { accessLevel: accessLevel }
      });
      console.log(`  🔄 Berechtigung aktualisiert: ${entity} (${entityType}) für Rolle ${roleId}: ${existingPermission.accessLevel} → ${accessLevel}`);
    }
  } else {
    // Neue Berechtigung erstellen
    await prisma.permission.create({
      data: {
        roleId: roleId,
        entity: entity,
        entityType: entityType,
        accessLevel: accessLevel
      }
    });
    console.log(`  ✓ Berechtigung erstellt: ${entity} (${entityType}) - ${accessLevel}`);
  }
}

// Hilfsfunktion zum Erstellen aller Berechtigungen für eine Rolle
async function ensureAllPermissionsForRole(roleId: number, permissionMap: Record<string, AccessLevel>) {
  // Pages
  for (const page of ALL_PAGES) {
    const accessLevel = permissionMap[`page_${page}`] || 'none';
    await ensurePermission(roleId, page, 'page', accessLevel);
  }
  
  // Tables
  for (const table of ALL_TABLES) {
    const accessLevel = permissionMap[`table_${table}`] || 'none';
    await ensurePermission(roleId, table, 'table', accessLevel);
  }
  
  // Buttons
  for (const button of ALL_BUTTONS) {
    const accessLevel = permissionMap[`button_${button}`] || 'none';
    await ensurePermission(roleId, button, 'button', accessLevel);
  }
}

async function main() {
  try {
    console.log('🔑 Füge Berechtigungen für Admin-Rolle der Organisation "La Familia Hostel" hinzu...\n');
    
    // Finde Organisation "La Familia Hostel" (ID 1)
    const org = await prisma.organization.findUnique({
      where: { id: 1 }
    });
    
    if (!org) {
      console.error('❌ Organisation "La Familia Hostel" (ID 1) nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`✓ Organisation gefunden: ${org.displayName} (ID: ${org.id})\n`);
    
    // Finde Admin-Rolle für diese Organisation
    const adminRole = await prisma.role.findFirst({
      where: {
        name: 'Admin',
        organizationId: org.id
      }
    });
    
    if (!adminRole) {
      console.error('❌ Admin-Rolle für Organisation "La Familia Hostel" nicht gefunden!');
      process.exit(1);
    }
    
    console.log(`✓ Admin-Rolle gefunden: ${adminRole.name} (ID: ${adminRole.id})\n`);
    
    // Erstelle alle Berechtigungen für Admin-Rolle
    console.log('📋 Erstelle Berechtigungen...\n');
    
    const adminPermissionMap: Record<string, AccessLevel> = {};
    ALL_PAGES.forEach(page => adminPermissionMap[`page_${page}`] = 'both');
    ALL_TABLES.forEach(table => adminPermissionMap[`table_${table}`] = 'both');
    ALL_BUTTONS.forEach(button => adminPermissionMap[`button_${button}`] = 'both');
    
    await ensureAllPermissionsForRole(adminRole.id, adminPermissionMap);
    
    // Zeige Zusammenfassung
    const permissionCount = await prisma.permission.count({
      where: { roleId: adminRole.id }
    });
    
    console.log(`\n✅ Fertig! ${permissionCount} Berechtigungen für Admin-Rolle erstellt/aktualisiert.`);
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

