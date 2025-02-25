import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import requestRoutes from './routes/requests';
import taskRoutes from './routes/tasks';
import roleRoutes from './routes/roles';
import settingsRoutes from './routes/settings';
import worktimeRoutes from './routes/worktime';
import branchRoutes from './routes/branches';

const app = express();

// CORS-Konfiguration
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routen
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/worktimes', worktimeRoutes);
app.use('/api/branches', branchRoutes);

export default app; 