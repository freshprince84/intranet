import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { roleApi } from '../api/apiClient.ts';
import { Role, AccessLevel } from '../types/interfaces.ts';
import { PencilIcon, TrashIcon, PlusIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { useError } from '../contexts/ErrorContext.tsx';
import { ErrorCategory } from '../services/ErrorHandler.ts';
import { 
  CheckIcon, 
} from '@heroicons/react/24/outline';

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
  'usermanagement', // = benutzerverwaltung
  'cerebro',
  'settings',
  'profile'
];

// ALLE TABELLEN IM SYSTEM (synchron mit Backend)
const defaultTables = [
  'requests',           // auf dashboard
  'tasks',             // auf worktracker
  'users',             // auf usermanagement
  'roles',             // auf usermanagement
  'team_worktime',     // auf team_worktime_control
  'worktime',          // auf worktracker
  'clients',           // auf consultations
  'consultation_invoices', // auf consultations
  'branches',          // auf settings/system
  'notifications',     // allgemein
  'settings',          // auf settings
  'monthly_reports'    // auf consultations/reports
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

// Definiert die Zuordnung von Tabellen zu ihren übergeordneten Seiten
const tableToPageMapping = {
  'requests': 'dashboard',
  'tasks': 'worktracker',
  'users': 'usermanagement',
  'roles': 'usermanagement', 
  'team_worktime': 'team_worktime_control',
  'worktime': 'worktracker',
  'clients': 'consultations',
  'consultation_invoices': 'consultations',
  'branches': 'settings',
  'notifications': 'general',
  'settings': 'settings',
  'monthly_reports': 'consultations'
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
  'user_create': 'usermanagement',
  'user_edit': 'usermanagement',
  'user_delete': 'usermanagement',
  'role_assign': 'usermanagement',
  'role_create': 'usermanagement',
  'role_edit': 'usermanagement',
  'role_delete': 'usermanagement',
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
  'payroll_edit': 'payroll'
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
  // Settings Buttons → settings Tabelle
  'settings_system': 'settings',
  'settings_notifications': 'settings',
  'settings_profile': 'settings',
  // Buttons ohne direkte Tabelle-Zuordnung
  'database_reset_table': null,
  'database_logs': null,
  'cerebro': null,
  'payroll_generate': null,
  'payroll_export': null,
  'payroll_edit': null
};

// Display-Name-Mapping für Seiten (DB-Interne Bezeichnung → Frontend-Bezeichnung)
const pageDisplayNames: Record<string, string> = {
  'dashboard': 'Dashboard',
  'worktracker': 'Worktracker',
  'consultations': 'Beratungen',
  'team_worktime_control': 'Team Kontrolle',
  'payroll': 'Lohnabrechnung',
  'usermanagement': 'Benutzerverwaltung',
  'cerebro': 'Cerebro',
  'settings': 'Einstellungen',
  'profile': 'Profil'
};

// Display-Name-Mapping für Tabellen (DB-Interne Bezeichnung → Frontend-Bezeichnung)
const tableDisplayNames: Record<string, string> = {
  'tasks': "To Do's",
  'worktime': 'Time Tracker',
  'users': 'Benutzer',
  'roles': 'Rollen',
  'clients': 'Kunden',
  'consultation_invoices': 'Rechnungen',
  'requests': 'Anfragen',
  'team_worktime': 'Team Arbeitszeiten',
  'settings': 'Einstellungen',
  'notifications': 'Benachrichtigungen',
  'branches': 'Filialen',
  'monthly_reports': 'Monatsberichte'
};

// Display-Name-Mapping für Buttons (DB-Interne Bezeichnung → Frontend-Bezeichnung)
const buttonDisplayNames: Record<string, string> = {
  // Worktime Buttons
  'worktime_start': 'Start',
  'worktime_stop': 'Stop',
  'worktime_edit': 'Bearbeiten',
  'worktime_delete': 'Löschen',
  // Task/Todo Buttons (beide sind dasselbe - To Do's)
  'task_create': 'Erstellen',
  'task_edit': 'Bearbeiten',
  'task_delete': 'Löschen',
  'todo_create': 'Erstellen',
  'todo_edit': 'Bearbeiten',
  'todo_delete': 'Löschen',
  // Client Buttons
  'client_create': 'Erstellen',
  'client_edit': 'Kunde bearbeiten',
  'client_delete': 'Löschen',
  'consultation_start': 'Start',
  'consultation_stop': 'Stop',
  'consultation_edit': 'Beratung bearbeiten',
  // Invoice Buttons
  'invoice_create': 'Erstellen',
  'invoice_download': 'Herunterladen',
  'invoice_mark_paid': 'Als bezahlt markieren',
  'invoice_settings': 'Einstellungen',
  // User Management Buttons
  'user_create': 'Erstellen',
  'user_edit': 'Bearbeiten',
  'user_delete': 'Löschen',
  'role_assign': 'Zuweisen',
  'role_create': 'Erstellen',
  'role_edit': 'Bearbeiten',
  'role_delete': 'Löschen',
  // Settings Buttons
  'settings_system': 'System',
  'settings_notifications': 'Benachrichtigungen',
  'settings_profile': 'Profil',
  // Database Buttons
  'database_reset_table': 'Tabelle zurücksetzen',
  'database_logs': 'Logs',
  // Payroll Buttons
  'payroll_generate': 'Generieren',
  'payroll_export': 'Exportieren',
  'payroll_edit': 'Bearbeiten',
  // General
  'cerebro': 'Cerebro'
};

// TableID für gespeicherte Filter
const ROLES_TABLE_ID = 'roles-table';

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
  canEdit: boolean;
  canDelete: boolean;
}> = ({ role, onEdit, onDelete, canEdit, canDelete }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-4 mb-4">
      {/* Header mit Rollenname und Aktionen */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{role.name}</h3>
        
        <div className="flex space-x-2">
          {canEdit && (
            <button
              onClick={() => onEdit(role)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
              title="Rolle bearbeiten"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={() => onDelete(role.id)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1"
              title="Rolle löschen"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Beschreibung */}
      <p className="text-sm text-gray-600 dark:text-gray-400">{role.description || 'Keine Beschreibung'}</p>
      
      {/* Berechtigungen - kompakt */}
      <div className="mt-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Berechtigungen:</h4>
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
              +{role.permissions.filter(perm => perm.accessLevel !== 'none').length - 8} mehr
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const RoleManagementTab: React.FC<RoleManagementTabProps> = ({ onRolesChange, onError, readOnly = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
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
  
  // Neue State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Responsiveness Hook (640px wie Standard)
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 640);
  
  // Neue Fehlerbehandlung hinzufügen
  const { handleError, handleValidationError } = useError();
  
  // Neue State-Variablen für die Berechtigungen
  const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  
  // Überwache Bildschirmgröße
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Aktualisiere die fetchRoles-Funktion, um den neuen ErrorHandler zu nutzen
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    console.log('DEBUGAUSGABE: Hole Rollen vom Server...');
    
    try {
      const response = await roleApi.getAll();
      console.log('DEBUGAUSGABE: Rollen erfolgreich geholt:', response.data);
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

  // Speichern einer Rolle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
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
      if (editingRole.id === 1 || editingRole.id === 2 || editingRole.id === 999) {
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
      
      console.log(`DEBUGAUSGABE: Bearbeite Rolle mit ID ${editingRole.id}`);
      
      try {
        console.log('DEBUGAUSGABE: Sende Aktualisierung an API:', {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions
        });
        
        const dataToSend = {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions
        };
        
        console.log('DEBUGAUSGABE: Vor dem API-Aufruf roleApi.update');
        const response = await roleApi.update(editingRole.id, dataToSend);
        console.log('DEBUGAUSGABE: Nach dem API-Aufruf roleApi.update');
        console.log('DEBUGAUSGABE: API-Antwort bei Rollenaktualisierung:', response);
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
        
        console.log('DEBUGAUSGABE: Sende Daten an API für neue Rolle:', {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions
        });
        
        const dataToSend = {
          name: formData.name,
          description: formData.description,
          permissions: filteredPermissions
        };
        
        console.log('DEBUGAUSGABE: Vor dem API-Aufruf roleApi.create');
        const response = await roleApi.create(dataToSend);
        console.log('DEBUGAUSGABE: Nach dem API-Aufruf roleApi.create');
        console.log('DEBUGAUSGABE: API-Antwort beim Erstellen der Rolle:', response);
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
    
    // Überprüfen, ob es sich um eine geschützte Rolle handelt
    if (roleId === 1 || roleId === 2 || roleId === 999) {
      console.warn(`Versuch, geschützte Rolle mit ID ${roleId} zu löschen`);
      handleError('Geschützte Systemrollen können nicht gelöscht werden', {
        component: 'RoleManagementTab',
        roleId: roleId
      });
      return;
    }
    
    if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) return;
    
    try {
      console.log(`Starte Löschvorgang für Rolle mit ID ${roleId}`);
      
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
        console.log('Lösche Mock-Rolle');
        const updatedRoles = roles.filter(role => role.id !== roleId);
        setRoles(updatedRoles);
      } else {
        console.log('Sende Löschanfrage an API');
        
        try {
          const response = await roleApi.delete(roleId);
          console.log('API-Antwort beim Löschen der Rolle:', response);
          
          // Nach erfolgreichem Löschen die Rollenliste aktualisieren
          await fetchRoles();
          console.log('Rollenliste nach Löschen aktualisiert');
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
              handleError(deleteError.response.data.message || 'Fehler beim Löschen der Rolle', {
                component: 'RoleManagementTab',
                roleId: roleId
              });
            }
          } else {
            handleError('Netzwerkfehler beim Löschen der Rolle', {
              component: 'RoleManagementTab',
              roleId: roleId
            });
          }
          return;
        }
      }
      
      console.log('Rolle erfolgreich gelöscht');
      if (onRolesChange) onRolesChange();
    } catch (err) {
      console.error('Unbehandelter Fehler beim Löschen der Rolle:', err);
      handleError(err);
      
      // Bei einem unbehandelten Fehler trotzdem versuchen, die Rollenliste zu aktualisieren
      try {
        await fetchRoles();
      } catch (refreshError) {
        console.error('Fehler beim Aktualisieren der Rollenliste nach fehlgeschlagenem Löschvorgang:', refreshError);
      }
    }
  };

  // Rolle zum Bearbeiten vorbereiten
  const prepareRoleForEditing = (role: Role) => {
    // Verhindere das Bearbeiten von geschützten Rollen
    if (role.id === 1 || role.id === 2 || role.id === 999) {
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
    
    setEditingRole(role);
    setIsModalOpen(true);
  };

  // Formular für neue Rolle zurücksetzen
  const resetForm = () => {
    setEditingRole(null);
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
          const matchesSearch = 
            role.name.toLowerCase().includes(searchLower) ||
            (role.description && role.description.toLowerCase().includes(searchLower));
          
          if (!matchesSearch) return false;
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
                if (condition.operator === 'equals') {
                  conditionMet = role.name.toLowerCase() === (condition.value as string || '').toLowerCase();
                } else if (condition.operator === 'contains') {
                  conditionMet = role.name.toLowerCase().includes((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'startsWith') {
                  conditionMet = role.name.toLowerCase().startsWith((condition.value as string || '').toLowerCase());
                }
                break;
              
              case 'description':
                if (!role.description) {
                  conditionMet = false;
                  break;
                }
                
                if (condition.operator === 'equals') {
                  conditionMet = role.description.toLowerCase() === (condition.value as string || '').toLowerCase();
                } else if (condition.operator === 'contains') {
                  conditionMet = role.description.toLowerCase().includes((condition.value as string || '').toLowerCase());
                } else if (condition.operator === 'startsWith') {
                  conditionMet = role.description.toLowerCase().startsWith((condition.value as string || '').toLowerCase());
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
        return a.name.localeCompare(b.name);
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
                canEdit={!readOnly && hasPermission('roles', 'write', 'table') && role.id !== 1 && role.id !== 2 && role.id !== 999}
                canDelete={!readOnly && hasPermission('roles', 'write', 'table') && role.id !== 1 && role.id !== 2 && role.id !== 999}
              />
            ))}
          </div>
          
          {/* "Mehr anzeigen" Button - Mobil */}
          {filteredAndSortedRoles.length > displayLimit && (
            <div className="mt-4 flex justify-center">
              <button
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
                onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
              >
                Mehr anzeigen ({filteredAndSortedRoles.length - displayLimit} verbleibend)
              </button>
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
                canEdit={!readOnly && hasPermission('roles', 'write', 'table') && role.id !== 1 && role.id !== 2 && role.id !== 999}
                canDelete={!readOnly && hasPermission('roles', 'write', 'table') && role.id !== 1 && role.id !== 2 && role.id !== 999}
              />
            ))}
          </div>
          
          {/* "Mehr anzeigen" Button - Desktop */}
          {filteredAndSortedRoles.length > displayLimit && (
            <div className="mt-4 flex justify-center">
              <button
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-md hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-gray-700 dark:hover:bg-gray-700"
                onClick={() => setDisplayLimit(prevLimit => prevLimit + 10)}
              >
                Mehr anzeigen ({filteredAndSortedRoles.length - displayLimit} verbleibend)
              </button>
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
          console.log('Alle-Filter für Rollen erstellt');
        }
      } catch (error) {
        console.error('Fehler beim Erstellen der Standard-Filter:', error);
      }
    };

    createStandardFilters();
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
  };

  return (
    <div>
      {/* Spaltenanzeige und Suche */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          {/* Linke Seite: "Neue Rolle erstellen"-Button */}
          <div className="flex items-center">
            {!readOnly && hasPermission('roles', 'write', 'table') && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-200 dark:border-gray-700 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                title="Neue Rolle erstellen"
                aria-label="Neue Rolle erstellen"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
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
            <button
              className={`p-2 rounded-md ${getActiveFilterCount() > 0 ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-100'} ml-1`}
              onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
              title="Filter"
            >
              <div className="relative">
                <FunnelIcon className="w-5 h-5" />
                {getActiveFilterCount() > 0 && (
                  <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {getActiveFilterCount()}
                  </span>
                )}
              </div>
            </button>
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
                        {editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
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
                  
                  <div className="mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Detaillierte Berechtigungen</label>
                      {/* Bulk Actions - kompakt integriert */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAllPagePermissions('both')}
                          className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                          title="Alle Seiten aktivieren"
                        >
                          Seiten ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllPagePermissions('none')}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="Alle Seiten deaktivieren"
                        >
                          Seiten ✗
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllTablePermissions('both')}
                          className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                          title="Alle Tabellen aktivieren"
                        >
                          Tabellen ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllTablePermissions('none')}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="Alle Tabellen deaktivieren"
                        >
                          Tabellen ✗
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllButtonPermissions('both')}
                          className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                          title="Alle Buttons aktivieren"
                        >
                          Buttons ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllButtonPermissions('none')}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="Alle Buttons deaktivieren"
                        >
                          Buttons ✗
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto border rounded-lg p-4 dark:border-gray-600">
                    {formData.permissions
                      .filter(permission => permission.entityType === 'page')
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
                                    const order = ['Start', 'Stop', 'Erstellen', 'Bearbeiten', 'Löschen'];
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
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                    >
                      {editingRole ? 'Aktualisieren' : 'Erstellen'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </Dialog>
          ) : (
            /* Desktop (ab 640px) - Sidepane */
            <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} className="relative z-50">
              {/* Semi-transparenter Hintergrund */}
              <div 
                className="fixed inset-0 bg-black/10 transition-opacity" 
                aria-hidden="true" 
                onClick={() => setIsModalOpen(false)}
              />
              
              {/* Sidepane von rechts einfahren */}
              <div 
                className={`fixed inset-y-0 right-0 max-w-2xl w-full bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}
              >
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold dark:text-white">
                    {editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
                  </Dialog.Title>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="p-4 overflow-y-auto h-full">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Beschreibung</label>
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
                          <button
                            type="button"
                            onClick={() => setAllPagePermissions('both')}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                            title="Alle Seiten aktivieren"
                          >
                            Seiten ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllPagePermissions('none')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Alle Seiten deaktivieren"
                          >
                            Seiten ✗
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllTablePermissions('both')}
                            className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800"
                            title="Alle Tabellen aktivieren"
                          >
                            Tabellen ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllTablePermissions('none')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Alle Tabellen deaktivieren"
                          >
                            Tabellen ✗
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllButtonPermissions('both')}
                            className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-800"
                            title="Alle Buttons aktivieren"
                          >
                            Buttons ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setAllButtonPermissions('none')}
                            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                            title="Alle Buttons deaktivieren"
                          >
                            Buttons ✗
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4 overflow-y-auto border rounded-lg p-4 dark:border-gray-600 max-h-[60vh]">
                        {formData.permissions
                          .filter(permission => permission.entityType === 'page')
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
                                        const order = ['Start', 'Stop', 'Erstellen', 'Bearbeiten', 'Löschen'];
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
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
                      >
                        {editingRole ? 'Aktualisieren' : 'Erstellen'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </Dialog>
          )}
        </>
      )}
    </div>
  );
};

export default RoleManagementTab; 