const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware zur Überprüfung von Benutzerberechtigungen
 * @param {string} requiredAccess - Erforderliche Zugriffsebene ('read', 'write', 'both')
 * @returns {Function} Express Middleware
 */
exports.checkPermission = (requiredAccess) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            
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
            const hasAccess = checkAccessLevel(permission.accessLevel, requiredAccess);

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
                error: error.message
            });
        }
    };
};

/**
 * Prüft, ob die vorhandene Zugriffsebene ausreichend ist
 * @param {string} hasLevel - Vorhandene Zugriffsebene
 * @param {string} needsLevel - Benötigte Zugriffsebene
 * @returns {boolean}
 */
function checkAccessLevel(hasLevel, needsLevel) {
    if (hasLevel === 'none') return false;
    if (hasLevel === 'both') return true;
    if (needsLevel === 'both') return hasLevel === 'both';
    return hasLevel === needsLevel || hasLevel === 'both';
}

/**
 * Middleware zur Überprüfung von Admin-Berechtigungen
 */
exports.isAdmin = async (req, res, next) => {
    try {
        const userId = req.user.id;
        
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
            error: error.message
        });
    }
}; 