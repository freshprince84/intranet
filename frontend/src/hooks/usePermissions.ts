import { useState, useEffect, useCallback, useRef } from 'react';
import { Role, Permission, AccessLevel } from '../types/interfaces';
import { useAuth } from './useAuth.tsx';
import axiosInstance from '../config/axios.ts';

// ✅ PERFORMANCE: Globaler Cache für lifecycle-roles (verhindert doppelte Requests)
let lifecycleRolesCache: { data: any; timestamp: number; promise: Promise<any> | null } = {
    data: null,
    timestamp: 0,
    promise: null
};
const LIFECYCLE_ROLES_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

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
    const { user, isLoading } = useAuth();
    const [currentRole, setCurrentRole] = useState<Role | null>(null);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lifecycleRoles, setLifecycleRoles] = useState<any>(null);
    const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

    useEffect(() => {
        // Warten auf Auth-Completion, bevor Berechtigungen geladen werden
        if (isLoading) {
            setLoading(true);
            return;
        }
        
        // Wenn User vorhanden ist, sofort profileComplete setzen (synchron wenn möglich)
        if (user) {
            // Prüfe zuerst user.profileComplete Feld (falls vorhanden) - synchron
            if ('profileComplete' in user && user.profileComplete !== undefined) {
                setProfileComplete(user.profileComplete as boolean);
            } else {
                // Fallback: Asynchron prüfen
                checkProfileComplete();
            }
        } else {
            setProfileComplete(null);
        }
        
        loadPermissions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isLoading]); // checkProfileComplete aus Dependencies entfernt, da es zu Loops führt

    // Lade Lebenszyklus-Rollen-Konfiguration (wird nach loadPermissions aufgerufen)
    useEffect(() => {
        if (currentRole && user) {
            loadLifecycleRoles();
        }
    }, [currentRole, user]);

    const loadLifecycleRoles = async () => {
        try {
            if (!user || !currentRole) {
                setLifecycleRoles(null);
                return;
            }

            const now = Date.now();
            
            // ✅ PERFORMANCE: Prüfe Cache
            if (lifecycleRolesCache.data && (now - lifecycleRolesCache.timestamp) < LIFECYCLE_ROLES_CACHE_TTL) {
                setLifecycleRoles(lifecycleRolesCache.data);
                return;
            }

            // ✅ PERFORMANCE: Wenn bereits ein Request läuft, warte auf ihn (Request Deduplication)
            if (lifecycleRolesCache.promise) {
                const data = await lifecycleRolesCache.promise;
                setLifecycleRoles(data);
                return;
            }

            // ✅ PERFORMANCE: Starte neuen Request und speichere Promise
            lifecycleRolesCache.promise = axiosInstance.get('/organizations/current/lifecycle-roles')
                .then(response => {
                    lifecycleRolesCache.data = response.data.lifecycleRoles;
                    lifecycleRolesCache.timestamp = Date.now();
                    lifecycleRolesCache.promise = null;
                    return response.data.lifecycleRoles;
                })
                .catch(error => {
                    lifecycleRolesCache.promise = null;
                    throw error;
                });

            const data = await lifecycleRolesCache.promise;
            setLifecycleRoles(data);
        } catch (error) {
            console.error('Fehler beim Laden der Lebenszyklus-Rollen:', error);
            setLifecycleRoles(null);
        }
    };

    const loadPermissions = () => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:151',message:'loadPermissions called',data:{userExists:!!user,userId:user?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,D'})}).catch(()=>{});
        // #endregion
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
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:179',message:'Permissions set',data:{permissionsCount:formattedPermissions.length,permissionsEntities:formattedPermissions.map(p=>p.entity),hasPageProfile:formattedPermissions.some(p=>p.entity==='page_profile'&&p.entityType==='page')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
            setError(null);
        } catch (err) {
            console.error('Fehler beim Laden der Berechtigungen:', err);
            setError('Fehler beim Laden der Berechtigungen');
        } finally {
            setLoading(false);
        }
    };

    const hasPermission = (entity: string, requiredLevel: AccessLevel = 'read', entityType: string = 'page'): boolean => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:186',message:'hasPermission called',data:{entity,requiredLevel,entityType,permissionsLength:permissions?.length||0,permissionsDefined:permissions!==undefined,loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B'})}).catch(()=>{});
        // #endregion
        if (!permissions || permissions.length === 0) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:189',message:'No permissions - returning false',data:{entity,permissionsLength:permissions?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            return false;
        }

        // Suche nach der Berechtigung für die Entität
        const permission = permissions.find(p => 
            p.entity === entity && p.entityType === entityType
        );

        if (!permission) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/4b31729e-838f-41ed-a421-2153ac4e6c3c',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePermissions.ts:197',message:'Permission not found',data:{entity,entityType,permissionsCount:permissions.length,permissionsEntities:permissions.map(p=>p.entity)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
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

    const isAdmin = useCallback((): boolean => {
        // Prüfe zuerst ob Rolle als Admin in lifecycleRoles konfiguriert ist
        if (currentRole && lifecycleRoles) {
            const adminRoleId = lifecycleRoles.adminRoleId;
            if (adminRoleId && currentRole.id === adminRoleId) {
                return true;
            }
        }
        // Fallback: Prüfe Rollennamen
        return currentRole?.name.toLowerCase() === 'admin' || currentRole?.name.toLowerCase().includes('administrator');
    }, [currentRole, lifecycleRoles]);

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

    /**
     * Prüft Standard-Rollen (Fallback)
     */
    const checkDefaultLifecycleRole = (role: Role | null, roleType: 'admin' | 'hr' | 'legal'): boolean => {
        // Wenn keine Rolle vorhanden ist, gibt es keine Berechtigung
        if (!role || !role.name) {
            return false;
        }

        const roleName = role.name.toLowerCase();

        if (roleType === 'admin' || roleType === 'hr') {
            return roleName.includes('admin') || roleName.includes('administrator');
        }

        if (roleType === 'legal') {
            return roleName === 'derecho';
        }

        return false;
    };

    /**
     * Prüft ob User eine Lebenszyklus-Rolle hat
     * Nutzt lifecycleRoles-Konfiguration oder Fallback zu Standard-Rollen
     */
    const hasLifecycleRole = useCallback((roleType: 'admin' | 'hr' | 'legal'): boolean => {
        // Wenn keine Rolle vorhanden ist, gibt es keine Berechtigung
        if (!user || !currentRole) {
            return false;
        }

        // Wenn lifecycleRoles nicht geladen sind, verwende Fallback
        if (!lifecycleRoles) {
            return checkDefaultLifecycleRole(currentRole, roleType);
        }

        const targetRoleId = lifecycleRoles[`${roleType}RoleId`];
        if (!targetRoleId) {
            // Fallback: Standard-Prüfung
            return checkDefaultLifecycleRole(currentRole, roleType);
        }

        // Prüfe ob aktive Rolle die Ziel-Rolle ist
        return currentRole.id === targetRoleId;
    }, [user, currentRole, lifecycleRoles]);

    /**
     * Convenience-Funktionen für Lebenszyklus-Rollen
     */
    const isHR = useCallback((): boolean => {
        return hasLifecycleRole('hr') || hasLifecycleRole('admin');
    }, [hasLifecycleRole]);

    const isLegal = useCallback((): boolean => {
        return hasLifecycleRole('legal') || hasLifecycleRole('admin');
    }, [hasLifecycleRole]);

    /**
     * Prüft Profilvollständigkeit
     * Nutzt user.profileComplete Feld oder ruft API-Endpoint auf
     */
    const checkProfileComplete = useCallback(async () => {
        if (!user) {
            setProfileComplete(null);
            return;
        }

        // Prüfe zuerst user.profileComplete Feld (falls vorhanden)
        if ('profileComplete' in user && user.profileComplete !== undefined) {
            setProfileComplete(user.profileComplete as boolean);
            return;
        }

        // Fallback: API-Endpoint aufrufen
        try {
            const response = await axiosInstance.get('/users/profile/complete');
            setProfileComplete(response.data.complete);
        } catch (error) {
            console.error('Fehler beim Prüfen der Profilvollständigkeit:', error);
            // Bei Fehler: Prüfe Felder lokal (username, email, language - country NICHT nötig)
            const isComplete = !!(
                user.username &&
                user.email &&
                user.language
            );
            setProfileComplete(isComplete);
        }
    }, [user]);

    const isProfileComplete = useCallback((): boolean => {
        // WICHTIG: profileComplete ist nur relevant, wenn User Mitglied einer Organisation ist
        // Vor Organisation-Beitritt: Keine Profil-Blockierung
        if (!user) return true; // Kein User = kein Blockieren
        
        // Prüfe ob User Mitglied einer Organisation ist
        const hasOrganization = user.roles?.some(r => r.role.organization !== null) || false;
        
        // Wenn User KEINE Organisation hat: Profil-Blockierung deaktivieren
        if (!hasOrganization) {
            return true; // Keine Blockierung vor Organisation-Beitritt
        }
        
        // Wenn User MIT Organisation: Prüfe profileComplete
        if (profileComplete !== null) {
            return profileComplete;
        }
        
        // Fallback: Lokale Prüfung (username, email, language - country NICHT nötig)
        return !!(
            user.username &&
            user.email &&
            user.language
        );
    }, [user, profileComplete]);

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
        canViewInvitations,
        // Lebenszyklus-Rollen
        hasLifecycleRole,
        isHR,
        isLegal,
        // Profilvollständigkeit
        isProfileComplete,
        checkProfileComplete
    };
};

export default usePermissions; 