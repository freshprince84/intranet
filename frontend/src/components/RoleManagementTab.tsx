import React, { useState, useEffect, useCallback } from 'react';
import { roleApi } from '../api/apiClient.ts';
import { Role, AccessLevel } from '../types/interfaces.ts';
import { PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

interface RoleManagementTabProps {
  onRolesChange?: () => void;
  onError: (error: string) => void;
}

const defaultPages = [
  'dashboard',
  'requests',
  'tasks',
  'users',
  'roles',
  'settings',
  'worktracker'
];

// Mock-Rollen für die Anzeige
const mockRoles: Role[] = [
  {
    id: 1,
    name: 'Administrator',
    description: 'Hat volle Berechtigung auf alle Seiten',
    permissions: defaultPages.map(page => ({
      id: 1,
      page,
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
      page,
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
      page,
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
    page: string;
    accessLevel: AccessLevel;
  }[];
}

const RoleManagementTab: React.FC<RoleManagementTabProps> = ({ onRolesChange, onError }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<RoleFormData>({
    name: '',
    description: '',
    permissions: defaultPages.map(page => ({
      page,
      accessLevel: 'none' as AccessLevel
    }))
  });

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

  // Rollen vom Backend laden oder Mock-Daten verwenden - jetzt mit useCallback
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Lade Rollen...');
      
      try {
        const response = await roleApi.getAll();
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`${response.data.length} Rollen erfolgreich vom Backend geladen`);
          console.log('IDs der geladenen Rollen:', response.data.map(role => role.id));
          setRoles(response.data);
          
          // Wenn erfolgreich geladen, keinen Rückfall auf Mock-Daten
          return;
        } else {
          console.warn('Keine Rollen vom Backend erhalten oder leere Liste');
        }
      } catch (err) {
        console.warn('Fehler beim Laden der Rollen vom Backend:', err);
      }
      
      // Nur bei leerer Antwort oder Fehler die Mock-Daten verwenden
      console.log('Verwende Mock-Daten als Fallback');
      setRoles(mockRoles);
    } catch (err) {
      console.error('Fehler beim Laden der Rollen:', err);
      handleError(err);
      // Auch hier nur bei Fehler die Mock-Daten verwenden
      setRoles(mockRoles);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  // Direkt Rollen laden - jetzt mit korrekter Abhängigkeit
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Speichern einer Rolle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log('Formular wird gesendet mit Daten:', formData);
      
      // Validierung der Formulardaten
      if (!formData.name.trim()) {
        handleError('Der Name der Rolle darf nicht leer sein');
        return;
      }
      
      // Prüfen, ob mindestens eine Berechtigung nicht 'none' ist
      const hasValidPermissions = formData.permissions.some(p => p.accessLevel !== 'none');
      if (!hasValidPermissions) {
        handleError('Mindestens eine Berechtigung muss gewährt werden');
        return;
      }
      
      // Berechtigung filtern - nur diejenigen mit accessLevel != none senden
      const filteredPermissions = formData.permissions.filter(p => p.accessLevel !== 'none');
      
      if (editingRole) {
        // Bearbeitung einer bestehenden Rolle
        if (!editingRole.id || isNaN(editingRole.id)) {
          console.warn('Ungültige Rollen-ID erkannt, Bearbeitung abgebrochen');
          handleError('Ungültige Rollen-ID, Bearbeitung abgebrochen');
          return;
        }
        
        // Überprüfen, ob die Rolle noch in der aktuellen Liste existiert
        const roleExists = roles.some(r => r.id === editingRole.id);
        if (!roleExists) {
          console.error(`Rolle mit ID ${editingRole.id} existiert nicht in der aktuellen Liste`);
          handleError(`Rolle mit ID ${editingRole.id} existiert nicht mehr. Bitte aktualisieren Sie die Seite.`);
          setIsModalOpen(false);
          // Rollen neu laden, um die Anzeige zu aktualisieren
          await fetchRoles();
          return;
        }
        
        console.log(`Bearbeite Rolle mit ID ${editingRole.id}`);
        
        try {
          // Bei Mock-Daten lokale Aktualisierung
          if (mockRoles.some(r => r.id === editingRole.id)) {
            console.log('Bearbeite Mock-Rolle');
            const updatedRoles = roles.map(role => 
              role.id === editingRole.id 
                ? { 
                    ...role, 
                    name: formData.name,
                    description: formData.description,
                    permissions: filteredPermissions.map((p, index) => ({
                      id: index + 1,
                      page: p.page,
                      accessLevel: p.accessLevel,
                      roleId: editingRole.id,
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }))
                  } 
                : role
            );
            setRoles(updatedRoles);
          } else {
            console.log('Sende Aktualisierung an API:', {
              name: formData.name,
              description: formData.description,
              permissions: filteredPermissions
            });
            
            const dataToSend = {
              name: formData.name,
              description: formData.description,
              permissions: filteredPermissions
            };
            
            const response = await roleApi.update(editingRole.id, dataToSend);
            console.log('API-Antwort bei Rollenaktualisierung:', response);
            await fetchRoles();
          }
        } catch (updateError) {
          console.error('Fehler bei Rollenaktualisierung:', updateError);
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
            handleError('Netzwerkfehler beim Aktualisieren der Rolle');
          }
          return;
        }
      } else {
        // Erstellen einer neuen Rolle
        try {
          // Bei Mock-Daten lokale Erstellung
          const newRole: Role = {
            id: roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1,
            name: formData.name,
            description: formData.description,
            permissions: filteredPermissions.map((p, index) => ({
              id: index + 1,
              page: p.page,
              accessLevel: p.accessLevel,
              roleId: roles.length > 0 ? Math.max(...roles.map(r => r.id)) + 1 : 1,
              createdAt: new Date(),
              updatedAt: new Date()
            }))
          };
          
          // Bei Nicht-Mock-Daten API-Aufruf
          if (mockRoles.length === 0) {
            console.log('Sende Daten an API für neue Rolle:', {
              name: formData.name,
              description: formData.description,
              permissions: filteredPermissions
            });
            
            const dataToSend = {
              name: formData.name,
              description: formData.description,
              permissions: filteredPermissions
            };
            
            const response = await roleApi.create(dataToSend);
            console.log('API-Antwort beim Erstellen der Rolle:', response);
            await fetchRoles();
          } else {
            // Nur bei Mock-Daten lokal speichern
            setRoles([...roles, newRole]);
          }
        } catch (createError) {
          console.error('Fehler bei API-Anfrage zum Erstellen der Rolle:', createError);
          if (createError.response) {
            handleError(createError.response.data.message || 'Fehler beim Erstellen der Rolle');
          } else {
            handleError('Netzwerkfehler beim Erstellen der Rolle');
          }
          return;
        }
      }
      
      if (onRolesChange) onRolesChange();
      
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Unbehandelter Fehler:', err);
      handleError(err);
      
      // Bei einem unbehandelten Fehler trotzdem versuchen, die Rollenliste zu aktualisieren
      try {
        await fetchRoles();
      } catch (refreshError) {
        console.error('Fehler beim Aktualisieren der Rollenliste nach fehlgeschlagenem Vorgang:', refreshError);
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

  // Bearbeiten einer Rolle
  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions.map(p => ({
        page: p.page,
        accessLevel: p.accessLevel as AccessLevel
      }))
    });
    setIsModalOpen(true);
  };

  // Formular für neue Rolle zurücksetzen
  const resetForm = () => {
    setEditingRole(null);
    setFormData({
      name: '',
      description: '',
      permissions: defaultPages.map(page => ({
        page,
        accessLevel: 'none' as AccessLevel
      }))
    });
  };

  return (
    <div>
      {loading ? (
        <div className="p-4 text-center">Rollen werden geladen...</div>
      ) : (
        <>
          <div className="flex justify-start mb-4">
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
              title="Neue Rolle erstellen"
              aria-label="Neue Rolle erstellen"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="p-4 bg-gray-50 rounded text-center">
              <p>Keine Rollen gefunden. Erstellen Sie eine neue Rolle mit dem Button oben.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beschreibung</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Berechtigungen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map(role => (
                    <tr key={role.id}>
                      <td className="px-6 py-4 whitespace-nowrap">{role.name}</td>
                      <td className="px-6 py-4">{role.description}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map(permission => (
                            <span
                              key={permission.page}
                              className="px-2 py-1 text-xs rounded-full bg-gray-100"
                            >
                              {permission.page}: {permission.accessLevel}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(role)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {role.id !== 999 && (
                            <button
                              onClick={() => handleDelete(role.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal für Rollenerstellung/Bearbeitung */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-medium">
                {editingRole ? 'Rolle bearbeiten' : 'Neue Rolle erstellen'}
              </h3>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Berechtigungen</label>
                  <div className="space-y-3">
                    {formData.permissions.map((permission, index) => (
                      <div key={`permission-${permission.page}-${index}`} className="flex items-center">
                        <span className="w-24 text-sm">{permission.page}</span>
                        <select
                          value={permission.accessLevel}
                          onChange={(e) => {
                            const newPermissions = [...formData.permissions];
                            newPermissions[index] = {
                              ...permission,
                              accessLevel: e.target.value as AccessLevel
                            };
                            setFormData({ ...formData, permissions: newPermissions });
                          }}
                          className="ml-2 block rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="none">Keine</option>
                          <option value="read">Lesen</option>
                          <option value="write">Schreiben</option>
                          <option value="both">Beides</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-2">
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