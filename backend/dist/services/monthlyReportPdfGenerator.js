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
exports.generateMonthlyReportPDF = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const generateMonthlyReportPDF = (report, settings) => __awaiter(void 0, void 0, void 0, function* () {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            // Header
            doc.fontSize(20).text('Monatliche Beratungsabrechnung', 50, 50);
            // Report-Informationen  
            doc.fontSize(12);
            doc.text(`Berichtsnummer: ${report.reportNumber}`, 50, 100);
            doc.text(`Berater: ${report.user.firstName} ${report.user.lastName}`, 50, 120);
            doc.text(`Rechnungsempfänger: ${report.recipient}`, 50, 140);
            doc.text(`Abrechnungszeitraum: ${(0, date_fns_1.format)(report.periodStart, 'dd.MM.yyyy', { locale: locale_1.de })} - ${(0, date_fns_1.format)(report.periodEnd, 'dd.MM.yyyy', { locale: locale_1.de })}`, 50, 160);
            doc.text(`Erstellt am: ${(0, date_fns_1.format)(report.generatedAt, 'dd.MM.yyyy HH:mm', { locale: locale_1.de })}`, 50, 180);
            // Linie
            doc.moveTo(50, 210).lineTo(550, 210).stroke();
            // Tabellen-Header
            let yPosition = 240;
            doc.fontSize(10);
            doc.text('Client', 50, yPosition);
            doc.text('Anzahl Beratungen', 250, yPosition);
            doc.text('Stunden', 400, yPosition);
            // Linie unter Header
            doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
            yPosition += 30;
            // Tabellen-Inhalt
            report.items.forEach((item) => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }
                doc.text(item.clientName, 50, yPosition);
                doc.text(item.consultationCount.toString(), 250, yPosition);
                doc.text(`${item.totalHours.toFixed(2)} h`, 400, yPosition);
                yPosition += 20;
            });
            // Total
            doc.fontSize(12);
            doc.text('Gesamtstunden:', 300, yPosition + 30);
            doc.text(`${report.totalHours.toFixed(2)} h`, 400, yPosition + 30);
            // Footer
            yPosition += 60;
            doc.fontSize(10);
            doc.text('Diese Abrechnung wurde automatisch generiert.', 50, yPosition);
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
});
exports.generateMonthlyReportPDF = generateMonthlyReportPDF;
//# sourceMappingURL=monthlyReportPdfGenerator.js.map