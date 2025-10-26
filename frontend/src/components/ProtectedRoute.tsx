import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { AccessLevel } from '../types/interfaces.ts';

interface ProtectedRouteProps {
    children: React.ReactNode;
    entity?: string;
    accessLevel?: AccessLevel;
    entityType?: string;
    organizationRequired?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
    children, 
    entity, 
    accessLevel = 'read', 
    entityType = 'page',
    organizationRequired = false 
}) => {
    const { user } = useAuth();
    const { hasPermission, canViewOrganization, loading } = usePermissions();
    const location = useLocation();
    
    // Warten auf Berechtigungen
    if (loading) {
        return <div className="p-4 dark:text-gray-300">Laden...</div>;
    }
    
    // Authentifizierung prüfen
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    
    // Organisationszugriff prüfen (falls erforderlich)
    if (organizationRequired && !canViewOrganization()) {
        return (
            <div className="p-4 text-red-600 dark:text-red-400">
                Kein Zugriff auf Organisationsfunktionen.
            </div>
        );
    }
    
    // Spezielle Berechtigungsprüfung (falls entity angegeben)
    if (entity && !hasPermission(entity, accessLevel, entityType)) {
        return (
            <div className="p-4 text-red-600 dark:text-red-400">
                Keine Berechtigung für diese Seite.
            </div>
        );
    }
    
    return <>{children}</>;
};

export default ProtectedRoute; 