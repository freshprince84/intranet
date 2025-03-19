import { Router } from 'express';
import multer from 'multer';
import { getAllTasks, getTaskById, createTask, updateTask, deleteTask, getTaskCarticles, linkTaskToCarticle, unlinkTaskFromCarticle } from '../controllers/taskController';
import { addAttachment, getTaskAttachments, getAttachment, deleteAttachment } from '../controllers/taskAttachmentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Multer-Konfiguration für Datei-Uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB Limit
  },
});

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

// Cerebro-Artikel Routen
router.get('/:id/carticles', getTaskCarticles);
router.post('/:taskId/carticles/:carticleId', linkTaskToCarticle);
router.delete('/:taskId/carticles/:carticleId', unlinkTaskFromCarticle);

// Attachment Routen
router.post('/:taskId/attachments', upload.single('file'), addAttachment);
router.get('/:taskId/attachments', getTaskAttachments);
router.get('/:taskId/attachments/:attachmentId', getAttachment);
router.delete('/:taskId/attachments/:attachmentId', deleteAttachment);

export default router; 