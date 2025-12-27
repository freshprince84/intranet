"use strict";
// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debugUserBranches = exports.getOnboardingAnalytics = exports.resetOnboarding = exports.trackOnboardingEvent = exports.completeOnboarding = exports.updateOnboardingProgress = exports.getOnboardingStatus = exports.deleteUser = exports.updateUser = exports.createUser = exports.switchUserRole = exports.updateInvoiceSettings = exports.getUserActiveLanguage = exports.updateUserSettings = exports.updateUserBranches = exports.updateUserRoles = exports.isProfileComplete = exports.updateProfile = exports.updateUserById = exports.getUserById = exports.getAllUsersForDropdown = exports.getAllUsers = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../utils/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const notificationController_1 = require("./notificationController");
const translations_1 = require("../utils/translations");
const logger_1 = require("../utils/logger");
const organization_1 = require("../middleware/organization");
const lifecycleService_1 = require("../services/lifecycleService");
const userLanguageCache_1 = require("../services/userLanguageCache");
const userCache_1 = require("../services/userCache");
const filterListCache_1 = require("../services/filterListCache");
// Alle Benutzer abrufen
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma_1.prisma.user.findMany({
            where: (0, organization_1.getUserOrganizationFilter)(req),
            include: {
                roles: {
                    where: {
                        role: {
                            organizationId: req.organizationId
                        }
                    },
                    include: {
                        role: true
                    }
                },
                branches: {
                    include: {
                        branch: true
                    }
                }
            },
            orderBy: [
                { username: 'asc' },
                { firstName: 'asc' }
            ]
        });
        res.json(users);
    }
    catch (error) {
        logger_1.logger.error('Error in getAllUsers:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Benutzer',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllUsers = getAllUsers;
// Alle Benutzer für Dropdowns abrufen (nur User der Organisation)
const getAllUsersForDropdown = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Für Dropdowns: Nur User der Organisation (oder nur eigene wenn standalone) und nur aktive Benutzer
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const users = yield prisma_1.prisma.user.findMany({
            where: Object.assign(Object.assign({}, userFilter), { active: true }),
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                payrollCountry: true,
                roles: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true,
                                description: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { username: 'asc' },
                { firstName: 'asc' }
            ]
        });
        res.json(users);
    }
    catch (error) {
        logger_1.logger.error('Error in getAllUsersForDropdown:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Benutzer für Dropdown',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllUsersForDropdown = getAllUsersForDropdown;
// Spezifischen Benutzer abrufen
// ✅ STANDARD: Eine Methode für alle User-Abfragen (Profile und UserManagement)
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        const authenticatedRequest = req;
        const authenticatedUserId = authenticatedRequest.userId ? parseInt(authenticatedRequest.userId, 10) : null;
        const roleId = authenticatedRequest.roleId ? parseInt(authenticatedRequest.roleId, 10) : null;
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // ✅ STANDARD: Optionale Parameter für Performance-Optimierung
        const includeSettings = req.query.includeSettings === 'true';
        const includeInvoiceSettings = req.query.includeInvoiceSettings === 'true';
        // ✅ STANDARD: identificationDocuments werden IMMER geladen (essentielle Felder)
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: Object.assign(Object.assign({ roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
                            }
                        }
                    }
                }, branches: {
                    include: {
                        branch: true
                    }
                }, identificationDocuments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1 // Neuestes Dokument
                } }, (includeSettings ? { settings: true } : {})), (includeInvoiceSettings ? { invoiceSettings: true } : {}))
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // ✅ STANDARD: lastUsed setzen, wenn es der aktuelle User ist
        if (authenticatedUserId === userId && roleId) {
            const modifiedUser = Object.assign(Object.assign({}, user), { roles: user.roles.map(roleEntry => {
                    const isActiveRole = roleEntry.role.id === roleId;
                    return Object.assign(Object.assign({}, roleEntry), { role: Object.assign(Object.assign({}, roleEntry.role), { organization: roleEntry.role.organization ? Object.assign(Object.assign({}, roleEntry.role.organization), { 
                                // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                                logo: isActiveRole
                                    ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                                    : null // ✅ Inaktive Roles: Logo = null (spart Memory)
                             }) : null }), lastUsed: isActiveRole });
                }) });
            return res.json(modifiedUser);
        }
        // Stelle sicher, dass das Logo-Feld explizit zurückgegeben wird
        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
        const userWithLogo = Object.assign(Object.assign({}, user), { roles: user.roles.map(roleEntry => (Object.assign(Object.assign({}, roleEntry), { role: Object.assign(Object.assign({}, roleEntry.role), { organization: roleEntry.role.organization ? Object.assign(Object.assign({}, roleEntry.role.organization), { 
                        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                        logo: roleEntry.lastUsed
                            ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                            : null // ✅ Inaktive Roles: Logo = null (spart Memory)
                     }) : null }) }))) });
        res.json(userWithLogo);
    }
    catch (error) {
        logger_1.logger.error('Error in getUserById:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getUserById = getUserById;
// Spezifischen Benutzer aktualisieren
const updateUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary, 
        // Zusätzliche Lohnabrechnung-Felder
        payrollCountry, hourlyRate, contractType, monthlySalary, 
        // Arbeitszeit-Felder
        normalWorkingHours, active } = req.body;
        logger_1.logger.log('updateUserById - Received body:', req.body);
        logger_1.logger.log('updateUserById - Active value:', active, 'Type:', typeof active);
        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = yield prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        username ? { username } : {},
                        email ? { email } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    NOT: {
                        id: userId
                    }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Benutzername oder E-Mail wird bereits verwendet'
                });
            }
        }
        // Validiere E-Mail-Format
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                message: 'Ungültiges E-Mail-Format'
            });
        }
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (username && { username })), (email && { email })), (firstName && { firstName })), (lastName && { lastName })), (birthday && { birthday: new Date(birthday) })), (bankDetails && { bankDetails })), (contract !== undefined && { contract: contract || null })), (salary !== undefined && { salary: salary === null ? null : parseFloat(salary.toString()) })), (payrollCountry && { payrollCountry })), (hourlyRate !== undefined && { hourlyRate: hourlyRate === null ? null : hourlyRate })), (contractType !== undefined && { contractType })), (monthlySalary !== undefined && { monthlySalary: monthlySalary === null ? null : parseFloat(monthlySalary.toString()) })), (normalWorkingHours !== undefined && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) })), (active !== undefined && active !== null && { active: Boolean(active) }));
        logger_1.logger.log('Updating user with data:', updateData);
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        // Cache-Invalidierung: Wenn User-Daten aktualisiert wurden, Caches invalidieren
        if ('language' in updateData && updateData.language !== undefined) {
            userLanguageCache_1.userLanguageCache.invalidate(userId);
        }
        // ✅ PERFORMANCE: UserCache invalidieren bei User-Update
        userCache_1.userCache.invalidate(userId);
        // ✅ FIX: FilterListCache invalidieren wenn User aktiviert/deaktiviert wird (betrifft User-Filter-Gruppen)
        if ('active' in updateData && updateData.active !== undefined) {
            // Wenn User-Status geändert wird, müssen alle Filter-Gruppen-Caches invalidiert werden
            // (da User-Filter-Gruppen nur aktive User zeigen sollen)
            filterListCache_1.filterListCache.clear();
        }
        // Automatisch epsRequired setzen basierend auf contract-Typ
        if (contract !== undefined && contract !== null && contract !== '') {
            try {
                logger_1.logger.log(`[EPS Required] Contract geändert für User ${userId}: ${contract}`);
                const lifecycle = yield prisma_1.prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });
                if (lifecycle) {
                    // tiempo_completo → epsRequired = true
                    // Alle anderen → epsRequired = false
                    const epsRequired = contract === 'tiempo_completo';
                    logger_1.logger.log(`[EPS Required] Setze epsRequired auf ${epsRequired} für User ${userId} (contract: ${contract})`);
                    logger_1.logger.log(`[EPS Required] Aktueller Wert in DB: ${lifecycle.epsRequired}`);
                    const updated = yield prisma_1.prisma.employeeLifecycle.update({
                        where: { userId },
                        data: { epsRequired }
                    });
                    logger_1.logger.log(`[EPS Required] Nach Update - epsRequired in DB: ${updated.epsRequired}`);
                    // Wenn epsRequired von false auf true geändert wurde, aktualisiere bestehende "not_required"-Registrierung
                    if (epsRequired && !lifecycle.epsRequired) {
                        const existingRegistration = yield prisma_1.prisma.socialSecurityRegistration.findUnique({
                            where: {
                                lifecycleId_registrationType: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps'
                                }
                            }
                        });
                        if (existingRegistration && existingRegistration.status === 'not_required') {
                            // Ändere Status von "not_required" auf "pending"
                            yield prisma_1.prisma.socialSecurityRegistration.update({
                                where: {
                                    lifecycleId_registrationType: {
                                        lifecycleId: lifecycle.id,
                                        registrationType: 'eps'
                                    }
                                },
                                data: {
                                    status: 'pending'
                                }
                            });
                            logger_1.logger.log(`[EPS Required] EPS-Registrierung von "not_required" auf "pending" geändert für User ${userId}`);
                        }
                        else if (!existingRegistration) {
                            // Erstelle neue "pending"-Registrierung
                            yield prisma_1.prisma.socialSecurityRegistration.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps',
                                    status: 'pending'
                                }
                            });
                            logger_1.logger.log(`[EPS Required] Neue EPS-Registrierung mit Status "pending" erstellt für User ${userId}`);
                        }
                    }
                    // Erstelle Event für die Änderung
                    yield prisma_1.prisma.lifecycleEvent.create({
                        data: {
                            lifecycleId: lifecycle.id,
                            eventType: 'eps_required_updated',
                            eventData: {
                                contract,
                                epsRequired,
                                reason: `Automatisch gesetzt basierend auf Vertragstyp: ${contract}`
                            }
                        }
                    });
                    logger_1.logger.log(`[EPS Required] Erfolgreich aktualisiert für User ${userId}`);
                }
                else {
                    logger_1.logger.log(`[EPS Required] Kein Lifecycle gefunden für User ${userId}`);
                }
            }
            catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger_1.logger.error('Fehler beim Aktualisieren von epsRequired:', lifecycleError);
            }
        }
        else {
            logger_1.logger.log(`[EPS Required] Contract nicht gesetzt oder leer für User ${userId}`);
        }
        res.json(updatedUser);
    }
    catch (error) {
        logger_1.logger.error('Error in updateUserById:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({
                message: 'Benutzername oder E-Mail bereits vergeben',
                error: error.message
            });
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Aktualisieren des Benutzers',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateUserById = updateUserById;
// Benutzerprofil aktualisieren
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary, normalWorkingHours, gender, phoneNumber } = req.body;
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = yield prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        username ? { username } : {},
                        email ? { email } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    NOT: {
                        id: userId
                    }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Benutzername oder E-Mail wird bereits verwendet'
                });
            }
        }
        // Validiere E-Mail-Format
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                message: 'Ungültiges E-Mail-Format'
            });
        }
        // Validiere gender-Wert falls vorhanden
        if (gender && !['male', 'female', 'other'].includes(gender)) {
            return res.status(400).json({
                message: 'Ungültiger gender-Wert. Erlaubt: male, female, other'
            });
        }
        // Logging für Debugging
        logger_1.logger.log('[updateProfile] phoneNumber received:', phoneNumber, 'Type:', typeof phoneNumber);
        logger_1.logger.log('[updateProfile] Request body size:', JSON.stringify(req.body).length, 'bytes');
        // Validiere Telefonnummer-Format falls vorhanden
        if (phoneNumber && phoneNumber.trim() !== '') {
            // Validiere Format: + gefolgt von 1-15 Ziffern
            const phoneRegex = /^\+[1-9]\d{1,14}$/;
            const normalizedPhone = phoneNumber.replace(/[\s-]/g, '');
            logger_1.logger.log('[updateProfile] Normalized phone for validation:', normalizedPhone);
            if (!phoneRegex.test(normalizedPhone)) {
                logger_1.logger.log('[updateProfile] Phone validation failed for:', normalizedPhone);
                return res.status(400).json({
                    message: 'Ungültiges Telefonnummer-Format. Format: +LändercodeNummer (z.B. +573001234567)'
                });
            }
        }
        // Normalisiere Telefonnummer (falls vorhanden)
        let normalizedPhoneNumber = null;
        if (phoneNumber !== undefined) {
            if (phoneNumber && phoneNumber.trim() !== '') {
                normalizedPhoneNumber = phoneNumber.replace(/[\s-]/g, '');
                if (!normalizedPhoneNumber.startsWith('+')) {
                    normalizedPhoneNumber = '+' + normalizedPhoneNumber;
                }
                logger_1.logger.log('[updateProfile] Final normalized phoneNumber:', normalizedPhoneNumber);
            }
            else {
                // Explizit auf null setzen, wenn phoneNumber leer oder null ist
                normalizedPhoneNumber = null;
                logger_1.logger.log('[updateProfile] phoneNumber set to null (empty string)');
            }
        }
        else {
            logger_1.logger.log('[updateProfile] phoneNumber is undefined, not updating');
        }
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (username && { username })), (email && { email })), (firstName && { firstName })), (lastName && { lastName })), (birthday && { birthday: new Date(birthday) })), (bankDetails && { bankDetails })), (contract !== undefined && { contract: contract || null })), (salary && { salary: parseFloat(salary) })), (normalWorkingHours && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) })), (gender !== undefined && { gender: gender || null })), (phoneNumber !== undefined && { phoneNumber: normalizedPhoneNumber }));
        logger_1.logger.log('[updateProfile] Update data:', JSON.stringify(updateData, null, 2));
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                birthday: true,
                bankDetails: true,
                contract: true,
                salary: true,
                normalWorkingHours: true,
                gender: true,
                phoneNumber: true,
                country: true,
                language: true,
                profileComplete: true,
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        // Cache-Invalidierung: Wenn User-Daten aktualisiert wurden, Caches invalidieren
        if ('language' in updateData && updateData.language !== undefined) {
            userLanguageCache_1.userLanguageCache.invalidate(userId);
        }
        // ✅ PERFORMANCE: UserCache invalidieren bei User-Update
        userCache_1.userCache.invalidate(userId);
        // Prüfe Profilvollständigkeit nach Update (username, email, language - country NICHT nötig)
        const isComplete = !!(updatedUser.username &&
            updatedUser.email &&
            updatedUser.language);
        // Update profileComplete, falls sich der Status geändert hat
        if (isComplete !== updatedUser.profileComplete) {
            yield prisma_1.prisma.user.update({
                where: { id: userId },
                data: { profileComplete: isComplete }
            });
            updatedUser.profileComplete = isComplete;
        }
        // Automatisch epsRequired setzen basierend auf contract-Typ
        if (contract !== undefined && contract !== null && contract !== '') {
            try {
                logger_1.logger.log(`[EPS Required] Contract geändert für User ${userId}: ${contract}`);
                const lifecycle = yield prisma_1.prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });
                if (lifecycle) {
                    // tiempo_completo → epsRequired = true
                    // Alle anderen → epsRequired = false
                    const epsRequired = contract === 'tiempo_completo';
                    logger_1.logger.log(`[EPS Required] Setze epsRequired auf ${epsRequired} für User ${userId} (contract: ${contract})`);
                    logger_1.logger.log(`[EPS Required] Aktueller Wert in DB: ${lifecycle.epsRequired}`);
                    const updated = yield prisma_1.prisma.employeeLifecycle.update({
                        where: { userId },
                        data: { epsRequired }
                    });
                    logger_1.logger.log(`[EPS Required] Nach Update - epsRequired in DB: ${updated.epsRequired}`);
                    // Wenn epsRequired von false auf true geändert wurde, aktualisiere bestehende "not_required"-Registrierung
                    if (epsRequired && !lifecycle.epsRequired) {
                        const existingRegistration = yield prisma_1.prisma.socialSecurityRegistration.findUnique({
                            where: {
                                lifecycleId_registrationType: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps'
                                }
                            }
                        });
                        if (existingRegistration && existingRegistration.status === 'not_required') {
                            // Ändere Status von "not_required" auf "pending"
                            yield prisma_1.prisma.socialSecurityRegistration.update({
                                where: {
                                    lifecycleId_registrationType: {
                                        lifecycleId: lifecycle.id,
                                        registrationType: 'eps'
                                    }
                                },
                                data: {
                                    status: 'pending'
                                }
                            });
                            logger_1.logger.log(`[EPS Required] EPS-Registrierung von "not_required" auf "pending" geändert für User ${userId}`);
                        }
                        else if (!existingRegistration) {
                            // Erstelle neue "pending"-Registrierung
                            yield prisma_1.prisma.socialSecurityRegistration.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps',
                                    status: 'pending'
                                }
                            });
                            logger_1.logger.log(`[EPS Required] Neue EPS-Registrierung mit Status "pending" erstellt für User ${userId}`);
                        }
                    }
                    // Erstelle Event für die Änderung
                    yield prisma_1.prisma.lifecycleEvent.create({
                        data: {
                            lifecycleId: lifecycle.id,
                            eventType: 'eps_required_updated',
                            eventData: {
                                contract,
                                epsRequired,
                                reason: `Automatisch gesetzt basierend auf Vertragstyp: ${contract}`
                            }
                        }
                    });
                    logger_1.logger.log(`[EPS Required] Erfolgreich aktualisiert für User ${userId}`);
                }
                else {
                    logger_1.logger.log(`[EPS Required] Kein Lifecycle gefunden für User ${userId}`);
                }
            }
            catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger_1.logger.error('Fehler beim Aktualisieren von epsRequired:', lifecycleError);
            }
        }
        else {
            logger_1.logger.log(`[EPS Required] Contract nicht gesetzt oder leer für User ${userId}`);
        }
        res.json(updatedUser);
    }
    catch (error) {
        logger_1.logger.error('Error in updateProfile:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({
                message: 'Benutzername oder E-Mail bereits vergeben',
                error: error.message
            });
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Aktualisieren des Profils',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateProfile = updateProfile;
// Prüfe Profilvollständigkeit
const isProfileComplete = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                username: true,
                email: true,
                country: true,
                language: true,
                profileComplete: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Prüfe Felder (username, email, language - country NICHT nötig)
        const missingFields = [];
        if (!user.username)
            missingFields.push('username');
        if (!user.email)
            missingFields.push('email');
        if (!user.language)
            missingFields.push('language');
        const complete = missingFields.length === 0;
        // Update profileComplete, falls noch nicht gesetzt
        if (complete !== user.profileComplete) {
            yield prisma_1.prisma.user.update({
                where: { id: userId },
                data: { profileComplete: complete }
            });
        }
        return res.json({
            complete,
            missingFields
        });
    }
    catch (error) {
        logger_1.logger.error('Error in isProfileComplete:', error);
        res.status(500).json({
            message: 'Fehler bei der Profilprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.isProfileComplete = isProfileComplete;
// Benutzerrollen aktualisieren
const updateUserRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        const { roleIds } = req.body;
        if (!Array.isArray(roleIds)) {
            return res.status(400).json({ message: 'roleIds muss ein Array sein' });
        }
        // Überprüfe, ob der Benutzer existiert
        const userExists = yield prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userExists) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Überprüfe, ob alle Rollen existieren und zur Organisation gehören
        const roleFilter = (0, organization_1.getDataIsolationFilter)(req, 'role');
        const existingRoles = yield prisma_1.prisma.role.findMany({
            where: Object.assign({ id: {
                    in: roleIds
                } }, roleFilter)
        });
        if (existingRoles.length !== roleIds.length) {
            return res.status(400).json({
                message: 'Eine oder mehrere Rollen wurden nicht gefunden oder gehören nicht zu Ihrer Organisation'
            });
        }
        // Aktuelle Benutzerrollen abrufen, um lastUsed-Status zu prüfen
        const currentUserRoles = yield prisma_1.prisma.userRole.findMany({
            where: { userId },
            orderBy: { role: { id: 'asc' } }
        });
        // Prüfen, welche Rolle aktuell als lastUsed markiert ist
        const currentLastUsedRole = currentUserRoles.find(ur => ur.lastUsed);
        // Lösche alle vorhandenen Benutzerrollen
        yield prisma_1.prisma.userRole.deleteMany({
            where: { userId }
        });
        // Erstelle neue Benutzerrollen
        const userRoles = yield Promise.all(roleIds.map((roleId) => __awaiter(void 0, void 0, void 0, function* () {
            return prisma_1.prisma.userRole.create({
                data: {
                    userId,
                    roleId,
                    lastUsed: false
                }
            });
        })));
        // Wenn Rollen zugewiesen wurden, setze lastUsed logisch
        if (roleIds.length > 0) {
            // Sortiere die erstellten UserRoles nach Rollen-ID
            const sortedUserRoles = [...userRoles].sort((a, b) => a.roleId - b.roleId);
            let roleToMarkAsLastUsed = sortedUserRoles[0]; // Standardmäßig die erste Rolle
            // Wenn zuvor eine Rolle als lastUsed markiert war, versuche diese zu finden
            if (currentLastUsedRole) {
                // Prüfe, ob die frühere lastUsed-Rolle noch in den neuen Rollen vorhanden ist
                const previousRoleStillExists = sortedUserRoles.find(ur => ur.roleId === currentLastUsedRole.roleId);
                if (previousRoleStillExists) {
                    // Wenn ja, behalte diese als lastUsed
                    roleToMarkAsLastUsed = previousRoleStillExists;
                }
                else {
                    // Wenn nicht, finde die nächsthöhere Rollen-ID
                    const higherRoles = sortedUserRoles.filter(ur => ur.roleId > currentLastUsedRole.roleId);
                    if (higherRoles.length > 0) {
                        // Wenn es höhere Rollen gibt, nimm die mit der niedrigsten ID
                        roleToMarkAsLastUsed = higherRoles[0];
                    }
                    // Sonst bleibt es bei der ersten Rolle
                }
            }
            // Markiere die ausgewählte Rolle als lastUsed
            yield prisma_1.prisma.userRole.update({
                where: {
                    id: roleToMarkAsLastUsed.id
                },
                data: {
                    lastUsed: true
                }
            });
        }
        // Benutzer mit aktualisierten Rollen abrufen
        const updatedUser = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        // Cache-Invalidierung: Wenn User-Rollen geändert wurden, Caches invalidieren
        userLanguageCache_1.userLanguageCache.invalidate(userId);
        // ✅ PERFORMANCE: UserCache invalidieren bei Rollen-Änderung
        userCache_1.userCache.invalidate(userId);
        // Benachrichtigung an den Benutzer senden, dessen Rollen aktualisiert wurden
        const userLang = yield (0, translations_1.getUserLanguage)(userId);
        logger_1.logger.log(`[updateUserRoles] User ${userId} Sprache: ${userLang}`);
        const userNotificationText = (0, translations_1.getUserNotificationText)(userLang, 'roles_updated', true);
        logger_1.logger.log(`[updateUserRoles] User Notification Text: ${userNotificationText.title} - ${userNotificationText.message}`);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: userId,
            title: userNotificationText.title,
            message: userNotificationText.message,
            type: client_1.NotificationType.user,
            relatedEntityId: userId,
            relatedEntityType: 'update'
        });
        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const admins = yield prisma_1.prisma.user.findMany({
            where: Object.assign(Object.assign({}, userFilter), { roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                }, id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                } })
        });
        for (const admin of admins) {
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            logger_1.logger.log(`[updateUserRoles] Admin ${admin.id} Sprache: ${adminLang}`);
            const adminNotificationText = (0, translations_1.getUserNotificationText)(adminLang, 'roles_updated', false, `${updatedUser.firstName} ${updatedUser.lastName}`);
            logger_1.logger.log(`[updateUserRoles] Admin Notification Text: ${adminNotificationText.title} - ${adminNotificationText.message}`);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: adminNotificationText.title,
                message: adminNotificationText.message,
                type: client_1.NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'update'
            });
        }
        res.json(updatedUser);
    }
    catch (error) {
        logger_1.logger.error('Error in updateUserRoles:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Benutzerrollen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUserRoles = updateUserRoles;
// Benutzer-Branches aktualisieren
const updateUserBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        const { branchIds } = req.body;
        if (!Array.isArray(branchIds)) {
            return res.status(400).json({ message: 'branchIds muss ein Array sein' });
        }
        // Überprüfe, ob der Benutzer existiert
        const userExists = yield prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userExists) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Überprüfe, ob alle Branches existieren und zur Organisation gehören
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        logger_1.logger.log('[updateUserBranches] Branch Filter:', branchFilter);
        logger_1.logger.log('[updateUserBranches] Requested branchIds:', branchIds);
        logger_1.logger.log('[updateUserBranches] Organization ID:', req.organizationId);
        const existingBranches = yield prisma_1.prisma.branch.findMany({
            where: Object.assign({ id: {
                    in: branchIds
                } }, branchFilter)
        });
        logger_1.logger.log('[updateUserBranches] Found branches:', existingBranches.map(b => ({ id: b.id, name: b.name, organizationId: b.organizationId })));
        logger_1.logger.log('[updateUserBranches] Expected:', branchIds.length, 'Found:', existingBranches.length);
        if (existingBranches.length !== branchIds.length) {
            // Prüfe welche Branches fehlen
            const foundIds = existingBranches.map(b => b.id);
            const missingIds = branchIds.filter(id => !foundIds.includes(id));
            // Prüfe ob die fehlenden Branches existieren, aber zur falschen Organisation gehören
            const allRequestedBranches = yield prisma_1.prisma.branch.findMany({
                where: {
                    id: { in: branchIds }
                },
                select: {
                    id: true,
                    name: true,
                    organizationId: true
                }
            });
            logger_1.logger.log('[updateUserBranches] All requested branches (without filter):', allRequestedBranches);
            return res.status(400).json({
                message: `Eine oder mehrere Niederlassungen wurden nicht gefunden oder gehören nicht zu Ihrer Organisation. Fehlende IDs: ${missingIds.join(', ')}`,
                missingIds,
                requestedBranchIds: branchIds,
                foundBranchIds: foundIds,
                organizationId: req.organizationId
            });
        }
        // Aktuelle Benutzer-Branches abrufen, um lastUsed-Status zu prüfen
        const currentUserBranches = yield prisma_1.prisma.usersBranches.findMany({
            where: { userId },
            orderBy: { branchId: 'asc' }
        });
        // Prüfen, welche Branch aktuell als lastUsed markiert ist
        const currentLastUsedBranch = currentUserBranches.find(ub => ub.lastUsed);
        // Lösche alle vorhandenen Benutzer-Branches
        yield prisma_1.prisma.usersBranches.deleteMany({
            where: { userId }
        });
        // Erstelle neue Benutzer-Branches
        const userBranches = yield Promise.all(branchIds.map((branchId) => __awaiter(void 0, void 0, void 0, function* () {
            return prisma_1.prisma.usersBranches.create({
                data: {
                    userId,
                    branchId,
                    lastUsed: false
                }
            });
        })));
        // Wenn Branches zugewiesen wurden, setze lastUsed logisch
        if (branchIds.length > 0) {
            // Sortiere die erstellten UserBranches nach Branch-ID
            const sortedUserBranches = [...userBranches].sort((a, b) => a.branchId - b.branchId);
            let branchToMarkAsLastUsed = sortedUserBranches[0]; // Standardmäßig die erste Branch
            // Wenn zuvor eine Branch als lastUsed markiert war, versuche diese zu finden
            if (currentLastUsedBranch) {
                // Prüfe, ob die frühere lastUsed-Branch noch in den neuen Branches vorhanden ist
                const previousBranchStillExists = sortedUserBranches.find(ub => ub.branchId === currentLastUsedBranch.branchId);
                if (previousBranchStillExists) {
                    // Wenn ja, behalte diese als lastUsed
                    branchToMarkAsLastUsed = previousBranchStillExists;
                }
                else {
                    // Wenn nicht, finde die nächsthöhere Branch-ID
                    const higherBranches = sortedUserBranches.filter(ub => ub.branchId > currentLastUsedBranch.branchId);
                    if (higherBranches.length > 0) {
                        // Wenn es höhere Branches gibt, nimm die mit der niedrigsten ID
                        branchToMarkAsLastUsed = higherBranches[0];
                    }
                    // Sonst bleibt es bei der ersten Branch
                }
            }
            // Markiere die ausgewählte Branch als lastUsed
            yield prisma_1.prisma.usersBranches.update({
                where: {
                    id: branchToMarkAsLastUsed.id
                },
                data: {
                    lastUsed: true
                }
            });
        }
        // Benutzer mit aktualisierten Branches abrufen
        const updatedUser = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                branches: {
                    include: {
                        branch: true
                    }
                }
            }
        });
        // Benachrichtigung an den Benutzer senden, dessen Branches aktualisiert wurden
        const userLang = yield (0, translations_1.getUserLanguage)(userId);
        const userNotificationText = (0, translations_1.getUserNotificationText)(userLang, 'branches_updated', true);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: userId,
            title: userNotificationText.title,
            message: userNotificationText.message,
            type: client_1.NotificationType.user,
            relatedEntityId: userId,
            relatedEntityType: 'update'
        });
        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const admins = yield prisma_1.prisma.user.findMany({
            where: Object.assign(Object.assign({}, userFilter), { roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                }, id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                } })
        });
        for (const admin of admins) {
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            const adminNotificationText = (0, translations_1.getUserNotificationText)(adminLang, 'branches_updated', false, `${updatedUser.firstName} ${updatedUser.lastName}`);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: adminNotificationText.title,
                message: adminNotificationText.message,
                type: client_1.NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'update'
            });
        }
        res.json(updatedUser);
    }
    catch (error) {
        logger_1.logger.error('Error in updateUserBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Benutzer-Niederlassungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUserBranches = updateUserBranches;
// Benutzereinstellungen aktualisieren
const updateUserSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfen, ob es bereits Einstellungen gibt
        let settings = yield prisma_1.prisma.settings.findUnique({
            where: { userId }
        });
        if (settings) {
            // Einstellungen aktualisieren
            settings = yield prisma_1.prisma.settings.update({
                where: { userId },
                data: Object.assign(Object.assign({}, (req.body.darkMode !== undefined && { darkMode: req.body.darkMode })), (req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed }))
            });
        }
        else {
            // Neue Einstellungen erstellen
            settings = yield prisma_1.prisma.settings.create({
                data: Object.assign(Object.assign({ userId }, (req.body.darkMode !== undefined && { darkMode: req.body.darkMode })), (req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed }))
            });
        }
        res.json(settings);
    }
    catch (error) {
        logger_1.logger.error('Error in updateUserSettings:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Benutzereinstellungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUserSettings = updateUserSettings;
// Aktive Sprache für User bestimmen
const getUserActiveLanguage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // 1. Prüfe User.language (falls gesetzt)
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                language: true,
                roles: {
                    where: {
                        lastUsed: true
                    },
                    include: {
                        role: {
                            include: {
                                organization: {
                                    select: {
                                        settings: true
                                    }
                                }
                            }
                        }
                    },
                    take: 1
                }
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        let activeLanguage = null;
        // Priorität 1: User-Sprache (falls gesetzt und nicht leer)
        if (user.language && user.language.trim() !== '') {
            activeLanguage = user.language;
        }
        else {
            // Priorität 2: Organisation-Sprache (falls vorhanden)
            const userRole = user.roles[0];
            if ((_a = userRole === null || userRole === void 0 ? void 0 : userRole.role) === null || _a === void 0 ? void 0 : _a.organization) {
                const orgSettings = userRole.role.organization.settings;
                if (orgSettings === null || orgSettings === void 0 ? void 0 : orgSettings.language) {
                    activeLanguage = orgSettings.language;
                }
            }
        }
        // Priorität 3: Fallback
        if (!activeLanguage) {
            activeLanguage = 'de'; // Standard-Fallback
        }
        res.json({ language: activeLanguage });
    }
    catch (error) {
        logger_1.logger.error('Error in getUserActiveLanguage:', error);
        res.status(500).json({
            message: 'Fehler beim Bestimmen der aktiven Sprache',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getUserActiveLanguage = getUserActiveLanguage;
const updateInvoiceSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        logger_1.logger.log('DEBUG updateInvoiceSettings:', {
            userId: req.userId,
            userIdType: typeof req.userId,
            userObject: (_a = req.user) === null || _a === void 0 ? void 0 : _a.id,
            body: req.body
        });
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            logger_1.logger.error('ERROR: userId is NaN', {
                rawUserId: req.userId,
                userObjectId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id
            });
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // Validierung für monthlyReportDay
        if (req.body.monthlyReportDay !== undefined) {
            const day = req.body.monthlyReportDay;
            if (day < 1 || day > 28) {
                return res.status(400).json({ message: 'Abrechnungstag muss zwischen 1 und 28 liegen' });
            }
        }
        // Prüfen, ob es bereits Invoice-Einstellungen gibt
        let invoiceSettings = yield prisma_1.prisma.invoiceSettings.findUnique({
            where: { userId }
        });
        if (invoiceSettings) {
            // Invoice-Einstellungen aktualisieren
            invoiceSettings = yield prisma_1.prisma.invoiceSettings.update({
                where: { userId },
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (req.body.monthlyReportEnabled !== undefined && { monthlyReportEnabled: req.body.monthlyReportEnabled })), (req.body.monthlyReportDay !== undefined && { monthlyReportDay: req.body.monthlyReportDay })), (req.body.monthlyReportRecipient !== undefined && { monthlyReportRecipient: req.body.monthlyReportRecipient })), (req.body.companyName !== undefined && { companyName: req.body.companyName })), (req.body.companyAddress !== undefined && { companyAddress: req.body.companyAddress })), (req.body.companyZip !== undefined && { companyZip: req.body.companyZip })), (req.body.companyCity !== undefined && { companyCity: req.body.companyCity })), (req.body.companyCountry !== undefined && { companyCountry: req.body.companyCountry })), (req.body.companyPhone !== undefined && { companyPhone: req.body.companyPhone })), (req.body.companyEmail !== undefined && { companyEmail: req.body.companyEmail })), (req.body.companyWebsite !== undefined && { companyWebsite: req.body.companyWebsite })), (req.body.vatNumber !== undefined && { vatNumber: req.body.vatNumber })), (req.body.iban !== undefined && { iban: req.body.iban })), (req.body.bankName !== undefined && { bankName: req.body.bankName })), (req.body.defaultHourlyRate !== undefined && { defaultHourlyRate: req.body.defaultHourlyRate })), (req.body.defaultVatRate !== undefined && { defaultVatRate: req.body.defaultVatRate })), (req.body.invoicePrefix !== undefined && { invoicePrefix: req.body.invoicePrefix })), (req.body.nextInvoiceNumber !== undefined && { nextInvoiceNumber: req.body.nextInvoiceNumber })), (req.body.footerText !== undefined && { footerText: req.body.footerText }))
            });
        }
        else {
            // Neue Invoice-Einstellungen erstellen mit Defaults
            invoiceSettings = yield prisma_1.prisma.invoiceSettings.create({
                data: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ userId, companyName: req.body.companyName || '', companyAddress: req.body.companyAddress || '', companyZip: req.body.companyZip || '', companyCity: req.body.companyCity || '', companyCountry: req.body.companyCountry || 'CH', iban: req.body.iban || '', defaultHourlyRate: req.body.defaultHourlyRate || '0' }, (req.body.monthlyReportEnabled !== undefined && { monthlyReportEnabled: req.body.monthlyReportEnabled })), (req.body.monthlyReportDay !== undefined && { monthlyReportDay: req.body.monthlyReportDay })), (req.body.monthlyReportRecipient !== undefined && { monthlyReportRecipient: req.body.monthlyReportRecipient })), (req.body.companyPhone !== undefined && { companyPhone: req.body.companyPhone })), (req.body.companyEmail !== undefined && { companyEmail: req.body.companyEmail })), (req.body.companyWebsite !== undefined && { companyWebsite: req.body.companyWebsite })), (req.body.vatNumber !== undefined && { vatNumber: req.body.vatNumber })), (req.body.bankName !== undefined && { bankName: req.body.bankName })), (req.body.defaultVatRate !== undefined && { defaultVatRate: req.body.defaultVatRate })), (req.body.invoicePrefix !== undefined && { invoicePrefix: req.body.invoicePrefix })), (req.body.nextInvoiceNumber !== undefined && { nextInvoiceNumber: req.body.nextInvoiceNumber })), (req.body.footerText !== undefined && { footerText: req.body.footerText }))
            });
        }
        res.json(invoiceSettings);
    }
    catch (error) {
        logger_1.logger.error('Error in updateInvoiceSettings:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Invoice-Einstellungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateInvoiceSettings = updateInvoiceSettings;
// Aktive Rolle eines Benutzers wechseln
const switchUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Verwende entweder req.user?.id oder req.userId, falls verfügbar
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || parseInt(req.userId, 10);
        const { roleId } = req.body;
        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        if (isNaN(roleId) || roleId <= 0) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        // Hole die neue Rolle mit Organisation
        const newRole = yield prisma_1.prisma.role.findUnique({
            where: { id: roleId },
            select: { id: true, organizationId: true }
        });
        if (!newRole) {
            return res.status(404).json({ message: 'Rolle nicht gefunden' });
        }
        // Transaktion starten - alle Prisma-Operationen innerhalb der Transaktion
        yield prisma_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Prüfen, ob die Rolle dem Benutzer zugewiesen ist
            const userRole = yield tx.userRole.findFirst({
                where: { userId, roleId }
            });
            if (!userRole) {
                throw new Error('Diese Rolle ist dem Benutzer nicht zugewiesen');
            }
            // Alle Rollen des Benutzers auf lastUsed=false setzen
            yield tx.userRole.updateMany({
                where: { userId },
                data: { lastUsed: false }
            });
            // Die ausgewählte Rolle auf lastUsed=true setzen
            yield tx.userRole.update({
                where: { id: userRole.id },
                data: { lastUsed: true }
            });
            // ✅ Branch für neue Organisation aktivieren
            // Branches sind pro Organisation - bei Org-Wechsel muss die Branch der neuen Org aktiviert werden
            if (newRole.organizationId) {
                // Alle Branches auf lastUsed=false
                yield tx.usersBranches.updateMany({
                    where: { userId },
                    data: { lastUsed: false }
                });
                // Suche zuletzt aktualisierte Branch der neuen Organisation (= zuletzt aktiv gewesen)
                const existingBranch = yield tx.usersBranches.findFirst({
                    where: {
                        userId,
                        branch: { organizationId: newRole.organizationId }
                    },
                    orderBy: { updatedAt: 'desc' }
                });
                if (existingBranch) {
                    yield tx.usersBranches.update({
                        where: { id: existingBranch.id },
                        data: { lastUsed: true }
                    });
                }
                // Falls User keine Branch der neuen Org hat, bleibt keine aktiv (kein Fehler)
            }
        }));
        // ✅ PERFORMANCE: Caches invalidieren bei Rollen-Wechsel
        userCache_1.userCache.invalidate(userId);
        const { organizationCache } = yield Promise.resolve().then(() => __importStar(require('../utils/organizationCache')));
        organizationCache.invalidate(userId);
        // ✅ BranchCache invalidieren (Branch hat sich geändert)
        const { branchCache } = yield Promise.resolve().then(() => __importStar(require('../services/branchCache')));
        branchCache.clear();
        // Benutzer mit aktualisierten Rollen zurückgeben
        const updatedUser = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true,
                                organization: {
                                    select: {
                                        id: true,
                                        name: true,
                                        displayName: true,
                                        logo: true
                                    }
                                }
                            }
                        }
                    }
                },
                settings: true
            }
        });
        if (!updatedUser) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
        const userWithOptimizedLogo = Object.assign(Object.assign({}, updatedUser), { roles: updatedUser.roles.map(roleEntry => (Object.assign(Object.assign({}, roleEntry), { role: Object.assign(Object.assign({}, roleEntry.role), { organization: roleEntry.role.organization ? Object.assign(Object.assign({}, roleEntry.role.organization), { 
                        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                        logo: roleEntry.lastUsed
                            ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                            : null // ✅ Inaktive Roles: Logo = null (spart Memory)
                     }) : null }) }))) });
        return res.json(userWithOptimizedLogo);
    }
    catch (error) {
        logger_1.logger.error('Error in switchUserRole:', error);
        // Spezielle Behandlung für "Rolle nicht zugewiesen" Fehler
        if (error instanceof Error && error.message === 'Diese Rolle ist dem Benutzer nicht zugewiesen') {
            return res.status(404).json({
                message: error.message
            });
        }
        res.status(500).json({
            message: 'Fehler beim Wechseln der Benutzerrolle',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.switchUserRole = switchUserRole;
// Neuen Benutzer erstellen (für Admin-Bereich)
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const organizationId = req.organizationId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        if (!organizationId) {
            return res.status(403).json({ message: 'Nur Administratoren einer Organisation können Benutzer erstellen' });
        }
        // Prüfe ob der aktuelle Benutzer Admin der Organisation ist
        const currentUser = yield prisma_1.prisma.user.findUnique({
            where: { id: Number(userId) },
            include: {
                roles: {
                    where: {
                        lastUsed: true
                    },
                    include: {
                        role: true
                    }
                }
            }
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        const activeRole = currentUser.roles.find(r => r.lastUsed);
        if (!activeRole || activeRole.role.name !== 'Admin' || activeRole.role.organizationId !== organizationId) {
            return res.status(403).json({ message: 'Nur Administratoren einer Organisation können Benutzer erstellen' });
        }
        const { email, password, firstName, lastName } = req.body;
        // Validiere erforderliche Felder (nur die minimalen)
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                message: 'Email, Passwort, Vorname und Nachname sind erforderlich'
            });
        }
        // Validiere E-Mail-Format
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                message: 'Ungültiges E-Mail-Format'
            });
        }
        // Email als Username verwenden
        const username = email;
        // Überprüfe, ob Benutzername oder E-Mail bereits existieren
        const existingUser = yield prisma_1.prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({
                message: 'Benutzername oder E-Mail wird bereits verwendet'
            });
        }
        // Hash das Passwort
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Finde die "Hamburger"-Rolle der Organisation (Standard-Rolle für neue Benutzer)
        const hamburgerRole = yield prisma_1.prisma.role.findFirst({
            where: {
                organizationId: organizationId,
                name: 'Hamburger'
            }
        });
        // Falls keine "Hamburger"-Rolle existiert, suche nach "User"-Rolle
        let roleToAssign = hamburgerRole;
        if (!roleToAssign) {
            roleToAssign = yield prisma_1.prisma.role.findFirst({
                where: {
                    organizationId: organizationId,
                    name: 'User'
                }
            });
        }
        // Falls immer noch keine Rolle gefunden, nehme die erste verfügbare Rolle der Organisation (außer Admin)
        if (!roleToAssign) {
            roleToAssign = yield prisma_1.prisma.role.findFirst({
                where: {
                    organizationId: organizationId,
                    name: {
                        not: 'Admin'
                    }
                },
                orderBy: {
                    id: 'asc'
                }
            });
        }
        if (!roleToAssign) {
            return res.status(500).json({
                message: 'Keine Rolle für die Organisation gefunden'
            });
        }
        // Erstelle den Benutzer
        const user = yield prisma_1.prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                firstName,
                lastName,
                roles: {
                    create: {
                        role: {
                            connect: { id: roleToAssign.id }
                        },
                        lastUsed: true
                    }
                },
                settings: {
                    create: {
                        darkMode: false
                    }
                }
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        // Benachrichtigung für Administratoren der Organisation senden
        const admins = yield prisma_1.prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: organizationId
                        }
                    }
                }
            }
        });
        for (const admin of admins) {
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            const notificationText = (0, translations_1.getUserNotificationText)(adminLang, 'created', false, `${firstName} ${lastName}`);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.user,
                relatedEntityId: user.id,
                relatedEntityType: 'create'
            });
        }
        // Automatisch Lebenszyklus erstellen (für Organisationen)
        if (organizationId) {
            try {
                yield lifecycleService_1.LifecycleService.createLifecycle(user.id, organizationId);
            }
            catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger_1.logger.error('Fehler beim Erstellen des Lebenszyklus:', lifecycleError);
            }
        }
        // Entferne Passwort aus der Response
        const userResponse = Object.assign(Object.assign({}, user), { password: undefined });
        res.status(201).json(userResponse);
    }
    catch (error) {
        logger_1.logger.error('Error in createUser:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createUser = createUser;
// Benutzer aktualisieren (für Admin-Bereich)
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // Aktuellen Benutzer abrufen
        const currentUser = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: true
            }
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary, active } = req.body;
        logger_1.logger.log('Updating user with data:', req.body);
        logger_1.logger.log('Active value:', active, 'Type:', typeof active);
        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = yield prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        username ? { username } : {},
                        email ? { email } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    NOT: {
                        id: userId
                    }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Benutzername oder E-Mail wird bereits verwendet'
                });
            }
        }
        // Aktualisiere den Benutzer
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (username && { username })), (email && { email })), (firstName && { firstName })), (lastName && { lastName })), (birthday && { birthday: new Date(birthday) })), (bankDetails && { bankDetails })), (contract !== undefined && { contract: contract || null })), (salary && { salary: parseFloat(salary.toString()) })), (active !== undefined && active !== null && { active: Boolean(active) }));
        logger_1.logger.log('Update data to be applied:', updateData);
        const updatedUser = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        // Cache-Invalidierung: Wenn User-Daten aktualisiert wurden, Caches invalidieren
        if ('language' in updateData && updateData.language !== undefined) {
            userLanguageCache_1.userLanguageCache.invalidate(userId);
        }
        // ✅ PERFORMANCE: UserCache invalidieren bei User-Update
        userCache_1.userCache.invalidate(userId);
        // ✅ FIX: FilterListCache invalidieren wenn User aktiviert/deaktiviert wird (betrifft User-Filter-Gruppen)
        if ('active' in updateData && updateData.active !== undefined) {
            // Wenn User-Status geändert wird, müssen alle Filter-Gruppen-Caches invalidiert werden
            // (da User-Filter-Gruppen nur aktive User zeigen sollen)
            filterListCache_1.filterListCache.clear();
        }
        // Automatisch epsRequired setzen basierend auf contract-Typ
        if (contract !== undefined && contract !== null && contract !== '') {
            try {
                logger_1.logger.log(`[EPS Required] Contract geändert für User ${userId}: ${contract}`);
                const lifecycle = yield prisma_1.prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });
                if (lifecycle) {
                    // tiempo_completo → epsRequired = true
                    // Alle anderen → epsRequired = false
                    const epsRequired = contract === 'tiempo_completo';
                    logger_1.logger.log(`[EPS Required] Setze epsRequired auf ${epsRequired} für User ${userId} (contract: ${contract})`);
                    logger_1.logger.log(`[EPS Required] Aktueller Wert in DB: ${lifecycle.epsRequired}`);
                    const updated = yield prisma_1.prisma.employeeLifecycle.update({
                        where: { userId },
                        data: { epsRequired }
                    });
                    logger_1.logger.log(`[EPS Required] Nach Update - epsRequired in DB: ${updated.epsRequired}`);
                    // Wenn epsRequired von false auf true geändert wurde, aktualisiere bestehende "not_required"-Registrierung
                    if (epsRequired && !lifecycle.epsRequired) {
                        const existingRegistration = yield prisma_1.prisma.socialSecurityRegistration.findUnique({
                            where: {
                                lifecycleId_registrationType: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps'
                                }
                            }
                        });
                        if (existingRegistration && existingRegistration.status === 'not_required') {
                            // Ändere Status von "not_required" auf "pending"
                            yield prisma_1.prisma.socialSecurityRegistration.update({
                                where: {
                                    lifecycleId_registrationType: {
                                        lifecycleId: lifecycle.id,
                                        registrationType: 'eps'
                                    }
                                },
                                data: {
                                    status: 'pending'
                                }
                            });
                            logger_1.logger.log(`[EPS Required] EPS-Registrierung von "not_required" auf "pending" geändert für User ${userId}`);
                        }
                        else if (!existingRegistration) {
                            // Erstelle neue "pending"-Registrierung
                            yield prisma_1.prisma.socialSecurityRegistration.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps',
                                    status: 'pending'
                                }
                            });
                            logger_1.logger.log(`[EPS Required] Neue EPS-Registrierung mit Status "pending" erstellt für User ${userId}`);
                        }
                    }
                    // Erstelle Event für die Änderung
                    yield prisma_1.prisma.lifecycleEvent.create({
                        data: {
                            lifecycleId: lifecycle.id,
                            eventType: 'eps_required_updated',
                            eventData: {
                                contract,
                                epsRequired,
                                reason: `Automatisch gesetzt basierend auf Vertragstyp: ${contract}`
                            }
                        }
                    });
                    logger_1.logger.log(`[EPS Required] Erfolgreich aktualisiert für User ${userId}`);
                }
                else {
                    logger_1.logger.log(`[EPS Required] Kein Lifecycle gefunden für User ${userId}`);
                }
            }
            catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger_1.logger.error('Fehler beim Aktualisieren von epsRequired:', lifecycleError);
            }
        }
        else {
            logger_1.logger.log(`[EPS Required] Contract nicht gesetzt oder leer für User ${userId}`);
        }
        // Benachrichtigung für den aktualisierten Benutzer senden
        const userLang = yield (0, translations_1.getUserLanguage)(updatedUser.id);
        const userNotificationText = (0, translations_1.getUserNotificationText)(userLang, 'updated', true);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: updatedUser.id,
            title: userNotificationText.title,
            message: userNotificationText.message,
            type: client_1.NotificationType.user,
            relatedEntityId: updatedUser.id,
            relatedEntityType: 'update'
        });
        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const admins = yield prisma_1.prisma.user.findMany({
            where: Object.assign(Object.assign({}, userFilter), { roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                }, id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                } })
        });
        for (const admin of admins) {
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            const notificationText = (0, translations_1.getUserNotificationText)(adminLang, 'updated', false, `${updatedUser.firstName} ${updatedUser.lastName}`);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.user,
                relatedEntityId: updatedUser.id,
                relatedEntityType: 'update'
            });
        }
        res.json(updatedUser);
    }
    catch (error) {
        logger_1.logger.error('Error in updateUser:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUser = updateUser;
// Benutzer löschen
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // Benutzer vor dem Löschen abrufen
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Lösche alle verknüpften Daten
        yield prisma_1.prisma.$transaction([
            // Organisation-bezogene Abhängigkeiten löschen
            prisma_1.prisma.organizationJoinRequest.deleteMany({
                where: { requesterId: userId }
            }),
            // processedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)
            prisma_1.prisma.organizationInvitation.deleteMany({
                where: { invitedBy: userId }
            }),
            // acceptedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)
            // Standard-Abhängigkeiten löschen
            prisma_1.prisma.userRole.deleteMany({
                where: { userId }
            }),
            prisma_1.prisma.usersBranches.deleteMany({
                where: { userId }
            }),
            prisma_1.prisma.settings.deleteMany({
                where: { userId }
            }),
            prisma_1.prisma.notification.deleteMany({
                where: { userId }
            }),
            prisma_1.prisma.userNotificationSettings.deleteMany({
                where: { userId }
            }),
            prisma_1.prisma.user.delete({
                where: { id: userId }
            })
        ]);
        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const admins = yield prisma_1.prisma.user.findMany({
            where: Object.assign(Object.assign({}, userFilter), { roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                } })
        });
        for (const admin of admins) {
            const adminLang = yield (0, translations_1.getUserLanguage)(admin.id);
            const notificationText = (0, translations_1.getUserNotificationText)(adminLang, 'deleted', false, `${user.firstName} ${user.lastName}`);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'delete'
            });
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Error in deleteUser:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteUser = deleteUser;
// ============================================
// ONBOARDING SYSTEM CONTROLLERS
// ============================================
// Onboarding-Status abrufen
const getOnboardingStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        // ✅ PERFORMANCE: Verwende OnboardingCache statt DB-Query
        const { onboardingCache } = yield Promise.resolve().then(() => __importStar(require('../services/onboardingCache')));
        const cachedStatus = yield onboardingCache.get(userId);
        if (cachedStatus) {
            return res.json(cachedStatus);
        }
        // Fallback: DB-Query (sollte nicht nötig sein)
        return res.status(500).json({
            message: 'Fehler beim Abrufen des Onboarding-Status',
            error: 'Cache-Fehler'
        });
    }
    catch (error) {
        logger_1.logger.error('Error in getOnboardingStatus:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Onboarding-Status',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOnboardingStatus = getOnboardingStatus;
// Onboarding-Fortschritt aktualisieren
const updateOnboardingProgress = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { currentStep, completedSteps, dismissedSteps } = req.body;
        if (typeof currentStep !== 'number' || !Array.isArray(completedSteps)) {
            return res.status(400).json({ message: 'Ungültige Fortschrittsdaten' });
        }
        const user = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                onboardingProgress: {
                    currentStep,
                    completedSteps,
                    dismissedSteps: dismissedSteps || []
                },
                onboardingStartedAt: req.body.onboardingStartedAt ? new Date(req.body.onboardingStartedAt) : undefined
            }
        });
        // ✅ PERFORMANCE: Cache invalidieren nach Onboarding-Status-Änderung
        const { onboardingCache } = yield Promise.resolve().then(() => __importStar(require('../services/onboardingCache')));
        yield onboardingCache.invalidate(userId);
        res.json({
            message: 'Onboarding-Fortschritt aktualisiert',
            onboardingProgress: user.onboardingProgress
        });
    }
    catch (error) {
        logger_1.logger.error('Error in updateOnboardingProgress:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Onboarding-Fortschritts',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateOnboardingProgress = updateOnboardingProgress;
// Onboarding als abgeschlossen markieren
const completeOnboarding = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const user = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                onboardingCompleted: true,
                onboardingCompletedAt: new Date()
            }
        });
        // ✅ PERFORMANCE: Cache invalidieren nach Onboarding-Status-Änderung
        const { onboardingCache } = yield Promise.resolve().then(() => __importStar(require('../services/onboardingCache')));
        yield onboardingCache.invalidate(userId);
        res.json({
            message: 'Onboarding abgeschlossen',
            onboardingCompleted: user.onboardingCompleted,
            onboardingCompletedAt: user.onboardingCompletedAt
        });
    }
    catch (error) {
        logger_1.logger.error('Error in completeOnboarding:', error);
        res.status(500).json({
            message: 'Fehler beim Abschließen des Onboardings',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.completeOnboarding = completeOnboarding;
// Onboarding-Event tracken (Analytics)
const trackOnboardingEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const { stepId, stepTitle, action, duration } = req.body;
        if (!stepId || !stepTitle || !action) {
            return res.status(400).json({ message: 'Fehlende Event-Daten' });
        }
        const validActions = ['started', 'completed', 'skipped', 'cancelled'];
        if (!validActions.includes(action)) {
            return res.status(400).json({ message: 'Ungültige Aktion' });
        }
        const event = yield prisma_1.prisma.onboardingEvent.create({
            data: {
                userId,
                stepId,
                stepTitle,
                action,
                duration: duration || null
            }
        });
        res.json({
            message: 'Onboarding-Event gespeichert',
            event
        });
    }
    catch (error) {
        logger_1.logger.error('Error in trackOnboardingEvent:', error);
        res.status(500).json({
            message: 'Fehler beim Speichern des Onboarding-Events',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.trackOnboardingEvent = trackOnboardingEvent;
// Onboarding zurücksetzen (für Settings)
const resetOnboarding = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const user = yield prisma_1.prisma.user.update({
            where: { id: userId },
            data: {
                onboardingCompleted: false,
                onboardingProgress: null,
                onboardingStartedAt: null,
                onboardingCompletedAt: null
            }
        });
        // ✅ PERFORMANCE: Cache invalidieren nach Onboarding-Status-Änderung
        const { onboardingCache } = yield Promise.resolve().then(() => __importStar(require('../services/onboardingCache')));
        yield onboardingCache.invalidate(userId);
        res.json({
            message: 'Onboarding zurückgesetzt',
            onboardingCompleted: user.onboardingCompleted
        });
    }
    catch (error) {
        logger_1.logger.error('Error in resetOnboarding:', error);
        res.status(500).json({
            message: 'Fehler beim Zurücksetzen des Onboardings',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.resetOnboarding = resetOnboarding;
// Onboarding-Analytics abrufen (nur für Admins)
const getOnboardingAnalytics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);
        // Prüfe ob Admin
        const role = yield prisma_1.prisma.role.findUnique({
            where: { id: roleId }
        });
        if (!role || role.name.toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung' });
        }
        const events = yield prisma_1.prisma.onboardingEvent.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Gruppiere nach User
        const analytics = events.reduce((acc, event) => {
            const userId = event.userId;
            if (!acc[userId]) {
                acc[userId] = {
                    user: event.user,
                    steps: [],
                    completedSteps: 0,
                    skippedSteps: 0,
                    totalDuration: 0
                };
            }
            acc[userId].steps.push(event);
            if (event.action === 'completed') {
                acc[userId].completedSteps++;
                if (event.duration) {
                    acc[userId].totalDuration += event.duration;
                }
            }
            else if (event.action === 'skipped') {
                acc[userId].skippedSteps++;
            }
            return acc;
        }, {});
        res.json({
            analytics: Object.values(analytics)
        });
    }
    catch (error) {
        logger_1.logger.error('Error in getOnboardingAnalytics:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Onboarding-Analytics',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getOnboardingAnalytics = getOnboardingAnalytics;
// Debug-Endpoint: Zeigt alle relevanten Informationen für den aktuellen User
const debugUserBranches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // 1. User-Informationen
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true
            }
        });
        // 2. Alle Branches der Organisation
        const branchFilter = (0, organization_1.getDataIsolationFilter)(req, 'branch');
        const allOrgBranches = yield prisma_1.prisma.branch.findMany({
            where: branchFilter,
            select: {
                id: true,
                name: true,
                organizationId: true
            },
            orderBy: { name: 'asc' }
        });
        // 3. User-Branches (zugewiesene Branches)
        const userBranches = yield prisma_1.prisma.usersBranches.findMany({
            where: { userId },
            include: {
                branch: {
                    select: {
                        id: true,
                        name: true,
                        organizationId: true
                    }
                }
            },
            orderBy: { branchId: 'asc' }
        });
        // 4. Aktive Rolle
        const activeRole = yield prisma_1.prisma.userRole.findFirst({
            where: {
                userId,
                lastUsed: true
            },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        allBranches: true,
                        organizationId: true,
                        branches: {
                            include: {
                                branch: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        // 5. Alle Rollen des Users
        const userRoles = yield prisma_1.prisma.userRole.findMany({
            where: { userId },
            include: {
                role: {
                    select: {
                        id: true,
                        name: true,
                        allBranches: true,
                        organizationId: true
                    }
                }
            }
        });
        // 6. Prüfe für jede Branch, ob sie für die aktive Rolle verfügbar ist
        const branchAvailability = allOrgBranches.map(branch => {
            if (!activeRole) {
                return {
                    branch: { id: branch.id, name: branch.name },
                    isAssignedToUser: userBranches.some(ub => ub.branchId === branch.id),
                    isAvailableForActiveRole: null,
                    reason: 'Keine aktive Rolle'
                };
            }
            const role = activeRole.role;
            let isAvailable = false;
            let reason = '';
            if (role.allBranches) {
                isAvailable = true;
                reason = 'Rolle gilt für alle Branches (allBranches = true)';
            }
            else {
                const roleBranch = role.branches.find(rb => rb.branch.id === branch.id);
                if (roleBranch) {
                    isAvailable = true;
                    reason = 'Rolle ist für diese Branch zugewiesen (RoleBranch Eintrag)';
                }
                else {
                    isAvailable = false;
                    reason = 'Rolle ist nicht für diese Branch zugewiesen (kein RoleBranch Eintrag)';
                }
            }
            return {
                branch: { id: branch.id, name: branch.name },
                isAssignedToUser: userBranches.some(ub => ub.branchId === branch.id),
                isAvailableForActiveRole: isAvailable,
                reason
            };
        });
        res.json({
            user,
            organizationId: req.organizationId,
            allOrgBranches,
            userBranches: userBranches.map(ub => ({
                branchId: ub.branchId,
                branchName: ub.branch.name,
                lastUsed: ub.lastUsed
            })),
            activeRole: activeRole ? {
                roleId: activeRole.role.id,
                roleName: activeRole.role.name,
                allBranches: activeRole.role.allBranches,
                organizationId: activeRole.role.organizationId,
                roleBranches: activeRole.role.branches.map(rb => ({
                    branchId: rb.branch.id,
                    branchName: rb.branch.name
                }))
            } : null,
            allUserRoles: userRoles.map(ur => ({
                roleId: ur.role.id,
                roleName: ur.role.name,
                allBranches: ur.role.allBranches,
                lastUsed: ur.lastUsed
            })),
            branchAvailability,
            summary: {
                totalOrgBranches: allOrgBranches.length,
                assignedBranches: userBranches.length,
                activeRoleName: (activeRole === null || activeRole === void 0 ? void 0 : activeRole.role.name) || 'Keine',
                branchesVisibleInHeader: branchAvailability.filter(ba => ba.isAssignedToUser && (ba.isAvailableForActiveRole === true || ba.isAvailableForActiveRole === null)).length
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error in debugUserBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Debug-Abruf',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.debugUserBranches = debugUserBranches;
//# sourceMappingURL=userController.js.map