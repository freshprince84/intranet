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
import { checkAndStopExceededWorktimes } from './controllers/worktimeController';

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: true, // Erlaubt alle Origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Uploads-Verzeichnis
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Sicherstellen, dass das Cerebro-Uploads-Verzeichnis existiert
const cerebroUploadsPath = path.join(uploadsPath, 'cerebro');
import fs from 'fs';
if (!fs.existsSync(cerebroUploadsPath)) {
  fs.mkdirSync(cerebroUploadsPath, { recursive: true });
}

// Einfacher Gesundheitscheck-Endpunkt
app.get('/api/healthcheck', (req, res) => {
  console.log('Gesundheitscheck-Anfrage erhalten');
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Timer für die regelmäßige Überprüfung der Arbeitszeiten (alle 5 Minuten)
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 5 Minuten
setInterval(async () => {
  console.log('Starte automatische Überprüfung der Arbeitszeiten...');
  await checkAndStopExceededWorktimes();
}, CHECK_INTERVAL_MS);

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

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route nicht gefunden' });
});

// Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ message: 'Ein interner Serverfehler ist aufgetreten' });
});

export default app; 