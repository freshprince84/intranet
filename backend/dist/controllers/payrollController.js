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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePayrollPDF = exports.getPrefilledHours = exports.getPayrolls = exports.calculatePayroll = exports.saveWorkHours = void 0;
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const translations_1 = require("../utils/translations");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
const saveWorkHours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, hours, periodStart, periodEnd } = req.body; // hours: { regular, overtime, night, sundayHoliday, overtimeNight, overtimeSundayHoliday, overtimeNightSundayHoliday }
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        // Perioden bestimmen (mit Fallback)
        let startDate;
        let endDate;
        if (periodStart && periodEnd) {
            startDate = new Date(periodStart);
            endDate = new Date(periodEnd);
        }
        else {
            // Fallback: Automatische Berechnung
            startDate = new Date();
            endDate = getPayrollEndDate(user.payrollCountry);
        }
        // Validierung: periodStart muss vor periodEnd liegen
        if (startDate >= endDate) {
            return res.status(400).json({ error: 'periodStart muss vor periodEnd liegen' });
        }
        // Prüfe auf doppelte Perioden (Überschneidungen)
        const existingPayroll = yield prisma.employeePayroll.findFirst({
            where: {
                userId,
                OR: [
                    {
                        periodStart: { lte: endDate },
                        periodEnd: { gte: startDate }
                    }
                ]
            }
        });
        if (existingPayroll) {
            return res.status(400).json({
                error: 'Für diesen Zeitraum existiert bereits eine Lohnabrechnung',
                existingPayroll: {
                    id: existingPayroll.id,
                    periodStart: existingPayroll.periodStart,
                    periodEnd: existingPayroll.periodEnd
                }
            });
        }
        const effectiveHourlyRate = yield calculateEffectiveHourlyRate(user);
        const payroll = yield prisma.employeePayroll.create({
            data: {
                userId,
                periodStart: startDate,
                periodEnd: endDate,
                regularHours: hours.regular || 0,
                overtimeHours: hours.overtime || 0,
                nightHours: hours.night || 0,
                holidayHours: hours.holidayHours || 0,
                sundayHolidayHours: hours.sundayHoliday || 0,
                overtimeNightHours: hours.overtimeNight || 0,
                overtimeSundayHolidayHours: hours.overtimeSundayHoliday || 0,
                overtimeNightSundayHolidayHours: hours.overtimeNightSundayHoliday || 0,
                hourlyRate: effectiveHourlyRate,
                grossPay: 0, // Wird später durch calculatePayroll berechnet
                socialSecurity: 0,
                taxes: 0,
                netPay: 0,
                currency: user.payrollCountry === 'CH' ? 'CHF' : 'COP',
            },
        });
        res.json(payroll);
    }
    catch (error) {
        console.error('Fehler beim Speichern der Stunden:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.saveWorkHours = saveWorkHours;
const calculatePayroll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, payrollId } = req.query;
        let payroll;
        if (payrollId) {
            payroll = yield prisma.employeePayroll.findUnique({
                where: { id: Number(payrollId) },
                include: { user: true },
            });
        }
        else {
            payroll = yield prisma.employeePayroll.findFirst({
                where: { userId: Number(userId) },
                orderBy: { createdAt: 'desc' },
                include: { user: true },
            });
        }
        if (!payroll)
            return res.status(404).json({ error: 'Lohnabrechnung nicht gefunden' });
        const grossPay = calculateGrossPay(payroll, payroll.user.payrollCountry, payroll.user.contractType);
        const deductions = calculateDeductions(grossPay, payroll.user.payrollCountry);
        const netPay = grossPay - deductions;
        const updatedPayroll = yield prisma.employeePayroll.update({
            where: { id: payroll.id },
            data: {
                grossPay,
                deductions,
                socialSecurity: deductions * 0.7, // Vereinfachte Aufteilung: 70% Sozialversicherungen
                taxes: deductions * 0.3, // 30% Steuern
                netPay,
            },
            include: { user: true }
        });
        res.json(updatedPayroll);
    }
    catch (error) {
        console.error('Fehler bei der Lohnberechnung:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.calculatePayroll = calculatePayroll;
const getPayrolls = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.query;
        const payrolls = yield prisma.employeePayroll.findMany({
            where: { userId: userId ? Number(userId) : undefined },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json(payrolls);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Lohnabrechnungen:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getPayrolls = getPayrolls;
const getPrefilledHours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, periodStart, periodEnd } = req.query;
        if (!userId || !periodStart || !periodEnd) {
            return res.status(400).json({ error: 'userId, periodStart und periodEnd sind erforderlich' });
        }
        const user = yield prisma.user.findUnique({ where: { id: Number(userId) } });
        if (!user)
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);
        // Hole alle WorkTime-Einträge im Zeitraum (nur abgeschlossene)
        const workTimes = yield prisma.workTime.findMany({
            where: {
                userId: Number(userId),
                startTime: { gte: startDate },
                endTime: {
                    not: null,
                    lte: endDate
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });
        // Kategorisiere Stunden
        const categorizedHours = categorizeWorkTimeHours(workTimes, user, startDate, endDate);
        res.json(categorizedHours);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der vorausgefüllten Stunden:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.getPrefilledHours = getPrefilledHours;
const generatePayrollPDF = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { payrollId } = req.params;
        const payroll = yield prisma.employeePayroll.findUnique({
            where: { id: Number(payrollId) },
            include: { user: true },
        });
        if (!payroll)
            return res.status(404).json({ error: 'Lohnabrechnung nicht gefunden' });
        // Sprache bestimmen
        const language = yield (0, translations_1.getUserLanguage)(payroll.userId);
        const t = (0, translations_1.getPayrollPDFTranslations)(language);
        const doc = new pdfkit_1.default();
        const tempPath = path_1.default.join(__dirname, `../../../tmp/payroll_${payrollId}_${Date.now()}.pdf`);
        // Stelle sicher, dass das Verzeichnis existiert
        const dir = path_1.default.dirname(tempPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const writeStream = fs_1.default.createWriteStream(tempPath);
        doc.pipe(writeStream);
        // PDF-Inhalt mit Übersetzungen
        doc.fontSize(18).text(t.title, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`${t.employee}: ${payroll.user.firstName} ${payroll.user.lastName}`);
        const periodSeparator = language === 'es' ? ' hasta ' : language === 'en' ? ' to ' : ' bis ';
        doc.text(`${t.period}: ${formatDate(payroll.periodStart, language)}${periodSeparator}${formatDate(payroll.periodEnd, language)}`);
        doc.text(`${t.country}: ${t.countries[payroll.user.payrollCountry]}`);
        if (payroll.user.payrollCountry === 'CO' && payroll.user.contractType) {
            doc.text(`${t.contractType}: ${t.contractTypes[payroll.user.contractType] || payroll.user.contractType}`);
        }
        doc.moveDown();
        doc.text(t.workingHours + ':', { underline: true });
        doc.text(`${t.regularHours}: ${payroll.regularHours}`);
        doc.text(`${t.overtimeHours}: ${payroll.overtimeHours}`);
        doc.text(`${t.nightHours}: ${payroll.nightHours}`);
        doc.text(`${t.holidaySundayHours}: ${payroll.holidayHours + payroll.sundayHolidayHours}`);
        if (payroll.user.payrollCountry === 'CO') {
            doc.text(`${t.overtimeNightHours}: ${payroll.overtimeNightHours}`);
            doc.text(`${t.overtimeSundayHolidayHours}: ${payroll.overtimeSundayHolidayHours}`);
            doc.text(`${t.overtimeNightSundayHolidayHours}: ${payroll.overtimeNightSundayHolidayHours}`);
        }
        doc.moveDown();
        doc.text(t.calculation + ':', { underline: true });
        doc.text(`${t.hourlyRate}: ${payroll.hourlyRate} ${payroll.currency}`);
        doc.text(`${t.grossPay}: ${payroll.grossPay} ${payroll.currency}`);
        doc.text(`${t.socialSecurity}: ${payroll.socialSecurity} ${payroll.currency}`);
        doc.text(`${t.taxes}: ${payroll.taxes} ${payroll.currency}`);
        doc.text(`${t.netPay}: ${payroll.netPay} ${payroll.currency}`);
        doc.moveDown(2);
        const currentDate = new Date();
        doc.text(`${t.createdOn}: ${formatDate(currentDate, language)}`);
        doc.end();
        // Warte, bis das PDF fertig geschrieben ist
        writeStream.on('finish', () => {
            const filenamePrefix = language === 'es' ? 'nomina' : language === 'en' ? 'payroll' : 'lohnabrechnung';
            res.download(tempPath, `${filenamePrefix}_${payroll.user.lastName}_${formatDate(payroll.periodEnd, language)}.pdf`, () => {
                // Lösche temporäre Datei nach dem Download
                fs_1.default.unlinkSync(tempPath);
            });
        });
    }
    catch (error) {
        console.error('Fehler beim Generieren des PDFs:', error);
        res.status(500).json({ error: 'Interner Serverfehler' });
    }
});
exports.generatePayrollPDF = generatePayrollPDF;
// Hilfsfunktionen
function calculateEffectiveHourlyRate(user) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!user.hourlyRate) {
            if (user.payrollCountry === 'CH') {
                return 50; // Standard-Stundensatz in CHF
            }
            else {
                return 50000; // Standard-Stundensatz in COP
            }
        }
        if (user.payrollCountry === 'CH' || !user.contractType || user.contractType === 'servicios_externos') {
            return Number(user.hourlyRate);
        }
        else {
            // Linear heruntergerechnet für tiempo parcial
            if (!user.monthlySalary)
                return Number(user.hourlyRate);
            const daysPerMonth = getDaysForContractType(user.contractType);
            const hoursPerDay = 8; // Standard-Arbeitsstunden pro Tag
            const totalHours = daysPerMonth * hoursPerDay;
            return user.monthlySalary / totalHours; // Stundenlohn = Monatslohn / Gesamtarbeitsstunden
        }
    });
}
function getDaysForContractType(contractType) {
    switch (contractType) {
        case 'tiempo_completo': return 22; // >21 Tage/Monat
        case 'tiempo_parcial_7': return 7; // ≤7 Tage/Monat
        case 'tiempo_parcial_14': return 14; // ≤14 Tage/Monat
        case 'tiempo_parcial_21': return 21; // ≤21 Tage/Monat
        case 'servicios_externos': return 0; // Stundenbasiert, kein fester Tag
        default: return 22; // Standard: tiempo completo
    }
}
function getPayrollEndDate(payrollCountry) {
    const now = new Date();
    if (payrollCountry === 'CH') {
        // Schweiz: Monatlich am 25. des Monats
        return new Date(now.getFullYear(), now.getMonth(), 25);
    }
    else {
        // Kolumbien: Zweimal monatlich (15. und letzter Tag des Monats)
        if (now.getDate() <= 15) {
            return new Date(now.getFullYear(), now.getMonth(), 15);
        }
        else {
            return new Date(now.getFullYear(), now.getMonth() + 1, 0); // Letzter Tag des Monats
        }
    }
}
function calculateGrossPay(payroll, payrollCountry, contractType) {
    const regularPay = payroll.regularHours * Number(payroll.hourlyRate);
    let overtimePay = 0, nightPay = 0, sundayHolidayPay = 0, holidayPay = 0;
    let overtimeNightPay = 0, overtimeSundayHolidayPay = 0, overtimeNightSundayHolidayPay = 0;
    if (payrollCountry === 'CH') {
        // Schweiz: 125% Überstunden, 125% Nachtstunden, 200% Feiertage (vereinfacht, kantonabhängig)
        overtimePay = payroll.overtimeHours * (Number(payroll.hourlyRate) * 1.25);
        nightPay = payroll.nightHours * (Number(payroll.hourlyRate) * 1.25);
        holidayPay = payroll.holidayHours * (Number(payroll.hourlyRate) * 2.0);
    }
    else {
        // Kolumbien: 125% Überstunden, 175% Nachtstunden, 200% Sonntags-/Feiertagsstunden, jeweils mit Überstunden-Zuschlägen
        overtimePay = payroll.overtimeHours * (Number(payroll.hourlyRate) * 1.25);
        nightPay = payroll.nightHours * (Number(payroll.hourlyRate) * 1.75);
        holidayPay = payroll.holidayHours * (Number(payroll.hourlyRate) * 2.0);
        sundayHolidayPay = payroll.sundayHolidayHours * (Number(payroll.hourlyRate) * 2.0);
        overtimeNightPay = payroll.overtimeNightHours * (Number(payroll.hourlyRate) * 2.1875); // 125% * 175% = 218.75%
        overtimeSundayHolidayPay = payroll.overtimeSundayHolidayHours * (Number(payroll.hourlyRate) * 2.5); // 125% * 200% = 250%
        overtimeNightSundayHolidayPay = payroll.overtimeNightSundayHolidayHours * (Number(payroll.hourlyRate) * 3.5); // 125% * 175% * 200% = 437.5%
    }
    return regularPay + overtimePay + nightPay + holidayPay + sundayHolidayPay +
        overtimeNightPay + overtimeSundayHolidayPay + overtimeNightSundayHolidayPay;
}
function calculateDeductions(grossPay, payrollCountry) {
    if (payrollCountry === 'CH') {
        // Schweiz: 10.6% Sozialversicherung (5.3% AHV/IV/EO, 2.2% ALV), 15% Quellensteuer (vereinfacht, kantonabhängig)
        const socialSecurity = grossPay * 0.106;
        const taxes = grossPay * 0.15;
        return socialSecurity + taxes;
    }
    else {
        // Kolumbien: 16% Sozialversicherung, 10% Einkommensteuer (vereinfacht)
        const socialSecurity = grossPay * 0.16;
        const taxes = grossPay * 0.1;
        return socialSecurity + taxes;
    }
}
// Feiertagsliste für Kolumbien (2025)
function getColombianHolidays(year) {
    const holidays = [];
    // Feste Feiertage
    holidays.push(new Date(year, 0, 1)); // Neujahr
    holidays.push(new Date(year, 0, 6)); // Heilige Drei Könige
    holidays.push(new Date(year, 2, 23)); // St. Josef
    holidays.push(new Date(year, 3, 1)); // Gründonnerstag (2025)
    holidays.push(new Date(year, 3, 2)); // Karfreitag (2025)
    holidays.push(new Date(year, 4, 1)); // Tag der Arbeit
    holidays.push(new Date(year, 5, 8)); // Fronleichnam (2025)
    holidays.push(new Date(year, 5, 29)); // St. Peter und Paul
    holidays.push(new Date(year, 6, 20)); // Unabhängigkeitstag
    holidays.push(new Date(year, 7, 7)); // Schlacht von Boyacá
    holidays.push(new Date(year, 7, 15)); // Mariä Himmelfahrt
    holidays.push(new Date(year, 9, 12)); // Kolumbus-Tag
    holidays.push(new Date(year, 10, 1)); // Allerheiligen
    holidays.push(new Date(year, 10, 11)); // Unabhängigkeit von Cartagena
    holidays.push(new Date(year, 11, 8)); // Mariä Empfängnis
    holidays.push(new Date(year, 11, 25)); // Weihnachten
    return holidays;
}
// Prüft ob ein Datum ein Feiertag ist
function isHoliday(date, payrollCountry) {
    if (payrollCountry === 'CO') {
        const holidays = getColombianHolidays(date.getFullYear());
        return holidays.some(h => (0, date_fns_1.isSameDay)(date, h));
    }
    // Schweiz: Feiertagsliste später implementieren (kantonabhängig)
    return false;
}
// Prüft ob eine Zeit in der Nachtzeit liegt
function isNightTime(startTime, endTime, nightStart, nightEnd) {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();
    const startMinute = startTime.getMinutes();
    const endMinute = endTime.getMinutes();
    // Über Mitternacht
    if (endTime < startTime || (endHour < startHour && endTime.getDate() !== startTime.getDate())) {
        return startHour >= nightStart || endHour < nightEnd;
    }
    // Normaler Fall: Prüfe ob Start oder Ende in Nachtzeit liegt
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const nightStartMinutes = nightStart * 60;
    const nightEndMinutes = nightEnd * 60;
    // Nachtzeit: 22:00-06:00 (CO) oder 20:00-06:00 (CH)
    // Das bedeutet: >= 22:00 (1320 Min) oder < 06:00 (360 Min)
    if (nightStart > nightEnd) {
        // Nachtzeit über Mitternacht (z.B. 22:00-06:00)
        return startTotalMinutes >= nightStartMinutes || endTotalMinutes < nightEndMinutes ||
            (startTotalMinutes < nightEndMinutes && endTotalMinutes >= nightStartMinutes);
    }
    else {
        // Normaler Fall (sollte nicht vorkommen bei Nachtzeit)
        return startTotalMinutes >= nightStartMinutes && endTotalMinutes < nightEndMinutes;
    }
}
// Kategorisiert WorkTime-Einträge in verschiedene Stundentypen
function categorizeWorkTimeHours(workTimes, user, periodStart, periodEnd) {
    const hours = {
        regular: 0,
        overtime: 0,
        night: 0,
        holidayHours: 0,
        sundayHoliday: 0,
        overtimeNight: 0,
        overtimeSundayHoliday: 0,
        overtimeNightSundayHoliday: 0
    };
    const isColombia = user.payrollCountry === 'CO';
    const nightStart = isColombia ? 22 : 20; // 22:00 CO, 20:00 CH
    const nightEnd = 6; // 06:00
    const normalWorkingHours = user.normalWorkingHours || 8; // Standard: 8 Stunden
    // Gruppiere WorkTimes nach Tag für bessere Überstunden-Berechnung
    const workTimesByDay = new Map();
    for (const workTime of workTimes) {
        if (!workTime.endTime)
            continue;
        const startTime = new Date(workTime.startTime);
        const dayKey = `${startTime.getFullYear()}-${startTime.getMonth()}-${startTime.getDate()}`;
        if (!workTimesByDay.has(dayKey)) {
            workTimesByDay.set(dayKey, []);
        }
        workTimesByDay.get(dayKey).push(workTime);
    }
    // Verarbeite jeden Tag
    for (const [dayKey, dayWorkTimes] of workTimesByDay.entries()) {
        // Berechne Gesamtstunden des Tages
        let totalDayHours = 0;
        for (const wt of dayWorkTimes) {
            const start = new Date(wt.startTime);
            const end = new Date(wt.endTime);
            totalDayHours += (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }
        const isOvertimeDay = totalDayHours > normalWorkingHours;
        const overtimeHours = Math.max(0, totalDayHours - normalWorkingHours);
        const regularDayHours = Math.min(totalDayHours, normalWorkingHours);
        // Verarbeite jeden WorkTime-Eintrag des Tages
        for (const workTime of dayWorkTimes) {
            const startTime = new Date(workTime.startTime);
            const endTime = new Date(workTime.endTime);
            const workHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
            const dayOfWeek = startTime.getDay(); // 0 = Sonntag
            const isSunday = dayOfWeek === 0;
            const isHolidayDay = isHoliday(startTime, user.payrollCountry);
            const isNight = isNightTime(startTime, endTime, nightStart, nightEnd);
            // Anteil dieses Eintrags an den Gesamtstunden
            const proportion = workHours / totalDayHours;
            const regularPart = regularDayHours * proportion;
            const overtimePart = overtimeHours * proportion;
            // Kategorisiere nach Priorität (höchste zuerst)
            if (isOvertimeDay && isNight && (isSunday || isHolidayDay)) {
                hours.overtimeNightSundayHoliday += overtimePart;
            }
            else if (isOvertimeDay && (isSunday || isHolidayDay)) {
                hours.overtimeSundayHoliday += overtimePart;
            }
            else if (isOvertimeDay && isNight) {
                hours.overtimeNight += overtimePart;
            }
            else if (isOvertimeDay) {
                hours.overtime += overtimePart;
            }
            else if (isNight && (isSunday || isHolidayDay)) {
                // Nacht + Sonntag/Feiertag (aber keine Überstunden)
                hours.sundayHoliday += workHours;
            }
            else if (isNight) {
                hours.night += workHours;
            }
            else if (isSunday || isHolidayDay) {
                hours.sundayHoliday += workHours;
            }
            else {
                hours.regular += workHours;
            }
        }
    }
    return hours;
}
function formatDate(date, language = 'de') {
    // Locale basierend auf Sprache
    const locales = {
        de: 'de-CH',
        es: 'es-CO',
        en: 'en-US'
    };
    const locale = locales[language] || 'de-CH';
    return date.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
//# sourceMappingURL=payrollController.js.map