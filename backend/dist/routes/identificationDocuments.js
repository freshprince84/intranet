"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const identificationDocumentController_1 = require("../controllers/identificationDocumentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Geschützte Routen - erfordern Authentifizierung
router.use(auth_1.authMiddleware);
// Dokumente eines Benutzers abrufen
router.get('/user/:userId', identificationDocumentController_1.getUserDocuments);
// Dokument hinzufügen
router.post('/user/:userId', identificationDocumentController_1.addDocument);
// Dokument aktualisieren
router.put('/:docId', identificationDocumentController_1.updateDocument);
// Dokument löschen
router.delete('/:docId', identificationDocumentController_1.deleteDocument);
// Dokument verifizieren
router.post('/:docId/verify', identificationDocumentController_1.verifyDocument);
// Dokument-Datei herunterladen
router.get('/:docId/download', identificationDocumentController_1.downloadDocument);
exports.default = router;
//# sourceMappingURL=identificationDocuments.js.map