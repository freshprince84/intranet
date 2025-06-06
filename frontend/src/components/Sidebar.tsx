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
    EllipsisVerticalIcon
} from '@heroicons/react/24/outline';

// Definiere die möglichen Seitenbezeichnungen
type PageName = 'dashboard' | 'worktracker' | 'consultations' | 'team_worktime_control' | 'usermanagement' | 'settings' | 'profile' | 'cerebro' | 'payroll';

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
    const [visibleItemCount, setVisibleItemCount] = useState(6); // Anzahl der anzuzeigenden Elemente auf Mobilgeräten

    // Überwache Bildschirmgröße für responsives Verhalten
    useEffect(() => {
        const handleResize = () => {
            const isMobileView = window.innerWidth < 768;
            setIsMobile(isMobileView);
            // Basierend auf der Bildschirmbreite bestimmen, wie viele Elemente sichtbar sein sollen
            if (isMobileView) {
                if (window.innerWidth < 360) {
                    setVisibleItemCount(4);
                } else if (window.innerWidth < 480) {
                    setVisibleItemCount(5);
                } else {
                    setVisibleItemCount(6);
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
            icon: <HomeIcon className="h-full w-full" />,
            page: 'dashboard',
            group: 'main'
        },
        {
            name: 'Worktracker',
            path: '/worktracker',
            icon: <ClipboardDocumentListIcon className="h-full w-full" />,
            page: 'worktracker',
            group: 'main'
        },
        {
            name: 'Beratungen',
            path: '/consultations',
            icon: <UserGroupIcon className="h-full w-full" />,
            page: 'consultations',
            group: 'main'
        },
        {
            name: 'Workcenter', // Umbenannt von "Team Worktime Control"
            path: '/team-worktime-control',
            icon: <UsersIcon className="h-full w-full" />,
            page: 'team_worktime_control',
            group: 'main'
        },
        {
            name: 'Lohnabrechnung',
            path: '/payroll',
            icon: <CurrencyDollarIcon className="h-full w-full" />,
            page: 'payroll',
            group: 'main'
        },
        {
            name: 'Cerebro',
            path: '/cerebro',
            icon: <img src="/images/brain.png" alt="Cerebro" className="h-full w-full" />,
            page: 'cerebro',
            group: 'main'
        },
        {
            name: 'Benutzerverwaltung',
            path: '/users',
            icon: <UserGroupIcon className="h-full w-full" />,
            page: 'usermanagement',
            group: 'management'
        }
    ];

    // Einstellungs-Element separat definieren
    const settingsItem: MenuItem = {
        name: 'Einstellungen',
        path: '/settings',
        icon: <CogIcon className="h-full w-full" />,
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
                <nav className="flex justify-between items-center h-16 px-4">
                    {visibleItems.map((item) => (
                        <Link 
                            key={item.path}
                            to={item.path} 
                            className={`flex flex-col items-center justify-center px-0.5 py-1 text-[10px] ${
                                isActive(item.path) ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                        >
                            <div className="h-[26px] w-[26px] mb-0.5">{item.icon}</div>
                            {/* Text nur auf größeren Mobilgeräten (>=480px) und Tablets anzeigen */}
                            <span className="mt-0.5 footer-icon-text">{item.name}</span>
                        </Link>
                    ))}
                    
                    {hiddenItems.length > 0 && (
                        <div className="relative" ref={moreMenuRef}>
                            <button
                                onClick={() => setShowMoreMenu(!showMoreMenu)}
                                className={`flex flex-col items-center justify-center px-0.5 py-1 text-[10px] ${
                                    showMoreMenu ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                }`}
                                aria-label="Mehr Optionen anzeigen"
                            >
                                <div className="h-[26px] w-[26px] mb-0.5">
                                    <EllipsisVerticalIcon className="h-[26px] w-[26px]" />
                                </div>
                                {/* Text nur auf größeren Mobilgeräten (>=480px) und Tablets anzeigen */}
                                <span className="mt-0.5 footer-icon-text">Mehr</span>
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
                                            <div className="h-6 w-6 mr-3">{item.icon}</div>
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
        <aside className={`hidden md:block border-gray-200 dark:border-gray-700 ${position === 'left' ? 'border-r' : 'border-l'} relative transition-all duration-300`}>
            <nav className={`${isCollapsed ? 'w-12' : 'w-56'} transition-all duration-300 h-full flex flex-col`}>
                <div className={`${isCollapsed ? 'px-2' : 'px-3 pr-2'} py-4 flex-1 flex flex-col`}>
                    <div className="flex justify-end mb-8">
                        <button
                            onClick={toggleCollapsed}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
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
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive(item.path) ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'}`}
                                >
                                    <div className="h-6 w-6">{item.icon}</div>
                                    {!isCollapsed && <span>{item.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
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
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive(item.path) ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'}`}
                                >
                                    <div className="h-6 w-6">{item.icon}</div>
                                    {!isCollapsed && <span>{item.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
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
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive('/settings') ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300'}`}
                                >
                                    <div className="h-6 w-6">{settingsItem.icon}</div>
                                    {!isCollapsed && <span>{settingsItem.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
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