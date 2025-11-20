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
exports.createOrganizationNotification = createOrganizationNotification;
exports.notifyOrganizationAdmins = notifyOrganizationAdmins;
exports.notifyJoinRequestStatus = notifyJoinRequestStatus;
const client_1 = require("@prisma/client");
const prisma_1 = require("../utils/prisma");
const notificationValidation_1 = require("../validation/notificationValidation");
const notificationSettingsCache_1 = require("../services/notificationSettingsCache");
// Hilfsfunktion zum Prüfen, ob Benachrichtigung für einen Typ aktiviert ist
function isNotificationEnabled(userId, type, relatedEntityType) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49;
        // Benutzereinstellungen aus Cache abrufen (statt direkt von DB)
        const userSettings = yield notificationSettingsCache_1.notificationSettingsCache.getUserSettings(userId);
        // Systemeinstellungen aus Cache abrufen (statt direkt von DB)
        const systemSettings = yield notificationSettingsCache_1.notificationSettingsCache.getSystemSettings();
        // Wenn keine Systemeinstellungen vorhanden sind, erstelle Standard-Werte
        if (!systemSettings) {
            console.warn('Keine NotificationSettings in der Datenbank gefunden. Verwende Standard-Werte (alle aktiviert).');
        }
        let enabled = true;
        switch (type) {
            case client_1.NotificationType.task:
                if (relatedEntityType === 'create') {
                    enabled = (_b = (_a = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskCreate) !== null && _a !== void 0 ? _a : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskCreate) !== null && _b !== void 0 ? _b : true;
                }
                else if (relatedEntityType === 'update') {
                    enabled = (_d = (_c = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskUpdate) !== null && _c !== void 0 ? _c : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskUpdate) !== null && _d !== void 0 ? _d : true;
                }
                else if (relatedEntityType === 'delete') {
                    enabled = (_f = (_e = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskDelete) !== null && _e !== void 0 ? _e : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskDelete) !== null && _f !== void 0 ? _f : true;
                }
                else if (relatedEntityType === 'status') {
                    enabled = (_h = (_g = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskStatusChange) !== null && _g !== void 0 ? _g : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskStatusChange) !== null && _h !== void 0 ? _h : true;
                }
                else {
                    // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Task-Notification aktiviert ist
                    enabled = ((_k = (_j = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskCreate) !== null && _j !== void 0 ? _j : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskCreate) !== null && _k !== void 0 ? _k : true) ||
                        ((_m = (_l = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskUpdate) !== null && _l !== void 0 ? _l : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskUpdate) !== null && _m !== void 0 ? _m : true) ||
                        ((_p = (_o = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskDelete) !== null && _o !== void 0 ? _o : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskDelete) !== null && _p !== void 0 ? _p : true) ||
                        ((_r = (_q = userSettings === null || userSettings === void 0 ? void 0 : userSettings.taskStatusChange) !== null && _q !== void 0 ? _q : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskStatusChange) !== null && _r !== void 0 ? _r : true);
                }
                break;
            case client_1.NotificationType.request:
                if (relatedEntityType === 'create') {
                    enabled = (_t = (_s = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestCreate) !== null && _s !== void 0 ? _s : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestCreate) !== null && _t !== void 0 ? _t : true;
                }
                else if (relatedEntityType === 'update') {
                    enabled = (_v = (_u = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestUpdate) !== null && _u !== void 0 ? _u : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestUpdate) !== null && _v !== void 0 ? _v : true;
                }
                else if (relatedEntityType === 'delete') {
                    enabled = (_x = (_w = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestDelete) !== null && _w !== void 0 ? _w : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestDelete) !== null && _x !== void 0 ? _x : true;
                }
                else if (relatedEntityType === 'status') {
                    enabled = (_z = (_y = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestStatusChange) !== null && _y !== void 0 ? _y : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestStatusChange) !== null && _z !== void 0 ? _z : true;
                }
                else {
                    // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Request-Notification aktiviert ist
                    enabled = ((_1 = (_0 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestCreate) !== null && _0 !== void 0 ? _0 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestCreate) !== null && _1 !== void 0 ? _1 : true) ||
                        ((_3 = (_2 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestUpdate) !== null && _2 !== void 0 ? _2 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestUpdate) !== null && _3 !== void 0 ? _3 : true) ||
                        ((_5 = (_4 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestDelete) !== null && _4 !== void 0 ? _4 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestDelete) !== null && _5 !== void 0 ? _5 : true) ||
                        ((_7 = (_6 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.requestStatusChange) !== null && _6 !== void 0 ? _6 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestStatusChange) !== null && _7 !== void 0 ? _7 : true);
                }
                break;
            case client_1.NotificationType.user:
                if (relatedEntityType === 'create') {
                    enabled = (_9 = (_8 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userCreate) !== null && _8 !== void 0 ? _8 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userCreate) !== null && _9 !== void 0 ? _9 : true;
                }
                else if (relatedEntityType === 'update') {
                    enabled = (_11 = (_10 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userUpdate) !== null && _10 !== void 0 ? _10 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userUpdate) !== null && _11 !== void 0 ? _11 : true;
                }
                else if (relatedEntityType === 'delete') {
                    enabled = (_13 = (_12 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userDelete) !== null && _12 !== void 0 ? _12 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userDelete) !== null && _13 !== void 0 ? _13 : true;
                }
                else {
                    // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE User-Notification aktiviert ist
                    enabled = ((_15 = (_14 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userCreate) !== null && _14 !== void 0 ? _14 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userCreate) !== null && _15 !== void 0 ? _15 : true) ||
                        ((_17 = (_16 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userUpdate) !== null && _16 !== void 0 ? _16 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userUpdate) !== null && _17 !== void 0 ? _17 : true) ||
                        ((_19 = (_18 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.userDelete) !== null && _18 !== void 0 ? _18 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userDelete) !== null && _19 !== void 0 ? _19 : true);
                }
                break;
            case client_1.NotificationType.role:
                if (relatedEntityType === 'create') {
                    enabled = (_21 = (_20 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleCreate) !== null && _20 !== void 0 ? _20 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleCreate) !== null && _21 !== void 0 ? _21 : true;
                }
                else if (relatedEntityType === 'update') {
                    enabled = (_23 = (_22 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleUpdate) !== null && _22 !== void 0 ? _22 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleUpdate) !== null && _23 !== void 0 ? _23 : true;
                }
                else if (relatedEntityType === 'delete') {
                    enabled = (_25 = (_24 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleDelete) !== null && _24 !== void 0 ? _24 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleDelete) !== null && _25 !== void 0 ? _25 : true;
                }
                else {
                    // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Role-Notification aktiviert ist
                    enabled = ((_27 = (_26 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleCreate) !== null && _26 !== void 0 ? _26 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleCreate) !== null && _27 !== void 0 ? _27 : true) ||
                        ((_29 = (_28 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleUpdate) !== null && _28 !== void 0 ? _28 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleUpdate) !== null && _29 !== void 0 ? _29 : true) ||
                        ((_31 = (_30 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.roleDelete) !== null && _30 !== void 0 ? _30 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleDelete) !== null && _31 !== void 0 ? _31 : true);
                }
                break;
            case client_1.NotificationType.worktime:
                if (relatedEntityType === 'start') {
                    enabled = (_33 = (_32 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeStart) !== null && _32 !== void 0 ? _32 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeStart) !== null && _33 !== void 0 ? _33 : true;
                }
                else if (relatedEntityType === 'stop') {
                    enabled = (_35 = (_34 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeStop) !== null && _34 !== void 0 ? _34 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeStop) !== null && _35 !== void 0 ? _35 : true;
                }
                else if (relatedEntityType === 'auto_stop') {
                    enabled = (_37 = (_36 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeAutoStop) !== null && _36 !== void 0 ? _36 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeAutoStop) !== null && _37 !== void 0 ? _37 : true;
                }
                else {
                    // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Worktime-Notification aktiviert ist
                    enabled = ((_39 = (_38 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeStart) !== null && _38 !== void 0 ? _38 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeStart) !== null && _39 !== void 0 ? _39 : true) ||
                        ((_41 = (_40 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeStop) !== null && _40 !== void 0 ? _40 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeStop) !== null && _41 !== void 0 ? _41 : true) ||
                        ((_43 = (_42 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeAutoStop) !== null && _42 !== void 0 ? _42 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeAutoStop) !== null && _43 !== void 0 ? _43 : true);
                }
                break;
            case client_1.NotificationType.worktime_manager_stop:
                enabled = (_45 = (_44 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.worktimeManagerStop) !== null && _44 !== void 0 ? _44 : systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeManagerStop) !== null && _45 !== void 0 ? _45 : true;
                break;
            // Neue Organisation-spezifische Benachrichtigungen
            case client_1.NotificationType.joinRequest:
                enabled = (_46 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.joinRequestReceived) !== null && _46 !== void 0 ? _46 : true; // Default: aktiviert
                break;
            case client_1.NotificationType.joinApproved:
                enabled = (_47 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.joinRequestApproved) !== null && _47 !== void 0 ? _47 : true; // Default: aktiviert
                break;
            case client_1.NotificationType.joinRejected:
                enabled = (_48 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.joinRequestRejected) !== null && _48 !== void 0 ? _48 : true; // Default: aktiviert
                break;
            case client_1.NotificationType.organizationInvitation:
                enabled = (_49 = userSettings === null || userSettings === void 0 ? void 0 : userSettings.organizationInvitationReceived) !== null && _49 !== void 0 ? _49 : true; // Default: aktiviert
                break;
            case client_1.NotificationType.system:
                enabled = true; // System-Benachrichtigungen sind immer aktiviert
                break;
        }
        return enabled;
    });
}
// Hilfsfunktion zum Erstellen einer Benachrichtigung nur wenn sie aktiviert ist
function createNotificationIfEnabled(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const enabled = yield isNotificationEnabled(data.userId, data.type, data.relatedEntityType);
            if (!enabled) {
                console.log(`Notification nicht erstellt: Typ ${data.type}, EntityType ${data.relatedEntityType} für User ${data.userId} ist deaktiviert`);
                return false;
            }
            const notification = yield prisma_1.prisma.notification.create({
                data: {
                    userId: data.userId,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    relatedEntityId: data.relatedEntityId,
                    relatedEntityType: data.relatedEntityType
                }
            });
            console.log(`Notification erstellt: ID ${notification.id}, Typ ${data.type}, EntityType ${data.relatedEntityType} für User ${data.userId}`);
            return true;
        }
        catch (error) {
            console.error('Fehler beim Erstellen der Notification:', error);
            console.error('Notification-Daten:', {
                userId: data.userId,
                type: data.type,
                relatedEntityType: data.relatedEntityType,
                relatedEntityId: data.relatedEntityId,
                title: data.title
            });
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
        const notifications = yield prisma_1.prisma.notification.findMany({
            where: filter,
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(notifications);
    }
    catch (error) {
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
        const notification = yield prisma_1.prisma.notification.findUnique({
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
        const userSettings = yield prisma_1.prisma.userNotificationSettings.findFirst({
            where: { userId: data.userId }
        });
        // System-Einstellungen abrufen
        const systemSettings = yield prisma_1.prisma.notificationSettings.findFirst();
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
        const notification = yield prisma_1.prisma.notification.create({
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
        const notification = yield prisma_1.prisma.notification.findUnique({
            where: { id: parseInt(id) }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        if (notification.userId !== userId) {
            return res.status(403).json({ message: 'Zugriff verweigert' });
        }
        // Aktualisieren der Benachrichtigung
        const updatedNotification = yield prisma_1.prisma.notification.update({
            where: { id: parseInt(id) },
            data: updateData
        });
        res.json(updatedNotification);
    }
    catch (error) {
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
        const notification = yield prisma_1.prisma.notification.findFirst({
            where: {
                id: parseInt(id),
                userId
            }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        // Benachrichtigung löschen
        yield prisma_1.prisma.notification.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Benachrichtigung wurde gelöscht' });
    }
    catch (error) {
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
        yield prisma_1.prisma.notification.updateMany({
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
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.markAllAsRead = markAllAsRead;
// Benachrichtigungseinstellungen abrufen
const getNotificationSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Systemweite Einstellungen abrufen
        const systemSettings = yield prisma_1.prisma.notificationSettings.findFirst();
        // Benutzereinstellungen abrufen
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        let userSettings = null;
        if (userId) {
            userSettings = yield prisma_1.prisma.userNotificationSettings.findFirst({
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
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getNotificationSettings = getNotificationSettings;
// Alle Benachrichtigungen eines Benutzers abrufen
const getUserNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Unterstütze sowohl req.user?.id als auch req.userId für Kompatibilität
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || (req.userId ? parseInt(req.userId.toString(), 10) : null);
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
            prisma_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma_1.prisma.notification.count({ where })
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
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getUserNotifications = getUserNotifications;
// Ungelesene Benachrichtigungen zählen
const countUnreadNotifications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Unterstütze sowohl req.user?.id als auch req.userId für Kompatibilität
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || (req.userId ? parseInt(req.userId.toString(), 10) : null);
        if (!userId) {
            return res.status(401).json({ message: 'Nicht autorisiert' });
        }
        const count = yield prisma_1.prisma.notification.count({
            where: {
                userId,
                read: false
            }
        });
        res.json({ count });
    }
    catch (error) {
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.countUnreadNotifications = countUnreadNotifications;
// Benachrichtigung als gelesen markieren
const markNotificationAsRead = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        // Unterstütze sowohl req.user?.id als auch req.userId für Kompatibilität
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || (req.userId ? parseInt(req.userId.toString(), 10) : null);
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
        const notification = yield prisma_1.prisma.notification.findFirst({
            where: {
                id: parseInt(id),
                userId
            }
        });
        if (!notification) {
            return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
        }
        // Als gelesen markieren
        const updatedNotification = yield prisma_1.prisma.notification.update({
            where: { id: parseInt(id) },
            data: { read: true }
        });
        res.json(updatedNotification);
    }
    catch (error) {
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
        yield prisma_1.prisma.notification.updateMany({
            where: {
                userId,
                read: false
            },
            data: { read: true }
        });
        res.json({ message: 'Alle Benachrichtigungen wurden als gelesen markiert' });
    }
    catch (error) {
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
        yield prisma_1.prisma.notification.deleteMany({
            where: { userId }
        });
        res.json({ message: 'Alle Benachrichtigungen wurden gelöscht' });
    }
    catch (error) {
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.deleteAllNotifications = deleteAllNotifications;
// Neue Funktion: Organisation-spezifische Benachrichtigung erstellen
function createOrganizationNotification(data) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let title = '';
            let message = data.message || '';
            // Title und Message basierend auf Typ setzen
            switch (data.type) {
                case 'joinRequest':
                    title = 'Neue Beitrittsanfrage';
                    message = message || 'Eine neue Beitrittsanfrage ist eingegangen.';
                    break;
                case 'joinApproved':
                    title = 'Beitrittsanfrage genehmigt';
                    message = message || 'Ihre Beitrittsanfrage wurde genehmigt.';
                    break;
                case 'joinRejected':
                    title = 'Beitrittsanfrage abgelehnt';
                    message = message || 'Ihre Beitrittsanfrage wurde abgelehnt.';
                    break;
                case 'organizationInvitation':
                    title = 'Organisations-Einladung';
                    message = message || 'Sie wurden zu einer Organisation eingeladen.';
                    break;
                default:
                    return false;
            }
            // Prüfe ob Benachrichtigungen für diesen Typ aktiviert sind
            const enabled = yield isNotificationEnabled(data.userId, data.type);
            if (!enabled) {
                return false;
            }
            // Erstelle die Benachrichtigung
            const notification = yield prisma_1.prisma.notification.create({
                data: {
                    userId: data.userId,
                    title,
                    message,
                    type: data.type,
                    relatedEntityId: data.relatedEntityId,
                    relatedEntityType: 'organization'
                }
            });
            return true;
        }
        catch (error) {
            console.error('Fehler beim Erstellen der Organisation-Benachrichtigung:', error);
            return false;
        }
    });
}
// Neue Funktion: Beitrittsanfrage-Benachrichtigung an Admin senden
function notifyOrganizationAdmins(organizationId, joinRequestId, requesterEmail) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Finde alle Admins der Organisation
            const { getUserOrganizationFilter } = yield Promise.resolve().then(() => __importStar(require('../middleware/organization')));
            // Erstelle ein Request-Objekt für den Filter (benötigt req.organizationId)
            const mockReq = { organizationId };
            const userFilter = getUserOrganizationFilter(mockReq);
            const orgAdmins = yield prisma_1.prisma.user.findMany({
                where: Object.assign(Object.assign({}, userFilter), { roles: {
                        some: {
                            role: {
                                organizationId,
                                name: {
                                    in: ['admin', 'organization_admin']
                                }
                            }
                        }
                    } })
            });
            // Sende Benachrichtigung an alle Admins
            for (const admin of orgAdmins) {
                yield createOrganizationNotification({
                    organizationId,
                    userId: admin.id,
                    type: 'joinRequest',
                    relatedEntityId: joinRequestId,
                    message: `Neue Beitrittsanfrage von ${requesterEmail}`
                });
            }
        }
        catch (error) {
            console.error('Fehler beim Benachrichtigen der Organisation-Admins:', error);
        }
    });
}
// Neue Funktion: Benachrichtigung über Beitrittsanfrage-Status
function notifyJoinRequestStatus(userId, organizationName, status, joinRequestId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const type = status === 'approved' ? 'joinApproved' : 'joinRejected';
            const message = status === 'approved'
                ? `Ihre Beitrittsanfrage für ${organizationName} wurde genehmigt.`
                : `Ihre Beitrittsanfrage für ${organizationName} wurde abgelehnt.`;
            yield createOrganizationNotification({
                organizationId: 0, // Wird für diese Benachrichtigung nicht benötigt
                userId,
                type,
                relatedEntityId: joinRequestId,
                message
            });
        }
        catch (error) {
            console.error('Fehler beim Benachrichtigen über Beitrittsanfrage-Status:', error);
        }
    });
}
//# sourceMappingURL=notificationController.js.map