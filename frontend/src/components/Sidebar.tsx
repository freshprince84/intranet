import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions.ts';
import { UserGroupIcon, ClipboardDocumentListIcon, HomeIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
    const { isAdmin } = usePermissions();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [position, setPosition] = useState<'left' | 'right'>('left');

    const togglePosition = () => {
        setPosition(prev => prev === 'left' ? 'right' : 'left');
    };

    return (
        <aside className={`border-gray-200 ${position === 'left' ? 'border-r' : 'border-l'} relative transition-all duration-300`}>
            <nav className={`${isCollapsed ? 'w-14' : 'w-56'} transition-all duration-300`}>
                <div className={`${isCollapsed ? 'px-3' : 'px-4'} py-4`}>
                    <div className="flex justify-end mb-8">
                        <button
                            onClick={() => setIsCollapsed(!isCollapsed)}
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
                        <li>
                            <Link 
                                to="/dashboard" 
                                className="text-gray-600 hover:text-gray-900 flex items-center gap-3 text-lg group relative"
                            >
                                <HomeIcon className="h-6 w-6" />
                                {!isCollapsed && <span>Dashboard</span>}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                        Dashboard
                                    </div>
                                )}
                            </Link>
                        </li>
                        <li>
                            <Link 
                                to="/worktracker"
                                className="text-gray-600 hover:text-gray-900 flex items-center gap-3 text-lg group relative"
                            >
                                <ClipboardDocumentListIcon className="h-6 w-6" />
                                {!isCollapsed && <span>Worktracker</span>}
                                {isCollapsed && (
                                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                        Worktracker
                                    </div>
                                )}
                            </Link>
                        </li>
                        {isAdmin() && (
                            <li>
                                <Link 
                                    to="/roles" 
                                    className="text-gray-600 hover:text-gray-900 flex items-center gap-3 text-lg group relative"
                                >
                                    <UserGroupIcon className="h-6 w-6" />
                                    {!isCollapsed && <span>Rollenverwaltung</span>}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                            Rollenverwaltung
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