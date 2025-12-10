import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { roleApi, branchApi } from '../api/apiClient.ts';
import { Role, AccessLevel } from '../types/interfaces.ts';
import { PencilIcon, TrashIcon, PlusIcon, FunnelIcon, XMarkIcon, CheckIcon, ArrowPathIcon, DocumentDuplicateIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { useError } from '../contexts/ErrorContext.tsx';
import { ErrorCategory } from '../services/ErrorHandler.ts';
import { useSidepane } from '../contexts/SidepaneContext.tsx';
import { logger } from '../utils/logger.ts';

interface RoleManagementTabProps {
  onRolesChange?: () => void;
  onError: (error: string) => void;
  readOnly?: boolean;
}

// Definiere Seiten, die immer sichtbar sein sollen (ohne Berechtigungsprüfung)
const alwaysVisiblePages = ['dashboard', 'worktracker', 'cerebro', 'settings', 'profile'];

// ALLE SEITEN IM SYSTEM (synchron mit Backend)
const defaultPages = [
  'dashboard',
  'worktracker',
  'consultations',
  'team_worktime_control', // = workcenter
  'payroll', // = lohnabrechnung
  'organization_management', // = organisation (Hauptseite)
  'cerebro',
  'settings',
  'profile',
  'tour_management', // NEU: Touren-Verwaltung
  'password_manager' // NEU: Passwort-Manager
];

// ALLE TABELLEN IM SYSTEM (synchron mit Backend)
const defaultTables = [
  'requests',           // auf dashboard
  'tasks',             // auf worktracker
  'reservations',      // auf worktracker (in To Do's Box)
  'users',             // auf organization_management
  'roles',             // auf organization_management
  'organization',      // auf organization_management
  'organization_join_requests', // auf organization_management
  'organization_users',  // auf organization_management
  'team_worktime',     // auf team_worktime_control
  'worktime',          // auf worktracker
  'clients',           // auf consultations
  'consultation_invoices', // auf consultations
  'branches',          // auf settings/system
  'notifications',     // allgemein
  'settings',          // auf settings
  'monthly_reports',    // auf consultations/reports
  'tours',             // NEU: auf tour_management
  'tour_bookings'      // NEU: auf tour_management
];

// ALLE BUTTONS IM SYSTEM (synchron mit Backend)
const defaultButtons = [
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
  'payroll_edit',
  
  // Tour Management Buttons
  'tour_create',
  'tour_edit',
  'tour_delete',
  'tour_view',
  'tour_booking_create',
  'tour_booking_edit',
  'tour_booking_cancel',
  'tour_provider_create',
  'tour_provider_edit',
  'tour_provider_delete',
  
  // Password Manager Buttons
  'password_entry_create',
  'password_entry_edit',
  'password_entry_delete'
];

// Definiert die Zuordnung von Tabellen zu ihren übergeordneten Seiten
const tableToPageMapping = {
  'requests': 'dashboard',
  'tasks': 'worktracker',
  'reservations': 'worktracker',
  'users': 'organization_management',
  'roles': 'organization_management',
  'organization': 'organization_management',
  'organization_join_requests': 'organization_management',
  'organization_users': 'organization_management',
  'team_worktime': 'team_worktime_control',
  'worktime': 'worktracker',
  'clients': 'consultations',
  'consultation_invoices': 'consultations',
  'branches': 'settings',
  'notifications': 'general',
  'settings': 'settings',
  'monthly_reports': 'consultations',
  'tours': 'tour_management',
  'tour_bookings': 'tour_management'
};

// Definiert die Zuordnung von Buttons zu ihren übergeordneten Seiten/Bereichen
const buttonToPageMapping = {
  'database_reset_table': 'settings',
  'database_logs': 'settings',
  'invoice_create': 'consultations',
  'invoice_download': 'consultations',
  'invoice_mark_paid': 'consultations',
  'invoice_settings': 'consultations',
  'todo_create': 'worktracker',
  'todo_edit': 'worktracker',
  'todo_delete': 'worktracker',
  'task_create': 'worktracker',
  'task_edit': 'worktracker',
  'task_delete': 'worktracker',
  'user_create': 'organization_management',
  'user_edit': 'organization_management',
  'user_delete': 'organization_management',
  'role_assign': 'organization_management',
  'role_create': 'organization_management',
  'role_edit': 'organization_management',
  'role_delete': 'organization_management',
  'organization_create': 'organization_management',
  'organization_edit': 'organization_management',
  'organization_delete': 'organization_management',
  'worktime_start': 'worktracker',
  'worktime_stop': 'worktracker',
  'worktime_edit': 'worktracker',
  'worktime_delete': 'worktracker',
  'cerebro': 'cerebro',
  'consultation_start': 'consultations',
  'consultation_stop': 'consultations',
  'consultation_edit': 'consultations',
  'client_create': 'consultations',
  'client_edit': 'consultations',
  'client_delete': 'consultations',
  'settings_system': 'settings',
  'settings_notifications': 'settings',
  'settings_profile': 'settings',
  'payroll_generate': 'payroll',
  'payroll_export': 'payroll',
  'payroll_edit': 'payroll',
  'tour_create': 'tour_management',
  'tour_edit': 'tour_management',
  'tour_delete': 'tour_management',
  'tour_view': 'tour_management',
  'tour_booking_create': 'tour_management',
  'tour_booking_edit': 'tour_management',
  'tour_booking_cancel': 'tour_management',
  'tour_provider_create': 'tour_management',
  'tour_provider_edit': 'tour_management',
  'tour_provider_delete': 'tour_management',
  'password_entry_create': 'password_manager',
  'password_entry_edit': 'password_manager',
  'password_entry_delete': 'password_manager'
};

// Definiert die Zuordnung von Buttons zu ihren zugehörigen Tabellen
const buttonToTableMapping: Record<string, string | null> = {
  // Worktime Buttons → worktime Tabelle
  'worktime_start': 'worktime',
  'worktime_stop': 'worktime',
  'worktime_edit': 'worktime',
  'worktime_delete': 'worktime',
  // Task/Todo Buttons → tasks Tabelle
  'task_create': 'tasks',
  'task_edit': 'tasks',
  'task_delete': 'tasks',
  'todo_create': 'tasks',
  'todo_edit': 'tasks',
  'todo_delete': 'tasks',
  // Client Buttons → clients Tabelle
  'client_create': 'clients',
  'client_edit': 'clients',
  'client_delete': 'clients',
  'consultation_start': 'clients',
  'consultation_stop': 'clients',
  'consultation_edit': 'clients',
  // Invoice Buttons → consultation_invoices Tabelle
  'invoice_create': 'consultation_invoices',
  'invoice_download': 'consultation_invoices',
  'invoice_mark_paid': 'consultation_invoices',
  'invoice_settings': 'consultation_invoices',
  // User Management Buttons → users/roles Tabellen
  'user_create': 'users',
  'user_edit': 'users',
  'user_delete': 'users',
  'role_assign': 'roles',
  'role_create': 'roles',
  'role_edit': 'roles',
  'role_delete': 'roles',
  // Organization Management Buttons → organization Tabelle
  'organization_create': 'organization',
  'organization_edit': 'organization',
  'organization_delete': 'organization',
  // Settings Buttons → settings Tabelle
  'settings_system': 'settings',
  'settings_notifications': 'settings',
  'settings_profile': 'settings',
  // Tour Management Buttons → tours/tour_bookings Tabellen
  'tour_create': 'tours',
  'tour_edit': 'tours',
  'tour_delete': 'tours',
  'tour_view': 'tours',
  'tour_booking_create': 'tour_bookings',
  'tour_booking_edit': 'tour_bookings',
  'tour_booking_cancel': 'tour_bookings',
  'tour_provider_create': null, // Keine direkte Tabelle
  'tour_provider_edit': null,
  'tour_provider_delete': null,
  // Password Manager Buttons → keine direkte Tabelle (entry-level permissions)
  'password_entry_create': null,
  'password_entry_edit': null,
  'password_entry_delete': null,
  // Buttons ohne direkte Tabelle-Zuordnung
  'database_reset_table': null,
  'database_logs': null,
  'cerebro': null,
  'payroll_generate': null,
  'payroll_export': null,
  'payroll_edit': null
};

// Display-Name-Mapping für Seiten (DB-Interne Bezeichnung → Frontend-Bezeichnung)
// Wird dynamisch aus Übersetzungen geladen

// Display-Name-Mapping für Tabellen (DB-Interne Bezeichnung → Frontend-Bezeichnung)
// Wird dynamisch aus Übersetzungen geladen

// Display-Name-Mapping für Buttons wird dynamisch in der Komponente geladen

// TableID für gespeicherte Filter
const ROLES_TABLE_ID = 'roles-table';

// Standardrollen-IDs (für Rollen ohne Organisation)
const STANDARD_ROLE_IDS = [1, 2, 999]; // Admin (1), User (2), Hamburger (999)

// Standardrollen-Namen (dürfen nicht bearbeitet/gelöscht werden, egal von welcher Organisation)
const STANDARD_ROLE_NAMES = ['Admin', 'User', 'Hamburger'];

// Helper-Funktion zur Prüfung ob es sich um eine Standardrolle handelt
const isStandardRole = (roleId: number, roleName?: string): boolean => {
  // Prüfe zuerst auf Standard-IDs (für Rollen ohne Organisation)
  if (STANDARD_ROLE_IDS.includes(roleId)) {
    return true;
  }
  // Prüfe auf Standard-Namen (für Rollen in Organisationen)
  if (roleName && STANDARD_ROLE_NAMES.includes(roleName)) {
    return true;
  }
  return false;
};

interface RoleFormData {
  name: string;
  description: string;
  permissions: {
    entity: string;
    entityType: string;
    accessLevel: AccessLevel;
  }[];
}


// RoleCard-Komponente für mobile Ansicht
const RoleCard: React.FC<{
  role: Role;
  onEdit: (role: Role) => void;
  onDelete: (roleId: number) => void;
  onCopy: (role: Role) => void;
  canEdit: boolean;
  canDelete: boolean;
  canCopy: boolean;
}> = ({ role, onEdit, onDelete, onCopy, canEdit, canDelete, canCopy }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">
      {/* Header mit Rollenname und Aktionen */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{role.name}</h3>
        
        <div className="flex space-x-2">
          {canCopy && (
            <div className="relative group">
              <button
                onClick={() => onCopy(role)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
              >
                <DocumentDuplicateIcon className="h-5 w-5" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('roles.actions.copy')}
              </div>
            </div>
          )}
          
          {canEdit && (
            <div className="relative group">
              <button
                onClick={() => onEdit(role)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('roles.actions.edit')}
              </div>
            </div>
          )}
          
          {canDelete && (
            <div className="relative group">
              <button
                onClick={() => onDelete(role.id)}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                {t('roles.actions.delete')}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Beschreibung */}
      <p className="text-sm text-gray-600 dark:text-gray-400">{role.description || t('roles.noDescription')}</p>
      
      {/* Branch-Zuweisungen */}
      <div className="mt-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {role.allBranches ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
              {t('roles.form.allBranches') || 'Alle Branches'}
            </span>
          ) : role.branches && role.branches.length > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
              {role.branches.length} {t('roles.form.specificBranches') || 'Branches'}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
              {t('roles.form.noBranches') || 'Keine Branches'}
            </span>
          )}
        </span>
      </div>
      
      {/* Berechtigungen - kompakt */}
      <div className="mt-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">{t('roles.permissions')}:</h4>
        <div className="flex flex-wrap gap-1">
          {role.permissions
            .filter(perm => perm.accessLevel !== 'none') // Nur relevante Berechtigungen anzeigen
            .slice(0, 8) // Begrenze die Anzahl der angezeigten Berechtigungen
            .map(permission => (
              <span 
                key={`${permission.entity}-${permission.entityType}`}
                className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded"
              >
                {permission.entity}: {permission.accessLevel}
              </span>
            ))}
          {role.permissions.filter(perm => perm.accessLevel !== 'none').length > 8 && (
            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">
                +{role.permissions.filter(perm => perm.accessLevel !== 'none').length - 8} {t('common.showMore')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const RoleManagementTab: React.FC<RoleManagementTabProps> = ({ onRolesChange, onError, readOnly = false }) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Display-Name-Mapping für Seiten (dynamisch aus Übersetzungen)
  const pageDisplayNames = useMemo(() => ({
    'dashboard': t('roles.pages.dashboard'),
    'worktracker': t('roles.pages.worktracker'),
    'consultations': t('roles.pages.consultations'),
    'team_worktime_control': t('roles.pages.team_worktime_control'),
    'payroll': t('roles.pages.payroll'),
    'organization_management': t('roles.pages.organization_management'), // Organisation-Seite (Hauptseite)
    'cerebro': t('roles.pages.cerebro'),
    'settings': t('roles.pages.settings'),
    'profile': t('roles.pages.profile'),
    'tour_management': t('roles.pages.tour_management', 'Touren-Verwaltung'),
    'password_manager': t('roles.pages.password_manager', 'Passwort-Manager')
  }), [t]);

  // Display-Name-Mapping für Tabellen (dynamisch aus Übersetzungen)
  const tableDisplayNames = useMemo(() => ({
    'tasks': t('roles.tables.tasks'),
    'reservations': t('roles.tables.reservations'),
    'worktime': t('roles.tables.worktime'),
    'users': t('roles.tables.users'),
    'roles': t('roles.tables.roles'),
    'organization': t('roles.tables.organization'),
    'organization_join_requests': t('roles.tables.organization_join_requests'),
    'organization_users': t('roles.tables.organization_users'),
    'clients': t('roles.tables.clients'),
    'consultation_invoices': t('roles.tables.consultation_invoices'),
    'requests': t('roles.tables.requests'),
    'team_worktime': t('roles.tables.team_worktime'),
    'settings': t('roles.tables.settings'),
    'notifications': t('roles.tables.notifications'),
    'branches': t('roles.tables.branches'),
    'monthly_reports': t('roles.tables.monthly_reports'),
    'tours': t('roles.tables.tours', 'Touren'),
    'tour_bookings': t('roles.tables.tour_bookings', 'Tour-Buchungen')
  }), [t]);

  // Display-Name-Mapping für Buttons (dynamisch aus Übersetzungen)
  const buttonDisplayNames = useMemo(() => ({
    'worktime_start': t('roles.buttons.worktime_start'),
    'worktime_stop': t('roles.buttons.worktime_stop'),
    'worktime_edit': t('roles.buttons.worktime_edit'),
    'worktime_delete': t('roles.buttons.worktime_delete'),
    'task_create': t('roles.buttons.task_create'),
    'task_edit': t('roles.buttons.task_edit'),
    'task_delete': t('roles.buttons.task_delete'),
    'todo_create': t('roles.buttons.todo_create'),
    'todo_edit': t('roles.buttons.todo_edit'),
    'todo_delete': t('roles.buttons.todo_delete'),
    'client_create': t('roles.buttons.client_create'),
    'client_edit': t('roles.buttons.client_edit'),
    'client_delete': t('roles.buttons.client_delete'),
    'consultation_start': t('roles.buttons.consultation_start'),
    'consultation_stop': t('roles.buttons.consultation_stop'),
    'consultation_edit': t('roles.buttons.consultation_edit'),
    'invoice_create': t('roles.buttons.invoice_create'),
    'invoice_download': t('roles.buttons.invoice_download'),
    'invoice_mark_paid': t('roles.buttons.invoice_mark_paid'),
    'invoice_settings': t('roles.buttons.invoice_settings'),
    'user_create': t('roles.buttons.user_create'),
    'user_edit': t('roles.buttons.user_edit'),
    'user_delete': t('roles.buttons.user_delete'),
    'role_assign': t('roles.buttons.role_assign'),
    'role_create': t('roles.buttons.role_create'),
    'role_edit': t('roles.buttons.role_edit'),
    'role_delete': t('roles.buttons.role_delete'),
    'organization_create': t('roles.buttons.organization_create'),
    'organization_edit': t('roles.buttons.organization_edit'),
    'organization_delete': t('roles.buttons.organization_delete'),
    'settings_system': t('roles.buttons.settings_system'),
    'settings_notifications': t('roles.buttons.settings_notifications'),
    'settings_profile': t('roles.buttons.settings_profile'),
    'database_reset_table': t('roles.buttons.database_reset_table'),
    'database_logs': t('roles.buttons.database_logs'),
    'payroll_generate': t('roles.buttons.payroll_generate'),
    'payroll_export': t('roles.buttons.payroll_export'),
    'payroll_edit': t('roles.buttons.payroll_edit'),
    'cerebro': t('roles.buttons.cerebro')
  }), [t]);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: [
      // Seiten-Berechtigungen
      ...defaultPages.map(page => ({
        entity: page,
        entityType: 'page',
        accessLevel: 'none' as AccessLevel
      })),
      // Tabellen-Berechtigungen
      ...defaultTables.map(table => ({
        entity: table,
        entityType: 'table',
        accessLevel: 'none' as AccessLevel
      })),
      // Button-Berechtigungen
      ...defaultButtons.map(button => ({
        entity: button,
        entityType: 'button',
        accessLevel: 'none' as AccessLevel
      }))
    ]
  });
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // States für Branch-Zuweisungen
  const [allBranches, setAllBranches] = useState<boolean>(true);
  const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  
  // Neue State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Filter State Management (Controlled Mode)
  const [activeFilterName, setActiveFilterName] = useState<string>('Alle');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  
  // Responsiveness Hook (640px wie Standard)
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const { openSidepane, closeSidepane } = useSidepane();
  
  // Neue Fehlerbehandlung hinzufügen - mit Fallback
  let handleError: (err: any, context?: Record<string, any>) => void;
  let handleValidationError: (message: string, fieldErrors?: Record<string, string>) => void;

  try {
    const errorContext = useError();
    handleError = errorContext.handleError;
    handleValidationError = errorContext.handleValidationError;
  } catch (error) {
    // Fallback: Einfache Fehlerbehandlung
    handleError = (err: any, context?: Record<string, any>) => {
      console.error('Fehler:', err, context);
      if (onError) {
        onError(err?.message || 'Ein Fehler ist aufgetreten');
      }
    };
    handleValidationError = (message: string, fieldErrors?: Record<string, string>) => {
      console.error('Validierungsfehler:', message, fieldErrors);
      if (onError) {
        onError(message);
      }
    };
  }
  
  // Neue State-Variablen für die Berechtigungen
  const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  
  // Überwache Bildschirmgröße
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsLargeScreen(window.innerWidth > 1070);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidepane-Status verwalten
  useEffect(() => {
    if (isModalOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isModalOpen, openSidepane, closeSidepane]);

  // Funktion zum Laden der Branches
  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const response = await branchApi.getAll();
      setBranches(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Branches:', error);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  // Aktualisiere die fetchRoles-Funktion, um den neuen ErrorHandler zu nutzen
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    logger.log('DEBUGAUSGABE: Hole Rollen vom Server...');
    
    try {
      const response = await roleApi.getAll();
      logger.log('DEBUGAUSGABE: Rollen erfolgreich geholt:', response.data);
      setRoles(response.data);
      setError(null);
    } catch (error) {
      console.error('DEBUGAUSGABE: Fehler beim Abrufen der Rollen:', error);
      // Nutze den neuen ErrorHandler
      handleError(error, { 
        component: 'RoleManagementTab', 
        action: 'fetchRoles' 
      });
      // Rufe auch den übergebenen onError auf, falls vorhanden
      if (onError) {
        onError('Fehler beim Laden der Rollen');
      }
    } finally {
      setLoading(false);
    }
  }, [handleError, onError]);

  // Direkt Rollen laden
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Branches beim Öffnen des Modals laden
  useEffect(() => {
    if (isModalOpen) {
      fetchBranches();
    }
  }, [isModalOpen, fetchBranches]);

  // Speichern einer Rolle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validierung: Wenn allBranches = false, müssen Branches ausgewählt sein
    if (!allBranches && selectedBranchIds.length === 0) {
      handleError(t('roles.form.branchSelectionRequired') || 'Bitte wählen Sie mindestens eine Branch aus oder aktivieren Sie "Für alle Branches gültig"', {
        component: 'RoleManagementTab'
      });
      return;
    }
    
    if (!formData.name) {
      handleValidationError('Rollenname darf nicht leer sein', { name: 'Rollenname ist erforderlich' });
      return;
    }
    
    if (editingRole) {
      // Stelle sicher, dass die immer sichtbaren Seiten auch tatsächlich auf 'both' gesetzt sind
      const updatedPermissions = formData.permissions.map(permission => {
        if (permission.entityType === 'page' && alwaysVisiblePages.includes(permission.entity)) {
          return { ...permission, accessLevel: 'both' };
        }
        return permission;
      });
      
      // Filtere nur die relevanten Berechtigungen (nicht 'none')
      const filteredPermissions = updatedPermissions
        .filter(permission => permission.accessLevel !== 'none')
        .map(permission => ({
          entity: permission.entity,
          entityType: permission.entityType,
          accessLevel: permission.accessLevel
        }));
      
      if (!editingRole.id || isNaN(editingRole.id)) {
        console.warn('DEBUGAUSGABE: Ungültige Rollen-ID erkannt, Bearbeitung abgebrochen');
        handleError('Ungültige Rollen-ID, Bearbeitung abgebrochen', { 
          component: 'RoleManagementTab',
          roleId: editingRole.id
        });
        return;
      }
      
      // Überprüfen, ob es sich um eine geschützte Rolle handelt
      if (isStandardRole(editingRole.id, editingRole.name)) {
        console.warn(`DEBUGAUSGABE: Versuch, geschützte Rolle mit ID ${editingRole.id} zu bearbeiten`);
        handleError({
          message: 'Geschützte Systemrollen können nicht bearbeitet werden',
          name: 'PermissionError'
        }, {
          component: 'RoleManagementTab',
          roleId: editingRole.id,
          category: ErrorCategory.PERMISSION
        });
        setIsModalOpen(false);
        return;
      }
      
      // Überprüfen, ob die Rolle noch in der aktuellen Liste existiert
      const roleExists = roles.some(r => r.id === editingRole.id);
      if (!roleExists) {
        console.error(`DEBUGAUSGABE: Rolle mit ID ${editingRole.id} existiert nicht in der aktuellen Liste`);
        handleError(`Rolle mit ID ${editingRole.id} existiert nicht mehr. Bitte aktualisieren Sie die Seite.`, {
          component: 'RoleManagementTab',
          roleId: editingRole.id
        });
        setIsModalOpen(false);
        // Rollen neu laden, um die Anzeige zu aktualisieren
        await fetchRoles();
        return;
      }
      
      logger.log(`DEBUGAUSGABE: Bearbeite Rolle mit ID ${editingRole.id}`);
      
      try {
        logger.log('DEBUGAUSGABE: Sende Aktualisierung an API:', {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions
        });
        
        const dataToSend = {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions,
          allBranches: allBranches,
          branchIds: allBranches ? [] : selectedBranchIds
        };
        
        logger.log('DEBUGAUSGABE: Vor dem API-Aufruf roleApi.update');
        const response = await roleApi.update(editingRole.id, dataToSend);
        logger.log('DEBUGAUSGABE: Nach dem API-Aufruf roleApi.update');
        logger.log('DEBUGAUSGABE: API-Antwort bei Rollenaktualisierung:', response);
        await fetchRoles();
      } catch (updateError) {
        console.error('DEBUGAUSGABE: Fehler bei Rollenaktualisierung:', updateError);
        if (updateError.response) {
          // Spezifischere Fehlerbehandlung
          if (updateError.response.data.meta && updateError.response.data.meta.cause === "Record to update not found.") {
            handleError('Diese Rolle existiert nicht mehr in der Datenbank. Die Anzeige wird aktualisiert.', {
              component: 'RoleManagementTab',
              roleId: editingRole.id
            });
            setIsModalOpen(false);
            // Rollenliste aktualisieren, um Frontend zu synchronisieren
            await fetchRoles();
          } else {
            handleError(updateError.response.data.message || 'Fehler beim Aktualisieren der Rolle', {
              component: 'RoleManagementTab',
              roleId: editingRole.id
            });
          }
        } else {
          handleError('Fehler beim Aktualisieren der Rolle', {
            component: 'RoleManagementTab',
            roleId: editingRole.id
          });
        }
        return;
      }
    } else {
      // Erstellen einer neuen Rolle
      try {
        // Stelle sicher, dass die immer sichtbaren Seiten auch tatsächlich auf 'both' gesetzt sind
        const updatedPermissions = formData.permissions.map(permission => {
          if (permission.entityType === 'page' && alwaysVisiblePages.includes(permission.entity)) {
            return { ...permission, accessLevel: 'both' };
          }
          return permission;
        });
        
        // Filtere nur die relevanten Berechtigungen (nicht 'none')
        const filteredPermissions = updatedPermissions
          .filter(permission => permission.accessLevel !== 'none')
          .map(permission => ({
            entity: permission.entity,
            entityType: permission.entityType,
            accessLevel: permission.accessLevel
          }));
        
        logger.log('DEBUGAUSGABE: Sende Daten an API für neue Rolle:', {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions
        });
        
        const dataToSend = {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions,
          allBranches: allBranches,
          branchIds: allBranches ? [] : selectedBranchIds
        };
        
        logger.log('DEBUGAUSGABE: Vor dem API-Aufruf roleApi.create');
        const response = await roleApi.create(dataToSend);
        logger.log('DEBUGAUSGABE: Nach dem API-Aufruf roleApi.create');
        logger.log('DEBUGAUSGABE: API-Antwort beim Erstellen der Rolle:', response);
        await fetchRoles();
      } catch (createError) {
        console.error('DEBUGAUSGABE: Fehler bei API-Anfrage zum Erstellen der Rolle:', createError);
        if (createError.response) {
          handleError(createError.response.data.message || 'Fehler beim Erstellen der Rolle', {
            component: 'RoleManagementTab'
          });
        } else {
          handleError('Fehler beim Erstellen der Rolle', {
            component: 'RoleManagementTab'
          });
        }
        return;
      }
    }
    
    if (onRolesChange) onRolesChange();
    
    setIsModalOpen(false);
    resetForm();
  };

  // Löschen einer Rolle
  const handleDelete = async (roleId: number) => {
    if (!roleId || isNaN(roleId)) {
      console.warn('Ungültige Rollen-ID erkannt, Löschvorgang abgebrochen');
      handleError('Ungültige Rollen-ID, Löschvorgang abgebrochen', {
        component: 'RoleManagementTab',
        roleId: roleId
      });
      return;
    }
    
    // Finde die Rolle in der Liste, um den Namen zu prüfen
    const role = roles.find(r => r.id === roleId);
    
    // Überprüfen, ob es sich um eine geschützte Rolle handelt
    if (role && isStandardRole(roleId, role.name)) {
      console.warn(`Versuch, geschützte Rolle mit ID ${roleId} (${role.name}) zu löschen`);
      handleError('Geschützte Systemrollen können nicht gelöscht werden', {
        component: 'RoleManagementTab',
        roleId: roleId
      });
      return;
    }
    
    if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) return;
    
    try {
      logger.log(`Starte Löschvorgang für Rolle mit ID ${roleId}`);
      
      // Überprüfen, ob die Rolle in der aktuellen Liste existiert
      const roleExists = roles.some(r => r.id === roleId);
      if (!roleExists) {
        console.error(`Rolle mit ID ${roleId} existiert nicht in der aktuellen Liste`);
        handleError(`Rolle mit ID ${roleId} existiert nicht mehr. Bitte aktualisieren Sie die Seite.`, {
          component: 'RoleManagementTab',
          roleId: roleId
        });
        // Rollen neu laden, um die Anzeige zu aktualisieren
        await fetchRoles();
        return;
      }
      
      // Bei Mock-Daten lokales Löschen (wird nicht verwendet)
      if (false) {
        logger.log('Lösche Mock-Rolle');
        const updatedRoles = roles.filter(role => role.id !== roleId);
        setRoles(updatedRoles);
      } else {
        logger.log('Sende Löschanfrage an API');
        
        try {
          const response = await roleApi.delete(roleId);
          logger.log('API-Antwort beim Löschen der Rolle:', response);
          
          // Nach erfolgreichem Löschen die Rollenliste aktualisieren
          await fetchRoles();
          logger.log('Rollenliste nach Löschen aktualisiert');
        } catch (deleteError) {
          console.error('API-Fehler beim Löschen der Rolle:', deleteError);
          
          if (deleteError.response) {
            console.error('API-Fehlerdaten:', deleteError.response.data);
            
            // Spezifischere Fehlerbehandlung
            if (deleteError.response.data.meta && deleteError.response.data.meta.cause === "Record to delete does not exist.") {
              handleError('Diese Rolle existiert nicht mehr in der Datenbank. Die Anzeige wird aktualisiert.', {
                component: 'RoleManagementTab',
                roleId: roleId
              });
              // Rollenliste aktualisieren, um Frontend zu synchronisieren
              await fetchRoles();
            } else {
              handleError(deleteError.response.data.message || t('roleManagement.deleteError'), {
                component: 'RoleManagementTab',
                roleId: roleId
              });
            }
          } else {
            handleError(t('roleManagement.networkError'), {
              component: 'RoleManagementTab',
              roleId: roleId
            });
          }
          return;
        }
      }
      
      logger.log('Rolle erfolgreich gelöscht');
      if (onRolesChange) onRolesChange();
    } catch (err) {
      console.error(t('roleManagement.unhandledError'), err);
      handleError(err);
      
      // Bei einem unbehandelten Fehler trotzdem versuchen, die Rollenliste zu aktualisieren
      try {
        await fetchRoles();
      } catch (refreshError) {
        console.error('Fehler beim Aktualisieren der Rollenliste nach fehlgeschlagenem Löschvorgang:', refreshError);
      }
    }
  };

  // Kopieren einer Rolle (für Standardrollen)
  const handleCopyRole = async (role: Role) => {
    try {
      if (!role || !role.id) {
        handleError('Ungültige Rolle zum Kopieren', {
          component: 'RoleManagementTab'
        });
        return;
      }

      // Kopie der Rolle erstellen mit angepasstem Namen
      const copiedRoleData = {
        name: `${role.name}-Kopie`,
        description: role.description || '',
        permissions: role.permissions
          .filter(permission => permission.accessLevel !== 'none')
          .map(permission => ({
            entity: permission.entity,
            entityType: permission.entityType,
            accessLevel: permission.accessLevel
          }))
      };

      logger.log('DEBUGAUSGABE: Kopiere Rolle:', role.name, 'mit Daten:', copiedRoleData);

      // Rolle erstellen
      const response = await roleApi.create(copiedRoleData);
      logger.log('DEBUGAUSGABE: Rolle erfolgreich kopiert:', response.data);

      // Optimistisches Update: Neue Rolle zur Liste hinzufügen
      setRoles(prevRoles => [response.data, ...prevRoles]);
      
      // Bearbeitungsmodal für die kopierte Rolle öffnen
      prepareRoleForEditing(response.data);
      
      if (onRolesChange) onRolesChange();
    } catch (err) {
      console.error('DEBUGAUSGABE: Fehler beim Kopieren der Rolle:', err);
      handleError(err, {
        component: 'RoleManagementTab',
        roleId: role.id
      });
    }
  };

  // Rolle zum Bearbeiten vorbereiten
  const prepareRoleForEditing = async (role: Role) => {
    // Verhindere das Bearbeiten von geschützten Rollen
    if (isStandardRole(role.id, role.name)) {
      handleError('Geschützte Systemrollen können nicht bearbeitet werden', {
        component: 'RoleManagementTab',
        roleId: role.id
      });
      return;
    }
    
    // Alle möglichen Berechtigungen erstellen (Seiten, Tabellen und Buttons)
    const allPermissions = [
      ...defaultPages.map(page => ({
        entity: page,
        entityType: 'page',
        // Für die immer sichtbaren Seiten 'both' als Standard setzen
        accessLevel: alwaysVisiblePages.includes(page) ? 'both' as AccessLevel : 'none' as AccessLevel
      })),
      ...defaultTables.map(table => ({
        entity: table,
        entityType: 'table',
        accessLevel: 'none' as AccessLevel
      })),
      ...defaultButtons.map(button => ({
        entity: button,
        entityType: 'button',
        accessLevel: 'none' as AccessLevel
      }))
    ];

    // Vorhandene Berechtigungen übernehmen
    role.permissions.forEach(permission => {
      const existingPermIndex = allPermissions.findIndex(
        p => p.entity === permission.entity && p.entityType === permission.entityType
      );
      
      if (existingPermIndex !== -1) {
        // Stelle sicher, dass alwaysVisiblePages immer 'both' als AccessLevel haben
        if (permission.entityType === 'page' && alwaysVisiblePages.includes(permission.entity)) {
          allPermissions[existingPermIndex].accessLevel = 'both';
        } else {
          allPermissions[existingPermIndex].accessLevel = permission.accessLevel;
        }
      }
    });

    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: allPermissions
    });
    
    // Lade Branch-Zuweisungen der Rolle
    if (role.id) {
      try {
        const branchResponse = await roleApi.getRoleBranches(role.id);
        const branchData = branchResponse.data;
        setAllBranches(branchData.allBranches || false);
        setSelectedBranchIds(branchData.branches?.map((b: any) => b.id) || []);
      } catch (error) {
        console.error('Fehler beim Laden der Branch-Zuweisungen:', error);
        setAllBranches(true);
        setSelectedBranchIds([]);
      }
    }
    
    setEditingRole(role);
    setIsModalOpen(true);
  };

  // Formular für neue Rolle zurücksetzen
  const resetForm = () => {
    setEditingRole(null);
    setAllBranches(true);
    setSelectedBranchIds([]);
    setFormData({
      name: '',
      description: '',
      permissions: [
        // Seiten-Berechtigungen
        ...defaultPages.map(page => ({
          entity: page,
          entityType: 'page',
          // Für die immer sichtbaren Seiten 'both' als Standard setzen
          accessLevel: alwaysVisiblePages.includes(page) ? 'both' as AccessLevel : 'none' as AccessLevel
        })),
        // Tabellen-Berechtigungen
        ...defaultTables.map(table => ({
          entity: table,
          entityType: 'table',
          accessLevel: 'none' as AccessLevel
        })),
        // Button-Berechtigungen
        ...defaultButtons.map(button => ({
          entity: button,
          entityType: 'button',
          accessLevel: 'none' as AccessLevel
        }))
      ]
    });
  };

  // Setzt alle Seitenberechtigungen (außer die immer sichtbaren) auf den gleichen Wert
  const setAllPagePermissions = (accessLevel: AccessLevel) => {
    const newPermissions = [...formData.permissions];
    
    formData.permissions
      .filter(p => p.entityType === 'page' && !alwaysVisiblePages.includes(p.entity))
      .forEach(permission => {
        const permIndex = formData.permissions.indexOf(permission);
        newPermissions[permIndex] = {
          ...permission,
          accessLevel
        };
      });
    
    setFormData({ ...formData, permissions: newPermissions });
  };

  // Setzt alle Tabellen-Berechtigungen auf den gleichen Wert
  const setAllTablePermissions = (accessLevel: AccessLevel) => {
    const newPermissions = [...formData.permissions];
    
    formData.permissions
      .filter(p => p.entityType === 'table')
      .forEach(permission => {
        const permIndex = formData.permissions.indexOf(permission);
        newPermissions[permIndex] = {
          ...permission,
          accessLevel
        };
      });
    
    setFormData({ ...formData, permissions: newPermissions });
  };

  // Setzt alle Button-Berechtigungen auf den gleichen Wert
  const setAllButtonPermissions = (accessLevel: AccessLevel) => {
    const newPermissions = [...formData.permissions];
    
    formData.permissions
      .filter(p => p.entityType === 'button')
      .forEach(permission => {
        const permIndex = formData.permissions.indexOf(permission);
        newPermissions[permIndex] = {
          ...permission,
          accessLevel
        };
      });
    
    setFormData({ ...formData, permissions: newPermissions });
  };

  // Funktion zum Zählen der aktiven Filter
  const getActiveFilterCount = () => {
    return filterConditions.length;
  };

  // Filtern und sortieren der Rollen
  const filteredAndSortedRoles = useMemo(() => {
    return roles
      .filter(role => {
        // Globale Suche
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          
          // ✅ OPTIMIERUNG: Frühes Beenden bei Match
          if (role.name.toLowerCase().includes(searchLower)) return true;
          if (role.description && role.description.toLowerCase().includes(searchLower)) return true;
          
          return false; // Kein Match gefunden
        }
        
        // Prüfe erweiterte Filterbedingungen, wenn vorhanden
        if (filterConditions.length > 0) {
          // Implementiere die logische Verknüpfung der Bedingungen (UND/ODER)
          let result = filterConditions.length > 0;
          
          for (let i = 0; i < filterConditions.length; i++) {
            const condition = filterConditions[i];
            let conditionMet = false;
            
            switch (condition.column) {
              case 'name':
                // ✅ OPTIMIERUNG: toLowerCase() nur einmal pro Wert
                const roleNameLower = role.name.toLowerCase();
                const nameConditionValueLower = (condition.value as string || '').toLowerCase();
                if (condition.operator === 'equals') {
                  conditionMet = roleNameLower === nameConditionValueLower;
                } else if (condition.operator === 'contains') {
                  conditionMet = roleNameLower.includes(nameConditionValueLower);
                } else if (condition.operator === 'startsWith') {
                  conditionMet = roleNameLower.startsWith(nameConditionValueLower);
                }
                break;

              case 'description':
                if (!role.description) {
                  conditionMet = false;
                  break;
                }

                // ✅ OPTIMIERUNG: toLowerCase() nur einmal pro Wert
                const roleDescLower = role.description.toLowerCase();
                const descConditionValueLower = (condition.value as string || '').toLowerCase();
                if (condition.operator === 'equals') {
                  conditionMet = roleDescLower === descConditionValueLower;
                } else if (condition.operator === 'contains') {
                  conditionMet = roleDescLower.includes(descConditionValueLower);
                } else if (condition.operator === 'startsWith') {
                  conditionMet = roleDescLower.startsWith(descConditionValueLower);
                }
                break;
              
              case 'permissions':
                // Vereinfachter Filter für Berechtigungen - zähle die Anzahl der Berechtigungen mit dem angegebenen Level
                const accessLevel = condition.value as AccessLevel;
                const count = role.permissions.filter(p => p.accessLevel === accessLevel).length;
                
                if (condition.operator === 'greaterThan') {
                  conditionMet = count > 0;
                } else if (condition.operator === 'equals') {
                  conditionMet = count > 0;
                }
                break;
            }
            
            // Verknüpfe das Ergebnis dieser Bedingung mit dem Gesamtergebnis
            if (i === 0) {
              result = conditionMet;
            } else {
              const operator = filterLogicalOperators[i - 1];
              result = operator === 'AND' ? (result && conditionMet) : (result || conditionMet);
            }
          }
          
          if (!result) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // ✅ OPTIMIERUNG: toLowerCase() für konsistente Sortierung
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      });
  }, [roles, searchTerm, filterConditions, filterLogicalOperators]);

  // Mobile Ansicht renderRoles-Funktion
  const renderRoles = () => {
    if (roles.length === 0) {
      return (
        <div className="p-4 bg-gray-50 rounded text-center">
          <p>Keine Rollen gefunden. Erstellen Sie eine neue Rolle mit dem Button oben.</p>
        </div>
      );
    }
    
    if (isMobile) {
      // Mobile Ansicht mit Karten
      return (
        <>
          <div className="space-y-4">
            {filteredAndSortedRoles.slice(0, displayLimit).map((role) => (
              <RoleCard 
                key={role.id} 
                role={role} 
                onEdit={prepareRoleForEditing}
                onDelete={handleDelete}
                onCopy={handleCopyRole}
                canEdit={!readOnly && hasPermission('roles', 'write', 'table') && !isStandardRole(role.id, role.name)}
                canDelete={!readOnly && hasPermission('roles', 'write', 'table') && !isStandardRole(role.id, role.name)}
                canCopy={!readOnly && hasPermission('roles', 'write', 'table') && isStandardRole(role.id, role.name)}
              />
            ))}
          </div>
          
          {/* "Mehr anzeigen" Button - Mobil */}
          {filteredAndSortedRoles.length > displayLimit && (
            <div className="mt-4 flex justify-center">
              <div className="relative group">
                <button
                  className="p-2 text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
                  onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {`Mehr anzeigen (${filteredAndSortedRoles.length - displayLimit} verbleibend)`}
                </div>
              </div>
            </div>
          )}
        </>
      );
    } else {
      // Card-Ansicht für größere Bildschirme
      return (
        <>
          <div className="space-y-4">
            {filteredAndSortedRoles.slice(0, displayLimit).map((role) => (
              <RoleCard 
                key={role.id} 
                role={role} 
                onEdit={prepareRoleForEditing}
                onDelete={handleDelete}
                onCopy={handleCopyRole}
                canEdit={!readOnly && hasPermission('roles', 'write', 'table') && !isStandardRole(role.id, role.name)}
                canDelete={!readOnly && hasPermission('roles', 'write', 'table') && !isStandardRole(role.id, role.name)}
                canCopy={!readOnly && hasPermission('roles', 'write', 'table') && isStandardRole(role.id, role.name)}
              />
            ))}
          </div>
          
          {/* "Mehr anzeigen" Button - Desktop */}
          {filteredAndSortedRoles.length > displayLimit && (
            <div className="mt-4 flex justify-center">
              <div className="relative group">
                <button
                  className="p-2 text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
                  onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {`Mehr anzeigen (${filteredAndSortedRoles.length - displayLimit} verbleibend)`}
                </div>
              </div>
            </div>
          )}
        </>
      );
    }
  };

  // Standard-Filter erstellen und speichern
  useEffect(() => {
    const createStandardFilters = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.error('Nicht authentifiziert');
          return;
        }

        // Prüfen, ob die Standard-Filter bereits existieren
        const existingFiltersResponse = await axiosInstance.get(
          API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(ROLES_TABLE_ID)
        );

        const existingFilters = existingFiltersResponse.data || [];
        const alleFilterExists = existingFilters.some(filter => filter.name === 'Alle');

        // Erstelle "Alle"-Filter, wenn er noch nicht existiert
        if (!alleFilterExists) {
          const alleFilter = {
            tableId: ROLES_TABLE_ID,
            name: 'Alle',
            conditions: [],
            operators: []
          };

          await axiosInstance.post(
            API_ENDPOINTS.SAVED_FILTERS.BASE,
            alleFilter
          );
          logger.log('Alle-Filter für Rollen erstellt');
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
  }, []);

  // Initialer Default-Filter setzen (Controlled Mode)
  useEffect(() => {
    const setInitialFilter = async () => {
      try {
        const response = await axiosInstance.get(API_ENDPOINTS.SAVED_FILTERS.BY_TABLE(ROLES_TABLE_ID));
        const filters = response.data;
        
        const alleFilter = filters.find((filter: any) => filter.name === 'Alle');
        if (alleFilter) {
          setActiveFilterName('Alle');
          setSelectedFilterId(alleFilter.id);
          applyFilterConditions(alleFilter.conditions, alleFilter.operators);
        }
      } catch (error) {
        console.error('Fehler beim Setzen des initialen Filters:', error);
      }
    };

    setInitialFilter();
  }, []);

  // Funktion zum Anwenden von Filterbedingungen
  const applyFilterConditions = (conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };
  
  // Funktion zum Zurücksetzen der Filter
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  // Filter Change Handler (Controlled Mode)
  const handleFilterChange = (name: string, id: number | null, conditions: FilterCondition[], operators: ('AND' | 'OR')[]) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };

  return (
    <div>
      {/* Spaltenanzeige und Suche */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          {/* Linke Seite: "Neue Rolle erstellen"-Button */}
          <div className="flex items-center">
            {!readOnly && hasPermission('roles', 'write', 'table') && (
              <div className="relative group">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
                  style={{ width: '30.19px', height: '30.19px' }}
                  aria-label={t('roles.createRole')}
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {t('roles.createRole')}
                </div>
              </div>
            )}
          </div>
          
          {/* Mitte: Titel - Kein Titel in der Mitte notwendig bei dieser Komponente, da der Tab-Header bereits den Titel zeigt */}
          <div></div>
          
          {/* Rechte Seite: Suchfeld, Filter-Button, Spalten-Konfiguration */}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Suchen..."
              className="w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="relative group ml-1">
              <button
                className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'}`}
                onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              >
                <FunnelIcon className="w-5 h-5" />
                {getActiveFilterCount() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">
                    {getActiveFilterCount()}
                  </span>
                )}
              </button>
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                Filter
              </div>
            </div>
          </div>
        </div>

        {/* Filter-Modal */}
        {isFilterModalOpen && (
          <FilterPane
            columns={[
              { id: 'name', label: 'Name' },
              { id: 'description', label: 'Beschreibung' },
              { id: 'permissions', label: 'Berechtigungen' }
            ]}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId={ROLES_TABLE_ID}
          />
        )}
        
        {/* Gespeicherte Filter als Tags anzeigen */}
        <SavedFilterTags
          tableId={ROLES_TABLE_ID}
          onSelectFilter={applyFilterConditions}
          onReset={resetFilterConditions}
          activeFilterName={activeFilterName}
          selectedFilterId={selectedFilterId}
          onFilterChange={handleFilterChange}
          defaultFilterName="Alle"
        />

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          renderRoles()
        )}
      </div>

      {/* Modal/Sidepane für Rollenerstellung/Bearbeitung */}
      {isModalOpen && (
        <>
          {/* Mobile (unter 640px) - Modal */}
          {isMobile ? (
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
              <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
              
              <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-lg font-semibold dark:text-white">
                        {editingRole ? t('roles.editRole') : t('roles.createRole')}
                      </Dialog.Title>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Form */}
                  <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    {/* Content - scrollbarer Bereich */}
                    <div className="flex-1 overflow-y-auto min-h-0">
                      <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Beschreibung</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                  </div>
                  
                  {/* Branch-Zuweisungen */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('roles.form.branchAssignment') || 'Branch-Zuweisung'}
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={allBranches}
                          onChange={(e) => {
                            setAllBranches(e.target.checked);
                            if (e.target.checked) {
                              setSelectedBranchIds([]);
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          {t('roles.form.allBranches') || 'Für alle Branches gültig'}
                        </span>
                      </label>
                      
                      {!allBranches && (
                        <div className="ml-6">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('roles.form.specificBranches') || 'Spezifische Branches:'}
                          </label>
                          {loadingBranches ? (
                            <div className="text-sm text-gray-500">Lade Branches...</div>
                          ) : branches.length === 0 ? (
                            <div className="text-sm text-gray-500">Keine Branches verfügbar</div>
                          ) : (
                            <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
                              {branches.map((branch) => (
                                <label key={branch.id} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedBranchIds.includes(branch.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedBranchIds([...selectedBranchIds, branch.id]);
                                      } else {
                                        setSelectedBranchIds(selectedBranchIds.filter(id => id !== branch.id));
                                      }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                    {branch.name}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('roles.form.detailedPermissions')}</label>
                        {/* Bulk Actions - kompakt integriert */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllPagePermissions('both')}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              {t('roles.form.pagesChecked')}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('roles.form.activateAllPages')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllPagePermissions('none')}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              {t('roles.form.pagesUnchecked')}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('roles.form.deactivateAllPages')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllTablePermissions('both')}
                              className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                            >
                              {t('roles.form.tablesChecked')}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('roles.form.activateAllTables')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllTablePermissions('none')}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              {t('roles.form.tablesUnchecked')}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('roles.form.deactivateAllTables')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllButtonPermissions('both')}
                              className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                            >
                              {t('roles.form.buttonsChecked')}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('roles.form.activateAllButtons')}
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllButtonPermissions('none')}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              {t('roles.form.buttonsUnchecked')}
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              {t('roles.form.deactivateAllButtons')}
                            </div>
                          </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto border rounded-lg p-4 dark:border-gray-600">
                    {formData.permissions
                      .filter(permission => 
                        permission.entityType === 'page'
                      )
                      .map((permission, index) => {
                        const permIndex = formData.permissions.indexOf(permission);
                        const isActive = permission.accessLevel === 'both';
                        return (
                          <div key={`permission-page-${permission.entity}-${index}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pageDisplayNames[permission.entity] || permission.entity}</span>
                              <label className={`inline-flex items-center ${alwaysVisiblePages.includes(permission.entity) ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={isActive}
                                  disabled={alwaysVisiblePages.includes(permission.entity)}
                                  onChange={() => {
                                    const newPermissions = [...formData.permissions];
                                    newPermissions[permIndex] = {
                                      ...permission,
                                      accessLevel: isActive ? 'none' : 'both'
                                    };
                                    setFormData({ ...formData, permissions: newPermissions });
                                  }}
                                />
                                <div className={`relative w-11 h-6 ${alwaysVisiblePages.includes(permission.entity) ? 'bg-blue-600 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700`}>
                                  {alwaysVisiblePages.includes(permission.entity) && (
                                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                                      Fix
                                    </span>
                                  )}
                                </div>
                              </label>
                            </div>
                            
                            {/* Tabellen-Berechtigungen mit zugehörigen Buttons gruppiert */}
                            {formData.permissions
                              .filter(tablePerm => 
                                tablePerm.entityType === 'table' && 
                                tableToPageMapping[tablePerm.entity] === permission.entity
                              )
                              .sort((a, b) => {
                                const aName = tableDisplayNames[a.entity] || a.entity;
                                const bName = tableDisplayNames[b.entity] || b.entity;
                                // Sortierung: users, roles, organization zuerst (in dieser Reihenfolge)
                                const priorityOrder = ['users', 'roles', 'organization'];
                                const aIndex = priorityOrder.indexOf(a.entity);
                                const bIndex = priorityOrder.indexOf(b.entity);
                                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                if (aIndex !== -1) return -1;
                                if (bIndex !== -1) return 1;
                                return aName.localeCompare(bName);
                              })
                              .map((tablePerm, tableIndex) => {
                                const tablePermIndex = formData.permissions.indexOf(tablePerm);
                                const isTableActive = tablePerm.accessLevel === 'both';
                                const tableEntity = tablePerm.entity;
                                const tableDisplayName = tableDisplayNames[tableEntity] || tableEntity;
                                
                                // Finde alle Buttons, die zu dieser Tabelle gehören
                                // Filtere Duplikate: task_* und todo_* sind dasselbe, nur task_* behalten
                                const relatedButtons = formData.permissions
                                  .filter(buttonPerm => 
                                    buttonPerm.entityType === 'button' && 
                                    buttonToPageMapping[buttonPerm.entity] === permission.entity &&
                                    buttonToTableMapping[buttonPerm.entity] === tableEntity &&
                                    // Entferne todo_* Buttons wenn task_* existiert (sind dasselbe)
                                    !(tableEntity === 'tasks' && buttonPerm.entity.startsWith('todo_'))
                                  )
                                  .sort((a, b) => {
                                    const aName = buttonDisplayNames[a.entity] || a.entity;
                                    const bName = buttonDisplayNames[b.entity] || b.entity;
                                    // Logische Reihenfolge: Start, Stop, Erstellen, Bearbeiten, Löschen, dann alphabetisch
                                    const order = [
                                      t('roleManagement.buttonOrder.start'),
                                      t('roleManagement.buttonOrder.stop'),
                                      t('roleManagement.buttonOrder.create'),
                                      t('roleManagement.buttonOrder.edit'),
                                      t('roleManagement.buttonOrder.delete')
                                    ];
                                    const aIndex = order.indexOf(aName);
                                    const bIndex = order.indexOf(bName);
                                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                    if (aIndex !== -1) return -1;
                                    if (bIndex !== -1) return 1;
                                    return aName.localeCompare(bName);
                                  });
                                
                                return (
                                  <div key={`table-permission-${tableEntity}-${tableIndex}`} className="mt-3">
                                    {/* Tabelle selbst */}
                                    <div className="flex items-center justify-between pl-6 border-l-2 border-blue-300 dark:border-blue-600">
                                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">└ {tableDisplayName}</span>
                                      <label className="inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="sr-only peer"
                                          checked={isTableActive}
                                          onChange={() => {
                                            const newPermissions = [...formData.permissions];
                                            newPermissions[tablePermIndex] = {
                                              ...tablePerm,
                                              accessLevel: isTableActive ? 'none' : 'both'
                                            };
                                            setFormData({ ...formData, permissions: newPermissions });
                                          }}
                                        />
                                        <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
                                        </div>
                                      </label>
                                    </div>
                                    
                                    {/* Zu dieser Tabelle gehörige Buttons */}
                                    {relatedButtons.map((buttonPerm, buttonIndex) => {
                                      const buttonPermIndex = formData.permissions.indexOf(buttonPerm);
                                      const isButtonActive = buttonPerm.accessLevel === 'both';
                                      const buttonDisplayName = buttonDisplayNames[buttonPerm.entity] || buttonPerm.entity;
                                      return (
                                        <div key={`button-permission-${buttonPerm.entity}-${buttonIndex}`} 
                                          className="flex items-center justify-between mt-2 pl-12 border-l-2 border-gray-300 dark:border-gray-600">
                                          <span className="text-xs text-gray-600 dark:text-gray-400">└ {buttonDisplayName}</span>
                                          <label className="inline-flex items-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              className="sr-only peer"
                                              checked={isButtonActive}
                                              onChange={() => {
                                                const newPermissions = [...formData.permissions];
                                                newPermissions[buttonPermIndex] = {
                                                  ...buttonPerm,
                                                  accessLevel: isButtonActive ? 'none' : 'both'
                                                };
                                                setFormData({ ...formData, permissions: newPermissions });
                                              }}
                                            />
                                            <div className="relative w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
                                            </div>
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })
                            }
                              
                              {/* Button-Berechtigungen ohne Tabelle-Zuordnung (am Ende) */}
                              {formData.permissions
                                .filter(buttonPerm => 
                                  buttonPerm.entityType === 'button' && 
                                  buttonToPageMapping[buttonPerm.entity] === permission.entity &&
                                  !buttonToTableMapping[buttonPerm.entity]
                                )
                                .sort((a, b) => {
                                  const aName = buttonDisplayNames[a.entity] || a.entity;
                                  const bName = buttonDisplayNames[b.entity] || b.entity;
                                  return aName.localeCompare(bName);
                                })
                                .map((buttonPerm, buttonIndex) => {
                                  const buttonPermIndex = formData.permissions.indexOf(buttonPerm);
                                  const isButtonActive = buttonPerm.accessLevel === 'both';
                                  const buttonDisplayName = buttonDisplayNames[buttonPerm.entity] || buttonPerm.entity;
                                  return (
                                    <div key={`button-permission-${buttonPerm.entity}-${buttonIndex}`} 
                                      className="flex items-center justify-between mt-2 pl-6 border-l-2 border-gray-300 dark:border-gray-600">
                                      <span className="text-xs text-gray-600 dark:text-gray-400">└ {buttonDisplayName}</span>
                                      <label className="inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="sr-only peer"
                                          checked={isButtonActive}
                                          onChange={() => {
                                            const newPermissions = [...formData.permissions];
                                            newPermissions[buttonPermIndex] = {
                                              ...buttonPerm,
                                              accessLevel: isButtonActive ? 'none' : 'both'
                                            };
                                            setFormData({ ...formData, permissions: newPermissions });
                                          }}
                                        />
                                        <div className="relative w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
                                        </div>
                                      </label>
                          </div>
                        );
                      })
                    }
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>
                    </div>
                  </div>
                  
                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end gap-2 border-t dark:border-gray-600 flex-shrink-0">
                    <div className="relative group">
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        Abbrechen
                      </div>
                    </div>
                    <div className="relative group">
                      <button
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                        {editingRole ? 'Aktualisieren' : 'Erstellen'}
                      </div>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </Dialog>
          ) : (
            /* Desktop (ab 640px) - Sidepane */
            /* WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition */
            <>
              {/* Backdrop - nur wenn offen und <= 1070px */}
              {/* Hinweis: onClick entfernt, da Backdrop pointer-events: none hat, damit Hauptinhalt interaktiv bleibt */}
              {isModalOpen && !isLargeScreen && (
                <div 
                  className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
                  aria-hidden="true" 
                  style={{
                    opacity: isModalOpen ? 1 : 0,
                    transition: 'opacity 300ms ease-out'
                  }}
                />
              )}
              
              {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
              <div 
                className={`fixed top-16 bottom-0 right-0 max-w-2xl w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{
                  transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  pointerEvents: isModalOpen ? 'auto' : 'none'
                }}
                aria-hidden={!isModalOpen}
                role="dialog"
                aria-modal={isModalOpen}
              >
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-semibold dark:text-white">
                    {editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
                  </h2>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 min-h-0">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('roles.form.name')}</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('roles.form.description')}</label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Detaillierte Berechtigungen</label>
                        {/* Bulk Actions */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllPagePermissions('both')}
                              className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            >
                              Seiten ✓
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              Alle Seiten aktivieren
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllPagePermissions('none')}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Seiten ✗
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              Alle Seiten deaktivieren
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllTablePermissions('both')}
                              className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                            >
                              Tabellen ✓
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              Alle Tabellen aktivieren
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllTablePermissions('none')}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Tabellen ✗
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              Alle Tabellen deaktivieren
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllButtonPermissions('both')}
                              className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                            >
                              Buttons ✓
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              Alle Buttons aktivieren
                            </div>
                          </div>
                          <div className="relative group">
                            <button
                              type="button"
                              onClick={() => setAllButtonPermissions('none')}
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              Buttons ✗
                            </button>
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                              Alle Buttons deaktivieren
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 overflow-y-auto border rounded-lg p-4 dark:border-gray-600 max-h-[60vh]">
                        {formData.permissions
                          .filter(permission => 
                            permission.entityType === 'page'
                          )
                          .map((permission, index) => {
                            const permIndex = formData.permissions.indexOf(permission);
                            const isActive = permission.accessLevel === 'both';
                            return (
                              <div key={`permission-page-desktop-${permission.entity}-${index}`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{pageDisplayNames[permission.entity] || permission.entity}</span>
                                  <label className={`inline-flex items-center ${alwaysVisiblePages.includes(permission.entity) ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}>
                                    <input
                                      type="checkbox"
                                      className="sr-only peer"
                                      checked={isActive}
                                      disabled={alwaysVisiblePages.includes(permission.entity)}
                                      onChange={() => {
                                        const newPermissions = [...formData.permissions];
                                        newPermissions[permIndex] = {
                                          ...permission,
                                          accessLevel: isActive ? 'none' : 'both'
                                        };
                                        setFormData({ ...formData, permissions: newPermissions });
                                      }}
                                    />
                                    <div className={`relative w-11 h-6 ${alwaysVisiblePages.includes(permission.entity) ? 'bg-blue-600 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700'} peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700`}>
                                      {alwaysVisiblePages.includes(permission.entity) && (
                                        <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                                          Fix
                                        </span>
                                      )}
                                    </div>
                                  </label>
                                </div>
                                
                                {/* Tabellen-Berechtigungen mit zugehörigen Buttons gruppiert */}
                                {formData.permissions
                                  .filter(tablePerm => 
                                    tablePerm.entityType === 'table' && 
                                    tableToPageMapping[tablePerm.entity] === permission.entity
                                  )
                                  .sort((a, b) => {
                                    const aName = tableDisplayNames[a.entity] || a.entity;
                                    const bName = tableDisplayNames[b.entity] || b.entity;
                                    return aName.localeCompare(bName);
                                  })
                                  .map((tablePerm, tableIndex) => {
                                    const tablePermIndex = formData.permissions.indexOf(tablePerm);
                                    const isTableActive = tablePerm.accessLevel === 'both';
                                    const tableEntity = tablePerm.entity;
                                    const tableDisplayName = tableDisplayNames[tableEntity] || tableEntity;
                                    
                                    // Finde alle Buttons, die zu dieser Tabelle gehören
                                    const relatedButtons = formData.permissions
                                      .filter(buttonPerm => 
                                        buttonPerm.entityType === 'button' && 
                                        buttonToPageMapping[buttonPerm.entity] === permission.entity &&
                                        buttonToTableMapping[buttonPerm.entity] === tableEntity &&
                                        !(tableEntity === 'tasks' && buttonPerm.entity.startsWith('todo_'))
                                      )
                                      .sort((a, b) => {
                                        const aName = buttonDisplayNames[a.entity] || a.entity;
                                        const bName = buttonDisplayNames[b.entity] || b.entity;
                                        const order = [
                                      t('roleManagement.buttonOrder.start'),
                                      t('roleManagement.buttonOrder.stop'),
                                      t('roleManagement.buttonOrder.create'),
                                      t('roleManagement.buttonOrder.edit'),
                                      t('roleManagement.buttonOrder.delete')
                                    ];
                                        const aIndex = order.indexOf(aName);
                                        const bIndex = order.indexOf(bName);
                                        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                                        if (aIndex !== -1) return -1;
                                        if (bIndex !== -1) return 1;
                                        return aName.localeCompare(bName);
                                      });
                                    
                                    return (
                                      <div key={`table-permission-desktop-${tableEntity}-${tableIndex}`} className="mt-3">
                                        {/* Tabelle selbst */}
                                        <div className="flex items-center justify-between pl-6 border-l-2 border-blue-300 dark:border-blue-600">
                                          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">└ {tableDisplayName}</span>
                                          <label className="inline-flex items-center cursor-pointer">
                                            <input
                                              type="checkbox"
                                              className="sr-only peer"
                                              checked={isTableActive}
                                              onChange={() => {
                                                const newPermissions = [...formData.permissions];
                                                newPermissions[tablePermIndex] = {
                                                  ...tablePerm,
                                                  accessLevel: isTableActive ? 'none' : 'both'
                                                };
                                                setFormData({ ...formData, permissions: newPermissions });
                                              }}
                                            />
                                            <div className="relative w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
                                            </div>
                                          </label>
                                        </div>
                                        
                                        {/* Zu dieser Tabelle gehörige Buttons */}
                                        {relatedButtons.map((buttonPerm, buttonIndex) => {
                                          const buttonPermIndex = formData.permissions.indexOf(buttonPerm);
                                          const isButtonActive = buttonPerm.accessLevel === 'both';
                                          const buttonDisplayName = buttonDisplayNames[buttonPerm.entity] || buttonPerm.entity;
                                          return (
                                            <div key={`button-permission-desktop-${buttonPerm.entity}-${buttonIndex}`} 
                                              className="flex items-center justify-between mt-2 pl-12 border-l-2 border-gray-300 dark:border-gray-600">
                                              <span className="text-xs text-gray-600 dark:text-gray-400">└ {buttonDisplayName}</span>
                                              <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                  type="checkbox"
                                                  className="sr-only peer"
                                                  checked={isButtonActive}
                                                  onChange={() => {
                                                    const newPermissions = [...formData.permissions];
                                                    newPermissions[buttonPermIndex] = {
                                                      ...buttonPerm,
                                                      accessLevel: isButtonActive ? 'none' : 'both'
                                                    };
                                                    setFormData({ ...formData, permissions: newPermissions });
                                                  }}
                                                />
                                                <div className="relative w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
                                                </div>
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  })
                                }
                                  
                                {/* Button-Berechtigungen ohne Tabelle-Zuordnung (am Ende) */}
                                {formData.permissions
                                  .filter(buttonPerm => 
                                    buttonPerm.entityType === 'button' && 
                                    buttonToPageMapping[buttonPerm.entity] === permission.entity &&
                                    !buttonToTableMapping[buttonPerm.entity]
                                  )
                                  .sort((a, b) => {
                                    const aName = buttonDisplayNames[a.entity] || a.entity;
                                    const bName = buttonDisplayNames[b.entity] || b.entity;
                                    return aName.localeCompare(bName);
                                  })
                                  .map((buttonPerm, buttonIndex) => {
                                    const buttonPermIndex = formData.permissions.indexOf(buttonPerm);
                                    const isButtonActive = buttonPerm.accessLevel === 'both';
                                    const buttonDisplayName = buttonDisplayNames[buttonPerm.entity] || buttonPerm.entity;
                                    return (
                                      <div key={`button-permission-desktop-${buttonPerm.entity}-${buttonIndex}`} 
                                        className="flex items-center justify-between mt-2 pl-6 border-l-2 border-gray-300 dark:border-gray-600">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">└ {buttonDisplayName}</span>
                                        <label className="inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isButtonActive}
                                            onChange={() => {
                                              const newPermissions = [...formData.permissions];
                                              newPermissions[buttonPermIndex] = {
                                                ...buttonPerm,
                                                accessLevel: isButtonActive ? 'none' : 'both'
                                              };
                                              setFormData({ ...formData, permissions: newPermissions });
                                            }}
                                          />
                                          <div className="relative w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:start-[1px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-700">
                                          </div>
                                        </label>
                                      </div>
                                    );
                                  })
                                }
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex justify-end pt-4 gap-2">
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          Abbrechen
                        </div>
                      </div>
                      <div className="relative group">
                        <button
                          type="submit"
                          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                          {editingRole ? 'Aktualisieren' : 'Erstellen'}
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RoleManagementTab; 