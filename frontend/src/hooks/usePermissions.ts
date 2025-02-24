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

                const response = await axios.get('http://localhost:5000/api/users/current/role', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                setCurrentRole(response.data.role);
                setPermissions(response.data.role.permissions);
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
        if (!permissions.length) return false;

        const permission = permissions.find(p => p.page === page);
        if (!permission) return false;

        if (permission.accessLevel === 'none') return false;
        if (permission.accessLevel === 'both') return true;
        if (requiredAccess === 'both') return permission.accessLevel === 'both';
        return permission.accessLevel === requiredAccess || permission.accessLevel === 'both';
    };

    const isAdmin = (): boolean => {
        return currentRole?.name === 'admin';
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