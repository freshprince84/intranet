import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import { checkPermission } from '../middleware/permissionMiddleware';
import { 
  getCurrentOrganization,
  createOrganization,
  updateOrganization,
  updateCurrentOrganization,
  getJoinRequests,
  searchOrganizations,
  getOrganizationStats,
  getOrganizationLanguage,
  updateOrganizationLanguage,
  getLifecycleRoles,
  updateLifecycleRoles,
  getDocumentTemplates,
  uploadDocumentTemplate,
  uploadTemplateMiddleware,
  getDocumentSignatures,
  uploadDocumentSignature,
  uploadSignatureMiddleware
} from '../controllers/organizationController';
import { 
  createJoinRequest,
  getMyJoinRequests,
  processJoinRequest,
  withdrawJoinRequest
} from '../controllers/joinRequestController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung
router.use(authMiddleware);

// Route zum Erstellen einer Organisation benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.post('/', createOrganization);

// Route zum Erstellen einer Join-Request benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.post('/join-request', createJoinRequest);

// Route für eigene Beitrittsanfragen benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.get('/join-requests/my', getMyJoinRequests);

// Route zum Zurückziehen einer Beitrittsanfrage benötigt KEIN organizationMiddleware
// (User hat noch keine Organisation)
router.delete('/join-requests/:id/withdraw', withdrawJoinRequest);

// Alle anderen Routen benötigen organizationMiddleware
router.use(organizationMiddleware);

// Organisation-Routen
router.get('/current', getCurrentOrganization);
router.get('/current/stats', getOrganizationStats);
router.get('/current/language', getOrganizationLanguage);
router.put('/current/language', updateOrganizationLanguage);
// ✅ FIX: Organisation Bearbeitung erfordert organization_edit Button-Berechtigung
router.put('/current', checkPermission('organization_edit', 'write', 'button'), updateCurrentOrganization);

// Join Request Routen
router.get('/join-requests', getJoinRequests);
router.patch('/join-requests/:id', processJoinRequest);

// Lebenszyklus-Rollen-Konfiguration
router.get('/current/lifecycle-roles', getLifecycleRoles);
router.put('/current/lifecycle-roles', updateLifecycleRoles);

// Dokumenten-Templates
router.get('/current/document-templates', getDocumentTemplates);
router.post('/current/document-templates/upload', uploadTemplateMiddleware, uploadDocumentTemplate);

// Dokumenten-Signaturen
router.get('/current/document-signatures', getDocumentSignatures);
router.post('/current/document-signatures/upload', uploadSignatureMiddleware, uploadDocumentSignature);

// Suche
router.get('/search', searchOrganizations);

export default router; 