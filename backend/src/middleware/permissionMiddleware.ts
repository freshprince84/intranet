import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
export const checkPermission = (entity: string, requiredAccess: 'read' | 'write', entityType: 'page' | 'table' | 'cerebro' = 'page') => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            const userId = parseInt(req.userId, 10);
            const roleId = parseInt(req.roleId, 10);

            if (isNaN(userId) || isNaN(roleId)) {
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }

            // Prüfe, ob der Benutzer die erforderliche Berechtigung hat
            const hasAccess = await checkUserPermission(userId, roleId, entity, requiredAccess, entityType);

            if (!hasAccess) {
                return res.status(403).json({ 
                    message: 'Zugriff verweigert',
                    details: `Keine ausreichenden Berechtigungen für ${entityType} ${entity}`
                });
            }

            next();
        } catch (error) {
            console.error('Fehler bei der Berechtigungsprüfung:', error);
            res.status(500).json({ message: 'Interner Server-Fehler' });
        }
    };
};

// Hilfsfunktion zur Überprüfung der Berechtigungen eines Benutzers
export const checkUserPermission = async (
    userId: number, 
    roleId: number, 
    currentEntity: string, 
    requiredAccess: 'read' | 'write',
    entityType: 'page' | 'table' | 'cerebro' = 'page'
): Promise<boolean> => {
    try {
        // Hole die Berechtigungen für die aktuelle Rolle des Benutzers
        const role = await prisma.role.findUnique({
            where: { id: roleId },
            include: { permissions: true }
        });

        if (!role) {
            return false;
        }

        // Suche nach der Berechtigung für die angeforderte Entität
        const permission = role.permissions.find(
            p => p.entity === currentEntity && p.entityType === entityType
        );

        if (!permission) {
            return false;
        }

        // Prüfe, ob die Berechtigung ausreichend ist
        const hasAccess = 
            permission.accessLevel === 'both' || 
            (requiredAccess === 'read' && (permission.accessLevel === 'read' || permission.accessLevel === 'write')) ||
            (requiredAccess === 'write' && permission.accessLevel === 'write');

        if (!hasAccess) {
            return false;
        }

        // Zugriff gewähren, wenn alle Prüfungen bestanden wurden
        return true;
    } catch (error) {
        console.error('Fehler bei der Berechtigungsprüfung:', error);
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
        console.error('Error in admin check middleware:', error);
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
        const isComplete = !!(
            user.username &&
            user.email &&
            user.country &&
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
                    !user.country ? 'country' : null,
                    !user.language ? 'language' : null
                ].filter(Boolean)
            });
        }

        next();
    } catch (error) {
        console.error('Error in requireCompleteProfile middleware:', error);
        res.status(500).json({
            message: 'Fehler bei der Profilprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 