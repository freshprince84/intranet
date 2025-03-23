import { Router } from 'express';
import multer from 'multer';
import { 
  getAllTasks, 
  getTaskById, 
  createTask, 
  updateTask, 
  deleteTask, 
  getTaskCarticles,
  linkTaskToCarticle,
  unlinkTaskFromCarticle
} from '../controllers/taskController';
import { 
  addAttachment, 
  getTaskAttachments, 
  getAttachment, 
  deleteAttachment 
} from '../controllers/taskAttachmentController';
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

// Öffentliche Routen für Datei-/Bildabrufe ohne Authentifizierung
router.get('/:taskId/attachments/:attachmentId', getAttachment);

// Alle anderen Routen mit Authentifizierung schützen
router.use(authMiddleware);

// Task-Routen
router.get('/', getAllTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

// Verbindung zu Wiki-Artikeln
router.get('/:id/carticles', getTaskCarticles);
router.post('/:taskId/carticles/:carticleId', linkTaskToCarticle);
router.delete('/:taskId/carticles/:carticleId', unlinkTaskFromCarticle);

// Attachment Routen (mit Authentifizierung)
router.post('/:taskId/attachments', upload.single('file'), addAttachment);
router.get('/:taskId/attachments', getTaskAttachments);
router.delete('/:taskId/attachments/:attachmentId', deleteAttachment);

export default router; 