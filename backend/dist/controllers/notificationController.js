"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllNotifications = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.countUnreadNotifications = exports.getUserNotifications = exports.getNotificationSettings = exports.markAllAsRead = exports.deleteNotification = exports.updateNotification = exports.createNotification = exports.getNotificationById = exports.getNotifications = void 0;
exports.createNotificationIfEnabled = createNotificationIfEnabled;
const client_1 = require("@prisma/client");
const notificationValidation_1 = require("../validation/notificationValidation");
const prisma = new client_1.PrismaClient();
// Hilfsfunktion zum Prüfen, ob Benachrichtigung für einen Typ aktiviert ist
function isNotificationEnabled(userId, type, relatedEntityType) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        console.log('[Notification] Prüfe Benachrichtigungseinstellungen für:', {
            userId,
            type,
            relatedEntityType
        });
        // Benutzereinstellungen abrufen
        const userSettings = yield prisma.userNotificationSettings.findFirst({
            where: { userId }
        });
        console.log('[Notification] Gefundene Benutzereinstellungen:', userSettings);
        // Systemeinstellungen abrufen
        const systemSettings = yield prisma.notificationSettings.findFirst();
        console.log('[Notification] Gefundene Systemeinstellungen:', systemSettings);
        let enabled = true;
        switch (type) {
            case client_1.NotificationType.task:
                enabled = ((_a = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskCreate) !== null && _a !== void 0 ? _a : systemSettings.taskCreate) ||
                    ((_b = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskUpdate) !== null && _b !== void 0 ? _b : systemSettings.taskUpdate) ||
                    ((_c = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskDelete) !== null && _c !== void 0 ? _c : systemSettings.taskDelete) ||
                    ((_d = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskStatusChange) !== null && _d !== void 0 ? _d : systemSettings.taskStatusChange);
                break;
            case client_1.NotificationType.request:
                enabled = ((_e = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestCreate) !== null && _e !== void 0 ? _e : systemSettings.requestCreate) ||
                    ((_f = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestUpdate) !== null && _f !== void 0 ? _f : systemSettings.requestUpdate) ||
                    ((_g = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestDelete) !== null && _g !== void 0 ? _g : systemSettings.requestDelete) ||
                    ((_h = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestStatusChange) !== null && _h !== void 0 ? _h : systemSettings.requestStatusChange);
                break;
            case client_1.NotificationType.user:
                enabled = ((_j = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userCreate) !== null && _j !== void 0 ? _j : systemSettings.userCreate) ||
                    ((_k = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userUpdate) !== null && _k !== void 0 ? _k : systemSettings.userUpdate) ||
                    ((_l = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userDelete) !== null && _l !== void 0 ? _l : systemSettings.userDelete);
                break;
            case client_1.NotificationType.role:
                enabled = ((_m = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleCreate) !== null && _m !== void 0 ? _m : systemSettings.roleCreate) ||
                    ((_o = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleUpdate) !== null && _o !== void 0 ? _o : systemSettings.roleUpdate) ||
                    ((_p = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleDelete) !== null && _p !== void 0 ? _p : systemSettings.roleDelete);
                break;
            case client_1.NotificationType.worktime:
                if (relatedEntityType === 'start') {
                    enabled = (_q = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeStart) !== null && _q !== void 0 ? _q : true;
                    console.log('[Notification] Worktime Start Einstellung:', enabled);
                }
                else if (relatedEntityType === 'stop') {
                    enabled = (_r = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeStop) !== null && _r !== void 0 ? _r : true;
                    console.log('[Notification] Worktime Stop Einstellung:', enabled);
                }
                break;
            case client_1.NotificationType.system:
                enabled = true; // System-Benachrichtigungen sind immer aktiviert
                break;
        }
        console.log('[Notification] Benachrichtigungen sind:', enabled ? 'aktiviert' : 'deaktiviert', 'für Typ:', type, 'und Entity-Typ:', relatedEntityType);
        return enabled;
    });
}
// Hilfsfunktion zum Erstellen einer Benachrichtigung nur wenn sie aktiviert ist
function createNotificationIfEnabled(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('[Notification] Versuche Benachrichtigung zu erstellen:', {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                relatedEntityType: data.relatedEntityType,
                relatedEntityId: data.relatedEntityId
            });
            const enabled = yield isNotificationEnabled(data.userId, data.type, data.relatedEntityType);
            console.log('[Notification] Benachrichtigungen aktiviert:', enabled);
            if (!enabled) {
                console.log('[Notification] Benachrichtigungen sind deaktiviert');
                return false;
            }
            const notification = yield prisma.notification.create({
                data: {
                    userId: data.userId,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    relatedEntityId: data.relatedEntityId,
                    relatedEntityType: data.relatedEntityType
                }
            });
            console.log('[Notification] Benachrichtigung erfolgreich erstellt:', {
                id: notification.id,
                userId: notification.userId,
                type: notification.type,
                title: notification.title
            });
            return true;
        }
        catch (error) {
            console.error('[Notification] Fehler beim Erstellen der Benachrichtigung:', error);
            return false;
        }
    });
}
// Alle Benachrichtigungen abrufen
const getNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        const filter = {
            userId
        };
        // Optionale Filter
        if (req.query.read !== undefined) {
            filter.read = req.query.read === 'true';
        }
        if (req.query.type) {
            filter.type = req.query.type;
        }
        const notifications = yield prisma.notification.findMany({
            where: filter,
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getNotifications = getNotifications;
// Einzelne Benachrichtigung abrufen
const getNotificationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        const notification = yield prisma.notification.findUnique({
            where: { id: parseInt(id) }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        // Sicherstellen, dass der Benutzer nur seine eigenen Benachrichtigungen sehen kann
        if (notification.userId !== userId) {
            return res.status(403).json({ message: 'Zugriff verweigert' });
        }
        res.json(notification);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Benachrichtigung:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getNotificationById = getNotificationById;
// Neue Benachrichtigung erstellen
const createNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        // Validierung
        const validationError = (0, notificationValidation_1.validateNotification)(data);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        // Benutzer-Einstellungen prüfen
        const userSettings = yield prisma.userNotificationSettings.findFirst({
            where: { userId: data.userId }
        });
        // System-Einstellungen abrufen
        const systemSettings = yield prisma.notificationSettings.findFirst();
        // Prüfen, ob Benachrichtigungen für diesen Typ aktiviert sind
        let isEnabled = true;
        if (userSettings) {
            // Benutzer-spezifische Einstellungen prüfen
            switch (data.type) {
                case client_1.NotificationType.task:
                    if (data.relatedEntityType === 'create' && userSettings.taskCreate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && userSettings.taskUpdate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && userSettings.taskDelete === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'status' && userSettings.taskStatusChange === false)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.request:
                    if (data.relatedEntityType === 'create' && userSettings.requestCreate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && userSettings.requestUpdate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && userSettings.requestDelete === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'status' && userSettings.requestStatusChange === false)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.user:
                    if (data.relatedEntityType === 'create' && userSettings.userCreate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && userSettings.userUpdate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && userSettings.userDelete === false)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.role:
                    if (data.relatedEntityType === 'create' && userSettings.roleCreate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && userSettings.roleUpdate === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && userSettings.roleDelete === false)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.worktime:
                    if (data.relatedEntityType === 'start' && userSettings.worktimeStart === false)
                        isEnabled = false;
                    if (data.relatedEntityType === 'stop' && userSettings.worktimeStop === false)
                        isEnabled = false;
                    break;
            }
        }
        else if (systemSettings) {
            // System-Einstellungen prüfen, wenn keine Benutzer-Einstellungen vorhanden sind
            switch (data.type) {
                case client_1.NotificationType.task:
                    if (data.relatedEntityType === 'create' && !systemSettings.taskCreate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && !systemSettings.taskUpdate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && !systemSettings.taskDelete)
                        isEnabled = false;
                    if (data.relatedEntityType === 'status' && !systemSettings.taskStatusChange)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.request:
                    if (data.relatedEntityType === 'create' && !systemSettings.requestCreate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && !systemSettings.requestUpdate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && !systemSettings.requestDelete)
                        isEnabled = false;
                    if (data.relatedEntityType === 'status' && !systemSettings.requestStatusChange)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.user:
                    if (data.relatedEntityType === 'create' && !systemSettings.userCreate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && !systemSettings.userUpdate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && !systemSettings.userDelete)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.role:
                    if (data.relatedEntityType === 'create' && !systemSettings.roleCreate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'update' && !systemSettings.roleUpdate)
                        isEnabled = false;
                    if (data.relatedEntityType === 'delete' && !systemSettings.roleDelete)
                        isEnabled = false;
                    break;
                case client_1.NotificationType.worktime:
                    if (data.relatedEntityType === 'start' && !systemSettings.worktimeStart)
                        isEnabled = false;
                    if (data.relatedEntityType === 'stop' && !systemSettings.worktimeStop)
                        isEnabled = false;
                    break;
            }
        }
        // Wenn Benachrichtigungen deaktiviert sind, trotzdem Erfolg zurückgeben
        if (!isEnabled) {
            return res.status(200).json({
                message: 'Benachrichtigung wurde nicht erstellt, da dieser Typ deaktiviert ist',
                created: false
            });
        }
        // Benachrichtigung erstellen
        const notification = yield prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: data.type,
                relatedEntityId: data.relatedEntityId,
                relatedEntityType: data.relatedEntityType
            }
        });
        res.status(201).json({
            notification,
            created: true
        });
    }
    catch (error) {
        console.error('Fehler beim Erstellen der Benachrichtigung:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.createNotification = createNotification;
// Benachrichtigung aktualisieren (in der Regel nur das 'read'-Flag)
const updateNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const updateData = req.body;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
        const notification = yield prisma.notification.findUnique({
            where: { id: parseInt(id) }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        if (notification.userId !== userId) {
            return res.status(403).json({ message: 'Zugriff verweigert' });
        }
        // Aktualisieren der Benachrichtigung
        const updatedNotification = yield prisma.notification.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json(updatedNotification);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Benachrichtigung:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.updateNotification = updateNotification;
// Benachrichtigung löschen
const deleteNotification = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
        const notification = yield prisma.notification.findFirst({
            where: {
                id: parseInt(id),
                userId
            }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        // Benachrichtigung löschen
        yield prisma.notification.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Benachrichtigung wurde gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen der Benachrichtigung:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.deleteNotification = deleteNotification;
// Alle ungelesenen Benachrichtigungen markieren als gelesen
const markAllAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        // Alle ungelesenen Benachrichtigungen des Benutzers als gelesen markieren
        yield prisma.notification.updateMany({
            where: {
                userId,
                read: false
            },
            data: {
                read: true
            }
        });
        res.status(200).json({ message: 'Alle Benachrichtigungen als gelesen markiert' });
    }
    catch (error) {
        console.error('Fehler beim Markieren aller Benachrichtigungen als gelesen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.markAllAsRead = markAllAsRead;
// Benachrichtigungseinstellungen abrufen
const getNotificationSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Systemweite Einstellungen abrufen
        const systemSettings = yield prisma.notificationSettings.findFirst();
        // Benutzereinstellungen abrufen
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        let userSettings = null;
        if (userId) {
            userSettings = yield prisma.userNotificationSettings.findFirst({
                where: { userId }
            });
        }
        res.json({
            systemSettings: systemSettings || {
                taskEnabled: true,
                requestEnabled: true,
                userEnabled: true,
                roleEnabled: true,
                worktimeEnabled: true,
                systemEnabled: true
            },
            userSettings
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Benachrichtigungseinstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getNotificationSettings = getNotificationSettings;
// Alle Benachrichtigungen eines Benutzers abrufen
const getUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        // Paginierung
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        // Filter
        const where = { userId };
        if (req.query.read !== undefined) {
            where.read = req.query.read === 'true';
        }
        if (req.query.type) {
            where.type = req.query.type;
        }
        // Abfragen
        const [notifications, total] = yield Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.notification.count({ where })
        ]);
        // Response-Format
        res.json({
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getUserNotifications = getUserNotifications;
// Ungelesene Benachrichtigungen zählen
const countUnreadNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        const count = yield prisma.notification.count({
            where: {
                userId,
                read: false
            }
        });
        res.json({ count });
    }
    catch (error) {
        console.error('Fehler beim Zählen der ungelesenen Benachrichtigungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.countUnreadNotifications = countUnreadNotifications;
// Benachrichtigung als gelesen markieren
const markNotificationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
        const notification = yield prisma.notification.findFirst({
            where: {
                id: parseInt(id),
                userId
            }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        // Als gelesen markieren
        const updatedNotification = yield prisma.notification.update({
            where: { id: parseInt(id) },
            data: { read: true }
        });
        res.json(updatedNotification);
    }
    catch (error) {
        console.error('Fehler beim Markieren der Benachrichtigung als gelesen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.markNotificationAsRead = markNotificationAsRead;
// Alle Benachrichtigungen eines Benutzers als gelesen markieren
const markAllNotificationsAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Alle Benachrichtigungen des Benutzers als gelesen markieren
        yield prisma.notification.updateMany({
            where: {
                userId,
                read: false
            },
            data: { read: true }
        });
        res.json({ message: 'Alle Benachrichtigungen wurden als gelesen markiert' });
    }
    catch (error) {
        console.error('Fehler beim Markieren aller Benachrichtigungen als gelesen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
// Alle Benachrichtigungen eines Benutzers löschen
const deleteAllNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Alle Benachrichtigungen des Benutzers löschen
        yield prisma.notification.deleteMany({
            where: { userId }
        });
        res.json({ message: 'Alle Benachrichtigungen wurden gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.deleteAllNotifications = deleteAllNotifications;
//# sourceMappingURL=notificationController.js.map