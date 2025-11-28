import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.tsx';
import { usePermissions } from '../hooks/usePermissions.ts';
import { AccessLevel } from '../types/interfaces.ts';
import LoadingScreen from './LoadingScreen.tsx';

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
    const { user, isLoading } = useAuth();
    const { hasPermission, canViewOrganization, isProfileComplete, loading } = usePermissions();
    const location = useLocation();
    
    // ✅ PERFORMANCE: Nur blockieren wenn User NICHT vorhanden (Sicherheit)
    // Layout wird sofort gerendert, auch wenn Daten noch laden
    if (!user && isLoading) {
        return <LoadingScreen />; // ✅ Nur bei fehlender Authentifizierung blockieren
    }
    
    // Authentifizierung prüfen (wichtig für Sicherheit)
    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }
    
    // ✅ PERFORMANCE: Berechtigungen werden asynchron geprüft (nicht blockierend)
    // Wenn Berechtigungen noch laden, rendere Seite trotzdem (Buttons werden deaktiviert)
    
    // Profilvollständigkeit prüfen (Ausnahme: Profil-Seite selbst)
    // WICHTIG: Nur prüfen, wenn User Mitglied einer Organisation ist
    // Vor Organisation-Beitritt: Keine Profil-Blockierung
    if (location.pathname !== '/profile' && !isProfileComplete()) {
        // Prüfe ob User Mitglied einer Organisation ist
        const hasOrganization = user.roles?.some((r: any) => r.role.organization !== null) || false;
        
        // Nur blockieren, wenn User Mitglied einer Organisation ist
        if (hasOrganization) {
            return (
                <Navigate 
                    to="/profile" 
                    replace 
                    state={{ 
                        from: location,
                        message: 'Bitte vervollständigen Sie zuerst Ihr Profil'
                    }} 
                />
            );
        }
    }
    
    // Organisationszugriff prüfen (falls erforderlich)
    if (organizationRequired && !canViewOrganization()) {
        return (
            <div className="p-4 text-red-600 dark:text-red-400">
                Kein Zugriff auf Organisationsfunktionen.
            </div>
        );
    }
    
    // ✅ PERFORMANCE: Spezielle Berechtigungsprüfung (falls entity angegeben)
    // Wenn Berechtigungen noch laden, rendere Seite trotzdem (Buttons werden deaktiviert)
    // Berechtigungen werden asynchron geprüft, Zugriff wird blockiert wenn keine Berechtigung
    if (entity && !loading && !hasPermission(entity, accessLevel, entityType)) {
        return (
            <div className="p-4 text-red-600 dark:text-red-400">
                Keine Berechtigung für diese Seite.
            </div>
        );
    }
    
    return <>{children}</>;
};

export default ProtectedRoute; 