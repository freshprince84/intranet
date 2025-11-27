"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const rateLimiter_1 = require("../middleware/rateLimiter");
const organization_1 = require("../middleware/organization");
const passwordManagerController = __importStar(require("../controllers/passwordManagerController"));
const router = express_1.default.Router();
// Debug-Middleware (optional)
router.use((req, res, next) => {
    var _a;
    console.log('Password Manager Router aufgerufen:', {
        method: req.method,
        path: req.path,
        userId: req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'nicht verfügbar'
    });
    next();
});
// Öffentliche Route (keine Auth erforderlich) - Passwort generieren
router.post('/generate-password', passwordManagerController.generatePassword);
// Alle anderen Routen benötigen Authentifizierung
router.use(auth_1.authenticateToken);
// Organization-Middleware für organizationId
router.use(organization_1.organizationMiddleware);
// Rate-Limiting für alle authentifizierten Passwort-Manager-Routen
router.use(rateLimiter_1.passwordManagerRateLimiter);
// Alle Einträge abrufen
router.get('/', (0, permissionMiddleware_1.checkPermission)('password_manager', 'read', 'page'), passwordManagerController.getAllPasswordEntries);
// Einzelnen Eintrag abrufen
router.get('/:id', (0, permissionMiddleware_1.checkPermission)('password_manager', 'read', 'page'), passwordManagerController.getPasswordEntry);
// Passwort abrufen (entschlüsselt)
router.get('/:id/password', (0, permissionMiddleware_1.checkPermission)('password_manager', 'read', 'page'), passwordManagerController.getPasswordEntryPassword);
// Passwort kopiert - Audit-Log erstellen
router.post('/:id/copy-password', (0, permissionMiddleware_1.checkPermission)('password_manager', 'read', 'page'), passwordManagerController.logPasswordCopy);
// Neuen Eintrag erstellen
router.post('/', (0, permissionMiddleware_1.checkPermission)('password_entry_create', 'write', 'page'), passwordManagerController.createPasswordEntry);
// Eintrag aktualisieren
router.put('/:id', (0, permissionMiddleware_1.checkPermission)('password_manager', 'write', 'page'), passwordManagerController.updatePasswordEntry);
// Eintrag löschen
router.delete('/:id', (0, permissionMiddleware_1.checkPermission)('password_manager', 'write', 'page'), passwordManagerController.deletePasswordEntry);
// Audit-Logs abrufen
router.get('/:id/audit-logs', (0, permissionMiddleware_1.checkPermission)('password_manager', 'read', 'page'), passwordManagerController.getPasswordEntryAuditLogs);
// Berechtigungen abrufen
router.get('/:id/permissions', (0, permissionMiddleware_1.checkPermission)('password_manager', 'read', 'page'), passwordManagerController.getPasswordEntryPermissions);
// Berechtigungen aktualisieren
router.put('/:id/permissions', (0, permissionMiddleware_1.checkPermission)('password_manager', 'write', 'page'), passwordManagerController.updatePasswordEntryPermissions);
exports.default = router;
//# sourceMappingURL=passwordManager.js.map