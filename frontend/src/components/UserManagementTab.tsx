import React, { useState, useEffect } from 'react';
import { userApi, roleApi } from '../api/apiClient.ts';
import { User, Role } from '../types/interfaces.ts';
import { CheckIcon, PlusIcon } from '@heroicons/react/24/outline';

interface UserManagementTabProps {
  onError: (error: string) => void;
}

// Gemeinsame Debug-Komponente hinzufügen
const RoleDebugInfo = ({ title, data }: { title: string, data: any }) => (
  <div className="mb-2 p-2 border border-gray-300 rounded bg-gray-50">
    <h5 className="font-bold text-sm">{title}</h5>
    <pre className="text-xs overflow-auto max-h-24">
      {JSON.stringify(data, null, 2)}
    </pre>
  </div>
);

const UserManagementTab = ({ onError }: UserManagementTabProps): JSX.Element => {
  // Benutzer-States
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [roleWarning, setRoleWarning] = useState<string | null>(null);
  
  // Neuer State für Rollen
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Initialisierung - Laden von Benutzern
  useEffect(() => {
    fetchUsers();
  }, []);

  // Benutzerdaten laden
  const fetchUsers = async () => {
    try {
      const response = await userApi.getAll();
      setUsers(response.data);
    } catch (err) {
      handleError(err);
    }
  };
  
  // Rollen laden - Wird erst aufgerufen, wenn ein Benutzer ausgewählt wurde
  const fetchRoles = async () => {
    try {
      setLoadingRoles(true);
      
      // Fallback-Rollen für den Notfall bereithalten
      const fallbackRoles = [
        { id: 1, name: 'admin', description: 'Administrator mit allen Rechten', permissions: [] },
        { id: 2, name: 'user', description: 'Standardbenutzer', permissions: [] },
        { id: 999, name: 'hamburger', description: 'Hamburger-Rolle für neue Benutzer', permissions: [] }
      ];
      
      try {
        const response = await roleApi.getAll();
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setRoles(response.data);
          console.log(`${response.data.length} Rollen erfolgreich geladen`);
        } else {
          console.warn('Keine Rollen vom Server erhalten, verwende Fallback');
          setRoles(fallbackRoles);
        }
      } catch (error) {
        console.warn('Fehler beim Laden der Rollen, verwende Fallback:', error);
        setRoles(fallbackRoles);
      }
    } finally {
      setLoadingRoles(false);
    }
  };

  // Detaillierte Benutzerdaten laden
  const fetchUserDetails = async (userId: number) => {
    try {
      if (!userId || isNaN(userId)) {
        setSelectedUser(null);
        return;
      }
      
      console.log('Lade Benutzerdetails für ID:', userId);
      const response = await userApi.getById(userId);
      
      const userData = {
        ...response.data,
        birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
      };
      
      // Extrahiere Rollen-IDs aus der verschachtelten Struktur
      let roleIds: number[] = [];
      
      if (response.data.roles && Array.isArray(response.data.roles)) {
        console.log('Rollenstruktur (Typ):', typeof response.data.roles, 'Länge:', response.data.roles.length);
        
        // Struktur: roles: [{ role: { id, name, ... } }]
        if (response.data.roles.length > 0 && response.data.roles[0].role) {
          roleIds = response.data.roles.map(userRole => userRole.role.id);
          console.log('Extrahierte Rollen-IDs aus verschachtelter Struktur:', roleIds);
        }
        // Fallback für andere Formate
        else if (response.data.roles.length > 0) {
          if (typeof response.data.roles[0] === 'number') {
            roleIds = response.data.roles;
          } else if (response.data.roles[0].roleId) {
            roleIds = response.data.roles.map(role => role.roleId);
          } else if (response.data.roles[0].id) {
            roleIds = response.data.roles.map(role => role.id);
          }
        }
      } else {
        console.warn('Rollen fehlen oder sind kein Array:', response.data.roles);
      }
      
      // Wenn keine Rollen gefunden wurden, probieren wir, diese aus roles in der Response direkt zu extrahieren
      if (roleIds.length === 0 && response.data.role) {
        console.log('Versuche Rollen aus role-Eigenschaft zu extrahieren:', response.data.role);
        if (Array.isArray(response.data.role)) {
          roleIds = response.data.role.map((r: any) => r.id);
        } else if (typeof response.data.role === 'object' && response.data.role !== null) {
          roleIds = [response.data.role.id];
        }
      }
      
      console.log('Endgültige extrahierte Rollen-IDs:', roleIds);
      
      setSelectedUser(userData);
      setUserFormData(userData);
      setSelectedRoles(roleIds);
      
      // Rollen nur einmal laden, wenn sie noch nicht geladen wurden
      if (roles.length === 0) {
        await fetchRoles();
      }
    } catch (err) {
      console.error('Fehler beim Laden der Benutzerdetails:', err);
      handleError(err);
    }
  };

  // Fehlerbehandlung
  const handleError = (err: any) => {
    let message = 'Ein Fehler ist aufgetreten';
    if (err.response?.data?.message) {
      message = err.response.data.message;
    } else if (err instanceof Error) {
      message = err.message;
    }
    
    // Fehler "Ungültige Rollen-ID" nicht weitergeben, wenn kein Benutzer ausgewählt ist
    if (message.includes('Ungültige Rollen-ID') && !selectedUser) {
      console.warn('Fehler unterdrückt, da kein Benutzer ausgewählt ist:', message);
      return;
    }
    
    onError(message);
  };

  // Handler für Auswahl eines Benutzers
  const handleUserSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = parseInt(event.target.value, 10);
    if (userId && !isNaN(userId)) {
      fetchUserDetails(userId);
    } else {
      setSelectedUser(null);
      setUserFormData({});
      setSelectedRoles([]);
    }
  };

  // Handler für Änderungen an Benutzerdaten
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  // Speichern der Benutzerdaten
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserSuccess(null);

    if (!selectedUser || !selectedUser.id) {
      onError('Kein Benutzer ausgewählt');
      return;
    }

    try {
      // Validierung
      if (!userFormData.username?.trim()) throw new Error('Benutzername ist erforderlich');
      if (!userFormData.email?.trim()) throw new Error('E-Mail ist erforderlich');
      if (!userFormData.firstName?.trim()) throw new Error('Vorname ist erforderlich');
      if (!userFormData.lastName?.trim()) throw new Error('Nachname ist erforderlich');

      const dataToSend = {
        ...userFormData,
        salary: userFormData.salary ? parseFloat(userFormData.salary.toString()) : null,
        birthday: userFormData.birthday || null
      };

      // Update Benutzerdaten
      const response = await userApi.update(selectedUser.id, dataToSend);

      if (response.data) {
        const updatedData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        setSelectedUser(updatedData);
        setUserFormData(updatedData);
        setUserSuccess('Benutzerprofil erfolgreich aktualisiert');
        setIsEditingUser(false);
        fetchUsers();
      }
    } catch (err) {
      handleError(err);
    }
  };

  // Toggle Rolle für einen Benutzer (hinzufügen/entfernen)
  const toggleRole = async (roleId: number) => {
    if (!roleId || !selectedUser) return;
    
    try {
      console.log('Toggle Rolle:', roleId, 'für Benutzer:', selectedUser.id);
      console.log('Aktuelle ausgewählte Rollen:', selectedRoles);
      
      // Überprüfen, ob die Rolle bereits zugewiesen ist
      const isRoleSelected = selectedRoles.includes(roleId);
      
      const newSelectedRoles = isRoleSelected
        ? selectedRoles.filter(id => id !== roleId)
        : [...selectedRoles, roleId];
      
      console.log('Neue ausgewählte Rollen:', newSelectedRoles);
      
      // Optimistisches UI-Update
      setSelectedRoles(newSelectedRoles);
      
      // API-Aufruf zur Aktualisierung der Rollen
      console.log('Sende Rollenaktualisierung an API:', { userId: selectedUser.id, roleIds: newSelectedRoles });
      const response = await userApi.updateRoles(selectedUser.id, newSelectedRoles);
      console.log('API-Antwort bei Rollenaktualisierung:', response.data);
      
      // Benutzer nach dem Update neu laden
      await fetchUserDetails(selectedUser.id);
      
      // Erfolgsmeldung anzeigen
      setUserSuccess(
        isRoleSelected
          ? `Rolle erfolgreich entfernt`
          : `Rolle erfolgreich zugewiesen`
      );

      // Nach kurzer Zeit die Erfolgsmeldung ausblenden
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (error) {
      // Bei Fehler auf vorherigen Zustand zurücksetzen
      console.error('Fehler beim Aktualisieren der Rollen:', error);
      fetchUserDetails(selectedUser.id);
      handleError(error);
    }
  };

  // Bearbeitung des Benutzerprofils starten
  const startEditingUser = () => {
    setUserFormData(selectedUser || {});
    setIsEditingUser(true);
  };

  return (
    <div>
      {userSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {userSuccess}
        </div>
      )}

      {/* Benutzer-Dropdown */}
      <div className="mb-6">
        <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Benutzer auswählen
        </label>
        <select
          id="userSelect"
          onChange={handleUserSelect}
          className="w-full rounded-md border border-gray-300 px-3 py-2"
        >
          <option value="">-- Benutzer auswählen --</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>
              {user.firstName} {user.lastName} ({user.username})
            </option>
          ))}
        </select>
      </div>

      {selectedUser && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Profildaten</h3>
            {!isEditingUser && (
              <button
                onClick={startEditingUser}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Bearbeiten
              </button>
            )}
          </div>

          <form onSubmit={handleUserSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Benutzername
                </label>
                <input
                  type="text"
                  name="username"
                  value={isEditingUser ? userFormData.username || '' : selectedUser.username || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  E-Mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={isEditingUser ? userFormData.email || '' : selectedUser.email || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vorname
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={isEditingUser ? userFormData.firstName || '' : selectedUser.firstName || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nachname
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={isEditingUser ? userFormData.lastName || '' : selectedUser.lastName || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Geburtsdatum
                </label>
                <input
                  type="date"
                  name="birthday"
                  value={isEditingUser ? userFormData.birthday || '' : selectedUser.birthday || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bankdaten
                </label>
                <input
                  type="text"
                  name="bankDetails"
                  value={isEditingUser ? userFormData.bankDetails || '' : selectedUser.bankDetails || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vertrags-ID
                </label>
                <input
                  type="text"
                  name="contract"
                  value={isEditingUser ? userFormData.contract || '' : selectedUser.contract || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Gehalt
                </label>
                <input
                  type="number"
                  name="salary"
                  value={isEditingUser ? userFormData.salary || '' : selectedUser.salary || ''}
                  onChange={handleUserInputChange}
                  disabled={!isEditingUser}
                  className="w-full px-3 py-2 border rounded-md"
                  step="0.01"
                />
              </div>
            </div>

            {isEditingUser && (
              <div className="flex space-x-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingUser(false)}
                  className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                >
                  Speichern
                </button>
              </div>
            )}
          </form>

          {/* Rollenzuweisung - nur anzeigen, wenn Rollen geladen wurden */}
          {loadingRoles ? (
            <div className="mt-8 mb-8">
              <h3 className="text-lg font-semibold mb-4">Rollenzuweisung</h3>
              <p>Rollen werden geladen...</p>
            </div>
          ) : roles.length > 0 && (
            <div className="mt-8 mb-8">
              <h3 className="text-lg font-semibold mb-4">Rollenzuweisung</h3>
              
              {/* Überprüfung auf unbekannte Rollen */}
              {selectedRoles.some(roleId => !roles.some(role => role.id === roleId)) && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                  <p className="font-bold">Achtung: Unbekannte Rollen-IDs gefunden</p>
                  <p>Einige Rollen-IDs des Benutzers ({
                    selectedRoles.filter(roleId => !roles.some(role => role.id === roleId)).join(', ')
                  }) sind in den verfügbaren Rollen nicht vorhanden.</p>
                  <p className="mt-2 text-sm">Verfügbare Rollen-IDs: {roles.map(r => r.id).join(', ')}</p>
                </div>
              )}
              
              {/* Aktuell zugewiesene Rollen */}
              <div className="mb-6">
                <h4 className="font-medium text-gray-700 mb-2">Aktuelle Rollen</h4>
                {selectedRoles.length === 0 ? (
                  <p className="text-gray-500 italic">Keine Rollen zugewiesen</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bekannte zugewiesene Rollen */}
                    {roles
                      .filter(role => selectedRoles.includes(role.id))
                      .map(role => (
                        <div 
                          key={role.id} 
                          className="border border-blue-500 bg-blue-50 rounded-lg p-4 cursor-pointer"
                          onClick={() => toggleRole(role.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{role.name}</h4>
                              <p className="text-sm text-gray-600">{role.description}</p>
                            </div>
                            <div className="flex items-center text-blue-600">
                              <span className="mr-2 text-sm">Entfernen</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {/* Unbekannte zugewiesene Rollen */}
                    {selectedRoles
                      .filter(roleId => !roles.some(role => role.id === roleId))
                      .map(roleId => (
                        <div 
                          key={`unknown-${roleId}`} 
                          className="border border-orange-500 bg-orange-50 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">Unbekannte Rolle (ID: {roleId})</h4>
                              <p className="text-sm text-orange-600">Diese Rolle ist dem Benutzer zugewiesen, aber nicht in der Rollenliste vorhanden.</p>
                            </div>
                            <div className="flex items-center text-orange-600">
                              <span className="mr-2 text-sm">Entfernen</span>
                              <button 
                                onClick={() => toggleRole(roleId)}
                                className="focus:outline-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              {/* Verfügbare Rollen */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Verfügbare Rollen</h4>
                {roles.filter(role => !selectedRoles.includes(role.id)).length === 0 ? (
                  <p className="text-gray-500 italic">Keine weiteren Rollen verfügbar</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {roles
                      .filter(role => !selectedRoles.includes(role.id))
                      .map(role => (
                        <div 
                          key={role.id} 
                          className="border border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50"
                          onClick={() => toggleRole(role.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="font-medium">{role.name}</h4>
                              <p className="text-sm text-gray-600">{role.description}</p>
                            </div>
                            <div className="flex items-center text-gray-500 hover:text-blue-600">
                              <span className="mr-2 text-sm">Hinzufügen</span>
                              <PlusIcon className="h-5 w-5" />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserManagementTab; 