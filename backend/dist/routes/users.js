"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const lifecycleController_1 = require("../controllers/lifecycleController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Geschützte Routen - erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Nach authMiddleware hinzufügen
router.use(organization_1.organizationMiddleware);
// Benutzer-Routen
router.get('/', userController_1.getAllUsers);
router.get('/dropdown', userController_1.getAllUsersForDropdown);
// ✅ STANDARD: /users/profile leitet auf getUserById um (eine Methode für alles)
router.get('/profile', (req, res) => {
    req.params.id = req.userId;
    return (0, userController_1.getUserById)(req, res);
});
router.get('/profile/complete', userController_1.isProfileComplete);
router.get('/active-language', userController_1.getUserActiveLanguage);
router.get('/debug/branches', userController_1.debugUserBranches); // Debug-Endpoint
router.put('/profile', userController_1.updateProfile);
router.put('/settings', userController_1.updateUserSettings);
router.put('/invoice-settings', userController_1.updateInvoiceSettings);
router.put('/switch-role', userController_1.switchUserRole);
// Onboarding-Routen
router.get('/onboarding/status', userController_1.getOnboardingStatus);
router.put('/onboarding/progress', userController_1.updateOnboardingProgress);
router.put('/onboarding/complete', userController_1.completeOnboarding);
router.post('/onboarding/event', userController_1.trackOnboardingEvent);
router.put('/onboarding/reset', userController_1.resetOnboarding);
router.get('/onboarding/analytics', userController_1.getOnboardingAnalytics);
// Neue Routen für Organisation
router.post('/', userController_1.createUser); // Neue Benutzer erstellen (nur für Admins einer Organisation)
router.get('/:id', userController_1.getUserById);
router.put('/:id', userController_1.updateUserById);
router.put('/:id/roles', userController_1.updateUserRoles);
router.put('/:id/branches', userController_1.updateUserBranches);
// Lebenszyklus-Routen
router.get('/:id/lifecycle', lifecycleController_1.getLifecycle);
router.put('/:id/lifecycle/status', lifecycleController_1.updateStatus);
router.get('/:id/lifecycle/social-security/:type', lifecycleController_1.getSocialSecurity);
router.put('/:id/lifecycle/social-security/:type', lifecycleController_1.updateSocialSecurity);
// Certificate-Routen
router.get('/:id/lifecycle/certificates', lifecycleController_1.getCertificates);
router.get('/:id/lifecycle/certificates/:certId', lifecycleController_1.getCertificate);
router.post('/:id/lifecycle/certificates', lifecycleController_1.createCertificate);
router.put('/:id/lifecycle/certificates/:certId', lifecycleController_1.updateCertificate);
router.get('/:id/lifecycle/certificates/:certId/download', lifecycleController_1.downloadCertificate);
// Contract-Routen
router.get('/:id/lifecycle/contracts', lifecycleController_1.getContracts);
router.get('/:id/lifecycle/contracts/:contractId', lifecycleController_1.getContract);
router.post('/:id/lifecycle/contracts', lifecycleController_1.createContract);
router.put('/:id/lifecycle/contracts/:contractId', lifecycleController_1.updateContract);
router.get('/:id/lifecycle/contracts/:contractId/download', lifecycleController_1.downloadContract);
exports.default = router;
//# sourceMappingURL=users.js.map