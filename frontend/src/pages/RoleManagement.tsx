import React, { useState } from 'react';
import { usePermissions } from '../hooks/usePermissions.ts';
import RoleManagementTab from '../components/RoleManagementTab.tsx';

const RoleManagement: React.FC = () => {
    const { hasPermission, loading } = usePermissions();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (loading) {
        return <div className="p-4">Lade Berechtigungen...</div>;
    }

    if (!hasPermission('roles', 'read')) {
        return <div className="p-4 text-red-500">Sie haben keine Berechtigung, diese Seite anzuzeigen.</div>;
    }

    const canWriteRoles = hasPermission('roles', 'write') || hasPermission('roles', 'both');

    const handleError = (error: string) => {
        setErrorMessage(error);
        // Optional: Automatisches Ausblenden nach einigen Sekunden
        setTimeout(() => setErrorMessage(null), 5000);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-6">
            <h1 className="text-2xl font-bold mb-6 dark:text-white">Rollenverwaltung</h1>
            
            {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorMessage}
                </div>
            )}
            
            <RoleManagementTab onError={handleError} readOnly={!canWriteRoles} />
        </div>
    );
};

export default RoleManagement; 