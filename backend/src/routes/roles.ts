import { Router } from 'express';
import { getAllRoles, getRoleById, createRole, updateRole, deleteRole, getRolePermissions, getRoleBranches, updateRoleBranches } from '../controllers/roleController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { logger } from '../utils/logger';

const router = Router();

// Authentifizierung und Organisation-Kontext zuerst setzen
router.use(authMiddleware);
router.use(organizationMiddleware);

// Erweiterte Authentifizierungs-Middleware für Rollen-Routen mit korrekter Berechtigungsprüfung
// Auth und Organization sind bereits durch router.use() gesetzt
const roleAuthMiddleware = (req, res, next) => {
    // Für GET-Anfragen erlauben wir den Zugriff, wenn der Benutzer eine Read-Berechtigung hat
    if (req.method === 'GET') {
      const hasRoleReadPermission = req.user && req.user.roles && req.user.roles.some(userRole => {
        if (userRole.lastUsed) {
          return userRole.role.permissions.some(permission => 
            permission.entity === 'organization_management' && 
            ['read', 'both'].includes(permission.accessLevel)
          );
        }
        return false;
      });

      if (hasRoleReadPermission) {
        logger.log('Benutzer hat Leseberechtigung für Organization Management');
        return next();
      } else {
        logger.log('Benutzer hat KEINE Leseberechtigung für Organization Management');
        return res.status(403).json({ message: 'Leseberechtigung für Rollen erforderlich' });
      }
    }
    
    // Bei anderen Methoden (POST, PUT, DELETE) muss der Benutzer Schreibberechtigung haben
    const hasRoleWritePermission = req.user && req.user.roles && req.user.roles.some(userRole => {
      if (userRole.lastUsed) {
        return userRole.role.permissions.some(permission => 
          permission.entity === 'organization_management' && 
          (permission.entityType === 'table' || permission.entityType === 'page') &&
          ['write', 'both'].includes(permission.accessLevel)
        );
      }
      return false;
    });
    
    if (!hasRoleWritePermission) {
      logger.log('Benutzer hat KEINE Schreibberechtigung für Rollen/Organization Management');
      return res.status(403).json({ message: 'Schreibberechtigung für Rollen erforderlich für diese Operation' });
    }
    
    logger.log('Benutzer hat Schreibberechtigung für Rollen/Organization Management');
    next();
};

// Alle Rollen abrufen
router.get('/', roleAuthMiddleware, getAllRoles);

// Eine spezifische Rolle abrufen
router.get('/:id', roleAuthMiddleware, getRoleById);

// Neue Rolle erstellen
router.post('/', roleAuthMiddleware, createRole);

// Rolle aktualisieren
router.put('/:id', roleAuthMiddleware, updateRole);

// Rolle löschen
router.delete('/:id', roleAuthMiddleware, deleteRole);

// Berechtigungen einer Rolle abrufen
router.get('/:id/permissions', roleAuthMiddleware, getRolePermissions);

// Branches einer Rolle abrufen
router.get('/:id/branches', roleAuthMiddleware, getRoleBranches);

// Branches einer Rolle aktualisieren
router.put('/:id/branches', roleAuthMiddleware, updateRoleBranches);

export default router; 