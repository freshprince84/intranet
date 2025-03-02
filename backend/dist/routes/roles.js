"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_1 = require("../controllers/roleController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Erweiterte Authentifizierungs-Middleware für Rollen-Routen mit korrekter Berechtigungsprüfung
const roleAuthMiddleware = (req, res, next) => {
    // Standard-Authentifizierung durchführen
    (0, auth_1.authMiddleware)(req, res, (err) => {
        if (err) {
            console.error('Authentifizierungsfehler:', err);
            return res.status(401).json({ message: 'Authentifizierungsfehler', error: err.message });
        }
        // Für GET-Anfragen erlauben wir den Zugriff, wenn der Benutzer eine Read-Berechtigung hat
        if (req.method === 'GET') {
            const hasRoleReadPermission = req.user && req.user.roles && req.user.roles.some(userRole => {
                if (userRole.lastUsed) {
                    return userRole.role.permissions.some(permission => permission.entity === 'usermanagement' &&
                        ['read', 'both'].includes(permission.accessLevel));
                }
                return false;
            });
            if (hasRoleReadPermission) {
                console.log('Benutzer hat Leseberechtigung für Usermanagement');
                return next();
            }
            else {
                console.log('Benutzer hat KEINE Leseberechtigung für Usermanagement');
                return res.status(403).json({ message: 'Leseberechtigung für Rollen erforderlich' });
            }
        }
        // Bei anderen Methoden (POST, PUT, DELETE) muss der Benutzer Schreibberechtigung haben
        const hasRoleWritePermission = req.user && req.user.roles && req.user.roles.some(userRole => {
            if (userRole.lastUsed) {
                return userRole.role.permissions.some(permission => permission.entity === 'usermanagement' &&
                    (permission.entityType === 'table' || permission.entityType === 'page') &&
                    ['write', 'both'].includes(permission.accessLevel));
            }
            return false;
        });
        if (!hasRoleWritePermission) {
            console.log('Benutzer hat KEINE Schreibberechtigung für Rollen/Usermanagement');
            return res.status(403).json({ message: 'Schreibberechtigung für Rollen erforderlich für diese Operation' });
        }
        console.log('Benutzer hat Schreibberechtigung für Rollen/Usermanagement');
        next();
    });
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
exports.default = router;
//# sourceMappingURL=roles.js.map