"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserNotificationSettings = exports.validateNotificationSettings = exports.validateNotification = exports.NotificationType = void 0;
// Definiere das NotificationType-Enum manuell, da es Probleme mit dem Import gibt
var NotificationType;
(function (NotificationType) {
    NotificationType["task"] = "task";
    NotificationType["request"] = "request";
    NotificationType["user"] = "user";
    NotificationType["role"] = "role";
    NotificationType["worktime"] = "worktime";
    NotificationType["system"] = "system";
    NotificationType["cerebro"] = "cerebro";
    NotificationType["worktime_manager_stop"] = "worktime_manager_stop";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
// Validierung für Benachrichtigungen
const validateNotification = (data) => {
    // Pflichtfelder prüfen
    if (!data.userId)
        return 'userId ist erforderlich';
    if (!data.title)
        return 'title ist erforderlich';
    if (!data.message)
        return 'message ist erforderlich';
    if (!data.type)
        return 'type ist erforderlich';
    // Typen prüfen
    if (typeof data.userId !== 'number')
        return 'userId muss eine Zahl sein';
    if (typeof data.title !== 'string')
        return 'title muss ein String sein';
    if (typeof data.message !== 'string')
        return 'message muss ein String sein';
    // Enum-Wert für NotificationType prüfen
    const validTypes = Object.values(NotificationType);
    if (!validTypes.includes(data.type)) {
        return `type muss einer der folgenden Werte sein: ${validTypes.join(', ')}`;
    }
    // Optionale Felder prüfen, wenn vorhanden
    if (data.relatedEntityId !== undefined && typeof data.relatedEntityId !== 'number') {
        return 'relatedEntityId muss eine Zahl sein';
    }
    if (data.relatedEntityType !== undefined && typeof data.relatedEntityType !== 'string') {
        return 'relatedEntityType muss ein String sein';
    }
    if (data.read !== undefined && typeof data.read !== 'boolean') {
        return 'read muss ein Boolean sein';
    }
    return null; // Keine Fehler
};
exports.validateNotification = validateNotification;
// Validierung für Benachrichtigungseinstellungen
const validateNotificationSettings = (data) => {
    // Alle Felder sind optional, aber wenn sie vorhanden sind, müssen sie Booleans sein
    const booleanFields = [
        'taskCreate', 'taskUpdate', 'taskDelete', 'taskStatusChange',
        'requestCreate', 'requestUpdate', 'requestDelete', 'requestStatusChange',
        'userCreate', 'userUpdate', 'userDelete',
        'roleCreate', 'roleUpdate', 'roleDelete',
        'worktimeStart', 'worktimeStop', 'worktimeAutoStop', 'worktimeManagerStop',
        'carticleCreate', 'carticleUpdate', 'carticleDelete', 'carticleLink', 'carticleMention'
    ];
    for (const field of booleanFields) {
        if (data[field] !== undefined && typeof data[field] !== 'boolean') {
            return `${field} muss ein Boolean sein`;
        }
    }
    return null; // Keine Fehler
};
exports.validateNotificationSettings = validateNotificationSettings;
// Validierung für Benutzer-Benachrichtigungseinstellungen
const validateUserNotificationSettings = (data) => {
    // userId ist Pflichtfeld
    if (!data.userId)
        return 'userId ist erforderlich';
    if (typeof data.userId !== 'number')
        return 'userId muss eine Zahl sein';
    // Restliche Felder mit validateNotificationSettings prüfen
    return (0, exports.validateNotificationSettings)(data);
};
exports.validateUserNotificationSettings = validateUserNotificationSettings;
//# sourceMappingURL=notificationValidation.js.map