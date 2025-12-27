/**
 * ZENTRALE PERMISSION-DEFINITIONEN (Frontend-Version)
 * 
 * Diese Datei MUSS synchron mit backend/src/config/permissions.ts sein!
 * Sie wird verwendet für:
 * - usePermissions Hook
 * - Sidebar/Footer Menü
 * - ProtectedRoute
 * - Alle Komponenten die hasPermission() verwenden
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

// ============================================
// ACCESS LEVEL TYPE
// ============================================
export type AccessLevel = 'none' | 'own_read' | 'own_both' | 'all_read' | 'all_both';

export const AccessLevelValues: AccessLevel[] = ['none', 'own_read', 'own_both', 'all_read', 'all_both'];

// ============================================
// ENTITY TYPE
// ============================================
export type EntityType = 'page' | 'box' | 'tab' | 'button';

export const EntityTypeValues: EntityType[] = ['page', 'box', 'tab', 'button'];

// ============================================
// PERMISSION ENTITY INTERFACE
// ============================================
export interface PermissionEntity {
  entity: string;
  entityType: EntityType;
  description: string;
  parent?: string;
  ownershipFields?: string[];
}

// ============================================
// ALLE PAGES
// ============================================
export const ALL_PAGES: PermissionEntity[] = [
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
export const ALL_BOXES: PermissionEntity[] = [
  { entity: 'requests', entityType: 'box', description: 'Requests-Box auf Dashboard', parent: 'dashboard', ownershipFields: ['requesterId', 'responsibleId'] },
  { entity: 'worktime', entityType: 'box', description: 'Zeiterfassungs-Box auf Worktracker', parent: 'worktracker', ownershipFields: ['userId'] },
  { entity: 'consultation_tracker', entityType: 'box', description: 'Beratungs-Tracker-Box', parent: 'consultations', ownershipFields: ['userId'] },
  { entity: 'consultation_list', entityType: 'box', description: 'Beratungsliste-Box', parent: 'consultations', ownershipFields: ['userId'] },
];

// ============================================
// ALLE TABS (Innerhalb von Pages/Boxes)
// ============================================
export const ALL_TABS: PermissionEntity[] = [
  // Worktracker Tabs
  { entity: 'todos', entityType: 'tab', description: 'To-Dos Tab', parent: 'worktracker', ownershipFields: ['responsibleId', 'qualityControlId', 'roleId'] },
  { entity: 'reservations', entityType: 'tab', description: 'Reservations Tab', parent: 'worktracker', ownershipFields: ['branchId'] },
  { entity: 'tour_bookings', entityType: 'tab', description: 'Tour Bookings Tab', parent: 'worktracker', ownershipFields: ['bookedById', 'branchId'] },
  
  // Workcenter Tabs
  { entity: 'working_times', entityType: 'tab', description: 'Arbeitszeiten Tab', parent: 'team_worktime_control', ownershipFields: ['userId'] },
  { entity: 'shift_planning', entityType: 'tab', description: 'Schichtplanung Tab', parent: 'team_worktime_control', ownershipFields: ['userId'] },
  { entity: 'task_analytics', entityType: 'tab', description: 'Task Analytics Tab', parent: 'team_worktime_control', ownershipFields: ['responsibleId', 'qualityControlId'] },
  { entity: 'request_analytics', entityType: 'tab', description: 'Request Analytics Tab', parent: 'team_worktime_control', ownershipFields: ['requesterId', 'responsibleId'] },
  
  // Payroll Tabs
  { entity: 'consultation_invoices', entityType: 'tab', description: 'Beratungsrechnungen Tab', parent: 'payroll', ownershipFields: ['userId'] },
  { entity: 'monthly_reports', entityType: 'tab', description: 'Monatsrechnungen Tab', parent: 'payroll', ownershipFields: ['userId'] },
  { entity: 'payroll_reports', entityType: 'tab', description: 'Lohnabrechnungen Tab', parent: 'payroll', ownershipFields: ['userId'] },
  
  // Organisation Tabs
  { entity: 'users', entityType: 'tab', description: 'Users Tab', parent: 'organization_management' },
  { entity: 'roles', entityType: 'tab', description: 'Roles Tab', parent: 'organization_management' },
  { entity: 'branches', entityType: 'tab', description: 'Branches Tab', parent: 'organization_management' },
  { entity: 'tour_providers', entityType: 'tab', description: 'Tour Providers Tab', parent: 'organization_management', ownershipFields: ['branchId'] },
  { entity: 'organization_settings', entityType: 'tab', description: 'Organisation-Einstellungen Tab', parent: 'organization_management' },
  { entity: 'join_requests', entityType: 'tab', description: 'Beitrittsanfragen Tab', parent: 'organization_management' },
  
  // Settings Tabs
  { entity: 'password_manager', entityType: 'tab', description: 'Passwort-Manager Tab', parent: 'settings', ownershipFields: ['createdById'] },
  
  // Price Analysis Tabs
  { entity: 'price_analysis_listings', entityType: 'tab', description: 'OTA Listings Tab', parent: 'price_analysis' },
  { entity: 'price_analysis_recommendations', entityType: 'tab', description: 'Preisempfehlungen Tab', parent: 'price_analysis' },
  { entity: 'price_analysis_rules', entityType: 'tab', description: 'Preisregeln Tab', parent: 'price_analysis' },
  { entity: 'price_analysis_rate_shopping', entityType: 'tab', description: 'Rate Shopping Tab', parent: 'price_analysis' },
];

// ============================================
// ALLE BUTTONS
// ============================================
export const ALL_BUTTONS: PermissionEntity[] = [
  // Request Buttons
  { entity: 'request_create', entityType: 'button', description: 'Request erstellen', parent: 'requests' },
  { entity: 'request_edit', entityType: 'button', description: 'Request bearbeiten', parent: 'requests' },
  { entity: 'request_delete', entityType: 'button', description: 'Request löschen', parent: 'requests' },
  { entity: 'request_status_change', entityType: 'button', description: 'Request Status ändern', parent: 'requests' },
  
  // Task Buttons
  { entity: 'task_create', entityType: 'button', description: 'Task erstellen', parent: 'todos' },
  { entity: 'task_edit', entityType: 'button', description: 'Task bearbeiten', parent: 'todos' },
  { entity: 'task_delete', entityType: 'button', description: 'Task löschen', parent: 'todos' },
  { entity: 'task_status_change', entityType: 'button', description: 'Task Status ändern', parent: 'todos' },
  
  // Reservation Buttons
  { entity: 'reservation_create', entityType: 'button', description: 'Reservation erstellen', parent: 'reservations' },
  { entity: 'reservation_edit', entityType: 'button', description: 'Reservation bearbeiten', parent: 'reservations' },
  { entity: 'reservation_delete', entityType: 'button', description: 'Reservation löschen', parent: 'reservations' },
  { entity: 'reservation_send_invitation', entityType: 'button', description: 'Einladung senden', parent: 'reservations' },
  { entity: 'reservation_send_passcode', entityType: 'button', description: 'Passcode senden', parent: 'reservations' },
  
  // Tour Booking Buttons
  { entity: 'tour_booking_create', entityType: 'button', description: 'Tour Buchung erstellen', parent: 'tour_bookings' },
  { entity: 'tour_booking_edit', entityType: 'button', description: 'Tour Buchung bearbeiten', parent: 'tour_bookings' },
  { entity: 'tour_booking_cancel', entityType: 'button', description: 'Tour Buchung stornieren', parent: 'tour_bookings' },
  
  // Worktime Buttons
  { entity: 'worktime_start', entityType: 'button', description: 'Arbeitszeit starten', parent: 'worktime' },
  { entity: 'worktime_stop', entityType: 'button', description: 'Arbeitszeit stoppen', parent: 'worktime' },
  
  // Consultation Buttons
  { entity: 'consultation_start', entityType: 'button', description: 'Beratung starten', parent: 'consultation_tracker' },
  { entity: 'consultation_stop', entityType: 'button', description: 'Beratung stoppen', parent: 'consultation_tracker' },
  { entity: 'consultation_plan', entityType: 'button', description: 'Beratung planen', parent: 'consultation_tracker' },
  { entity: 'consultation_edit', entityType: 'button', description: 'Beratung bearbeiten', parent: 'consultation_list' },
  { entity: 'consultation_delete', entityType: 'button', description: 'Beratung löschen', parent: 'consultation_list' },
  
  // Client Buttons
  { entity: 'client_create', entityType: 'button', description: 'Client erstellen', parent: 'consultation_tracker' },
  { entity: 'client_edit', entityType: 'button', description: 'Client bearbeiten', parent: 'consultation_list' },
  { entity: 'client_delete', entityType: 'button', description: 'Client löschen', parent: 'consultation_list' },
  
  // Working Times Buttons
  { entity: 'working_time_create', entityType: 'button', description: 'Arbeitszeit erstellen', parent: 'working_times' },
  { entity: 'working_time_edit', entityType: 'button', description: 'Arbeitszeit bearbeiten', parent: 'working_times' },
  { entity: 'working_time_delete', entityType: 'button', description: 'Arbeitszeit löschen', parent: 'working_times' },
  
  // Shift Planning Buttons
  { entity: 'shift_create', entityType: 'button', description: 'Schicht erstellen', parent: 'shift_planning' },
  { entity: 'shift_edit', entityType: 'button', description: 'Schicht bearbeiten', parent: 'shift_planning' },
  { entity: 'shift_delete', entityType: 'button', description: 'Schicht löschen', parent: 'shift_planning' },
  { entity: 'shift_swap_request', entityType: 'button', description: 'Schichttausch anfragen', parent: 'shift_planning' },
  
  // User Buttons
  { entity: 'user_create', entityType: 'button', description: 'User erstellen', parent: 'users' },
  { entity: 'user_edit', entityType: 'button', description: 'User bearbeiten', parent: 'users' },
  { entity: 'user_delete', entityType: 'button', description: 'User löschen', parent: 'users' },
  
  // Role Buttons
  { entity: 'role_create', entityType: 'button', description: 'Rolle erstellen', parent: 'roles' },
  { entity: 'role_edit', entityType: 'button', description: 'Rolle bearbeiten', parent: 'roles' },
  { entity: 'role_delete', entityType: 'button', description: 'Rolle löschen', parent: 'roles' },
  { entity: 'role_copy', entityType: 'button', description: 'Rolle kopieren', parent: 'roles' },
  
  // Branch Buttons
  { entity: 'branch_create', entityType: 'button', description: 'Branch erstellen', parent: 'branches' },
  { entity: 'branch_edit', entityType: 'button', description: 'Branch bearbeiten', parent: 'branches' },
  { entity: 'branch_delete', entityType: 'button', description: 'Branch löschen', parent: 'branches' },
  
  // Tour Provider Buttons
  { entity: 'tour_provider_create', entityType: 'button', description: 'Tour Provider erstellen', parent: 'tour_providers' },
  { entity: 'tour_provider_edit', entityType: 'button', description: 'Tour Provider bearbeiten', parent: 'tour_providers' },
  { entity: 'tour_provider_delete', entityType: 'button', description: 'Tour Provider löschen', parent: 'tour_providers' },
  
  // Organization Buttons
  { entity: 'organization_edit', entityType: 'button', description: 'Organisation bearbeiten', parent: 'organization_settings' },
  
  // Join Request Buttons
  { entity: 'join_request_approve', entityType: 'button', description: 'Beitrittsanfrage genehmigen', parent: 'join_requests' },
  { entity: 'join_request_reject', entityType: 'button', description: 'Beitrittsanfrage ablehnen', parent: 'join_requests' },
  
  // Invoice Buttons
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
export const ALL_ENTITIES: PermissionEntity[] = [
  ...ALL_PAGES,
  ...ALL_BOXES,
  ...ALL_TABS,
  ...ALL_BUTTONS,
];

// ============================================
// HELPER FUNKTIONEN
// ============================================

/**
 * Prüft ob ein AccessLevel ausreichend ist
 */
export function hasAccess(
  currentLevel: AccessLevel,
  requiredLevel: 'read' | 'write',
  isOwner: boolean
): boolean {
  if (currentLevel === 'none') return false;
  
  if (currentLevel === 'all_both') return true;
  if (currentLevel === 'all_read') return requiredLevel === 'read';
  
  if (!isOwner) return false;
  
  if (currentLevel === 'own_both') return true;
  if (currentLevel === 'own_read') return requiredLevel === 'read';
  
  return false;
}

/**
 * Prüft ob ein AccessLevel Daten für alle (nicht nur eigene) erlaubt
 */
export function allowsAllData(level: AccessLevel): boolean {
  return level === 'all_both' || level === 'all_read';
}

/**
 * Prüft ob ein AccessLevel Schreibzugriff erlaubt
 */
export function allowsWrite(level: AccessLevel, isOwner: boolean): boolean {
  if (level === 'all_both') return true;
  if (level === 'own_both' && isOwner) return true;
  return false;
}

/**
 * Konvertiert altes AccessLevel-Format zu neuem
 * 'read' -> 'all_read', 'write' -> 'own_both', 'both' -> 'all_both', 'none' -> 'none'
 */
export function convertLegacyAccessLevel(legacy: string): AccessLevel {
  switch (legacy) {
    case 'read': return 'all_read';
    case 'write': return 'own_both';
    case 'both': return 'all_both';
    case 'none': return 'none';
    default:
      // Prüfe ob bereits neues Format
      if (AccessLevelValues.includes(legacy as AccessLevel)) {
        return legacy as AccessLevel;
      }
      return 'none';
  }
}

/**
 * Prüft ob Element sichtbar ist (AccessLevel != 'none')
 */
export function isVisible(level: AccessLevel | undefined): boolean {
  return level !== undefined && level !== 'none';
}

/**
 * Findet die Ownership-Felder für eine Entity
 */
export function getOwnershipFields(entity: string, entityType: EntityType): string[] {
  const allEntities = [...ALL_PAGES, ...ALL_BOXES, ...ALL_TABS, ...ALL_BUTTONS];
  const found = allEntities.find(e => e.entity === entity && e.entityType === entityType);
  return found?.ownershipFields || [];
}
