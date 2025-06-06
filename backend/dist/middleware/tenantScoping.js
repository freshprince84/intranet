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
exports.validateOrganizationLimits = exports.createOrganizationScopedQuery = exports.autoScopeToOrganization = exports.validateOrganizationAccess = exports.addOrganizationContext = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware to add organization context to requests
 * This should be used after authentication middleware
 */
const addOrganizationContext = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Get user's organization
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            include: { organization: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        if (!user.organization) {
            return res.status(403).json({ error: 'User has no organization assigned' });
        }
        if (!user.organization.isActive) {
            return res.status(403).json({ error: 'Organization is inactive' });
        }
        // Add organization context to request
        req.organizationId = user.organizationId;
        req.organization = user.organization;
        next();
    }
    catch (error) {
        console.error('Error in addOrganizationContext middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.addOrganizationContext = addOrganizationContext;
/**
 * Middleware to validate organization access for specific resources
 * Use this for endpoints that access organization-specific data
 */
const validateOrganizationAccess = (resourceType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const organizationId = req.organizationId;
            const resourceId = parseInt(req.params.id);
            if (!organizationId) {
                return res.status(403).json({ error: 'Organization context required' });
            }
            if (!resourceId) {
                return res.status(400).json({ error: 'Resource ID required' });
            }
            // Check if the resource belongs to the user's organization
            let resource;
            switch (resourceType) {
                case 'user':
                    resource = yield prisma.user.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                case 'role':
                    resource = yield prisma.role.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                case 'branch':
                    resource = yield prisma.branch.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                case 'task':
                    resource = yield prisma.task.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                case 'request':
                    resource = yield prisma.request.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                case 'client':
                    resource = yield prisma.client.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                case 'worktime':
                    resource = yield prisma.workTime.findFirst({
                        where: { id: resourceId, organizationId }
                    });
                    break;
                default:
                    return res.status(400).json({ error: 'Invalid resource type' });
            }
            if (!resource) {
                return res.status(404).json({ error: `${resourceType} not found or access denied` });
            }
            next();
        }
        catch (error) {
            console.error('Error in validateOrganizationAccess middleware:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
};
exports.validateOrganizationAccess = validateOrganizationAccess;
/**
 * Middleware to automatically scope database queries to user's organization
 * This modifies the request to include organization filters
 */
const autoScopeToOrganization = (req, res, next) => {
    const organizationId = req.organizationId;
    if (!organizationId) {
        return res.status(403).json({ error: 'Organization context required' });
    }
    // Add organization filter to query parameters
    if (!req.query.organizationId) {
        req.query.organizationId = organizationId.toString();
    }
    // Ensure the organization filter matches the user's organization
    if (req.query.organizationId && parseInt(req.query.organizationId) !== organizationId) {
        return res.status(403).json({ error: 'Access denied to other organization data' });
    }
    next();
};
exports.autoScopeToOrganization = autoScopeToOrganization;
/**
 * Utility function to create organization-scoped Prisma queries
 */
const createOrganizationScopedQuery = (organizationId, additionalWhere = {}) => {
    return Object.assign(Object.assign({}, additionalWhere), { organizationId });
};
exports.createOrganizationScopedQuery = createOrganizationScopedQuery;
/**
 * Middleware to validate organization limits (e.g., max users)
 */
const validateOrganizationLimits = (limitType) => {
    return (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const organizationId = req.organizationId;
            if (!organizationId) {
                return res.status(403).json({ error: 'Organization context required' });
            }
            const organization = yield prisma.organization.findUnique({
                where: { id: organizationId }
            });
            if (!organization) {
                return res.status(404).json({ error: 'Organization not found' });
            }
            // Check limits based on subscription tier
            let limit = null;
            let currentCount = 0;
            switch (limitType) {
                case 'users':
                    limit = organization.maxUsers;
                    if (limit) {
                        currentCount = yield prisma.user.count({
                            where: { organizationId }
                        });
                    }
                    break;
                case 'roles':
                    // Define role limits based on subscription tier
                    const roleLimits = {
                        'free': 3,
                        'premium': 10,
                        'enterprise': null // unlimited
                    };
                    limit = roleLimits[organization.subscriptionTier] || null;
                    if (limit) {
                        currentCount = yield prisma.role.count({
                            where: { organizationId }
                        });
                    }
                    break;
                case 'branches':
                    // Define branch limits based on subscription tier
                    const branchLimits = {
                        'free': 2,
                        'premium': 5,
                        'enterprise': null // unlimited
                    };
                    limit = branchLimits[organization.subscriptionTier] || null;
                    if (limit) {
                        currentCount = yield prisma.branch.count({
                            where: { organizationId }
                        });
                    }
                    break;
            }
            if (limit && currentCount >= limit) {
                return res.status(403).json({
                    error: `Organization limit reached for ${limitType}. Current: ${currentCount}, Limit: ${limit}`,
                    limit,
                    current: currentCount
                });
            }
            next();
        }
        catch (error) {
            console.error('Error in validateOrganizationLimits middleware:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
};
exports.validateOrganizationLimits = validateOrganizationLimits;
//# sourceMappingURL=tenantScoping.js.map