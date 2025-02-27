import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
    getUserNotifications,
    countUnreadNotifications,
    createNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deleteAllNotifications
} from '../controllers/notification';
import { checkRole } from '../middleware/roleCheck';

const router = express.Router();

// Debug-Middleware
router.use((req, res, next) => {
    console.log('Notifications Router aufgerufen:', {
        method: req.method,
        path: req.path,
        originalUrl: req.originalUrl,
        userId: req.userId || req.user?.id || 'nicht verfügbar'
    });
    next();
});

// Alle Routen benötigen Authentifizierung
router.use(authenticateToken);

// Benachrichtigungen abrufen
router.get('/', getUserNotifications);

// Ungelesene Benachrichtigungen zählen
router.get('/unread/count', countUnreadNotifications);

// Benachrichtigung erstellen (nur für Administratoren)
router.post('/', checkRole(['admin']), createNotification);

// Benachrichtigung als gelesen markieren
router.patch('/:id/read', markNotificationAsRead);

// Alle Benachrichtigungen als gelesen markieren
router.patch('/read-all', markAllNotificationsAsRead);

// Benachrichtigung löschen
router.delete('/:id', deleteNotification);

// Alle Benachrichtigungen löschen
router.delete('/', deleteAllNotifications);

export default router; 