"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const taskController_1 = require("../controllers/taskController");
const taskAttachmentController_1 = require("../controllers/taskAttachmentController");
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
// GET /api/tasks - Alle Tasks abrufen
router.get('/', taskController_1.getAllTasks);
// GET /api/tasks/:id - Einzelnen Task abrufen
router.get('/:id', taskController_1.getTaskById);
// POST /api/tasks - Neuen Task erstellen
router.post('/', taskController_1.createTask);
// PUT /api/tasks/:id - Task aktualisieren
router.put('/:id', taskController_1.updateTask);
// DELETE /api/tasks/:id - Task löschen
router.delete('/:id', taskController_1.deleteTask);
// Cerebro-Artikel Routen
router.get('/:id/carticles', taskController_1.getTaskCarticles);
router.post('/:taskId/carticles/:carticleId', taskController_1.linkTaskToCarticle);
router.delete('/:taskId/carticles/:carticleId', taskController_1.unlinkTaskFromCarticle);
// Attachment Routen
router.post('/:taskId/attachments', upload.single('file'), taskAttachmentController_1.addAttachment);
router.get('/:taskId/attachments', taskAttachmentController_1.getTaskAttachments);
router.get('/:taskId/attachments/:attachmentId', taskAttachmentController_1.getAttachment);
router.delete('/:taskId/attachments/:attachmentId', taskAttachmentController_1.deleteAttachment);
exports.default = router;
//# sourceMappingURL=tasks.js.map