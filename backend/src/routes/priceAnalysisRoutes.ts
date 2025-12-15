import express from 'express';
import authenticate from '../middleware/auth';
import { checkPermission } from '../middleware/permissionMiddleware';
import { priceAnalysisController } from '../controllers/priceAnalysisController';
import { priceRecommendationController } from '../controllers/priceRecommendationController';
import { pricingRuleController } from '../controllers/pricingRuleController';
import { otaController } from '../controllers/otaController';

const router = express.Router();

// Preisanalyse Routes
router.post(
  '/analyze',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  priceAnalysisController.analyze
);

router.get(
  '/',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  priceAnalysisController.getAnalyses
);

router.get(
  '/:id',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  priceAnalysisController.getAnalysisById
);

// Preisempfehlungen Routes
router.post(
  '/recommendations/generate',
  authenticate,
  checkPermission('price_analysis', 'write', 'page'),
  priceAnalysisController.generateRecommendations
);

router.get(
  '/recommendations',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  priceRecommendationController.getRecommendations
);

router.post(
  '/recommendations/:id/apply',
  authenticate,
  checkPermission('price_analysis_apply_recommendation', 'write', 'button'),
  priceRecommendationController.applyRecommendation
);

router.post(
  '/recommendations/:id/approve',
  authenticate,
  checkPermission('price_analysis_apply_recommendation', 'write', 'button'),
  priceRecommendationController.approveRecommendation
);

router.post(
  '/recommendations/:id/reject',
  authenticate,
  checkPermission('price_analysis_apply_recommendation', 'write', 'button'),
  priceRecommendationController.rejectRecommendation
);

// Preisregeln Routes
router.get(
  '/rules',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  pricingRuleController.getRules
);

router.get(
  '/rules/:id',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  pricingRuleController.getRuleById
);

router.post(
  '/rules',
  authenticate,
  checkPermission('price_analysis_create_rule', 'write', 'button'),
  pricingRuleController.createRule
);

router.put(
  '/rules/:id',
  authenticate,
  checkPermission('price_analysis_edit_rule', 'write', 'button'),
  pricingRuleController.updateRule
);

router.delete(
  '/rules/:id',
  authenticate,
  checkPermission('price_analysis_delete_rule', 'write', 'button'),
  pricingRuleController.deleteRule
);

// OTA Routes
router.get(
  '/ota/listings',
  authenticate,
  checkPermission('price_analysis', 'read', 'page'),
  otaController.getListings
);

router.post(
  '/ota/rate-shopping',
  authenticate,
  (req: any, res: any, next: any) => {
    const logger = require('../utils/logger').logger;
    logger.warn('[Price Analysis Routes] ⚡ POST /ota/rate-shopping Route erreicht');
    logger.warn('[Price Analysis Routes] 📋 Request Body:', JSON.stringify(req.body));
    logger.warn('[Price Analysis Routes] 👤 UserId:', req.userId, 'RoleId:', req.roleId);
    next();
  },
  checkPermission('price_analysis_run_rate_shopping', 'write', 'button'),
  (req: any, res: any, next: any) => {
    const logger = require('../utils/logger').logger;
    logger.warn('[Price Analysis Routes] ✅ Permission Check bestanden, rufe Controller auf...');
    next();
  },
  otaController.runRateShopping
);

router.post(
  '/ota/discover',
  authenticate,
  checkPermission('price_analysis_run_rate_shopping', 'write', 'button'),
  otaController.discoverListings
);

export default router;

