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
exports.updateLifecycleRoles = exports.getLifecycleRoles = exports.updateCurrentOrganization = exports.updateOrganizationLanguage = exports.getOrganizationLanguage = exports.searchOrganizations = exports.processJoinRequest = exports.getJoinRequests = exports.createJoinRequest = exports.getCurrentOrganization = exports.getOrganizationStats = exports.deleteOrganization = exports.updateOrganization = exports.createOrganization = exports.getOrganizationById = exports.getAllOrganizations = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const prisma = new client_1.PrismaClient();
// Validation Schemas
const createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name ist erforderlich'),
    displayName: zod_1.z.string().min(1, 'Anzeigename ist erforderlich'),
    maxUsers: zod_1.z.number().min(1, 'Maximale Benutzeranzahl muss mindestens 1 sein').optional(),
    subscriptionPlan: zod_1.z.enum(['basic', 'pro', 'enterprise', 'trial']).optional(),
    domain: zod_1.z.string().optional()
});
const updateOrganizationSchema = zod_1.z.object({
    displayName: zod_1.z.string().min(1).optional(),
    maxUsers: zod_1.z.number().min(1).optional(),
    subscriptionPlan: zod_1.z.enum(['basic', 'pro', 'enterprise', 'trial']).optional(),
    isActive: zod_1.z.boolean().optional(),
    domain: zod_1.z.string().optional(),
    logo: zod_1.z.string().optional(),
    settings: zod_1.z.record(zod_1.z.any()).optional()
});
const languageSchema = zod_1.z.enum(['es', 'de', 'en']);
// Alle Organisationen abrufen
const getAllOrganizations = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const organizations = yield prisma.organization.findMany({
            select: {
                id: true,
                name: true,
                displayName: true,
                isActive: true,
                maxUsers: true,
                subscriptionPlan: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        roles: true,
                        joinRequests: true,
                        invitations: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(organizations);
    }
    catch (error) {
        console.error('Error in getAllOrganizations:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisationen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllOrganizations = getAllOrganizations;
// Organisation nach ID abrufen
const getOrganizationById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        const organization = yield prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                roles: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        _count: {
                            select: { users: true }
                        }
                    }
                },
                joinRequests: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        requester: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                },
                invitations: {
                    select: {
                        id: true,
                        email: true,
                        expiresAt: true,
                        acceptedAt: true,
                        createdAt: true,
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        inviter: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!organization) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        res.json(organization);
    }
    catch (error) {
        console.error('Error in getOrganizationById:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOrganizationById = getOrganizationById;
// Neue Organisation erstellen
const createOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const validatedData = createOrganizationSchema.parse(req.body);
        // Normalisiere Name zu lowercase für Konsistenz
        const normalizedName = validatedData.name.toLowerCase().trim();
        // Prüfe ob Name bereits existiert
        const existingOrg = yield prisma.organization.findUnique({
            where: { name: normalizedName }
        });
        if (existingOrg) {
            return res.status(400).json({ message: 'Organisation mit diesem Namen existiert bereits' });
        }
        // Prüfe auch Domain falls angegeben
        if (validatedData.domain) {
            const normalizedDomain = validatedData.domain.toLowerCase().trim();
            const existingOrgByDomain = yield prisma.organization.findUnique({
                where: { domain: normalizedDomain }
            });
            if (existingOrgByDomain) {
                return res.status(400).json({ message: 'Organisation mit dieser Domain existiert bereits' });
            }
        }
        // Alle verfügbaren Seiten, Tabellen und Buttons (aus seed.ts)
        const ALL_PAGES = [
            'dashboard',
            'worktracker',
            'consultations',
            'team_worktime_control', // = workcenter
            'payroll', // = lohnabrechnung
            'organization_management', // = organisation (Hauptseite)
            'cerebro',
            'settings',
            'profile'
        ];
        const ALL_TABLES = [
            'requests', // auf dashboard
            'tasks', // auf worktracker
            'users', // auf organization_management
            'roles', // auf organization_management
            'organization', // auf organization_management
            'team_worktime', // auf team_worktime_control
            'worktime', // auf worktracker
            'clients', // auf consultations
            'consultation_invoices', // auf consultations
            'branches', // auf settings/system
            'notifications', // allgemein
            'settings', // auf settings
            'monthly_reports', // auf consultations/reports
            'organization_join_requests', // auf organization_management
            'organization_users' // auf organization_management
        ];
        const ALL_BUTTONS = [
            // Database Management Buttons (Settings/System)
            'database_reset_table',
            'database_logs',
            // Invoice Functions Buttons
            'invoice_create',
            'invoice_download',
            'invoice_mark_paid',
            'invoice_settings',
            // Todo/Task Buttons (Worktracker)
            'todo_create',
            'todo_edit',
            'todo_delete',
            'task_create',
            'task_edit',
            'task_delete',
            // User Management Buttons
            'user_create',
            'user_edit',
            'user_delete',
            'role_assign',
            'role_create',
            'role_edit',
            'role_delete',
            // Organization Management Buttons
            'organization_create',
            'organization_edit',
            'organization_delete',
            // Worktime Buttons
            'worktime_start',
            'worktime_stop',
            'worktime_edit',
            'worktime_delete',
            // General Cerebro Button
            'cerebro',
            // Consultation Buttons
            'consultation_start',
            'consultation_stop',
            'consultation_edit',
            // Client Management Buttons
            'client_create',
            'client_edit',
            'client_delete',
            // Settings Buttons
            'settings_system',
            'settings_notifications',
            'settings_profile',
            // Payroll Buttons
            'payroll_generate',
            'payroll_export',
            'payroll_edit'
        ];
        // Erstelle Organisation und Admin-Rolle in einer Transaction
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            // 1. Organisation erstellen
            const normalizedName = validatedData.name.toLowerCase().trim();
            const normalizedDomain = validatedData.domain ? validatedData.domain.toLowerCase().trim() : null;
            const organization = yield tx.organization.create({
                data: {
                    name: normalizedName,
                    displayName: validatedData.displayName.trim(),
                    maxUsers: (_a = validatedData.maxUsers) !== null && _a !== void 0 ? _a : 50, // Default 50 falls nicht angegeben
                    subscriptionPlan: (_b = validatedData.subscriptionPlan) !== null && _b !== void 0 ? _b : 'basic', // Default 'basic' falls nicht angegeben
                    domain: normalizedDomain,
                    isActive: true
                }
            });
            // 2. Admin-Rolle für die Organisation erstellen
            const adminRole = yield tx.role.create({
                data: {
                    name: 'Admin',
                    description: 'Administrator der Organisation',
                    organizationId: organization.id
                }
            });
            // 3. Alle Berechtigungen für Admin-Rolle erstellen (alles mit 'both')
            const permissions = [];
            // Pages
            for (const page of ALL_PAGES) {
                permissions.push({
                    entity: page,
                    entityType: 'page',
                    accessLevel: 'both',
                    roleId: adminRole.id
                });
            }
            // Tables
            for (const table of ALL_TABLES) {
                permissions.push({
                    entity: table,
                    entityType: 'table',
                    accessLevel: 'both',
                    roleId: adminRole.id
                });
            }
            // Buttons
            for (const button of ALL_BUTTONS) {
                permissions.push({
                    entity: button,
                    entityType: 'button',
                    accessLevel: 'both',
                    roleId: adminRole.id
                });
            }
            yield tx.permission.createMany({
                data: permissions
            });
            // 3b. User-Rolle für die Organisation erstellen
            const userRole = yield tx.role.create({
                data: {
                    name: 'User',
                    description: 'Standardbenutzer der Organisation',
                    organizationId: organization.id
                }
            });
            // 3c. Berechtigungen für User-Rolle erstellen (basierend auf seed.ts)
            const userPermissions = [];
            const userPermissionMap = {
                'page_dashboard': 'both',
                'page_worktracker': 'both',
                'page_consultations': 'both',
                'page_payroll': 'both',
                'page_cerebro': 'both',
                'page_settings': 'both',
                'page_profile': 'both',
                'table_requests': 'both',
                'table_clients': 'both',
                'table_consultation_invoices': 'both',
                'table_notifications': 'both',
                'table_monthly_reports': 'both',
                'button_invoice_create': 'both',
                'button_invoice_download': 'both',
                'button_cerebro': 'both',
                'button_consultation_start': 'both',
                'button_consultation_stop': 'both',
                'button_consultation_edit': 'both',
                'button_client_create': 'both',
                'button_client_edit': 'both',
                'button_client_delete': 'both',
                'button_settings_notifications': 'both',
                'button_settings_profile': 'both',
                'button_worktime_start': 'both',
                'button_worktime_stop': 'both'
            };
            for (const page of ALL_PAGES) {
                const accessLevel = userPermissionMap[`page_${page}`] || 'none';
                userPermissions.push({
                    entity: page,
                    entityType: 'page',
                    accessLevel: accessLevel,
                    roleId: userRole.id
                });
            }
            for (const table of ALL_TABLES) {
                const accessLevel = userPermissionMap[`table_${table}`] || 'none';
                userPermissions.push({
                    entity: table,
                    entityType: 'table',
                    accessLevel: accessLevel,
                    roleId: userRole.id
                });
            }
            for (const button of ALL_BUTTONS) {
                const accessLevel = userPermissionMap[`button_${button}`] || 'none';
                userPermissions.push({
                    entity: button,
                    entityType: 'button',
                    accessLevel: accessLevel,
                    roleId: userRole.id
                });
            }
            yield tx.permission.createMany({
                data: userPermissions
            });
            // 3d. Hamburger-Rolle für die Organisation erstellen
            const hamburgerRole = yield tx.role.create({
                data: {
                    name: 'Hamburger',
                    description: 'Hamburger-Rolle für neue Benutzer der Organisation',
                    organizationId: organization.id
                }
            });
            // 3e. Berechtigungen für Hamburger-Rolle erstellen (basierend auf seed.ts)
            const hamburgerPermissions = [];
            const hamburgerPermissionMap = {
                'page_dashboard': 'both',
                'page_settings': 'both',
                'page_profile': 'both',
                'page_cerebro': 'both',
                'button_cerebro': 'both',
                'button_settings_profile': 'both',
                'table_notifications': 'both'
            };
            for (const page of ALL_PAGES) {
                const accessLevel = hamburgerPermissionMap[`page_${page}`] || 'none';
                hamburgerPermissions.push({
                    entity: page,
                    entityType: 'page',
                    accessLevel: accessLevel,
                    roleId: hamburgerRole.id
                });
            }
            for (const table of ALL_TABLES) {
                const accessLevel = hamburgerPermissionMap[`table_${table}`] || 'none';
                hamburgerPermissions.push({
                    entity: table,
                    entityType: 'table',
                    accessLevel: accessLevel,
                    roleId: hamburgerRole.id
                });
            }
            for (const button of ALL_BUTTONS) {
                const accessLevel = hamburgerPermissionMap[`button_${button}`] || 'none';
                hamburgerPermissions.push({
                    entity: button,
                    entityType: 'button',
                    accessLevel: accessLevel,
                    roleId: hamburgerRole.id
                });
            }
            yield tx.permission.createMany({
                data: hamburgerPermissions
            });
            // 4. Deaktiviere alle anderen Rollen des Users (setze lastUsed auf false)
            // WICHTIG: Wir löschen KEINE Rollen ohne Organisation, damit der User später
            // mehreren Organisationen angehören kann (z.B. als "Oberadmin")
            yield tx.userRole.updateMany({
                where: {
                    userId: Number(userId),
                    lastUsed: true
                },
                data: {
                    lastUsed: false
                }
            });
            // 5. Weise den Ersteller zur Admin-Rolle zu (als lastUsed)
            // Dies aktiviert die neue Admin-Rolle der erstellten Organisation
            yield tx.userRole.create({
                data: {
                    userId: Number(userId),
                    roleId: adminRole.id,
                    lastUsed: true
                }
            });
            return {
                organization: {
                    id: organization.id,
                    name: organization.name,
                    displayName: organization.displayName,
                    isActive: organization.isActive,
                    maxUsers: organization.maxUsers,
                    subscriptionPlan: organization.subscriptionPlan,
                    createdAt: organization.createdAt,
                    updatedAt: organization.updatedAt
                },
                adminRoleId: adminRole.id
            };
        }));
        console.log(`✅ Organisation "${result.organization.displayName}" erstellt. Ersteller (User ${userId}) ist jetzt Admin.`);
        res.status(201).json(result.organization);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors: error.errors
            });
        }
        console.error('Error in createOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createOrganization = createOrganization;
// Organisation aktualisieren
const updateOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        const validatedData = updateOrganizationSchema.parse(req.body);
        // Prüfe ob Organisation existiert
        const existingOrg = yield prisma.organization.findUnique({
            where: { id: organizationId }
        });
        if (!existingOrg) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        const organization = yield prisma.organization.update({
            where: { id: organizationId },
            data: validatedData,
            select: {
                id: true,
                name: true,
                displayName: true,
                isActive: true,
                maxUsers: true,
                subscriptionPlan: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json(organization);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors: error.errors
            });
        }
        console.error('Error in updateOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateOrganization = updateOrganization;
// Organisation löschen
const deleteOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const organizationId = parseInt(id);
        if (isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        // Prüfe ob es die Standard-Organisation ist
        if (organizationId === 1) {
            return res.status(400).json({ message: 'Standard-Organisation kann nicht gelöscht werden' });
        }
        // Prüfe ob Organisation existiert
        const existingOrg = yield prisma.organization.findUnique({
            where: { id: organizationId },
            include: {
                _count: {
                    select: {
                        roles: true,
                        joinRequests: true,
                        invitations: true
                    }
                }
            }
        });
        if (!existingOrg) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        // Prüfe ob Organisation noch Abhängigkeiten hat
        if (existingOrg._count.roles > 0) {
            return res.status(400).json({
                message: 'Organisation kann nicht gelöscht werden - noch Rollen vorhanden'
            });
        }
        // Lösche zuerst abhängige Datensätze
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Lösche Join Requests
            yield tx.organizationJoinRequest.deleteMany({
                where: { organizationId }
            });
            // Lösche Invitations
            yield tx.organizationInvitation.deleteMany({
                where: { organizationId }
            });
            // Lösche Organisation
            yield tx.organization.delete({
                where: { id: organizationId }
            });
        }));
        res.json({ message: 'Organisation erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error in deleteOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteOrganization = deleteOrganization;
// Organisation-Statistiken abrufen
const getOrganizationStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Verwende organizationId aus Middleware (für /current/stats) oder aus params (für /:id/stats)
        const organizationId = req.organizationId || (req.params.id ? parseInt(req.params.id) : null);
        if (!organizationId || isNaN(organizationId)) {
            return res.status(400).json({ message: 'Ungültige Organisations-ID' });
        }
        const stats = yield prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                id: true,
                name: true,
                displayName: true,
                maxUsers: true,
                _count: {
                    select: {
                        roles: true,
                        joinRequests: true,
                        invitations: true
                    }
                }
            }
        });
        if (!stats) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        // Berechne aktuelle Benutzeranzahl über Rollen
        const userCount = yield prisma.userRole.count({
            where: {
                role: {
                    organizationId: organizationId
                }
            }
        });
        const response = Object.assign(Object.assign({}, stats), { currentUsers: userCount, availableSlots: stats.maxUsers - userCount, utilizationPercent: Math.round((userCount / stats.maxUsers) * 100) });
        res.json(response);
    }
    catch (error) {
        console.error('Error in getOrganizationStats:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisations-Statistiken',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOrganizationStats = getOrganizationStats;
// Aktuelle Organisation abrufen (basierend auf User-Kontext)
const getCurrentOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole die aktuelle Rolle des Users
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId: Number(userId),
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true
                    }
                }
            }
        });
        // Prüfe ob User eine Rolle hat
        if (!userRole) {
            return res.status(404).json({
                message: 'Keine Organisation gefunden',
                hasOrganization: false,
                hint: 'Sie haben noch keine Organisation. Bitte erstellen Sie eine oder treten Sie einer bei.'
            });
        }
        // Prüfe ob die Rolle eine Organisation hat
        if (!userRole.role.organization) {
            return res.status(404).json({
                message: 'Keine Organisation gefunden',
                hasOrganization: false,
                hint: 'Sie haben noch keine Organisation. Bitte erstellen Sie eine oder treten Sie einer bei.'
            });
        }
        res.json(userRole.role.organization);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Organisation:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getCurrentOrganization = getCurrentOrganization;
// Beitrittsanfrage erstellen
const createJoinRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { organizationName, message } = req.body;
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!organizationName) {
            return res.status(400).json({ message: 'Organisationsname ist erforderlich' });
        }
        // Finde Organisation
        const organization = yield prisma.organization.findUnique({
            where: { name: organizationName.toLowerCase() }
        });
        if (!organization) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        // Prüfe ob bereits Anfrage existiert
        const existingRequest = yield prisma.organizationJoinRequest.findUnique({
            where: {
                organizationId_requesterId: {
                    organizationId: organization.id,
                    requesterId: Number(userId)
                }
            }
        });
        if (existingRequest) {
            return res.status(409).json({ message: 'Beitrittsanfrage bereits gestellt' });
        }
        const joinRequest = yield prisma.organizationJoinRequest.create({
            data: {
                organizationId: organization.id,
                requesterId: Number(userId),
                message: message || null
            },
            include: {
                organization: true,
                requester: true
            }
        });
        res.status(201).json(joinRequest);
    }
    catch (error) {
        console.error('Fehler beim Erstellen der Beitrittsanfrage:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.createJoinRequest = createJoinRequest;
// Beitrittsanfragen abrufen
const getJoinRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('=== getJoinRequests CALLED ===');
        const userId = req.userId;
        console.log('userId:', userId);
        console.log('req.organizationId:', req.organizationId);
        if (!userId) {
            console.log('❌ No userId, returning 401');
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Verwende req.organizationId aus Middleware (wie getOrganizationStats)
        if (!req.organizationId) {
            console.log('❌ No organizationId, returning 400');
            return res.status(400).json({
                message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar'
            });
        }
        console.log('✅ Fetching join requests for organizationId:', req.organizationId);
        const joinRequests = yield prisma.organizationJoinRequest.findMany({
            where: { organizationId: req.organizationId },
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                },
                processor: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log('✅ Found join requests:', joinRequests.length);
        console.log('✅ Returning join requests to frontend');
        res.json(joinRequests);
    }
    catch (error) {
        console.error('❌ Error in getJoinRequests:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.getJoinRequests = getJoinRequests;
// Beitrittsanfrage bearbeiten
const processJoinRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { action, response, roleId } = req.body; // action: 'approve' | 'reject'
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfe ob User eine Organisation hat
        if (!req.organizationId) {
            return res.status(400).json({
                message: 'Diese Funktion ist nur für Benutzer mit Organisation verfügbar'
            });
        }
        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({ message: 'Ungültige Aktion' });
        }
        // Hole Beitrittsanfrage
        const joinRequest = yield prisma.organizationJoinRequest.findUnique({
            where: { id: Number(id) },
            include: {
                organization: true,
                requester: true
            }
        });
        if (!joinRequest) {
            return res.status(404).json({ message: 'Beitrittsanfrage nicht gefunden' });
        }
        // Prüfe ob JoinRequest zur Organisation des Users gehört
        if (joinRequest.organizationId !== req.organizationId) {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Beitrittsanfrage' });
        }
        if (joinRequest.status !== 'pending') {
            return res.status(400).json({ message: 'Anfrage bereits bearbeitet' });
        }
        const result = yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Aktualisiere Beitrittsanfrage
            const updatedRequest = yield tx.organizationJoinRequest.update({
                where: { id: Number(id) },
                data: {
                    status: action === 'approve' ? 'approved' : 'rejected',
                    response: response || null,
                    processedBy: Number(userId),
                    processedAt: new Date()
                }
            });
            if (action === 'approve') {
                // Erstelle UserRole-Eintrag
                let targetRoleId = roleId ? Number(roleId) : null;
                // Falls keine Rolle angegeben, verwende Hamburger-Rolle als Standard
                if (!targetRoleId) {
                    const hamburgerRole = yield tx.role.findFirst({
                        where: {
                            organizationId: joinRequest.organizationId,
                            name: 'Hamburger'
                        }
                    });
                    if (!hamburgerRole) {
                        throw new Error('Hamburger-Rolle für Organisation nicht gefunden');
                    }
                    targetRoleId = hamburgerRole.id;
                }
                yield tx.userRole.create({
                    data: {
                        userId: joinRequest.requesterId,
                        roleId: targetRoleId,
                        lastUsed: false // Nicht als aktiv setzen, da User bereits andere Rolle haben könnte
                    }
                });
            }
            return updatedRequest;
        }));
        res.json(result);
    }
    catch (error) {
        console.error('Fehler beim Bearbeiten der Beitrittsanfrage:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.processJoinRequest = processJoinRequest;
// Organisationen für Join-Request suchen
const searchOrganizations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search } = req.query;
        if (!search || typeof search !== 'string') {
            return res.status(400).json({ message: 'Suchbegriff ist erforderlich' });
        }
        const organizations = yield prisma.organization.findMany({
            where: {
                AND: [
                    { isActive: true },
                    {
                        OR: [
                            { name: { contains: search.toLowerCase() } },
                            { displayName: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                displayName: true,
                logo: true
            },
            take: 10
        });
        res.json(organizations);
    }
    catch (error) {
        console.error('Fehler beim Suchen von Organisationen:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.searchOrganizations = searchOrganizations;
// Organisation-Sprache abrufen
const getOrganizationLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole die aktuelle Organisation des Users
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId: Number(userId),
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true
                    }
                }
            }
        });
        if (!(userRole === null || userRole === void 0 ? void 0 : userRole.role.organization)) {
            return res.status(404).json({ message: 'Keine Organisation gefunden' });
        }
        const organization = userRole.role.organization;
        const settings = organization.settings;
        // Lese Sprache aus settings JSON-Feld
        const language = (settings === null || settings === void 0 ? void 0 : settings.language) || null;
        res.json({ language });
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Organisation-Sprache:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Organisation-Sprache',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOrganizationLanguage = getOrganizationLanguage;
// Organisation-Sprache aktualisieren
const updateOrganizationLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Validiere Sprache
        const { language } = req.body;
        const validatedLanguage = languageSchema.parse(language);
        // Hole die aktuelle Organisation des Users
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId: Number(userId),
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true
                    }
                }
            }
        });
        if (!(userRole === null || userRole === void 0 ? void 0 : userRole.role.organization)) {
            return res.status(404).json({ message: 'Keine Organisation gefunden' });
        }
        const organization = userRole.role.organization;
        const currentSettings = organization.settings || {};
        // Aktualisiere Sprache in settings JSON-Feld
        const updatedSettings = Object.assign(Object.assign({}, currentSettings), { language: validatedLanguage });
        const updatedOrganization = yield prisma.organization.update({
            where: { id: organization.id },
            data: {
                settings: updatedSettings
            },
            select: {
                id: true,
                name: true,
                displayName: true,
                settings: true
            }
        });
        res.json({
            language: validatedLanguage,
            organization: updatedOrganization
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Ungültige Sprache',
                errors: error.errors
            });
        }
        console.error('Fehler beim Aktualisieren der Organisation-Sprache:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Organisation-Sprache',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateOrganizationLanguage = updateOrganizationLanguage;
// Aktuelle Organisation aktualisieren (basierend auf User-Kontext)
const updateCurrentOrganization = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Validiere Eingabedaten
        const validatedData = updateOrganizationSchema.parse(req.body);
        // Hole die aktuelle Organisation des Users
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId: Number(userId),
                lastUsed: true
            },
            include: {
                role: {
                    include: {
                        organization: true
                    }
                }
            }
        });
        if (!(userRole === null || userRole === void 0 ? void 0 : userRole.role.organization)) {
            return res.status(404).json({ message: 'Keine Organisation gefunden' });
        }
        const organization = userRole.role.organization;
        // Wenn settings aktualisiert werden, merge sie mit bestehenden settings
        let updateData = Object.assign({}, validatedData);
        if (validatedData.settings !== undefined) {
            const currentSettings = organization.settings || {};
            updateData.settings = Object.assign(Object.assign({}, currentSettings), validatedData.settings);
        }
        // Aktualisiere Organisation
        const updatedOrganization = yield prisma.organization.update({
            where: { id: organization.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                displayName: true,
                domain: true,
                logo: true,
                isActive: true,
                maxUsers: true,
                subscriptionPlan: true,
                settings: true,
                createdAt: true,
                updatedAt: true
            }
        });
        res.json(updatedOrganization);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                message: 'Validierungsfehler',
                errors: error.errors
            });
        }
        console.error('Error in updateCurrentOrganization:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Organisation',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateCurrentOrganization = updateCurrentOrganization;
// Lebenszyklus-Rollen-Konfiguration abrufen
const getLifecycleRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Keine Organisation gefunden' });
        }
        const organization = yield prisma.organization.findUnique({
            where: { id: req.organizationId },
            select: { settings: true }
        });
        if (!organization) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        const settings = organization.settings;
        const lifecycleRoles = (settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles) || null;
        // Hole alle verfügbaren Rollen der Organisation
        const roles = yield prisma.role.findMany({
            where: { organizationId: req.organizationId },
            select: {
                id: true,
                name: true,
                description: true
            },
            orderBy: { name: 'asc' }
        });
        res.json({
            lifecycleRoles,
            availableRoles: roles
        });
    }
    catch (error) {
        console.error('Error in getLifecycleRoles:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Lebenszyklus-Rollen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getLifecycleRoles = getLifecycleRoles;
// Lebenszyklus-Rollen-Konfiguration aktualisieren
const updateLifecycleRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.organizationId) {
            return res.status(400).json({ message: 'Keine Organisation gefunden' });
        }
        const { adminRoleId, hrRoleId, legalRoleId, employeeRoleIds } = req.body;
        // Validiere Rollen-IDs
        const roleIds = [adminRoleId, hrRoleId, legalRoleId, ...(employeeRoleIds || [])].filter(Boolean);
        if (roleIds.length > 0) {
            const validRoles = yield prisma.role.findMany({
                where: {
                    id: { in: roleIds },
                    organizationId: req.organizationId
                }
            });
            if (validRoles.length !== roleIds.length) {
                return res.status(400).json({ message: 'Eine oder mehrere Rollen gehören nicht zu dieser Organisation' });
            }
        }
        // Hole aktuelle Organisation
        const organization = yield prisma.organization.findUnique({
            where: { id: req.organizationId },
            select: { settings: true }
        });
        if (!organization) {
            return res.status(404).json({ message: 'Organisation nicht gefunden' });
        }
        const settings = organization.settings || {};
        settings.lifecycleRoles = {
            adminRoleId: adminRoleId || null,
            hrRoleId: hrRoleId || null,
            legalRoleId: legalRoleId || null,
            employeeRoleIds: employeeRoleIds || []
        };
        // Aktualisiere Organisation
        const updated = yield prisma.organization.update({
            where: { id: req.organizationId },
            data: { settings },
            select: {
                id: true,
                name: true,
                displayName: true,
                settings: true
            }
        });
        res.json({
            lifecycleRoles: (_a = updated.settings) === null || _a === void 0 ? void 0 : _a.lifecycleRoles,
            message: 'Lebenszyklus-Rollen erfolgreich aktualisiert'
        });
    }
    catch (error) {
        console.error('Error in updateLifecycleRoles:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Lebenszyklus-Rollen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateLifecycleRoles = updateLifecycleRoles;
//# sourceMappingURL=organizationController.js.map