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
exports.getActiveWorktime = exports.exportWorktimes = exports.getWorktimeStats = exports.updateWorktime = exports.deleteWorktime = exports.getWorktimes = exports.stopWorktime = exports.startWorktime = void 0;
const client_1 = require("@prisma/client");
const ExcelJS = __importStar(require("exceljs"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
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
        const worktime = yield prisma.workTime.create({
            data: {
                userId: Number(userId),
                branchId: Number(branchId),
                startTime: new Date(startTime)
            },
            include: {
                branch: true
            }
        });
        res.json(worktime);
    }
    catch (error) {
        console.error('Fehler beim Starten der Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.startWorktime = startWorktime;
const stopWorktime = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { endTime } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const activeWorktime = yield prisma.workTime.findFirst({
            where: {
                userId: Number(userId),
                endTime: null
            }
        });
        if (!activeWorktime) {
            return res.status(404).json({ message: 'Keine aktive Zeiterfassung gefunden' });
        }
        const worktime = yield prisma.workTime.update({
            where: { id: activeWorktime.id },
            data: { endTime: new Date(endTime) },
            include: {
                branch: true
            }
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
        let whereClause = {
            userId: Number(userId)
        };
        if (date) {
            const queryDateStr = date;
            console.log(`Filtere Zeiteinträge für Datum (String): ${queryDateStr}`);
            // Wir erstellen das Datum manuell, um Zeitzonenprobleme zu vermeiden
            const dateParts = queryDateStr.split('-');
            if (dateParts.length !== 3) {
                return res.status(400).json({ message: 'Ungültiges Datumsformat' });
            }
            const year = parseInt(dateParts[0]);
            const month = parseInt(dateParts[1]) - 1; // Monate sind 0-basiert in JavaScript
            const day = parseInt(dateParts[2]);
            // Wir setzen die Uhrzeit auf 00:00:00 und 23:59:59 in der lokalen Zeitzone
            const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0));
            const endOfDay = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
            console.log(`Zeitraum (lokal): ${startOfDay.toLocaleString()} bis ${endOfDay.toLocaleString()}`);
            console.log(`Zeitraum (ISO): ${startOfDay.toISOString()} bis ${endOfDay.toISOString()}`);
            // Suche nach Einträgen für diesen Tag
            whereClause = {
                userId: Number(userId),
                startTime: {
                    gte: startOfDay,
                    lt: endOfDay
                }
            };
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
        console.log(`Gefundene Zeiteinträge: ${worktimes.length}`);
        // Für Debugging: Zeige die Start- und Endzeiten der gefundenen Einträge
        worktimes.forEach((worktime, index) => {
            const startLocal = new Date(worktime.startTime).toLocaleString();
            const endLocal = worktime.endTime ? new Date(worktime.endTime).toLocaleString() : 'aktiv';
            console.log(`Eintrag ${index + 1}:`);
            console.log(`  Start (lokal): ${startLocal}`);
            console.log(`  Ende (lokal): ${endLocal}`);
            console.log(`  Start (ISO): ${worktime.startTime.toISOString()}`);
            if (worktime.endTime) {
                console.log(`  Ende (ISO): ${worktime.endTime.toISOString()}`);
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
        const worktime = yield prisma.workTime.findUnique({
            where: { id: Number(id) }
        });
        if (!worktime) {
            return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
        }
        if (worktime.userId !== Number(userId)) {
            return res.status(403).json({ message: 'Keine Berechtigung' });
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
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const worktime = yield prisma.workTime.findUnique({
            where: { id: Number(id) }
        });
        if (!worktime) {
            return res.status(404).json({ message: 'Zeiterfassung nicht gefunden' });
        }
        if (worktime.userId !== Number(userId)) {
            return res.status(403).json({ message: 'Keine Berechtigung' });
        }
        const updatedWorktime = yield prisma.workTime.update({
            where: { id: Number(id) },
            data: {
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined,
                branchId: branchId ? Number(branchId) : undefined
            },
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
        const weekDate = week ? new Date(week) : new Date();
        const start = (0, date_fns_1.startOfWeek)(weekDate, { weekStartsOn: 1 });
        const end = (0, date_fns_1.endOfWeek)(weekDate, { weekStartsOn: 1 });
        // Wir suchen nach Einträgen, die in dieser Woche begonnen oder geendet haben
        // oder die über diese Woche gehen (Start vor der Woche, Ende nach der Woche)
        const worktimes = yield prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                endTime: {
                    not: null
                },
                OR: [
                    {
                        // Einträge, die in dieser Woche begonnen haben
                        startTime: {
                            gte: start,
                            lte: end
                        }
                    },
                    {
                        // Einträge, die in dieser Woche geendet haben
                        endTime: {
                            gte: start,
                            lte: end
                        }
                    },
                    {
                        // Einträge, die über diese Woche gehen
                        startTime: {
                            lt: start
                        },
                        endTime: {
                            gt: end
                        }
                    }
                ]
            }
        });
        // Wir erstellen ein Map für jeden Tag der Woche
        const dailyStats = new Map();
        const weekDays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
        weekDays.forEach(day => dailyStats.set(day, 0));
        let totalHours = 0;
        let daysWorked = 0;
        // Für jeden Zeiteintrag berechnen wir die Arbeitszeit pro Tag
        worktimes.forEach(worktime => {
            if (worktime.endTime) {
                // Berechnung mit Millisekunden, um negative Werte zu vermeiden
                const diff = worktime.endTime.getTime() - worktime.startTime.getTime();
                const hours = diff / (1000 * 60 * 60);
                if (hours > 0) {
                    totalHours += hours;
                    const day = (0, date_fns_1.format)(worktime.startTime, 'EEEE', { locale: locale_1.de });
                    const currentDayHours = dailyStats.get(day) || 0;
                    dailyStats.set(day, currentDayHours + hours);
                    if (currentDayHours === 0)
                        daysWorked++;
                }
            }
        });
        const weeklyData = weekDays.map(day => ({
            day,
            hours: Math.round((dailyStats.get(day) || 0) * 100) / 100
        }));
        res.json({
            totalHours: Math.round(totalHours * 100) / 100,
            averageHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
            daysWorked,
            weeklyData
        });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Statistiken:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getWorktimeStats = getWorktimeStats;
const exportWorktimes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { week } = req.query;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const weekDate = week ? new Date(week) : new Date();
        const start = (0, date_fns_1.startOfWeek)(weekDate, { weekStartsOn: 1 });
        const end = (0, date_fns_1.endOfWeek)(weekDate, { weekStartsOn: 1 });
        const user = yield prisma.user.findUnique({
            where: { id: Number(userId) },
            include: { branches: { include: { branch: true } } }
        });
        const worktimes = yield prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                startTime: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                branch: true
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Arbeitszeiten');
        worksheet.columns = [
            { header: 'Datum', key: 'date', width: 12 },
            { header: 'Start', key: 'start', width: 10 },
            { header: 'Ende', key: 'end', width: 10 },
            { header: 'Stunden', key: 'hours', width: 10 },
            { header: 'Niederlassung', key: 'branch', width: 15 }
        ];
        worktimes.forEach(worktime => {
            const hours = worktime.endTime
                ? (worktime.endTime.getTime() - worktime.startTime.getTime()) / (1000 * 60 * 60)
                : 0;
            worksheet.addRow({
                date: (0, date_fns_1.format)(worktime.startTime, 'dd.MM.yyyy'),
                start: (0, date_fns_1.format)(worktime.startTime, 'HH:mm'),
                end: worktime.endTime ? (0, date_fns_1.format)(worktime.endTime, 'HH:mm') : '-',
                hours: Math.round(hours * 100) / 100,
                branch: worktime.branch.name
            });
        });
        const fileName = `arbeitszeiten_${(0, date_fns_1.format)(start, 'yyyy-MM-dd')}_${(0, date_fns_1.format)(end, 'yyyy-MM-dd')}.xlsx`;
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
        console.log(`Suche aktive Zeiterfassung für Benutzer ${userId}...`);
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
            console.log(`Keine aktive Zeiterfassung für Benutzer ${userId} gefunden.`);
            // Statt 404 senden wir einen leeren Erfolg mit active: false
            return res.status(200).json({
                active: false,
                message: 'Keine aktive Zeiterfassung gefunden'
            });
        }
        console.log(`Aktive Zeiterfassung gefunden: ${activeWorktime.id}`);
        // Wir fügen ein active: true Flag hinzu
        res.json(Object.assign(Object.assign({}, activeWorktime), { active: true }));
    }
    catch (error) {
        console.error('Fehler beim Abrufen der aktiven Zeiterfassung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getActiveWorktime = getActiveWorktime;
//# sourceMappingURL=worktimeController.js.map