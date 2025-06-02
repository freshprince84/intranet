"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const notificationController_1 = require("../controllers/notificationController");
const roleCheck_1 = require("../middleware/roleCheck");
const router = express_1.default.Router();
// Debug-Middleware
router.use((req, res, next) => {
    var _a;
    console.log('Notifications Router aufgerufen:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        userId: req.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'nicht verfügbar'
    });
    next();
});
// Alle Routen benötigen Authentifizierung
router.use(auth_1.authenticateToken);
// Benachrichtigungen abrufen
router.get('/', notificationController_1.getUserNotifications);
// Ungelesene Benachrichtigungen zählen
router.get('/unread/count', notificationController_1.countUnreadNotifications);
// Benachrichtigung erstellen (nur für Administratoren)
router.post('/', (0, roleCheck_1.checkRole)(['admin']), notificationController_1.createNotification);
// Benachrichtigung als gelesen markieren
router.patch('/:id/read', notificationController_1.markNotificationAsRead);
// Alle Benachrichtigungen als gelesen markieren
router.patch('/read-all', notificationController_1.markAllNotificationsAsRead);
// Benachrichtigung löschen
router.delete('/:id', notificationController_1.deleteNotification);
// Alle Benachrichtigungen löschen
router.delete('/', notificationController_1.deleteAllNotifications);
exports.default = router;
//# sourceMappingURL=notifications.js.map