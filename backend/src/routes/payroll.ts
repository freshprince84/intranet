import express from 'express';
import { saveWorkHours, calculatePayroll, getPayrolls, generatePayrollPDF, getPrefilledHours } from '../controllers/payrollController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Alle Routen mit Token-Authentifizierung schützen
router.use(authenticateToken);

// Stunden für Lohnabrechnung speichern
router.post('/hours', saveWorkHours);

// Lohn berechnen
router.get('/calculate', calculatePayroll);

// Alle Lohnabrechnungen abrufen (optional mit userId-Filter)
router.get('/', getPayrolls);

// PDF generieren
router.get('/pdf/:payrollId', generatePayrollPDF);

// Vorausgefüllte Stunden abrufen
router.get('/prefill-hours', getPrefilledHours);

export default router; 