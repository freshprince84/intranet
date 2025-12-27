import { Router } from 'express';
import multer from 'multer';
import { getAllRequests, getRequestById, createRequest, updateRequest, deleteRequest } from '../controllers/requestController';
import { addAttachment, getRequestAttachments, getAttachment, deleteAttachment } from '../controllers/requestAttachmentController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { checkPermission } from '../middleware/permissionMiddleware';

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
router.use(organizationMiddleware);

// Request-Routen mit Permission-Checks
// GET / und GET /:id prüfen 'requests' Box mit Lesezugriff
// POST prüft 'request_create' Button mit Schreibzugriff
// PUT prüft 'request_edit' Button mit Schreibzugriff
// DELETE prüft 'request_delete' Button mit Schreibzugriff
router.get('/', checkPermission('requests', 'read', 'box'), getAllRequests);
router.get('/:id', checkPermission('requests', 'read', 'box'), getRequestById);
router.post('/', checkPermission('request_create', 'write', 'button'), createRequest);
router.put('/:id', checkPermission('request_edit', 'write', 'button'), updateRequest);
router.delete('/:id', checkPermission('request_delete', 'write', 'button'), deleteRequest);

// Anhang-Routen (mit Authentifizierung)
router.post('/:requestId/attachments', upload.single('file'), addAttachment);
router.get('/:requestId/attachments', getRequestAttachments);
router.delete('/:requestId/attachments/:attachmentId', deleteAttachment);

export default router; 