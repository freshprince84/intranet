import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Erweitere den Request-Typ um userPermissions
declare global {
    namespace Express {
        interface Request {
            userPermissions?: any[];
            user?: {
                id: number;
            };
        }
    }
}

type AccessLevel = 'none' | 'read' | 'write' | 'both';

/**
 * Middleware zur Überprüfung von Benutzerberechtigungen
 * @param requiredAccess - Erforderliche Zugriffsebene ('read', 'write', 'both')
 * @returns Express Middleware
 */
export const checkPermission = (requiredAccess: AccessLevel) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = req.user?.id;
            
            if (!userId) {
                return res.status(401).json({ 
                    message: 'Nicht authentifiziert',
                    error: 'NOT_AUTHENTICATED'
                });
            }

            // Hole die aktive Rolle des Benutzers
            const userRole = await prisma.userRole.findFirst({
                where: { 
                    userId,
                    lastUsed: true
                },
                include: {
                    role: {
                        include: {
                            permissions: true
                        }
                    }
                }
            });

            if (!userRole) {
                return res.status(403).json({ 
                    message: 'Keine aktive Rolle gefunden',
                    error: 'NO_ACTIVE_ROLE'
                });
            }

            // Bestimme die aktuelle Seite aus der URL
            const currentPage = req.baseUrl.split('/').pop() || 'dashboard';

            // Finde die relevante Berechtigung
            const permission = userRole.role.permissions.find(p => p.page === currentPage);

            if (!permission) {
                return res.status(403).json({ 
                    message: 'Keine Berechtigung für diese Seite',
                    error: 'NO_PAGE_PERMISSION'
                });
            }

            // Prüfe die Zugriffsebene
            const hasAccess = checkAccessLevel(permission.accessLevel as AccessLevel, requiredAccess);

            if (!hasAccess) {
                return res.status(403).json({ 
                    message: 'Unzureichende Berechtigungen',
                    error: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            // Füge die Berechtigungen zum Request hinzu
            req.userPermissions = userRole.role.permissions;
            next();
        } catch (error) {
            console.error('Error in permission middleware:', error);
            res.status(500).json({ 
                message: 'Fehler bei der Berechtigungsprüfung',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    };
};

/**
 * Prüft, ob die vorhandene Zugriffsebene ausreichend ist
 * @param hasLevel - Vorhandene Zugriffsebene
 * @param needsLevel - Benötigte Zugriffsebene
 * @returns boolean
 */
function checkAccessLevel(hasLevel: AccessLevel, needsLevel: AccessLevel): boolean {
    if (hasLevel === 'none') return false;
    if (hasLevel === 'both') return true;
    if (needsLevel === 'both') return hasLevel === 'both';
    return hasLevel === needsLevel || hasLevel === 'both';
}

/**
 * Middleware zur Überprüfung von Admin-Berechtigungen
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ 
                message: 'Nicht authentifiziert',
                error: 'NOT_AUTHENTICATED'
            });
        }
        
        const userRole = await prisma.userRole.findFirst({
            where: { 
                userId,
                lastUsed: true,
                role: {
                    name: 'admin'
                }
            }
        });

        if (!userRole) {
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