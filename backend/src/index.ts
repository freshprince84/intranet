import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import taskRoutes from './routes/tasks';
import roleRoutes from './routes/roles';
import settingsRoutes from './routes/settings';
import worktimeRoutes from './routes/worktime';
import branchRoutes from './routes/branches';
import userRoutes from './routes/users';
import path from 'path';

const app = express();
const prisma = new PrismaClient();

// CORS-Konfiguration
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug-Middleware
app.use((req, res, next) => {
    console.log('Eingehende Anfrage:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next();
});

// Basis-Test-Route
app.get('/api/test', (req, res) => {
    res.json({ message: 'API ist erreichbar' });
});

// Statische Dateien für Uploads
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('Uploads Verzeichnis:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// API-Routen
app.use('/api/settings', settingsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/worktime', worktimeRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/users', userRoutes);
app.use('/api', roleRoutes);

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Fehler:', err);
    res.status(500).json({ message: 'Interner Server-Fehler', error: err.message });
});

// 404 Handler
app.use((req: express.Request, res: express.Response) => {
    console.log('404 - Route nicht gefunden:', req.path);
    res.status(404).json({ message: 'Route nicht gefunden' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
    console.log('Verfügbare Routen:', app._router.stack
        .filter((r: any) => r.route || r.handle.stack)
        .map((r: any) => r.route ? r.route.path : r.regexp));
}); 