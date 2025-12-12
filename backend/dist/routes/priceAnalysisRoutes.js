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
// Preisanalyse Routes
router.post('/analyze', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'write', 'page'), priceAnalysisController_1.priceAnalysisController.analyze);
router.get('/', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), priceAnalysisController_1.priceAnalysisController.getAnalyses);
router.get('/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), priceAnalysisController_1.priceAnalysisController.getAnalysisById);
// Preisempfehlungen Routes
router.post('/recommendations/generate', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'write', 'page'), priceAnalysisController_1.priceAnalysisController.generateRecommendations);
router.get('/recommendations', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), priceRecommendationController_1.priceRecommendationController.getRecommendations);
router.post('/recommendations/:id/apply', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_apply_recommendation', 'write', 'button'), priceRecommendationController_1.priceRecommendationController.applyRecommendation);
router.post('/recommendations/:id/approve', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_apply_recommendation', 'write', 'button'), priceRecommendationController_1.priceRecommendationController.approveRecommendation);
router.post('/recommendations/:id/reject', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_apply_recommendation', 'write', 'button'), priceRecommendationController_1.priceRecommendationController.rejectRecommendation);
// Preisregeln Routes
router.get('/rules', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), pricingRuleController_1.pricingRuleController.getRules);
router.get('/rules/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), pricingRuleController_1.pricingRuleController.getRuleById);
router.post('/rules', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_create_rule', 'write', 'button'), pricingRuleController_1.pricingRuleController.createRule);
router.put('/rules/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_edit_rule', 'write', 'button'), pricingRuleController_1.pricingRuleController.updateRule);
router.delete('/rules/:id', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_delete_rule', 'write', 'button'), pricingRuleController_1.pricingRuleController.deleteRule);
// OTA Routes
router.get('/ota/listings', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis', 'read', 'page'), otaController_1.otaController.getListings);
router.post('/ota/rate-shopping', auth_1.default, (0, permissionMiddleware_1.checkPermission)('price_analysis_run_rate_shopping', 'write', 'button'), otaController_1.otaController.runRateShopping);
exports.default = router;
//# sourceMappingURL=priceAnalysisRoutes.js.map