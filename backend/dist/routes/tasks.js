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
// Öffentliche Routen für Datei-/Bildabrufe ohne Authentifizierung
router.get('/:taskId/attachments/:attachmentId', taskAttachmentController_1.getAttachment);
// Alle anderen Routen mit Authentifizierung schützen
router.use(auth_1.authMiddleware);
// Task-Routen
router.get('/', taskController_1.getAllTasks);
router.get('/:id', taskController_1.getTaskById);
router.post('/', taskController_1.createTask);
router.put('/:id', taskController_1.updateTask);
router.patch('/:id', taskController_1.updateTask);
router.delete('/:id', taskController_1.deleteTask);
// Verbindung zu Wiki-Artikeln
router.get('/:id/carticles', taskController_1.getTaskCarticles);
router.post('/:taskId/carticles/:carticleId', taskController_1.linkTaskToCarticle);
router.delete('/:taskId/carticles/:carticleId', taskController_1.unlinkTaskFromCarticle);
// Attachment Routen (mit Authentifizierung)
router.post('/:taskId/attachments', upload.single('file'), taskAttachmentController_1.addAttachment);
router.get('/:taskId/attachments', taskAttachmentController_1.getTaskAttachments);
router.delete('/:taskId/attachments/:attachmentId', taskAttachmentController_1.deleteAttachment);
exports.default = router;
//# sourceMappingURL=tasks.js.map