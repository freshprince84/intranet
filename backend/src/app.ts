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
import { checkAndStopExceededWorktimes } from './controllers/worktimeController';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' })); // Größere JSON-Payload für Bilder erlauben
app.use(cors({
  origin: function(origin, callback) {
    // Erlaube Anfragen ohne Origin-Header (z.B. von Postman oder direkten Zugriffen)
    if (!origin) return callback(null, true);
    
    // Liste erlaubter Ursprünge
    const allowedOrigins = [
      // Lokale Entwicklung
      'http://localhost:3000', 
      'http://localhost:5000', 
      'http://localhost',
      // Hetzner Server - erlaube alle Domains und IPs
      /^https?:\/\/.+$/ // Erlaube alle HTTP/HTTPS Ursprünge
    ];
    
    // Generische Prüfung für alle erlaubten Ursprünge
    let isAllowed = false;
    
    for (const allowedOrigin of allowedOrigins) {
      // Wenn es ein RegExp ist, teste es
      if (allowedOrigin instanceof RegExp) {
        if (allowedOrigin.test(origin)) {
          isAllowed = true;
          break;
        }
      } 
      // Sonst prüfe auf exakte Übereinstimmung
      else if (origin === allowedOrigin) {
        isAllowed = true;
        break;
      }
    }
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Ursprung ${origin} nicht erlaubt durch CORS`), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// Uploads-Verzeichnis
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Sicherstellen, dass die Uploads-Verzeichnisse existieren
import fs from 'fs';
const cerebroUploadsPath = path.join(uploadsPath, 'cerebro');
const taskAttachmentsPath = path.join(uploadsPath, 'task-attachments');
const requestAttachmentsPath = path.join(uploadsPath, 'request-attachments');

if (!fs.existsSync(cerebroUploadsPath)) {
  fs.mkdirSync(cerebroUploadsPath, { recursive: true });
}

if (!fs.existsSync(taskAttachmentsPath)) {
  fs.mkdirSync(taskAttachmentsPath, { recursive: true });
}

if (!fs.existsSync(requestAttachmentsPath)) {
  fs.mkdirSync(requestAttachmentsPath, { recursive: true });
}

// Timer für die regelmäßige Überprüfung der Arbeitszeiten (alle 5 Minuten)
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 5 Minuten
setInterval(async () => {
  console.log('Starte automatische Überprüfung der Arbeitszeiten...');
  await checkAndStopExceededWorktimes();
}, CHECK_INTERVAL_MS);

// Eine direkte Test-Route für die Diagnose
app.get('/api/test-route', (req: Request, res: Response) => {
  res.json({ 
    message: 'Test-Route ist erreichbar', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
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

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route nicht gefunden' });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: 'Ein interner Serverfehler ist aufgetreten' });
});

export default app; 