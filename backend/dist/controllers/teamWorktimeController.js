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
exports.updateApprovedOvertimeHours = exports.updateUserWorktime = exports.getUserWorktimesByDay = exports.stopUserWorktime = exports.getActiveTeamWorktimes = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const translations_1 = require("../utils/translations");
const organization_1 = require("../middleware/organization");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Ruft alle Benutzer mit aktiver Zeiterfassung ab
 */
const getActiveTeamWorktimes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { teamId } = req.query;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        // Basisabfrage für aktive Zeiterfassungen
        let activeWorktimesQuery = Object.assign(Object.assign({}, worktimeFilter), { endTime: null });
        // Wenn eine Team-ID angegeben ist, filtere nach Benutzern in diesem Team
        if (teamId) {
            // Hier könnte eine Teamfilterung implementiert werden, wenn Teams existieren
            // Aktuell verwenden wir Branches als "Teams"
            activeWorktimesQuery = Object.assign(Object.assign({}, activeWorktimesQuery), { branchId: Number(teamId) });
        }
        // Hole alle aktiven Zeiterfassungen mit Benutzer- und Branch-Informationen
        const activeWorktimes = yield prisma_1.prisma.workTime.findMany({
            where: activeWorktimesQuery,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        normalWorkingHours: true,
                        approvedOvertimeHours: true
                    }
                },
                branch: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        res.json(activeWorktimes);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der aktiven Team-Zeiterfassungen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getActiveTeamWorktimes = getActiveTeamWorktimes;
/**
 * Stoppt die Zeiterfassung eines bestimmten Benutzers
 */
const stopUserWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const managerId = req.userId;
        const { userId, endTime } = req.body;
        if (!managerId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!userId) {
            return res.status(400).json({ message: 'Benutzer-ID ist erforderlich' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        // Finde die aktive Zeiterfassung des Benutzers
        const activeWorktime = yield prisma_1.prisma.workTime.findFirst({
            where: Object.assign(Object.assign({}, worktimeFilter), { userId: Number(userId), endTime: null }),
            include: {
                user: true,
                branch: true
            }
        });
        if (!activeWorktime) {
            return res.status(404).json({ message: 'Keine aktive Zeiterfassung für diesen Benutzer gefunden' });
        }
        // Verwende die übergebene Endzeit oder die aktuelle Zeit
        const now = endTime ? new Date(endTime) : new Date();
        // Aktualisiere die Zeiterfassung
        const worktime = yield prisma_1.prisma.workTime.update({
            where: { id: activeWorktime.id },
            data: Object.assign({ endTime: now }, (activeWorktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })),
            include: {
                branch: true,
                user: true
            }
        });
        // Erstelle eine Benachrichtigung für den Benutzer
        const userLang = yield (0, translations_1.getUserLanguage)(Number(userId));
        const notificationText = (0, translations_1.getSystemNotificationText)(userLang, 'worktime_manager_stop', undefined, undefined, worktime.branch.name);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: Number(userId),
            title: notificationText.title,
            message: notificationText.message,
            type: client_1.NotificationType.worktime_manager_stop,
            relatedEntityId: worktime.id,
            relatedEntityType: 'worktime_manager_stop'
        });
        res.json(worktime);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Stoppen der Benutzer-Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.stopUserWorktime = stopUserWorktime;
/**
 * Ruft die Zeiterfassungen eines Benutzers für einen bestimmten Tag ab
 */
const getUserWorktimesByDay = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const managerId = req.userId;
        const { userId, date } = req.query;
        if (!managerId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!date) {
            return res.status(400).json({ message: 'Datum ist erforderlich' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        // Datum parsen
        const queryDateStr = date;
        // Wir erstellen das Datum für den Anfang des Tages
        const dateParts = queryDateStr.split('-');
        if (dateParts.length !== 3) {
            return res.status(400).json({ message: 'Ungültiges Datumsformat' });
        }
        const year = parseInt(dateParts[0]);
        const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
        const day = parseInt(dateParts[2]);
        // Erstelle lokales Datum für den Anfang des Tages
        const localStartOfDay = new Date(year, month, day, 0, 0, 0);
        const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
        // Zeitzonenversatz berechnen
        const startOffsetMinutes = localStartOfDay.getTimezoneOffset();
        const endOffsetMinutes = localEndOfDay.getTimezoneOffset();
        // Kompensierte Zeiten erstellen für korrekte UTC-Darstellung
        const dayStart = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
        const dayEnd = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);
        // Hole alle Zeiterfassungen für den angegebenen Tag
        const worktimes = yield prisma_1.prisma.workTime.findMany({
            where: Object.assign(Object.assign(Object.assign({}, worktimeFilter), (userId ? { userId: Number(userId) } : {})), { startTime: {
                    gte: dayStart,
                    lte: dayEnd
                } }),
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        normalWorkingHours: true,
                        approvedOvertimeHours: true
                    }
                },
                branch: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        res.json(worktimes);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Zeiterfassungen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getUserWorktimesByDay = getUserWorktimesByDay;
/**
 * Aktualisiert eine Zeiterfassung
 */
const updateUserWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const managerId = req.userId;
        const { id, startTime, endTime } = req.body;
        if (!managerId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!id) {
            return res.status(400).json({ message: 'Zeiterfassungs-ID ist erforderlich' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        // Finde die Zeiterfassung
        const worktime = yield prisma_1.prisma.workTime.findFirst({
            where: Object.assign(Object.assign({}, worktimeFilter), { id: Number(id) }),
            include: {
                user: true,
                branch: true
            }
        });
        if (!worktime) {
            return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
        }
        // Aktualisiere die Zeiterfassung
        const updatedWorktime = yield prisma_1.prisma.workTime.update({
            where: { id: Number(id) },
            data: {
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined
            },
            include: {
                branch: true,
                user: true
            }
        });
        // Erstelle eine Benachrichtigung für den Benutzer
        const userLang = yield (0, translations_1.getUserLanguage)(worktime.userId);
        const notificationText = (0, translations_1.getSystemNotificationText)(userLang, 'worktime_updated', undefined, undefined, worktime.branch.name);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: worktime.userId,
            title: notificationText.title,
            message: notificationText.message,
            type: client_1.NotificationType.worktime_manager_stop,
            relatedEntityId: worktime.id,
            relatedEntityType: 'worktime_update'
        });
        res.json(updatedWorktime);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateUserWorktime = updateUserWorktime;
/**
 * Aktualisiert die bewilligten Überstunden eines Benutzers
 */
const updateApprovedOvertimeHours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const managerId = req.userId;
        const { userId, approvedOvertimeHours } = req.body;
        if (!managerId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!userId) {
            return res.status(400).json({ message: 'Benutzer-ID ist erforderlich' });
        }
        if (approvedOvertimeHours === undefined || approvedOvertimeHours < 0) {
            return res.status(400).json({ message: 'Gültige bewilligte Überstunden sind erforderlich' });
        }
        // Datenisolation: Nur User der Organisation
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        // Prüfe ob User zur Organisation gehört
        const user = yield prisma_1.prisma.user.findFirst({
            where: Object.assign(Object.assign({}, userFilter), { id: Number(userId) })
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden oder gehört nicht zu Ihrer Organisation' });
        }
        // Aktualisiere die bewilligten Überstunden des Benutzers
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: Number(userId) },
            data: {
                approvedOvertimeHours: Number(approvedOvertimeHours)
            },
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                normalWorkingHours: true,
                approvedOvertimeHours: true
            }
        });
        // Erstelle eine Benachrichtigung für den Benutzer
        const userLang = yield (0, translations_1.getUserLanguage)(Number(userId));
        const notificationText = (0, translations_1.getSystemNotificationText)(userLang, 'overtime_updated', undefined, undefined, undefined, approvedOvertimeHours);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: Number(userId),
            title: notificationText.title,
            message: notificationText.message,
            type: client_1.NotificationType.worktime,
            relatedEntityId: updatedUser.id,
            relatedEntityType: 'overtime_update'
        });
        res.json(updatedUser);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Aktualisieren der bewilligten Überstunden:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateApprovedOvertimeHours = updateApprovedOvertimeHours;
//# sourceMappingURL=teamWorktimeController.js.map