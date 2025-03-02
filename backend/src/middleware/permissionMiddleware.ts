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
 * @param entity - Entität (z.B. 'page' oder 'table')
 * @param requiredAccess - Erforderliche Zugriffsebene ('read' oder 'write')
 * @param entityType - Typ der Entität ('page' oder 'table')
 * @returns Express Middleware
 */
export const checkPermission = (entity: string, requiredAccess: 'read' | 'write', entityType: 'page' | 'table' = 'page') => {
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
    entityType: 'page' | 'table' = 'page'
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