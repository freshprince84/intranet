import { Router } from 'express';
import { getAllRequests, getRequestById, createRequest, updateRequest, deleteRequest } from '../controllers/requestController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Alle Requests abrufen
router.get('/', authMiddleware, getAllRequests);

// Einen spezifischen Request abrufen
router.get('/:id', authMiddleware, getRequestById);

// Neuen Request erstellen
router.post('/', authMiddleware, createRequest);

// Request aktualisieren
router.put('/:id', authMiddleware, updateRequest);

// Request löschen
router.delete('/:id', authMiddleware, deleteRequest);

export default router; 