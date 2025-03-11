import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useSidebar } from '../contexts/SidebarContext.tsx';
import { 
    UserGroupIcon, 
    ClipboardDocumentListIcon, 
    HomeIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon,
    CogIcon,
    UserCircleIcon,
    BookOpenIcon,
    UsersIcon,
    CurrencyDollarIcon,
    EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';

// Definiere die möglichen Seitenbezeichnungen
type PageName = 'dashboard' | 'worktracker' | 'team_worktime_control' | 'usermanagement' | 'settings' | 'profile' | 'cerebro' | 'payroll';

// Definiere die Struktur für die Menüelemente
interface MenuItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    page: PageName;
    group?: 'main' | 'management' | 'settings'; // Gruppierung für Trennstriche
}

// Definiere, welche Seiten immer sichtbar sein sollen (ohne Berechtigungsprüfung)
const alwaysVisiblePages: PageName[] = ['dashboard', 'settings'];

const Sidebar: React.FC = () => {
    const { hasPermission } = usePermissions();
    const { isCollapsed, toggleCollapsed } = useSidebar();
    const [position, setPosition] = useState<'left' | 'right'>('left');
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile Erkennung
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const [visibleItemCount, setVisibleItemCount] = useState(5); // Anzahl der anzuzeigenden Elemente auf Mobilgeräten

    // Überwache Bildschirmgröße für responsives Verhalten
    useEffect(() => {
        const handleResize = () => {
            const isMobileView = window.innerWidth < 768;
            setIsMobile(isMobileView);
            // Basierend auf der Bildschirmbreite bestimmen, wie viele Elemente sichtbar sein sollen
            if (isMobileView) {
                if (window.innerWidth < 360) {
                    setVisibleItemCount(3);
                } else if (window.innerWidth < 480) {
                    setVisibleItemCount(4);
                } else {
                    setVisibleItemCount(5);
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial ausführen
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Schließe das Mehr-Menü, wenn außerhalb geklickt wird
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const togglePosition = () => {
        setPosition(prev => prev === 'left' ? 'right' : 'left');
    };

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    // Definiere alle potenziellen Menüelemente
    const baseMenuItems: MenuItem[] = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: <HomeIcon className="h-6 w-6" />,
            page: 'dashboard',
            group: 'main'
        },
        {
            name: 'Worktracker',
            path: '/worktracker',
            icon: <ClipboardDocumentListIcon className="h-6 w-6" />,
            page: 'worktracker',
            group: 'main'
        },
        {
            name: 'Workcenter', // Umbenannt von "Team Worktime Control"
            path: '/team-worktime-control',
            icon: <UsersIcon className="h-6 w-6" />,
            page: 'team_worktime_control',
            group: 'main'
        },
        {
            name: 'Lohnabrechnung',
            path: '/payroll',
            icon: <CurrencyDollarIcon className="h-6 w-6" />,
            page: 'payroll',
            group: 'main'
        },
        {
            name: 'Cerebro',
            path: '/cerebro',
            icon: <BookOpenIcon className="h-6 w-6" />,
            page: 'cerebro',
            group: 'main'
        },
        {
            name: 'Benutzerverwaltung',
            path: '/users',
            icon: <UserGroupIcon className="h-6 w-6" />,
            page: 'usermanagement',
            group: 'management'
        }
    ];

    // Einstellungs-Element separat definieren
    const settingsItem: MenuItem = {
        name: 'Einstellungen',
        path: '/settings',
        icon: <CogIcon className="h-6 w-6" />,
        page: 'settings',
        group: 'settings'
    };

    // Filtere die Menüelemente basierend auf Berechtigungen und den immer sichtbaren Seiten
    const authorizedMenuItems = [
        ...baseMenuItems.filter(item => 
            alwaysVisiblePages.includes(item.page) || hasPermission(item.page)
        ),
        // Settings ist jetzt immer sichtbar (Teil von alwaysVisiblePages)
        settingsItem
    ];

    // Gruppiere die Menüelemente nach ihren Gruppen
    const groupedMenuItems = {
        main: authorizedMenuItems.filter(item => item.group === 'main'),
        management: authorizedMenuItems.filter(item => item.group === 'management'),
        settings: authorizedMenuItems.filter(item => item.group === 'settings')
    };

    // Für mobile Geräte rendern wir einen Footer
    if (isMobile) {
        // Bereite Menüelemente für mobile Ansicht vor
        const visibleItems = authorizedMenuItems.slice(0, visibleItemCount - 1); // -1 für das Mehr-Menü
        const hiddenItems = authorizedMenuItems.slice(visibleItemCount - 1);

        return (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 z-10">
                <nav className="flex justify-around items-center h-16">
                    {visibleItems.map((item) => (
                        <Link 
                            key={item.path}
                            to={item.path} 
                            className={`flex flex-col items-center justify-center px-2 py-1 text-xs ${
                                isActive(item.path) ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                        >
                            <div className="h-6 w-6 mb-1">{item.icon}</div>
                            <span>{item.name}</span>
                        </Link>
                    ))}
                    
                    {hiddenItems.length > 0 && (
                        <div className="relative" ref={moreMenuRef}>
                            <button
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className={`flex flex-col items-center justify-center px-2 py-1 text-xs ${
                                    showMoreMenu ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                }`}
                            >
                                <div className="h-6 w-6 mb-1">
                                    <EllipsisHorizontalIcon className="h-6 w-6" />
                                </div>
                                <span>Mehr</span>
                            </button>
                            
                            {showMoreMenu && (
                                <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden z-20 w-48">
                                    {hiddenItems.map((item) => (
                                        <Link 
                                            key={item.path}
                                            to={item.path} 
                                            className={`flex items-center px-4 py-3 text-sm ${
                                                isActive(item.path) ? 'text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
                                            }`}
                                            onClick={() => setShowMoreMenu(false)}
                                        >
                                            <div className="h-5 w-5 mr-3">{item.icon}</div>
                                            <span>{item.name}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </nav>
            </div>
        );
    }

    // Für Desktop-Geräte bleibt die Seitenleiste, aber mit Trennstrichen
    return (
        <aside className={`hidden md:block border-gray-200 ${position === 'left' ? 'border-r' : 'border-l'} relative transition-all duration-300`}>
            <nav className={`${isCollapsed ? 'w-12' : 'w-56'} transition-all duration-300 h-full flex flex-col`}>
                <div className={`${isCollapsed ? 'px-2' : 'px-3 pr-2'} py-4 flex-1 flex flex-col`}>
                    <div className="flex justify-end mb-8">
                        <button
                            onClick={toggleCollapsed}
                            className="text-gray-600 hover:text-gray-900"
                            title={isCollapsed ? "Erweitern" : "Einklappen"}
                        >
                            {isCollapsed ? 
                                <ArrowRightIcon className="h-6 w-6" /> :
                                <ArrowLeftIcon className="h-6 w-6" />
                            }
                        </button>
                    </div>
                    <ul className="space-y-6 flex-1 flex flex-col">
                        {/* Hauptmenüelemente (Group: main) */}
                        {groupedMenuItems.main.map((item) => (
                            <li key={item.path}>
                                <Link 
                                    to={item.path} 
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive(item.path) ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {item.icon}
                                    {!isCollapsed && <span>{item.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                            {item.name}
                                        </div>
                                    )}
                                </Link>
                            </li>
                        ))}
                        
                        {/* Trennstrich nach Hauptgruppe */}
                        {groupedMenuItems.management.length > 0 && (
                            <li className="border-t border-gray-200 dark:border-gray-700 pt-2"></li>
                        )}
                        
                        {/* Management-Menüelemente (Group: management) */}
                        {groupedMenuItems.management.map((item) => (
                            <li key={item.path}>
                                <Link 
                                    to={item.path} 
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive(item.path) ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {item.icon}
                                    {!isCollapsed && <span>{item.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                            {item.name}
                                        </div>
                                    )}
                                </Link>
                            </li>
                        ))}
                        
                        {/* Einstellungen-Element ganz unten mit eigenem Trennstrich */}
                        {groupedMenuItems.settings.length > 0 && (
                            <li className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                                <Link 
                                    to="/settings" 
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive('/settings') ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {settingsItem.icon}
                                    {!isCollapsed && <span>{settingsItem.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                            {settingsItem.name}
                                        </div>
                                    )}
                                </Link>
                            </li>
                        )}
                    </ul>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar; 