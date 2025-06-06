import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import requestRoutes from './routes/requests';
import taskRoutes from './routes/tasks';
import roleRoutes from './routes/roles';
import branchRoutes from './routes/branches';
import worktimeRoutes from './routes/worktime';
import settingsRoutes from './routes/settings';
import notificationRoutes from './routes/notifications';
import tableSettingsRoutes from './routes/tableSettings';
import cerebroRoutes from './routes/cerebro';
import teamWorktimeRoutes from './routes/teamWorktimeRoutes';
import payrollRoutes from './routes/payroll';
import identificationDocumentRoutes from './routes/identificationDocuments';
import documentRecognitionRoutes from './routes/documentRecognition';
import savedFiltersRoutes from './routes/savedFilters';
import urlMetadataRoutes from './routes/urlMetadata';
import clientRoutes from './routes/clients';
import consultationRoutes from './routes/consultations';
import invoiceSettingsRoutes from './routes/invoiceSettings';
import consultationInvoicesRoutes from './routes/consultationInvoices';
import monthlyConsultationReportsRoutes from './routes/monthlyConsultationReports';
import databaseRoutes from './routes/database';
import claudeRoutes from './routes/claudeRoutes';
import { getClaudeConsoleService } from './services/claudeConsoleService';
import { checkAndStopExceededWorktimes } from './controllers/worktimeController';
import { checkAndGenerateMonthlyReports, triggerMonthlyReportCheck } from './services/monthlyReportScheduler';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' })); // Größere JSON-Payload für Bilder erlauben
app.use(cors({
  origin: function(origin, callback) {
    // Erlaube Anfragen ohne Origin-Header (z.B. von Postman oder direkten Zugriffen)
    if (!origin) return callback(null, true);
    
    // Liste erlaubter Origins
    const allowedOrigins = [
      'http://localhost:3000',      // Web-Frontend in Entwicklung
      'exp://',                     // Expo-Client während der Entwicklung
      'https://65.109.228.106.nip.io',  // Produktionsumgebung
      'app://'                      // React Native App (production)
    ];
    
    // IP-basierte Entwicklungsumgebungen für Mobile
    // Erlaubt alle lokalen IP-Adressen für Emulator/Gerätetests
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/) || 
        origin.match(/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/) ||
        origin.match(/^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:\d+$/)) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.warn(`Origin ${origin} ist nicht erlaubt durch CORS`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Uploads-Verzeichnis
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Downloads-Verzeichnis für Mobile App
const downloadsPath = path.join(__dirname, '../public/downloads');
app.use('/downloads', express.static(downloadsPath));

// Sicherstellen, dass die Uploads-Verzeichnisse existieren
import fs from 'fs';
const cerebroUploadsPath = path.join(uploadsPath, 'cerebro');
const taskAttachmentsPath = path.join(uploadsPath, 'task-attachments');
const requestAttachmentsPath = path.join(uploadsPath, 'request-attachments');
const invoicesPath = path.join(uploadsPath, 'invoices');

if (!fs.existsSync(cerebroUploadsPath)) {
  fs.mkdirSync(cerebroUploadsPath, { recursive: true });
}

if (!fs.existsSync(taskAttachmentsPath)) {
  fs.mkdirSync(taskAttachmentsPath, { recursive: true });
}

if (!fs.existsSync(requestAttachmentsPath)) {
  fs.mkdirSync(requestAttachmentsPath, { recursive: true });
}

if (!fs.existsSync(invoicesPath)) {
  fs.mkdirSync(invoicesPath, { recursive: true });
}

// Sicherstellen, dass das Downloads-Verzeichnis existiert
if (!fs.existsSync(downloadsPath)) {
  fs.mkdirSync(downloadsPath, { recursive: true });
}

// Timer für die regelmäßige Überprüfung der Arbeitszeiten (alle 2 Minuten)
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 Minuten
setInterval(async () => {
  console.log('Starte automatische Überprüfung der Arbeitszeiten...');
  await checkAndStopExceededWorktimes();
}, CHECK_INTERVAL_MS);

// Timer für die tägliche Überprüfung der Monatsabrechnungen (alle 10 Minuten)
// Überprüft, ob heute ein Stichdatum für automatische Monatsabrechnungen ist
const MONTHLY_REPORT_CHECK_INTERVAL_MS = 10 * 60 * 1000; // 10 Minuten
let lastMonthlyReportCheck = '';

setInterval(async () => {
  const today = new Date().toDateString();
  
  // Führe die Prüfung nur einmal pro Tag aus
  if (lastMonthlyReportCheck !== today) {
    const currentHour = new Date().getHours();
    
    // Führe die Prüfung nur zwischen 9:00 und 10:00 Uhr aus
    if (currentHour >= 9 && currentHour < 10) {
      console.log('Starte tägliche Überprüfung für automatische Monatsabrechnungen...');
      await checkAndGenerateMonthlyReports();
      lastMonthlyReportCheck = today;
    }
  }
}, MONTHLY_REPORT_CHECK_INTERVAL_MS);

// Eine direkte Test-Route für die Diagnose
app.get('/api/test-route', (req: Request, res: Response) => {
  res.json({ 
    message: 'Test-Route ist erreichbar', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Test-Route für manuelle Auslösung der Monatsabrechnungsprüfung
app.post('/api/admin/trigger-monthly-reports', async (req: Request, res: Response) => {
  try {
    const result = await triggerMonthlyReportCheck();
    res.json(result);
  } catch (error) {
    console.error('Fehler beim manuellen Auslösen der Monatsabrechnungsprüfung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Auslösen der Monatsabrechnungsprüfung',
      error: error instanceof Error ? error.message : 'Unbekannter Fehler'
    });
  }
});

// Mobile App Download-Links-Route
app.get('/api/mobile-app/info', (req: Request, res: Response) => {
  res.json({
    android: {
      version: '1.0.0',
      downloadUrl: 'https://65.109.228.106.nip.io/downloads/intranet-app.apk',
      playStoreUrl: 'https://play.google.com/store/apps/details?id=com.yourcompany.intranetapp'
    },
    ios: {
      version: '1.0.0',
      appStoreUrl: 'https://apps.apple.com/app/intranet-app/id1234567890'
    },
    lastUpdate: '24.03.2023'
  });
});

// Routen
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/worktime', worktimeRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/table-settings', tableSettingsRoutes);
app.use('/api/cerebro', cerebroRoutes);
app.use('/api/team-worktime', teamWorktimeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/identification-documents', identificationDocumentRoutes);
app.use('/api/document-recognition', documentRecognitionRoutes);
app.use('/api/saved-filters', savedFiltersRoutes);
app.use('/api/url-metadata', urlMetadataRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/invoice-settings', invoiceSettingsRoutes);
app.use('/api/consultation-invoices', consultationInvoicesRoutes);
app.use('/api/monthly-consultation-reports', monthlyConsultationReportsRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/claude', claudeRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route nicht gefunden' });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: 'Ein interner Serverfehler ist aufgetreten' });
});

export default app; 