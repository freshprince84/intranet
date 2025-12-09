"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRole = void 0;
const logger_1 = require("../utils/logger");
// Middleware zur Überprüfung der Benutzerrolle
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            // Prüfen, ob der Benutzer authentifiziert ist
            if (!req.user) {
                return res.status(401).json({ message: 'Nicht authentifiziert' });
            }
            // Prüfen, ob der Benutzer eine der erlaubten Rollen hat
            const hasAllowedRole = req.user.roles.some(role => allowedRoles.includes(role));
            if (!hasAllowedRole) {
                return res.status(403).json({
                    message: 'Zugriff verweigert. Sie haben nicht die erforderlichen Berechtigungen.',
                    requiredRoles: allowedRoles,
                    userRoles: req.user.roles
                });
            }
            next();
        }
        catch (error) {
            logger_1.logger.error('Fehler bei der Rollenprüfung:', error);
            res.status(500).json({ message: 'Interner Server-Fehler' });
        }
    };
};
exports.checkRole = checkRole;
//# sourceMappingURL=roleCheck.js.map