import express from 'express';
import * as cerebroController from '../controllers/cerebroController';
import * as cerebroMediaController from '../controllers/cerebroMediaController';
import * as cerebroExternalLinksController from '../controllers/cerebroExternalLinksController';
import { authenticateToken } from '../middleware/auth';
import { checkPermission } from '../middleware/permissionMiddleware';
import multer from 'multer';

const router = express.Router();

// Multer-Konfiguration für Medien-Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cerebro');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = file.originalname.split('.').pop();
    cb(null, `cerebro-${uniqueSuffix}.${extension}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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
  } else {
    cb(new Error('Nicht unterstützter Dateityp. Erlaubt sind Bilder, PDFs und Videos.'));
  }
};

const upload = multer({
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
router.post('/carticles', authenticateToken, checkPermission('cerebro', 'write'), cerebroController.createArticle);
router.put('/carticles/:id', authenticateToken, checkPermission('cerebro', 'write'), cerebroController.updateArticle);
router.delete('/carticles/:id', authenticateToken, checkPermission('cerebro', 'write'), cerebroController.deleteArticle);

// -------------------- Medien-Routen --------------------

// Öffentliche Routen
router.get('/media/carticle/:carticleId', cerebroMediaController.getMediaByArticle);
router.get('/media/:id', cerebroMediaController.getMediaById);

// Geschützte Routen
router.post('/media', authenticateToken, checkPermission('cerebro_media', 'write'), upload.single('file'), cerebroMediaController.uploadMedia);
router.put('/media/:id', authenticateToken, checkPermission('cerebro_media', 'write'), cerebroMediaController.updateMedia);
router.delete('/media/:id', authenticateToken, checkPermission('cerebro_media', 'write'), cerebroMediaController.deleteMedia);

// -------------------- Externe Links Routen --------------------

// Öffentliche Routen
router.get('/links/carticle/:carticleId', cerebroExternalLinksController.getLinksByArticle);
router.get('/links/:id', cerebroExternalLinksController.getLinkById);
router.get('/links/preview', cerebroExternalLinksController.getLinkPreview);

// Geschützte Routen
router.post('/links', authenticateToken, checkPermission('cerebro_links', 'write'), cerebroExternalLinksController.createExternalLink);
router.put('/links/:id', authenticateToken, checkPermission('cerebro_links', 'write'), cerebroExternalLinksController.updateLink);
router.delete('/links/:id', authenticateToken, checkPermission('cerebro_links', 'write'), cerebroExternalLinksController.deleteLink);

export default router; 