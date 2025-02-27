import { useState, useEffect } from 'react';
import { Role, Permission, AccessLevel } from '../types/interfaces';
import { useAuth } from './useAuth.tsx';

export const usePermissions = () => {
    const { user } = useAuth();
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPermissions();
    }, [user]);

    const loadPermissions = () => {
        try {
            if (!user || !user.roles || user.roles.length === 0) {
                setCurrentRole(null);
                setPermissions([]);
                setLoading(false);
                return;
            }

            // Finde die aktive Rolle (lastUsed = true)
            const activeRole = user.roles.find(userRole => userRole.lastUsed);
            
            if (!activeRole) {
                setError('Keine aktive Rolle gefunden');
                setLoading(false);
                return;
            }

            setCurrentRole(activeRole.role);
            setPermissions(activeRole.role.permissions);
            setError(null);
        } catch (err) {
            console.error('Fehler beim Laden der Berechtigungen:', err);
            setError('Fehler beim Laden der Berechtigungen');
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (page: string, requiredLevel: AccessLevel = 'read'): boolean => {
        if (!permissions || permissions.length === 0) return false;
        
        const permission = permissions.find(p => p.page === page);
        if (!permission) return false;

        switch (requiredLevel) {
            case 'read':
                return ['read', 'write', 'both'].includes(permission.accessLevel);
            case 'write':
                return ['write', 'both'].includes(permission.accessLevel);
            case 'both':
                return permission.accessLevel === 'both';
            default:
                return false;
        }
    };

    const isAdmin = (): boolean => {
        return currentRole?.name.toLowerCase() === 'admin';
    };

    return {
        currentRole,
        permissions,
        loading,
        error,
        hasPermission,
        isAdmin
    };
};

export default usePermissions; 