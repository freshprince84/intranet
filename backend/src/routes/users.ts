import { Router } from 'express';
import { getAllUsers, getAllUsersForDropdown, getCurrentUser, updateProfile, getUserById, updateUserRoles, updateUserById, updateUserSettings, updateInvoiceSettings, switchUserRole, createUser, getUserActiveLanguage } from '../controllers/userController';
import { 
  getLifecycle, 
  updateStatus, 
  getSocialSecurity, 
  updateSocialSecurity,
  getCertificates,
  getCertificate,
  createCertificate,
  updateCertificate,
  downloadCertificate,
  getContracts,
  getContract,
  createContract,
  updateContract,
  downloadContract
} from '../controllers/lifecycleController';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';

const router = Router();

// Geschützte Routen - erfordern Authentifizierung
router.use(authMiddleware);

// Nach authMiddleware hinzufügen
router.use(organizationMiddleware);

// Benutzer-Routen
router.get('/', getAllUsers);
router.get('/dropdown', getAllUsersForDropdown);
router.get('/profile', getCurrentUser);
router.get('/active-language', getUserActiveLanguage);
router.put('/profile', updateProfile);
router.put('/settings', updateUserSettings);
router.put('/invoice-settings', updateInvoiceSettings);
router.put('/switch-role', switchUserRole);

// Neue Routen für Organisation
router.post('/', createUser); // Neue Benutzer erstellen (nur für Admins einer Organisation)
router.get('/:id', getUserById);
router.put('/:id', updateUserById);
router.put('/:id/roles', updateUserRoles);

// Lebenszyklus-Routen
router.get('/:id/lifecycle', getLifecycle);
router.put('/:id/lifecycle/status', updateStatus);
router.get('/:id/lifecycle/social-security/:type', getSocialSecurity);
router.put('/:id/lifecycle/social-security/:type', updateSocialSecurity);

// Certificate-Routen
router.get('/:id/lifecycle/certificates', getCertificates);
router.get('/:id/lifecycle/certificates/:certId', getCertificate);
router.post('/:id/lifecycle/certificates', createCertificate);
router.put('/:id/lifecycle/certificates/:certId', updateCertificate);
router.get('/:id/lifecycle/certificates/:certId/download', downloadCertificate);

// Contract-Routen
router.get('/:id/lifecycle/contracts', getContracts);
router.get('/:id/lifecycle/contracts/:contractId', getContract);
router.post('/:id/lifecycle/contracts', createContract);
router.put('/:id/lifecycle/contracts/:contractId', updateContract);
router.get('/:id/lifecycle/contracts/:contractId/download', downloadContract);

export default router; 