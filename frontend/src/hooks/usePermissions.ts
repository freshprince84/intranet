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
    console.log('Konvertiere Permission:', permission);
    
    // Debug: Ausgabe aller Eigenschaften von permission
    console.log('Permission Eigenschaften:', Object.keys(permission));
    
    // Prüfen, ob es das neue Format mit entity und entityType hat
    if ('entity' in permission && 'entityType' in permission) {
        console.log('Permission hat bereits entity & entityType:', permission);
        return permission as Permission;
    }
    
    // Prüfen, ob es das alte Format mit page hat
    if ('page' in permission) {
        console.log('Alt-Format mit page gefunden:', permission);
        return {
            entity: permission.page,
            entityType: 'page',
            accessLevel: permission.accessLevel
        };
    }
    
    // Fallback für unbekanntes Format
    console.warn('Unbekanntes Permission-Format:', permission);
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
            console.log('loadPermissions aufgerufen, user:', user);
            
            if (!user || !user.roles || user.roles.length === 0) {
                console.log('Keine Benutzerrollen gefunden');
                setCurrentRole(null);
                setPermissions([]);
                setLoading(false);
                return;
            }

            // Finde die aktive Rolle (lastUsed = true)
            const activeRole = user.roles.find(userRole => userRole.lastUsed);
            
            console.log('Aktive Rolle gefunden:', activeRole);
            
            if (!activeRole) {
                console.error('Keine aktive Rolle gefunden');
                setError('Keine aktive Rolle gefunden');
                setLoading(false);
                return;
            }

            console.log('Rolle-Permissions vor Konvertierung:', activeRole.role.permissions);

            // Konvertiere Berechtigungen in das neue Format
            const formattedPermissions = activeRole.role.permissions.map(ensurePermissionFormat);
            
            console.log('Formatierte Permissions:', formattedPermissions);
            
            // Konvertiere die Rolle in das richtige Format
            const formattedRole = ensureRoleFormat(activeRole.role);
            
            console.log('Formatierte Rolle:', formattedRole);

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
        console.log(`Prüfe Berechtigung für: entity=${entity}, requiredLevel=${requiredLevel}, entityType=${entityType}`);
        console.log('Vorhandene Permissions:', permissions);
        
        if (!permissions || permissions.length === 0) {
            console.log('Keine Berechtigungen vorhanden');
            return false;
        }
        
        // Suche nach der Berechtigung für die Entität
        const permission = permissions.find(p => 
            p.entity === entity && p.entityType === entityType
        );
        
        console.log('Gefundene Berechtigung:', permission);
        
        if (!permission) {
            console.log(`Keine Berechtigung gefunden für ${entityType} ${entity}`);
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
        
        console.log(`Zugriffsberechtigung ${requiredLevel} auf ${entity}: ${hasAccess ? 'JA' : 'NEIN'}`);
        return hasAccess;
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