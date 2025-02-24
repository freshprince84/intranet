import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { UserGroupIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
    const { user } = useAuth();
    const { isAdmin } = usePermissions();

    return (
        <div className="bg-gray-800 text-white w-64 min-h-screen p-4">
            <div className="mb-8">
                <h2 className="text-2xl font-bold">Intranet</h2>
            </div>
            
            <nav>
                <ul className="space-y-2">
                    <li>
                        <Link 
                            to="/dashboard" 
                            className="block px-4 py-2 rounded hover:bg-gray-700"
                        >
                            Dashboard
                        </Link>
                    </li>
                    {user && (
                        <>
                            <li>
                                <Link 
                                    to="/worktracker" 
                                    className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700"
                                >
                                    <ClipboardDocumentListIcon className="h-5 w-5" />
                                    <span>Worktracker</span>
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/profile" 
                                    className="block px-4 py-2 rounded hover:bg-gray-700"
                                >
                                    Profil
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    to="/settings" 
                                    className="block px-4 py-2 rounded hover:bg-gray-700"
                                >
                                    Einstellungen
                                </Link>
                            </li>
                        </>
                    )}
                    {isAdmin() && (
                        <li>
                            <Link
                                to="/roles"
                                className="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-700"
                            >
                                <UserGroupIcon className="h-5 w-5" />
                                <span>Rollenverwaltung</span>
                            </Link>
                        </li>
                    )}
                </ul>
            </nav>
            
            {user && (
                <div className="absolute bottom-0 left-0 w-64 p-4 bg-gray-800">
                    <div className="text-sm">
                        <p>Eingeloggt als:</p>
                        <p className="font-bold">{user.email}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar; 