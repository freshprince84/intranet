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
exports.updateUserNotificationSettings = exports.getUserNotificationSettings = exports.updateNotificationSettings = exports.getNotificationSettings = void 0;
const notificationValidation_1 = require("../validation/notificationValidation");
const prisma_1 = require("../utils/prisma");
const notificationSettingsCache_1 = require("../services/notificationSettingsCache");
// System-weite Notification-Einstellungen abrufen
const getNotificationSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const settings = yield prisma_1.prisma.notificationSettings.findFirst();
        // Standardeinstellungen, falls keine existieren
        if (!settings) {
            return res.json({
                taskCreate: true,
                taskUpdate: true,
                taskDelete: true,
                taskStatusChange: true,
                requestCreate: true,
                requestUpdate: true,
                requestDelete: true,
                requestStatusChange: true,
                userCreate: true,
                userUpdate: true,
                userDelete: true,
                roleCreate: true,
                roleUpdate: true,
                roleDelete: true,
                worktimeStart: true,
                worktimeStop: true
            });
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Notification-Einstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.getNotificationSettings = getNotificationSettings;
// System-weite Notification-Einstellungen aktualisieren (Admin only)
const updateNotificationSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = req.body;
        // Validierung
        const validationError = (0, notificationValidation_1.validateNotificationSettings)(data);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        // Prüfen, ob bereits Einstellungen existieren
        const existingSettings = yield prisma_1.prisma.notificationSettings.findFirst();
        let settings;
        if (existingSettings) {
            // Aktualisieren existierender Einstellungen
            settings = yield prisma_1.prisma.notificationSettings.update({
                where: { id: existingSettings.id },
                data
            });
        }
        else {
            // Erstellen neuer Einstellungen
            settings = yield prisma_1.prisma.notificationSettings.create({
                data
            });
        }
        // Cache invalidation nach Update
        notificationSettingsCache_1.notificationSettingsCache.invalidateSystemSettings();
        res.json(settings);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Notification-Einstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.updateNotificationSettings = updateNotificationSettings;
// Benutzer-spezifische Notification-Einstellungen abrufen
const getUserNotificationSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    console.log('[SettingsController] getUserNotificationSettings aufgerufen');
    try {
        // Korrekte Extraktion der userId mit mehr Fehlertoleranz
        let userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId && req.userId) {
            userId = req.userId;
            console.log('[SettingsController] userId aus req.userId extrahiert:', userId);
        }
        if (!userId) {
            console.log('[SettingsController] Kein userId gefunden');
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // userId in number umwandeln, falls es ein String ist
        let numericUserId;
        if (typeof userId === 'string') {
            numericUserId = parseInt(userId, 10);
            if (isNaN(numericUserId)) {
                console.error('[SettingsController] Ungültige userId (keine Zahl):', userId);
                return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
            }
            console.log('[SettingsController] String-userId in Zahl umgewandelt:', numericUserId);
        }
        else {
            numericUserId = userId;
        }
        console.log('[SettingsController] Lade Benachrichtigungseinstellungen für Benutzer:', numericUserId);
        // Überprüfe, ob der Prisma-Client verfügbar ist
        if (!prisma_1.prisma) {
            console.error('[SettingsController] Prisma-Client nicht verfügbar');
            return res.status(500).json({ message: 'Interner Datenbankfehler' });
        }
        // Benutzereinstellungen abrufen
        const settings = yield prisma_1.prisma.userNotificationSettings.findFirst({
            where: { userId: numericUserId }
        });
        console.log('[SettingsController] Gefundene Einstellungen:', settings ? 'Ja' : 'Nein');
        // Wenn keine benutzer-spezifischen Einstellungen, dann System-Einstellungen abrufen
        if (!settings) {
            console.log('[SettingsController] Keine Benutzereinstellungen gefunden, lade System-Einstellungen');
            const systemSettings = yield prisma_1.prisma.notificationSettings.findFirst();
            console.log('[SettingsController] System-Einstellungen geladen:', !!systemSettings);
            // Default-Einstellungen mit Systemwerten oder Standardwerten
            return res.json({
                userId: numericUserId,
                taskCreate: (_b = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskCreate) !== null && _b !== void 0 ? _b : true,
                taskUpdate: (_c = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskUpdate) !== null && _c !== void 0 ? _c : true,
                taskDelete: (_d = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskDelete) !== null && _d !== void 0 ? _d : true,
                taskStatusChange: (_e = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.taskStatusChange) !== null && _e !== void 0 ? _e : true,
                requestCreate: (_f = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestCreate) !== null && _f !== void 0 ? _f : true,
                requestUpdate: (_g = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestUpdate) !== null && _g !== void 0 ? _g : true,
                requestDelete: (_h = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestDelete) !== null && _h !== void 0 ? _h : true,
                requestStatusChange: (_j = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.requestStatusChange) !== null && _j !== void 0 ? _j : true,
                userCreate: (_k = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userCreate) !== null && _k !== void 0 ? _k : true,
                userUpdate: (_l = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userUpdate) !== null && _l !== void 0 ? _l : true,
                userDelete: (_m = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.userDelete) !== null && _m !== void 0 ? _m : true,
                roleCreate: (_o = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleCreate) !== null && _o !== void 0 ? _o : true,
                roleUpdate: (_p = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleUpdate) !== null && _p !== void 0 ? _p : true,
                roleDelete: (_q = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.roleDelete) !== null && _q !== void 0 ? _q : true,
                worktimeStart: (_r = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeStart) !== null && _r !== void 0 ? _r : true,
                worktimeStop: (_s = systemSettings === null || systemSettings === void 0 ? void 0 : systemSettings.worktimeStop) !== null && _s !== void 0 ? _s : true
            });
        }
        console.log('[SettingsController] Sende Benutzereinstellungen zurück');
        res.json(settings);
    }
    catch (error) {
        console.error('[SettingsController] Fehler beim Abrufen der Benutzer-Notification-Einstellungen:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Benachrichtigungseinstellungen',
            error: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.getUserNotificationSettings = getUserNotificationSettings;
// Benutzer-spezifische Notification-Einstellungen aktualisieren
const updateUserNotificationSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Korrekte Extraktion der userId aus dem req.user-Objekt oder fallback auf req.userId
        let userId;
        if (req.user && req.user.id) {
            userId = req.user.id;
        }
        else if (req.userId) {
            userId = parseInt(req.userId.toString());
        }
        else {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        console.log('Aktualisiere Benachrichtigungseinstellungen für Benutzer:', userId);
        const data = Object.assign(Object.assign({}, req.body), { userId });
        // Validierung
        const validationError = (0, notificationValidation_1.validateUserNotificationSettings)(data);
        if (validationError) {
            return res.status(400).json({ message: validationError });
        }
        // Prüfen, ob bereits Einstellungen existieren
        const existingSettings = yield prisma_1.prisma.userNotificationSettings.findFirst({
            where: { userId }
        });
        let settings;
        if (existingSettings) {
            // Aktualisieren existierender Einstellungen
            settings = yield prisma_1.prisma.userNotificationSettings.update({
                where: { id: existingSettings.id },
                data
            });
        }
        else {
            // Erstellen neuer Einstellungen
            settings = yield prisma_1.prisma.userNotificationSettings.create({
                data
            });
        }
        // Cache invalidation nach Update
        notificationSettingsCache_1.notificationSettingsCache.invalidateUserSettings(userId);
        res.json(settings);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Benutzer-Notification-Einstellungen:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.updateUserNotificationSettings = updateUserNotificationSettings;
//# sourceMappingURL=settingsController.js.map