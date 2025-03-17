import { Router } from 'express';
import { 
  addDocument, 
  getUserDocuments, 
  updateDocument, 
  deleteDocument, 
  verifyDocument, 
  downloadDocument 
} from '../controllers/identificationDocumentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Geschützte Routen - erfordern Authentifizierung
router.use(authMiddleware);

// Dokumente eines Benutzers abrufen
router.get('/user/:userId', getUserDocuments);

// Dokument hinzufügen
router.post('/user/:userId', addDocument);

// Dokument aktualisieren
router.put('/:docId', updateDocument);

// Dokument löschen
router.delete('/:docId', deleteDocument);

// Dokument verifizieren
router.post('/:docId/verify', verifyDocument);

// Dokument-Datei herunterladen
router.get('/:docId/download', downloadDocument);

export default router; 