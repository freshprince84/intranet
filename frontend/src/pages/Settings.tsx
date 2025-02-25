import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

const Settings: React.FC = () => {
    const { user } = useAuth();
    const { isAdmin } = usePermissions();
    const { isDarkMode, toggleDarkMode } = useTheme();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notifications, setNotifications] = useState(false);

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
                return;
            }
            if (file.size > 5 * 1024 * 1024) { // 5MB
                setError('Die Datei ist zu groß (maximal 5MB erlaubt).');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('logo', selectedFile);

        try {
            console.log('Starting upload...');
            console.log('Selected file:', selectedFile);
            const token = localStorage.getItem('token');
            console.log('Token verfügbar:', !!token);

            // Headers für die Authentifizierung, aber kein Content-Type
            const headers: HeadersInit = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('http://localhost:5000/api/settings/logo', {
                method: 'POST',
                body: formData,
                headers,
                credentials: 'include'
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
                alert('Logo erfolgreich hochgeladen');
            } catch (parseError) {
                console.error('Fehler beim Parsen der Antwort:', parseError);
                throw new Error('Ungültiges Antwortformat vom Server');
            }
            
            // Preview zurücksetzen
            setSelectedFile(null);
            setPreviewUrl(null);
        } catch (err) {
            console.error('Upload error:', err);
            setError('Fehler beim Upload: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleNotificationsToggle = () => {
        setNotifications(!notifications);
        // TODO: Implementiere Benachrichtigungslogik
    };

    // Wenn kein Benutzer oder Berechtigungen geladen werden
    if (!user) {
        return <div>Laden...</div>;
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">Einstellungen</h1>
            
            {/* Persönliche Einstellungen - für alle Benutzer sichtbar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Persönliche Einstellungen</h2>
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium dark:text-white">Benachrichtigungen</h3>
                            <p className="text-gray-600 dark:text-gray-400">E-Mail-Benachrichtigungen aktivieren</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={notifications}
                                onChange={handleNotificationsToggle}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Allgemeine Einstellungen - temporär für alle sichtbar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 dark:text-white">Logo Upload</h2>
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <input
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-gray-500 dark:text-gray-400
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                dark:file:bg-blue-900 dark:file:text-blue-300
                                hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
                        />
                        <button
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading}
                            className={`px-4 py-2 rounded-md text-white font-medium
                                ${!selectedFile || isUploading
                                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800'}`}
                        >
                            {isUploading ? 'Wird hochgeladen...' : 'Hochladen'}
                        </button>
                    </div>

                    {error && (
                        <div className="text-red-600 dark:text-red-400 text-sm">
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

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Erlaubte Dateitypen: PNG, JPEG</p>
                        <p>Maximale Dateigröße: 5MB</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings; 