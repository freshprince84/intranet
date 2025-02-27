import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useSidebar } from '../contexts/SidebarContext.tsx';
import { 
    UserGroupIcon, 
    ClipboardDocumentListIcon, 
    HomeIcon, 
    ArrowLeftIcon, 
    ArrowRightIcon,
    CogIcon
} from '@heroicons/react/24/outline';

// Definiere die möglichen Seitenbezeichnungen
type PageName = 'dashboard' | 'worktracker' | 'users' | 'roles' | 'settings';

// Definiere die Struktur für die Menüelemente
interface MenuItem {
    name: string;
    path: string;
    icon: React.ReactNode;
    page: PageName;
}

const Sidebar: React.FC = () => {
    const { hasPermission } = usePermissions();
    const { isCollapsed, toggleCollapsed } = useSidebar();
    const [position, setPosition] = useState<'left' | 'right'>('left');
    const location = useLocation();

    const togglePosition = () => {
        setPosition(prev => prev === 'left' ? 'right' : 'left');
    };

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    // Definiere alle potenziellen Menüelemente
    const menuItems: MenuItem[] = [
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
            page: 'users'
        },
        {
            name: 'Einstellungen',
            path: '/settings',
            icon: <CogIcon className="h-6 w-6" />,
            page: 'settings'
        }
    ];

    // Filtere die Menüelemente basierend auf Berechtigungen
    const authorizedMenuItems = menuItems.filter(item => hasPermission(item.page));

    return (
        <aside className={`border-gray-200 ${position === 'left' ? 'border-r' : 'border-l'} relative transition-all duration-300`}>
            <nav className={`${isCollapsed ? 'w-14' : 'w-60'} transition-all duration-300`}>
                <div className={`${isCollapsed ? 'px-3' : 'px-4 pr-2'} py-4`}>
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
                    <ul className="space-y-6">
                        {authorizedMenuItems.map((item) => (
                            <li key={item.path}>
                                <Link 
                                    to={item.path} 
                                    className={`flex items-center gap-3 text-base group relative ${isActive(item.path) ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
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
                    </ul>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar; 