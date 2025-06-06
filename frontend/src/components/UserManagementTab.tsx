import React, { useState, useEffect } from 'react';
import { userApi, roleApi } from '../api/apiClient.ts';
import { User, Role } from '../types/interfaces.ts';
import { CheckIcon, PlusIcon, PencilIcon, DocumentTextIcon, UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import useMessage from '../hooks/useMessage.ts';
import IdentificationDocumentList from './IdentificationDocumentList.tsx';

interface UserManagementTabProps {
  onError: (error: string) => void;
}

// Länder für die Auswahl
const COUNTRIES = [
  { code: 'CO', name: 'Kolumbien' },
  { code: 'CH', name: 'Schweiz' },
  { code: 'DE', name: 'Deutschland' },
  { code: 'AT', name: 'Österreich' }
];

// Länder für die Payroll-Auswahl
const PAYROLL_COUNTRIES = [
  { code: 'CH', name: 'Schweiz' },
  { code: 'CO', name: 'Kolumbien' }
];

// Vertragsarten für Kolumbien
const CONTRACT_TYPES = [
  { code: 'tiempo_completo', name: 'Tiempo Completo (>21 Tage/Monat)' },
  { code: 'tiempo_parcial_7', name: 'Tiempo Parcial (≤7 Tage/Monat)' },
  { code: 'tiempo_parcial_14', name: 'Tiempo Parcial (≤14 Tage/Monat)' },
  { code: 'tiempo_parcial_21', name: 'Tiempo Parcial (≤21 Tage/Monat)' },
  { code: 'servicios_externos', name: 'Servicios Externos (Stundenbasiert)' }
];

// Sprachen für die Auswahl
const LANGUAGES = [
  { code: 'es', name: 'Spanisch' },
  { code: 'de', name: 'Deutsch' },
  { code: 'en', name: 'Englisch' }
];

// Definiere Rollen, die immer vorhanden sein sollten (z.B. Admin-Rolle)
const fixedRoles = [1, 2, 999]; // Admin (1), User (2) und Hamburger (999) sind fixe Rollen

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
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [roleWarning, setRoleWarning] = useState<string | null>(null);
  const { showMessage } = useMessage();
  
  // Neuer State für Rollen
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Neuer State für die aktive Unterseite
  const [activeUserTab, setActiveUserTab] = useState<'details' | 'documents' | 'roles'>('details');



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

  // Erweitere den handleUserInputChange
  const handleUserInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: string | number | null = value;
    
    // Korrekte Typenkonvertierung für numerische Felder
    if (type === 'number') {
      // Wenn das Feld leer ist, setzen wir null statt NaN
      finalValue = value === '' ? null : Number(value);
    }
    
    setUserFormData({ ...userFormData, [name]: finalValue });
  };

  // Speichern der Benutzerdaten
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !selectedUser.id) {
      onError('Kein Benutzer ausgewählt');
      showMessage('Kein Benutzer ausgewählt', 'error');
      return;
    }

    try {
      // Validierung
      if (!userFormData.username?.trim()) throw new Error('Benutzername ist erforderlich');
      if (!userFormData.email?.trim()) throw new Error('E-Mail ist erforderlich');
      if (!userFormData.firstName?.trim()) throw new Error('Vorname ist erforderlich');
      if (!userFormData.lastName?.trim()) throw new Error('Nachname ist erforderlich');

      // Bereite die Daten korrekt vor
      const dataToSend = {
        ...userFormData,
        // Korrekte Behandlung von numerischen Werten
        salary: userFormData.salary === null || userFormData.salary === undefined || userFormData.salary === '' as any
          ? null 
          : typeof userFormData.salary === 'string' 
            ? parseFloat(userFormData.salary) 
            : userFormData.salary,
        normalWorkingHours: userFormData.normalWorkingHours === null || userFormData.normalWorkingHours === undefined || userFormData.normalWorkingHours === '' as any
          ? 7.6 
          : typeof userFormData.normalWorkingHours === 'string' 
            ? parseFloat(userFormData.normalWorkingHours) 
            : userFormData.normalWorkingHours,
        hourlyRate: userFormData.hourlyRate === null || userFormData.hourlyRate === undefined || userFormData.hourlyRate === '' as any
          ? null 
          : typeof userFormData.hourlyRate === 'string' 
            ? userFormData.hourlyRate  // Keine Konvertierung für Decimal-Werte, da sie als Strings übergeben werden sollten
            : userFormData.hourlyRate.toString(),  // Konvertierung zu String für Decimal-Werte
        monthlySalary: userFormData.monthlySalary === null || userFormData.monthlySalary === undefined || userFormData.monthlySalary === '' as any
          ? null 
          : typeof userFormData.monthlySalary === 'string' 
            ? parseFloat(userFormData.monthlySalary) 
            : userFormData.monthlySalary,
        birthday: userFormData.birthday || null
      };

      console.log('Sende Daten zum Server:', dataToSend);

      // Update Benutzerdaten
      const response = await userApi.update(selectedUser.id, dataToSend);

      if (response.data) {
        const updatedData = {
          ...response.data,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        setSelectedUser(updatedData);
        setUserFormData(updatedData);
        showMessage('Benutzerprofil erfolgreich aktualisiert', 'success');
        setIsEditingUser(false);
        fetchUsers();
      }
    } catch (err) {
      console.error('Fehler beim Speichern der Benutzerdaten:', err);
      if (err.response?.status === 400) {
        const errorMsg = `Validierungsfehler: ${err.response?.data?.message || 'Bitte überprüfe die eingegebenen Daten'}`;
        onError(errorMsg);
        showMessage(errorMsg, 'error');
      } else if (err.response?.status === 404) {
        onError('Benutzer wurde nicht gefunden');
        showMessage('Benutzer wurde nicht gefunden', 'error');
      } else {
        handleError(err);
      }
    }
  };

  // Toggle Rolle für einen Benutzer (hinzufügen/entfernen)
  const toggleRole = async (roleId: number) => {
    if (!roleId || !selectedUser) return;
    
    // Prüfe, ob es sich um eine fixe Rolle handelt - Nur für Admin-Benutzer (ID: 1) sind Admin-Rollen (ID: 1) nicht entfernbar
    if (roleId === 1 && selectedUser.id === 1 && selectedRoles.includes(roleId)) {
      showMessage('Die Admin-Rolle kann vom Admin-Benutzer nicht entfernt werden', 'warning');
      return;
    }
    
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
      
      // Erfolgsmeldung anzeigen mit showMessage statt setUserSuccess
      showMessage(
        isRoleSelected
          ? `Rolle erfolgreich entfernt`
          : `Rolle erfolgreich zugewiesen`,
        'success'
      );
    } catch (error) {
      // Bei Fehler auf vorherigen Zustand zurücksetzen
      console.error('Fehler beim Aktualisieren der Rollen:', error);
      fetchUserDetails(selectedUser.id);
      handleError(error);
      showMessage('Fehler beim Aktualisieren der Rollen', 'error');
    }
  };

  // Bearbeitung des Benutzerprofils starten
  const startEditingUser = () => {
    setUserFormData(selectedUser || {});
    setIsEditingUser(true);
  };

  return (
    <div className="container mx-auto px-4 pb-6">
      {/* Die lokale Erfolgsmeldungs-Anzeige wird entfernt, da wir jetzt HeaderMessage verwenden */}
      {/* {userSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {userSuccess}
        </div>
      )} */}

      {/* Benutzer-Dropdown */}
      <div className="mb-6">
        <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Benutzer auswählen
        </label>
        <select
          id="userSelect"
          onChange={handleUserSelect}
          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
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
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold dark:text-white">
              Benutzer: {selectedUser.firstName} {selectedUser.lastName}
            </h2>
            {!isEditingUser && (
              <button
                onClick={startEditingUser}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
              >
                <PencilIcon className="h-4 w-4 inline mr-1" />
                Bearbeiten
              </button>
            )}
          </div>

          {/* Tabs für Benutzerdetails, Dokumente und Rollen */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveUserTab('details')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeUserTab === 'details'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <UserCircleIcon className="h-5 w-5 inline mr-2" />
                  Benutzerdetails
                </button>
                <button
                  onClick={() => setActiveUserTab('documents')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeUserTab === 'documents'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                  Identifikationsdokumente
                </button>
                <button
                  onClick={() => setActiveUserTab('roles')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeUserTab === 'roles'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <ShieldCheckIcon className="h-5 w-5 inline mr-2" />
                  Rollen
                </button>
              </nav>
            </div>
          </div>

          {/* Benutzerdetails Formular */}
          {activeUserTab === 'details' && (
            <form onSubmit={handleUserSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Bestehender Code für Benutzerdetails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gehalt
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={isEditingUser ? (userFormData.salary === null ? '' : userFormData.salary) : (selectedUser.salary === null ? '' : selectedUser.salary)}
                    onChange={handleUserInputChange}
                    disabled={!isEditingUser}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Normale Arbeitszeit (Stunden)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="normalWorkingHours"
                    value={isEditingUser ? (userFormData.normalWorkingHours === null ? '7.6' : userFormData.normalWorkingHours) : (selectedUser.normalWorkingHours === null ? '7.6' : selectedUser.normalWorkingHours)}
                    onChange={handleUserInputChange}
                    disabled={!isEditingUser}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Land
                  </label>
                  <select
                    name="country"
                    value={isEditingUser ? userFormData.country || 'CO' : selectedUser.country || 'CO'}
                    onChange={handleUserInputChange}
                    disabled={!isEditingUser}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sprache
                  </label>
                  <select
                    name="language"
                    value={isEditingUser ? userFormData.language || 'es' : selectedUser.language || 'es'}
                    onChange={handleUserInputChange}
                    disabled={!isEditingUser}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lohnabrechnung-Einstellungen */}
              <div className="mt-4 border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Lohnabrechnung-Einstellungen</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Abrechnungsland
                    </label>
                    <select
                      name="payrollCountry"
                      value={isEditingUser ? userFormData.payrollCountry || (selectedUser.payrollCountry || 'CH') : (selectedUser.payrollCountry || 'CH')}
                      onChange={handleUserInputChange}
                      disabled={!isEditingUser}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                    >
                      {PAYROLL_COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {(userFormData.payrollCountry === 'CO' || 
                    (selectedUser.payrollCountry === 'CO' && !userFormData.payrollCountry)) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Vertragsart
                      </label>
                      <select
                        name="contractType"
                        value={isEditingUser ? userFormData.contractType || '' : selectedUser.contractType || ''}
                        onChange={handleUserInputChange}
                        disabled={!isEditingUser}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Bitte auswählen</option>
                        {CONTRACT_TYPES.map(type => (
                          <option key={type.code} value={type.code}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stundensatz ({(userFormData.payrollCountry || selectedUser.payrollCountry) === 'CH' ? 'CHF' : 'COP'})
                    </label>
                    <input
                      type="number"
                      name="hourlyRate"
                      min="0"
                      step={(userFormData.payrollCountry || selectedUser.payrollCountry) === 'CH' ? '0.05' : '1'}
                      value={isEditingUser 
                        ? (userFormData.hourlyRate === null || userFormData.hourlyRate === undefined ? '' : userFormData.hourlyRate) 
                        : (selectedUser.hourlyRate === null || selectedUser.hourlyRate === undefined ? '' : selectedUser.hourlyRate)}
                      onChange={handleUserInputChange}
                      disabled={!isEditingUser}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder={(userFormData.payrollCountry || selectedUser.payrollCountry) === 'CH' ? 'z.B. 45.00' : 'z.B. 50000'}
                    />
                  </div>
                  
                  {((userFormData.payrollCountry === 'CO' || selectedUser.payrollCountry === 'CO') && 
                    (userFormData.contractType !== 'servicios_externos' && selectedUser.contractType !== 'servicios_externos') &&
                    (userFormData.contractType || selectedUser.contractType)) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Monatliches Gehalt (COP)
                      </label>
                      <input
                        type="number"
                        name="monthlySalary"
                        min="0"
                        step="1000"
                        value={isEditingUser 
                          ? (userFormData.monthlySalary === null || userFormData.monthlySalary === undefined ? '' : userFormData.monthlySalary) 
                          : (selectedUser.monthlySalary === null || selectedUser.monthlySalary === undefined ? '' : selectedUser.monthlySalary)}
                        onChange={handleUserInputChange}
                        disabled={!isEditingUser}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="z.B. 3500000"
                      />
                    </div>
                  )}
                </div>
              </div>

              {isEditingUser && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingUser(false)}
                    className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 px-4 py-2 rounded mr-2"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Speichern
                  </button>
                </div>
              )}
            </form>
          )}

          {/* Identifikationsdokumente Tab */}
          {activeUserTab === 'documents' && (
            <IdentificationDocumentList userId={selectedUser.id} isAdmin={true} />
          )}

          {/* Rollen Tab */}
          {activeUserTab === 'roles' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              {/* Rollenzuweisung - nur anzeigen, wenn Rollen geladen wurden */}
              {loadingRoles ? (
                <div className="mt-4 mb-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Rollenzuweisung</h3>
                  <p className="dark:text-gray-300">Rollen werden geladen...</p>
                </div>
              ) : roles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">Rollenzuweisung</h3>
                  
                  {/* Überprüfung auf unbekannte Rollen */}
                  {selectedRoles.some(roleId => !roles.some(role => role.id === roleId)) && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded mb-4">
                      <p className="font-bold">Achtung: Unbekannte Rollen-IDs gefunden</p>
                      <p>Einige Rollen-IDs des Benutzers ({
                        selectedRoles.filter(roleId => !roles.some(role => role.id === roleId)).join(', ')
                      }) sind in den verfügbaren Rollen nicht vorhanden.</p>
                      <p className="mt-2 text-sm">Verfügbare Rollen-IDs: {roles.map(r => r.id).join(', ')}</p>
                    </div>
                  )}
                  
                  {/* Aktuell zugewiesene Rollen */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Aktuelle Rollen</h4>
                    {selectedRoles.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic">Keine Rollen zugewiesen</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bekannte zugewiesene Rollen */}
                        {roles
                          .filter(role => selectedRoles.includes(role.id))
                          .map(role => {
                            // Eine Rolle ist nur dann nicht entfernbar, wenn es sich um die Admin-Rolle (ID: 1) für den Admin-Benutzer (ID: 1) handelt
                            const isFixedRole = role.id === 1 && selectedUser && selectedUser.id === 1;
                            return (
                              <div 
                                key={role.id} 
                                className={`border rounded-lg p-4 ${isFixedRole ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-700 cursor-not-allowed' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 cursor-pointer'}`}
                                onClick={() => !isFixedRole && toggleRole(role.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium flex items-center dark:text-white">
                                      {role.name}
                                      {isFixedRole && (
                                        <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                                          Fix
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
                                  </div>
                                  <div className={`flex items-center ${isFixedRole ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                    <span className="mr-2 text-sm">{isFixedRole ? 'Fest zugewiesen' : 'Entfernen'}</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        
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
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Verfügbare Rollen</h4>
                    {roles.filter(role => !selectedRoles.includes(role.id)).length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic">Keine weiteren Rollen verfügbar</p>
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
      )}
    </div>
  );
};

export default UserManagementTab; 