import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { userApi, roleApi, branchApi } from '../api/apiClient.ts';
import { User, Role } from '../types/interfaces.ts';
import { CheckIcon, PlusIcon, PencilIcon, DocumentTextIcon, UserCircleIcon, ShieldCheckIcon, XMarkIcon, ArrowPathIcon, BuildingOfficeIcon, MapPinIcon } from '@heroicons/react/24/outline';
import useMessage from '../hooks/useMessage.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import IdentificationDocumentList from './IdentificationDocumentList.tsx';
import LifecycleView from './LifecycleView.tsx';
import { useSidepane } from '../contexts/SidepaneContext.tsx';

interface UserManagementTabProps {
  onError: (error: string) => void;
}

// Länder und Sprachen werden dynamisch aus Übersetzungen geladen

// Definiere Rollen, die immer vorhanden sein sollten (z.B. Admin-Rolle)
const fixedRoles = [1, 2, 999]; // Admin (1), User (2) und Hamburger (999) sind fixe Rollen

// Vertragstypen für Kolumbien (CO)
const CONTRACT_TYPES = [
  { code: 'tiempo_completo', name: 'Tiempo Completo (>21 Tage/Monat)' },
  { code: 'tiempo_parcial_7', name: 'Tiempo Parcial (≤7 Tage/Monat)' },
  { code: 'tiempo_parcial_14', name: 'Tiempo Parcial (≤14 Tage/Monat)' },
  { code: 'tiempo_parcial_21', name: 'Tiempo Parcial (≤21 Tage/Monat)' },
  { code: 'prestacion_de_servicios', name: 'Prestación de Servicios' },
  { code: 'externo', name: 'Externo' }
];

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
  const { t } = useTranslation();
  
  // Länder für die Auswahl (dynamisch aus Übersetzungen)
  const COUNTRIES = [
    { code: 'CO', name: t('countries.CO') },
    { code: 'CH', name: t('countries.CH') },
    { code: 'DE', name: t('countries.DE') },
    { code: 'AT', name: t('countries.AT') }
  ];

  // Länder für die Payroll-Auswahl (dynamisch aus Übersetzungen)
  const PAYROLL_COUNTRIES = [
    { code: 'CH', name: t('countries.CH') },
    { code: 'CO', name: t('countries.CO') }
  ];

  // Sprachen für die Auswahl (dynamisch aus Übersetzungen)
  const LANGUAGES = [
    { code: 'es', name: t('languages.es') },
    { code: 'de', name: t('languages.de') },
    { code: 'en', name: t('languages.en') }
  ];
  
  // Benutzer-States
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({});
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [lifecycleRefreshKey, setLifecycleRefreshKey] = useState(0);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [roleWarning, setRoleWarning] = useState<string | null>(null);
  const { showMessage } = useMessage();
  const { isAdmin } = usePermissions();
  
  // Neuer State für Rollen
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // State für Branches
  const [branches, setBranches] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  
  // Neuer State für die aktive Unterseite
  const [activeUserTab, setActiveUserTab] = useState<'details' | 'documents' | 'roles' | 'branches' | 'lifecycle'>('details');
  
  // State für Active/Inactive Filter
  const [userFilterTab, setUserFilterTab] = useState<'active' | 'inactive'>('active');
  
  // State für Benutzererstellung
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 640);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth > 1070);
  const { openSidepane, closeSidepane } = useSidepane();
  const [newUserFormData, setNewUserFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  // Responsive Erkennung
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
    if (isCreateModalOpen) {
      openSidepane();
    } else {
      closeSidepane();
    }
    
    return () => {
      closeSidepane();
    };
  }, [isCreateModalOpen, openSidepane, closeSidepane]);

  // Alle Benutzer (für Filterung)
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // Initialisierung - Laden von Benutzern
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Benutzerdaten laden - Verwende gefilterten Endpoint, damit nur Benutzer der eigenen Organisation angezeigt werden
  const fetchAllUsers = async () => {
    try {
      const response = await userApi.getAll();
      setAllUsers(response.data);
      // Initial: Nur aktive Benutzer anzeigen
      filterUsersByActiveStatus('active', response.data);
    } catch (err) {
      handleError(err);
    }
  };

  // Benutzer nach Active/Inactive filtern und alphabetisch sortieren
  const filterUsersByActiveStatus = (status: 'active' | 'inactive', usersToFilter: User[] = allUsers) => {
    const filtered = usersToFilter.filter(user => {
      const isActive = user.active !== undefined ? user.active : true; // Default: true
      return status === 'active' ? isActive : !isActive;
    });
    
    // Alphabetisch sortieren nach username, dann firstName
    const sorted = filtered.sort((a, b) => {
      const aUsername = (a.username || '').toLowerCase();
      const bUsername = (b.username || '').toLowerCase();
      const aFirstName = (a.firstName || '').toLowerCase();
      const bFirstName = (b.firstName || '').toLowerCase();
      
      // Zuerst nach username sortieren
      if (aUsername !== bUsername) {
        return aUsername.localeCompare(bUsername);
      }
      // Wenn username gleich, nach Vorname sortieren
      return aFirstName.localeCompare(bFirstName);
    });
    
    setUsers(sorted);
  };

  // Wenn Filter-Tab wechselt, Benutzerliste neu filtern
  useEffect(() => {
    if (allUsers.length > 0) {
      filterUsersByActiveStatus(userFilterTab, allUsers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilterTab]);
  
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

  // Branches laden - Wird erst aufgerufen, wenn ein Benutzer ausgewählt wurde
  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      
      try {
        const response = await branchApi.getAll();
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setBranches(response.data);
          console.log(`${response.data.length} Branches erfolgreich geladen`);
        } else {
          console.warn('Keine Branches vom Server erhalten');
          setBranches([]);
        }
      } catch (error) {
        console.warn('Fehler beim Laden der Branches:', error);
        setBranches([]);
      }
    } finally {
      setLoadingBranches(false);
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
        active: response.data.active !== undefined ? response.data.active : true,
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
      
      // Extrahiere Branch-IDs aus der verschachtelten Struktur
      let branchIds: number[] = [];
      
      if (response.data.branches && Array.isArray(response.data.branches)) {
        console.log('Branches-Struktur (Typ):', typeof response.data.branches, 'Länge:', response.data.branches.length);
        
        // Struktur: branches: [{ branch: { id, name, ... } }]
        if (response.data.branches.length > 0 && response.data.branches[0].branch) {
          branchIds = response.data.branches.map(userBranch => userBranch.branch.id);
          console.log('Extrahierte Branch-IDs aus verschachtelter Struktur:', branchIds);
        }
        // Fallback für andere Formate
        else if (response.data.branches.length > 0) {
          if (typeof response.data.branches[0] === 'number') {
            branchIds = response.data.branches;
          } else if (response.data.branches[0].branchId) {
            branchIds = response.data.branches.map(branch => branch.branchId);
          } else if (response.data.branches[0].id) {
            branchIds = response.data.branches.map(branch => branch.id);
          }
        }
      } else {
        console.warn('Branches fehlen oder sind kein Array:', response.data.branches);
      }
      
      console.log('Endgültige extrahierte Branch-IDs:', branchIds);
      
      setSelectedUser(userData);
      setUserFormData(userData);
      setSelectedRoles(roleIds);
      setSelectedBranches(branchIds);
      
      // Rollen nur einmal laden, wenn sie noch nicht geladen wurden
      if (roles.length === 0) {
        await fetchRoles();
      }
      
      // Branches nur einmal laden, wenn sie noch nicht geladen wurden
      if (branches.length === 0) {
        await fetchBranches();
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
    setIsEditingUser(true); // Aktiviere Edit-Modus sobald etwas geändert wird
  };

  // Abbrechen der Bearbeitung
  const handleCancelEdit = () => {
    if (selectedUser) {
      setUserFormData({
        ...selectedUser,
        birthday: selectedUser.birthday ? new Date(selectedUser.birthday).toISOString().split('T')[0] : null
      });
    }
    setIsEditingUser(false);
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
        setUserFormData({
          ...updatedData,
          birthday: updatedData.birthday ? new Date(updatedData.birthday).toISOString().split('T')[0] : null
        });
        
        // Optimistisches Update: User in allUsers und users aktualisieren
        setAllUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === updatedData.id ? updatedData : user
          )
        );
        
        // Benutzerliste neu filtern basierend auf aktuellem Tab
        filterUsersByActiveStatus(userFilterTab, allUsers.map(user => 
          user.id === updatedData.id ? updatedData : user
        ));
        
        showMessage('Benutzerprofil erfolgreich aktualisiert', 'success');
        setIsEditingUser(false);
        
        // Lifecycle-Daten neu laden, falls Vertragstyp geändert wurde
        if (dataToSend.contract !== undefined) {
          setLifecycleRefreshKey(prev => prev + 1);
        }
      }
    } catch (err) {
      console.error('Fehler beim Speichern der Benutzerdaten:', err);
      // Bei Fehler: Rollback durch vollständiges Reload
      await fetchAllUsers();
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

  // Benutzer aktivieren/deaktivieren
  const handleToggleActive = async () => {
    if (!selectedUser || !selectedUser.id) {
      showMessage('Kein Benutzer ausgewählt', 'error');
      return;
    }

    // Verhindere, dass der Admin-Benutzer sich selbst deaktiviert
    const currentUserId = parseInt(localStorage.getItem('userId') || '0', 10);
    if (selectedUser.id === currentUserId) {
      showMessage('Du kannst dich nicht selbst deaktivieren', 'warning');
      return;
    }

    try {
      // Aktueller Status: wenn undefined, dann true (Default)
      const currentActiveStatus = selectedUser.active !== undefined ? selectedUser.active : true;
      const newActiveStatus = !currentActiveStatus;
      
      console.log('Toggle active:', { 
        currentActiveStatus, 
        newActiveStatus, 
        selectedUser,
        selectedUserActive: selectedUser.active,
        userId: selectedUser.id
      });
      
      const updatePayload = { active: newActiveStatus };
      console.log('Sending update payload:', updatePayload, 'Type of active:', typeof newActiveStatus);
      
      // Update Benutzer
      const response = await userApi.update(selectedUser.id, updatePayload);
      
      console.log('Update response:', response.data);

      if (response.data) {
        const updatedData = {
          ...response.data,
          active: response.data.active !== undefined ? response.data.active : true,
          birthday: response.data.birthday ? new Date(response.data.birthday).toISOString().split('T')[0] : null
        };
        
        console.log('Updated user data:', updatedData);
        
        setSelectedUser(updatedData);
        setUserFormData({
          ...updatedData,
          birthday: updatedData.birthday ? new Date(updatedData.birthday).toISOString().split('T')[0] : null
        });
        
        // Optimistisches Update: User in allUsers und users aktualisieren
        setAllUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === updatedData.id ? updatedData : user
          )
        );
        
        // Benutzerliste neu filtern basierend auf aktuellem Tab
        filterUsersByActiveStatus(userFilterTab, allUsers.map(user => 
          user.id === updatedData.id ? updatedData : user
        ));
        
        // Benutzerliste neu laden, um sicherzustellen, dass alles synchron ist
        await fetchAllUsers();
        
        showMessage(
          newActiveStatus 
            ? 'Benutzer erfolgreich aktiviert' 
            : 'Benutzer erfolgreich deaktiviert',
          'success'
        );
      }
    } catch (err) {
      console.error('Fehler beim Aktivieren/Deaktivieren des Benutzers:', err);
      handleError(err);
      // Bei Fehler: Benutzerliste neu laden
      await fetchAllUsers();
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

  // Toggle Branch für einen Benutzer (hinzufügen/entfernen)
  const toggleBranch = async (branchId: number) => {
    if (!branchId || !selectedUser) return;
    
    try {
      console.log('Toggle Branch:', branchId, 'für Benutzer:', selectedUser.id);
      console.log('Aktuelle ausgewählte Branches:', selectedBranches);
      
      // Überprüfen, ob die Branch bereits zugewiesen ist
      const isBranchSelected = selectedBranches.includes(branchId);
      
      const newSelectedBranches = isBranchSelected
        ? selectedBranches.filter(id => id !== branchId)
        : [...selectedBranches, branchId];
      
      console.log('Neue ausgewählte Branches:', newSelectedBranches);
      
      // Optimistisches UI-Update
      setSelectedBranches(newSelectedBranches);
      
      // API-Aufruf zur Aktualisierung der Branches
      console.log('Sende Branch-Aktualisierung an API:', { userId: selectedUser.id, branchIds: newSelectedBranches });
      const response = await userApi.updateBranches(selectedUser.id, newSelectedBranches);
      console.log('API-Antwort bei Branch-Aktualisierung:', response.data);
      
      // Benutzer nach dem Update neu laden
      await fetchUserDetails(selectedUser.id);
      
      // Erfolgsmeldung anzeigen
      showMessage(
        isBranchSelected
          ? `Branch erfolgreich entfernt`
          : `Branch erfolgreich zugewiesen`,
        'success'
      );
    } catch (error) {
      // Bei Fehler auf vorherigen Zustand zurücksetzen
      console.error('Fehler beim Aktualisieren der Branches:', error);
      fetchUserDetails(selectedUser.id);
      handleError(error);
      showMessage('Fehler beim Aktualisieren der Branches', 'error');
    }
  };

  // Initialisiere FormData wenn Benutzer ausgewählt wird
  useEffect(() => {
    if (selectedUser) {
      setUserFormData({
        ...selectedUser,
        birthday: selectedUser.birthday ? new Date(selectedUser.birthday).toISOString().split('T')[0] : null
      });
      setIsEditingUser(false); // Starte im Read-Only Modus
    }
  }, [selectedUser]);

  // Handler für neue Benutzer-Formular
  const handleNewUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserFormData({ ...newUserFormData, [name]: value });
  };

  // Neuen Benutzer erstellen
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validierung
    if (!newUserFormData.email || !newUserFormData.password || !newUserFormData.firstName || !newUserFormData.lastName) {
      showMessage('Bitte füllen Sie alle Felder aus', 'error');
      return;
    }

    // E-Mail-Format validieren
    if (!newUserFormData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showMessage('Ungültiges E-Mail-Format', 'error');
      return;
    }

    try {
      const response = await userApi.create(newUserFormData);
      
      // Optimistisches Update: User zu allUsers hinzufügen
      if (response.data) {
        const newUser = {
          ...response.data,
          active: response.data.active !== undefined ? response.data.active : true
        };
        setAllUsers(prevUsers => [newUser, ...prevUsers]);
        
        // Wenn aktueller Tab "active" ist und neuer User aktiv ist, auch zu users hinzufügen
        if (userFilterTab === 'active' && newUser.active) {
          setUsers(prevUsers => [newUser, ...prevUsers]);
        }
      }
      
      showMessage('Benutzer erfolgreich erstellt', 'success');
      setIsCreateModalOpen(false);
      setNewUserFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: ''
      });
    } catch (err: any) {
      // Bei Fehler: Rollback durch vollständiges Reload
      await fetchAllUsers();
      const errorMessage = err.response?.data?.message || 'Fehler beim Erstellen des Benutzers';
      showMessage(errorMessage, 'error');
      onError(errorMessage);
    }
  };

  return (
    <div className="container mx-auto px-4 pb-6">
      {/* Die lokale Erfolgsmeldungs-Anzeige wird entfernt, da wir jetzt HeaderMessage verwenden */}
      {/* {userSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {userSuccess}
        </div>
      )} */}

      {/* Titelzeile: Button links, Dropdown rechts */}
      <div className="mb-6">
        <div className="flex items-start gap-4">
          {/* Linke Seite: "Neuer Benutzer"-Button */}
          <div className="flex items-center pt-8">
            {isAdmin() && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-1.5 rounded-full hover:bg-blue-50 dark:hover:bg-gray-600 border border-blue-200 dark:border-gray-600 shadow-sm flex items-center justify-center"
                style={{ width: '30.19px', height: '30.19px' }}
                title={t('users.create')}
                aria-label={t('users.create')}
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          
          {/* Rechts: Benutzer-Dropdown mit Active/Inactive Tabs */}
          <div className="flex-1">
            {/* Active/Inactive Tabs */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUserFilterTab('active')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  userFilterTab === 'active'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {t('users.active')}
              </button>
              <button
                type="button"
                onClick={() => setUserFilterTab('inactive')}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  userFilterTab === 'inactive'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                }`}
              >
                {t('users.inactive')}
              </button>
            </div>
            
            <select
              id="userSelect"
              onChange={handleUserSelect}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
            >
              <option value="">-- {t('common.select')} --</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.username})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div>
          {/* Tabs für Benutzerdetails, Dokumente und Rollen - zusammenhängende Box ohne Shadow/Border */}
          <div className="bg-white dark:bg-gray-800 mb-6">
            {/* Tab-Navigation */}
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
                  {t('users.title')}
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
                  {t('profile.documents')}
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
                  {t('roles.title')}
                </button>
                <button
                  onClick={() => setActiveUserTab('branches')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeUserTab === 'branches'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <MapPinIcon className="h-5 w-5 inline mr-2" />
                  {t('branches.title') || 'Niederlassungen'}
                </button>
                <button
                  onClick={() => setActiveUserTab('lifecycle')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeUserTab === 'lifecycle'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
                  {t('lifecycle.tabTitle')}
                </button>
              </nav>
          </div>

            {/* Tab-Inhalte */}
          {/* Benutzerdetails Formular */}
          {activeUserTab === 'details' && (
              <form onSubmit={handleUserSubmit} className="p-6">
              {/* Bestehender Code für Benutzerdetails */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users.form.username')}
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={userFormData.username || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users.form.email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userFormData.email || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users.form.firstName')}
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={userFormData.firstName || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users.form.lastName')}
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={userFormData.lastName || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.birthday')}
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={userFormData.birthday || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.bankDetails')}
                  </label>
                  <input
                    type="text"
                    name="bankDetails"
                    value={userFormData.bankDetails || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.contract')}
                  </label>
                  <select
                    name="contract"
                    value={userFormData.contract || ''}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t('common.pleaseSelect', { defaultValue: 'Bitte auswählen...' })}</option>
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type.code} value={type.code}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.salary')}
                  </label>
                  <input
                    type="number"
                    name="salary"
                    value={userFormData.salary === null || userFormData.salary === undefined ? '' : userFormData.salary}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('users.form.normalWorkingHours')}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="normalWorkingHours"
                    value={userFormData.normalWorkingHours === null || userFormData.normalWorkingHours === undefined ? '7.6' : userFormData.normalWorkingHours}
                    onChange={handleUserInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('profile.country')}
                  </label>
                  <select
                    name="country"
                    value={userFormData.country || 'CO'}
                    onChange={handleUserInputChange}
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
                    {t('profile.language')}
                  </label>
                  <select
                    name="language"
                    value={userFormData.language || 'es'}
                    onChange={handleUserInputChange}
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
                <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('users.form.payrollSettings')}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('users.form.payrollCountry')}
                    </label>
                    <select
                      name="payrollCountry"
                      value={userFormData.payrollCountry || selectedUser.payrollCountry || 'CH'}
                      onChange={handleUserInputChange}
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
                        {t('users.form.contractType')}
                      </label>
                      <select
                        name="contractType"
                        value={userFormData.contractType || ''}
                        onChange={handleUserInputChange}
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
                      {t('users.form.hourlyRate')} ({(userFormData.payrollCountry || selectedUser.payrollCountry) === 'CH' ? 'CHF' : 'COP'})
                    </label>
                    <input
                      type="number"
                      name="hourlyRate"
                      min="0"
                      step={(userFormData.payrollCountry || selectedUser.payrollCountry) === 'CH' ? '0.05' : '1'}
                      value={userFormData.hourlyRate === null || userFormData.hourlyRate === undefined ? '' : userFormData.hourlyRate}
                      onChange={handleUserInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                      placeholder={(userFormData.payrollCountry || selectedUser.payrollCountry) === 'CH' ? 'z.B. 45.00' : 'z.B. 50000'}
                    />
                  </div>
                  
                  {((userFormData.payrollCountry === 'CO' || selectedUser.payrollCountry === 'CO') && 
                    (userFormData.contractType !== 'servicios_externos' && selectedUser.contractType !== 'servicios_externos') &&
                    (userFormData.contractType || selectedUser.contractType)) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('users.form.monthlySalary')} (COP)
                      </label>
                      <input
                        type="number"
                        name="monthlySalary"
                        min="0"
                        step="1000"
                        value={userFormData.monthlySalary === null || userFormData.monthlySalary === undefined ? '' : userFormData.monthlySalary}
                        onChange={handleUserInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        placeholder="z.B. 3500000"
                      />
                    </div>
                  )}
                </div>
              </div>

              {isEditingUser && (
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    title={t('common.cancel')}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="submit"
                    className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
                    title={t('common.save')}
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Status-Badge und Activate/Deactivate Button unter den Profil-Feldern */}
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                {selectedUser.active !== undefined && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedUser.active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {selectedUser.active ? t('users.active') : t('users.inactive')}
                  </span>
                )}
                {isAdmin() && (
                  <button
                    onClick={handleToggleActive}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedUser.active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                        : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                    }`}
                    title={selectedUser.active ? t('users.deactivate') : t('users.activate')}
                  >
                    {selectedUser.active ? (
                      <>
                        <XMarkIcon className="h-5 w-5" />
                        {t('users.deactivate')}
                      </>
                    ) : (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        {t('users.activate')}
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          )}

          {/* Identifikationsdokumente Tab */}
          {activeUserTab === 'documents' && (
              <div className="p-6">
            <IdentificationDocumentList userId={selectedUser.id} isAdmin={true} />
              </div>
          )}

          {/* Rollen Tab */}
          {activeUserTab === 'roles' && (
              <div className="p-6">
              {/* Rollenzuweisung - nur anzeigen, wenn Rollen geladen wurden */}
              {loadingRoles ? (
                <div className="mt-4 mb-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('roleAssignment.title')}</h3>
                  <p className="dark:text-gray-300">{t('roleAssignment.loading')}</p>
                </div>
              ) : roles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('roleAssignment.title')}</h3>
                  
                  {/* Überprüfung auf unbekannte Rollen */}
                  {selectedRoles.some(roleId => !roles.some(role => role.id === roleId)) && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded mb-4">
                      <p className="font-bold">{t('roleAssignment.unknownRolesWarning')}</p>
                      <p>{t('roleAssignment.unknownRolesMessage', { ids: selectedRoles.filter(roleId => !roles.some(role => role.id === roleId)).join(', ') })}</p>
                      <p className="mt-2 text-sm">{t('roleAssignment.availableRoleIds', { ids: roles.map(r => r.id).join(', ') })}</p>
                    </div>
                  )}
                  
                  {/* Aktuell zugewiesene Rollen */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('roleAssignment.currentRoles')}</h4>
                    {selectedRoles.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic">{t('roleAssignment.noRolesAssigned')}</p>
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
                                          {t('roleAssignment.fixed')}
                                        </span>
                                      )}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
                                  </div>
                                  <div className={`flex items-center ${isFixedRole ? 'text-gray-400 dark:text-gray-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                    <span className="mr-2 text-sm">{isFixedRole ? t('roleAssignment.fixedAssigned') : t('roleAssignment.remove')}</span>
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
                                  <h4 className="font-medium">{t('roleAssignment.unknownRole', { id: roleId })}</h4>
                                  <p className="text-sm text-orange-600">{t('roleAssignment.unknownRoleDescription')}</p>
                                </div>
                                <div className="flex items-center text-orange-600">
                                  <span className="mr-2 text-sm">{t('roleAssignment.remove')}</span>
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
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('roleAssignment.availableRoles')}</h4>
                    {roles.filter(role => !selectedRoles.includes(role.id)).length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic">{t('roleAssignment.noRolesAvailable')}</p>
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
                                  <span className="mr-2 text-sm">{t('roleAssignment.add')}</span>
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

          {/* Branches Tab */}
          {activeUserTab === 'branches' && (
              <div className="p-6">
              {/* Branch-Zuweisung - nur anzeigen, wenn Branches geladen wurden */}
              {loadingBranches ? (
                <div className="mt-4 mb-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('branchAssignment.title') || 'Niederlassungszuweisung'}</h3>
                  <p className="dark:text-gray-300">{t('branchAssignment.loading') || 'Lade Niederlassungen...'}</p>
                </div>
              ) : branches.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('branchAssignment.title') || 'Niederlassungszuweisung'}</h3>
                  
                  {/* Überprüfung auf unbekannte Branches */}
                  {selectedBranches.some(branchId => !branches.some(branch => branch.id === branchId)) && (
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded mb-4">
                      <p className="font-bold">{t('branchAssignment.unknownBranchesWarning') || 'Unbekannte Niederlassungen zugewiesen'}</p>
                      <p>{t('branchAssignment.unknownBranchesMessage', { ids: selectedBranches.filter(branchId => !branches.some(branch => branch.id === branchId)).join(', ') }) || `Die folgenden Niederlassungs-IDs sind zugewiesen, aber nicht verfügbar: ${selectedBranches.filter(branchId => !branches.some(branch => branch.id === branchId)).join(', ')}`}</p>
                      <p className="mt-2 text-sm">{t('branchAssignment.availableBranchIds', { ids: branches.map(b => b.id).join(', ') }) || `Verfügbare Niederlassungs-IDs: ${branches.map(b => b.id).join(', ')}`}</p>
                    </div>
                  )}
                  
                  {/* Aktuell zugewiesene Branches */}
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('branchAssignment.currentBranches') || 'Aktuell zugewiesene Niederlassungen'}</h4>
                    {selectedBranches.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic">{t('branchAssignment.noBranchesAssigned') || 'Keine Niederlassungen zugewiesen'}</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Bekannte zugewiesene Branches */}
                        {branches
                          .filter(branch => selectedBranches.includes(branch.id))
                          .map(branch => (
                            <div 
                              key={branch.id} 
                              className="border border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 rounded-lg p-4 cursor-pointer"
                              onClick={() => toggleBranch(branch.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium dark:text-white">
                                    {branch.name}
                                  </h4>
                                </div>
                                <div className="flex items-center text-blue-600 dark:text-blue-400">
                                  <span className="mr-2 text-sm">{t('branchAssignment.remove') || 'Entfernen'}</span>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          ))}
                        
                        {/* Unbekannte zugewiesene Branches */}
                        {selectedBranches
                          .filter(branchId => !branches.some(branch => branch.id === branchId))
                          .map(branchId => (
                            <div 
                              key={`unknown-${branchId}`} 
                              className="border border-orange-500 bg-orange-50 rounded-lg p-4"
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium">{t('branchAssignment.unknownBranch', { id: branchId }) || `Unbekannte Niederlassung (ID: ${branchId})`}</h4>
                                  <p className="text-sm text-orange-600">{t('branchAssignment.unknownBranchDescription') || 'Diese Niederlassung existiert nicht mehr oder ist nicht verfügbar.'}</p>
                                </div>
                                <div className="flex items-center text-orange-600">
                                  <span className="mr-2 text-sm">{t('branchAssignment.remove') || 'Entfernen'}</span>
                                  <button 
                                    onClick={() => toggleBranch(branchId)}
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
                  
                  {/* Verfügbare Branches */}
                  <div>
                    <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('branchAssignment.availableBranches') || 'Verfügbare Niederlassungen'}</h4>
                    {branches.filter(branch => !selectedBranches.includes(branch.id)).length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 italic">{t('branchAssignment.noBranchesAvailable') || 'Keine weiteren Niederlassungen verfügbar'}</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {branches
                          .filter(branch => !selectedBranches.includes(branch.id))
                          .map(branch => (
                            <div 
                              key={branch.id} 
                              className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => toggleBranch(branch.id)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <h4 className="font-medium dark:text-white">{branch.name}</h4>
                                </div>
                                <div className="flex items-center text-gray-500 hover:text-blue-600 dark:hover:text-blue-400">
                                  <span className="mr-2 text-sm">{t('branchAssignment.add') || 'Hinzufügen'}</span>
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
              {!loadingBranches && branches.length === 0 && (
                <div className="mt-4 mb-4">
                  <h3 className="text-lg font-semibold mb-4 dark:text-white">{t('branchAssignment.title') || 'Niederlassungszuweisung'}</h3>
                  <p className="text-gray-500 dark:text-gray-400">{t('branchAssignment.noBranchesFound') || 'Keine Niederlassungen gefunden'}</p>
                </div>
              )}
            </div>
          )}

          {/* Lebenszyklus Tab */}
          {activeUserTab === 'lifecycle' && selectedUser && (
              <div className="p-6">
            <LifecycleView 
              key={`lifecycle-${selectedUser.id}-${lifecycleRefreshKey}`}
              userId={selectedUser.id} 
              userName={`${selectedUser.firstName} ${selectedUser.lastName}`}
            />
              </div>
          )}
          </div>
        </div>
      )}

      {/* Sidepane/Modal für Benutzererstellung */}
      {isCreateModalOpen && (
        <>
          {/* Für Mobile (unter 640px) - klassisches Modal */}
          {isMobile ? (
            <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="relative z-50">
              <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
              
              <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                  {/* Header */}
                  <div className="px-6 py-4 border-b dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <Dialog.Title className="text-lg font-semibold dark:text-white">
                        {t('organisation.createUser.title')}
                      </Dialog.Title>
                      <button
                        onClick={() => setIsCreateModalOpen(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Form */}
                  <form onSubmit={handleCreateUser} className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('organisation.createUser.email')} *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={newUserFormData.email}
                          onChange={handleNewUserInputChange}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('organisation.createUser.password')} *
                        </label>
                        <input
                          type="password"
                          name="password"
                          value={newUserFormData.password}
                          onChange={handleNewUserInputChange}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('organisation.createUser.firstName')} *
                        </label>
                        <input
                          type="text"
                          name="firstName"
                          value={newUserFormData.firstName}
                          onChange={handleNewUserInputChange}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('organisation.createUser.lastName')} *
                        </label>
                        <input
                          type="text"
                          name="lastName"
                          value={newUserFormData.lastName}
                          onChange={handleNewUserInputChange}
                          className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        title={t('common.cancel')}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
                        title={t('organisation.createUser.create')}
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </div>
            </Dialog>
          ) : (
            // Für Desktop (ab 640px) - Sidepane
            // WICHTIG: Sidepane muss IMMER gerendert bleiben für Transition
            <>
              {/* Backdrop - nur wenn offen und <= 1070px */}
              {/* Hinweis: onClick entfernt, da Backdrop pointer-events: none hat, damit Hauptinhalt interaktiv bleibt */}
              {isCreateModalOpen && !isLargeScreen && (
                <div 
                  className="fixed inset-0 bg-black/10 transition-opacity sidepane-overlay sidepane-backdrop z-40" 
                  aria-hidden="true" 
                  style={{
                    opacity: isCreateModalOpen ? 1 : 0,
                    transition: 'opacity 300ms ease-out'
                  }}
                />
              )}
              
              {/* Sidepane - IMMER gerendert, Position wird via Transform geändert */}
              <div 
                className={`fixed top-16 bottom-0 right-0 max-w-sm w-full bg-white dark:bg-gray-800 shadow-xl sidepane-panel sidepane-panel-container transform z-50 flex flex-col ${isCreateModalOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{
                  transition: 'transform 350ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                  pointerEvents: isCreateModalOpen ? 'auto' : 'none'
                }}
                aria-hidden={!isCreateModalOpen}
                role="dialog"
                aria-modal={isCreateModalOpen}
              >
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 flex-shrink-0">
                  <h2 className="text-lg font-semibold dark:text-white">
                    {t('organisation.createUser.title')}
                  </h2>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex flex-col flex-1 min-h-0">
                  <form onSubmit={handleCreateUser} className="flex flex-col flex-1 min-h-0">
                    <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('organisation.createUser.email')} *
                        </label>
                      <input
                        type="email"
                        name="email"
                        value={newUserFormData.email}
                        onChange={handleNewUserInputChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('organisation.createUser.password')} *
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={newUserFormData.password}
                        onChange={handleNewUserInputChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('organisation.createUser.firstName')} *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={newUserFormData.firstName}
                        onChange={handleNewUserInputChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('organisation.createUser.lastName')} *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={newUserFormData.lastName}
                        onChange={handleNewUserInputChange}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 dark:bg-gray-700 dark:text-white"
                        required
                      />
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t dark:border-gray-700 pt-4 px-4 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(false)}
                        className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                        title={t('common.cancel')}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="submit"
                        className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
                        title={t('organisation.createUser.create')}
                      >
                        <CheckIcon className="h-5 w-5" />
                      </button>
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

export default UserManagementTab; 