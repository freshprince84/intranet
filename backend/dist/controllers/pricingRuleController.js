"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingRuleController = void 0;
const prisma_1 = require("../utils/prisma");
const notificationController_1 = require("./notificationController");
const client_1 = require("@prisma/client");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
/**
 * Controller für Preisregeln
 */
exports.pricingRuleController = {
    /**
     * Ruft Preisregeln ab
     * GET /api/pricing-rules
     */
    getRules: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let branchId = undefined;
            if (req.query.branchId) {
                const parsed = parseInt(req.query.branchId, 10);
                if (!isNaN(parsed)) {
                    branchId = parsed;
                }
            }
            const isActive = req.query.isActive !== undefined
                ? req.query.isActive === 'true'
                : undefined;
            const where = {};
            if (branchId !== undefined) {
                where.branchId = branchId;
            }
            if (isActive !== undefined) {
                where.isActive = isActive;
            }
            const rules = yield prisma_1.prisma.pricingRule.findMany({
                where,
                orderBy: {
                    priority: 'desc'
                },
                include: {
                    createdByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true
                        }
                    }
                }
            });
            res.json(rules);
        }
        catch (error) {
            logger_1.logger.error('Error fetching pricing rules:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorFetchingRules'),
                error: error.message
            });
        }
    }),
    /**
     * Ruft eine einzelne Preisregel ab
     * GET /api/pricing-rules/:id
     */
    getRuleById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const ruleId = parseInt(req.params.id, 10);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (isNaN(ruleId)) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidRuleId')
                });
            }
            const rule = yield prisma_1.prisma.pricingRule.findUnique({
                where: {
                    id: ruleId
                },
                include: {
                    createdByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true
                        }
                    }
                }
            });
            if (!rule) {
                return res.status(404).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'ruleNotFound')
                });
            }
            res.json(rule);
        }
        catch (error) {
            logger_1.logger.error('Error fetching pricing rule:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorFetchingRule'),
                error: error.message
            });
        }
    }),
    /**
     * Erstellt eine neue Preisregel
     * POST /api/pricing-rules
     */
    createRule: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { branchId, name, description, conditions, action, roomTypes, categoryIds, priority, isActive } = req.body;
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (!branchId || !name || !conditions || !action) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'requiredFieldsMissing')
                });
            }
            const rule = yield prisma_1.prisma.pricingRule.create({
                data: {
                    branchId,
                    name,
                    description,
                    conditions,
                    action,
                    roomTypes: roomTypes || null,
                    categoryIds: categoryIds || null,
                    priority: priority || 0,
                    isActive: isActive !== undefined ? isActive : true,
                    createdBy: userId
                },
                include: {
                    createdByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true
                        }
                    }
                }
            });
            // Notification erstellen
            if (userId) {
                try {
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'ruleCreated', rule.name);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.system,
                        relatedEntityId: rule.id,
                        relatedEntityType: 'created'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error creating notification:', error);
                }
            }
            res.status(201).json(rule);
        }
        catch (error) {
            logger_1.logger.error('Error creating pricing rule:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorCreatingRule'),
                error: error.message
            });
        }
    }),
    /**
     * Aktualisiert eine Preisregel
     * PUT /api/pricing-rules/:id
     */
    updateRule: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const ruleId = parseInt(req.params.id, 10);
            const { name, description, conditions, action, roomTypes, categoryIds, priority, isActive } = req.body;
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (isNaN(ruleId)) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidRuleId')
                });
            }
            const rule = yield prisma_1.prisma.pricingRule.update({
                where: {
                    id: ruleId
                },
                data: {
                    name,
                    description,
                    conditions,
                    action,
                    roomTypes: roomTypes !== undefined ? roomTypes : undefined,
                    categoryIds: categoryIds !== undefined ? categoryIds : undefined,
                    priority,
                    isActive
                },
                include: {
                    createdByUser: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            username: true
                        }
                    }
                }
            });
            // Notification erstellen
            if (userId) {
                try {
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'ruleUpdated', rule.name);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.system,
                        relatedEntityId: rule.id,
                        relatedEntityType: 'updated'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error creating notification:', error);
                }
            }
            res.json(rule);
        }
        catch (error) {
            logger_1.logger.error('Error updating pricing rule:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorUpdatingRule'),
                error: error.message
            });
        }
    }),
    /**
     * Löscht eine Preisregel
     * DELETE /api/pricing-rules/:id
     */
    deleteRule: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const ruleId = parseInt(req.params.id, 10);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            if (isNaN(ruleId)) {
                return res.status(400).json({
                    message: (0, translations_1.getPriceAnalysisErrorText)(language, 'invalidRuleId')
                });
            }
            // Regel vor dem Löschen abrufen für Notification
            const rule = yield prisma_1.prisma.pricingRule.findUnique({
                where: {
                    id: ruleId
                }
            });
            yield prisma_1.prisma.pricingRule.delete({
                where: {
                    id: ruleId
                }
            });
            // Notification erstellen
            if (userId && rule) {
                try {
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'ruleDeleted', rule.name);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.system,
                        relatedEntityId: ruleId,
                        relatedEntityType: 'deleted'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Error creating notification:', error);
                }
            }
            res.json({
                success: true,
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'ruleDeleted')
            });
        }
        catch (error) {
            logger_1.logger.error('Error deleting pricing rule:', error);
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            const language = userId ? yield (0, translations_1.getUserLanguage)(userId) : 'de';
            res.status(500).json({
                message: (0, translations_1.getPriceAnalysisErrorText)(language, 'errorDeletingRule'),
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=pricingRuleController.js.map