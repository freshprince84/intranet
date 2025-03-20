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

// Alle Routen mit Authentifizierung schützen
router.use(authMiddleware);

// Alle Requests abrufen
router.get('/', getAllRequests);

// Einen spezifischen Request abrufen
router.get('/:id', getRequestById);

// Neuen Request erstellen
router.post('/', createRequest);

// Request aktualisieren
router.put('/:id', updateRequest);

// Request löschen
router.delete('/:id', deleteRequest);

// Anhang-Routen
router.post('/:requestId/attachments', upload.single('file'), addAttachment);
router.get('/:requestId/attachments', getRequestAttachments);
router.get('/:requestId/attachments/:attachmentId', getAttachment);
router.delete('/:requestId/attachments/:attachmentId', deleteAttachment);

export default router; 