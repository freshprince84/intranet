"use strict";
// PERMISSION DEFINITIONS AUS SEED FILE
// Diese Konstanten werden sowohl im Seed-File als auch bei der Organisation-Erstellung verwendet
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_BUTTONS = exports.ALL_TABLES = exports.ALL_PAGES = void 0;
exports.generateAdminPermissions = generateAdminPermissions;
exports.generateUserPermissions = generateUserPermissions;
// ALLE SEITEN IM SYSTEM
exports.ALL_PAGES = [
    'dashboard',
    'worktracker',
    'consultations',
    'team_worktime_control', // = workcenter
    'payroll', // = lohnabrechnung
    'usermanagement', // = benutzerverwaltung
    'cerebro',
    'settings',
    'profile'
];
// ALLE TABELLEN IM SYSTEM
exports.ALL_TABLES = [
    'requests', // auf dashboard
    'tasks', // auf worktracker
    'users', // auf usermanagement
    'roles', // auf usermanagement
    'team_worktime', // auf team_worktime_control
    'worktime', // auf worktracker
    'clients', // auf consultations
    'consultation_invoices', // auf consultations
    'branches', // auf settings/system
    'notifications', // allgemein
    'settings', // auf settings
    'monthly_reports' // auf consultations/reports
];
// ALLE BUTTONS IM SYSTEM
exports.ALL_BUTTONS = [
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
// Hilfsfunktion um Admin-Permissions zu generieren (exakt wie im Seed-File)
function generateAdminPermissions() {
    const permissions = [];
    // Alle Seiten-Permissions mit 'both' für Admin
    for (const page of exports.ALL_PAGES) {
        permissions.push({
            entity: page,
            entityType: 'page',
            accessLevel: 'both'
        });
    }
    // Alle Tabellen-Permissions mit 'both' für Admin
    for (const table of exports.ALL_TABLES) {
        permissions.push({
            entity: table,
            entityType: 'table',
            accessLevel: 'both'
        });
    }
    // Alle Button-Permissions mit 'both' für Admin
    for (const button of exports.ALL_BUTTONS) {
        permissions.push({
            entity: button,
            entityType: 'button',
            accessLevel: 'both'
        });
    }
    return permissions;
}
// Generiert Standard-User-Permissions (eingeschränkter Zugriff)
function generateUserPermissions() {
    const permissions = [];
    // Grundlegende Seiten mit 'view' Zugriff für Standard-User
    const userPages = [
        'dashboard',
        'worktracker',
        'consultations',
        'profile'
    ];
    for (const page of userPages) {
        permissions.push({
            entity: page,
            entityType: 'page',
            accessLevel: 'view'
        });
    }
    // Grundlegende Tabellen mit 'view' Zugriff für Standard-User
    const userTables = [
        'worktime', // eigene Zeiterfassung
        'tasks', // zugewiesene Aufgaben
        'clients', // Kunden (nur lesen)
        'notifications' // eigene Benachrichtigungen
    ];
    for (const table of userTables) {
        permissions.push({
            entity: table,
            entityType: 'table',
            accessLevel: 'view'
        });
    }
    // Grundlegende Buttons für Standard-User
    const userButtons = [
        'worktime_start',
        'worktime_stop',
        'worktime_create',
        'worktime_edit',
        'profile_edit',
        'notification_read'
    ];
    for (const button of userButtons) {
        permissions.push({
            entity: button,
            entityType: 'button',
            accessLevel: 'both'
        });
    }
    return permissions;
}
//# sourceMappingURL=seedPermissions.js.map