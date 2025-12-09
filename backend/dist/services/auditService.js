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
exports.logSettingsChange = exports.logAuditEvent = void 0;
const logger_1 = require("../utils/logger");
/**
 * Erstellt einen Audit-Log-Eintrag
 *
 * @param entry - Audit-Log-Daten
 */
const logAuditEvent = (entry) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Aktuell: Console-Logging
        // Später: In AuditLog-Tabelle speichern
        logger_1.logger.log('[AUDIT]', JSON.stringify({
            timestamp: new Date().toISOString(),
            organizationId: entry.organizationId,
            userId: entry.userId,
            action: entry.action,
            entityType: entry.entityType,
            entityId: entry.entityId,
            changes: entry.changes,
            ipAddress: entry.ipAddress,
            userAgent: entry.userAgent
        }, null, 2));
        // TODO: Wenn AuditLog-Model existiert:
        // await prisma.auditLog.create({ data: { ... } });
    }
    catch (error) {
        logger_1.logger.error('Error logging audit event:', error);
        // Fehler beim Logging sollten die Hauptoperation nicht blockieren
    }
});
exports.logAuditEvent = logAuditEvent;
/**
 * Protokolliert Settings-Änderungen
 *
 * @param organizationId - ID der Organisation
 * @param userId - ID des Users, der die Änderung vorgenommen hat
 * @param oldSettings - Alte Settings
 * @param newSettings - Neue Settings
 * @param ipAddress - IP-Adresse des Requests
 * @param userAgent - User-Agent des Requests
 */
const logSettingsChange = (organizationId, userId, oldSettings, newSettings, ipAddress, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    // Finde geänderte Felder
    const changes = {};
    // Prüfe API-Settings-Änderungen
    const apiFields = [
        'lobbyPms.apiKey',
        'lobbyPms.apiUrl',
        'lobbyPms.syncEnabled',
        'doorSystem.clientSecret',
        'doorSystem.clientId',
        'sire.apiKey',
        'sire.apiSecret',
        'sire.enabled',
        'boldPayment.apiKey',
        'boldPayment.environment',
        'whatsapp.apiKey',
        'whatsapp.apiSecret',
        'whatsapp.provider'
    ];
    for (const field of apiFields) {
        const [section, key] = field.split('.');
        const oldValue = (_a = oldSettings === null || oldSettings === void 0 ? void 0 : oldSettings[section]) === null || _a === void 0 ? void 0 : _a[key];
        const newValue = (_b = newSettings === null || newSettings === void 0 ? void 0 : newSettings[section]) === null || _b === void 0 ? void 0 : _b[key];
        if (oldValue !== newValue) {
            // Bei Secrets: Nur anzeigen dass geändert wurde, nicht den Wert
            if (key === 'apiKey' || key === 'apiSecret' || key === 'clientSecret' || key === 'smtpPass') {
                changes[field] = {
                    oldValue: oldValue ? '***' : undefined,
                    newValue: newValue ? '***' : undefined
                };
            }
            else {
                changes[field] = { oldValue, newValue };
            }
        }
    }
    if (Object.keys(changes).length > 0) {
        yield (0, exports.logAuditEvent)({
            organizationId,
            userId,
            action: 'settings_update',
            entityType: 'organization',
            entityId: organizationId,
            changes,
            ipAddress,
            userAgent
        });
    }
});
exports.logSettingsChange = logSettingsChange;
//# sourceMappingURL=auditService.js.map