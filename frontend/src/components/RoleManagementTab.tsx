import React, { useState, useEffect, useCallback } from 'react';
import { roleApi } from '../api/apiClient.ts';
import { Role, AccessLevel } from '../types/interfaces.ts';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

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

  return (
    <div>
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div>
          {/* Action-Button nur anzeigen, wenn der Benutzer Schreibrechte hat */}
          {!readOnly && (
            <div className="mb-4 flex justify-start">
              <button
                onClick={() => { setEditingRole(null); resetForm(); setIsModalOpen(true); }}
                className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                title="Neue Rolle erstellen"
                aria-label="Neue Rolle erstellen"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {roles.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-center">
              <p>Keine Rollen gefunden. Erstellen Sie eine neue Rolle mit dem Button oben.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berechtigungen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {roles.map(role => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                      <td className="px-6 py-4">{role.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map(permission => (
                            <span
                              key={`${permission.entity}-${permission.accessLevel}`}
                              className="px-2 py-1 text-xs rounded-full bg-gray-100"
                            >
                              {permission.entity}: {permission.accessLevel}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {/* Aktionen nur anzeigen, wenn der Benutzer Schreibrechte hat */}
                        {!readOnly && role.id !== 1 && role.id !== 2 && role.id !== 999 && (
                          <>
                            <button 
                              onClick={() => prepareRoleForEditing(role)} 
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button 
                              onClick={() => handleDelete(role.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                        {!readOnly && (role.id === 1 || role.id === 2 || role.id === 999) && (
                          <span className="text-gray-400 text-xs">Geschützte Systemrolle</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
    </div>
  );
};

export default RoleManagementTab; 