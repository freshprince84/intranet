import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MonthlyReportData {
  id: number;
  reportNumber: string;
  periodStart: Date;
  periodEnd: Date;
  recipient: string;
  totalHours: number;
  currency: string;
  generatedAt: Date;
  user: {
    firstName: string;
    lastName: string;
  };
  items: Array<{
    clientName: string;
    totalHours: number;
    consultationCount: number;
  }>;
}

interface UserSettings {
  companyLogo?: string | null;
}

export const generateMonthlyReportPDF = async (
  report: MonthlyReportData,
  settings?: UserSettings | null
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fontSize(20).text('Monatliche Beratungsabrechnung', 50, 50);
      
      // Report-Informationen  
      doc.fontSize(12);
      doc.text(`Berichtsnummer: ${report.reportNumber}`, 50, 100);
      doc.text(`Berater: ${report.user.firstName} ${report.user.lastName}`, 50, 120);
      doc.text(`Rechnungsempfänger: ${report.recipient}`, 50, 140);
      doc.text(`Abrechnungszeitraum: ${format(report.periodStart, 'dd.MM.yyyy', { locale: de })} - ${format(report.periodEnd, 'dd.MM.yyyy', { locale: de })}`, 50, 160);
      doc.text(`Erstellt am: ${format(report.generatedAt, 'dd.MM.yyyy HH:mm', { locale: de })}`, 50, 180);

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
    } catch (error) {
      reject(error);
    }
  });
}; 