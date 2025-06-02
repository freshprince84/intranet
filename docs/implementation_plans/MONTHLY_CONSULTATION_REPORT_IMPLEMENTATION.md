# Implementierungsplan: Monatliche Beratungsabrechnung für Intranet

## Übersicht
Dieses Dokument enthält den detaillierten Schritt-für-Schritt Plan zur Implementierung der monatlichen Beratungsabrechnung. Das System erstellt automatisch monatliche PDF-Abrechnungen für Berater an ihre Arbeitgeber.

**WICHTIG**: Nach JEDEM erledigten Schritt:
1. Checkbox abhaken (☑️)
2. Commit erstellen mit aussagekräftiger Message
3. Zum nächsten Schritt gehen

## Analyse der bestehenden Implementierung

### Was bereits vorhanden ist:
- [x] Consultation-Modul mit Client-Verwaltung
- [x] Zeiterfassung für Beratungen
- [x] Einzelrechnungen für Clients (QR-Rechnungen) mit ConsultationInvoice/ConsultationInvoiceItem
- [x] InvoiceSettings Model für QR-Rechnungseinstellungen (BLEIBT BESTEHEN!)
- [x] PDF-Generator für QR-Rechnungen (BLEIBT BESTEHEN!)
- [x] Settings-Seite mit Tabs (Persönlich, Benachrichtigungen, System)
- [x] Doppelabrechnung-Schutz via ConsultationInvoiceItem

### Was neu hinzugefügt wird:
- [x] Settings Model um Monatsabrechnungs-Felder erweitern
- [x] Neues MonthlyConsultationReport Model (NUR für Berater-Abrechnungen)
- [x] Neuer PDF-Generator für Monatsberichte (einfaches Format)
- [x] Logic um bereits abgerechnete WorkTimes auszuschließen

### ⚠️ **WICHTIG**: Bestehende Funktionalität bleibt vollständig erhalten!
- Einzelrechnungen über Button weiterhin möglich
- InvoiceSettings bleiben für QR-Rechnungen
- Monatsabrechnung berücksichtigt nur NICHT-abgerechnete Beratungen

## Phase 1: Datenbank-Schema erweitern

### Schritt 1.1: Prisma Schema für Monatsabrechnung erweitern
- [x] Öffne `backend/prisma/schema.prisma`
- [x] Erweitere das bestehende `Settings` Model um Monatsabrechnungs-Felder:

```prisma
model Settings {
  id                      Int      @id @default(autoincrement())
  userId                  Int      @unique
  companyLogo             String?
  darkMode                Boolean  @default(false)
  sidebarCollapsed        Boolean  @default(false)
  // Neue Felder für Monatsabrechnung
  monthlyReportEnabled    Boolean  @default(false)
  monthlyReportDay        Int      @default(25) // Tag im Monat (1-28)
  monthlyReportRecipient  String?  // Rechnungsempfänger
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
  user                    User     @relation(fields: [userId], references: [id])
}
```

- [x] Füge neues Model für Monatsabrechnungen hinzu:

```prisma
model MonthlyConsultationReport {
  id                Int                           @id @default(autoincrement())
  userId            Int                          // Berater
  reportNumber      String                       @unique
  periodStart       DateTime                     // Beginn des Abrechnungszeitraums
  periodEnd         DateTime                     // Ende des Abrechnungszeitraums
  recipient         String                       // Rechnungsempfänger
  totalHours        Decimal                      @db.Decimal(10, 2)
  currency          String                       @default("CHF")
  pdfPath           String?
  status            MonthlyReportStatus          @default(GENERATED)
  generatedAt       DateTime                     @default(now())
  createdAt         DateTime                     @default(now())
  updatedAt         DateTime                     @updatedAt
  
  user              User                         @relation(fields: [userId], references: [id])
  items             MonthlyConsultationReportItem[]
}

model MonthlyConsultationReportItem {
  id                Int                           @id @default(autoincrement())
  reportId          Int
  clientId          Int
  clientName        String                       // Snapshot des Client-Namens
  totalHours        Decimal                      @db.Decimal(10, 2)
  consultationCount Int                          // Anzahl Beratungen
  createdAt         DateTime                     @default(now())
  
  report            MonthlyConsultationReport    @relation(fields: [reportId], references: [id], onDelete: Cascade)
  client            Client                       @relation(fields: [clientId], references: [id])
}

enum MonthlyReportStatus {
  GENERATED
  SENT
  ARCHIVED
}
```

- [x] Erweitere das bestehende `User` Model:
```prisma
  monthlyReports    MonthlyConsultationReport[]
```

- [x] Erweitere das bestehende `Client` Model:
```prisma
  monthlyReportItems MonthlyConsultationReportItem[]
```

### Schritt 1.2: Migration erstellen und ausführen
- [x] Terminal öffnen im `backend` Verzeichnis
- [x] Führe aus: `npx prisma migrate dev --name add_monthly_consultation_reports`
- [x] Warte bis Migration erfolgreich durchgelaufen ist
- [x] **WICHTIG**: Bitte den Nutzer, den Server neu zu starten

## Phase 2: Backend API - Settings erweitern

### Schritt 2.1: Settings Controller erweitern
- [x] Öffne `backend/src/controllers/userController.ts`
- [x] Erweitere die `updateUserSettings` Funktion um die neuen Felder:

```typescript
export const updateUserSettings = async (req: AuthenticatedRequest & { body: UpdateUserSettingsRequest }, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // Validierung für monthlyReportDay
        if (req.body.monthlyReportDay !== undefined) {
            const day = req.body.monthlyReportDay;
            if (day < 1 || day > 28) {
                return res.status(400).json({ message: 'Abrechnungstag muss zwischen 1 und 28 liegen' });
            }
        }

        // Prüfen, ob es bereits Einstellungen gibt
        let settings = await prisma.settings.findUnique({
            where: { userId }
        });

        if (settings) {
            // Einstellungen aktualisieren
            settings = await prisma.settings.update({
                where: { userId },
                data: {
                    ...(req.body.darkMode !== undefined && { darkMode: req.body.darkMode }),
                    ...(req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed }),
                    ...(req.body.monthlyReportEnabled !== undefined && { monthlyReportEnabled: req.body.monthlyReportEnabled }),
                    ...(req.body.monthlyReportDay !== undefined && { monthlyReportDay: req.body.monthlyReportDay }),
                    ...(req.body.monthlyReportRecipient !== undefined && { monthlyReportRecipient: req.body.monthlyReportRecipient })
                }
            });
        } else {
            // Neue Einstellungen erstellen
            settings = await prisma.settings.create({
                data: {
                    userId,
                    ...(req.body.darkMode !== undefined && { darkMode: req.body.darkMode }),
                    ...(req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed }),
                    ...(req.body.monthlyReportEnabled !== undefined && { monthlyReportEnabled: req.body.monthlyReportEnabled }),
                    ...(req.body.monthlyReportDay !== undefined && { monthlyReportDay: req.body.monthlyReportDay }),
                    ...(req.body.monthlyReportRecipient !== undefined && { monthlyReportRecipient: req.body.monthlyReportRecipient })
                }
            });
        }

        res.json(settings);
    } catch (error) {
        console.error('Error in updateUserSettings:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Benutzereinstellungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};
```

### Schritt 2.2: Monthly Report Controller erstellen
- [x] Erstelle neue Datei: `backend/src/controllers/monthlyConsultationReportController.ts`
- [x] Füge folgenden Code ein:

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateMonthlyReportPDF } from '../services/monthlyReportPdfGenerator';
import { startOfDay, endOfDay, subMonths, format } from 'date-fns';
import { de } from 'date-fns/locale';

const prisma = new PrismaClient();

// Monatsbericht manuell generieren
export const generateMonthlyReport = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { reportDate } = req.body; // Optional: spezifisches Datum

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Hole User-Settings
    const settings = await prisma.settings.findUnique({
      where: { userId: Number(userId) }
    });

    if (!settings?.monthlyReportEnabled) {
      return res.status(400).json({ message: 'Monatliche Abrechnung ist nicht aktiviert' });
    }

    if (!settings.monthlyReportRecipient) {
      return res.status(400).json({ message: 'Kein Rechnungsempfänger konfiguriert' });
    }

    // Berechne Zeitraum
    const baseDate = reportDate ? new Date(reportDate) : new Date();
    const reportDay = settings.monthlyReportDay;
    
    // Vom reportDay des Vormonats bis reportDay-1 des aktuellen Monats
    const periodEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), reportDay - 1, 23, 59, 59);
    const periodStart = startOfDay(subMonths(new Date(baseDate.getFullYear(), baseDate.getMonth(), reportDay), 1));

    // Prüfe ob bereits ein Report für diesen Zeitraum existiert
    const existingReport = await prisma.monthlyConsultationReport.findFirst({
      where: {
        userId: Number(userId),
        periodStart,
        periodEnd
      }
    });

    if (existingReport) {
      return res.status(400).json({ 
        message: 'Für diesen Zeitraum existiert bereits ein Bericht',
        reportId: existingReport.id
      });
    }

    // Hole Beratungen für den Zeitraum (NUR nicht-abgerechnete!)
    const consultations = await prisma.workTime.findMany({
      where: {
        userId: Number(userId),
        clientId: { not: null },
        endTime: { not: null },
        startTime: {
          gte: periodStart,
          lte: periodEnd
        },
        // WICHTIG: Nur Beratungen die noch nicht abgerechnet wurden
        invoiceItems: {
          none: {}
        }
      },
      include: {
        client: true,
        branch: true
      }
    });

    if (consultations.length === 0) {
      return res.status(400).json({ message: 'Keine Beratungen im angegebenen Zeitraum gefunden' });
    }

    // Gruppiere nach Client und berechne Summen
    const clientGroups = new Map();
    let totalHours = 0;

    consultations.forEach(consultation => {
      if (!consultation.client || !consultation.endTime) return;

      const clientId = consultation.client.id;
      const duration = (new Date(consultation.endTime).getTime() - new Date(consultation.startTime).getTime()) / (1000 * 60 * 60);
      
      if (!clientGroups.has(clientId)) {
        clientGroups.set(clientId, {
          client: consultation.client,
          hours: 0,
          count: 0
        });
      }

      const group = clientGroups.get(clientId);
      group.hours += duration;
      group.count += 1;
      totalHours += duration;
    });

    // Generiere Report-Nummer
    const reportNumber = `MR-${format(baseDate, 'yyyy-MM')}-${userId.toString().padStart(3, '0')}`;

    // Erstelle Report in Transaktion
    const report = await prisma.$transaction(async (tx) => {
      const newReport = await tx.monthlyConsultationReport.create({
        data: {
          userId: Number(userId),
          reportNumber,
          periodStart,
          periodEnd,
          recipient: settings.monthlyReportRecipient!,
          totalHours: totalHours,
          currency: 'CHF'
        }
      });

      // Erstelle Report Items (OHNE Beträge!)
      const items = Array.from(clientGroups.entries()).map(([clientId, group]) => ({
        reportId: newReport.id,
        clientId,
        clientName: group.client.name,
        totalHours: group.hours,
        consultationCount: group.count
        // ENTFERNT: hourlyRate, amount
      }));

      await tx.monthlyConsultationReportItem.createMany({
        data: items
      });

      return newReport;
    });

    // Lade vollständigen Report
    const fullReport = await prisma.monthlyConsultationReport.findUnique({
      where: { id: report.id },
      include: {
        user: true,
        items: {
          include: {
            client: true
          }
        }
      }
    });

    res.status(201).json(fullReport);
  } catch (error) {
    console.error('Fehler beim Generieren des Monatsberichts:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Alle Monatsberichte abrufen
export const getMonthlyReports = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { year, status } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    let whereClause: any = {
      userId: Number(userId)
    };

    if (status) {
      whereClause.status = status;
    }

    if (year) {
      const yearNum = parseInt(year as string);
      whereClause.periodStart = {
        gte: new Date(yearNum, 0, 1),
        lt: new Date(yearNum + 1, 0, 1)
      };
    }

    const reports = await prisma.monthlyConsultationReport.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            client: true
          }
        }
      },
      orderBy: {
        periodStart: 'desc'
      }
    });

    res.json(reports);
  } catch (error) {
    console.error('Fehler beim Abrufen der Monatsberichte:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// PDF für Monatsbericht generieren
export const generateMonthlyReportPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    const report = await prisma.monthlyConsultationReport.findFirst({
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
    const settings = await prisma.settings.findUnique({
      where: { userId: Number(userId) }
    });

    // Generiere PDF
    const pdfBuffer = await generateMonthlyReportPDF(report, settings);
    
    // Speichere PDF-Pfad (optional)
    const pdfPath = `monthly-reports/${report.reportNumber}.pdf`;
    await prisma.monthlyConsultationReport.update({
      where: { id: report.id },
      data: { pdfPath }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Fehler beim Generieren des PDFs:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};
```

### Schritt 2.3: Monthly Report Routes erstellen
- [x] Erstelle neue Datei: `backend/src/routes/monthlyConsultationReports.ts`
- [x] Füge folgenden Code ein:

```typescript
import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  generateMonthlyReport,
  getMonthlyReports,
  generateMonthlyReportPDF
} from '../controllers/monthlyConsultationReportController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Monthly Report Routen
router.post('/generate', generateMonthlyReport);
router.get('/', getMonthlyReports);
router.get('/:id/pdf', generateMonthlyReportPDF);

export default router;
```

### Schritt 2.4: Routes in server.ts einbinden
- [x] Öffne `backend/src/server.ts`
- [x] Füge nach den anderen imports hinzu:
```typescript
import monthlyConsultationReportsRoutes from './routes/monthlyConsultationReports';
```
- [x] Füge nach den anderen Route-Definitionen hinzu:
```typescript
app.use('/api/monthly-consultation-reports', monthlyConsultationReportsRoutes);
```

### Schritt 2.6: Frontend anpassen für neue API-Endpunkte
- [x] Settings.tsx: API-Calls zu `/users/invoice-settings` anpassen (API_ENDPOINTS.USERS.INVOICE_SETTINGS)
- [x] Auto-Save Muster implementieren (wie bei Dark Mode)
- [x] Save-Button entfernt - Einstellungen speichern automatisch bei Änderung
- [x] API-Config um USERS.INVOICE_SETTINGS Endpunkt erweitert
- [x] Datenquelle korrekt: user.invoiceSettings (nicht user.settings)

### Schritt 2.7: TypeScript Types aktualisieren
- [x] User Interface in frontend/src/types/interfaces.ts erweitern
- [x] InvoiceSettings und Settings interfaces hinzufügen
- [x] monthlyReportSettings undefined-Checks fixen

### Schritt 2.8: Backend Controller anpassen
- [x] monthlyConsultationReportController.ts: settings → invoiceSettings
- [x] Alle Zugriffe auf monthlyReport* Felder anpassen
- [x] Prisma Queries auf invoiceSettings Tabelle umstellen

### Schritt 2.9: PDF Generator Service erstellen
- [x] monthlyReportPdfGenerator.ts: PDF Service für Monthly Reports
- [x] MonthlyReportData Interface definieren
- [x] Decimal zu Number Konvertierung für PDF

### Schritt 2.10: Dependencies installieren
- [x] PDFKit und @types/pdfkit installieren

### Schritt 2.11: Type-Konvertierung fixen
- [x] Decimal zu Number Konvertierung in Controller
- [x] PDF-Generator Interface anpassen

### Schritt 2.12: Tests & Validierung
- [x] TypeScript Compilation erfolgreich
- [x] Backend startet ohne Fehler
- [x] Frontend Settings funktionieren

## Phase 3: PDF Generator erstellen

### Schritt 3.1: Einfachen PDF Generator erstellen  
- [x] Erstelle neue Datei: `backend/src/services/monthlyReportPdfGenerator.ts`
- [x] Füge folgenden Code ein (OHNE QR-Code, einfaches Format):

```typescript
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

      // Tabellen-Header (OHNE Betrag-Spalte!)
      let yPosition = 240;
      doc.fontSize(10);
      doc.text('Client', 50, yPosition);
      doc.text('Anzahl Beratungen', 250, yPosition);
      doc.text('Stunden', 400, yPosition);
      
      // Linie unter Header
      doc.moveTo(50, yPosition + 15).lineTo(550, yPosition + 15).stroke();
      yPosition += 30;

      // Tabellen-Inhalt (NUR Stunden!)
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

      // Total (NUR Stunden!)
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
```

## Phase 4: Frontend - Settings erweitern

### Schritt 4.1: Settings Interface erweitern
- [x] Öffne `frontend/src/types/index.ts` (oder entsprechende Types-Datei)
- [x] Erweitere das Settings Interface:

```typescript
export interface Settings {
  id: number;
  userId: number;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  monthlyReportEnabled: boolean;
  monthlyReportDay: number;
  monthlyReportRecipient?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
```

### Schritt 4.2: Settings Seite erweitern
- [x] Öffne `frontend/src/pages/Settings.tsx`
- [x] Erweitere den 'personal' Tab um Monatsabrechnungs-Einstellungen:

```typescript
// Nach dem Dark Mode Toggle
<div className="border-t pt-4 mt-4">
  <h3 className="text-lg font-medium dark:text-white mb-4">Monatliche Beratungsabrechnung</h3>
  
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Automatische Monatsabrechnung</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">Erstellt automatisch monatliche PDF-Abrechnungen</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={monthlyReportEnabled}
          onChange={(e) => setMonthlyReportEnabled(e.target.checked)}
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
      </label>
    </div>

    {monthlyReportEnabled && (
      <>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Abrechnungstag im Monat (1-28)
          </label>
          <input
            type="number"
            min="1"
            max="28"
            value={monthlyReportDay}
            onChange={(e) => setMonthlyReportDay(parseInt(e.target.value))}
            className="w-32 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Abrechnung erfolgt vom {monthlyReportDay}. des Vormonats bis {monthlyReportDay - 1}. des aktuellen Monats
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Rechnungsempfänger
          </label>
          <input
            type="text"
            value={monthlyReportRecipient}
            onChange={(e) => setMonthlyReportRecipient(e.target.value)}
            placeholder="Name des Arbeitgebers/Empfängers"
            className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <button
          onClick={saveMonthlyReportSettings}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Einstellungen speichern
        </button>
      </>
    )}
  </div>
</div>
```

### Schritt 4.3: Settings State und Funktionen erweitern
- [x] Erweitere die Settings-Komponente um die neuen State-Variablen und Funktionen:

```typescript
const [monthlyReportEnabled, setMonthlyReportEnabled] = useState(false);
const [monthlyReportDay, setMonthlyReportDay] = useState(25);
const [monthlyReportRecipient, setMonthlyReportRecipient] = useState('');

// Lade Settings beim Mount
useEffect(() => {
  loadUserSettings();
}, []);

const loadUserSettings = async () => {
  try {
    const response = await axiosInstance.get('/api/users/settings');
    const settings = response.data;
    setMonthlyReportEnabled(settings.monthlyReportEnabled || false);
    setMonthlyReportDay(settings.monthlyReportDay || 25);
    setMonthlyReportRecipient(settings.monthlyReportRecipient || '');
  } catch (error) {
    console.error('Fehler beim Laden der Einstellungen:', error);
  }
};

const saveMonthlyReportSettings = async () => {
  try {
    await axiosInstance.put('/api/users/settings', {
      monthlyReportEnabled,
      monthlyReportDay,
      monthlyReportRecipient
    });
    showMessage('Einstellungen gespeichert', 'success');
  } catch (error) {
    showMessage('Fehler beim Speichern der Einstellungen', 'error');
  }
};
```

## Phase 5: Frontend - Monatsberichte Verwaltung

### Schritt 5.1: MonthlyReports Komponente erstellen
- [x] Erstelle neue Datei: `frontend/src/components/MonthlyReportsTab.tsx`
- [x] Implementiere die Verwaltung der Monatsberichte analog zu InvoiceManagementTab

### Schritt 5.2: Integration in Lohnabrechnung
- [x] Öffne die Lohnabrechnung-Seite
- [x] Füge neuen Tab "Monatsabrechnungen" hinzu
- [x] Integriere MonthlyReportsTab Komponente

## Phase 6: Automatisierung (Cron Job)

### Schritt 6.1: Cron Service erstellen
- [ ] Erstelle neue Datei: `backend/src/services/monthlyReportCronService.ts`
- [ ] Implementiere tägliche Prüfung auf fällige Monatsabrechnungen
- [ ] Integriere in server.ts

## Phase 7: API Endpoints erweitern

### Schritt 7.1: API Config erweitern
- [x] Öffne `frontend/src/config/api.ts`
- [x] Füge neue Endpoints hinzu:

```typescript
MONTHLY_CONSULTATION_REPORTS: {
  BASE: '/monthly-consultation-reports',
  GENERATE: '/monthly-consultation-reports/generate',
  PDF: (id: number) => `/monthly-consultation-reports/${id}/pdf`
}
```

## Abschluss-Checkliste

- [x] Alle Dateien gespeichert
- [x] Server neu gestartet
- [x] Frontend neu geladen
- [ ] Grundfunktionalität getestet:
  - [ ] Einstellungen konfigurieren
  - [ ] Monatsbericht manuell generieren
  - [ ] PDF herunterladen
  - [ ] Automatische Generierung testen
- [ ] Dokumentation aktualisiert

## Besonderheiten der neuen Implementierung

### Unterschiede zur ursprünglichen Rechnung:
1. **Empfänger**: Nicht Client, sondern Arbeitgeber
2. **Format**: Einfaches PDF, keine QR-Rechnung
3. **Gruppierung**: Nach Clients mit Stundensummen
4. **Zeitraum**: Monatlich, konfigurierbar
5. **Automatisierung**: Automatische Generierung möglich

### Zeitraum-Berechnung:
- Beispiel: Tag 25 konfiguriert
- Abrechnung vom 25. Vormonat bis 24. aktueller Monat, 23:59:59
- Alle Beratungen mit startTime in diesem Zeitraum

### Sicherheit:
- Nur eigene Berichte einsehbar
- Validierung aller Eingaben
- Berechtigungsprüfung bei PDF-Download 

## ⚠️ **Wichtige Klarstellungen:**

### Bestehende Funktionalität bleibt vollständig erhalten:
1. **ConsultationInvoice**: Für einzelne Client-Rechnungen (QR-Rechnungen)
2. **InvoiceSettings**: Für QR-Rechnungs-Konfiguration (IBAN, Firmenadresse, etc.)
3. **Button "Rechnung erstellen"**: Weiterhin verfügbar in ConsultationList
4. **PDF-Generator für QR-Rechnungen**: Bleibt unverändert

### Neue Monatsabrechnung:
1. **MonthlyConsultationReport**: Nur für Berater-Abrechnungen an Arbeitgeber
2. **Settings erweitern**: Für Monatsabrechnungs-Konfiguration
3. **Neuer PDF-Generator**: Einfaches Format ohne QR-Code
4. **Automatische Filterung**: Nur nicht-abgerechnete Beratungen

### Vermeidung von Doppelabrechnung:
- **Query-Filter**: `invoiceItems: { none: {} }` in MonthlyReport-Query
- **Bestehender Schutz**: ConsultationInvoiceItem unique constraint bleibt
- **Beide Systeme parallel**: Einzelrechnungen und Monatsabrechnungen koexistieren 