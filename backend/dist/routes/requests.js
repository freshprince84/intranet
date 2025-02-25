"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requestController_1 = require("../controllers/requestController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Alle Requests abrufen
router.get('/', auth_1.authMiddleware, requestController_1.getAllRequests);
// Einen spezifischen Request abrufen
router.get('/:id', auth_1.authMiddleware, requestController_1.getRequestById);
// Neuen Request erstellen
router.post('/', auth_1.authMiddleware, requestController_1.createRequest);
// Request aktualisieren
router.put('/:id', auth_1.authMiddleware, requestController_1.updateRequest);
// Request löschen
router.delete('/:id', auth_1.authMiddleware, requestController_1.deleteRequest);
exports.default = router;
//# sourceMappingURL=requests.js.map