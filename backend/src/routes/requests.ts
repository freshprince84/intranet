import { Router } from 'express';
import multer from 'multer';
import { getAllRequests, getRequestById, createRequest, updateRequest, deleteRequest } from '../controllers/requestController';
import { addAttachment, getRequestAttachments, getAttachment, deleteAttachment } from '../controllers/requestAttachmentController';
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
router.get('/:requestId/attachments/:attachmentId', getAttachment);

// Alle anderen Routen mit Authentifizierung schützen
router.use(authMiddleware);

// Request-Routen
router.get('/', getAllRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.put('/:id', updateRequest);
router.delete('/:id', deleteRequest);

// Anhang-Routen (mit Authentifizierung)
router.post('/:requestId/attachments', upload.single('file'), addAttachment);
router.get('/:requestId/attachments', getRequestAttachments);
router.delete('/:requestId/attachments/:attachmentId', deleteAttachment);

export default router; 