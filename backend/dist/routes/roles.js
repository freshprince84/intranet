"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_1 = require("../controllers/roleController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Authentifizierung und Organisation-Kontext zuerst setzen
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Erweiterte Authentifizierungs-Middleware für Rollen-Routen mit korrekter Berechtigungsprüfung
// Auth und Organization sind bereits durch router.use() gesetzt
const roleAuthMiddleware = (req, res, next) => {
    // Für GET-Anfragen erlauben wir den Zugriff, wenn der Benutzer eine Read-Berechtigung hat
    if (req.method === 'GET') {
        const hasRoleReadPermission = req.user && req.user.roles && req.user.roles.some(userRole => {
            if (userRole.lastUsed) {
                return userRole.role.permissions.some(permission => permission.entity === 'organization_management' &&
                    ['read', 'both'].includes(permission.accessLevel));
            }
            return false;
        });
        if (hasRoleReadPermission) {
            logger_1.logger.log('Benutzer hat Leseberechtigung für Organization Management');
            return next();
        }
        else {
            logger_1.logger.log('Benutzer hat KEINE Leseberechtigung für Organization Management');
            return res.status(403).json({ message: 'Leseberechtigung für Rollen erforderlich' });
        }
    }
    // Bei anderen Methoden (POST, PUT, DELETE) muss der Benutzer Schreibberechtigung haben
    const hasRoleWritePermission = req.user && req.user.roles && req.user.roles.some(userRole => {
        if (userRole.lastUsed) {
            return userRole.role.permissions.some(permission => permission.entity === 'organization_management' &&
                (permission.entityType === 'table' || permission.entityType === 'page') &&
                ['write', 'both'].includes(permission.accessLevel));
        }
        return false;
    });
    if (!hasRoleWritePermission) {
        logger_1.logger.log('Benutzer hat KEINE Schreibberechtigung für Rollen/Organization Management');
        return res.status(403).json({ message: 'Schreibberechtigung für Rollen erforderlich für diese Operation' });
    }
    logger_1.logger.log('Benutzer hat Schreibberechtigung für Rollen/Organization Management');
    next();
};
// Alle Rollen abrufen
router.get('/', roleAuthMiddleware, roleController_1.getAllRoles);
// Eine spezifische Rolle abrufen
router.get('/:id', roleAuthMiddleware, roleController_1.getRoleById);
// Neue Rolle erstellen
router.post('/', roleAuthMiddleware, roleController_1.createRole);
// Rolle aktualisieren
router.put('/:id', roleAuthMiddleware, roleController_1.updateRole);
// Rolle löschen
router.delete('/:id', roleAuthMiddleware, roleController_1.deleteRole);
// Berechtigungen einer Rolle abrufen
router.get('/:id/permissions', roleAuthMiddleware, roleController_1.getRolePermissions);
// Branches einer Rolle abrufen
router.get('/:id/branches', roleAuthMiddleware, roleController_1.getRoleBranches);
// Branches einer Rolle aktualisieren
router.put('/:id/branches', roleAuthMiddleware, roleController_1.updateRoleBranches);
exports.default = router;
//# sourceMappingURL=roles.js.map