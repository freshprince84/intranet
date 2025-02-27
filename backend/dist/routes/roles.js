"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const roleController_1 = require("../controllers/roleController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Detaillierte Debug-Middleware für alle Roles-Routen
router.use((req, res, next) => {
    console.log('Roles-Route aufgerufen:', {
        method: req.method,
        url: req.url,
        path: req.path,
        params: req.params,
        query: req.query,
        body: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
        headers: {
            authorization: req.headers.authorization ? 'Vorhanden' : 'Nicht vorhanden',
            'content-type': req.headers['content-type']
        }
    });
    next();
});
// Erweiterte Authentifizierungs-Middleware für Rollen-Routen
const roleAuthMiddleware = (req, res, next) => {
    console.log('Authentifizierungs-Middleware für Rollen-Route wird ausgeführt');
    // Authorization-Header checken
    if (!req.headers.authorization) {
        console.warn('Authorization-Header fehlt in der Anfrage');
    }
    // Standard-Authentifizierung durchführen
    (0, auth_1.authMiddleware)(req, res, (err) => {
        if (err) {
            console.error('Authentifizierungsfehler:', err);
            return res.status(401).json({ message: 'Authentifizierungsfehler', error: err.message });
        }
        console.log('Benutzer erfolgreich authentifiziert');
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