import { Router } from 'express';
import { getUrlMetadata } from '../controllers/urlMetadataController';

const router = Router();

// Öffentliche Route - keine Authentifizierung erforderlich
router.get('/', getUrlMetadata);

export default router; 