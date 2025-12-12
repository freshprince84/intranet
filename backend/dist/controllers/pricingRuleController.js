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
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const client_2 = require("@prisma/client");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
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
            const branchId = req.query.branchId
                ? parseInt(req.query.branchId, 10)
                : undefined;
            const isActive = req.query.isActive !== undefined
                ? req.query.isActive === 'true'
                : undefined;
            const where = {};
            if (branchId) {
                where.branchId = branchId;
            }
            if (isActive !== undefined) {
                where.isActive = isActive;
            }
            const rules = yield prisma.pricingRule.findMany({
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
            logger_1.logger.error('Fehler beim Abrufen der Preisregeln:', error);
            res.status(500).json({
                message: 'Fehler beim Abrufen der Preisregeln',
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
            if (isNaN(ruleId)) {
                return res.status(400).json({
                    message: 'Ungültige Regel-ID'
                });
            }
            const rule = yield prisma.pricingRule.findUnique({
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
                    message: 'Preisregel nicht gefunden'
                });
            }
            res.json(rule);
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Abrufen der Preisregel:', error);
            res.status(500).json({
                message: 'Fehler beim Abrufen der Preisregel',
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
            if (!branchId || !name || !conditions || !action) {
                return res.status(400).json({
                    message: 'branchId, name, conditions und action sind erforderlich'
                });
            }
            const rule = yield prisma.pricingRule.create({
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
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'ruleCreated', rule.name);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_2.NotificationType.system,
                        relatedEntityId: rule.id,
                        relatedEntityType: 'created'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Fehler beim Erstellen der Notification:', error);
                }
            }
            res.status(201).json(rule);
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Erstellen der Preisregel:', error);
            res.status(500).json({
                message: 'Fehler beim Erstellen der Preisregel',
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
            if (isNaN(ruleId)) {
                return res.status(400).json({
                    message: 'Ungültige Regel-ID'
                });
            }
            const rule = yield prisma.pricingRule.update({
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
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (userId) {
                try {
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'ruleUpdated', rule.name);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_2.NotificationType.system,
                        relatedEntityId: rule.id,
                        relatedEntityType: 'updated'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Fehler beim Erstellen der Notification:', error);
                }
            }
            res.json(rule);
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Aktualisieren der Preisregel:', error);
            res.status(500).json({
                message: 'Fehler beim Aktualisieren der Preisregel',
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
            if (isNaN(ruleId)) {
                return res.status(400).json({
                    message: 'Ungültige Regel-ID'
                });
            }
            // Regel vor dem Löschen abrufen für Notification
            const rule = yield prisma.pricingRule.findUnique({
                where: {
                    id: ruleId
                }
            });
            yield prisma.pricingRule.delete({
                where: {
                    id: ruleId
                }
            });
            // Notification erstellen
            const userId = req.userId ? parseInt(req.userId, 10) : undefined;
            if (userId && rule) {
                try {
                    const language = yield (0, translations_1.getUserLanguage)(userId);
                    const notificationText = (0, translations_1.getPriceAnalysisNotificationText)(language, 'ruleDeleted', rule.name);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_2.NotificationType.system,
                        relatedEntityId: ruleId,
                        relatedEntityType: 'deleted'
                    });
                }
                catch (error) {
                    logger_1.logger.error('Fehler beim Erstellen der Notification:', error);
                }
            }
            res.json({
                success: true,
                message: 'Preisregel wurde gelöscht'
            });
        }
        catch (error) {
            logger_1.logger.error('Fehler beim Löschen der Preisregel:', error);
            res.status(500).json({
                message: 'Fehler beim Löschen der Preisregel',
                error: error.message
            });
        }
    })
};
//# sourceMappingURL=pricingRuleController.js.map