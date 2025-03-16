import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { useBranch } from '../contexts/BranchContext.tsx';
import NotificationBell from './NotificationBell.tsx';
import { API_URL } from '../config/api.ts';
import axiosInstance from '../config/axios.ts';
import HeaderMessage from './HeaderMessage.tsx';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout, switchRole } = useAuth();
    const { branches, selectedBranch, setSelectedBranch } = useBranch();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isRoleSubMenuOpen, setIsRoleSubMenuOpen] = useState(false);
    const [isBranchSubMenuOpen, setIsBranchSubMenuOpen] = useState(false);
    const [logoSrc, setLogoSrc] = useState<string>('/settings/logo');
    const [logoLoadFailed, setLogoLoadFailed] = useState<boolean>(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const roleMenuButtonRef = useRef<HTMLButtonElement>(null);
    const roleSubMenuRef = useRef<HTMLDivElement>(null);
    const branchMenuButtonRef = useRef<HTMLButtonElement>(null);
    const branchSubMenuRef = useRef<HTMLDivElement>(null);

    // Versuche das Logo zu laden - erst direkt, dann über Base64 wenn nötig
    useEffect(() => {
        if (logoLoadFailed) {
            console.log("Versuche Logo über Base64-API zu laden...");
            axiosInstance.get('/settings/logo/base64')
                .then(response => {
                    console.log("Base64-Logo geladen, Größe:", response.data.size, "Bytes");
                    setLogoSrc(response.data.logo);
                })
                .catch(error => {
                    console.error("Fehler beim Laden des Base64-Logos:", error);
                });
        }
    }, [logoLoadFailed]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsProfileMenuOpen(false);
            setIsRoleSubMenuOpen(false);
            setIsNotificationOpen(false);
        }, 1000);
    };

    const handleMouseEnter = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    // Neues Event-Handling für das Hovern über den "Rolle wechseln"-Button
    const handleRoleMenuMouseEnter = () => {
        handleMouseEnter();
        setIsRoleSubMenuOpen(true);
        setIsBranchSubMenuOpen(false);
    };

    // Neues Event-Handling für das Hovern über den "Standort wechseln"-Button
    const handleBranchMenuMouseEnter = () => {
        handleMouseEnter();
        setIsBranchSubMenuOpen(true);
        setIsRoleSubMenuOpen(false);
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
            setIsRoleSubMenuOpen(false);
            setIsProfileMenuOpen(false);
        } catch (error) {
            console.error('Fehler beim Rollenwechsel:', error);
        }
    };

    const handleBranchSwitch = (branchId: number) => {
        try {
            setSelectedBranch(branchId);
            setIsBranchSubMenuOpen(false);
            setIsProfileMenuOpen(false);
        } catch (error) {
            console.error('Fehler beim Standortwechsel:', error);
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
                                console.log("Logo wurde erfolgreich geladen:", e.currentTarget.src);
                                setLogoLoadFailed(false);
                            }}
                            onError={(e) => {
                                // Debug-Ausgabe
                                console.error("Fehler beim Laden des Logos:", e);
                                
                                // Wenn es das direkte Logo ist, versuche es über Base64
                                if (!logoLoadFailed) {
                                    console.log("Setze logoLoadFailed auf true, um Base64-Version zu verwenden");
                                    setLogoLoadFailed(true);
                                } else {
                                    // Bei beiden Methoden fehlgeschlagen, zeige Fallback-Text
                                    console.log("Auch Base64-Version fehlgeschlagen, verwende Fallback-Text");
                                    
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
                    <div className="flex items-center space-x-4">
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
                                    {/* Anzeige der aktiven Rolle unter dem Benutzernamen */}
                                    {user && (
                                        <div className="w-full text-right -mt-1">
                                            <span className="text-xs text-gray-500 dark:text-gray-400 pr-1 inline-block">
                                                {roleName}
                                            </span>
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
                                        Profil
                                    </Link>
                                    
                                    {/* Rollenauswahl Untermenü */}
                                    {user && user.roles.length > 1 && (
                                        <div className="relative">
                                            <button
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
                                                    <span>Rolle wechseln</span>
                                                </div>
                                            </button>
                                            
                                            {/* Rollen-Untermenü */}
                                            {isRoleSubMenuOpen && (
                                                <>
                                                    {/* Unsichtbare "Brücke" zwischen Hauptmenü und Untermenü */}
                                                    <div 
                                                        className="absolute right-full top-0 w-2 h-full" 
                                                        style={{ marginRight: "-2px" }}
                                                        onMouseEnter={handleMouseEnter}
                                                    />
                                                    <div 
                                                        ref={roleSubMenuRef}
                                                        className="absolute right-full top-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 mr-1"
                                                        onMouseEnter={handleMouseEnter}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        {[...user.roles]
                                                            .sort((a, b) => a.role.name.localeCompare(b.role.name))
                                                            .map((userRole) => (
                                                                <button
                                                                    key={userRole.role.id}
                                                                    onClick={() => handleRoleSwitch(userRole.role.id)}
                                                                    className={`w-full text-left block px-4 py-2 text-sm ${
                                                                        userRole.lastUsed
                                                                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                                >
                                                                    {userRole.role.name}
                                                                </button>
                                                            ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Standortauswahl Untermenü */}
                                    {branches && branches.length > 0 && (
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
                                                    <span>Standort wechseln</span>
                                                </div>
                                            </button>
                                            
                                            {/* Standort-Untermenü */}
                                            {isBranchSubMenuOpen && (
                                                <>
                                                    {/* Unsichtbare "Brücke" zwischen Hauptmenü und Untermenü */}
                                                    <div 
                                                        className="absolute right-full top-0 w-2 h-full" 
                                                        style={{ marginRight: "-2px" }}
                                                        onMouseEnter={handleMouseEnter}
                                                    />
                                                    <div 
                                                        ref={branchSubMenuRef}
                                                        className="absolute right-full top-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 mr-1"
                                                        onMouseEnter={handleMouseEnter}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        {[...branches]
                                                            .sort((a, b) => a.name.localeCompare(b.name))
                                                            .map((branch) => (
                                                                <button
                                                                    key={branch.id}
                                                                    onClick={() => handleBranchSwitch(branch.id)}
                                                                    className={`w-full text-left block px-4 py-2 text-sm ${
                                                                        selectedBranch === branch.id
                                                                            ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
                                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                    }`}
                                                                >
                                                                    {branch.name}
                                                                </button>
                                                            ))}
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
                                        Abmelden
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

export default Header; 