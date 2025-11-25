"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tourProviderController_1 = require("../controllers/tourProviderController");
const auth_1 = require("../middleware/auth");
const organization_1 = require("../middleware/organization");
const router = (0, express_1.Router)();
// Alle Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
router.use(organization_1.organizationMiddleware);
// Tour-Provider-Routen
router.get('/', tourProviderController_1.getAllTourProviders);
router.get('/:id', tourProviderController_1.getTourProviderById);
router.post('/', tourProviderController_1.createTourProvider);
router.put('/:id', tourProviderController_1.updateTourProvider);
router.delete('/:id', tourProviderController_1.deleteTourProvider);
exports.default = router;
//# sourceMappingURL=tourProviders.js.map