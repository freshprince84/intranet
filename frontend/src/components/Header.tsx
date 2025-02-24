import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="bg-white shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    {/* Logo/Titel */}
                    <div className="flex items-center">
                        <img 
                            src="/logo.png" 
                            alt="Intranet Logo" 
                            className="h-8 w-auto mr-2"
                        />
                        <span className="text-xl font-semibold text-gray-800">
                            Intranet
                        </span>
                    </div>

                    {/* Rechte Seite: Benachrichtigungen und Profil */}
                    <div className="flex items-center space-x-4">
                        {/* Benachrichtigungen */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className="p-2 rounded-full hover:bg-gray-100"
                            >
                                <svg className="h-6 w-6 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                                </svg>
                                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400"></span>
                            </button>

                            {/* Benachrichtigungen Dropdown */}
                            {isNotificationOpen && (
                                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-50">
                                    <div className="px-4 py-2 border-b">
                                        <p className="text-sm font-medium text-gray-700">Benachrichtigungen</p>
                                    </div>
                                    {/* Beispiel Benachrichtigungen */}
                                    <div className="max-h-64 overflow-y-auto">
                                        <a href="#" className="block px-4 py-2 hover:bg-gray-100">
                                            <p className="text-sm text-gray-700">Neue Aufgabe wurde zugewiesen</p>
                                            <p className="text-xs text-gray-500">Vor 2 Stunden</p>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profil Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100"
                            >
                                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-700">
                                        {user?.first_name?.[0]}{user?.last_name?.[0]}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                    {user?.first_name} {user?.last_name}
                                </span>
                            </button>

                            {/* Profil Menü */}
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                                    <a href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Profil
                                    </a>
                                    <a href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        Einstellungen
                                    </a>
                                    <button
                                        onClick={handleLogout}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                    >
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