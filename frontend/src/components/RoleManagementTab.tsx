import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { roleApi } from '../api/apiClient.ts';
import { Role, AccessLevel } from '../types/interfaces.ts';
import { PencilIcon, TrashIcon, PlusIcon, ArrowsUpDownIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { API_URL } from '../config/api.ts';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTableSettings } from '../hooks/useTableSettings.ts';
import TableColumnConfig from '../components/TableColumnConfig.tsx';
import { 
  CheckIcon, 
} from '@heroicons/react/24/outline';

interface RoleManagementTabProps {
  onRolesChange?: () => void;
  onError: (error: string) => void;
  readOnly?: boolean;
}

// Definiere Seiten, die immer sichtbar sein sollen (ohne Berechtigungsprüfung)
const alwaysVisiblePages = ['dashboard', 'settings', 'profile'];

// Pages, für die Berechtigungen benötigt werden
const defaultPages = [
  'dashboard',
  'worktracker',
  'usermanagement',  // Usermanagement-Seite statt users
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

// Mock-Rollen für die Anzeige
const mockRoles: Role[] = [
  {
    id: 1,
    name: 'Administrator',
    description: 'Hat volle Berechtigung auf alle Seiten',
    permissions: defaultPages.map(page => ({
      id: 1,
      entity: page,
      entityType: 'page',
      accessLevel: 'both',
      roleId: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  },
  {
    id: 2,
    name: 'Benutzer',
    description: 'Standard-Benutzer mit eingeschränkten Rechten',
    permissions: defaultPages.map(page => ({
      id: 2,
      entity: page,
      entityType: 'page',
      accessLevel: page === 'dashboard' || page === 'requests' ? 'both' : 'read',
      roleId: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  },
  {
    id: 3,
    name: 'Gast',
    description: 'Kann nur Inhalte sehen',
    permissions: defaultPages.map(page => ({
      id: 3,
      entity: page,
      entityType: 'page',
      accessLevel: 'read',
      roleId: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
  }
];

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
    <div className="role-card">
      {/* Header mit Rollenname und Aktionen */}
      <div className="role-card-header">
        <h3 className="role-card-title">{role.name}</h3>
        
        <div className="flex space-x-2">
          {canEdit && (
            <button
              onClick={() => onEdit(role)}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Rolle bearbeiten"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={() => onDelete(role.id)}
              className="text-red-600 hover:text-red-800 p-1"
              title="Rolle löschen"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* Beschreibung */}
      <p className="role-card-description">{role.description || 'Keine Beschreibung'}</p>
      
      {/* Berechtigungen - kompakt */}
      <div className="role-card-permissions">
        <h4 className="role-card-permissions-title">Berechtigungen:</h4>
        <div className="role-card-permissions-list">
          {role.permissions
            .filter(perm => perm.accessLevel !== 'none') // Nur relevante Berechtigungen anzeigen
            .slice(0, 8) // Begrenze die Anzahl der angezeigten Berechtigungen
            .map(permission => (
              <span 
                key={`${permission.entity}-${permission.entityType}`}
                className="role-card-permission-tag"
              >
                {permission.entity}: {permission.accessLevel}
              </span>
            ))}
          {role.permissions.filter(perm => perm.accessLevel !== 'none').length > 8 && (
            <span className="role-card-permission-tag bg-gray-200">
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
  
  // Responsiveness Hook
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  
  // Überwache Bildschirmgröße
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fehlerbehandlung
  const handleError = useCallback((err: any) => {
    let message = 'Ein Fehler ist aufgetreten';
    if (err.response?.data?.message) {
      message = err.response.data.message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    
    // Fehler "Ungültige Rollen-ID" unterdrücken, wenn er beim Laden der Seite auftritt
    if (message.includes('Ungültige Rollen-ID')) {
      console.warn('Fehler "Ungültige Rollen-ID" unterdrückt:', message);
      return;
    }
    
    onError(message);
  }, [onError]);

  // Zurück zur ursprünglichen fetchRoles-Funktion
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
      handleError(error.response?.data?.message || 'Fehler beim Laden der Rollen');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Direkt Rollen laden
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Speichern einer Rolle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('DEBUGAUSGABE: Formular wird gesendet mit Daten:', formData);
      
      // Validierung der Formulardaten
      if (!formData.name.trim()) {
        console.log('DEBUGAUSGABE: Validierungsfehler - Name ist leer');
        handleError('Der Name der Rolle darf nicht leer sein');
        return;
      }
      
      // Prüfen, ob mindestens eine Berechtigung nicht 'none' ist
      const hasValidPermissions = formData.permissions.some(p => p.accessLevel !== 'none');
      if (!hasValidPermissions) {
        console.log('DEBUGAUSGABE: Validierungsfehler - Keine Berechtigungen gewährt');
        handleError('Mindestens eine Berechtigung muss gewährt werden');
        return;
      }
      
      // Berechtigung filtern - nur diejenigen mit accessLevel != none senden
      const filteredPermissions = formData.permissions.filter(p => p.accessLevel !== 'none');
      
      console.log('DEBUGAUSGABE: Gefilterte Berechtigungen vor dem Senden:', filteredPermissions);
      console.log('DEBUGAUSGABE: Anzahl der gefilterten Berechtigungen:', filteredPermissions.length);
      filteredPermissions.forEach((p, i) => {
        console.log(`DEBUGAUSGABE: Permission ${i+1}:`, p);
        console.log(`DEBUGAUSGABE:   - entity: ${p.entity}, entityType: ${p.entityType}, accessLevel: ${p.accessLevel}`);
      });
      
      if (editingRole) {
        // Bearbeitung einer bestehenden Rolle
        if (!editingRole.id || isNaN(editingRole.id)) {
          console.warn('DEBUGAUSGABE: Ungültige Rollen-ID erkannt, Bearbeitung abgebrochen');
          handleError('Ungültige Rollen-ID, Bearbeitung abgebrochen');
          return;
        }
        
        // Überprüfen, ob es sich um eine geschützte Rolle handelt
        if (editingRole.id === 1 || editingRole.id === 2 || editingRole.id === 999) {
          console.warn(`DEBUGAUSGABE: Versuch, geschützte Rolle mit ID ${editingRole.id} zu bearbeiten`);
          handleError('Geschützte Systemrollen können nicht bearbeitet werden');
          setIsModalOpen(false);
          return;
        }
        
        // Überprüfen, ob die Rolle noch in der aktuellen Liste existiert
        const roleExists = roles.some(r => r.id === editingRole.id);
        if (!roleExists) {
          console.error(`DEBUGAUSGABE: Rolle mit ID ${editingRole.id} existiert nicht in der aktuellen Liste`);
          handleError(`Rolle mit ID ${editingRole.id} existiert nicht mehr. Bitte aktualisieren Sie die Seite.`);
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
              handleError('Diese Rolle existiert nicht mehr in der Datenbank. Die Anzeige wird aktualisiert.');
              setIsModalOpen(false);
              // Rollenliste aktualisieren, um Frontend zu synchronisieren
              await fetchRoles();
            } else {
              handleError(updateError.response.data.message || 'Fehler beim Aktualisieren der Rolle');
            }
          } else {
            handleError('Fehler beim Aktualisieren der Rolle');
          }
          return;
        }
      } else {
        // Erstellen einer neuen Rolle
        try {
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
            handleError(createError.response.data.message || 'Fehler beim Erstellen der Rolle');
          } else {
            handleError('Fehler beim Erstellen der Rolle');
          }
          return;
        }
      }
      
      if (onRolesChange) onRolesChange();
      
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('DEBUGAUSGABE: Unbehandelter Fehler:', err);
      handleError(err);
      
      // Bei einem unbehandelten Fehler trotzdem versuchen, die Rollenliste zu aktualisieren
      try {
        await fetchRoles();
      } catch (refreshError) {
        console.error('DEBUGAUSGABE: Fehler beim Aktualisieren der Rollenliste nach fehlgeschlagenem Vorgang:', refreshError);
      }
    }
  };

  // Löschen einer Rolle
  const handleDelete = async (roleId: number) => {
    if (!roleId || isNaN(roleId)) {
      console.warn('Ungültige Rollen-ID erkannt, Löschvorgang abgebrochen');
      handleError('Ungültige Rollen-ID, Löschvorgang abgebrochen');
      return;
    }
    
    // Überprüfen, ob es sich um eine geschützte Rolle handelt
    if (roleId === 1 || roleId === 2 || roleId === 999) {
      console.warn(`Versuch, geschützte Rolle mit ID ${roleId} zu löschen`);
      handleError('Geschützte Systemrollen können nicht gelöscht werden');
      return;
    }
    
    if (!window.confirm('Möchten Sie diese Rolle wirklich löschen?')) return;
    
    try {
      console.log(`Starte Löschvorgang für Rolle mit ID ${roleId}`);
      
      // Überprüfen, ob die Rolle in der aktuellen Liste existiert
      const roleExists = roles.some(r => r.id === roleId);
      if (!roleExists) {
        console.error(`Rolle mit ID ${roleId} existiert nicht in der aktuellen Liste`);
        handleError(`Rolle mit ID ${roleId} existiert nicht mehr. Bitte aktualisieren Sie die Seite.`);
        // Rollen neu laden, um die Anzeige zu aktualisieren
        await fetchRoles();
        return;
      }
      
      // Bei Mock-Daten lokales Löschen
      if (mockRoles.some(r => r.id === roleId)) {
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
              handleError('Diese Rolle existiert nicht mehr in der Datenbank. Die Anzeige wird aktualisiert.');
              // Rollenliste aktualisieren, um Frontend zu synchronisieren
              await fetchRoles();
            } else {
              handleError(deleteError.response.data.message || 'Fehler beim Löschen der Rolle');
            }
          } else {
            handleError('Netzwerkfehler beim Löschen der Rolle');
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
      handleError('Geschützte Systemrollen können nicht bearbeitet werden');
      return;
    }
    
    // Alle möglichen Berechtigungen erstellen (Seiten und Tabellen)
    const allPermissions = [
      ...defaultPages.map(page => ({
        entity: page,
        entityType: 'page',
        accessLevel: 'none' as AccessLevel
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
        allPermissions[existingPermIndex].accessLevel = permission.accessLevel;
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
        
        // Erweiterte Filterkriterien
        if (activeFilters.name && !role.name.toLowerCase().includes(activeFilters.name.toLowerCase())) {
          return false;
        }
        
        if (activeFilters.description && role.description && 
          !role.description.toLowerCase().includes(activeFilters.description.toLowerCase())) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        return a.name.localeCompare(b.name);
      });
  }, [roles, searchTerm, activeFilters]);

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
      // Card-Ansicht für mobile Geräte
      return (
        <div className="mt-4">
          {filteredAndSortedRoles.map(role => (
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
      );
    } else {
      // Tabellen-Ansicht für größere Bildschirme
      return (
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
              {filteredAndSortedRoles.map(role => (
                <tr 
                  key={role.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  {visibleColumnIds.map(columnId => {
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
      );
    }
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
                className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
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
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Suchen..."
              className="px-3 py-2 border rounded-md w-full sm:w-60"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Filter-Button */}
            <button
              className={`p-2 rounded-md border ${getActiveFilterCount() > 0 ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-gray-300 hover:bg-gray-100'}`}
              onClick={() => setIsFilterModalOpen(true)}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">{editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}</h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Beschreibung</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-4">Seiten-Berechtigungen</label>
                  
                  {/* Option für alle Seiten außer immer sichtbare */}
                  <div className="mb-4 pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">Alle Seiten</span>
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            setAllPagePermissions(e.target.value as AccessLevel);
                          }
                        }}
                        className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                        const isActive = permission.accessLevel === 'both';
                        return (
                          <div key={`permission-page-${permission.entity}-${index}`}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">{permission.entity}</span>
                              <label className="inline-flex items-center cursor-pointer">
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
                                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
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
                                    className="flex items-center justify-between mt-2 pl-6 border-l-2 border-gray-200">
                                    <span className="text-sm text-gray-600">└ {tablePerm.entity}</span>
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
                                      <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600">
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
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  {editingRole ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">Erweiterte Filter</h3>
              <button 
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterState.name}
                  onChange={(e) => setFilterState({...filterState, name: e.target.value})}
                  placeholder="Nach Name filtern..."
                />
              </div>
            
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={filterState.description}
                  onChange={(e) => setFilterState({...filterState, description: e.target.value})}
                  placeholder="Nach Beschreibung filtern..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-between rounded-b-lg">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Filter zurücksetzen
              </button>
              <div className="space-x-2">
                <button
                  onClick={() => setIsFilterModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
                >
                  Abbrechen
                </button>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
                >
                  Filter anwenden
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagementTab; 