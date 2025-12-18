"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../middleware/auth"));
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const priceAnalysisController_1 = require("../controllers/priceAnalysisController");
const priceRecommendationController_1 = require("../controllers/priceRecommendationController");
const pricingRuleController_1 = require("../controllers/pricingRuleController");
const otaController_1 = require("../controllers/otaController");
const router = express_1.default.Router();
// ⚠️ WICHTIG: Spezifische Routen MÜSSEN vor generischen Routen (/:id) definiert werden!
// Sonst wird z.B. /rules als /:id mit id="rules" interpretiert
// OTA Routes (spezifisch)
router.get('/ota/listings', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), otaController_1.otaController.getListings);
router.post('/ota/rate-shopping', auth_1.default, (req, res, next) => {
    const logger = require('../utils/logger').logger;
    logger.warn('[Price Analysis Routes] ⚡ POST /ota/rate-shopping Route erreicht');
    logger.warn('[Price Analysis Routes] 📋 Request Body:', JSON.stringify(req.body));
    logger.warn('[Price Analysis Routes] 👤 UserId:', req.userId, 'RoleId:', req.roleId);
    next();
}, (0, permissionMiddleware_1.checkPermission)('price_analysis_run_rate_shopping', 'write', 'button'), (req, res, next) => {
    const logger = require('../utils/logger').logger;
    logger.warn('[Price Analysis Routes] ✅ Permission Check bestanden, rufe Controller auf...');
    next();
}, otaController_1.otaController.runRateShopping);
router.post('/ota/discover', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_run_rate_shopping', 'write', 'button'), otaController_1.otaController.discoverListings);
// Preisregeln Routes (spezifisch)
router.get('/rules', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), pricingRuleController_1.pricingRuleController.getRules);
router.post('/rules', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_create_rule', 'write', 'button'), pricingRuleController_1.pricingRuleController.createRule);
router.get('/rules/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), pricingRuleController_1.pricingRuleController.getRuleById);
router.put('/rules/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_edit_rule', 'write', 'button'), pricingRuleController_1.pricingRuleController.updateRule);
router.delete('/rules/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_delete_rule', 'write', 'button'), pricingRuleController_1.pricingRuleController.deleteRule);
// Preisempfehlungen Routes (spezifisch)
router.post('/recommendations/generate', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'write', 'page'), priceAnalysisController_1.priceAnalysisController.generateRecommendations);
router.get('/recommendations', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), priceRecommendationController_1.priceRecommendationController.getRecommendations);
router.post('/recommendations/:id/apply', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_apply_recommendation', 'write', 'button'), priceRecommendationController_1.priceRecommendationController.applyRecommendation);
router.post('/recommendations/:id/approve', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_apply_recommendation', 'write', 'button'), priceRecommendationController_1.priceRecommendationController.approveRecommendation);
router.post('/recommendations/:id/reject', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_apply_recommendation', 'write', 'button'), priceRecommendationController_1.priceRecommendationController.rejectRecommendation);
// Preisanalyse Routes (spezifisch)
router.post('/analyze', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'write', 'page'), priceAnalysisController_1.priceAnalysisController.analyze);
router.get('/', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), priceAnalysisController_1.priceAnalysisController.getAnalyses);
// ⚠️ GENERISCHE ROUTE ZULETZT: /:id muss nach allen spezifischen Routen kommen!
router.get('/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), priceAnalysisController_1.priceAnalysisController.getAnalysisById);
exports.default = router;
//# sourceMappingURL=priceAnalysisRoutes.js.map