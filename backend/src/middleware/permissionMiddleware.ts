import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { userCache } from '../services/userCache';
import { logger } from '../utils/logger';

// Erweitere den Request-Typ um userPermissions
declare global {
    namespace Express {
        interface Request {
            userPermissions?: any[];
        }
    }
}

type AccessLevel = 'none' | 'read' | 'write' | 'both';

interface AuthenticatedRequest extends Request {
    userId: string;
    roleId: string;
}

/**
 * Middleware zur Überprüfung von Berechtigungen
 * @param entity - Entität (z.B. 'page', 'table' oder 'cerebro')
 * @param requiredAccess - Erforderliche Zugriffsebene ('read' oder 'write')
 * @param entityType - Typ der Entität ('page', 'table' oder 'cerebro')
 * @returns Express Middleware
 */
export const checkPermission = (entity: string, requiredAccess: 'read' | 'write', entityType: 'page' | 'table' | 'cerebro' | 'button' = 'page') => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            // Nur für Rate Shopping Route loggen (um Log-Spam zu vermeiden)
            if (req.path.includes('rate-shopping')) {
                logger.warn(`[checkPermission] 🔍 Prüfe Permission: Entity=${entity}, EntityType=${entityType}, RequiredAccess=${requiredAccess}, Path=${req.path}`);
            }
            const userId = parseInt(req.userId, 10);
            const roleId = parseInt(req.roleId, 10);

            if (isNaN(userId) || isNaN(roleId)) {
                logger.error(`[checkPermission] ❌ Authentifizierung fehlgeschlagen: userId=${req.userId}, roleId=${req.roleId}`);
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }

            if (req.path.includes('rate-shopping')) {
                logger.warn(`[checkPermission] ✅ Authentifiziert: UserId=${userId}, RoleId=${roleId}`);
            }

            // Prüfe, ob der Benutzer die erforderliche Berechtigung hat
            const hasAccess = await checkUserPermission(userId, roleId, entity, requiredAccess, entityType);

            if (!hasAccess) {
                logger.error(`[checkPermission] ❌ VERWEIGERT: Entity=${entity}, EntityType=${entityType}, UserId=${userId}, RoleId=${roleId}`);
                return res.status(403).json({ 
                    message: 'Zugriff verweigert',
                    details: `Keine ausreichenden Berechtigungen für ${entityType} ${entity}`
                });
            }

            if (req.path.includes('rate-shopping')) {
                logger.warn(`[checkPermission] ✅ Permission erteilt für Entity=${entity}, EntityType=${entityType}`);
            }
            next();
        } catch (error) {
            logger.error('[checkPermission] ❌ Fehler bei der Berechtigungsprüfung:', error);
            res.status(500).json({ message: 'Interner Server-Fehler' });
        }
    };
};

// Hilfsfunktion zur Überprüfung der Berechtigungen eines Benutzers
// ✅ PERFORMANCE: Verwendet UserCache statt eigene DB-Query
export const checkUserPermission = async (
    userId: number, 
    roleId: number, 
    currentEntity: string, 
    requiredAccess: 'read' | 'write',
    entityType: 'page' | 'table' | 'cerebro' | 'button' = 'page'
): Promise<boolean> => {
    try {
        // ✅ PERFORMANCE: Verwende UserCache statt eigene DB-Query
        const cached = await userCache.get(userId);
        
        if (!cached || !cached.user) {
            logger.error(`[checkUserPermission] ❌ User nicht gefunden: userId=${userId}`);
            return false;
        }

        // Finde aktive Rolle (mit lastUsed: true)
        const activeRole = cached.user.roles.find((r: any) => r.lastUsed);

        if (!activeRole) {
            logger.error(`[checkUserPermission] ❌ Keine aktive Rolle gefunden: userId=${userId}`);
            return false;
        }

        // Prüfe ob die roleId mit der aktiven Rolle übereinstimmt
        if (activeRole.role.id !== roleId) {
            logger.warn(`[checkUserPermission] ⚠️ roleId mismatch: requested=${roleId}, active=${activeRole.role.id}, verwende aktive Rolle`);
            // Verwende die aktive Rolle statt der angeforderten roleId
        }

        // Hole Permissions aus der aktiven Rolle (bereits im Cache geladen)
        const permissions = activeRole.role.permissions || [];

        // Suche nach der Berechtigung für die angeforderte Entität
        const permission = permissions.find(
            (p: any) => p.entity === currentEntity && p.entityType === entityType
        );

        if (!permission) {
            logger.error(`[checkUserPermission] ❌ Berechtigung nicht gefunden: entity=${currentEntity}, entityType=${entityType}, role="${activeRole.role.name}" (ID: ${activeRole.role.id})`);
            logger.log(`[checkUserPermission] Verfügbare Cerebro-Permissions:`);
            permissions
                .filter((p: any) => p.entity.includes('cerebro'))
                .forEach((p: any) => {
                    logger.log(`   - ${p.entity} (${p.entityType}): ${p.accessLevel}`);
                });
            return false;
        }

        // Prüfe, ob die Berechtigung ausreichend ist
        const hasAccess = 
            permission.accessLevel === 'both' || 
            (requiredAccess === 'read' && (permission.accessLevel === 'read' || permission.accessLevel === 'write')) ||
            (requiredAccess === 'write' && permission.accessLevel === 'write');

        if (!hasAccess) {
            logger.error(`[checkUserPermission] ❌ Zugriff unzureichend: ${permission.accessLevel} < ${requiredAccess}`);
            return false;
        }

        // Zugriff gewähren, wenn alle Prüfungen bestanden wurden
        return true;
    } catch (error) {
        logger.error('Fehler bei der Berechtigungsprüfung:', error);
        return false;
    }
};

/**
 * Middleware zur Überprüfung von Admin-Berechtigungen
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);

        if (isNaN(userId)) {
            return res.status(401).json({ 
                message: 'Nicht authentifiziert',
                error: 'NOT_AUTHENTICATED'
            });
        }
        
        // Überprüfe, ob die Rolle 'admin' ist
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });

        if (!role || role.name !== 'admin') {
            return res.status(403).json({ 
                message: 'Admin-Berechtigung erforderlich',
                error: 'ADMIN_REQUIRED'
            });
        }

        next();
    } catch (error) {
        logger.error('Error in admin check middleware:', error);
        res.status(500).json({ 
            message: 'Fehler bei der Admin-Berechtigungsprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

/**
 * Middleware zur Überprüfung der Profilvollständigkeit
 * Erlaubt Zugriff nur, wenn Profil vollständig ist (username, email, country, language)
 * Ausnahmen: Profil-Seite selbst und Profil-Prüf-Endpoint
 */
export const requireCompleteProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = parseInt(req.userId, 10);
        
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // Ausnahmen: Profil-Seite und Profil-Prüf-Endpoint
        const path = req.path;
        if (path.includes('/profile') && (req.method === 'GET' || req.method === 'PUT')) {
            // Erlaube Zugriff auf Profil-Seite selbst
            return next();
        }

        // Prüfe ob User Mitglied einer Organisation ist
        const userRole = await prisma.userRole.findFirst({
            where: { 
                userId: userId,
                lastUsed: true 
            },
            include: {
                role: {
                    select: {
                        organizationId: true
                    }
                }
            }
        });

        // WICHTIG: profileComplete ist nur relevant, wenn User Mitglied einer Organisation ist
        // Vor Organisation-Beitritt: Keine Profil-Blockierung
        const hasOrganization = userRole?.role.organizationId !== null && userRole?.role.organizationId !== undefined;
        
        if (!hasOrganization) {
            // User hat keine Organisation → Keine Profil-Blockierung
            return next();
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                profileComplete: true,
                username: true,
                email: true,
                country: true,
                language: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Prüfe Profilvollständigkeit (nur wenn User Mitglied einer Organisation ist)
        // username, email, language - country NICHT nötig
        const isComplete = !!(
            user.username &&
            user.email &&
            user.language
        );

        // Update profileComplete, falls noch nicht gesetzt
        if (isComplete !== user.profileComplete) {
            await prisma.user.update({
                where: { id: userId },
                data: { profileComplete: isComplete }
            });
        }

        if (!isComplete) {
            return res.status(403).json({
                message: 'Profil muss zuerst vervollständigt werden',
                redirectTo: '/profile',
                missingFields: [
                    !user.username ? 'username' : null,
                    !user.email ? 'email' : null,
                    !user.language ? 'language' : null
                ].filter(Boolean)
            });
        }

        next();
    } catch (error) {
        logger.error('Error in requireCompleteProfile middleware:', error);
        res.status(500).json({
            message: 'Fehler bei der Profilprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 