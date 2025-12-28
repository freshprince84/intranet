import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth.tsx';
import { useBranch } from '../contexts/BranchContext.tsx';
import NotificationBell from './NotificationBell.tsx';
import { API_URL, API_ENDPOINTS } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import HeaderMessage from './HeaderMessage.tsx';
import useMessage from '../hooks/useMessage.ts';
import { useOnboarding } from '../contexts/OnboardingContext.tsx';
import { logger } from '../utils/logger.ts';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, logout, switchRole } = useAuth();
    const { branches, selectedBranch, setSelectedBranch, loadBranches } = useBranch();
    const { showMessage } = useMessage();
    const { completeStep } = useOnboarding();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isRoleSubMenuOpen, setIsRoleSubMenuOpen] = useState(false);
    const [isBranchSubMenuOpen, setIsBranchSubMenuOpen] = useState(false);
    const [logoSrc, setLogoSrc] = useState<string>('/settings/logo');
    const [logoLoadFailed, setLogoLoadFailed] = useState<boolean>(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const roleSubMenuTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const branchSubMenuTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const isOpeningSubMenuRef = useRef<boolean>(false); // Track ob gerade ein Untermenü geöffnet wird
    const roleMenuButtonRef = useRef<HTMLButtonElement>(null);
    const roleSubMenuRef = useRef<HTMLDivElement>(null);
    const branchMenuButtonRef = useRef<HTMLButtonElement>(null);
    const branchSubMenuRef = useRef<HTMLDivElement>(null);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleMouseLeave = () => {
        // ✅ WICHTIG: Nur schließen, wenn KEIN Untermenü offen ist UND nicht gerade eines geöffnet wird
        // Wenn ein Untermenü offen ist oder gerade geöffnet wird, wird es von seinem eigenen Handler geschlossen
        if (!isRoleSubMenuOpen && !isBranchSubMenuOpen && !isOpeningSubMenuRef.current) {
            // Vorherigen Timeout löschen, falls vorhanden
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setIsProfileMenuOpen(false);
                setIsRoleSubMenuOpen(false);
                setIsNotificationOpen(false);
                timeoutRef.current = undefined; // Ref zurücksetzen nach Ausführung
            }, 1000);
        }
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined; // Ref zurücksetzen
        }
    };

    // Separate Handler für Rollen-Untermenü mit längerem Timeout
    const handleRoleSubMenuMouseEnter = () => {
        // ✅ WICHTIG: Markiere, dass Untermenü aktiv ist (verhindert handleMouseLeave)
        isOpeningSubMenuRef.current = true;
        // ✅ WICHTIG: Timeout IMMER löschen, auch wenn Ref undefined ist
        if (roleSubMenuTimeoutRef.current) {
            clearTimeout(roleSubMenuTimeoutRef.current);
            roleSubMenuTimeoutRef.current = undefined; // Ref zurücksetzen
        }
        handleMouseEnter(); // Auch Hauptmenü-Timeout löschen
    };

    const handleRoleSubMenuMouseLeave = () => {
        // ✅ WICHTIG: Markiere, dass Untermenü verlassen wird
        isOpeningSubMenuRef.current = false;
        // ✅ WICHTIG: Vorherigen Timeout löschen, falls vorhanden
        if (roleSubMenuTimeoutRef.current) {
            clearTimeout(roleSubMenuTimeoutRef.current);
        }
        roleSubMenuTimeoutRef.current = setTimeout(() => {
            setIsRoleSubMenuOpen(false);
            roleSubMenuTimeoutRef.current = undefined; // Ref zurücksetzen nach Ausführung
            // ✅ WICHTIG: Wenn Untermenü geschlossen wird, auch Hauptmenü schließen
            // (nur wenn nicht gerade ein anderes Untermenü geöffnet wird)
            if (!isBranchSubMenuOpen && !isOpeningSubMenuRef.current) {
                // Starte Timeout für Hauptmenü (wird gelöscht, wenn man wieder über Hauptmenü hovert)
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    setIsProfileMenuOpen(false);
                    timeoutRef.current = undefined;
                }, 1000);
            }
        }, 2500); // Längerer Timeout für Untermenü (2.5 Sekunden)
    };

    // Separate Handler für Branch-Untermenü mit längerem Timeout
    const handleBranchSubMenuMouseEnter = () => {
        // ✅ WICHTIG: Markiere, dass Untermenü aktiv ist (verhindert handleMouseLeave)
        isOpeningSubMenuRef.current = true;
        // ✅ WICHTIG: Timeout IMMER löschen, auch wenn Ref undefined ist
        if (branchSubMenuTimeoutRef.current) {
            clearTimeout(branchSubMenuTimeoutRef.current);
            branchSubMenuTimeoutRef.current = undefined; // Ref zurücksetzen
        }
        handleMouseEnter(); // Auch Hauptmenü-Timeout löschen
    };

    const handleBranchSubMenuMouseLeave = () => {
        // ✅ WICHTIG: Markiere, dass Untermenü verlassen wird
        isOpeningSubMenuRef.current = false;
        // ✅ WICHTIG: Vorherigen Timeout löschen, falls vorhanden
        if (branchSubMenuTimeoutRef.current) {
            clearTimeout(branchSubMenuTimeoutRef.current);
        }
        branchSubMenuTimeoutRef.current = setTimeout(() => {
            setIsBranchSubMenuOpen(false);
            branchSubMenuTimeoutRef.current = undefined; // Ref zurücksetzen nach Ausführung
            // ✅ WICHTIG: Wenn Untermenü geschlossen wird, auch Hauptmenü schließen
            // (nur wenn nicht gerade ein anderes Untermenü geöffnet wird)
            if (!isRoleSubMenuOpen && !isOpeningSubMenuRef.current) {
                // Starte Timeout für Hauptmenü (wird gelöscht, wenn man wieder über Hauptmenü hovert)
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    setIsProfileMenuOpen(false);
                    timeoutRef.current = undefined;
                }, 1000);
            }
        }, 2500); // Längerer Timeout für Untermenü (2.5 Sekunden)
    };

    // Neues Event-Handling für das Hovern über den "Rolle wechseln"-Button
    const handleRoleMenuMouseEnter = () => {
        // ✅ WICHTIG: Markiere, dass ein Untermenü geöffnet wird (verhindert handleMouseLeave)
        isOpeningSubMenuRef.current = true;
        // ✅ WICHTIG: Timeout löschen BEVOR State gesetzt wird
        handleMouseEnter();
        // ✅ WICHTIG: Auch Untermenü-Timeouts löschen
        if (roleSubMenuTimeoutRef.current) {
            clearTimeout(roleSubMenuTimeoutRef.current);
            roleSubMenuTimeoutRef.current = undefined;
        }
        setIsRoleSubMenuOpen(true);
        setIsBranchSubMenuOpen(false);
        // ✅ WICHTIG: Nach kurzer Verzögerung Flag zurücksetzen (State-Update ist dann durch)
        setTimeout(() => {
            isOpeningSubMenuRef.current = false;
        }, 50);
    };

    // Neues Event-Handling für das Hovern über den "Standort wechseln"-Button
    const handleBranchMenuMouseEnter = () => {
        // ✅ WICHTIG: Markiere, dass ein Untermenü geöffnet wird (verhindert handleMouseLeave)
        isOpeningSubMenuRef.current = true;
        // ✅ WICHTIG: Timeout löschen BEVOR State gesetzt wird
        handleMouseEnter();
        // ✅ WICHTIG: Auch Untermenü-Timeouts löschen
        if (branchSubMenuTimeoutRef.current) {
            clearTimeout(branchSubMenuTimeoutRef.current);
            branchSubMenuTimeoutRef.current = undefined;
        }
        setIsBranchSubMenuOpen(true);
        setIsRoleSubMenuOpen(false);
        // ✅ WICHTIG: Nach kurzer Verzögerung Flag zurücksetzen (State-Update ist dann durch)
        setTimeout(() => {
            isOpeningSubMenuRef.current = false;
        }, 50);
    };

    // Event-Handling für das Hovern über andere Menüpunkte
    const handleOtherMenuItemsMouseEnter = () => {
        handleMouseEnter();
        setIsRoleSubMenuOpen(false);
        setIsBranchSubMenuOpen(false);
    };

    // Öffnet das Profilmenü und schließt das Benachrichtigungsmenü
    const toggleProfileMenu = () => {
        setIsProfileMenuOpen(!isProfileMenuOpen);
        setIsNotificationOpen(false);
    };

    // Öffnet das Benachrichtigungsmenü und schließt das Profilmenü
    const toggleNotificationMenu = () => {
        setIsNotificationOpen(!isNotificationOpen);
        setIsProfileMenuOpen(false);
        setIsRoleSubMenuOpen(false);
    };

    const handleRoleSwitch = async (roleId: number) => {
        try {
            await switchRole(roleId);
            // Branches neu laden, da sich die verfügbaren Branches durch Rollenwechsel ändern können
            await loadBranches();
            setIsRoleSubMenuOpen(false);
            setIsProfileMenuOpen(false);
            showMessage(t('header.roleSwitched', { defaultValue: 'Rolle erfolgreich gewechselt' }), 'success');
            
            // Prüfe ob switch_role_after_join Schritt aktiv ist und schließe ihn ab
            try {
                await completeStep('switch_role_after_join', t('onboarding.steps.switch_role_after_join.title') || 'Rolle wechseln');
            } catch (error) {
                // Fehler beim Abschließen blockiert nicht den Rollenwechsel
                console.error('Fehler beim Abschließen des switch_role_after_join Schritts:', error);
            }
        } catch (error: any) {
            console.error('Fehler beim Rollenwechsel:', error);
            const errorMessage = error.response?.data?.message || error.message || t('header.roleSwitchError', { defaultValue: 'Fehler beim Wechseln der Rolle' });
            showMessage(errorMessage, 'error');
        }
    };

    const handleBranchSwitch = async (branchId: number) => {
        try {
            // API-Call zum Backend, um Branch-Wechsel zu persistieren
            const response = await axiosInstance.post(API_ENDPOINTS.BRANCHES.SWITCH, { branchId });
            
            if (response.data && response.data.success) {
                // Branch-Wechsel erfolgreich - aktualisiere Context
                setSelectedBranch(branchId);
                
                // Lade Branches neu, um lastUsed-Flag zu aktualisieren
                await loadBranches();
                
                setIsBranchSubMenuOpen(false);
                setIsProfileMenuOpen(false);
                showMessage(t('header.branchSwitched', { defaultValue: 'Standort erfolgreich gewechselt' }), 'success');
            } else {
                throw new Error('Branch-Wechsel fehlgeschlagen');
            }
        } catch (error: any) {
            console.error('Fehler beim Standortwechsel:', error);
            const errorMessage = error.response?.data?.message || error.message || t('header.branchSwitchError', { defaultValue: 'Fehler beim Wechseln der Niederlassung' });
            showMessage(errorMessage, 'error');
        }
    };

    // Dokumentation der Menüfunktionalität
    /**
     * Menü-Interaktionsfunktionalität:
     * 1. Das Haupt- und Benachrichtigungsmenü kann durch Klick geöffnet/geschlossen werden
     * 2. Die Menüs bleiben geöffnet, solange die Maus darauf ist
     * 3. Nach dem Verlassen der Menüs mit der Maus werden sie nach einer kurzen Verzögerung geschlossen
     * 4. Das Untermenü für Rollenwechsel öffnet sich sowohl bei Klick als auch bei Hover
     * 5. Eine Verzögerung von 150ms verhindert, dass die Menüs zu schnell schließen
     *    beim Navigieren zwischen Menüelementen
     * 6. Klicken auf ein Menü schließt automatisch das andere Menü, um Überlagerungen zu vermeiden
     */

    // Aktuelle Rolle des Benutzers ermitteln
    const currentRole = user?.roles.find(r => r.role && r.lastUsed === true);
    const roleName = currentRole?.role.name || 'Keine Rolle';
    const organizationName = currentRole?.role.organization?.displayName || currentRole?.role.organization?.name || null;
    const organization = currentRole?.role.organization;

    // Logo basierend auf Organisation setzen
    useEffect(() => {
        // Warte bis User-Daten geladen sind
        if (!user) {
            return;
        }
        
        logger.log('=== LOGO-LOGIK DEBUG ===');
        logger.log('organization:', organization);
        logger.log('organization?.logo:', organization?.logo);
        logger.log('organization?.logo type:', typeof organization?.logo);
        logger.log('organization?.logo length:', organization?.logo?.length);
        
        // Prüfe ob User eine Organisation hat und ob diese ein Logo hat
        // Wichtig: Prüfe auch auf leeren String!
        if (organization && organization.logo && organization.logo.trim() !== '') {
            logger.log('✅ Verwende Organisationslogo');
            // Wenn Logo als Base64-Data-URL gespeichert ist (beginnt mit "data:")
            if (organization.logo.startsWith('data:')) {
                logger.log('Logo ist Base64-Data-URL');
                setLogoSrc(organization.logo);
            } else {
                // Wenn Logo als URL gespeichert ist
                logger.log('Logo ist URL:', organization.logo);
                setLogoSrc(organization.logo);
            }
        } else {
            // Keine Organisation oder kein Logo -> Standardlogo des Intranets verwenden (aus Mobile App)
            logger.log('❌ Verwende Standardlogo - organization:', !!organization, 'logo:', !!organization?.logo, 'logo value:', organization?.logo);
            setLogoSrc('/intranet-logo.png');
        }
    }, [user, organization, currentRole]);

    // Versuche das Logo zu laden - erst direkt, dann über Base64 wenn nötig
    useEffect(() => {
        // Nur für Standardlogo (nicht für Organisationslogo)
        if (logoLoadFailed && !organization?.logo) {
            logger.log("Versuche Logo über Base64-API zu laden...");
            axiosInstance.get('/settings/logo/base64')
                .then(response => {
                    logger.log("Base64-Logo geladen, Größe:", response.data.size, "Bytes");
                    setLogoSrc(response.data.logo);
                })
                .catch(error => {
                    console.error("Fehler beim Laden des Base64-Logos:", error);
                });
        }
    }, [logoLoadFailed, organization]);

    // ✅ MEMORY FIX: Cleanup für alle Timeout-Refs beim Unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (roleSubMenuTimeoutRef.current) {
                clearTimeout(roleSubMenuTimeoutRef.current);
            }
            if (branchSubMenuTimeoutRef.current) {
                clearTimeout(branchSubMenuTimeoutRef.current);
            }
        };
    }, []);

    // Hilfsfunktion: Prüft, ob eine Rolle für eine Branch verfügbar ist
    const isRoleAvailableForBranch = (role: any, branchId: number | null): boolean => {
        if (!branchId) return true; // Wenn keine Branch aktiv, zeige alle Rollen
        if (role.allBranches === true) return true;
        if (role.allBranches === false && role.branches) {
            return role.branches.some((rb: any) => rb.branch?.id === branchId);
        }
        // Fallback: Wenn Information nicht vorhanden, zeige Rolle (für Rückwärtskompatibilität)
        return true;
    };

    // Hilfsfunktion: Prüft, ob eine Branch für eine Rolle verfügbar ist
    const isBranchAvailableForRole = (branch: any, roleId: number | null): boolean => {
        if (!roleId) return true; // Wenn keine Rolle aktiv, zeige alle Branches
        const role = user?.roles.find(r => r.role?.id === roleId)?.role;
        if (!role) return true;
        if (role.allBranches === true) return true;
        if (role.allBranches === false && role.branches) {
            return role.branches.some((rb: any) => rb.branch?.id === branch.id);
        }
        // Fallback: Wenn Information nicht vorhanden, zeige Branch (für Rückwärtskompatibilität)
        return true;
    };

    // Gefilterte Rollen (nur für aktive Branch verfügbare)
    const availableRoles = user?.roles.filter(userRole => 
        isRoleAvailableForBranch(userRole.role, selectedBranch || null)
    ) || [];

    // Gefilterte Branches (nur für aktive Rolle verfügbare)
    const availableBranches = branches?.filter(branch => 
        isBranchAvailableForRole(branch, currentRole?.role.id || null)
    ) || [];

    // Aktueller Standort (Branch) ermitteln
    const currentBranch = branches?.find(branch => branch.id === selectedBranch);
    const branchName = currentBranch?.name || null;

    return (
        <header className="bg-white dark:bg-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center">
                        <img 
                            src={logoSrc}
                            alt="Intranet Logo" 
                            className="h-10 w-auto"
                            onLoad={(e) => {
                                logger.log("Logo wurde erfolgreich geladen:", e.currentTarget.src);
                                setLogoLoadFailed(false);
                            }}
                            onError={(e) => {
                                // Debug-Ausgabe
                                console.error("Fehler beim Laden des Logos:", e);
                                
                                // Wenn es das direkte Logo ist, versuche es über Base64
                                if (!logoLoadFailed) {
                                    logger.log("Setze logoLoadFailed auf true, um Base64-Version zu verwenden");
                                    setLogoLoadFailed(true);
                                } else {
                                    // Bei beiden Methoden fehlgeschlagen, zeige Fallback-Text
                                    logger.log("Auch Base64-Version fehlgeschlagen, verwende Fallback-Text");
                                    
                                    // Verstecke das Bild und zeige stattdessen den Fallback-Text
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    
                                    // Zeige den Fallback-Text an
                                    const parent = target.parentElement;
                                    if (parent) {
                                        const fallbackText = document.createElement('span');
                                        fallbackText.className = 'text-xl font-bold text-gray-800 dark:text-white';
                                        fallbackText.textContent = 'Intranet';
                                        parent.appendChild(fallbackText);
                                    }
                                }
                            }}
                        />
                    </div>

                    {/* HeaderMessage eingefügt zwischen Logo und Benachrichtigungen */}
                    <HeaderMessage />

                    {/* Rechte Seite: Benachrichtigungen und Profil */}
                    <div className="flex items-center gap-1.5">
                        {/* Benachrichtigungen */}
                        <div className="relative"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <NotificationBell />
                        </div>

                        {/* Profil Dropdown */}
                        <div className="relative"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <button
                                onClick={toggleProfileMenu}
                                className="flex flex-col items-start p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <div className="flex flex-col w-full">
                                    <div className="flex items-center space-x-2">
                                        <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                {user?.firstName?.[0]}{user?.lastName?.[0]}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {user?.firstName} {user?.lastName}
                                        </span>
                                    </div>
                                    {/* Anzeige der aktiven Rolle und des Standorts unter dem Benutzernamen */}
                                    {user && (
                                        <div className="w-full text-right -mt-1">
                                            <div className="flex flex-row items-center justify-end gap-1.5 pr-1">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {roleName}
                                                </span>
                                                {branchName && (
                                                    <>
                                                        <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                                            {branchName}
                                                    </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Profil Menü */}
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50"
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <Link
                                        to="/profile"
                                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                        onMouseEnter={handleOtherMenuItemsMouseEnter}
                                    >
                                        <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 ml-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                        </svg>
                                        {t('header.profile')}
                                    </Link>
                                    
                                    {/* Rollenauswahl Untermenü */}
                                    {user && availableRoles.length > 1 && (
                                        <div className="relative">
                                            <button
                                                data-onboarding="switch-role-menu"
                                                ref={roleMenuButtonRef}
                                                onClick={() => setIsRoleSubMenuOpen(!isRoleSubMenuOpen)}
                                                onMouseEnter={handleRoleMenuMouseEnter}
                                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center group"
                                            >
                                                <svg className="h-4 w-3 mr-1 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l-7 7 7 7" />
                                                </svg>
                                                <div className="flex items-center">
                                                    <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                    </svg>
                                                    <span>{t('header.switchRole')}</span>
                                                </div>
                                            </button>
                                            
                                            {/* Rollen-Untermenü */}
                                            {isRoleSubMenuOpen && (
                                                <>
                                                    {/* Unsichtbare "Brücke" zwischen Hauptmenü und Untermenü - verbreitert für bessere Navigation */}
                                                    <div 
                                                        className="absolute right-full top-0 w-8 h-full pointer-events-auto" 
                                                        style={{ marginRight: "-8px" }}
                                                        onMouseEnter={handleRoleSubMenuMouseEnter}
                                                    />
                                                    <div 
                                                        ref={roleSubMenuRef}
                                                        className="absolute right-full top-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 mr-1"
                                                        onMouseEnter={handleRoleSubMenuMouseEnter}
                                                        onMouseLeave={handleRoleSubMenuMouseLeave}
                                                    >
                                                        {availableRoles.length === 0 ? (
                                                            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                                {t('header.noRolesAvailable') || 'Keine Rollen für diese Branch verfügbar'}
                                                            </div>
                                                        ) : (
                                                            [...availableRoles]
                                                                .sort((a, b) => {
                                                                    // Sortiere nach Organisationsname, dann nach Rollenname
                                                                    const orgA = a.role.organization?.displayName || a.role.organization?.name || '';
                                                                    const orgB = b.role.organization?.displayName || b.role.organization?.name || '';
                                                                    if (orgA !== orgB) {
                                                                        return orgA.localeCompare(orgB);
                                                                    }
                                                                    return a.role.name.localeCompare(b.role.name);
                                                                })
                                                                .map((userRole) => (
                                                                <button
                                                                    key={userRole.role.id}
                                                                    onClick={() => handleRoleSwitch(userRole.role.id)}
                                                                    onMouseEnter={handleRoleSubMenuMouseEnter}
                                                                    className={`w-full text-left block px-4 py-2 text-sm ${
                                                                        userRole.lastUsed
                                                                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">{userRole.role.name}</span>
                                                                        {userRole.role.organization && (
                                                                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                                                {userRole.role.organization.displayName || userRole.role.organization.name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                                ))
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Standortauswahl Untermenü */}
                                    {availableBranches && availableBranches.length > 0 && (
                                        <div className="relative">
                                            <button
                                                ref={branchMenuButtonRef}
                                                onClick={() => setIsBranchSubMenuOpen(!isBranchSubMenuOpen)}
                                                onMouseEnter={handleBranchMenuMouseEnter}
                                                className="w-full text-left block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center group"
                                            >
                                                <svg className="h-4 w-3 mr-1 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l-7 7 7 7" />
                                                </svg>
                                                <div className="flex items-center">
                                                    <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span>{t('header.switchBranch')}</span>
                                                </div>
                                            </button>
                                            
                                            {/* Standort-Untermenü */}
                                            {isBranchSubMenuOpen && (
                                                <>
                                                    {/* Unsichtbare "Brücke" zwischen Hauptmenü und Untermenü - verbreitert für bessere Navigation */}
                                                    <div 
                                                        className="absolute right-full top-0 w-8 h-full pointer-events-auto" 
                                                        style={{ marginRight: "-8px" }}
                                                        onMouseEnter={handleBranchSubMenuMouseEnter}
                                                    />
                                                    <div 
                                                        ref={branchSubMenuRef}
                                                        className="absolute right-full top-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 mr-1"
                                                        onMouseEnter={handleBranchSubMenuMouseEnter}
                                                        onMouseLeave={handleBranchSubMenuMouseLeave}
                                                    >
                                                        {availableBranches.length === 0 ? (
                                                            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                                                                {t('header.noBranchesAvailable') || 'Keine Branches für diese Rolle verfügbar'}
                                                            </div>
                                                        ) : (
                                                            [...availableBranches]
                                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                                .map((branch) => (
                                                                <button
                                                                    key={branch.id}
                                                                    onClick={() => handleBranchSwitch(branch.id)}
                                                                    onMouseEnter={handleBranchSubMenuMouseEnter}
                                                                    className={`w-full text-left block px-4 py-2 text-sm ${
                                                                        selectedBranch === branch.id
                                                                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                                >
                                                                    {branch.name}
                                                                </button>
                                                                ))
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                                        onMouseEnter={handleOtherMenuItemsMouseEnter}
                                    >
                                        <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400 ml-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                                        </svg>
                                        {t('header.logout')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

// ✅ PERFORMANCE: React.memo() verhindert unnötige Re-Renders bei Seitenwechseln
export default React.memo(Header); 