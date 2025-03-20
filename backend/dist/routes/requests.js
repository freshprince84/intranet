"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const requestController_1 = require("../controllers/requestController");
const requestAttachmentController_1 = require("../controllers/requestAttachmentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Multer-Konfiguration für Datei-Uploads
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB Limit
    },
});
// Alle Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
// Alle Requests abrufen
router.get('/', requestController_1.getAllRequests);
// Einen spezifischen Request abrufen
router.get('/:id', requestController_1.getRequestById);
// Neuen Request erstellen
router.post('/', requestController_1.createRequest);
// Request aktualisieren
router.put('/:id', requestController_1.updateRequest);
// Request löschen
router.delete('/:id', requestController_1.deleteRequest);
// Anhang-Routen
router.post('/:requestId/attachments', upload.single('file'), requestAttachmentController_1.addAttachment);
router.get('/:requestId/attachments', requestAttachmentController_1.getRequestAttachments);
router.get('/:requestId/attachments/:attachmentId', requestAttachmentController_1.getAttachment);
router.delete('/:requestId/attachments/:attachmentId', requestAttachmentController_1.deleteAttachment);
exports.default = router;
//# sourceMappingURL=requests.js.map