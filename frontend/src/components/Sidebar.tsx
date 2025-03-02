import React, { useState, useEffect } from 'react';
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
    UserCircleIcon
} from '@heroicons/react/24/outline';

// Definiere die möglichen Seitenbezeichnungen
type PageName = 'dashboard' | 'worktracker' | 'usermanagement' | 'settings' | 'profile';

// Definiere die Struktur für die Menüelemente
interface MenuItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    page: PageName;
}

// Definiere, welche Seiten immer sichtbar sein sollen (ohne Berechtigungsprüfung)
const alwaysVisiblePages: PageName[] = ['dashboard', 'settings'];

const Sidebar: React.FC = () => {
    const { hasPermission } = usePermissions();
    const { isCollapsed, toggleCollapsed } = useSidebar();
    const [position, setPosition] = useState<'left' | 'right'>('left');
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile Erkennung

    // Überwache Bildschirmgröße für responsives Verhalten
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
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
            page: 'dashboard'
        },
        {
            name: 'Worktracker',
            path: '/worktracker',
            icon: <ClipboardDocumentListIcon className="h-6 w-6" />,
            page: 'worktracker'
        },
        {
            name: 'Benutzerverwaltung',
            path: '/users',
            icon: <UserGroupIcon className="h-6 w-6" />,
            page: 'usermanagement'
        }
    ];

    // Einstellungs-Element separat definieren
    const settingsItem: MenuItem = {
        name: 'Einstellungen',
        path: '/settings',
        icon: <CogIcon className="h-6 w-6" />,
        page: 'settings'
    };

    // Filtere die Menüelemente basierend auf Berechtigungen und den immer sichtbaren Seiten
    const authorizedMenuItems = [
        ...baseMenuItems.filter(item => 
            alwaysVisiblePages.includes(item.page) || hasPermission(item.page)
        ),
        // Settings ist jetzt immer sichtbar (Teil von alwaysVisiblePages)
        settingsItem
    ];

    // Separator für die Einstellungen ist auf Mobile nicht nötig
    const mainMenuItems = authorizedMenuItems.filter(item => item.page !== 'settings');
    const settingsMenuItem = authorizedMenuItems.find(item => item.page === 'settings');

    // Für mobile Geräte rendern wir einen Footer
    if (isMobile) {
        return (
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 z-10">
                <nav className="flex justify-around items-center h-16">
                    {mainMenuItems.map((item) => (
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
                    
                    {settingsMenuItem && (
                        <Link 
                            to="/settings" 
                            className={`flex flex-col items-center justify-center px-2 py-1 text-xs ${
                                isActive('/settings') ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                            }`}
                        >
                            <div className="h-6 w-6 mb-1">{settingsMenuItem.icon}</div>
                            <span>{settingsMenuItem.name}</span>
                        </Link>
                    )}
                </nav>
            </div>
        );
    }

    // Für Desktop-Geräte bleibt die Seitenleiste
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
                        {/* Hauptmenüelemente */}
                        {mainMenuItems.map((item) => (
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
                        
                        {/* Einstellungen-Element ganz unten */}
                        {settingsMenuItem && (
                            <li className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                                <Link 
                                    to="/settings" 
                                    className={`flex ${isCollapsed ? 'justify-center' : 'items-center'} gap-3 text-base group relative ${isActive('/settings') ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    {settingsMenuItem.icon}
                                    {!isCollapsed && <span>{settingsMenuItem.name}</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                            {settingsMenuItem.name}
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