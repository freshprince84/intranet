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
const ExcelJS = __importStar(require("exceljs"));
const date_fns_1 = require("date-fns");
const notificationController_1 = require("./notificationController");
const organization_1 = require("../middleware/organization");
const prisma = new client_1.PrismaClient();
const startWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { branchId, startTime } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfe, ob bereits eine aktive Zeiterfassung existiert
        const activeWorktime = yield prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null
            }
        });
        if (activeWorktime) {
            return res.status(400).json({ message: 'Es läuft bereits eine Zeiterfassung' });
        }
        // Hole den Benutzer mit seinen Arbeitszeiteinstellungen
        const user = yield prisma.user.findUnique({
            where: { id: Number(userId) }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
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
        console.log(`Berechneter Tagesbeginn (kompensiert): ${todayStart.toISOString()}`);
        console.log(`Berechnetes Tagesende (kompensiert): ${todayEnd.toISOString()}`);
        // Hole alle Zeiterfassungen für heute
        const todaysWorktimes = yield prisma.workTime.findMany({
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
        console.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
        for (const workTime of todaysWorktimes) {
            if (workTime.endTime) {
                const workTimeMs = workTime.endTime.getTime() - workTime.startTime.getTime();
                const workTimeHours = workTimeMs / (1000 * 60 * 60);
                console.log(`Zeiterfassung ID ${workTime.id}: ${workTime.startTime.toISOString()} - ${workTime.endTime.toISOString()} = ${workTimeHours.toFixed(2)}h`);
                totalWorkTimeMs += workTimeMs;
            }
        }
        // Konvertiere Millisekunden in Stunden
        const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);
        // Wenn die gesamte Arbeitszeit die normale Arbeitszeit überschreitet, verhindere den Start
        if (totalWorkTimeHours >= user.normalWorkingHours) {
            console.log(`Schwellenwert erreicht oder überschritten. Verhindere Start der Zeiterfassung.`);
            return res.status(403).json({
                message: `Die tägliche Arbeitszeit von ${user.normalWorkingHours}h wurde bereits erreicht. Die Zeiterfassung kann erst am nächsten Tag wieder gestartet werden.`
            });
        }
        // Speichere die aktuelle Zeit direkt
        const worktime = yield prisma.workTime.create({
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
        console.log(`Zeiterfassung ID ${worktime.id} gespeichert mit Startzeit: ${worktime.startTime.toISOString()}`);
        // Erstelle eine Benachrichtigung, wenn eingeschaltet
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: Number(userId),
            title: 'Zeiterfassung gestartet',
            message: `Zeiterfassung für ${worktime.branch.name} wurde gestartet.`,
            type: client_1.NotificationType.worktime,
            relatedEntityId: worktime.id,
            relatedEntityType: 'start'
        });
        res.status(201).json(worktime);
    }
    catch (error) {
        console.error('Fehler beim Starten der Zeiterfassung:', error);
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
        const activeWorktime = yield prisma.workTime.findFirst({
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
        console.log(`Stoppe Zeiterfassung mit Endzeit: ${now.toISOString()}`);
        const worktime = yield prisma.workTime.update({
            where: { id: activeWorktime.id },
            data: Object.assign({ endTime: now }, (activeWorktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })),
            include: {
                branch: true,
                user: true
            }
        });
        console.log(`Gespeicherte Endzeit: ${worktime.endTime.toISOString()}`);
        // Erstelle eine Benachrichtigung, wenn eingeschaltet
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: Number(userId),
            title: 'Zeiterfassung beendet',
            message: `Zeiterfassung für ${worktime.branch.name} wurde beendet.`,
            type: client_1.NotificationType.worktime,
            relatedEntityId: worktime.id,
            relatedEntityType: 'stop'
        });
        res.json(worktime);
    }
    catch (error) {
        console.error('Fehler beim Stoppen der Zeiterfassung:', error);
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
        const user = yield prisma.user.findUnique({
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
            console.log(`Filterung für Datum: ${year}-${month + 1}-${day}`);
            console.log(`Original Start des Tages: ${localStartOfDay.toISOString()}`);
            console.log(`Kompensierter Start des Tages: ${compensatedStartOfDay.toISOString()}`);
            console.log(`Original Ende des Tages: ${localEndOfDay.toISOString()}`);
            console.log(`Kompensiertes Ende des Tages: ${compensatedEndOfDay.toISOString()}`);
            // Setze die Abfragebedingung
            whereClause = Object.assign(Object.assign({}, whereClause), { startTime: {
                    gte: compensatedStartOfDay,
                    lte: compensatedEndOfDay
                } });
        }
        const worktimes = yield prisma.workTime.findMany({
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
        console.error('Fehler beim Abrufen der Zeiterfassungen:', error);
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
        const worktime = yield prisma.workTime.findFirst({
            where: Object.assign(Object.assign({}, worktimeFilter), { id: Number(id) })
        });
        if (!worktime) {
            return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
        }
        yield prisma.workTime.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'Zeiterfassung erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteWorktime = deleteWorktime;
const updateWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { startTime, endTime, branchId } = req.body;
        const userId = req.userId;
        console.log('DEBUG updateWorktime Received:', JSON.stringify({ id, startTime, endTime, branchId, userId }));
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Datenisolation: Nur WorkTimes der Organisation
        const worktimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'worktime');
        // Prüfe, ob die Zeiterfassung existiert und zur Organisation gehört
        const worktime = yield prisma.workTime.findFirst({
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
                    console.log(`Bereinigter Datumsstring: ${cleanDateString}`);
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
                        console.error(`Ungültiges Datum: ${cleanDateString}`);
                        return null;
                    }
                    return date;
                }
            }
            catch (error) {
                console.error(`Fehler beim Parsen des Datums ${dateString}:`, error);
                return null;
            }
        };
        // Startzeit aktualisieren (wenn vorhanden)
        if (startTime) {
            const parsedStartTime = safeDateParse(startTime);
            if (parsedStartTime) {
                updateData.startTime = parsedStartTime;
                console.log('Startzeit für Update:', parsedStartTime.toISOString());
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
                console.log('Endzeit für Update: null');
            }
            else {
                const parsedEndTime = safeDateParse(endTime);
                if (parsedEndTime) {
                    updateData.endTime = parsedEndTime;
                    console.log('Endzeit für Update:', parsedEndTime.toISOString());
                }
                else {
                    return res.status(400).json({ message: 'Ungültiges Endzeit-Format' });
                }
            }
        }
        console.log('Final updateData:', JSON.stringify(updateData));
        const updatedWorktime = yield prisma.workTime.update({
            where: { id: Number(id) },
            data: updateData,
            include: {
                branch: true
            }
        });
        res.json(updatedWorktime);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateWorktime = updateWorktime;
const getWorktimeStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { week } = req.query;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Teste, ob für diesen userId überhaupt Einträge existieren
        const totalUserEntries = yield prisma.workTime.count({
            where: {
                userId: Number(userId)
            }
        });
        // Hole alle Einträge für diesen Benutzer, um sie zu diagnostizieren
        if (totalUserEntries > 0) {
            const recentEntries = yield prisma.workTime.findMany({
                where: {
                    userId: Number(userId),
                    endTime: {
                        not: null
                    }
                },
                orderBy: {
                    startTime: 'desc'
                },
                take: 3
            });
            recentEntries.forEach((entry, index) => {
                var _a;
                console.log(`  Eintrag ${index + 1}:`, {
                    id: entry.id,
                    startTime: entry.startTime.toISOString(),
                    endTime: (_a = entry.endTime) === null || _a === void 0 ? void 0 : _a.toISOString(),
                    // Lokale Zeit-Komponenten
                    startDate: `${entry.startTime.getFullYear()}-${String(entry.startTime.getMonth() + 1).padStart(2, '0')}-${String(entry.startTime.getDate()).padStart(2, '0')}`,
                    startHour: entry.startTime.getHours(),
                    startMinute: entry.startTime.getMinutes()
                });
            });
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
        // Berechne das Ende der Woche (7 Tage später)
        // Der Datumstring für den Wochenanfang
        const weekStartStr = weekDateString;
        // Konvertiere zum Date-Objekt für die Berechnung des Wochenendes
        const tempDate = new Date(weekDateString);
        tempDate.setDate(tempDate.getDate() + 7); // Ende der Woche ist 6 Tage später (Sonntag)
        const weekEndStr = (0, date_fns_1.format)(tempDate, 'yyyy-MM-dd');
        // DIE UNIVERSELLE LÖSUNG: Wir arbeiten mit UTC-Zeitgrenzen als Referenzpunkte
        // Für "Montag 00:00" bis "Sonntag 23:59:59" der ausgewählten Woche, WELTWEIT KONSISTENT
        // Setze Uhrzeiten auf 00:00:00 und 23:59:59 für Anfang und Ende der Woche
        // Explizit im UTC-Format, damit es überall identisch interpretiert wird
        const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`); // Z = UTC!
        const weekEndUtc = new Date(`${weekEndStr}T23:59:59.999Z`); // Z = UTC!
        // Direkte Suche nach den Einträgen mit universellen UTC-Grenzen
        const entries = yield prisma.workTime.findMany({
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
        console.log(`Gefundene Einträge mit universellen UTC-Grenzen: ${entries.length}`);
        if (entries.length > 0) {
            console.log(`Erster Eintrag - startTime: ${entries[0].startTime.toISOString()}, endTime: ${entries[0].endTime.toISOString()}`);
        }
        // Erstelle ein Objekt mit den Wochentagen (Montag bis Sonntag)
        const weekDays = {
            "Montag": 0,
            "Dienstag": 0,
            "Mittwoch": 0,
            "Donnerstag": 0,
            "Freitag": 0,
            "Samstag": 0,
            "Sonntag": 0,
        };
        // Berechne die Gesamtstunden und verteile sie auf die Wochentage
        let totalHours = 0;
        let daysWorked = 0;
        // Für jeden Zeiteintrag berechnen wir die Arbeitszeit in Stunden
        entries.forEach(entry => {
            if (entry.endTime) {
                // Berechnung der Arbeitszeit in Millisekunden
                const workTime = entry.endTime.getTime() - entry.startTime.getTime();
                // Umrechnung in Stunden
                const hoursWorked = workTime / (1000 * 60 * 60);
                // Bestimme den Wochentag BASIEREND AUF DEM DATUM RELATIV ZUR WOCHE
                // so dass die Woche 11 immer Mo-So ist, egal in welcher Zeitzone
                const date = entry.startTime;
                // Extrahiere das Datum im UTC-Format, nicht in lokaler Zeit
                // Verwende die UTC-Methoden statt format, um Zeitzonenprobleme zu vermeiden
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const dayOfMonth = String(date.getUTCDate()).padStart(2, '0');
                const dateString = `${year}-${month}-${dayOfMonth}`;
                console.log(`Extrahiertes UTC-Datum aus Eintrag (${date.toISOString()}): ${dateString}`);
                // Berechne die Differenz in Tagen vom Wochenanfang
                const dayIndex = calculateDayIndex(weekStartStr, dateString);
                // Mappe auf den Wochentag
                const weekdayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
                const weekDay = dayIndex >= 0 && dayIndex < 7 ? weekdayNames[dayIndex] : null;
                if (weekDay) {
                    console.log(`Eintrag für ${dateString} erkannt als ${weekDay} (Tag ${dayIndex} der Woche): +${hoursWorked} Stunden`);
                    // Füge die Stunden zum entsprechenden Wochentag hinzu
                    weekDays[weekDay] += hoursWorked;
                    // Aktualisiere die Gesamtstunden
                    totalHours += hoursWorked;
                    // Wenn an diesem Tag gearbeitet wurde, erhöhe daysWorked
                    if (hoursWorked > 0 && weekDays[weekDay] === hoursWorked) {
                        daysWorked++;
                    }
                }
                else {
                    console.error(`Datum ${dateString} liegt nicht in der Woche von ${weekStartStr} bis ${weekEndStr}!`);
                }
            }
        });
        // Erstelle ein Array mit den Wochentagen und Stunden für das Frontend
        // Füge auch das Datum für jeden Tag hinzu
        const weeklyData = Object.entries(weekDays).map(([day, hours]) => {
            // Bestimme den korrekten Index basierend auf dem Tag
            const dayIndexMap = {
                "Montag": 0,
                "Dienstag": 1,
                "Mittwoch": 2,
                "Donnerstag": 3,
                "Freitag": 4,
                "Samstag": 5,
                "Sonntag": 6
            };
            // Berechne das Datum direkt aus dem Wochenstart-String
            const dayIndex = dayIndexMap[day];
            const date = calculateDateFromWeekStart(weekStartStr, dayIndex);
            return {
                day,
                hours: Math.round(hours * 10) / 10, // Auf eine Dezimalstelle runden
                date
            };
        });
        console.log("Berechnete weeklyData:", weeklyData);
        // Berechne den Durchschnitt der Arbeitsstunden pro Tag
        const averageHoursPerDay = daysWorked > 0 ? Math.round((totalHours / daysWorked) * 10) / 10 : 0;
        // Runde die Gesamtstunden auf eine Dezimalstelle
        totalHours = Math.round(totalHours * 10) / 10;
        console.log(`Gesamtstunden: ${totalHours}, Durchschnitt: ${averageHoursPerDay}, Arbeitstage: ${daysWorked}`);
        // Sende die Statistikdaten an das Frontend
        res.json({
            totalHours,
            averageHoursPerDay,
            daysWorked,
            weeklyData
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Worktime-Statistik:', error);
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
        console.log(`Export - Verwende direkt das Datum: ${weekDateString} als Beginn der Woche`);
        // Berechne das Ende der Woche (7 Tage später)
        // Der Datumstring für den Wochenanfang
        const weekStartStr = weekDateString;
        // Konvertiere zum Date-Objekt für die Berechnung des Wochenendes
        const tempDate = new Date(weekDateString);
        tempDate.setDate(tempDate.getDate() + 6); // Ende der Woche ist 6 Tage später (Sonntag)
        const weekEndStr = (0, date_fns_1.format)(tempDate, 'yyyy-MM-dd');
        console.log(`Export - Wochenbereich String: ${weekStartStr} bis ${weekEndStr}`);
        // DIE UNIVERSELLE LÖSUNG: Wir arbeiten mit UTC-Zeitgrenzen als Referenzpunkte
        // Für "Montag 00:00" bis "Sonntag 23:59:59" der ausgewählten Woche, WELTWEIT KONSISTENT
        // Setze Uhrzeiten auf 00:00:00 und 23:59:59 für Anfang und Ende der Woche
        // Explizit im UTC-Format, damit es überall identisch interpretiert wird
        const weekStartUtc = new Date(`${weekStartStr}T00:00:00.000Z`); // Z = UTC!
        const weekEndUtc = new Date(`${weekEndStr}T23:59:59.999Z`); // Z = UTC!
        console.log(`Universeller UTC-Bereich (weltweit konsistent): ${weekStartUtc.toISOString()} bis ${weekEndUtc.toISOString()}`);
        // Direkte Suche nach den Einträgen mit universellen UTC-Grenzen
        const entries = yield prisma.workTime.findMany({
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
        console.log(`Gefundene Einträge mit universellen UTC-Grenzen: ${entries.length}`);
        if (entries.length > 0) {
            console.log(`Erster Eintrag - startTime: ${entries[0].startTime.toISOString()}, endTime: ${entries[0].endTime.toISOString()}`);
        }
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Arbeitszeiten');
        // Hole zusätzlich die Branch-Informationen
        const worktimesWithBranch = yield prisma.workTime.findMany({
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
        console.error('Fehler beim Exportieren der Zeiterfassungen:', error);
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
        const activeWorktime = yield prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null
            },
            include: {
                branch: true
            }
        });
        if (!activeWorktime) {
            return res.status(200).json({
                active: false,
                message: 'Keine aktive Zeiterfassung gefunden'
            });
        }
        res.json(Object.assign(Object.assign({}, activeWorktime), { active: true, 
            // organizationId explizit zurückgeben für Frontend-Vergleich
            organizationId: activeWorktime.organizationId }));
    }
    catch (error) {
        console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getActiveWorktime = getActiveWorktime;
// Funktion zum Überprüfen und automatischen Stoppen von Zeiterfassungen,
// die die normale Arbeitszeit überschreiten
const checkAndStopExceededWorktimes = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Finde alle aktiven Worktime-Einträge
        const activeWorktimes = yield prisma.workTime.findMany({
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
            // Erstelle das Datum für den Anfang und das Ende des aktuellen Tages (entsprechend getWorktimeStats)
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
            // Protokolliere lokale und UTC-Zeit für Vergleichszwecke
            console.log(`Prüfung auf überschrittene Arbeitszeit für Datum: ${(0, date_fns_1.format)(now, 'yyyy-MM-dd')}`);
            console.log(`Aktuelle Zeit (UTC): ${now.toISOString()}`);
            console.log(`Aktuelle Zeit (lokal): ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
            console.log(`Tagesbeginn (kompensiert): ${todayStart.toISOString()}`);
            console.log(`Tagesende (kompensiert): ${todayEnd.toISOString()}`);
            // Hole alle beendeten Zeiterfassungen für heute
            const todaysWorktimes = yield prisma.workTime.findMany({
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
            console.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
            for (const wt of todaysWorktimes) {
                if (wt.endTime) {
                    const workTimeMs = wt.endTime.getTime() - wt.startTime.getTime();
                    const workTimeHours = workTimeMs / (1000 * 60 * 60);
                    console.log(`Zeiterfassung ID ${wt.id}: ${wt.startTime.toISOString()} - ${wt.endTime.toISOString()} = ${workTimeHours.toFixed(2)}h`);
                    totalWorkTimeMs += workTimeMs;
                }
            }
            // Füge die aktuelle laufende Sitzung hinzu
            // Konvertiere now nach UTC für konsistenten Vergleich mit worktime.startTime (aus DB)
            // getTimezoneOffset() gibt negative Werte für östliche Zeitzonen zurück, daher subtrahieren
            const nowUTC = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
            const currentSessionMs = nowUTC.getTime() - worktime.startTime.getTime();
            const currentSessionHours = currentSessionMs / (1000 * 60 * 60);
            // Formatiere lokale Zeit für bessere Lesbarkeit
            const localNowString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            console.log(`Aktuelle laufende Sitzung: ${worktime.startTime.toISOString()} - jetzt (${localNowString}) = ${currentSessionHours.toFixed(2)}h`);
            totalWorkTimeMs += currentSessionMs;
            // Konvertiere Millisekunden in Stunden
            const totalWorkTimeHours = totalWorkTimeMs / (1000 * 60 * 60);
            // Anzeige der normalen Arbeitszeit des Benutzers und der aktuellen Gesamtarbeitszeit
            console.log(`Normale Arbeitszeit des Benutzers: ${worktime.user.normalWorkingHours}h`);
            console.log(`Gesamtarbeitszeit heute: ${totalWorkTimeHours.toFixed(2)}h`);
            // Wenn die gesamte Arbeitszeit die normale Arbeitszeit überschreitet, stoppe die Zeiterfassung
            if (totalWorkTimeHours >= worktime.user.normalWorkingHours) {
                console.log(`Schwellenwert erreicht oder überschritten. Stoppe Zeiterfassung automatisch.`);
                // Zeiterfassung beenden - speichere die LOKALE Zeit, nicht UTC
                // WICHTIG: Wir verwenden hier ein neues Date-Objekt, um sicherzustellen, dass
                // die Zeit korrekt gespeichert wird, ohne Zeitzonenumrechnung
                // Erstelle ein frisches Date-Objekt, genau wie in stopWorktime
                const endTimeNow = new Date();
                // Manuelle Korrektur für UTC-Speicherung - kompensiert den Zeitzonenversatz
                const utcCorrectedTime = new Date(endTimeNow.getTime() - endTimeNow.getTimezoneOffset() * 60000);
                const stoppedWorktime = yield prisma.workTime.update({
                    where: { id: worktime.id },
                    data: Object.assign({ endTime: utcCorrectedTime }, (worktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }))
                });
                console.log(`Zeiterfassung ID ${stoppedWorktime.id} wurde beendet um: ${stoppedWorktime.endTime.toISOString()}`);
                console.log(`Lokale Endzeit: ${stoppedWorktime.endTime.getFullYear()}-${String(stoppedWorktime.endTime.getMonth() + 1).padStart(2, '0')}-${String(stoppedWorktime.endTime.getDate()).padStart(2, '0')} ${String(stoppedWorktime.endTime.getHours()).padStart(2, '0')}:${String(stoppedWorktime.endTime.getMinutes()).padStart(2, '0')}:${String(stoppedWorktime.endTime.getSeconds()).padStart(2, '0')}`);
                // Benachrichtigung erstellen
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: worktime.userId,
                    title: 'Zeiterfassung automatisch beendet',
                    message: `Deine Zeiterfassung wurde automatisch beendet, da die tägliche Arbeitszeit von ${worktime.user.normalWorkingHours}h erreicht wurde.`,
                    type: client_1.NotificationType.worktime,
                    relatedEntityId: worktime.id,
                    relatedEntityType: 'auto_stop'
                });
                console.log(`Zeiterfassung für Benutzer ${worktime.userId} automatisch beendet.`);
            }
        }
        console.log('Prüfung auf überschrittene Arbeitszeiten abgeschlossen.');
    }
    catch (error) {
        console.error('Fehler bei der Prüfung auf überschrittene Arbeitszeiten:', error);
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