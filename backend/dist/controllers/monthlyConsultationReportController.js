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
exports.generateMonthlyReportPDF = exports.checkUnbilledConsultations = exports.deleteMonthlyReport = exports.updateReportStatus = exports.generateAutomaticMonthlyReport = exports.generateMonthlyReport = exports.getMonthlyReportById = exports.getMonthlyReports = void 0;
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const prisma = new client_1.PrismaClient();
// Alle Monatsberichte des Benutzers abrufen
const getMonthlyReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const reports = yield prisma.monthlyConsultationReport.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        client: true
                    }
                }
            },
            orderBy: { periodStart: 'desc' }
        });
        res.json(reports);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Monatsberichte:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getMonthlyReports = getMonthlyReports;
// Einzelnen Monatsbericht abrufen
const getMonthlyReportById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const reportId = parseInt(req.params.id, 10);
        if (isNaN(userId) || isNaN(reportId)) {
            return res.status(400).json({ message: 'Ungültige Parameter' });
        }
        const report = yield prisma.monthlyConsultationReport.findFirst({
            where: {
                id: reportId,
                userId
            },
            include: {
                items: {
                    include: {
                        client: true
                    }
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        if (!report) {
            return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
        }
        res.json(report);
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Monatsberichts:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getMonthlyReportById = getMonthlyReportById;
// Monatsbericht für einen bestimmten Zeitraum generieren
const generateMonthlyReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { periodStart, periodEnd, recipient } = req.body;
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!periodStart || !periodEnd || !recipient) {
            return res.status(400).json({
                message: 'Zeitraum (periodStart, periodEnd) und Empfänger sind erforderlich'
            });
        }
        const startDate = new Date(periodStart);
        const endDate = new Date(periodEnd);
        // Hole alle bestehenden Monthly Reports um deren Zeiträume zu ermitteln
        const existingReports = yield prisma.monthlyConsultationReport.findMany({
            where: {
                userId
            },
            select: {
                periodStart: true,
                periodEnd: true
            }
        });
        // Hole alle nicht-abgerechneten Beratungen im Zeitraum
        const consultations = yield prisma.workTime.findMany({
            where: {
                userId,
                clientId: { not: null },
                startTime: {
                    gte: startDate,
                    lte: endDate
                },
                AND: [
                    // Nur Beratungen, die noch nicht in einer Rechnung sind
                    { invoiceItems: { none: {} } },
                    // Und noch nicht in einem Monatsbericht sind
                    { monthlyReportId: null }
                ]
            },
            include: {
                client: true
            }
        });
        if (consultations.length === 0) {
            return res.status(400).json({
                message: 'Keine nicht-abgerechneten Beratungen im angegebenen Zeitraum gefunden'
            });
        }
        // Gruppiere nach Client und berechne Summen
        const clientGroups = new Map();
        consultations.forEach(consultation => {
            if (!consultation.client || !consultation.endTime)
                return;
            const clientId = consultation.client.id;
            const duration = (new Date(consultation.endTime).getTime() - new Date(consultation.startTime).getTime()) / (1000 * 60 * 60);
            if (clientGroups.has(clientId)) {
                const group = clientGroups.get(clientId);
                group.totalHours += duration;
                group.consultationCount += 1;
            }
            else {
                clientGroups.set(clientId, {
                    client: consultation.client,
                    totalHours: duration,
                    consultationCount: 1
                });
            }
        });
        // Berechne Gesamtstunden
        const totalHours = Array.from(clientGroups.values())
            .reduce((sum, group) => sum + group.totalHours, 0);
        // Generiere Berichtsnummer
        const reportNumber = `MR-${(0, date_fns_1.format)(new Date(), 'yyyyMM')}-${userId.toString().padStart(3, '0')}`;
        // Erstelle Monatsbericht in Transaktion
        const report = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const newReport = yield tx.monthlyConsultationReport.create({
                data: {
                    userId,
                    reportNumber,
                    periodStart: startDate,
                    periodEnd: endDate,
                    recipient,
                    totalHours,
                    currency: 'CHF',
                    status: 'GENERATED'
                }
            });
            // Erstelle Report Items
            const reportItems = Array.from(clientGroups.entries()).map(([clientId, group]) => ({
                reportId: newReport.id,
                clientId,
                clientName: group.client.name,
                totalHours: group.totalHours,
                consultationCount: group.consultationCount
            }));
            yield tx.monthlyConsultationReportItem.createMany({
                data: reportItems
            });
            // Verknüpfe alle WorkTime-Einträge mit dem Report
            yield tx.workTime.updateMany({
                where: {
                    id: { in: consultations.map(c => c.id) }
                },
                data: {
                    monthlyReportId: newReport.id
                }
            });
            return newReport;
        }));
        // Lade den vollständigen Bericht mit Items
        const fullReport = yield prisma.monthlyConsultationReport.findUnique({
            where: { id: report.id },
            include: {
                items: {
                    include: {
                        client: true
                    }
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        res.status(201).json(fullReport);
    }
    catch (error) {
        console.error('Fehler beim Generieren des Monatsberichts:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.generateMonthlyReport = generateMonthlyReport;
// Automatische Monatsbericht-Generierung basierend auf User-Einstellungen
const generateAutomaticMonthlyReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole User-Einstellungen
        const invoiceSettings = yield prisma.invoiceSettings.findUnique({
            where: { userId }
        });
        if (!(invoiceSettings === null || invoiceSettings === void 0 ? void 0 : invoiceSettings.monthlyReportEnabled)) {
            return res.status(400).json({
                message: 'Automatische Monatsabrechnung ist nicht aktiviert'
            });
        }
        if (!invoiceSettings.monthlyReportRecipient) {
            return res.status(400).json({
                message: 'Kein Rechnungsempfänger konfiguriert'
            });
        }
        const reportDay = invoiceSettings.monthlyReportDay;
        const today = new Date();
        // Berechne Zeitraum basierend auf dem konfigurierten Tag
        let periodEnd;
        let periodStart;
        if (today.getDate() >= reportDay) {
            // Aktueller Monat: vom reportDay des Vormonats bis reportDay-1 des aktuellen Monats
            periodEnd = new Date(today.getFullYear(), today.getMonth(), reportDay - 1, 23, 59, 59);
            periodStart = new Date(today.getFullYear(), today.getMonth() - 1, reportDay);
        }
        else {
            // Vormonat: vom reportDay des Vor-Vormonats bis reportDay-1 des Vormonats
            periodEnd = new Date(today.getFullYear(), today.getMonth() - 1, reportDay - 1, 23, 59, 59);
            periodStart = new Date(today.getFullYear(), today.getMonth() - 2, reportDay);
        }
        // Prüfe, ob bereits ein Bericht für diesen Zeitraum existiert
        const existingReport = yield prisma.monthlyConsultationReport.findFirst({
            where: {
                userId,
                periodStart: {
                    gte: periodStart,
                    lt: new Date(periodStart.getTime() + 24 * 60 * 60 * 1000) // +1 Tag
                }
            }
        });
        if (existingReport) {
            return res.status(400).json({
                message: 'Für diesen Zeitraum existiert bereits ein Monatsbericht'
            });
        }
        // Generiere Bericht mit den berechneten Daten
        const generateRequest = Object.assign(Object.assign({}, req), { body: {
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                recipient: invoiceSettings.monthlyReportRecipient
            } });
        return (0, exports.generateMonthlyReport)(generateRequest, res);
    }
    catch (error) {
        console.error('Fehler beim automatischen Generieren des Monatsberichts:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.generateAutomaticMonthlyReport = generateAutomaticMonthlyReport;
// Monatsbericht-Status aktualisieren
const updateReportStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const reportId = parseInt(req.params.id, 10);
        const { status } = req.body;
        if (isNaN(userId) || isNaN(reportId)) {
            return res.status(400).json({ message: 'Ungültige Parameter' });
        }
        if (!['GENERATED', 'SENT', 'ARCHIVED'].includes(status)) {
            return res.status(400).json({ message: 'Ungültiger Status' });
        }
        const report = yield prisma.monthlyConsultationReport.updateMany({
            where: {
                id: reportId,
                userId
            },
            data: { status }
        });
        if (report.count === 0) {
            return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
        }
        res.json({ message: 'Status erfolgreich aktualisiert' });
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Report-Status:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.updateReportStatus = updateReportStatus;
// Monatsbericht löschen
const deleteMonthlyReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const reportId = parseInt(req.params.id, 10);
        if (isNaN(userId) || isNaN(reportId)) {
            return res.status(400).json({ message: 'Ungültige Parameter' });
        }
        const report = yield prisma.monthlyConsultationReport.deleteMany({
            where: {
                id: reportId,
                userId
            }
        });
        if (report.count === 0) {
            return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
        }
        res.json({ message: 'Monatsbericht erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Fehler beim Löschen des Monatsberichts:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.deleteMonthlyReport = deleteMonthlyReport;
// Prüfe, ob nicht-abgerechnete Beratungen vorhanden sind
const checkUnbilledConsultations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { periodStart, periodEnd } = req.query;
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        let whereClause = {
            userId,
            clientId: { not: null },
            endTime: { not: null },
            AND: [
                // Nicht in einer Rechnung abgerechnet
                { invoiceItems: { none: {} } },
                // Und nicht in einem Monatsbericht abgerechnet
                { monthlyReportId: null }
            ]
        };
        if (periodStart && periodEnd) {
            whereClause.startTime = {
                gte: new Date(periodStart),
                lte: new Date(periodEnd)
            };
        }
        const count = yield prisma.workTime.count({
            where: whereClause
        });
        const consultations = yield prisma.workTime.findMany({
            where: whereClause,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            take: 10 // Nur die ersten 10 für Preview
        });
        res.json({
            count,
            hasUnbilledConsultations: count > 0,
            preview: consultations
        });
    }
    catch (error) {
        console.error('Fehler beim Prüfen nicht-abgerechneter Beratungen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.checkUnbilledConsultations = checkUnbilledConsultations;
// PDF für Monatsbericht generieren
const generateMonthlyReportPDF = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const report = yield prisma.monthlyConsultationReport.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId)
            },
            include: {
                user: true,
                items: {
                    include: {
                        client: true
                    }
                }
            }
        });
        if (!report) {
            return res.status(404).json({ message: 'Monatsbericht nicht gefunden' });
        }
        // Hole User-Settings für PDF-Generierung
        const settings = yield prisma.settings.findUnique({
            where: { userId: Number(userId) }
        });
        // Importiere den PDF Generator dynamisch
        const { generateMonthlyReportPDF: generatePDF } = yield Promise.resolve().then(() => __importStar(require('../services/monthlyReportPdfGenerator')));
        // Generiere PDF (Konvertiere alle Decimal-Felder zu Number für PDF-Generator)
        const reportForPDF = {
            id: report.id,
            reportNumber: report.reportNumber,
            periodStart: report.periodStart,
            periodEnd: report.periodEnd,
            recipient: report.recipient,
            totalHours: Number(report.totalHours), // Decimal zu Number
            currency: report.currency,
            generatedAt: report.generatedAt,
            user: {
                firstName: report.user.firstName,
                lastName: report.user.lastName
            },
            items: report.items.map(item => ({
                clientName: item.clientName,
                totalHours: Number(item.totalHours), // Decimal zu Number
                consultationCount: item.consultationCount
            }))
        };
        const pdfBuffer = yield generatePDF(reportForPDF, settings);
        // Speichere PDF-Pfad (optional)
        const pdfPath = `monthly-reports/${report.reportNumber}.pdf`;
        yield prisma.monthlyConsultationReport.update({
            where: { id: report.id },
            data: { pdfPath }
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${report.reportNumber}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Fehler beim Generieren des PDFs:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.generateMonthlyReportPDF = generateMonthlyReportPDF;
//# sourceMappingURL=monthlyConsultationReportController.js.map