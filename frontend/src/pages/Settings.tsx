import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';
import { Cog6ToothIcon, BellIcon, UserCircleIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import NotificationSettingsComponent from '../components/NotificationSettings.tsx';
import { API_URL } from '../config/api.ts';
import { useMessage } from '../hooks/useMessage.ts';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const { isAdmin } = usePermissions();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const { showMessage } = useMessage();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Tab-Zustand für Navigation zwischen den Einstellungen
    const [activeTab, setActiveTab] = useState<'personal' | 'notifications' | 'system'>('personal');

    // Debug-Ausgaben
    useEffect(() => {
        console.log('User:', user);
        console.log('Is Admin:', isAdmin());
        console.log('User Roles:', user?.roles);
    }, [user, isAdmin]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
                setError('Bitte nur PNG oder JPEG Dateien hochladen.');
                showMessage('Bitte nur PNG oder JPEG Dateien hochladen.', 'error');
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                setError('Die Datei ist zu groß (maximal 5MB erlaubt).');
                showMessage('Die Datei ist zu groß (maximal 5MB erlaubt).', 'error');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
            
            // Automatisch nach Auswahl hochladen
            uploadFile(file);
        }
    };
    
    // Separate uploadFile Funktion für bessere Übersichtlichkeit
    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('logo', file);

        try {
            console.log('Starting upload...');
            console.log('Selected file:', file);
            const token = localStorage.getItem('token');
            console.log('Token verfügbar:', !!token);

            // Headers für die Authentifizierung, aber kein Content-Type
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/settings/logo`, {
                method: 'POST',
                body: formData,
                headers
                // 'credentials: include' entfernt, um CORS-Probleme zu vermeiden
            });

            console.log('Response Status:', response.status);
            const responseText = await response.text();
            console.log('Response Text:', responseText);

            if (!response.ok) {
                throw new Error(responseText || 'Upload fehlgeschlagen');
            }

            try {
                const responseData = JSON.parse(responseText);
                console.log('Response Data:', responseData);
                showMessage('Logo erfolgreich hochgeladen', 'success');
                
                // Favicon nach Upload aktualisieren
                const faviconLink = document.getElementById('favicon') as HTMLLinkElement;
                if (faviconLink) {
                    // Füge einen Zeitstempel hinzu, um das Caching zu verhindern
                    const timestamp = new Date().getTime();
                    try {
                        const base64Response = await fetch(`${API_URL}/settings/logo/base64`);
                        if (base64Response.ok) {
                            const data = await base64Response.json();
                            faviconLink.href = data.logo;
                        }
                    } catch (error) {
                        console.error('Favicon konnte nicht aktualisiert werden:', error);
                    }
                }
            } catch (parseError) {
                console.error('Fehler beim Parsen der Antwort:', parseError);
                throw new Error('Ungültiges Antwortformat vom Server');
            }
            
            // Preview zurücksetzen
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (err) {
            console.error('Upload error:', err);
            const errorMessage = 'Fehler beim Upload: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler');
            setError(errorMessage);
            showMessage(errorMessage, 'error');
        } finally {
            setIsUploading(false);
        }
    };

    // Tab-Wechsel Handler - Fehler beim Wechsel zurücksetzen
    const handleTabChange = (tab: 'personal' | 'notifications' | 'system') => {
        setActiveTab(tab);
        setError(null);
    };

    // Wenn kein Benutzer oder Berechtigungen geladen werden
    if (!user) {
        return <div>Laden...</div>;
    }

    return (
        <div className="p-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
                {/* Header mit Icon */}
                <div className="flex items-center mb-6">
                    <Cog6ToothIcon className="h-6 w-6 mr-2" />
                    <h2 className="text-xl font-semibold">Einstellungen</h2>
                </div>
                
                {/* Tabs für Navigation */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            className={`${
                                activeTab === 'personal'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            onClick={() => handleTabChange('personal')}
                        >
                            <UserCircleIcon className="h-4 w-4 mr-2" />
                            Persönlich
                        </button>
                        <button
                            className={`${
                                activeTab === 'notifications'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            onClick={() => handleTabChange('notifications')}
                        >
                            <BellIcon className="h-4 w-4 mr-2" />
                            Benachrichtigungen
                        </button>
                        <button
                            className={`${
                                activeTab === 'system'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                            onClick={() => handleTabChange('system')}
                        >
                            <ComputerDesktopIcon className="h-4 w-4 mr-2" />
                            System
                        </button>
                    </nav>
                </div>

                {/* Tab-Inhalte */}
                {activeTab === 'personal' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium dark:text-white">Dark Mode</h3>
                                <p className="text-gray-600 dark:text-gray-400">Dunkles Erscheinungsbild aktivieren</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={isDarkMode}
                                    onChange={toggleDarkMode}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                )}

                {activeTab === 'notifications' && (
                    <div className="space-y-4">
                        <div className="p-0 -mt-4">
                            <NotificationSettingsComponent />
                        </div>
                    </div>
                )}

                {activeTab === 'system' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-medium mb-2 dark:text-white">Logo hochladen</h3>
                                <p className="text-gray-600 dark:text-gray-400">Laden Sie ein Logo für Ihr Unternehmen hoch</p>
                            </div>
                            <div>
                                <div className="group relative">
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        onChange={handleFileSelect}
                                        className={`block text-sm text-gray-500 dark:text-gray-400
                                            file:mr-4 file:py-2 file:px-4
                                            file:rounded-full file:border-0
                                            file:text-sm file:font-semibold
                                            file:bg-blue-50 file:text-blue-700
                                            dark:file:bg-blue-900 dark:file:text-blue-300
                                            hover:file:bg-blue-100 dark:hover:file:bg-blue-800
                                            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={isUploading}
                                    />
                                    <div className="absolute left-0 bottom-[calc(100%+0.5rem)] px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-normal max-w-xs pointer-events-none z-50">
                                        <p>Erlaubte Dateitypen: PNG, JPEG</p>
                                        <p>Maximale Dateigröße: 5MB</p>
                                    </div>
                                </div>
                                {isUploading && (
                                    <div className="text-blue-600 dark:text-blue-400 text-sm">
                                        Wird hochgeladen...
                                    </div>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-600 dark:text-red-400 text-sm mt-2">
                                {error}
                            </div>
                        )}

                        {previewUrl && (
                            <div className="mt-4">
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Vorschau:</p>
                                <img
                                    src={previewUrl}
                                    alt="Logo Vorschau"
                                    className="max-w-xs h-auto rounded-lg shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings; 