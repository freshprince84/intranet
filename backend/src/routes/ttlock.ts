import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { organizationMiddleware } from '../middleware/organization';
import {
  getLocks,
  getLockInfo,
  createPasscode,
  deletePasscode
} from '../controllers/ttlockController';

const router = express.Router();

// Alle Routen erfordern Authentifizierung und Organisation
router.use(authMiddleware);
router.use(organizationMiddleware);

// TTLock Endpoints
router.get('/locks', getLocks);
router.get('/locks/:lockId/info', getLockInfo);
router.post('/passcodes', createPasscode);
router.delete('/passcodes/:passcodeId', deletePasscode);

export default router;

