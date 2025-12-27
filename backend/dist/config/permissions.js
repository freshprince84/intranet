"use strict";
/**
 * ZENTRALE PERMISSION-DEFINITIONEN
 *
 * Diese Datei ist die Single Source of Truth für alle Berechtigungen im System.
 * Sie wird verwendet von:
 * - backend/prisma/seed.ts
 * - backend/src/controllers/organizationController.ts (Rollen-Kopie)
 * - frontend (über API-Export)
 *
 * STRUKTUR:
 * - entity: Name des Objekts (z.B. 'dashboard', 'requests', 'task_create')
 * - entityType: Art des Objekts ('page' | 'box' | 'tab' | 'button')
 * - accessLevel: Berechtigung ('none' | 'own_read' | 'own_both' | 'all_read' | 'all_both')
 *
 * ACCESS LEVEL BEDEUTUNG:
 * - none: Kein Zugriff (Element nicht sichtbar/nicht erlaubt)
 * - own_read: Nur eigene Daten lesen (user ist in userId-Feld oder rolle in roleId-Feld)
 * - own_both: Eigene Daten lesen und bearbeiten
 * - all_read: Alle Daten lesen (innerhalb der Organisation/Branch)
 * - all_both: Alle Daten lesen und bearbeiten (voller Zugriff)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HAMBURGER_PERMISSIONS = exports.USER_PERMISSIONS = exports.ADMIN_PERMISSIONS = exports.ALL_ENTITIES = exports.ALL_BUTTONS = exports.ALL_TABS = exports.ALL_BOXES = exports.ALL_PAGES = exports.EntityTypeValues = exports.AccessLevelValues = void 0;
exports.generatePermissionsForRole = generatePermissionsForRole;
exports.hasAccess = hasAccess;
exports.allowsAllData = allowsAllData;
exports.allowsWrite = allowsWrite;
exports.convertLegacyAccessLevel = convertLegacyAccessLevel;
exports.AccessLevelValues = ['none', 'own_read', 'own_both', 'all_read', 'all_both'];
exports.EntityTypeValues = ['page', 'box', 'tab', 'button'];
// ============================================
// ALLE PAGES
// ============================================
exports.ALL_PAGES = [
    { entity: 'dashboard', entityType: 'page', description: 'Dashboard-Seite' },
    { entity: 'worktracker', entityType: 'page', description: 'Worktracker-Seite (To-Dos, Reservations, Tours)' },
    { entity: 'consultations', entityType: 'page', description: 'Beratungsstunden-Seite' },
    { entity: 'team_worktime_control', entityType: 'page', description: 'Workcenter-Seite (Arbeitszeiten, Schichtplanung, Analytics)' },
    { entity: 'payroll', entityType: 'page', description: 'Lohnabrechnungs-Seite' },
    { entity: 'cerebro', entityType: 'page', description: 'Cerebro Wiki-Seite' },
    { entity: 'organization_management', entityType: 'page', description: 'Organisations-Verwaltung' },
    { entity: 'price_analysis', entityType: 'page', description: 'Preisanalyse-Seite' },
    { entity: 'settings', entityType: 'page', description: 'Einstellungen-Seite' },
    { entity: 'profile', entityType: 'page', description: 'Profil-Seite' },
    { entity: 'tour_management', entityType: 'page', description: 'Touren-Verwaltung' },
];
// ============================================
// ALLE BOXES (Container auf Pages)
// ============================================
exports.ALL_BOXES = [
    // Dashboard
    {
        entity: 'requests',
        entityType: 'box',
        description: 'Requests-Box auf Dashboard',
        parent: 'dashboard',
        ownershipFields: ['requesterId', 'responsibleId']
    },
    // Worktracker
    {
        entity: 'worktime',
        entityType: 'box',
        description: 'Zeiterfassungs-Box auf Worktracker',
        parent: 'worktracker',
        ownershipFields: ['userId']
    },
    // Consultations
    {
        entity: 'consultation_tracker',
        entityType: 'box',
        description: 'Beratungs-Tracker-Box',
        parent: 'consultations',
        ownershipFields: ['userId']
    },
    {
        entity: 'consultation_list',
        entityType: 'box',
        description: 'Beratungsliste-Box',
        parent: 'consultations',
        ownershipFields: ['userId']
    },
];
// ============================================
// ALLE TABS (Innerhalb von Pages/Boxes)
// ============================================
exports.ALL_TABS = [
    // Worktracker Tabs
    {
        entity: 'todos',
        entityType: 'tab',
        description: 'To-Dos Tab auf Worktracker',
        parent: 'worktracker',
        ownershipFields: ['responsibleId', 'qualityControlId', 'roleId']
    },
    {
        entity: 'reservations',
        entityType: 'tab',
        description: 'Reservations Tab auf Worktracker',
        parent: 'worktracker',
        ownershipFields: ['branchId'] // Branch-basiert
    },
    {
        entity: 'tour_bookings',
        entityType: 'tab',
        description: 'Tour Bookings Tab auf Worktracker',
        parent: 'worktracker',
        ownershipFields: ['bookedById', 'branchId']
    },
    // Workcenter Tabs
    {
        entity: 'working_times',
        entityType: 'tab',
        description: 'Arbeitszeiten Tab auf Workcenter',
        parent: 'team_worktime_control',
        ownershipFields: ['userId']
    },
    {
        entity: 'shift_planning',
        entityType: 'tab',
        description: 'Schichtplanung Tab auf Workcenter',
        parent: 'team_worktime_control',
        ownershipFields: ['userId']
    },
    {
        entity: 'task_analytics',
        entityType: 'tab',
        description: 'Task Analytics Tab auf Workcenter',
        parent: 'team_worktime_control',
        ownershipFields: ['responsibleId', 'qualityControlId']
    },
    {
        entity: 'request_analytics',
        entityType: 'tab',
        description: 'Request Analytics Tab auf Workcenter',
        parent: 'team_worktime_control',
        ownershipFields: ['requesterId', 'responsibleId']
    },
    // Payroll Tabs
    {
        entity: 'consultation_invoices',
        entityType: 'tab',
        description: 'Beratungsrechnungen Tab',
        parent: 'payroll',
        ownershipFields: ['userId']
    },
    {
        entity: 'monthly_reports',
        entityType: 'tab',
        description: 'Monatsrechnungen Tab',
        parent: 'payroll',
        ownershipFields: ['userId']
    },
    {
        entity: 'payroll_reports',
        entityType: 'tab',
        description: 'Lohnabrechnungen Tab',
        parent: 'payroll',
        ownershipFields: ['userId']
    },
    // Organisation Tabs
    {
        entity: 'users',
        entityType: 'tab',
        description: 'Users Tab auf Organisation',
        parent: 'organization_management'
    },
    {
        entity: 'roles',
        entityType: 'tab',
        description: 'Roles Tab auf Organisation',
        parent: 'organization_management'
    },
    {
        entity: 'branches',
        entityType: 'tab',
        description: 'Branches Tab auf Organisation',
        parent: 'organization_management'
    },
    {
        entity: 'tour_providers',
        entityType: 'tab',
        description: 'Tour Providers Tab auf Organisation',
        parent: 'organization_management',
        ownershipFields: ['branchId']
    },
    {
        entity: 'organization_settings',
        entityType: 'tab',
        description: 'Organisation-Einstellungen Tab',
        parent: 'organization_management'
    },
    {
        entity: 'join_requests',
        entityType: 'tab',
        description: 'Beitrittsanfragen Tab',
        parent: 'organization_management'
    },
    // Settings Tabs
    {
        entity: 'password_manager',
        entityType: 'tab',
        description: 'Passwort-Manager Tab auf Settings',
        parent: 'settings',
        ownershipFields: ['createdById']
    },
    // Price Analysis Tabs
    {
        entity: 'price_analysis_listings',
        entityType: 'tab',
        description: 'OTA Listings Tab',
        parent: 'price_analysis'
    },
    {
        entity: 'price_analysis_recommendations',
        entityType: 'tab',
        description: 'Preisempfehlungen Tab',
        parent: 'price_analysis'
    },
    {
        entity: 'price_analysis_rules',
        entityType: 'tab',
        description: 'Preisregeln Tab',
        parent: 'price_analysis'
    },
    {
        entity: 'price_analysis_rate_shopping',
        entityType: 'tab',
        description: 'Rate Shopping Tab',
        parent: 'price_analysis'
    },
];
// ============================================
// ALLE BUTTONS
// ============================================
exports.ALL_BUTTONS = [
    // Request Buttons (Dashboard)
    { entity: 'request_create', entityType: 'button', description: 'Request erstellen', parent: 'requests' },
    { entity: 'request_edit', entityType: 'button', description: 'Request bearbeiten', parent: 'requests' },
    { entity: 'request_delete', entityType: 'button', description: 'Request löschen', parent: 'requests' },
    { entity: 'request_status_change', entityType: 'button', description: 'Request Status ändern', parent: 'requests' },
    // Task Buttons (Worktracker > To-Dos)
    { entity: 'task_create', entityType: 'button', description: 'Task erstellen', parent: 'todos' },
    { entity: 'task_edit', entityType: 'button', description: 'Task bearbeiten', parent: 'todos' },
    { entity: 'task_delete', entityType: 'button', description: 'Task löschen', parent: 'todos' },
    { entity: 'task_status_change', entityType: 'button', description: 'Task Status ändern', parent: 'todos' },
    // Reservation Buttons (Worktracker > Reservations)
    { entity: 'reservation_create', entityType: 'button', description: 'Reservation erstellen', parent: 'reservations' },
    { entity: 'reservation_edit', entityType: 'button', description: 'Reservation bearbeiten', parent: 'reservations' },
    { entity: 'reservation_delete', entityType: 'button', description: 'Reservation löschen', parent: 'reservations' },
    { entity: 'reservation_send_invitation', entityType: 'button', description: 'Einladung senden', parent: 'reservations' },
    { entity: 'reservation_send_passcode', entityType: 'button', description: 'Passcode senden', parent: 'reservations' },
    // Tour Booking Buttons (Worktracker > Tour Bookings)
    { entity: 'tour_booking_create', entityType: 'button', description: 'Tour Buchung erstellen', parent: 'tour_bookings' },
    { entity: 'tour_booking_edit', entityType: 'button', description: 'Tour Buchung bearbeiten', parent: 'tour_bookings' },
    { entity: 'tour_booking_cancel', entityType: 'button', description: 'Tour Buchung stornieren', parent: 'tour_bookings' },
    // Worktime Buttons (Worktracker)
    { entity: 'worktime_start', entityType: 'button', description: 'Arbeitszeit starten', parent: 'worktime' },
    { entity: 'worktime_stop', entityType: 'button', description: 'Arbeitszeit stoppen', parent: 'worktime' },
    // Consultation Buttons (Consultations)
    { entity: 'consultation_start', entityType: 'button', description: 'Beratung starten', parent: 'consultation_tracker' },
    { entity: 'consultation_stop', entityType: 'button', description: 'Beratung stoppen', parent: 'consultation_tracker' },
    { entity: 'consultation_plan', entityType: 'button', description: 'Beratung planen', parent: 'consultation_tracker' },
    { entity: 'consultation_edit', entityType: 'button', description: 'Beratung bearbeiten', parent: 'consultation_list' },
    { entity: 'consultation_delete', entityType: 'button', description: 'Beratung löschen', parent: 'consultation_list' },
    // Client Buttons (Consultations)
    { entity: 'client_create', entityType: 'button', description: 'Client erstellen', parent: 'consultation_tracker' },
    { entity: 'client_edit', entityType: 'button', description: 'Client bearbeiten', parent: 'consultation_list' },
    { entity: 'client_delete', entityType: 'button', description: 'Client löschen', parent: 'consultation_list' },
    // Working Times Buttons (Workcenter)
    { entity: 'working_time_create', entityType: 'button', description: 'Arbeitszeit erstellen', parent: 'working_times' },
    { entity: 'working_time_edit', entityType: 'button', description: 'Arbeitszeit bearbeiten', parent: 'working_times' },
    { entity: 'working_time_delete', entityType: 'button', description: 'Arbeitszeit löschen', parent: 'working_times' },
    // Shift Planning Buttons (Workcenter)
    { entity: 'shift_create', entityType: 'button', description: 'Schicht erstellen', parent: 'shift_planning' },
    { entity: 'shift_edit', entityType: 'button', description: 'Schicht bearbeiten', parent: 'shift_planning' },
    { entity: 'shift_delete', entityType: 'button', description: 'Schicht löschen', parent: 'shift_planning' },
    { entity: 'shift_swap_request', entityType: 'button', description: 'Schichttausch anfragen', parent: 'shift_planning' },
    // User Buttons (Organisation)
    { entity: 'user_create', entityType: 'button', description: 'User erstellen', parent: 'users' },
    { entity: 'user_edit', entityType: 'button', description: 'User bearbeiten', parent: 'users' },
    { entity: 'user_delete', entityType: 'button', description: 'User löschen', parent: 'users' },
    // Role Buttons (Organisation)
    { entity: 'role_create', entityType: 'button', description: 'Rolle erstellen', parent: 'roles' },
    { entity: 'role_edit', entityType: 'button', description: 'Rolle bearbeiten', parent: 'roles' },
    { entity: 'role_delete', entityType: 'button', description: 'Rolle löschen', parent: 'roles' },
    { entity: 'role_copy', entityType: 'button', description: 'Rolle kopieren', parent: 'roles' },
    // Branch Buttons (Organisation)
    { entity: 'branch_create', entityType: 'button', description: 'Branch erstellen', parent: 'branches' },
    { entity: 'branch_edit', entityType: 'button', description: 'Branch bearbeiten', parent: 'branches' },
    { entity: 'branch_delete', entityType: 'button', description: 'Branch löschen', parent: 'branches' },
    // Tour Provider Buttons (Organisation)
    { entity: 'tour_provider_create', entityType: 'button', description: 'Tour Provider erstellen', parent: 'tour_providers' },
    { entity: 'tour_provider_edit', entityType: 'button', description: 'Tour Provider bearbeiten', parent: 'tour_providers' },
    { entity: 'tour_provider_delete', entityType: 'button', description: 'Tour Provider löschen', parent: 'tour_providers' },
    // Organization Buttons
    { entity: 'organization_edit', entityType: 'button', description: 'Organisation bearbeiten', parent: 'organization_settings' },
    // Join Request Buttons
    { entity: 'join_request_approve', entityType: 'button', description: 'Beitrittsanfrage genehmigen', parent: 'join_requests' },
    { entity: 'join_request_reject', entityType: 'button', description: 'Beitrittsanfrage ablehnen', parent: 'join_requests' },
    // Invoice Buttons (Payroll)
    { entity: 'invoice_create', entityType: 'button', description: 'Rechnung erstellen', parent: 'consultation_invoices' },
    { entity: 'invoice_download', entityType: 'button', description: 'Rechnung herunterladen', parent: 'consultation_invoices' },
    { entity: 'invoice_mark_paid', entityType: 'button', description: 'Rechnung als bezahlt markieren', parent: 'consultation_invoices' },
    // Password Manager Buttons
    { entity: 'password_entry_create', entityType: 'button', description: 'Passwort-Eintrag erstellen', parent: 'password_manager' },
    { entity: 'password_entry_edit', entityType: 'button', description: 'Passwort-Eintrag bearbeiten', parent: 'password_manager' },
    { entity: 'password_entry_delete', entityType: 'button', description: 'Passwort-Eintrag löschen', parent: 'password_manager' },
    // Price Analysis Buttons
    { entity: 'price_rule_create', entityType: 'button', description: 'Preisregel erstellen', parent: 'price_analysis_rules' },
    { entity: 'price_rule_edit', entityType: 'button', description: 'Preisregel bearbeiten', parent: 'price_analysis_rules' },
    { entity: 'price_rule_delete', entityType: 'button', description: 'Preisregel löschen', parent: 'price_analysis_rules' },
    { entity: 'price_recommendation_apply', entityType: 'button', description: 'Preisempfehlung anwenden', parent: 'price_analysis_recommendations' },
    { entity: 'rate_shopping_run', entityType: 'button', description: 'Rate Shopping starten', parent: 'price_analysis_rate_shopping' },
    // Cerebro Buttons
    { entity: 'cerebro_article_create', entityType: 'button', description: 'Artikel erstellen', parent: 'cerebro' },
    { entity: 'cerebro_article_edit', entityType: 'button', description: 'Artikel bearbeiten', parent: 'cerebro' },
    { entity: 'cerebro_article_delete', entityType: 'button', description: 'Artikel löschen', parent: 'cerebro' },
    { entity: 'cerebro_media_upload', entityType: 'button', description: 'Medien hochladen', parent: 'cerebro' },
    { entity: 'cerebro_link_add', entityType: 'button', description: 'Link hinzufügen', parent: 'cerebro' },
    // Tour Management Buttons
    { entity: 'tour_create', entityType: 'button', description: 'Tour erstellen', parent: 'tour_management' },
    { entity: 'tour_edit', entityType: 'button', description: 'Tour bearbeiten', parent: 'tour_management' },
    { entity: 'tour_delete', entityType: 'button', description: 'Tour löschen', parent: 'tour_management' },
];
// ============================================
// ALLE ENTITIES (Kombiniert)
// ============================================
exports.ALL_ENTITIES = [
    ...exports.ALL_PAGES,
    ...exports.ALL_BOXES,
    ...exports.ALL_TABS,
    ...exports.ALL_BUTTONS,
];
/**
 * Admin-Rolle: Voller Zugriff auf alles
 */
exports.ADMIN_PERMISSIONS = (() => {
    const map = {};
    exports.ALL_ENTITIES.forEach(e => {
        map[`${e.entityType}_${e.entity}`] = 'all_both';
    });
    return map;
})();
/**
 * User-Rolle: Eingeschränkter Zugriff, eigene Daten bearbeiten
 */
exports.USER_PERMISSIONS = {
    // Pages
    'page_dashboard': 'all_both',
    'page_worktracker': 'all_both',
    'page_consultations': 'all_both',
    'page_team_worktime_control': 'none', // Kein Zugriff auf Workcenter
    'page_payroll': 'own_both', // Nur eigene Lohnabrechnungen
    'page_cerebro': 'all_both',
    'page_organization_management': 'none', // Kein Zugriff auf Organisation
    'page_price_analysis': 'none', // Kein Zugriff auf Preisanalyse
    'page_settings': 'all_both',
    'page_profile': 'all_both',
    'page_tour_management': 'all_read', // Touren nur lesen
    // Boxes
    'box_requests': 'own_both', // Nur eigene Requests
    'box_worktime': 'own_both', // Nur eigene Arbeitszeiten
    'box_consultation_tracker': 'own_both',
    'box_consultation_list': 'own_both',
    // Tabs
    'tab_todos': 'own_both', // Nur eigene Tasks
    'tab_reservations': 'own_both', // Nur eigene Branch
    'tab_tour_bookings': 'own_both',
    'tab_working_times': 'none',
    'tab_shift_planning': 'none',
    'tab_task_analytics': 'none',
    'tab_request_analytics': 'none',
    'tab_consultation_invoices': 'own_both',
    'tab_monthly_reports': 'own_both',
    'tab_payroll_reports': 'own_read', // Nur eigene lesen
    'tab_users': 'none',
    'tab_roles': 'none',
    'tab_branches': 'none',
    'tab_tour_providers': 'none',
    'tab_organization_settings': 'none',
    'tab_join_requests': 'none',
    'tab_password_manager': 'own_both',
    'tab_price_analysis_listings': 'none',
    'tab_price_analysis_recommendations': 'none',
    'tab_price_analysis_rules': 'none',
    'tab_price_analysis_rate_shopping': 'none',
    // Buttons - Requests
    'button_request_create': 'all_both',
    'button_request_edit': 'own_both',
    'button_request_delete': 'own_both',
    'button_request_status_change': 'own_both',
    // Buttons - Tasks
    'button_task_create': 'all_both',
    'button_task_edit': 'own_both',
    'button_task_delete': 'own_both',
    'button_task_status_change': 'own_both',
    // Buttons - Reservations
    'button_reservation_create': 'all_both',
    'button_reservation_edit': 'own_both',
    'button_reservation_delete': 'none',
    'button_reservation_send_invitation': 'own_both',
    'button_reservation_send_passcode': 'own_both',
    // Buttons - Tour Bookings
    'button_tour_booking_create': 'all_both',
    'button_tour_booking_edit': 'own_both',
    'button_tour_booking_cancel': 'own_both',
    // Buttons - Worktime
    'button_worktime_start': 'all_both',
    'button_worktime_stop': 'all_both',
    // Buttons - Consultations
    'button_consultation_start': 'all_both',
    'button_consultation_stop': 'all_both',
    'button_consultation_plan': 'all_both',
    'button_consultation_edit': 'own_both',
    'button_consultation_delete': 'own_both',
    'button_client_create': 'all_both',
    'button_client_edit': 'own_both',
    'button_client_delete': 'none',
    // Buttons - Invoices
    'button_invoice_create': 'all_both',
    'button_invoice_download': 'own_both',
    'button_invoice_mark_paid': 'none',
    // Buttons - Password Manager
    'button_password_entry_create': 'all_both',
    'button_password_entry_edit': 'own_both',
    'button_password_entry_delete': 'own_both',
    // Buttons - Cerebro
    'button_cerebro_article_create': 'all_both',
    'button_cerebro_article_edit': 'all_both',
    'button_cerebro_article_delete': 'none',
    'button_cerebro_media_upload': 'all_both',
    'button_cerebro_link_add': 'all_both',
    // Buttons - Tours
    'button_tour_create': 'none',
    'button_tour_edit': 'none',
    'button_tour_delete': 'none',
    // Alle anderen Buttons: none (werden dynamisch ergänzt)
};
/**
 * Hamburger-Rolle: Minimaler Zugriff, nur lesen
 */
exports.HAMBURGER_PERMISSIONS = {
    // Pages - Nur Basis-Seiten
    'page_dashboard': 'all_read',
    'page_worktracker': 'none',
    'page_consultations': 'none',
    'page_team_worktime_control': 'none',
    'page_payroll': 'none',
    'page_cerebro': 'all_read', // Nur lesen
    'page_organization_management': 'none',
    'page_price_analysis': 'none',
    'page_settings': 'all_both', // Eigene Einstellungen
    'page_profile': 'all_both', // Eigenes Profil
    'page_tour_management': 'all_read', // Touren nur lesen
    // Boxes
    'box_requests': 'own_read', // Nur eigene lesen
    'box_worktime': 'none',
    'box_consultation_tracker': 'none',
    'box_consultation_list': 'none',
    // Tabs - Alle none ausser nötige
    'tab_todos': 'none',
    'tab_reservations': 'none',
    'tab_tour_bookings': 'none',
    'tab_working_times': 'none',
    'tab_shift_planning': 'none',
    'tab_task_analytics': 'none',
    'tab_request_analytics': 'none',
    'tab_consultation_invoices': 'none',
    'tab_monthly_reports': 'none',
    'tab_payroll_reports': 'none',
    'tab_users': 'none',
    'tab_roles': 'none',
    'tab_branches': 'none',
    'tab_tour_providers': 'none',
    'tab_organization_settings': 'none',
    'tab_join_requests': 'none',
    'tab_password_manager': 'none',
    'tab_price_analysis_listings': 'none',
    'tab_price_analysis_recommendations': 'none',
    'tab_price_analysis_rules': 'none',
    'tab_price_analysis_rate_shopping': 'none',
    // Alle Buttons: none (Hamburger darf nichts bearbeiten)
};
// Füge fehlende Entities zu User/Hamburger mit 'none' hinzu
exports.ALL_ENTITIES.forEach(e => {
    const key = `${e.entityType}_${e.entity}`;
    if (!(key in exports.USER_PERMISSIONS)) {
        exports.USER_PERMISSIONS[key] = 'none';
    }
    if (!(key in exports.HAMBURGER_PERMISSIONS)) {
        exports.HAMBURGER_PERMISSIONS[key] = 'none';
    }
});
// ============================================
// HELPER FUNKTIONEN
// ============================================
/**
 * Generiert Permission-Einträge für eine Rolle
 */
function generatePermissionsForRole(roleId, permissionMap) {
    const permissions = [];
    for (const [key, accessLevel] of Object.entries(permissionMap)) {
        const [entityType, ...entityParts] = key.split('_');
        const entity = entityParts.join('_');
        permissions.push({
            entity,
            entityType,
            accessLevel,
            roleId,
        });
    }
    return permissions;
}
/**
 * Prüft ob ein AccessLevel ausreichend ist
 */
function hasAccess(currentLevel, requiredLevel, isOwner) {
    if (currentLevel === 'none')
        return false;
    if (currentLevel === 'all_both')
        return true;
    if (currentLevel === 'all_read')
        return requiredLevel === 'read';
    if (!isOwner)
        return false;
    if (currentLevel === 'own_both')
        return true;
    if (currentLevel === 'own_read')
        return requiredLevel === 'read';
    return false;
}
/**
 * Prüft ob ein AccessLevel Daten für alle (nicht nur eigene) erlaubt
 */
function allowsAllData(level) {
    return level === 'all_both' || level === 'all_read';
}
/**
 * Prüft ob ein AccessLevel Schreibzugriff erlaubt
 */
function allowsWrite(level, isOwner) {
    if (level === 'all_both')
        return true;
    if (level === 'own_both' && isOwner)
        return true;
    return false;
}
/**
 * Konvertiert altes AccessLevel-Format zu neuem
 * 'read' -> 'all_read', 'write' -> 'own_both', 'both' -> 'all_both', 'none' -> 'none'
 */
function convertLegacyAccessLevel(legacy) {
    switch (legacy) {
        case 'read': return 'all_read';
        case 'write': return 'own_both';
        case 'both': return 'all_both';
        case 'none': return 'none';
        default:
            // Prüfe ob bereits neues Format
            if (exports.AccessLevelValues.includes(legacy)) {
                return legacy;
            }
            return 'none';
    }
}
//# sourceMappingURL=permissions.js.map