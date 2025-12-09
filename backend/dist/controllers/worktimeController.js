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
exports.checkAndStopExceededWorktimes = exports.getActiveWorktime = exports.exportWorktimes = exports.getWorktimeStats = exports.updateWorktime = exports.deleteWorktime = exports.getWorktimes = exports.stopWorktime = exports.startWorktime = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../utils/prisma");
const ExcelJS = __importStar(require("exceljs"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const date_fns_tz_1 = require("date-fns-tz");
const notificationController_1 = require("./notificationController");
const organization_1 = require("../middleware/organization");
const logger_1 = require("../utils/logger");
const translations_1 = require("../utils/translations");
const worktimeCache_1 = require("../services/worktimeCache");
const startWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchId, startTime } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfe, ob bereits eine aktive Zeiterfassung existiert
        const activeWorktime = yield prisma_1.prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null
            }
        });
        if (activeWorktime) {
            return res.status(400).json({ message: 'Es läuft bereits eine Zeiterfassung' });
        }
        // Hole den Benutzer mit seinen Arbeitszeiteinstellungen
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: Number(userId) }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Prüfe ob bankDetails ausgefüllt ist (erforderlich für Zeiterfassung)
        if (!user.bankDetails || user.bankDetails.trim() === '') {
            return res.status(403).json({
                message: 'Bitte geben Sie zuerst Ihre Bankverbindung im Profil ein, bevor Sie die Zeiterfassung nutzen können.'
            });
        }
        // Verwende direkt das aktuelle Datum oder das übergebene Startdatum
        const now = startTime ? new Date(startTime) : new Date();
        // Erstelle das Datum für den Anfang und das Ende des aktuellen Tages (entsprechend getWorktimes)
        const year = now.getFullYear();
        const month = now.getMonth(); // Monate sind 0-basiert in JavaScript
        const day = now.getDate();
        // Erstelle lokales Datum für den Anfang des Tages
        const localStartOfDay = new Date(year, month, day, 0, 0, 0);
        const localEndOfDay = new Date(year, month, day, 23, 59, 59, 999);
        // Zeitzonenversatz berechnen
        const startOffsetMinutes = localStartOfDay.getTimezoneOffset();
        const endOffsetMinutes = localEndOfDay.getTimezoneOffset();
        // Kompensierte Zeiten erstellen für korrekte UTC-Darstellung
        const todayStart = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
        const todayEnd = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);
        // Protokolliere die berechneten Zeitgrenzen für bessere Nachvollziehbarkeit
        logger_1.logger.log(`Berechneter Tagesbeginn (kompensiert): ${todayStart.toISOString()}`);
        logger_1.logger.log(`Berechnetes Tagesende (kompensiert): ${todayEnd.toISOString()}`);
        // Hole alle Zeiterfassungen für heute
        const todaysWorktimes = yield prisma_1.prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                startTime: {
                    gte: todayStart,
                    lte: todayEnd
                },
                endTime: {
                    not: null
                }
            }
        });
        // Berechne die gesamte Arbeitszeit für heute in Millisekunden
        let totalWorkTimeMs = 0;
        // Protokolliere jede einzelne Zeiterfassung für bessere Transparenz
        logger_1.logger.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
        for (const workTime of todaysWorktimes) {
            if (workTime.endTime) {
                const workTimeMs = workTime.endTime.getTime() - workTime.startTime.getTime();
                const workTimeHours = workTimeMs / (1000 * 60 * 60);
                logger_1.logger.log(`Zeiterfassung ID ${workTime.id}: ${workTime.startTime.toISOString()} - ${workTime.endTime.toISOString()} = ${workTimeHours.toFixed(2)}h`);
                totalWorkTimeMs += workTimeMs;
            }
        }
        // Konvertiere Millisekunden in Stunden
        const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);
        // Wenn die gesamte Arbeitszeit die normale Arbeitszeit überschreitet, verhindere den Start
        if (totalWorkTimeHours >= user.normalWorkingHours) {
            logger_1.logger.log(`Schwellenwert erreicht oder überschritten. Verhindere Start der Zeiterfassung.`);
            return res.status(403).json({
                message: `Die tägliche Arbeitszeit von ${user.normalWorkingHours}h wurde bereits erreicht. Die Zeiterfassung kann erst am nächsten Tag wieder gestartet werden.`
            });
        }
        // Speichere die aktuelle Zeit direkt
        const worktime = yield prisma_1.prisma.workTime.create({
            data: {
                startTime: now,
                userId: Number(userId),
                branchId: Number(branchId),
                // Speichere die Zeitzone des Benutzers, um später die korrekte Anzeige zu ermöglichen
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                organizationId: req.organizationId || null
            },
            include: {
                branch: true
            }
        });
        logger_1.logger.log(`Zeiterfassung ID ${worktime.id} gespeichert mit Startzeit: ${worktime.startTime.toISOString()}`);
        // OPTIMIERUNG: Cache invalidieren
        worktimeCache_1.worktimeCache.invalidate(Number(userId));
        // Erstelle eine Benachrichtigung, wenn eingeschaltet
        const userLang = yield (0, translations_1.getUserLanguage)(Number(userId));
        const notificationText = (0, translations_1.getWorktimeNotificationText)(userLang, 'start', worktime.branch.name);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: Number(userId),
            title: notificationText.title,
            message: notificationText.message,
            type: client_1.NotificationType.worktime,
            relatedEntityId: worktime.id,
            relatedEntityType: 'start'
        });
        res.status(201).json(worktime);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Starten der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.startWorktime = startWorktime;
const stopWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { endTime, force } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Finde die aktive Zeiterfassung für den Benutzer
        const activeWorktime = yield prisma_1.prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null
            }
        });
        if (!activeWorktime) {
            return res.status(404).json({ message: 'Keine aktive Zeiterfassung gefunden' });
        }
        // VEREINFACHT: Verwende die aktuelle Zeit oder die übergebene endTime direkt
        const now = endTime ? new Date(endTime) : new Date();
        logger_1.logger.log(`Stoppe Zeiterfassung mit Endzeit: ${now.toISOString()}`);
        const worktime = yield prisma_1.prisma.workTime.update({
            where: { id: activeWorktime.id },
            data: Object.assign({ endTime: now }, (activeWorktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })),
            include: {
                branch: true,
                user: true
            }
        });
        logger_1.logger.log(`Gespeicherte Endzeit: ${worktime.endTime.toISOString()}`);
        // OPTIMIERUNG: Cache invalidieren
        worktimeCache_1.worktimeCache.invalidate(Number(userId));
        // Erstelle eine Benachrichtigung, wenn eingeschaltet
        const userLang = yield (0, translations_1.getUserLanguage)(Number(userId));
        const notificationText = (0, translations_1.getWorktimeNotificationText)(userLang, 'stop', worktime.branch.name);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: Number(userId),
            title: notificationText.title,
            message: notificationText.message,
            type: client_1.NotificationType.worktime,
            relatedEntityId: worktime.id,
            relatedEntityType: 'stop'
        });
        res.json(worktime);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Stoppen der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.stopWorktime = stopWorktime;
const getWorktimes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Benutzer abrufen, um die Zeitzone zu bestimmen
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: Number(userId) }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        let whereClause = Object.assign({}, (0, organization_1.getDataIsolationFilter)(req, 'worktime'));
        if (date) {
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
            // Kompensierte Zeiten erstellen
            const compensatedStartOfDay = new Date(localStartOfDay.getTime() - startOffsetMinutes * 60000);
            const compensatedEndOfDay = new Date(localEndOfDay.getTime() - endOffsetMinutes * 60000);
            logger_1.logger.log(`Filterung für Datum: ${year}-${month + 1}-${day}`);
            logger_1.logger.log(`Original Start des Tages: ${localStartOfDay.toISOString()}`);
            logger_1.logger.log(`Kompensierter Start des Tages: ${compensatedStartOfDay.toISOString()}`);
            logger_1.logger.log(`Original Ende des Tages: ${localEndOfDay.toISOString()}`);
            logger_1.logger.log(`Kompensiertes Ende des Tages: ${compensatedEndOfDay.toISOString()}`);
            // Setze die Abfragebedingung
            whereClause = Object.assign(Object.assign({}, whereClause), { startTime: {
                    gte: compensatedStartOfDay,
                    lte: compensatedEndOfDay
                } });
        }
        const worktimes = yield prisma_1.prisma.workTime.findMany({
            where: whereClause,
            include: {
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
exports.getWorktimes = getWorktimes;
const deleteWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        const worktime = yield prisma_1.prisma.workTime.findFirst({
            where: Object.assign(Object.assign({}, worktimeFilter), { id: Number(id) })
        });
        if (!worktime) {
            return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
        }
        yield prisma_1.prisma.workTime.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Zeiterfassung erfolgreich gelöscht' });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Löschen der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteWorktime = deleteWorktime;
const updateWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { startTime, endTime, branchId } = req.body;
        const userId = req.userId;
        logger_1.logger.log('DEBUG updateWorktime Received:', JSON.stringify({ id, startTime, endTime, branchId, userId }));
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        // Prüfe, ob die Zeiterfassung existiert und zur Organisation gehört
        const worktime = yield prisma_1.prisma.workTime.findFirst({
            where: Object.assign(Object.assign({}, worktimeFilter), { id: Number(id) })
        });
        if (!worktime) {
            return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
        }
        // Daten für das Update vorbereiten
        const updateData = {};
        if (branchId)
            updateData.branchId = Number(branchId);
        // Hilfsfunktion zum sicheren Konvertieren von Datumsstrings
        const safeDateParse = (dateString) => {
            if (!dateString)
                return null;
            try {
                // Bereinige zuerst das Eingabeformat - entferne ein möglicherweise zusätzliches ":00" am Ende
                let cleanDateString = dateString;
                if (dateString.match(/T\d{2}:\d{2}:\d{2}:\d{2}$/)) {
                    // Format ist YYYY-MM-DDTHH:MM:SS:00 - entferne das letzte :00
                    cleanDateString = dateString.substring(0, dateString.lastIndexOf(':'));
                    logger_1.logger.log(`Bereinigter Datumsstring: ${cleanDateString}`);
                }
                // Jetzt normale Verarbeitung mit dem bereinigten String
                // Prüfe, ob es ein ISO-String im Format YYYY-MM-DDTHH:MM:SS ist
                if (typeof cleanDateString === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(cleanDateString)) {
                    // Manuell Datum erstellen aus den einzelnen Komponenten
                    const [datePart, timePart] = cleanDateString.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hours, minutes, seconds] = timePart.split(':').map(Number);
                    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
                }
                else {
                    // Fallback für andere Formate
                    const date = new Date(cleanDateString);
                    if (isNaN(date.getTime())) {
                        logger_1.logger.error(`Ungültiges Datum: ${cleanDateString}`);
                        return null;
                    }
                    return date;
                }
            }
            catch (error) {
                logger_1.logger.error(`Fehler beim Parsen des Datums ${dateString}:`, error);
                return null;
            }
        };
        // Startzeit aktualisieren (wenn vorhanden)
        if (startTime) {
            const parsedStartTime = safeDateParse(startTime);
            if (parsedStartTime) {
                updateData.startTime = parsedStartTime;
                logger_1.logger.log('Startzeit für Update:', parsedStartTime.toISOString());
            }
            else {
                return res.status(400).json({ message: 'Ungültiges Startzeit-Format' });
            }
        }
        // Endzeit aktualisieren (wenn vorhanden)
        if (endTime !== undefined) {
            // Wenn endTime null ist, setze es explizit auf null
            if (endTime === null) {
                updateData.endTime = null;
                logger_1.logger.log('Endzeit für Update: null');
            }
            else {
                const parsedEndTime = safeDateParse(endTime);
                if (parsedEndTime) {
                    updateData.endTime = parsedEndTime;
                    logger_1.logger.log('Endzeit für Update:', parsedEndTime.toISOString());
                }
                else {
                    return res.status(400).json({ message: 'Ungültiges Endzeit-Format' });
                }
            }
        }
        logger_1.logger.log('Final updateData:', JSON.stringify(updateData));
        const updatedWorktime = yield prisma_1.prisma.workTime.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                branch: true
            }
        });
        res.json(updatedWorktime);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateWorktime = updateWorktime;
const getWorktimeStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { week, quinzena } = req.query;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Bestimme Periodentyp und Startdatum
        const isQuinzena = !!quinzena;
        let periodStartStr = (quinzena || week);
        // Fallback: Aktuelle Woche/Quinzena berechnen
        if (!periodStartStr) {
            const today = new Date();
            if (isQuinzena) {
                // Berechne aktuelle Quinzena
                const day = today.getDate();
                const quinzenaStart = day <= 15
                    ? new Date(today.getFullYear(), today.getMonth(), 1)
                    : new Date(today.getFullYear(), today.getMonth(), 16);
                periodStartStr = (0, date_fns_1.format)(quinzenaStart, 'yyyy-MM-dd');
            }
            else {
                const monday = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
                periodStartStr = (0, date_fns_1.format)(monday, 'yyyy-MM-dd');
            }
        }
        // Berechne Periodenende und Anzahl der Tage
        let periodEndStr;
        let daysInPeriod;
        if (isQuinzena) {
            // Quinzena: monatsbasiert
            // Parse periodStartStr sicher (YYYY-MM-DD) um Zeitzonenprobleme zu vermeiden
            const [startYear, startMonth, startDay] = periodStartStr.split('-').map(Number);
            const year = startYear;
            const month = startMonth - 1; // 0-11
            const day = startDay;
            if (day === 1) {
                // Erste Quinzena: 1.-15.
                const endDate = new Date(year, month, 15);
                periodEndStr = (0, date_fns_1.format)(endDate, 'yyyy-MM-dd');
                daysInPeriod = 15;
            }
            else {
                // Zweite Quinzena: 16.-Monatsende
                const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
                const endDate = new Date(year, month, lastDayOfMonth);
                periodEndStr = (0, date_fns_1.format)(endDate, 'yyyy-MM-dd');
                daysInPeriod = lastDayOfMonth - 15;
            }
        }
        else {
            // Woche: 7 Tage
            const tempDate = new Date(periodStartStr);
            tempDate.setDate(tempDate.getDate() + 6); // Sonntag
            periodEndStr = (0, date_fns_1.format)(tempDate, 'yyyy-MM-dd');
            daysInPeriod = 7;
        }
        // KORREKT: Tagesgrenzen als lokale Zeit berechnen (ohne UTC-Konvertierung)
        // Die Datenbank speichert Zeiten als lokale Zeit, daher müssen die Tagesgrenzen auch als lokale Zeit sein
        // Siehe DATENBANKSCHEMA.md: "startTime DateTime // Enthält die lokale Systemzeit des Benutzers ohne UTC-Konvertierung"
        // Parse periodStartStr und periodEndStr (Format: YYYY-MM-DD)
        const [startYear, startMonth, startDay] = periodStartStr.split('-').map(Number);
        const [endYear, endMonth, endDay] = periodEndStr.split('-').map(Number);
        // Erstelle lokale Datum-Objekte für den Anfang und das Ende des Zeitraums
        // WICHTIG: Diese werden als lokale Zeit interpretiert, nicht als UTC
        const periodStart = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
        const periodEnd = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
        // Aktuelle Zeit für aktive Zeitmessungen (UTC)
        // Date.now() gibt UTC-Millisekunden zurück, new Date() erstellt UTC-Date-Objekt
        const nowUtc = new Date(Date.now());
        // Direkte Suche nach den Einträgen mit lokalen Zeitgrenzen
        // WICHTIG: Auch aktive Zeitmessungen (endTime: null) holen, die im Zeitraum starten
        // ODER die vor dem Zeitraum starten aber noch aktiv sind (können in den Zeitraum hineinreichen)
        const entries = yield prisma_1.prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                OR: [
                    // Einträge, die im Zeitraum starten (abgeschlossen oder aktiv)
                    {
                        startTime: {
                            gte: periodStart,
                            lte: periodEnd
                        }
                    },
                    // Aktive Einträge, die vor dem Zeitraum starten aber noch aktiv sind
                    {
                        startTime: {
                            lt: periodStart
                        },
                        endTime: null
                    }
                ]
            },
            include: {
                user: true,
            },
        });
        logger_1.logger.log(`Gefundene Einträge (${isQuinzena ? 'Quinzena' : 'Woche'}): ${entries.length}`);
        // Erstelle Tagesdaten-Struktur
        let periodData;
        if (isQuinzena) {
            // Quinzena: Erstelle Array für alle Tage
            periodData = [];
            // Parse periodStartStr sicher (YYYY-MM-DD)
            const [startYear, startMonth, startDay] = periodStartStr.split('-').map(Number);
            for (let i = 0; i < daysInPeriod; i++) {
                // Verwende UTC-Datum um Zeitzonenprobleme zu vermeiden
                const currentDate = new Date(Date.UTC(startYear, startMonth - 1, startDay + i, 12, 0, 0));
                const dateStr = (0, date_fns_1.format)(currentDate, 'yyyy-MM-dd');
                const dayName = (0, date_fns_1.format)(currentDate, 'EEEE', { locale: locale_1.de }); // Wochentag
                periodData.push({
                    day: dayName,
                    hours: 0,
                    date: dateStr
                });
            }
            logger_1.logger.log(`Quinzena periodData erstellt: ${periodData.length} Tage von ${periodStartStr} bis ${periodEndStr}`);
            logger_1.logger.log('PeriodData:', periodData.map(d => `${d.date}: ${d.day}`));
        }
        else {
            // Woche: Wochentage (bestehend)
            periodData = [
                { day: "Montag", hours: 0, date: "" },
                { day: "Dienstag", hours: 0, date: "" },
                { day: "Mittwoch", hours: 0, date: "" },
                { day: "Donnerstag", hours: 0, date: "" },
                { day: "Freitag", hours: 0, date: "" },
                { day: "Samstag", hours: 0, date: "" },
                { day: "Sonntag", hours: 0, date: "" }
            ];
            // Berechne Datum für jeden Wochentag
            periodData.forEach((dayData, index) => {
                dayData.date = calculateDateFromWeekStart(periodStartStr, index);
            });
        }
        // Berechne die Gesamtstunden und verteile sie auf die Tage
        let totalHours = 0;
        let daysWorked = 0;
        // Für jeden Zeiteintrag berechnen wir die Arbeitszeit in Stunden
        entries.forEach(entry => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
            // Bestimme effektive Endzeit: Entweder gespeicherte Endzeit oder aktuelle Zeit (für aktive Zeitmessungen)
            let effectiveEndTime;
            if (entry.endTime) {
                // Abgeschlossene Zeitmessung: Verwende gespeicherte Endzeit
                effectiveEndTime = entry.endTime;
            }
            else {
                // Aktive Zeitmessung: Berechne aktuelle Zeit in der Zeitzone des Eintrags
                // WICHTIG: Wenn entry.timezone gespeichert ist, müssen wir die aktuelle Zeit
                // in dieser Zeitzone berechnen, nicht in UTC, um die korrekte Differenz zu erhalten
                // KORREKT: Wie im WorktimeTracker - direkte UTC-Differenz berechnen
                // Die Differenz zwischen zwei UTC-Zeiten ist immer korrekt, unabhängig von der Zeitzone
                // effectiveEndTime ist die aktuelle UTC-Zeit
                effectiveEndTime = new Date(Date.now());
                // Logging entfernt - keine UTC-Ausgaben mehr
            }
            // Für aktive Zeitmessungen: Berechne Differenz direkt (wie im Modal)
            // Für abgeschlossene Zeitmessungen: Verwende die Periodenbegrenzung
            let actualStartTime;
            let actualEndTime;
            let hoursWorked;
            if (entry.endTime === null) {
                // Aktive Zeitmessung: Berechne Differenz genau wie im Modal
                // KORREKT: Entferne 'Z' vom ISO-String, damit JavaScript die Zeit als lokal interpretiert
                // Die Differenz zwischen zwei UTC-Zeiten ist immer korrekt, unabhängig von der Zeitzone
                const startISOString = entry.startTime.toISOString();
                const startISOStringWithoutZ = startISOString.endsWith('Z')
                    ? startISOString.substring(0, startISOString.length - 1)
                    : startISOString;
                const startTimeDate = new Date(startISOStringWithoutZ);
                const now = new Date();
                const diff = now.getTime() - startTimeDate.getTime();
                hoursWorked = diff / (1000 * 60 * 60);
                // Für Verteilung: Verwende originale Zeiten
                actualStartTime = entry.startTime;
                actualEndTime = effectiveEndTime;
            }
            else {
                // Abgeschlossene Zeitmessung: Verwende Periodenbegrenzung
                actualStartTime = entry.startTime < periodStart ? periodStart : entry.startTime;
                actualEndTime = effectiveEndTime > periodEnd ? periodEnd : effectiveEndTime;
                // Nur berechnen, wenn tatsächlich Zeit im Zeitraum liegt
                if (actualStartTime < actualEndTime) {
                    // Berechnung der Arbeitszeit aus lokalen Komponenten (ohne getTime() - verboten!)
                    // Berechne Tage-Differenz manuell
                    const daysDiff = (actualEndTime.getFullYear() - actualStartTime.getFullYear()) * 365.25 +
                        (actualEndTime.getMonth() - actualStartTime.getMonth()) * 30.44 +
                        (actualEndTime.getDate() - actualStartTime.getDate());
                    const daysDiffMs = Math.floor(daysDiff) * 86400000;
                    // Berechne Zeit-Differenz innerhalb des Tages
                    const timeDiffMs = (actualEndTime.getHours() - actualStartTime.getHours()) * 3600000 +
                        (actualEndTime.getMinutes() - actualStartTime.getMinutes()) * 60000 +
                        (actualEndTime.getSeconds() - actualStartTime.getSeconds()) * 1000 +
                        (actualEndTime.getMilliseconds() - actualStartTime.getMilliseconds());
                    const workTime = daysDiffMs + timeDiffMs;
                    // Umrechnung in Stunden
                    hoursWorked = workTime / (1000 * 60 * 60);
                }
                else {
                    hoursWorked = 0;
                }
            }
            // Nur berechnen, wenn tatsächlich Zeit im Zeitraum liegt
            if (hoursWorked > 0 && actualStartTime < actualEndTime) {
                // Für die Verteilung auf Tage: Verwende lokale Zeit wenn timezone vorhanden
                if (entry.timezone) {
                    // Verwende Intl.DateTimeFormat um lokale Zeitkomponenten zu extrahieren
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: entry.timezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                    });
                    // Extrahiere lokale Datumskomponenten für Start
                    const startParts = formatter.formatToParts(actualStartTime);
                    const startYear = parseInt(((_a = startParts.find(p => p.type === 'year')) === null || _a === void 0 ? void 0 : _a.value) || '0');
                    const startMonth = parseInt(((_b = startParts.find(p => p.type === 'month')) === null || _b === void 0 ? void 0 : _b.value) || '0') - 1;
                    const startDay = parseInt(((_c = startParts.find(p => p.type === 'day')) === null || _c === void 0 ? void 0 : _c.value) || '0');
                    // WICHTIG: Für aktive Zeitmessungen - immer dem Starttag zuordnen
                    // Auch wenn die Zeitmessung über Mitternacht hinausgeht, gehört sie zum Starttag
                    if (entry.endTime === null) {
                        // Aktive Zeitmessung: Alles dem Starttag zuordnen
                        const dateString = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
                        const dayEntry = periodData.find(d => d.date === dateString);
                        if (dayEntry) {
                            const oldHours = dayEntry.hours;
                            dayEntry.hours += hoursWorked;
                            if (hoursWorked > 0 && oldHours === 0) {
                                daysWorked++;
                            }
                        }
                        else {
                            logger_1.logger.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
                        }
                    }
                    else {
                        // Abgeschlossene Zeitmessung: Prüfe ob Start und Ende auf dem gleichen lokalen Tag liegen
                        const endParts = formatter.formatToParts(actualEndTime);
                        const endYear = parseInt(((_d = endParts.find(p => p.type === 'year')) === null || _d === void 0 ? void 0 : _d.value) || '0');
                        const endMonth = parseInt(((_e = endParts.find(p => p.type === 'month')) === null || _e === void 0 ? void 0 : _e.value) || '0') - 1;
                        const endDay = parseInt(((_f = endParts.find(p => p.type === 'day')) === null || _f === void 0 ? void 0 : _f.value) || '0');
                        const sameDay = startYear === endYear && startMonth === endMonth && startDay === endDay;
                        if (sameDay) {
                            // Einfach: Alles diesem Tag zuordnen
                            const dateString = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
                            const dayEntry = periodData.find(d => d.date === dateString);
                            if (dayEntry) {
                                const oldHours = dayEntry.hours;
                                dayEntry.hours += hoursWorked;
                                if (hoursWorked > 0 && oldHours === 0) {
                                    daysWorked++;
                                }
                            }
                            else {
                                logger_1.logger.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
                            }
                        }
                        else {
                            // Mehrere Tage: Verteile proportional
                            // Iteriere über alle betroffenen lokalen Tage
                            let currentYear = startYear;
                            let currentMonth = startMonth;
                            let currentDay = startDay;
                            while (currentYear < endYear ||
                                (currentYear === endYear && currentMonth < endMonth) ||
                                (currentYear === endYear && currentMonth === endMonth && currentDay <= endDay)) {
                                // Erstelle UTC-Date-Objekte für Tagesbeginn und -ende (als UTC interpretiert)
                                const dayStartUtcTemp = new Date(Date.UTC(currentYear, currentMonth, currentDay, 0, 0, 0, 0));
                                const dayEndUtcTemp = new Date(Date.UTC(currentYear, currentMonth, currentDay, 23, 59, 59, 999));
                                // Konvertiere zu lokaler Zeit, um die korrekten UTC-Zeitpunkte zu erhalten
                                const dayStartLocal = (0, date_fns_tz_1.toZonedTime)(dayStartUtcTemp, entry.timezone);
                                const dayEndLocal = (0, date_fns_tz_1.toZonedTime)(dayEndUtcTemp, entry.timezone);
                                // Setze die korrekten Stunden/Minuten/Sekunden für Start und Ende
                                if (currentYear === startYear && currentMonth === startMonth && currentDay === startDay) {
                                    // Verwende die lokalen Komponenten vom Start
                                    const startPartsFull = new Intl.DateTimeFormat('en-US', {
                                        timeZone: entry.timezone,
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    }).formatToParts(actualStartTime);
                                    const startHour = parseInt(((_g = startPartsFull.find(p => p.type === 'hour')) === null || _g === void 0 ? void 0 : _g.value) || '0');
                                    const startMinute = parseInt(((_h = startPartsFull.find(p => p.type === 'minute')) === null || _h === void 0 ? void 0 : _h.value) || '0');
                                    const startSecond = parseInt(((_j = startPartsFull.find(p => p.type === 'second')) === null || _j === void 0 ? void 0 : _j.value) || '0');
                                    dayStartLocal.setHours(startHour, startMinute, startSecond, 0);
                                }
                                else {
                                    dayStartLocal.setHours(0, 0, 0, 0);
                                }
                                if (currentYear === endYear && currentMonth === endMonth && currentDay === endDay) {
                                    // Verwende die lokalen Komponenten vom Ende
                                    const endPartsFull = new Intl.DateTimeFormat('en-US', {
                                        timeZone: entry.timezone,
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false
                                    }).formatToParts(actualEndTime);
                                    const endHour = parseInt(((_k = endPartsFull.find(p => p.type === 'hour')) === null || _k === void 0 ? void 0 : _k.value) || '0');
                                    const endMinute = parseInt(((_l = endPartsFull.find(p => p.type === 'minute')) === null || _l === void 0 ? void 0 : _l.value) || '0');
                                    const endSecond = parseInt(((_m = endPartsFull.find(p => p.type === 'second')) === null || _m === void 0 ? void 0 : _m.value) || '0');
                                    dayEndLocal.setHours(endHour, endMinute, endSecond, 999);
                                }
                                else {
                                    dayEndLocal.setHours(23, 59, 59, 999);
                                }
                                // Konvertiere lokale Zeiten zurück zu UTC für Berechnung
                                const dayStartUtc = (0, date_fns_tz_1.fromZonedTime)(dayStartLocal, entry.timezone);
                                const dayEndUtc = (0, date_fns_tz_1.fromZonedTime)(dayEndLocal, entry.timezone);
                                // Begrenze auf actualStartTime und actualEndTime
                                const dayStartActual = dayStartUtc < actualStartTime ? actualStartTime : dayStartUtc;
                                const dayEndActual = dayEndUtc > actualEndTime ? actualEndTime : dayEndUtc;
                                // Berechne Stunden für diesen Tag
                                const dayWorkTime = dayEndActual.getTime() - dayStartActual.getTime();
                                const dayHours = dayWorkTime / (1000 * 60 * 60);
                                if (dayHours > 0) {
                                    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
                                    const dayEntry = periodData.find(d => d.date === dateString);
                                    if (dayEntry) {
                                        const oldHours = dayEntry.hours;
                                        dayEntry.hours += dayHours;
                                        if (dayHours > 0 && oldHours === 0) {
                                            daysWorked++;
                                        }
                                    }
                                    else {
                                        logger_1.logger.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
                                    }
                                }
                                // Nächster lokaler Tag
                                const nextDate = new Date(currentYear, currentMonth, currentDay + 1);
                                currentYear = nextDate.getFullYear();
                                currentMonth = nextDate.getMonth();
                                currentDay = nextDate.getDate();
                            }
                        }
                    }
                }
                else {
                    // Fallback: UTC-Verteilung wenn keine Zeitzone gespeichert
                    const startDate = new Date(actualStartTime);
                    const endDate = new Date(actualEndTime);
                    // Iteriere über alle Tage, die von dieser Zeitmessung betroffen sind
                    let currentDate = new Date(startDate);
                    currentDate.setUTCHours(0, 0, 0, 0);
                    while (currentDate <= endDate) {
                        // Berechne Start- und Endzeit für diesen Tag
                        const dayStart = currentDate > startDate ? currentDate : startDate;
                        const dayEnd = new Date(currentDate);
                        dayEnd.setUTCHours(23, 59, 59, 999);
                        const dayEndActual = dayEnd < endDate ? dayEnd : endDate;
                        // Berechne Stunden für diesen Tag
                        const dayWorkTime = dayEndActual.getTime() - dayStart.getTime();
                        const dayHours = dayWorkTime / (1000 * 60 * 60);
                        if (dayHours > 0) {
                            // Extrahiere das Datum im UTC-Format
                            const year = currentDate.getUTCFullYear();
                            const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
                            const dayOfMonth = String(currentDate.getUTCDate()).padStart(2, '0');
                            const dateString = `${year}-${month}-${dayOfMonth}`;
                            // Finde entsprechenden Tag in periodData
                            const dayEntry = periodData.find(d => d.date === dateString);
                            if (dayEntry) {
                                const oldHours = dayEntry.hours;
                                dayEntry.hours += dayHours;
                                // Tage mit Arbeit zählen (nur wenn vorher 0 Stunden waren)
                                if (dayHours > 0 && oldHours === 0) {
                                    daysWorked++;
                                }
                            }
                            else {
                                logger_1.logger.warn(`Datum ${dateString} liegt nicht in der ${isQuinzena ? 'Quinzena' : 'Woche'} von ${periodStartStr} bis ${periodEndStr}!`);
                            }
                        }
                        // Nächster Tag
                        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                    }
                }
                // Addiere die Gesamtstunden (nur für den Zeitraum)
                totalHours += hoursWorked;
                // Log entfernt - keine UTC-Ausgaben mehr
            }
        });
        // Runden und Formatieren
        periodData.forEach(day => {
            day.hours = Math.round(day.hours * 10) / 10;
        });
        // Für Frontend-Kompatibilität: weeklyData verwenden
        const weeklyData = periodData;
        logger_1.logger.log("Berechnete weeklyData:", weeklyData);
        // Berechne den Durchschnitt der Arbeitsstunden pro Tag
        const averageHoursPerDay = daysWorked > 0 ? Math.round((totalHours / daysWorked) * 10) / 10 : 0;
        // Runde die Gesamtstunden auf eine Dezimalstelle
        totalHours = Math.round(totalHours * 10) / 10;
        logger_1.logger.log(`Gesamtstunden: ${totalHours}, Durchschnitt: ${averageHoursPerDay}, Arbeitstage: ${daysWorked}`);
        // Sende die Statistikdaten an das Frontend
        res.json({
            totalHours,
            averageHoursPerDay,
            daysWorked,
            weeklyData
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Worktime-Statistik:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getWorktimeStats = getWorktimeStats;
// Hilfsfunktion zur Berechnung des Datums ohne Date-Objekte
// Das verhindert Zeitzonenprobleme vollständig
function calculateDateFromWeekStart(weekStartStr, daysToAdd) {
    // Parse year, month, day from weekStartStr (format: "YYYY-MM-DD")
    const parts = weekStartStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    // Einfache Berechnung des neuen Datums durch Erhöhung des Tages
    // Diese Methode ignoriert Monats- und Jahresübergänge, aber für unseren Anwendungsfall
    // (max. 6 Tage addieren) ist das ausreichend, da wir keinen Monatsübergang haben werden
    let newDay = day + daysToAdd;
    let newMonth = month;
    let newYear = year;
    // Rudimentäre Behandlung von Monatsenden
    const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // Schaltjahr prüfen
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
        daysInMonth[2] = 29;
    }
    // Wenn der neue Tag über die Tage im Monat hinausgeht
    if (newDay > daysInMonth[newMonth]) {
        newDay = newDay - daysInMonth[newMonth];
        newMonth++;
        // Wenn der neue Monat über Dezember hinausgeht
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
    }
    // Formatiere das Datum zurück als "YYYY-MM-DD"
    return `${newYear}-${newMonth.toString().padStart(2, '0')}-${newDay.toString().padStart(2, '0')}`;
}
const exportWorktimes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { week } = req.query;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Verwende das empfangene Datum direkt
        // Das Frontend sendet bereits den korrekten Montag der Woche
        let weekDateString = week;
        if (!weekDateString) {
            // Nur im Fallback-Fall: Aktuelles Datum verwenden und Montag der Woche berechnen
            const today = new Date();
            const monday = (0, date_fns_1.startOfWeek)(today, { weekStartsOn: 1 });
            weekDateString = (0, date_fns_1.format)(monday, 'yyyy-MM-dd');
        }
        logger_1.logger.log(`Export - Verwende direkt das Datum: ${weekDateString} als Beginn der Woche`);
        // Berechne das Ende der Woche (7 Tage später)
        // Der Datumstring für den Wochenanfang
        const weekStartStr = weekDateString;
        // Konvertiere zum Date-Objekt für die Berechnung des Wochenendes
        const tempDate = new Date(weekDateString);
        tempDate.setDate(tempDate.getDate() + 6); // Ende der Woche ist 6 Tage später (Sonntag)
        const weekEndStr = (0, date_fns_1.format)(tempDate, 'yyyy-MM-dd');
        logger_1.logger.log(`Export - Wochenbereich String: ${weekStartStr} bis ${weekEndStr}`);
        // DIE UNIVERSELLE LÖSUNG: Wir arbeiten mit UTC-Zeitgrenzen als Referenzpunkte
        // Für "Montag 00:00" bis "Sonntag 23:59:59" der ausgewählten Woche, WELTWEIT KONSISTENT
        // Setze Uhrzeiten auf 00:00:00 und 23:59:59 für Anfang und Ende der Woche
        // Explizit im UTC-Format, damit es überall identisch interpretiert wird
        const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`); // Z = UTC!
        const weekEndUtc = new Date(`${weekEndStr}T23:59:59.999Z`); // Z = UTC!
        logger_1.logger.log(`Universeller UTC-Bereich (weltweit konsistent): ${weekStartUtc.toISOString()} bis ${weekEndUtc.toISOString()}`);
        // Direkte Suche nach den Einträgen mit universellen UTC-Grenzen
        const entries = yield prisma_1.prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                startTime: {
                    gte: weekStartUtc,
                    lte: weekEndUtc
                },
                endTime: {
                    not: null
                }
            },
            include: {
                user: true,
            },
        });
        logger_1.logger.log(`Gefundene Einträge mit universellen UTC-Grenzen: ${entries.length}`);
        if (entries.length > 0) {
            logger_1.logger.log(`Erster Eintrag - startTime: ${entries[0].startTime.toISOString()}, endTime: ${entries[0].endTime.toISOString()}`);
        }
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Arbeitszeiten');
        // Hole zusätzlich die Branch-Informationen
        const worktimesWithBranch = yield prisma_1.prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                startTime: {
                    gte: weekStartUtc,
                    lte: weekEndUtc
                }
            },
            include: {
                branch: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        // Spaltenüberschriften
        worksheet.columns = [
            { header: 'Datum', key: 'date', width: 12 },
            { header: 'Start', key: 'start', width: 10 },
            { header: 'Ende', key: 'end', width: 10 },
            { header: 'Stunden', key: 'hours', width: 10 },
            { header: 'Niederlassung', key: 'branch', width: 15 }
        ];
        // Für jeden Eintrag eine Zeile hinzufügen
        worktimesWithBranch.forEach(worktime => {
            const hours = worktime.endTime
                ? (worktime.endTime.getTime() - worktime.startTime.getTime()) / (1000 * 60 * 60)
                : 0;
            // Direktes Formatieren ohne Umrechnung
            const startDate = worktime.startTime;
            const endDate = worktime.endTime;
            worksheet.addRow({
                date: `${String(startDate.getUTCDate()).padStart(2, '0')}.${String(startDate.getUTCMonth() + 1).padStart(2, '0')}.${startDate.getUTCFullYear()}`,
                start: `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`,
                end: endDate ? `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}` : '-',
                hours: Math.round(hours * 100) / 100,
                branch: worktime.branch.name
            });
        });
        // Dateinamen im UTC-Format erzeugen, um konsistent zu sein
        const startStr = `${weekStartUtc.getUTCFullYear()}-${String(weekStartUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(weekStartUtc.getUTCDate()).padStart(2, '0')}`;
        const endStr = `${weekEndUtc.getUTCFullYear()}-${String(weekEndUtc.getUTCMonth() + 1).padStart(2, '0')}-${String(weekEndUtc.getUTCDate()).padStart(2, '0')}`;
        const fileName = `arbeitszeiten_${startStr}_${endStr}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        yield workbook.xlsx.write(res);
        res.end();
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Exportieren der Zeiterfassungen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.exportWorktimes = exportWorktimes;
const getActiveWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // OPTIMIERUNG: Verwende Cache für bessere Performance
        const cached = yield worktimeCache_1.worktimeCache.get(Number(userId));
        if (!cached) {
            return res.status(200).json({
                active: false,
                message: 'Keine aktive Zeiterfassung gefunden'
            });
        }
        if (!cached.active || !cached.worktime) {
            return res.status(200).json({
                active: false,
                message: 'Keine aktive Zeiterfassung gefunden'
            });
        }
        // ✅ PERFORMANCE: Nur benötigte Felder zurückgeben (reduziert Response-Größe um ~70%)
        // Verwendet von:
        // - WorktimeTracker: id, startTime, branchId, organizationId, branch.name
        // - ConsultationTracker: clientId, notes
        // - WorktimeContext: active
        // - Mobile App: active, startTime, id, branchId
        const worktime = cached.worktime;
        res.json({
            id: worktime.id,
            startTime: worktime.startTime,
            branchId: worktime.branchId,
            organizationId: worktime.organizationId,
            clientId: worktime.clientId || null,
            notes: worktime.notes || null,
            branch: {
                id: worktime.branch.id,
                name: worktime.branch.name
            },
            active: true
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getActiveWorktime = getActiveWorktime;
// Funktion zum Überprüfen und automatischen Stoppen von Zeiterfassungen,
// die die normale Arbeitszeit überschreiten
const checkAndStopExceededWorktimes = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Hilfsfunktion zur Formatierung lokaler Zeit (ohne UTC-Konvertierung)
        const formatLocalTime = (date) => {
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
        };
        // Finde alle aktiven Worktime-Einträge
        const activeWorktimes = yield prisma_1.prisma.workTime.findMany({
            where: {
                endTime: null
            },
            include: {
                user: true,
                branch: true
            }
        });
        for (const worktime of activeWorktimes) {
            // Aktuelle Zeit
            const now = new Date();
            // KORREKT: Tagesgrenzen als lokale Zeit berechnen (ohne UTC-Konvertierung)
            // Die Datenbank speichert Zeiten als lokale Zeit, daher müssen die Tagesgrenzen auch als lokale Zeit sein
            // Siehe DATENBANKSCHEMA.md: "startTime DateTime // Enthält die lokale Systemzeit des Benutzers ohne UTC-Konvertierung"
            const year = now.getFullYear();
            const month = now.getMonth(); // Monate sind 0-basiert in JavaScript
            const day = now.getDate();
            // Erstelle lokales Datum für den Anfang und das Ende des Tages
            // WICHTIG: Diese werden als lokale Zeit interpretiert, nicht als UTC
            const todayStart = new Date(year, month, day, 0, 0, 0, 0);
            const todayEnd = new Date(year, month, day, 23, 59, 59, 999);
            // Protokolliere lokale Zeit (ohne UTC-Konvertierung)
            logger_1.logger.log(`Prüfung auf überschrittene Arbeitszeit für Datum: ${(0, date_fns_1.format)(now, 'yyyy-MM-dd')}`);
            logger_1.logger.log(`Aktuelle Zeit: ${formatLocalTime(now)}`);
            logger_1.logger.log(`Tagesbeginn: ${formatLocalTime(todayStart)}`);
            logger_1.logger.log(`Tagesende: ${formatLocalTime(todayEnd)}`);
            // Hole alle beendeten Zeiterfassungen für heute
            const todaysWorktimes = yield prisma_1.prisma.workTime.findMany({
                where: {
                    userId: worktime.userId,
                    startTime: {
                        gte: todayStart,
                        lte: todayEnd
                    },
                    endTime: {
                        not: null
                    }
                }
            });
            // Berechne die gesamte Arbeitszeit für heute in Millisekunden
            let totalWorkTimeMs = 0;
            // Protokolliere jede einzelne Zeiterfassung für bessere Transparenz
            logger_1.logger.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
            for (const wt of todaysWorktimes) {
                if (wt.endTime) {
                    // Berechne Differenz aus lokalen Komponenten (ohne getTime() - verboten!)
                    // Berechne Tage-Differenz manuell
                    const daysDiff = (wt.endTime.getFullYear() - wt.startTime.getFullYear()) * 365.25 +
                        (wt.endTime.getMonth() - wt.startTime.getMonth()) * 30.44 +
                        (wt.endTime.getDate() - wt.startTime.getDate());
                    const daysDiffMs = Math.floor(daysDiff) * 86400000;
                    // Berechne Zeit-Differenz innerhalb des Tages
                    const timeDiffMs = (wt.endTime.getHours() - wt.startTime.getHours()) * 3600000 +
                        (wt.endTime.getMinutes() - wt.startTime.getMinutes()) * 60000 +
                        (wt.endTime.getSeconds() - wt.startTime.getSeconds()) * 1000 +
                        (wt.endTime.getMilliseconds() - wt.startTime.getMilliseconds());
                    const workTimeMs = daysDiffMs + timeDiffMs;
                    const workTimeHours = workTimeMs / (1000 * 60 * 60);
                    logger_1.logger.log(`Zeiterfassung ID ${wt.id}: ${formatLocalTime(wt.startTime)} - ${formatLocalTime(wt.endTime)} = ${workTimeHours.toFixed(2)}h`);
                    totalWorkTimeMs += workTimeMs;
                }
            }
            // Füge die aktuelle laufende Sitzung hinzu
            // KORREKT: Wie im WorktimeModal - entferne 'Z' vom ISO-String und verwende getTime()
            // Die Differenz zwischen zwei UTC-Zeiten ist immer korrekt, unabhängig von der Zeitzone
            const startISOString = worktime.startTime.toISOString();
            const startISOStringWithoutZ = startISOString.endsWith('Z')
                ? startISOString.substring(0, startISOString.length - 1)
                : startISOString;
            const startTimeDate = new Date(startISOStringWithoutZ);
            // Verwende die bereits oben deklarierte 'now' Variable
            const diff = now.getTime() - startTimeDate.getTime();
            const currentSessionMs = diff;
            const currentSessionHours = currentSessionMs / (1000 * 60 * 60);
            // Formatiere lokale Zeit für bessere Lesbarkeit
            const localNowString = formatLocalTime(now);
            logger_1.logger.log(`Aktuelle laufende Sitzung: ${formatLocalTime(worktime.startTime)} - jetzt (${localNowString}) = ${currentSessionHours.toFixed(2)}h`);
            totalWorkTimeMs += currentSessionMs;
            // Konvertiere Millisekunden in Stunden
            const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);
            // Anzeige der normalen Arbeitszeit des Benutzers und der aktuellen Gesamtarbeitszeit
            logger_1.logger.log(`Normale Arbeitszeit des Benutzers: ${worktime.user.normalWorkingHours}h`);
            logger_1.logger.log(`Gesamtarbeitszeit heute: ${totalWorkTimeHours.toFixed(2)}h`);
            // Wenn die gesamte Arbeitszeit die normale Arbeitszeit überschreitet, stoppe die Zeiterfassung
            if (totalWorkTimeHours >= worktime.user.normalWorkingHours) {
                logger_1.logger.log(`Schwellenwert erreicht oder überschritten. Stoppe Zeiterfassung automatisch.`);
                // Zeiterfassung beenden - speichere die aktuelle Zeit direkt
                // KORREKT: Wie im Modal - verwende new Date() direkt (wird als lokale Zeit gespeichert)
                // Siehe stopWorktime Zeile 175 für die korrekte Referenz-Implementierung
                const endTimeNow = new Date();
                const stoppedWorktime = yield prisma_1.prisma.workTime.update({
                    where: { id: worktime.id },
                    data: Object.assign({ endTime: endTimeNow }, (worktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
                });
                logger_1.logger.log(`Zeiterfassung ID ${stoppedWorktime.id} wurde beendet um: ${formatLocalTime(stoppedWorktime.endTime)}`);
                // Benachrichtigung erstellen
                const userLang = yield (0, translations_1.getUserLanguage)(worktime.userId);
                const notificationText = (0, translations_1.getWorktimeNotificationText)(userLang, 'auto_stop', undefined, worktime.user.normalWorkingHours);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: worktime.userId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.worktime,
                    relatedEntityId: worktime.id,
                    relatedEntityType: 'auto_stop'
                });
                logger_1.logger.log(`Zeiterfassung für Benutzer ${worktime.userId} automatisch beendet.`);
            }
        }
        logger_1.logger.log('Prüfung auf überschrittene Arbeitszeiten abgeschlossen.');
    }
    catch (error) {
        logger_1.logger.error('Fehler bei der Prüfung auf überschrittene Arbeitszeiten:', error);
    }
});
exports.checkAndStopExceededWorktimes = checkAndStopExceededWorktimes;
// Hilfsfunktion zur Berechnung des Tagesindex in einer Woche
function calculateDayIndex(weekStartStr, dateStr) {
    // Parse Datum-Strings
    const [startYear, startMonth, startDay] = weekStartStr.split('-').map(Number);
    const [dateYear, dateMonth, dateDay] = dateStr.split('-').map(Number);
    // Erstelle Date-Objekte (verwende den gleichen Zeitpunkt um Zeitzonenprobleme zu vermeiden)
    const weekStart = new Date(Date.UTC(startYear, startMonth - 1, startDay, 12, 0, 0));
    const dateObj = new Date(Date.UTC(dateYear, dateMonth - 1, dateDay, 12, 0, 0));
    // Berechne Differenz in Millisekunden und konvertiere zu Tagen
    const diffTime = dateObj.getTime() - weekStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}
//# sourceMappingURL=worktimeController.js.map