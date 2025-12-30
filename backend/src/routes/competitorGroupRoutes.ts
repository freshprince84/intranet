import express from 'express';
import authenticate from '../middleware/auth';
import { checkPermission } from '../middleware/permissionMiddleware';
import { competitorGroupController } from '../controllers/competitorGroupController';

const router = express.Router();

// ⚠️ WICHTIG: Spezifische Routen MÜSSEN vor generischen Routen (/:id) definiert werden!

// CompetitorGroup Routes
router.get(
  '/competitor-groups',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  competitorGroupController.getCompetitorGroups
);

router.post(
  '/competitor-groups',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.createCompetitorGroup
);

router.get(
  '/competitor-groups/:id',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  competitorGroupController.getCompetitorGroupById
);

router.put(
  '/competitor-groups/:id',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.updateCompetitorGroup
);

router.delete(
  '/competitor-groups/:id',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.deleteCompetitorGroup
);

// Competitor Routes
router.post(
  '/competitor-groups/:id/competitors',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.addCompetitor
);

router.put(
  '/competitors/:id',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.updateCompetitor
);

router.delete(
  '/competitors/:id',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.deleteCompetitor
);

// Preissuche
router.post(
  '/competitor-groups/:id/search-prices',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  competitorGroupController.searchPrices
);

export default router;

