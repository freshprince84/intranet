import { useState, useEffect } from 'react';
import { Role, Permission, AccessLevel } from '../types/interfaces';
import { useAuth } from './useAuth.tsx';

/**
 * WICHTIG: Berechtigungssystem
 * 
 * 1. Jeder Benutzer kann mehrere Rollen haben
 * 2. Eine dieser Rollen ist die "aktive" Rolle (lastUsed = true)
 * 3. Die aktive Rolle bestimmt die Berechtigungen des Benutzers
 * 4. Die Admin-Rolle hat immer die ID 1
 * 5. Berechtigungen werden anhand der entity (z.B. 'roles'), entityType ('page'/'table') 
 *    und accessLevel ('read'/'write'/'both'/'none') geprüft
 * 6. Bei Rollenwechsel im Topmenü werden die Berechtigungen neu geladen
 * 
 * Korrekte Berechtigungsprüfung:
 * - hasPermission('roles', 'read') für Lesezugriff auf Rollenseite
 * - hasPermission('roles', 'write') für Schreibzugriff auf Rollenseite
 * - hasPermission('roles', 'both') für vollen Zugriff auf Rollenseite
 * - hasPermission('roles', 'write', 'table') für Schreibzugriff auf Rollentabelle
 */

// Hilfsfunktion zur Typkonvertierung
function ensurePermissionFormat(permission: any): Permission {
    // Prüfen, ob es das neue Format mit entity und entityType hat
    if ('entity' in permission && 'entityType' in permission) {
        return permission as Permission;
    }

    // Prüfen, ob es das alte Format mit page hat
    if ('page' in permission) {
        return {
            entity: permission.page,
            entityType: 'page',
            accessLevel: permission.accessLevel
        };
    }

    // Fallback für unbekanntes Format
    return {
        entity: permission.entity || permission.page || '',
        entityType: permission.entityType || 'page',
        accessLevel: permission.accessLevel
    };
}

// Hilfsfunktion zur Typkonvertierung für Role
function ensureRoleFormat(role: any): Role {
    if (!role) return null as unknown as Role;
    
    return {
        id: role.id,
        name: role.name,
        description: role.description || null,
        permissions: role.permissions || []
    };
}

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
                
            // Konvertiere Berechtigungen in das neue Format
            const formattedPermissions = activeRole.role.permissions.map(ensurePermissionFormat);
                
            // Konvertiere die Rolle in das richtige Format
            const formattedRole = ensureRoleFormat(activeRole.role);

            setCurrentRole(formattedRole);
            setPermissions(formattedPermissions);
            setError(null);
        } catch (err) {
            console.error('Fehler beim Laden der Berechtigungen:', err);
            setError('Fehler beim Laden der Berechtigungen');
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (entity: string, requiredLevel: AccessLevel = 'read', entityType: string = 'page'): boolean => {
        if (!permissions || permissions.length === 0) {
            return false;
        }

        // Suche nach der Berechtigung für die Entität
        const permission = permissions.find(p => 
            p.entity === entity && p.entityType === entityType
        );

        if (!permission) {
            return false;
        }

        let hasAccess = false;
        switch (requiredLevel) {
            case 'read':
                hasAccess = ['read', 'write', 'both'].includes(permission.accessLevel);
                break;
            case 'write':
                hasAccess = ['write', 'both'].includes(permission.accessLevel);
                break;
            case 'both':
                hasAccess = permission.accessLevel === 'both';
                break;
            default:
                hasAccess = false;
        }

        return hasAccess;
    };

    const isAdmin = (): boolean => {
        return currentRole?.name.toLowerCase() === 'admin';
    };

    // Organisation-spezifische Berechtigungen
    const canManageOrganization = (): boolean => {
        return hasPermission('organization_management', 'both', 'page') || hasPermission('organization_management', 'write', 'page');
    };

    const canViewOrganization = (): boolean => {
        return hasPermission('organization_management', 'both', 'page') || hasPermission('organization_management', 'read', 'page');
    };

    const canManageJoinRequests = (): boolean => {
        return hasPermission('organization_join_requests', 'both', 'table') || hasPermission('organization_join_requests', 'write', 'table');
    };

    const canViewJoinRequests = (): boolean => {
        return hasPermission('organization_join_requests', 'both', 'table') || hasPermission('organization_join_requests', 'read', 'table');
    };

    const canManageOrganizationUsers = (): boolean => {
        return hasPermission('organization_users', 'write', 'table');
    };

    const canViewOrganizationUsers = (): boolean => {
        return hasPermission('organization_users', 'read', 'table');
    };

    const canManageInvitations = (): boolean => {
        return hasPermission('organization_invitations', 'write', 'table');
    };

    const canViewInvitations = (): boolean => {
        return hasPermission('organization_invitations', 'read', 'table');
    };

    return {
        currentRole,
        permissions,
        loading,
        error,
        hasPermission,
        isAdmin,
        // Organisation-spezifische Berechtigungen
        canManageOrganization,
        canViewOrganization,
        canManageJoinRequests,
        canViewJoinRequests,
        canManageOrganizationUsers,
        canViewOrganizationUsers,
        canManageInvitations,
        canViewInvitations
    };
};

export default usePermissions; 