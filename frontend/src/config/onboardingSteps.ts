import { OnboardingStep } from '../contexts/OnboardingContext.tsx';

// Onboarding-Schritte definieren
// Diese werden basierend auf Berechtigungen gefiltert
export const onboardingSteps: OnboardingStep[] = [
  // ============================================
  // PROZESS 0: Profil vervollständigen (ERSTER SCHRITT)
  // ============================================
  {
    id: 'profile_complete',
    title: 'onboarding.steps.profile_complete.title',
    description: 'onboarding.steps.profile_complete.description',
    target: '[data-onboarding="profile-page"]',
    position: 'center',
    route: '/profile',
    order: -1,
    page: 'profile',
    process: 'profile-completion',
    action: 'wait', // Wartet auf Profil-Speicherung
    roleFilter: ['User', 'Hamburger', 'Admin']
  },
  // ============================================
  // PROZESS 0.25: Organisation beitreten oder gründen
  // ============================================
  {
    id: 'join_or_create_organization',
    title: 'onboarding.steps.join_or_create_organization.title',
    description: 'onboarding.steps.join_or_create_organization.description',
    target: '[data-onboarding="organization-buttons"]',
    position: 'bottom',
    route: '/organization',
    order: 0.25,
    page: 'organisation',
    process: 'organization-setup',
    action: 'wait', // Wartet auf Organisation-Beitritt/Gründung
    roleFilter: ['User', 'Hamburger', 'Admin'],
    // Nur anzeigen wenn User KEINE Organisation hat
    showCondition: 'hasNoOrganization'
  },
  // ============================================
  // PROZESS 0.5: Rolle wechseln nach Organisation-Beitritt
  // ============================================
  {
    id: 'switch_role_after_join',
    title: 'onboarding.steps.switch_role_after_join.title',
    description: 'onboarding.steps.switch_role_after_join.description',
    target: '[data-onboarding="switch-role-menu"]',
    position: 'bottom',
    route: '/dashboard',
    order: 0.5, // Nach Org-Beitritt, vor Dokumenten-Upload
    page: 'dashboard',
    process: 'role-switch',
    action: 'wait', // Wartet auf Rollenwechsel
    roleFilter: ['User', 'Hamburger', 'Admin'],
    // Nur anzeigen wenn User neue Rolle mit Organisation hat, die noch nicht aktiv ist
    showCondition: 'hasInactiveOrgRole'
  },
  // ============================================
  // PROZESS 0.75: Identitätsdokument hochladen (nur Kolumbien)
  // ============================================
  {
    id: 'upload_identification_document',
    title: 'onboarding.steps.upload_identification_document.title',
    description: 'onboarding.steps.upload_identification_document.description',
    target: '[data-onboarding="upload-document-button"]',
    position: 'bottom',
    route: '/profile',
    order: 0.75, // Nach Rollenwechsel, vor normaler Tour
    page: 'profile',
    process: 'document-upload',
    action: 'wait', // Wartet auf Dokumenten-Upload
    roleFilter: ['User', 'Hamburger', 'Admin'],
    // Nur anzeigen wenn Organisation in Kolumbien ist und User noch kein Dokument hat
    showCondition: 'needsIdentificationDocument'
  },
  // ============================================
  // PROZESS 1: Dashboard-Übersicht
  // ============================================
  {
    id: 'welcome',
    title: 'onboarding.steps.welcome.title',
    description: 'onboarding.steps.welcome.description',
    position: 'center',
    route: '/dashboard',
    order: 0,
    page: 'dashboard',
    process: 'dashboard-overview',
    roleFilter: ['User', 'Hamburger', 'Admin']
  },
  {
    id: 'dashboard_layout',
    title: 'onboarding.steps.dashboard_layout.title',
    description: 'onboarding.steps.dashboard_layout.description',
    target: '[data-onboarding="dashboard-header"]',
    position: 'top',
    route: '/dashboard',
    order: 1,
    page: 'dashboard',
    process: 'dashboard-overview',
    requiredPermissions: [
      { entity: 'dashboard', entityType: 'page', accessLevel: 'read' }
    ],
    roleFilter: ['User', 'Hamburger', 'Admin']
  },
  {
    id: 'requests_section',
    title: 'onboarding.steps.requests_section.title',
    description: 'onboarding.steps.requests_section.description',
    target: '[data-onboarding="requests-section"]',
    position: 'top',
    route: '/dashboard',
    order: 2,
    page: 'dashboard',
    process: 'dashboard-overview',
    requiredPermissions: [
      { entity: 'requests', entityType: 'table', accessLevel: 'read' }
    ],
    roleFilter: ['User', 'Admin']
  },
  {
    id: 'worktime_stats',
    title: 'onboarding.steps.worktime_stats.title',
    description: 'onboarding.steps.worktime_stats.description',
    target: '[data-onboarding="worktime-stats"]',
    position: 'top',
    route: '/dashboard',
    order: 3,
    page: 'dashboard',
    process: 'dashboard-overview',
    requiredPermissions: [
      { entity: 'worktime', entityType: 'table', accessLevel: 'read' }
    ],
    roleFilter: ['User', 'Admin']
  },

  // ============================================
  // PROZESS 2: Request erstellen
  // ============================================
  {
    id: 'create_request_button',
    title: 'onboarding.steps.create_request_button.title',
    description: 'onboarding.steps.create_request_button.description',
    target: '[data-onboarding="create-request-button"]',
    position: 'bottom',
    route: '/dashboard',
    order: 4,
    page: 'dashboard',
    process: 'request-creation',
    requiredPermissions: [
      { entity: 'request_create', entityType: 'button', accessLevel: 'write' }
    ],
    roleFilter: ['User', 'Admin']
  },
  {
    id: 'request_form',
    title: 'onboarding.steps.request_form.title',
    description: 'onboarding.steps.request_form.description',
    target: '[data-onboarding="request-form"]',
    position: 'center',
    route: '/dashboard',
    order: 5,
    page: 'dashboard',
    process: 'request-creation',
    action: 'wait',
    requiredPermissions: [
      { entity: 'request_create', entityType: 'button', accessLevel: 'write' }
    ],
    roleFilter: ['User', 'Admin']
  },

  // ============================================
  // PROZESS 3: Task-Management
  // ============================================
  {
    id: 'worktracker_menu',
    title: 'onboarding.steps.worktracker_menu.title',
    description: 'onboarding.steps.worktracker_menu.description',
    target: '[data-onboarding="worktracker-menu"]',
    position: 'left',
    route: '/dashboard',
    order: 6,
    page: 'dashboard',
    process: 'task-management',
    action: 'navigate',
    requiredPermissions: [
      { entity: 'worktracker', entityType: 'page', accessLevel: 'read' }
    ],
    roleFilter: ['User', 'Admin']
  },
  {
    id: 'task_list',
    title: 'onboarding.steps.task_list.title',
    description: 'onboarding.steps.task_list.description',
    target: '[data-onboarding="task-list"]',
    position: 'top',
    route: '/worktracker',
    order: 7,
    page: 'worktracker',
    process: 'task-management',
    requiredPermissions: [
      { entity: 'tasks', entityType: 'table', accessLevel: 'read' }
    ],
    roleFilter: ['User', 'Admin']
  },
  {
    id: 'create_task_button',
    title: 'onboarding.steps.create_task_button.title',
    description: 'onboarding.steps.create_task_button.description',
    target: '[data-onboarding="create-task-button"]',
    position: 'bottom',
    route: '/worktracker',
    order: 8,
    page: 'worktracker',
    process: 'task-management',
    requiredPermissions: [
      { entity: 'task_create', entityType: 'button', accessLevel: 'write' }
    ],
    roleFilter: ['User', 'Admin']
  },

  // ============================================
  // PROZESS 4: Zeiterfassung
  // ============================================
  {
    id: 'start_worktime',
    title: 'onboarding.steps.start_worktime.title',
    description: 'onboarding.steps.start_worktime.description',
    target: '[data-onboarding="start-worktime"]',
    position: 'top',
    route: '/worktracker',
    order: 9,
    page: 'worktracker',
    process: 'time-tracking',
    requiredPermissions: [
      { entity: 'button_worktime_start', entityType: 'button', accessLevel: 'write' }
    ],
    roleFilter: ['User', 'Admin']
  },
  {
    id: 'stop_worktime',
    title: 'onboarding.steps.stop_worktime.title',
    description: 'onboarding.steps.stop_worktime.description',
    target: '[data-onboarding="stop-worktime"]',
    position: 'top',
    route: '/worktracker',
    order: 10,
    page: 'worktracker',
    process: 'time-tracking',
    requiredPermissions: [
      { entity: 'button_worktime_stop', entityType: 'button', accessLevel: 'write' }
    ],
    roleFilter: ['User', 'Admin']
  },

  // ============================================
  // PROZESS 5: Cerebro Wiki
  // ============================================
  {
    id: 'cerebro_menu',
    title: 'onboarding.steps.cerebro_menu.title',
    description: 'onboarding.steps.cerebro_menu.description',
    target: '[data-onboarding="cerebro-menu"]',
    position: 'left',
    route: '/worktracker',
    order: 11,
    page: 'worktracker',
    process: 'knowledge-base',
    action: 'navigate',
    requiredPermissions: [
      { entity: 'cerebro', entityType: 'page', accessLevel: 'read' }
    ],
    roleFilter: ['Hamburger', 'User', 'Admin']
  },
  {
    id: 'cerebro_search',
    title: 'onboarding.steps.cerebro_search.title',
    description: 'onboarding.steps.cerebro_search.description',
    target: '[data-onboarding="cerebro-search"]',
    position: 'top',
    route: '/cerebro',
    order: 12,
    page: 'cerebro',
    process: 'knowledge-base',
    requiredPermissions: [
      { entity: 'cerebro', entityType: 'page', accessLevel: 'read' }
    ],
    roleFilter: ['Hamburger', 'User', 'Admin']
  },

  // ============================================
  // PROZESS 6: Settings
  // ============================================
  {
    id: 'settings_menu',
    title: 'onboarding.steps.settings_menu.title',
    description: 'onboarding.steps.settings_menu.description',
    target: '[data-onboarding="settings-menu"]',
    position: 'left',
    route: '/cerebro',
    order: 13,
    page: 'cerebro',
    process: 'settings',
    action: 'navigate',
    requiredPermissions: [
      { entity: 'settings', entityType: 'page', accessLevel: 'read' }
    ],
    roleFilter: ['Hamburger', 'User', 'Admin']
  },
  {
    id: 'settings_overview',
    title: 'onboarding.steps.settings_overview.title',
    description: 'onboarding.steps.settings_overview.description',
    target: '[data-onboarding="settings-overview"]',
    position: 'top',
    route: '/settings',
    order: 14,
    page: 'settings',
    process: 'settings',
    requiredPermissions: [
      { entity: 'settings', entityType: 'page', accessLevel: 'read' }
    ],
    roleFilter: ['Hamburger', 'User', 'Admin']
  }
];

