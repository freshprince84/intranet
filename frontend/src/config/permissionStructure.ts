/**
 * PERMISSION STRUCTURE - Zentrale Definition gemäß Plan
 * 
 * Ausprägungen:
 * - PAGE: ja/nein (2 Optionen) → 'all_both' = ja, 'none' = nein
 * - BOX mit Daten: alle/eigene/nein (3 Optionen) → 'all_both', 'own_both', 'none'
 * - TAB: alle/eigene/nein (3 Optionen) → 'all_both', 'own_both', 'none'
 * - BUTTON: 
 *   - ja/nein (2 Optionen) → 'all_both' = ja, 'none' = nein
 *   - ODER alle/eigene/nein (3 Optionen) → 'all_both', 'own_both', 'none'
 */

export type PermissionType = 'page' | 'box' | 'tab' | 'button';
export type PermissionOptions = 'binary' | 'ternary'; // binary = ja/nein, ternary = alle/eigene/nein

export interface PermissionButton {
  entity: string;
  label: string;
  options: PermissionOptions;
}

export interface PermissionTab {
  entity: string;
  label: string;
  options: PermissionOptions;
  buttons?: PermissionButton[];
}

export interface PermissionBox {
  entity: string;
  label: string;
  options: PermissionOptions | null; // null = Container ohne eigene Berechtigung
  buttons?: PermissionButton[];
  tabs?: PermissionTab[];
}

export interface PermissionPage {
  entity: string;
  label: string;
  options: PermissionOptions; // immer 'binary' für Pages
  boxes?: PermissionBox[];
  tabs?: PermissionTab[];
}

/**
 * KOMPLETTE PERMISSION-STRUKTUR gemäß Plan
 */
export const PERMISSION_STRUCTURE: PermissionPage[] = [
  // ================== PAGE: Dashboard ==================
  {
    entity: 'dashboard',
    label: 'Dashboard',
    options: 'binary',
    boxes: [
      {
        entity: 'requests',
        label: 'Solicitudes',
        options: 'ternary',
        buttons: [
          { entity: 'request_create', label: 'Erstellen', options: 'ternary' },
          { entity: 'request_edit', label: 'Bearbeiten', options: 'ternary' },
          { entity: 'request_delete', label: 'Löschen', options: 'ternary' }
        ]
      }
    ]
  },

  // ================== PAGE: Worktracker ==================
  {
    entity: 'worktracker',
    label: 'Worktracker',
    options: 'binary',
    boxes: [
      {
        entity: 'zeiterfassung',
        label: 'Zeiterfassung',
        options: null, // Container ohne eigene Berechtigung
        buttons: [
          { entity: 'worktime_start', label: 'Starten', options: 'binary' },
          { entity: 'worktime_stop', label: 'Stoppen', options: 'binary' }
        ]
      }
    ],
    tabs: [
      {
        entity: 'todos',
        label: "To Do's",
        options: 'ternary',
        buttons: [
          { entity: 'todo_create', label: 'Erstellen', options: 'ternary' },
          { entity: 'todo_edit', label: 'Bearbeiten', options: 'ternary' },
          { entity: 'todo_delete', label: 'Löschen', options: 'ternary' }
        ]
      },
      {
        entity: 'reservations',
        label: 'Reservierungen',
        options: 'ternary',
        buttons: [
          { entity: 'reservation_create', label: 'Erstellen', options: 'ternary' },
          { entity: 'reservation_edit', label: 'Bearbeiten', options: 'ternary' },
          { entity: 'reservation_delete', label: 'Löschen', options: 'ternary' }
        ]
      },
      {
        entity: 'tour_bookings',
        label: 'Touren',
        options: 'ternary',
        buttons: [
          { entity: 'tour_booking_create', label: 'Erstellen', options: 'ternary' },
          { entity: 'tour_booking_edit', label: 'Bearbeiten', options: 'ternary' },
          { entity: 'tour_booking_delete', label: 'Löschen', options: 'ternary' }
        ]
      }
    ]
  },

  // ================== PAGE: Consultas ==================
  {
    entity: 'consultations',
    label: 'Consultas',
    options: 'binary',
    boxes: [
      {
        entity: 'consultas_box',
        label: 'Consultas',
        options: null, // Container ohne eigene Berechtigung
        buttons: [
          { entity: 'consultation_start', label: 'Starten', options: 'binary' },
          { entity: 'consultation_stop', label: 'Stoppen', options: 'binary' },
          { entity: 'consultation_plan', label: 'Planen', options: 'binary' },
          { entity: 'client_create', label: 'Client anlegen', options: 'binary' }
        ]
      },
      {
        entity: 'consultation_list',
        label: 'Beratungsliste',
        options: 'ternary',
        buttons: [
          { entity: 'consultation_edit', label: 'Bearbeiten', options: 'ternary' },
          { entity: 'consultation_delete', label: 'Löschen', options: 'ternary' }
        ]
      }
    ]
  },

  // ================== PAGE: Workcenter ==================
  {
    entity: 'team_worktime_control',
    label: 'Workcenter',
    options: 'binary',
    tabs: [
      {
        entity: 'arbeitszeiten',
        label: 'Arbeitszeiten',
        options: 'ternary',
        buttons: [
          { entity: 'team_worktime_create', label: 'Erstellen', options: 'ternary' },
          { entity: 'team_worktime_edit', label: 'Bearbeiten', options: 'ternary' },
          { entity: 'team_worktime_delete', label: 'Löschen', options: 'ternary' }
        ]
      },
      {
        entity: 'plan_de_turnos',
        label: 'Schichtplan',
        options: 'ternary',
        buttons: [
          { entity: 'shift_create', label: 'Erstellen', options: 'binary' },
          { entity: 'shift_edit', label: 'Bearbeiten', options: 'binary' },
          { entity: 'shift_delete', label: 'Löschen', options: 'binary' },
          { entity: 'shift_exchange_request', label: 'Tausch-Anfragen', options: 'binary' }
        ]
      },
      {
        entity: 'task_analytics',
        label: 'Task Analytics',
        options: 'ternary'
      },
      {
        entity: 'request_analytics',
        label: 'Request Analytics',
        options: 'ternary'
      }
    ]
  },

  // ================== PAGE: Nómina ==================
  {
    entity: 'payroll',
    label: 'Nómina',
    options: 'binary',
    tabs: [
      {
        entity: 'consultation_invoices',
        label: 'Beratungsrechnungen',
        options: 'ternary'
      },
      {
        entity: 'monthly_reports',
        label: 'Monatsrechnungen',
        options: 'ternary'
      },
      {
        entity: 'payroll_reports',
        label: 'Lohnabrechnungen',
        options: 'ternary'
      }
    ]
  },

  // ================== PAGE: Cerebro ==================
  {
    entity: 'cerebro',
    label: 'Cerebro',
    options: 'binary'
  },

  // ================== PAGE: Organisation ==================
  {
    entity: 'organization_management',
    label: 'Organisation',
    options: 'binary',
    tabs: [
      {
        entity: 'users',
        label: 'Benutzer',
        options: 'ternary',
        buttons: [
          { entity: 'user_create', label: 'Erstellen', options: 'binary' },
          { entity: 'user_edit', label: 'Bearbeiten', options: 'binary' },
          { entity: 'user_delete', label: 'Löschen', options: 'binary' }
        ]
      },
      {
        entity: 'roles',
        label: 'Rollen',
        options: 'ternary',
        buttons: [
          { entity: 'role_create', label: 'Erstellen', options: 'binary' },
          { entity: 'role_edit', label: 'Bearbeiten', options: 'binary' },
          { entity: 'role_delete', label: 'Löschen', options: 'binary' }
        ]
      },
      {
        entity: 'branches',
        label: 'Niederlassungen',
        options: 'ternary',
        buttons: [
          { entity: 'branch_create', label: 'Erstellen', options: 'binary' },
          { entity: 'branch_edit', label: 'Bearbeiten', options: 'binary' },
          { entity: 'branch_delete', label: 'Löschen', options: 'binary' }
        ]
      },
      {
        entity: 'tour_providers',
        label: 'Tour-Anbieter',
        options: 'ternary',
        buttons: [
          { entity: 'tour_provider_create', label: 'Anbieter erstellen', options: 'binary' },
          { entity: 'tour_provider_edit', label: 'Anbieter bearbeiten', options: 'binary' },
          { entity: 'tour_provider_delete', label: 'Anbieter löschen', options: 'binary' },
          { entity: 'tour_create', label: 'Tour erstellen', options: 'binary' },
          { entity: 'tour_edit', label: 'Tour bearbeiten', options: 'binary' },
          { entity: 'tour_delete', label: 'Tour löschen', options: 'binary' }
        ]
      },
      {
        entity: 'organization_settings',
        label: 'Organisation',
        options: 'ternary',
        buttons: [
          { entity: 'organization_create', label: 'Erstellen', options: 'binary' },
          { entity: 'organization_edit', label: 'Bearbeiten', options: 'binary' },
          { entity: 'organization_delete', label: 'Löschen', options: 'binary' }
        ]
      }
    ]
  },

  // ================== PAGE: Price Analysis ==================
  {
    entity: 'price_analysis',
    label: 'Preisanalyse',
    options: 'binary'
  },

  // ================== PAGE: Configuration ==================
  {
    entity: 'settings',
    label: 'Konfiguration',
    options: 'binary',
    tabs: [
      {
        entity: 'password_manager',
        label: 'Passwort-Manager',
        options: 'ternary'
      },
      {
        entity: 'system',
        label: 'System',
        options: 'ternary'
      }
    ]
  },

  // ================== PAGE: Profile ==================
  {
    entity: 'profile',
    label: 'Profil',
    options: 'binary'
  }
];

/**
 * Initialisiert alle Permissions aus PERMISSION_STRUCTURE mit Standardwerten
 * und übernimmt dann die gespeicherten Werte (falls vorhanden)
 */
export const initializePermissions = (
  savedPermissions: { entity: string; entityType: string; accessLevel: string }[] = []
): { entity: string; entityType: string; accessLevel: string }[] => {
  const allEntities = getAllEntities();
  const initialized: { entity: string; entityType: string; accessLevel: string }[] = [];

  allEntities.forEach(({ entity, type }) => {
    // Suche gespeicherten Wert
    const saved = savedPermissions.find(
      p => p.entity === entity && p.entityType === type
    );

    // Verwende gespeicherten Wert oder Standard 'none'
    initialized.push({
      entity,
      entityType: type,
      accessLevel: saved?.accessLevel || 'none'
    });
  });

  return initialized;
};

/**
 * Hilfsfunktion: Alle Entities aus der Struktur extrahieren
 */
export const getAllEntities = (): { entity: string; type: PermissionType; options: PermissionOptions }[] => {
  const entities: { entity: string; type: PermissionType; options: PermissionOptions }[] = [];

  PERMISSION_STRUCTURE.forEach(page => {
    entities.push({ entity: page.entity, type: 'page', options: page.options });

    page.boxes?.forEach(box => {
      if (box.options) {
        entities.push({ entity: box.entity, type: 'box', options: box.options });
      }
      box.buttons?.forEach(button => {
        entities.push({ entity: button.entity, type: 'button', options: button.options });
      });
      box.tabs?.forEach(tab => {
        entities.push({ entity: tab.entity, type: 'tab', options: tab.options });
        tab.buttons?.forEach(button => {
          entities.push({ entity: button.entity, type: 'button', options: button.options });
        });
      });
    });

    page.tabs?.forEach(tab => {
      entities.push({ entity: tab.entity, type: 'tab', options: tab.options });
      tab.buttons?.forEach(button => {
        entities.push({ entity: button.entity, type: 'button', options: button.options });
      });
    });
  });

  return entities;
};

/**
 * Standard-Berechtigungen für Rollen
 */
export const getDefaultPermissionsForRole = (roleName: string): { entity: string; entityType: string; accessLevel: string }[] => {
  const permissions: { entity: string; entityType: string; accessLevel: string }[] = [];
  const allEntities = getAllEntities();

  allEntities.forEach(({ entity, type, options }) => {
    let accessLevel: string;

    switch (roleName.toLowerCase()) {
      case 'admin':
        // Admin hat überall Vollzugriff
        accessLevel = 'all_both';
        break;
      case 'user':
        // User sieht meistens nur eigene
        accessLevel = options === 'binary' ? 'all_both' : 'own_both';
        break;
      case 'hamburger':
        // Hamburger sieht nur eigene und darf nichts
        if (type === 'page') {
          accessLevel = 'all_both'; // Seiten sehen ja
        } else if (type === 'button') {
          accessLevel = 'none'; // Keine Button-Aktionen
        } else {
          accessLevel = 'own_both'; // Nur eigene Daten
        }
        break;
      default:
        accessLevel = 'none';
    }

    permissions.push({
      entity,
      entityType: type,
      accessLevel
    });
  });

  return permissions;
};

/**
 * Optionen für Dropdown basierend auf PermissionOptions
 */
export const getAccessLevelOptions = (options: PermissionOptions): string[] => {
  if (options === 'binary') {
    return ['none', 'all_both']; // Nein / Ja
  }
  return ['none', 'own_both', 'all_both']; // Nein / Eigene / Alle
};

/**
 * Label für AccessLevel
 */
export const getAccessLevelLabel = (accessLevel: string, options: PermissionOptions): string => {
  if (options === 'binary') {
    return accessLevel === 'none' ? 'Nein' : 'Ja';
  }
  switch (accessLevel) {
    case 'none': return 'Nein';
    case 'own_both': return 'Eigene';
    case 'own_read': return 'Eigene';
    case 'all_both': return 'Alle';
    case 'all_read': return 'Alle';
    default: return 'Nein';
  }
};
