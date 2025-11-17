"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cerebroController = __importStar(require("../controllers/cerebroController"));
const cerebroMediaController = __importStar(require("../controllers/cerebroMediaController"));
const cerebroExternalLinksController = __importStar(require("../controllers/cerebroExternalLinksController"));
const auth_1 = require("../middleware/auth");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
// Multer-Konfiguration für Medien-Uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/cerebro');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = file.originalname.split('.').pop();
        cb(null, `cerebro-${uniqueSuffix}.${extension}`);
    }
});
const fileFilter = (req, file, cb) => {
    // Erlaubte MIME-Typen
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'video/mp4',
        'video/webm'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Nicht unterstützter Dateityp. Erlaubt sind Bilder, PDFs und Videos.'));
    }
};
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB Limit
});
// -------------------- Artikel-Routen --------------------
// Öffentliche Routen
router.get('/carticles', cerebroController.getAllArticles);
router.get('/carticles/structure', cerebroController.getArticlesStructure);
router.get('/carticles/search', cerebroController.searchArticles);
router.get('/carticles/:id', cerebroController.getArticleById);
router.get('/carticles/slug/:slug', cerebroController.getArticleBySlug);
// Geschützte Routen
router.post('/carticles', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro', 'write', 'cerebro'), cerebroController.createArticle);
router.put('/carticles/:id', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro', 'write', 'cerebro'), cerebroController.updateArticle);
router.delete('/carticles/:id', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro', 'write', 'cerebro'), cerebroController.deleteArticle);
// -------------------- Medien-Routen --------------------
// Öffentliche Routen
router.get('/media/carticle/:carticleId', cerebroMediaController.getMediaByArticle);
router.get('/media/:id', cerebroMediaController.getMediaById);
router.get('/media/:id/file', cerebroMediaController.getMediaFile);
// Geschützte Routen
router.post('/media', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro_media', 'write', 'cerebro'), upload.single('file'), cerebroMediaController.uploadMedia);
router.put('/media/:id', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro_media', 'write', 'cerebro'), cerebroMediaController.updateMedia);
router.delete('/media/:id', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro_media', 'write', 'cerebro'), cerebroMediaController.deleteMedia);
// -------------------- Externe Links Routen --------------------
// Öffentliche Routen
// WICHTIG: Spezifische Routen ZUERST, dann parametrisierte Routen
router.get('/links/preview', cerebroExternalLinksController.getLinkPreview);
router.get('/links/carticle/:carticleId', cerebroExternalLinksController.getLinksByArticle);
router.get('/links/:id', cerebroExternalLinksController.getLinkById);
// Geschützte Routen
router.post('/links', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro_links', 'write', 'cerebro'), cerebroExternalLinksController.createExternalLink);
router.put('/links/:id', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro_links', 'write', 'cerebro'), cerebroExternalLinksController.updateLink);
router.delete('/links/:id', auth_1.authenticateToken, (0, permissionMiddleware_1.checkPermission)('cerebro_links', 'write', 'cerebro'), cerebroExternalLinksController.deleteLink);
exports.default = router;
//# sourceMappingURL=cerebro.js.map