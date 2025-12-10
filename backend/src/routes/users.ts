import { Router, Response } from 'express';
import { 
  getAllUsers, 
  getAllUsersForDropdown, 
  updateProfile, 
  isProfileComplete,
  getUserById, 
  updateUserRoles, 
  updateUserBranches,
  updateUserById, 
  updateUserSettings, 
  updateInvoiceSettings, 
  switchUserRole, 
  createUser, 
  getUserActiveLanguage,
  getOnboardingStatus,
  updateOnboardingProgress,
  completeOnboarding,
  trackOnboardingEvent,
  resetOnboarding,
  getOnboardingAnalytics,
  debugUserBranches
} from '../controllers/userController';
import { AuthenticatedRequest } from '../middleware/auth';
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
// ✅ STANDARD: /users/profile leitet auf getUserById um (eine Methode für alles)
router.get('/profile', (req: AuthenticatedRequest, res: Response) => {
    req.params.id = req.userId;
    return getUserById(req as any, res);
});
router.get('/profile/complete', isProfileComplete);
router.get('/active-language', getUserActiveLanguage);
router.get('/debug/branches', debugUserBranches); // Debug-Endpoint
router.put('/profile', updateProfile);
router.put('/settings', updateUserSettings);
router.put('/invoice-settings', updateInvoiceSettings);
router.put('/switch-role', switchUserRole);

// Onboarding-Routen
router.get('/onboarding/status', getOnboardingStatus);
router.put('/onboarding/progress', updateOnboardingProgress);
router.put('/onboarding/complete', completeOnboarding);
router.post('/onboarding/event', trackOnboardingEvent);
router.put('/onboarding/reset', resetOnboarding);
router.get('/onboarding/analytics', getOnboardingAnalytics);

// Neue Routen für Organisation
router.post('/', createUser); // Neue Benutzer erstellen (nur für Admins einer Organisation)
router.get('/:id', getUserById);
router.put('/:id', updateUserById);
router.put('/:id/roles', updateUserRoles);
router.put('/:id/branches', updateUserBranches);

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