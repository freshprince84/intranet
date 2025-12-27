import { useState, useEffect, useCallback, useRef } from 'react';
import { Role, Permission, AccessLevel } from '../types/interfaces';
import { useAuth } from './useAuth.tsx';
import axiosInstance from '../config/axios.ts';
import { 
    AccessLevel as NewAccessLevel, 
    EntityType,
    convertLegacyAccessLevel,
    hasAccess as checkAccessLevel,
    allowsAllData,
    allowsWrite,
    isVisible
} from '../config/permissions.ts';

// ✅ PERFORMANCE: Globaler Cache für lifecycle-roles (verhindert doppelte Requests)
let lifecycleRolesCache: { data: any; timestamp: number; promise: Promise<any> | null } = {
    data: null,
    timestamp: 0,
    promise: null
};
const LIFECYCLE_ROLES_CACHE_TTL = 5 * 60 * 1000; // 5 Minuten

/**
 * BERECHTIGUNGSSYSTEM
 * 
 * ACCESS LEVEL FORMAT (neu):
 * - 'none': Kein Zugriff
 * - 'own_read': Nur eigene Daten lesen
 * - 'own_both': Eigene Daten lesen und bearbeiten
 * - 'all_read': Alle Daten lesen
 * - 'all_both': Alle Daten lesen und bearbeiten
 * 
 * ENTITY TYPES:
 * - 'page': Seitenebene (Sidebar/Footer Menü)
 * - 'box': Container auf Seiten (z.B. Requests auf Dashboard)
 * - 'tab': Tabs innerhalb von Seiten (z.B. To-Dos auf Worktracker)
 * - 'button': Aktions-Buttons (z.B. task_create, request_edit)
 * 
 * LEGACY SUPPORT:
 * - 'read' -> 'all_read'
 * - 'write' -> 'own_both'
 * - 'both' -> 'all_both'
 * - 'table' -> 'tab' (für entityType)
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

    /**
     * Prüft ob User eine Berechtigung hat
     * @param entity - Entity-Name (z.B. 'dashboard', 'todos', 'task_create')
     * @param requiredLevel - Erforderliches Level ('read' oder 'write')
     * @param entityType - Entity-Typ ('page' | 'box' | 'tab' | 'button' | 'table')
     * @returns true wenn Zugriff erlaubt
     */
    const hasPermission = (entity: string, requiredLevel: AccessLevel = 'read', entityType: string = 'page'): boolean => {
        if (!permissions || permissions.length === 0) {
            return false;
        }

        // Admin-Bypass: Wenn aktive Rolle 'admin' heisst, hat sie immer Zugriff
        const roleName = currentRole?.name?.toLowerCase() || '';
        if (roleName === 'admin' || roleName.includes('admin')) {
            return true;
        }

        // Normalisiere entityType: 'table' -> 'tab' für Legacy-Support
        const normalizedEntityType = entityType === 'table' ? 'tab' : entityType;

        // Suche nach der Berechtigung für die Entität
        let permission = permissions.find(p => 
            p.entity === entity && p.entityType === normalizedEntityType
        );

        // Legacy-Fallback: Versuche mit 'table' wenn nicht gefunden
        if (!permission && (normalizedEntityType === 'tab' || normalizedEntityType === 'box')) {
            permission = permissions.find(p => 
                p.entity === entity && p.entityType === 'table'
            );
        }

        if (!permission) {
            return false;
        }

        // Konvertiere Access-Level (Legacy-Support)
        const accessLevel = convertLegacyAccessLevel(permission.accessLevel);
        
        // Prüfe Zugang basierend auf neuem Format
        // isOwner ist hier immer false, da Frontend die Ownership nicht prüfen kann
        // Das Backend prüft Ownership separat
        return checkAccessLevel(accessLevel, requiredLevel as 'read' | 'write', false);
    };

    /**
     * Prüft ob ein Entity sichtbar ist (AccessLevel != 'none')
     */
    const canView = (entity: string, entityType: string = 'page'): boolean => {
        if (!permissions || permissions.length === 0) {
            return false;
        }

        // Admin sieht immer alles
        const roleName = currentRole?.name?.toLowerCase() || '';
        if (roleName === 'admin' || roleName.includes('admin')) {
            return true;
        }

        const normalizedEntityType = entityType === 'table' ? 'tab' : entityType;
        
        let permission = permissions.find(p => 
            p.entity === entity && p.entityType === normalizedEntityType
        );

        if (!permission && (normalizedEntityType === 'tab' || normalizedEntityType === 'box')) {
            permission = permissions.find(p => 
                p.entity === entity && p.entityType === 'table'
            );
        }

        if (!permission) {
            return false;
        }

        const accessLevel = convertLegacyAccessLevel(permission.accessLevel);
        return isVisible(accessLevel);
    };

    /**
     * Holt das Access-Level für eine Entity
     */
    const getAccessLevel = (entity: string, entityType: string = 'page'): NewAccessLevel => {
        if (!permissions || permissions.length === 0) {
            return 'none';
        }

        // Admin hat immer all_both
        const roleName = currentRole?.name?.toLowerCase() || '';
        if (roleName === 'admin' || roleName.includes('admin')) {
            return 'all_both';
        }

        const normalizedEntityType = entityType === 'table' ? 'tab' : entityType;
        
        let permission = permissions.find(p => 
            p.entity === entity && p.entityType === normalizedEntityType
        );

        if (!permission && (normalizedEntityType === 'tab' || normalizedEntityType === 'box')) {
            permission = permissions.find(p => 
                p.entity === entity && p.entityType === 'table'
            );
        }

        if (!permission) {
            return 'none';
        }

        return convertLegacyAccessLevel(permission.accessLevel);
    };

    /**
     * Prüft ob User alle Daten sehen darf (nicht nur eigene)
     */
    const canSeeAllData = (entity: string, entityType: string = 'page'): boolean => {
        const accessLevel = getAccessLevel(entity, entityType);
        return allowsAllData(accessLevel);
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
        // Permission-Prüfung
        hasPermission,
        canView,
        getAccessLevel,
        canSeeAllData,
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