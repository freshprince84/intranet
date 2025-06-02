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
exports.generatePayrollPDF = exports.getPayrolls = exports.calculatePayroll = exports.saveWorkHours = void 0;
const client_1 = require("@prisma/client");
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();
const saveWorkHours = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, hours } = req.body; // hours: { regular, overtime, night, sundayHoliday, overtimeNight, overtimeSundayHoliday, overtimeNightSundayHoliday }
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ error: 'Benutzer nicht gefunden' });
        const effectiveHourlyRate = yield calculateEffectiveHourlyRate(user);
        const payroll = yield prisma.employeePayroll.create({
            data: {
                userId,
                periodStart: new Date(),
                periodEnd: getPayrollEndDate(user.payrollCountry),
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
const generatePayrollPDF = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { payrollId } = req.params;
        const payroll = yield prisma.employeePayroll.findUnique({
            where: { id: Number(payrollId) },
            include: { user: true },
        });
        if (!payroll)
            return res.status(404).json({ error: 'Lohnabrechnung nicht gefunden' });
        const doc = new pdfkit_1.default();
        const tempPath = path_1.default.join(__dirname, `../../../tmp/payroll_${payrollId}_${Date.now()}.pdf`);
        // Stelle sicher, dass das Verzeichnis existiert
        const dir = path_1.default.dirname(tempPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        const writeStream = fs_1.default.createWriteStream(tempPath);
        doc.pipe(writeStream);
        // PDF-Inhalt
        doc.fontSize(18).text('Lohnabrechnung', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Mitarbeiter: ${payroll.user.firstName} ${payroll.user.lastName}`);
        doc.text(`Abrechnungszeitraum: ${formatDate(payroll.periodStart)} bis ${formatDate(payroll.periodEnd)}`);
        doc.text(`Land: ${payroll.user.payrollCountry === 'CH' ? 'Schweiz' : 'Kolumbien'}`);
        if (payroll.user.payrollCountry === 'CO' && payroll.user.contractType) {
            doc.text(`Vertragsart: ${formatContractType(payroll.user.contractType)}`);
        }
        doc.moveDown();
        doc.text('Arbeitsstunden:', { underline: true });
        doc.text(`Reguläre Stunden: ${payroll.regularHours}`);
        doc.text(`Überstunden: ${payroll.overtimeHours}`);
        doc.text(`Nachtstunden: ${payroll.nightHours}`);
        doc.text(`Feiertags-/Sonntagsstunden: ${payroll.holidayHours + payroll.sundayHolidayHours}`);
        if (payroll.user.payrollCountry === 'CO') {
            doc.text(`Nachtüberstunden: ${payroll.overtimeNightHours}`);
            doc.text(`Feiertags-/Sonntagsüberstunden: ${payroll.overtimeSundayHolidayHours}`);
            doc.text(`Nacht-Feiertags-/Sonntagsüberstunden: ${payroll.overtimeNightSundayHolidayHours}`);
        }
        doc.moveDown();
        doc.text('Abrechnung:', { underline: true });
        doc.text(`Stundensatz: ${payroll.hourlyRate} ${payroll.currency}`);
        doc.text(`Bruttolohn: ${payroll.grossPay} ${payroll.currency}`);
        doc.text(`Sozialversicherungsbeiträge: ${payroll.socialSecurity} ${payroll.currency}`);
        doc.text(`Steuern: ${payroll.taxes} ${payroll.currency}`);
        doc.text(`Nettolohn: ${payroll.netPay} ${payroll.currency}`);
        doc.moveDown(2);
        const currentDate = new Date();
        doc.text(`Erstellt am: ${formatDate(currentDate)}`);
        doc.end();
        // Warte, bis das PDF fertig geschrieben ist
        writeStream.on('finish', () => {
            res.download(tempPath, `lohnabrechnung_${payroll.user.lastName}_${formatDate(payroll.periodEnd)}.pdf`, () => {
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
function formatDate(date) {
    return date.toLocaleDateString('de-CH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}
function formatContractType(contractType) {
    switch (contractType) {
        case 'tiempo_completo': return 'Tiempo Completo (>21 Tage/Monat)';
        case 'tiempo_parcial_7': return 'Tiempo Parcial (≤7 Tage/Monat)';
        case 'tiempo_parcial_14': return 'Tiempo Parcial (≤14 Tage/Monat)';
        case 'tiempo_parcial_21': return 'Tiempo Parcial (≤21 Tage/Monat)';
        case 'servicios_externos': return 'Servicios Externos (Stundenbasiert)';
        default: return contractType;
    }
}
//# sourceMappingURL=payrollController.js.map