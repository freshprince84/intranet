import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissionMiddleware';
import { passwordManagerRateLimiter } from '../middleware/rateLimiter';
import { organizationMiddleware } from '../middleware/organization';
import * as passwordManagerController from '../controllers/passwordManagerController';
import { logger } from '../utils/logger';

const router = express.Router();

// Debug-Middleware (optional)
router.use((req, res, next) => {
    logger.log('Password Manager Router aufgerufen:', {
        method: req.method,
        path: req.path,
        userId: req.userId || req.user?.id || 'nicht verfügbar'
    });
    next();
});

// Öffentliche Route (keine Auth erforderlich) - Passwort generieren
router.post('/generate-password', passwordManagerController.generatePassword);

// Alle anderen Routen benötigen Authentifizierung
router.use(authenticateToken);

// Organization-Middleware für organizationId
router.use(organizationMiddleware);

// Rate-Limiting für alle authentifizierten Passwort-Manager-Routen
router.use(passwordManagerRateLimiter);

// Alle Einträge abrufen
router.get(
    '/',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getAllPasswordEntries
);

// Einzelnen Eintrag abrufen
router.get(
    '/:id',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntry
);

// Passwort abrufen (entschlüsselt)
router.get(
    '/:id/password',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntryPassword
);

// Passwort kopiert - Audit-Log erstellen
router.post(
    '/:id/copy-password',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.logPasswordCopy
);

// Neuen Eintrag erstellen
router.post(
    '/',
    checkPermission('password_entry_create', 'write', 'page'),
    passwordManagerController.createPasswordEntry
);

// Eintrag aktualisieren
router.put(
    '/:id',
    checkPermission('password_manager', 'write', 'page'),
    passwordManagerController.updatePasswordEntry
);

// Eintrag löschen
router.delete(
    '/:id',
    checkPermission('password_manager', 'write', 'page'),
    passwordManagerController.deletePasswordEntry
);

// Audit-Logs abrufen
router.get(
    '/:id/audit-logs',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntryAuditLogs
);

// Berechtigungen abrufen
router.get(
    '/:id/permissions',
    checkPermission('password_manager', 'read', 'page'),
    passwordManagerController.getPasswordEntryPermissions
);

// Berechtigungen aktualisieren
router.put(
    '/:id/permissions',
    checkPermission('password_manager', 'write', 'page'),
    passwordManagerController.updatePasswordEntryPermissions
);

export default router;

