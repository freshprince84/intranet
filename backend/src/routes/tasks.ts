import { Router } from 'express';
import { getAllTasks, getTaskById, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);

// GET /api/tasks - Alle Tasks abrufen
router.get('/', getAllTasks);

// GET /api/tasks/:id - Einzelnen Task abrufen
router.get('/:id', getTaskById);

// POST /api/tasks - Neuen Task erstellen
router.post('/', createTask);

// PUT /api/tasks/:id - Task aktualisieren
router.put('/:id', updateTask);

// DELETE /api/tasks/:id - Task löschen
router.delete('/:id', deleteTask);

export default router; 