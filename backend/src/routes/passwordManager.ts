import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissionMiddleware';
import * as passwordManagerController from '../controllers/passwordManagerController';

const router = express.Router();

// Debug-Middleware (optional)
router.use((req, res, next) => {
    console.log('Password Manager Router aufgerufen:', {
        method: req.method,
        path: req.path,
        userId: req.userId || req.user?.id || 'nicht verfügbar'
    });
    next();
});

// Alle Routen benötigen Authentifizierung
router.use(authenticateToken);

// Öffentliche Route (keine Auth erforderlich) - Passwort generieren
router.post('/generate-password', passwordManagerController.generatePassword);

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

export default router;

