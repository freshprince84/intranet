import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { roleApi } from '../api/apiClient.ts';
import { Role, AccessLevel } from '../types/interfaces.ts';
import { PencilIcon, TrashIcon, PlusIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
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

// Pages, für die Berechtigungen benötigt werden
const defaultPages = [
  'dashboard',
  'worktracker',
  'team_worktime_control',
  'payroll',  // Usermanagement-Seite statt users
  'usermanagement',  // Usermanagement-Seite statt users
  'cerebro',
  'settings',
  'profile'
];

// Tabellen, für die wir spezifische Berechtigungen hinzufügen wollen
const defaultTables = [
  'requests', // Gehört zu dashboard
  'tasks'     // Gehört zu worktracker
];

// Definiert die Zuordnung von Tabellen zu ihren übergeordneten Seiten
const tableToPageMapping = {
  'requests': 'dashboard',
  'tasks': 'worktracker'
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

// Definition der verfügbaren Spalten
const availableColumns = [
  { id: 'name', label: 'Name' },
  { id: 'description', label: 'Beschreibung' },
  { id: 'permissions', label: 'Berechtigungen' },
  { id: 'actions', label: 'Aktionen' }
];

// Standardreihenfolge der Spalten
const defaultColumnOrder = ['name', 'description', 'permissions', 'actions'];

interface FilterState {
  name: string;
  description: string;
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
      }))
    ]
  });
  const [error, setError] = useState<string | null>(null);
  const { hasPermission } = usePermissions();
  const { settings, isLoading: isLoadingSettings, updateColumnOrder, updateHiddenColumns, toggleColumnVisibility, isColumnVisible } = useTableSettings('role_management', {
    defaultColumnOrder,
    defaultHiddenColumns: []
  });
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterState, setFilterState] = useState<FilterState>({
    name: '',
    description: ''
  });
  const [activeFilters, setActiveFilters] = useState<FilterState>({
    name: '',
    description: ''
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  
  // Neue State-Variablen für erweiterte Filterbedingungen
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  
  // Responsiveness Hook
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  
  // Neue Fehlerbehandlung hinzufügen
  const { handleError, handleValidationError } = useError();
  
  // Neue State-Variablen für die Berechtigungen
  const [isAddPermissionModalOpen, setIsAddPermissionModalOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(10);
  
  // Überwache Bildschirmgröße
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
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
    
    // Alle möglichen Berechtigungen erstellen (Seiten und Tabellen)
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

  // Handler für das Verschieben von Spalten per Drag & Drop
  const handleMoveColumn = useCallback((dragIndex: number, hoverIndex: number) => {
    // Erstelle eine neue Kopie der Spaltenreihenfolge
    const newColumnOrder = [...settings.columnOrder];
    
    // Ermittle die zu verschiebenden Spalten
    const movingColumn = newColumnOrder[dragIndex];
    
    // Entferne die Spalte an der alten Position
    newColumnOrder.splice(dragIndex, 1);
    
    // Füge die Spalte an der neuen Position ein
    newColumnOrder.splice(hoverIndex, 0, movingColumn);
    
    // Aktualisiere die Spaltenreihenfolge
    updateColumnOrder(newColumnOrder);
  }, [settings.columnOrder, updateColumnOrder]);

  // Handler für Drag & Drop direkt in der Tabelle
  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumn(columnId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      const dragIndex = settings.columnOrder.indexOf(draggedColumn);
      const hoverIndex = settings.columnOrder.indexOf(columnId);
      
      if (dragIndex > -1 && hoverIndex > -1) {
        handleMoveColumn(dragIndex, hoverIndex);
      }
    }
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Filtern und sortieren der Spalten gemäß den Benutzereinstellungen
  const visibleColumnIds = settings.columnOrder.filter(id => isColumnVisible(id));

  // Funktion zum Zählen der aktiven Filter
  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.name) count++;
    if (activeFilters.description) count++;
    return count;
  };

  const resetFilters = () => {
    setFilterState({
      name: '',
      description: ''
    });
  };

  const applyFilters = () => {
    setActiveFilters(filterState);
    setIsFilterModalOpen(false);
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
        // Wenn keine erweiterten Filterbedingungen, verwende die alten Filterkriterien
        else if (activeFilters.name || activeFilters.description) {
          // Erweiterte Filterkriterien
          if (activeFilters.name && !role.name.toLowerCase().includes(activeFilters.name.toLowerCase())) {
            return false;
          }
          
          if (activeFilters.description && role.description && 
            !role.description.toLowerCase().includes(activeFilters.description.toLowerCase())) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
  }, [roles, searchTerm, activeFilters, filterConditions, filterLogicalOperators]);

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
      // Tabellen-Ansicht für größere Bildschirme
      return (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {visibleColumnIds.map(columnId => {
                    const column = availableColumns.find(col => col.id === columnId);
                    if (!column) return null;
                    
                    return (
                      <th 
                        key={columnId}
                        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative ${columnId !== 'actions' ? 'cursor-move' : ''}`}
                        draggable={columnId !== 'actions'}
                        onDragStart={columnId !== 'actions' ? (e) => handleDragStart(e, columnId) : undefined}
                        onDragOver={columnId !== 'actions' ? (e) => handleDragOver(e, columnId) : undefined}
                        onDrop={columnId !== 'actions' ? (e) => handleDrop(e, columnId) : undefined}
                        onDragEnd={columnId !== 'actions' ? handleDragEnd : undefined}
                      >
                        <div className={`flex items-center ${dragOverColumn === columnId ? 'border-l-2 pl-1 border-blue-500' : ''} ${draggedColumn === columnId ? 'opacity-50' : ''}`}>
                          {columnId !== 'actions' && <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400" />}
                          {column.label}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredAndSortedRoles.slice(0, displayLimit).map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    {visibleColumnIds.map((columnId) => {
                      if (columnId === 'name') {
                        return (
                          <td key={`${role.id}-${columnId}`} className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{role.name}</div>
                          </td>
                        );
                      }
                      
                      if (columnId === 'description') {
                        return (
                          <td key={`${role.id}-${columnId}`} className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500 dark:text-gray-400">{role.description || '-'}</div>
                          </td>
                        );
                      }
                      
                      if (columnId === 'permissions') {
                        // Zähle die Berechtigungen nach Typ
                        const permissionCount = {
                          read: role.permissions.filter(p => p.accessLevel === 'read').length,
                          write: role.permissions.filter(p => p.accessLevel === 'write').length,
                          both: role.permissions.filter(p => p.accessLevel === 'both').length,
                          none: role.permissions.filter(p => p.accessLevel === 'none').length
                        };
                        
                        return (
                          <td key={`${role.id}-${columnId}`} className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {permissionCount.read > 0 && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {permissionCount.read} Lesen
                                </span>
                              )}
                              {permissionCount.write > 0 && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  {permissionCount.write} Schreiben
                                </span>
                              )}
                              {permissionCount.both > 0 && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                  {permissionCount.both} Beide
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }
                      
                      if (columnId === 'actions') {
                        return (
                          <td key={`${role.id}-${columnId}`} className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {!readOnly && role.id !== 1 && role.id !== 2 && role.id !== 999 && (
                                <button 
                                  onClick={() => prepareRoleForEditing(role)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                  title="Rolle bearbeiten"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                              )}
                              
                              {!readOnly && role.id !== 1 && role.id !== 2 && role.id !== 999 && (
                                <button 
                                  onClick={() => handleDelete(role.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Rolle löschen"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      }
                      
                      return null;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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
    
    // Aktualisiere auch die alten FilterState für Kompatibilität
    const newFilterState: FilterState = {
      name: '',
      description: ''
    };
    
    // Versuche, die alten Filter aus den neuen Bedingungen abzuleiten
    conditions.forEach(condition => {
      if (condition.column === 'name' && condition.operator === 'contains') {
        newFilterState.name = condition.value as string || '';
      } else if (condition.column === 'description' && condition.operator === 'contains') {
        newFilterState.description = condition.value as string || '';
      }
    });
    
    setActiveFilters(newFilterState);
  };
  
  // Funktion zum Zurücksetzen der Filter
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setActiveFilters({
      name: '',
      description: ''
    });
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
            <div className="ml-1">
              <TableColumnConfig
                columns={availableColumns}
                visibleColumns={visibleColumnIds}
                columnOrder={settings.columnOrder}
                onToggleColumnVisibility={toggleColumnVisibility}
                onMoveColumn={handleMoveColumn}
                onClose={() => {}}
              />
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

      {/* Modal für Rollenerstellung/Bearbeitung */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
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
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Seiten-Berechtigungen</label>
                  
                  {/* Option für alle Seiten außer immer sichtbare */}
                  <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Alle Seiten</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setAllPagePermissions(e.target.value as AccessLevel);
                          }
                        }}
                        className="block w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Auswählen...</option>
                        <option value="none">Keine</option>
                        <option value="both">Alle aktivieren</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {formData.permissions
                      .filter(permission => permission.entityType === 'page')
                      .map((permission, index) => {
                        const permIndex = formData.permissions.indexOf(permission);
                        // Ist-Zustand des Toggles bestimmen
                        const isActive = permission.accessLevel === 'both';
                        return (
                          <div key={`permission-page-${permission.entity}-${index}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{permission.entity}</span>
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
                            
                            {/* Tabellen-Berechtigungen als Unterpunkte */}
                            {formData.permissions
                              .filter(tablePerm => 
                                tablePerm.entityType === 'table' && 
                                tableToPageMapping[tablePerm.entity] === permission.entity
                              )
                              .map((tablePerm, tableIndex) => {
                                const tablePermIndex = formData.permissions.indexOf(tablePerm);
                                const isTableActive = tablePerm.accessLevel === 'both';
                                return (
                                  <div key={`table-permission-${tablePerm.entity}-${tableIndex}`} 
                                    className="flex items-center justify-between mt-2 pl-6 border-l-2 border-gray-200 dark:border-gray-700">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">└ {tablePerm.entity}</span>
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
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none"
                >
                  {editingRole ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementTab; 