import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './useAuth.tsx';

export type AccessLevel = 'read' | 'write' | 'both' | 'none';

export interface Permission {
    id: number;
    page: string;
    accessLevel: AccessLevel;
}

export interface Role {
    id: number;
    name: string;
    description: string | null;
    permissions: Permission[];
}

export const usePermissions = () => {
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        const fetchPermissions = async () => {
            if (!user) {
                setPermissions([]);
                setCurrentRole(null);
                setLoading(false);
                return;
            }

            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('Nicht authentifiziert');

                // Hole die Rollen direkt vom User-Objekt
                if (user.roles && user.roles.length > 0) {
                    const adminRole = user.roles.find(role => role.name === 'admin');
                    if (adminRole) {
                        setCurrentRole(adminRole);
                        // Wenn Admin, gebe volle Berechtigungen
                        setPermissions([
                            { id: 1, page: 'dashboard', accessLevel: 'both' },
                            { id: 2, page: 'settings', accessLevel: 'both' },
                            { id: 3, page: 'roles', accessLevel: 'both' },
                            { id: 4, page: 'requests', accessLevel: 'both' },
                            { id: 5, page: 'tasks', accessLevel: 'both' }
                        ]);
                    }
                }
                setError(null);
            } catch (err) {
                console.error('Fehler beim Laden der Berechtigungen:', err);
                setError('Fehler beim Laden der Berechtigungen');
                setPermissions([]);
                setCurrentRole(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [user]);

    const hasPermission = (page: string, requiredAccess: AccessLevel = 'read'): boolean => {
        // Wenn keine Berechtigungen vorhanden sind, verweigere Zugriff
        if (!permissions.length) return false;

        // Suche die Berechtigung für die angegebene Seite
        const permission = permissions.find(p => p.page === page);
        if (!permission) return false;

        // Prüfe die Zugriffsebene
        switch (permission.accessLevel) {
            case 'none':
                return false;
            case 'both':
                return true;
            case 'read':
                return requiredAccess === 'read';
            case 'write':
                return requiredAccess === 'write';
            default:
                return false;
        }
    };

    const isAdmin = (): boolean => {
        return user?.roles?.some(role => role.name === 'admin') ?? false;
    };

    return {
        permissions,
        currentRole,
        loading,
        error,
        hasPermission,
        isAdmin
    };
}; 