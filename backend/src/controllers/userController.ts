// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcrypt';
import { createNotificationIfEnabled } from './notificationController';
import { getUserLanguage, getUserNotificationText } from '../utils/translations';
import { logger } from '../utils/logger';
import { organizationMiddleware, getUserOrganizationFilter, getDataIsolationFilter } from '../middleware/organization';
import { LifecycleService } from '../services/lifecycleService';
import { userLanguageCache } from '../services/userLanguageCache';
import { userCache } from '../services/userCache';
import { filterListCache } from '../services/filterListCache';

interface AuthenticatedRequest extends Request {
    userId: string;
    roleId: string;
}

interface UpdateProfileRequest {
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    bankDetails?: string;
    contract?: string;
    salary?: string;
    normalWorkingHours?: number;
    gender?: string | null; // "male", "female", "other", oder null
    phoneNumber?: string | null; // WhatsApp-Telefonnummer (mit Ländercode)
}

// Interface für die Aktualisierung der Benutzereinstellungen
interface UpdateUserSettingsRequest {
    darkMode?: boolean;
    sidebarCollapsed?: boolean;
}

interface UpdateInvoiceSettingsRequest {
    monthlyReportEnabled?: boolean;
    monthlyReportDay?: number;
    monthlyReportRecipient?: string;
    companyName?: string;
    companyAddress?: string;
    companyZip?: string;
    companyCity?: string;
    companyCountry?: string;
    companyPhone?: string;
    companyEmail?: string;
    companyWebsite?: string;
    vatNumber?: string;
    iban?: string;
    bankName?: string;
    defaultHourlyRate?: string;
    defaultVatRate?: string;
    invoicePrefix?: string;
    nextInvoiceNumber?: number;
    footerText?: string;
}

// Neue Interface für die Anfrage zur Aktualisierung von Benutzerrollen
interface UpdateUserRolesRequest {
    roleIds: number[];
}

// Interface für die Aktualisierung von Benutzer-Branches
interface UpdateUserBranchesRequest {
    branchIds: number[];
}

// Interface für den Rollenwechsel
interface SwitchRoleRequest {
    roleId: number;
}

// Alle Benutzer abrufen
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: getUserOrganizationFilter(req),
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
    } catch (error) {
        logger.error('Error in getAllUsers:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Benutzer', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Alle Benutzer für Dropdowns abrufen (nur User der Organisation)
export const getAllUsersForDropdown = async (req: Request, res: Response) => {
    try {
        // Für Dropdowns: Nur User der Organisation (oder nur eigene wenn standalone) und nur aktive Benutzer
        const userFilter = getUserOrganizationFilter(req);
        const users = await prisma.user.findMany({
            where: {
                ...userFilter,
                active: true
            },
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
    } catch (error) {
        logger.error('Error in getAllUsersForDropdown:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Benutzer für Dropdown',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Spezifischen Benutzer abrufen
// ✅ STANDARD: Eine Methode für alle User-Abfragen (Profile und UserManagement)
export const getUserById = async (req: Request | AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        const authenticatedRequest = req as AuthenticatedRequest;
        const authenticatedUserId = authenticatedRequest.userId ? parseInt(authenticatedRequest.userId, 10) : null;
        const roleId = authenticatedRequest.roleId ? parseInt(authenticatedRequest.roleId, 10) : null;
        
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        // ✅ STANDARD: Optionale Parameter für Performance-Optimierung
        const includeSettings = req.query.includeSettings === 'true';
        const includeInvoiceSettings = req.query.includeInvoiceSettings === 'true';

        // ✅ STANDARD: identificationDocuments werden IMMER geladen (essentielle Felder)
        const user = await prisma.user.findUnique({
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
                branches: {
                    include: {
                        branch: true
                    }
                },
                identificationDocuments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1 // Neuestes Dokument
                },
                // ✅ STANDARD: Optionale Felder nur laden wenn benötigt
                ...(includeSettings ? { settings: true } : {}),
                ...(includeInvoiceSettings ? { invoiceSettings: true } : {}),
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        
        // ✅ STANDARD: lastUsed setzen, wenn es der aktuelle User ist
        if (authenticatedUserId === userId && roleId) {
            const modifiedUser = {
                ...user,
                roles: user.roles.map(roleEntry => {
                    const isActiveRole = roleEntry.role.id === roleId;
                    return {
                        ...roleEntry,
                        role: {
                            ...roleEntry.role,
                            organization: roleEntry.role.organization ? {
                                ...roleEntry.role.organization,
                                // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                                logo: isActiveRole
                                    ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                                    : null  // ✅ Inaktive Roles: Logo = null (spart Memory)
                            } : null
                        },
                        lastUsed: isActiveRole
                    };
                })
            };
            
            return res.json(modifiedUser);
        }
        
        // Stelle sicher, dass das Logo-Feld explizit zurückgegeben wird
        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
        const userWithLogo = {
            ...user,
            roles: user.roles.map(roleEntry => ({
                ...roleEntry,
                role: {
                    ...roleEntry.role,
                    organization: roleEntry.role.organization ? {
                        ...roleEntry.role.organization,
                        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                        logo: roleEntry.lastUsed
                            ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                            : null  // ✅ Inaktive Roles: Logo = null (spart Memory)
                    } : null
                }
            }))
        };
        
        res.json(userWithLogo);
    } catch (error) {
        logger.error('Error in getUserById:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Benutzers', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};


// Spezifischen Benutzer aktualisieren
export const updateUserById = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        const {
            username,
            email,
            firstName,
            lastName,
            birthday,
            bankDetails,
            contract,
            salary,
            // Zusätzliche Lohnabrechnung-Felder
            payrollCountry,
            hourlyRate,
            contractType,
            monthlySalary,
            // Arbeitszeit-Felder
            normalWorkingHours,
            active
        } = req.body;

        logger.log('updateUserById - Received body:', req.body);
        logger.log('updateUserById - Active value:', active, 'Type:', typeof active);

        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = await prisma.user.findFirst({
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

        const updateData: Prisma.UserUpdateInput = {
            ...(username && { username }),
            ...(email && { email }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(birthday && { birthday: new Date(birthday) }),
            ...(bankDetails && { bankDetails }),
            ...(contract !== undefined && { contract: contract || null }),
            ...(salary !== undefined && { salary: salary === null ? null : parseFloat(salary.toString()) }),
            // Zusätzliche Lohnabrechnung-Felder
            ...(payrollCountry && { payrollCountry }),
            ...(hourlyRate !== undefined && { hourlyRate: hourlyRate === null ? null : hourlyRate }),
            ...(contractType !== undefined && { contractType }),
            ...(monthlySalary !== undefined && { monthlySalary: monthlySalary === null ? null : parseFloat(monthlySalary.toString()) }),
            // Arbeitszeit-Felder
            ...(normalWorkingHours !== undefined && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) }),
            // Active-Status
            ...(active !== undefined && active !== null && { active: Boolean(active) })
        };

        logger.log('Updating user with data:', updateData);

        const updatedUser = await prisma.user.update({
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
            userLanguageCache.invalidate(userId);
        }
        // ✅ PERFORMANCE: UserCache invalidieren bei User-Update
        userCache.invalidate(userId);
        // ✅ FIX: FilterListCache invalidieren wenn User aktiviert/deaktiviert wird (betrifft User-Filter-Gruppen)
        if ('active' in updateData && updateData.active !== undefined) {
            // Wenn User-Status geändert wird, müssen alle Filter-Gruppen-Caches invalidiert werden
            // (da User-Filter-Gruppen nur aktive User zeigen sollen)
            filterListCache.clear();
        }

        // Automatisch epsRequired setzen basierend auf contract-Typ
        if (contract !== undefined && contract !== null && contract !== '') {
            try {
                logger.log(`[EPS Required] Contract geändert für User ${userId}: ${contract}`);
                const lifecycle = await prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });

                if (lifecycle) {
                    // tiempo_completo → epsRequired = true
                    // Alle anderen → epsRequired = false
                    const epsRequired = contract === 'tiempo_completo';
                    
                    logger.log(`[EPS Required] Setze epsRequired auf ${epsRequired} für User ${userId} (contract: ${contract})`);
                    logger.log(`[EPS Required] Aktueller Wert in DB: ${lifecycle.epsRequired}`);
                    
                    const updated = await prisma.employeeLifecycle.update({
                        where: { userId },
                        data: { epsRequired }
                    });
                    
                    logger.log(`[EPS Required] Nach Update - epsRequired in DB: ${updated.epsRequired}`);

                    // Wenn epsRequired von false auf true geändert wurde, aktualisiere bestehende "not_required"-Registrierung
                    if (epsRequired && !lifecycle.epsRequired) {
                        const existingRegistration = await prisma.socialSecurityRegistration.findUnique({
                            where: {
                                lifecycleId_registrationType: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps'
                                }
                            }
                        });

                        if (existingRegistration && existingRegistration.status === 'not_required') {
                            // Ändere Status von "not_required" auf "pending"
                            await prisma.socialSecurityRegistration.update({
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
                            logger.log(`[EPS Required] EPS-Registrierung von "not_required" auf "pending" geändert für User ${userId}`);
                        } else if (!existingRegistration) {
                            // Erstelle neue "pending"-Registrierung
                            await prisma.socialSecurityRegistration.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps',
                                    status: 'pending'
                                }
                            });
                            logger.log(`[EPS Required] Neue EPS-Registrierung mit Status "pending" erstellt für User ${userId}`);
                        }
                    }

                    // Erstelle Event für die Änderung
                    await prisma.lifecycleEvent.create({
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
                    
                    logger.log(`[EPS Required] Erfolgreich aktualisiert für User ${userId}`);
                } else {
                    logger.log(`[EPS Required] Kein Lifecycle gefunden für User ${userId}`);
                }
            } catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger.error('Fehler beim Aktualisieren von epsRequired:', lifecycleError);
            }
        } else {
            logger.log(`[EPS Required] Contract nicht gesetzt oder leer für User ${userId}`);
        }

        res.json(updatedUser);
    } catch (error) {
        logger.error('Error in updateUserById:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({ 
                message: 'Benutzername oder E-Mail bereits vergeben', 
                error: error.message 
            });
        } else {
            res.status(500).json({ 
                message: 'Fehler beim Aktualisieren des Benutzers', 
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
};

// Benutzerprofil aktualisieren
export const updateProfile = async (req: AuthenticatedRequest & { body: UpdateProfileRequest }, res: Response) => {
    try {
        const {
            username,
            email,
            firstName,
            lastName,
            birthday,
            bankDetails,
            contract,
            salary,
            normalWorkingHours,
            gender,
            phoneNumber
        } = req.body;

        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = await prisma.user.findFirst({
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
        logger.log('[updateProfile] phoneNumber received:', phoneNumber, 'Type:', typeof phoneNumber);
        logger.log('[updateProfile] Request body size:', JSON.stringify(req.body).length, 'bytes');

        // Validiere Telefonnummer-Format falls vorhanden
        if (phoneNumber && phoneNumber.trim() !== '') {
            // Validiere Format: + gefolgt von 1-15 Ziffern
            const phoneRegex = /^\+[1-9]\d{1,14}$/;
            const normalizedPhone = phoneNumber.replace(/[\s-]/g, '');
            logger.log('[updateProfile] Normalized phone for validation:', normalizedPhone);
            if (!phoneRegex.test(normalizedPhone)) {
                logger.log('[updateProfile] Phone validation failed for:', normalizedPhone);
                return res.status(400).json({
                    message: 'Ungültiges Telefonnummer-Format. Format: +LändercodeNummer (z.B. +573001234567)'
                });
            }
        }

        // Normalisiere Telefonnummer (falls vorhanden)
        let normalizedPhoneNumber: string | null = null;
        if (phoneNumber !== undefined) {
            if (phoneNumber && phoneNumber.trim() !== '') {
                normalizedPhoneNumber = phoneNumber.replace(/[\s-]/g, '');
                if (!normalizedPhoneNumber.startsWith('+')) {
                    normalizedPhoneNumber = '+' + normalizedPhoneNumber;
                }
                logger.log('[updateProfile] Final normalized phoneNumber:', normalizedPhoneNumber);
            } else {
                // Explizit auf null setzen, wenn phoneNumber leer oder null ist
                normalizedPhoneNumber = null;
                logger.log('[updateProfile] phoneNumber set to null (empty string)');
            }
        } else {
            logger.log('[updateProfile] phoneNumber is undefined, not updating');
        }

        const updateData: Prisma.UserUpdateInput = {
            ...(username && { username }),
            ...(email && { email }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(birthday && { birthday: new Date(birthday) }),
            ...(bankDetails && { bankDetails }),
            ...(contract !== undefined && { contract: contract || null }),
            ...(salary && { salary: parseFloat(salary) }),
            ...(normalWorkingHours && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) }),
            ...(gender !== undefined && { gender: gender || null }),
            ...(phoneNumber !== undefined && { phoneNumber: normalizedPhoneNumber })
        };

        logger.log('[updateProfile] Update data:', JSON.stringify(updateData, null, 2));

        const updatedUser = await prisma.user.update({
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
            userLanguageCache.invalidate(userId);
        }
        // ✅ PERFORMANCE: UserCache invalidieren bei User-Update
        userCache.invalidate(userId);

        // Prüfe Profilvollständigkeit nach Update (username, email, language - country NICHT nötig)
        const isComplete = !!(
            updatedUser.username &&
            updatedUser.email &&
            updatedUser.language
        );

        // Update profileComplete, falls sich der Status geändert hat
        if (isComplete !== updatedUser.profileComplete) {
            await prisma.user.update({
                where: { id: userId },
                data: { profileComplete: isComplete }
            });
            updatedUser.profileComplete = isComplete;
        }

        // Automatisch epsRequired setzen basierend auf contract-Typ
        if (contract !== undefined && contract !== null && contract !== '') {
            try {
                logger.log(`[EPS Required] Contract geändert für User ${userId}: ${contract}`);
                const lifecycle = await prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });

                if (lifecycle) {
                    // tiempo_completo → epsRequired = true
                    // Alle anderen → epsRequired = false
                    const epsRequired = contract === 'tiempo_completo';
                    
                    logger.log(`[EPS Required] Setze epsRequired auf ${epsRequired} für User ${userId} (contract: ${contract})`);
                    logger.log(`[EPS Required] Aktueller Wert in DB: ${lifecycle.epsRequired}`);
                    
                    const updated = await prisma.employeeLifecycle.update({
                        where: { userId },
                        data: { epsRequired }
                    });
                    
                    logger.log(`[EPS Required] Nach Update - epsRequired in DB: ${updated.epsRequired}`);

                    // Wenn epsRequired von false auf true geändert wurde, aktualisiere bestehende "not_required"-Registrierung
                    if (epsRequired && !lifecycle.epsRequired) {
                        const existingRegistration = await prisma.socialSecurityRegistration.findUnique({
                            where: {
                                lifecycleId_registrationType: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps'
                                }
                            }
                        });

                        if (existingRegistration && existingRegistration.status === 'not_required') {
                            // Ändere Status von "not_required" auf "pending"
                            await prisma.socialSecurityRegistration.update({
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
                            logger.log(`[EPS Required] EPS-Registrierung von "not_required" auf "pending" geändert für User ${userId}`);
                        } else if (!existingRegistration) {
                            // Erstelle neue "pending"-Registrierung
                            await prisma.socialSecurityRegistration.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps',
                                    status: 'pending'
                                }
                            });
                            logger.log(`[EPS Required] Neue EPS-Registrierung mit Status "pending" erstellt für User ${userId}`);
                        }
                    }

                    // Erstelle Event für die Änderung
                    await prisma.lifecycleEvent.create({
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
                    
                    logger.log(`[EPS Required] Erfolgreich aktualisiert für User ${userId}`);
                } else {
                    logger.log(`[EPS Required] Kein Lifecycle gefunden für User ${userId}`);
                }
            } catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger.error('Fehler beim Aktualisieren von epsRequired:', lifecycleError);
            }
        } else {
            logger.log(`[EPS Required] Contract nicht gesetzt oder leer für User ${userId}`);
        }

        res.json(updatedUser);
    } catch (error) {
        logger.error('Error in updateProfile:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({ 
                message: 'Benutzername oder E-Mail bereits vergeben', 
                error: error.message 
            });
        } else {
            res.status(500).json({ 
                message: 'Fehler beim Aktualisieren des Profils', 
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
};

// Prüfe Profilvollständigkeit
export const isProfileComplete = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        const user = await prisma.user.findUnique({
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
        const missingFields: string[] = [];
        if (!user.username) missingFields.push('username');
        if (!user.email) missingFields.push('email');
        if (!user.language) missingFields.push('language');

        const complete = missingFields.length === 0;

        // Update profileComplete, falls noch nicht gesetzt
        if (complete !== user.profileComplete) {
            await prisma.user.update({
                where: { id: userId },
                data: { profileComplete: complete }
            });
        }

        return res.json({
            complete,
            missingFields
        });
    } catch (error) {
        logger.error('Error in isProfileComplete:', error);
        res.status(500).json({
            message: 'Fehler bei der Profilprüfung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Benutzerrollen aktualisieren
export const updateUserRoles = async (req: Request<{ id: string }, {}, UpdateUserRolesRequest>, res: Response) => {
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
        const userExists = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!userExists) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Überprüfe, ob alle Rollen existieren und zur Organisation gehören
        const roleFilter = getDataIsolationFilter(req as any, 'role');
        const existingRoles = await prisma.role.findMany({
            where: {
                id: {
                    in: roleIds
                },
                ...roleFilter
            }
        });

        if (existingRoles.length !== roleIds.length) {
            return res.status(400).json({ 
                message: 'Eine oder mehrere Rollen wurden nicht gefunden oder gehören nicht zu Ihrer Organisation' 
            });
        }

        // Aktuelle Benutzerrollen abrufen, um lastUsed-Status zu prüfen
        const currentUserRoles = await prisma.userRole.findMany({
            where: { userId },
            orderBy: { role: { id: 'asc' } }
        });
        
        // Prüfen, welche Rolle aktuell als lastUsed markiert ist
        const currentLastUsedRole = currentUserRoles.find(ur => ur.lastUsed);

        // Lösche alle vorhandenen Benutzerrollen
        await prisma.userRole.deleteMany({
            where: { userId }
        });

        // Erstelle neue Benutzerrollen
        const userRoles = await Promise.all(
            roleIds.map(async (roleId) => {
                return prisma.userRole.create({
                    data: {
                        userId,
                        roleId,
                        lastUsed: false
                    }
                });
            })
        );

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
                } else {
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
            await prisma.userRole.update({
                where: {
                    id: roleToMarkAsLastUsed.id
                },
                data: {
                    lastUsed: true
                }
            });
        }

        // Benutzer mit aktualisierten Rollen abrufen
        const updatedUser = await prisma.user.findUnique({
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
        userLanguageCache.invalidate(userId);
        // ✅ PERFORMANCE: UserCache invalidieren bei Rollen-Änderung
        userCache.invalidate(userId);

        // Benachrichtigung an den Benutzer senden, dessen Rollen aktualisiert wurden
        const userLang = await getUserLanguage(userId);
        logger.log(`[updateUserRoles] User ${userId} Sprache: ${userLang}`);
        const userNotificationText = getUserNotificationText(userLang, 'roles_updated', true);
        logger.log(`[updateUserRoles] User Notification Text: ${userNotificationText.title} - ${userNotificationText.message}`);
        await createNotificationIfEnabled({
            userId: userId,
            title: userNotificationText.title,
            message: userNotificationText.message,
            type: NotificationType.user,
            relatedEntityId: userId,
            relatedEntityType: 'update'
        });

        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = getUserOrganizationFilter(req);
        const admins = await prisma.user.findMany({
            where: {
                ...userFilter,
                roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });

        for (const admin of admins) {
            const adminLang = await getUserLanguage(admin.id);
            logger.log(`[updateUserRoles] Admin ${admin.id} Sprache: ${adminLang}`);
            const adminNotificationText = getUserNotificationText(adminLang, 'roles_updated', false, `${updatedUser.firstName} ${updatedUser.lastName}`);
            logger.log(`[updateUserRoles] Admin Notification Text: ${adminNotificationText.title} - ${adminNotificationText.message}`);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: adminNotificationText.title,
                message: adminNotificationText.message,
                type: NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'update'
            });
        }

        res.json(updatedUser);
    } catch (error) {
        logger.error('Error in updateUserRoles:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Benutzerrollen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Benutzer-Branches aktualisieren
export const updateUserBranches = async (req: Request<{ id: string }, {}, UpdateUserBranchesRequest>, res: Response) => {
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
        const userExists = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!userExists) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Überprüfe, ob alle Branches existieren und zur Organisation gehören
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        
        logger.log('[updateUserBranches] Branch Filter:', branchFilter);
        logger.log('[updateUserBranches] Requested branchIds:', branchIds);
        logger.log('[updateUserBranches] Organization ID:', req.organizationId);
        
        const existingBranches = await prisma.branch.findMany({
            where: {
                id: {
                    in: branchIds
                },
                ...branchFilter
            }
        });

        logger.log('[updateUserBranches] Found branches:', existingBranches.map(b => ({ id: b.id, name: b.name, organizationId: b.organizationId })));
        logger.log('[updateUserBranches] Expected:', branchIds.length, 'Found:', existingBranches.length);

        if (existingBranches.length !== branchIds.length) {
            // Prüfe welche Branches fehlen
            const foundIds = existingBranches.map(b => b.id);
            const missingIds = branchIds.filter(id => !foundIds.includes(id));
            
            // Prüfe ob die fehlenden Branches existieren, aber zur falschen Organisation gehören
            const allRequestedBranches = await prisma.branch.findMany({
                where: {
                    id: { in: branchIds }
                },
                select: {
                    id: true,
                    name: true,
                    organizationId: true
                }
            });
            
            logger.log('[updateUserBranches] All requested branches (without filter):', allRequestedBranches);
            
            return res.status(400).json({ 
                message: `Eine oder mehrere Niederlassungen wurden nicht gefunden oder gehören nicht zu Ihrer Organisation. Fehlende IDs: ${missingIds.join(', ')}`,
                missingIds,
                requestedBranchIds: branchIds,
                foundBranchIds: foundIds,
                organizationId: req.organizationId
            });
        }

        // Aktuelle Benutzer-Branches abrufen, um lastUsed-Status zu prüfen
        const currentUserBranches = await prisma.usersBranches.findMany({
            where: { userId },
            orderBy: { branchId: 'asc' }
        });
        
        // Prüfen, welche Branch aktuell als lastUsed markiert ist
        const currentLastUsedBranch = currentUserBranches.find(ub => ub.lastUsed);

        // Lösche alle vorhandenen Benutzer-Branches
        await prisma.usersBranches.deleteMany({
            where: { userId }
        });

        // Erstelle neue Benutzer-Branches
        const userBranches = await Promise.all(
            branchIds.map(async (branchId) => {
                return prisma.usersBranches.create({
                    data: {
                        userId,
                        branchId,
                        lastUsed: false
                    }
                });
            })
        );

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
                } else {
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
            await prisma.usersBranches.update({
                where: {
                    id: branchToMarkAsLastUsed.id
                },
                data: {
                    lastUsed: true
                }
            });
        }

        // Benutzer mit aktualisierten Branches abrufen
        const updatedUser = await prisma.user.findUnique({
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
        const userLang = await getUserLanguage(userId);
        const userNotificationText = getUserNotificationText(userLang, 'branches_updated', true);
        await createNotificationIfEnabled({
            userId: userId,
            title: userNotificationText.title,
            message: userNotificationText.message,
            type: NotificationType.user,
            relatedEntityId: userId,
            relatedEntityType: 'update'
        });

        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = getUserOrganizationFilter(req);
        const admins = await prisma.user.findMany({
            where: {
                ...userFilter,
                roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });

        for (const admin of admins) {
            const adminLang = await getUserLanguage(admin.id);
            const adminNotificationText = getUserNotificationText(adminLang, 'branches_updated', false, `${updatedUser.firstName} ${updatedUser.lastName}`);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: adminNotificationText.title,
                message: adminNotificationText.message,
                type: NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'update'
            });
        }

        res.json(updatedUser);
    } catch (error) {
        logger.error('Error in updateUserBranches:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Benutzer-Niederlassungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Benutzereinstellungen aktualisieren
export const updateUserSettings = async (req: AuthenticatedRequest & { body: UpdateUserSettingsRequest }, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // Prüfen, ob es bereits Einstellungen gibt
        let settings = await prisma.settings.findUnique({
            where: { userId }
        });

        if (settings) {
            // Einstellungen aktualisieren
            settings = await prisma.settings.update({
                where: { userId },
                data: {
                    ...(req.body.darkMode !== undefined && { darkMode: req.body.darkMode }),
                    ...(req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed })
                }
            });
        } else {
            // Neue Einstellungen erstellen
            settings = await prisma.settings.create({
                data: {
                    userId,
                    ...(req.body.darkMode !== undefined && { darkMode: req.body.darkMode }),
                    ...(req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed })
                }
            });
        }

        res.json(settings);
    } catch (error) {
        logger.error('Error in updateUserSettings:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Benutzereinstellungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Aktive Sprache für User bestimmen
export const getUserActiveLanguage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        // 1. Prüfe User.language (falls gesetzt)
        const user = await prisma.user.findUnique({
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

        let activeLanguage: string | null = null;

        // Priorität 1: User-Sprache (falls gesetzt und nicht leer)
        if (user.language && user.language.trim() !== '') {
            activeLanguage = user.language;
        } else {
            // Priorität 2: Organisation-Sprache (falls vorhanden)
            const userRole = user.roles[0];
            if (userRole?.role?.organization) {
                const orgSettings = userRole.role.organization.settings as any;
                if (orgSettings?.language) {
                    activeLanguage = orgSettings.language;
                }
            }
        }

        // Priorität 3: Fallback
        if (!activeLanguage) {
            activeLanguage = 'de'; // Standard-Fallback
        }

        res.json({ language: activeLanguage });
    } catch (error) {
        logger.error('Error in getUserActiveLanguage:', error);
        res.status(500).json({ 
            message: 'Fehler beim Bestimmen der aktiven Sprache', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

export const updateInvoiceSettings = async (req: AuthenticatedRequest & { body: UpdateInvoiceSettingsRequest }, res: Response) => {
    try {
        logger.log('DEBUG updateInvoiceSettings:', {
            userId: req.userId,
            userIdType: typeof req.userId,
            userObject: req.user?.id,
            body: req.body
        });
        
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            logger.error('ERROR: userId is NaN', { 
                rawUserId: req.userId, 
                userObjectId: req.user?.id 
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
        let invoiceSettings = await prisma.invoiceSettings.findUnique({
            where: { userId }
        });

        if (invoiceSettings) {
            // Invoice-Einstellungen aktualisieren
            invoiceSettings = await prisma.invoiceSettings.update({
                where: { userId },
                data: {
                    ...(req.body.monthlyReportEnabled !== undefined && { monthlyReportEnabled: req.body.monthlyReportEnabled }),
                    ...(req.body.monthlyReportDay !== undefined && { monthlyReportDay: req.body.monthlyReportDay }),
                    ...(req.body.monthlyReportRecipient !== undefined && { monthlyReportRecipient: req.body.monthlyReportRecipient }),
                    ...(req.body.companyName !== undefined && { companyName: req.body.companyName }),
                    ...(req.body.companyAddress !== undefined && { companyAddress: req.body.companyAddress }),
                    ...(req.body.companyZip !== undefined && { companyZip: req.body.companyZip }),
                    ...(req.body.companyCity !== undefined && { companyCity: req.body.companyCity }),
                    ...(req.body.companyCountry !== undefined && { companyCountry: req.body.companyCountry }),
                    ...(req.body.companyPhone !== undefined && { companyPhone: req.body.companyPhone }),
                    ...(req.body.companyEmail !== undefined && { companyEmail: req.body.companyEmail }),
                    ...(req.body.companyWebsite !== undefined && { companyWebsite: req.body.companyWebsite }),
                    ...(req.body.vatNumber !== undefined && { vatNumber: req.body.vatNumber }),
                    ...(req.body.iban !== undefined && { iban: req.body.iban }),
                    ...(req.body.bankName !== undefined && { bankName: req.body.bankName }),
                    ...(req.body.defaultHourlyRate !== undefined && { defaultHourlyRate: req.body.defaultHourlyRate }),
                    ...(req.body.defaultVatRate !== undefined && { defaultVatRate: req.body.defaultVatRate }),
                    ...(req.body.invoicePrefix !== undefined && { invoicePrefix: req.body.invoicePrefix }),
                    ...(req.body.nextInvoiceNumber !== undefined && { nextInvoiceNumber: req.body.nextInvoiceNumber }),
                    ...(req.body.footerText !== undefined && { footerText: req.body.footerText })
                }
            });
        } else {
            // Neue Invoice-Einstellungen erstellen mit Defaults
            invoiceSettings = await prisma.invoiceSettings.create({
                data: {
                    userId,
                    companyName: req.body.companyName || '',
                    companyAddress: req.body.companyAddress || '',
                    companyZip: req.body.companyZip || '',
                    companyCity: req.body.companyCity || '',
                    companyCountry: req.body.companyCountry || 'CH',
                    iban: req.body.iban || '',
                    defaultHourlyRate: req.body.defaultHourlyRate || '0',
                    ...(req.body.monthlyReportEnabled !== undefined && { monthlyReportEnabled: req.body.monthlyReportEnabled }),
                    ...(req.body.monthlyReportDay !== undefined && { monthlyReportDay: req.body.monthlyReportDay }),
                    ...(req.body.monthlyReportRecipient !== undefined && { monthlyReportRecipient: req.body.monthlyReportRecipient }),
                    ...(req.body.companyPhone !== undefined && { companyPhone: req.body.companyPhone }),
                    ...(req.body.companyEmail !== undefined && { companyEmail: req.body.companyEmail }),
                    ...(req.body.companyWebsite !== undefined && { companyWebsite: req.body.companyWebsite }),
                    ...(req.body.vatNumber !== undefined && { vatNumber: req.body.vatNumber }),
                    ...(req.body.bankName !== undefined && { bankName: req.body.bankName }),
                    ...(req.body.defaultVatRate !== undefined && { defaultVatRate: req.body.defaultVatRate }),
                    ...(req.body.invoicePrefix !== undefined && { invoicePrefix: req.body.invoicePrefix }),
                    ...(req.body.nextInvoiceNumber !== undefined && { nextInvoiceNumber: req.body.nextInvoiceNumber }),
                    ...(req.body.footerText !== undefined && { footerText: req.body.footerText })
                }
            });
        }

        res.json(invoiceSettings);
    } catch (error) {
        logger.error('Error in updateInvoiceSettings:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Invoice-Einstellungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Aktive Rolle eines Benutzers wechseln
export const switchUserRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Verwende entweder req.user?.id oder req.userId, falls verfügbar
        const userId = req.user?.id || parseInt(req.userId, 10);
        const { roleId } = req.body as SwitchRoleRequest;

        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        if (isNaN(roleId) || roleId <= 0) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Hole die neue Rolle mit Organisation
        const newRole = await prisma.role.findUnique({
            where: { id: roleId },
            select: { id: true, organizationId: true }
        });
            
        if (!newRole) {
            return res.status(404).json({ message: 'Rolle nicht gefunden' });
        }
        
        // Transaktion starten - alle Prisma-Operationen innerhalb der Transaktion
        await prisma.$transaction(async (tx) => {
            // Prüfen, ob die Rolle dem Benutzer zugewiesen ist
            const userRole = await tx.userRole.findFirst({
                where: { userId, roleId }
            });

            if (!userRole) {
                throw new Error('Diese Rolle ist dem Benutzer nicht zugewiesen');
            }

            // Alle Rollen des Benutzers auf lastUsed=false setzen
            await tx.userRole.updateMany({
                where: { userId },
                data: { lastUsed: false }
            });

            // Die ausgewählte Rolle auf lastUsed=true setzen
            await tx.userRole.update({
                where: { id: userRole.id },
                data: { lastUsed: true }
            });

            // ✅ Branch für neue Organisation aktivieren
            // Branches sind pro Organisation - bei Org-Wechsel muss die Branch der neuen Org aktiviert werden
            if (newRole.organizationId) {
                // Alle Branches auf lastUsed=false
                await tx.usersBranches.updateMany({
                    where: { userId },
                    data: { lastUsed: false }
                });

                // Suche zuletzt aktualisierte Branch der neuen Organisation (= zuletzt aktiv gewesen)
                const existingBranch = await tx.usersBranches.findFirst({
                    where: {
                        userId,
                        branch: { organizationId: newRole.organizationId }
                    },
                    orderBy: { updatedAt: 'desc' }
                });

                if (existingBranch) {
                    await tx.usersBranches.update({
                        where: { id: existingBranch.id },
                        data: { lastUsed: true }
                    });
                }
                // Falls User keine Branch der neuen Org hat, bleibt keine aktiv (kein Fehler)
            }
        });

        // ✅ PERFORMANCE: Caches invalidieren bei Rollen-Wechsel
        userCache.invalidate(userId);
        const { organizationCache } = await import('../utils/organizationCache');
        organizationCache.invalidate(userId);
        // ✅ BranchCache invalidieren (Branch hat sich geändert)
        const { branchCache } = await import('../services/branchCache');
        branchCache.clear();

        // Benutzer mit aktualisierten Rollen zurückgeben
        const updatedUser = await prisma.user.findUnique({
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
        const userWithOptimizedLogo = {
            ...updatedUser,
            roles: updatedUser.roles.map(roleEntry => ({
                ...roleEntry,
                role: {
                    ...roleEntry.role,
                    organization: roleEntry.role.organization ? {
                        ...roleEntry.role.organization,
                        // ✅ MEMORY FIX: Logo nur für aktive Role behalten, für inaktive auf null setzen
                        logo: roleEntry.lastUsed
                            ? (roleEntry.role.organization.logo === 'null' || roleEntry.role.organization.logo === null || roleEntry.role.organization.logo === '' ? null : roleEntry.role.organization.logo)
                            : null  // ✅ Inaktive Roles: Logo = null (spart Memory)
                    } : null
                }
            }))
        };

        return res.json(userWithOptimizedLogo);
    } catch (error) {
        logger.error('Error in switchUserRole:', error);
        
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
};

// Neuen Benutzer erstellen (für Admin-Bereich)
export const createUser = async (req: Request, res: Response) => {
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
        const currentUser = await prisma.user.findUnique({
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
        const existingUser = await prisma.user.findFirst({
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
        const hashedPassword = await bcrypt.hash(password, 10);

        // Finde die "Hamburger"-Rolle der Organisation (Standard-Rolle für neue Benutzer)
        const hamburgerRole = await prisma.role.findFirst({
            where: {
                organizationId: organizationId,
                name: 'Hamburger'
            }
        });

        // Falls keine "Hamburger"-Rolle existiert, suche nach "User"-Rolle
        let roleToAssign = hamburgerRole;
        if (!roleToAssign) {
            roleToAssign = await prisma.role.findFirst({
                where: {
                    organizationId: organizationId,
                    name: 'User'
                }
            });
        }

        // Falls immer noch keine Rolle gefunden, nehme die erste verfügbare Rolle der Organisation (außer Admin)
        if (!roleToAssign) {
            roleToAssign = await prisma.role.findFirst({
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
        const user = await prisma.user.create({
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
        const admins = await prisma.user.findMany({
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
            const adminLang = await getUserLanguage(admin.id);
            const notificationText = getUserNotificationText(adminLang, 'created', false, `${firstName} ${lastName}`);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.user,
                relatedEntityId: user.id,
                relatedEntityType: 'create'
            });
        }

        // Automatisch Lebenszyklus erstellen (für Organisationen)
        if (organizationId) {
            try {
                await LifecycleService.createLifecycle(user.id, organizationId);
            } catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger.error('Fehler beim Erstellen des Lebenszyklus:', lifecycleError);
            }
        }

        // Entferne Passwort aus der Response
        const userResponse = {
            ...user,
            password: undefined
        };

        res.status(201).json(userResponse);
    } catch (error) {
        logger.error('Error in createUser:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Benutzer aktualisieren (für Admin-Bereich)
export const updateUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        // Aktuellen Benutzer abrufen
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: true
            }
        });

        if (!currentUser) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary, active } = req.body;

        logger.log('Updating user with data:', req.body);
        logger.log('Active value:', active, 'Type:', typeof active);

        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = await prisma.user.findFirst({
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
        const updateData: Prisma.UserUpdateInput = {
            ...(username && { username }),
            ...(email && { email }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(birthday && { birthday: new Date(birthday) }),
            ...(bankDetails && { bankDetails }),
            ...(contract !== undefined && { contract: contract || null }),
            ...(salary && { salary: parseFloat(salary.toString()) }),
            ...(active !== undefined && active !== null && { active: Boolean(active) })
        };

        logger.log('Update data to be applied:', updateData);

        const updatedUser = await prisma.user.update({
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
            userLanguageCache.invalidate(userId);
        }
        // ✅ PERFORMANCE: UserCache invalidieren bei User-Update
        userCache.invalidate(userId);
        // ✅ FIX: FilterListCache invalidieren wenn User aktiviert/deaktiviert wird (betrifft User-Filter-Gruppen)
        if ('active' in updateData && updateData.active !== undefined) {
            // Wenn User-Status geändert wird, müssen alle Filter-Gruppen-Caches invalidiert werden
            // (da User-Filter-Gruppen nur aktive User zeigen sollen)
            filterListCache.clear();
        }

        // Automatisch epsRequired setzen basierend auf contract-Typ
        if (contract !== undefined && contract !== null && contract !== '') {
            try {
                logger.log(`[EPS Required] Contract geändert für User ${userId}: ${contract}`);
                const lifecycle = await prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });

                if (lifecycle) {
                    // tiempo_completo → epsRequired = true
                    // Alle anderen → epsRequired = false
                    const epsRequired = contract === 'tiempo_completo';
                    
                    logger.log(`[EPS Required] Setze epsRequired auf ${epsRequired} für User ${userId} (contract: ${contract})`);
                    logger.log(`[EPS Required] Aktueller Wert in DB: ${lifecycle.epsRequired}`);
                    
                    const updated = await prisma.employeeLifecycle.update({
                        where: { userId },
                        data: { epsRequired }
                    });
                    
                    logger.log(`[EPS Required] Nach Update - epsRequired in DB: ${updated.epsRequired}`);

                    // Wenn epsRequired von false auf true geändert wurde, aktualisiere bestehende "not_required"-Registrierung
                    if (epsRequired && !lifecycle.epsRequired) {
                        const existingRegistration = await prisma.socialSecurityRegistration.findUnique({
                            where: {
                                lifecycleId_registrationType: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps'
                                }
                            }
                        });

                        if (existingRegistration && existingRegistration.status === 'not_required') {
                            // Ändere Status von "not_required" auf "pending"
                            await prisma.socialSecurityRegistration.update({
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
                            logger.log(`[EPS Required] EPS-Registrierung von "not_required" auf "pending" geändert für User ${userId}`);
                        } else if (!existingRegistration) {
                            // Erstelle neue "pending"-Registrierung
                            await prisma.socialSecurityRegistration.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    registrationType: 'eps',
                                    status: 'pending'
                                }
                            });
                            logger.log(`[EPS Required] Neue EPS-Registrierung mit Status "pending" erstellt für User ${userId}`);
                        }
                    }

                    // Erstelle Event für die Änderung
                    await prisma.lifecycleEvent.create({
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
                    
                    logger.log(`[EPS Required] Erfolgreich aktualisiert für User ${userId}`);
                } else {
                    logger.log(`[EPS Required] Kein Lifecycle gefunden für User ${userId}`);
                }
            } catch (lifecycleError) {
                // Logge Fehler, aber breche nicht ab
                logger.error('Fehler beim Aktualisieren von epsRequired:', lifecycleError);
            }
        } else {
            logger.log(`[EPS Required] Contract nicht gesetzt oder leer für User ${userId}`);
        }

        // Benachrichtigung für den aktualisierten Benutzer senden
        const userLang = await getUserLanguage(updatedUser.id);
        const userNotificationText = getUserNotificationText(userLang, 'updated', true);
        await createNotificationIfEnabled({
            userId: updatedUser.id,
            title: userNotificationText.title,
            message: userNotificationText.message,
            type: NotificationType.user,
            relatedEntityId: updatedUser.id,
            relatedEntityType: 'update'
        });

        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = getUserOrganizationFilter(req);
        const admins = await prisma.user.findMany({
            where: {
                ...userFilter,
                roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });

        for (const admin of admins) {
            const adminLang = await getUserLanguage(admin.id);
            const notificationText = getUserNotificationText(adminLang, 'updated', false, `${updatedUser.firstName} ${updatedUser.lastName}`);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.user,
                relatedEntityId: updatedUser.id,
                relatedEntityType: 'update'
            });
        }

        res.json(updatedUser);
    } catch (error) {
        logger.error('Error in updateUser:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Benutzer löschen
export const deleteUser = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        // Benutzer vor dem Löschen abrufen
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Lösche alle verknüpften Daten
        await prisma.$transaction([
            // Organisation-bezogene Abhängigkeiten löschen
            prisma.organizationJoinRequest.deleteMany({
                where: { requesterId: userId }
            }),
            // processedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)
            prisma.organizationInvitation.deleteMany({
                where: { invitedBy: userId }
            }),
            // acceptedBy wird automatisch auf NULL gesetzt (ON DELETE SET NULL)
            
            // Standard-Abhängigkeiten löschen
            prisma.userRole.deleteMany({
                where: { userId }
            }),
            prisma.usersBranches.deleteMany({
                where: { userId }
            }),
            prisma.settings.deleteMany({
                where: { userId }
            }),
            prisma.notification.deleteMany({
                where: { userId }
            }),
            prisma.userNotificationSettings.deleteMany({
                where: { userId }
            }),
            prisma.user.delete({
                where: { id: userId }
            })
        ]);

        // Benachrichtigung für Administratoren der Organisation senden
        const userFilter = getUserOrganizationFilter(req);
        const admins = await prisma.user.findMany({
            where: {
                ...userFilter,
                roles: {
                    some: {
                        role: {
                            name: 'Admin',
                            organizationId: req.organizationId
                        }
                    }
                }
            }
        });

        for (const admin of admins) {
            const adminLang = await getUserLanguage(admin.id);
            const notificationText = getUserNotificationText(adminLang, 'deleted', false, `${user.firstName} ${user.lastName}`);
            await createNotificationIfEnabled({
                userId: admin.id,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'delete'
            });
        }

        res.status(204).send();
    } catch (error) {
        logger.error('Error in deleteUser:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// ============================================
// ONBOARDING SYSTEM CONTROLLERS
// ============================================

// Onboarding-Status abrufen
export const getOnboardingStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        
        // ✅ PERFORMANCE: Verwende OnboardingCache statt DB-Query
        const { onboardingCache } = await import('../services/onboardingCache');
        const cachedStatus = await onboardingCache.get(userId);
        
        if (cachedStatus) {
            return res.json(cachedStatus);
        }
        
        // Fallback: DB-Query (sollte nicht nötig sein)
        return res.status(500).json({ 
            message: 'Fehler beim Abrufen des Onboarding-Status',
            error: 'Cache-Fehler'
        });
    } catch (error) {
        logger.error('Error in getOnboardingStatus:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Onboarding-Status',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Onboarding-Fortschritt aktualisieren
export const updateOnboardingProgress = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        const { currentStep, completedSteps, dismissedSteps } = req.body;

        if (typeof currentStep !== 'number' || !Array.isArray(completedSteps)) {
            return res.status(400).json({ message: 'Ungültige Fortschrittsdaten' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                onboardingProgress: {
                    currentStep,
                    completedSteps,
                    dismissedSteps: dismissedSteps || []
                } as Prisma.JsonValue,
                onboardingStartedAt: req.body.onboardingStartedAt ? new Date(req.body.onboardingStartedAt) : undefined
            }
        });

        // ✅ PERFORMANCE: Cache invalidieren nach Onboarding-Status-Änderung
        const { onboardingCache } = await import('../services/onboardingCache');
        await onboardingCache.invalidate(userId);

        res.json({
            message: 'Onboarding-Fortschritt aktualisiert',
            onboardingProgress: user.onboardingProgress
        });
    } catch (error) {
        logger.error('Error in updateOnboardingProgress:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Onboarding-Fortschritts',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Onboarding als abgeschlossen markieren
export const completeOnboarding = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                onboardingCompleted: true,
                onboardingCompletedAt: new Date()
            }
        });

        // ✅ PERFORMANCE: Cache invalidieren nach Onboarding-Status-Änderung
        const { onboardingCache } = await import('../services/onboardingCache');
        await onboardingCache.invalidate(userId);

        res.json({
            message: 'Onboarding abgeschlossen',
            onboardingCompleted: user.onboardingCompleted,
            onboardingCompletedAt: user.onboardingCompletedAt
        });
    } catch (error) {
        logger.error('Error in completeOnboarding:', error);
        res.status(500).json({
            message: 'Fehler beim Abschließen des Onboardings',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Onboarding-Event tracken (Analytics)
export const trackOnboardingEvent = async (req: AuthenticatedRequest, res: Response) => {
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

        const event = await prisma.onboardingEvent.create({
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
    } catch (error) {
        logger.error('Error in trackOnboardingEvent:', error);
        res.status(500).json({
            message: 'Fehler beim Speichern des Onboarding-Events',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Onboarding zurücksetzen (für Settings)
export const resetOnboarding = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                onboardingCompleted: false,
                onboardingProgress: null,
                onboardingStartedAt: null,
                onboardingCompletedAt: null
            }
        });

        // ✅ PERFORMANCE: Cache invalidieren nach Onboarding-Status-Änderung
        const { onboardingCache } = await import('../services/onboardingCache');
        await onboardingCache.invalidate(userId);

        res.json({
            message: 'Onboarding zurückgesetzt',
            onboardingCompleted: user.onboardingCompleted
        });
    } catch (error) {
        logger.error('Error in resetOnboarding:', error);
        res.status(500).json({
            message: 'Fehler beim Zurücksetzen des Onboardings',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Onboarding-Analytics abrufen (nur für Admins)
export const getOnboardingAnalytics = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);

        // Prüfe ob Admin
        const role = await prisma.role.findUnique({
            where: { id: roleId }
        });

        if (!role || role.name.toLowerCase() !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung' });
        }

        const events = await prisma.onboardingEvent.findMany({
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
        const analytics = events.reduce((acc: any, event) => {
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
            } else if (event.action === 'skipped') {
                acc[userId].skippedSteps++;
            }
            return acc;
        }, {});

        res.json({
            analytics: Object.values(analytics)
        });
    } catch (error) {
        logger.error('Error in getOnboardingAnalytics:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Onboarding-Analytics',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Debug-Endpoint: Zeigt alle relevanten Informationen für den aktuellen User
export const debugUserBranches = async (req: Request, res: Response) => {
    try {
        const userId = parseInt((req as any).userId as string, 10);

        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        // 1. User-Informationen
        const user = await prisma.user.findUnique({
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
        const branchFilter = getDataIsolationFilter(req as any, 'branch');
        const allOrgBranches = await prisma.branch.findMany({
            where: branchFilter,
            select: {
                id: true,
                name: true,
                organizationId: true
            },
            orderBy: { name: 'asc' }
        });

        // 3. User-Branches (zugewiesene Branches)
        const userBranches = await prisma.usersBranches.findMany({
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
        const activeRole = await prisma.userRole.findFirst({
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
        const userRoles = await prisma.userRole.findMany({
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
            } else {
                const roleBranch = role.branches.find(rb => rb.branch.id === branch.id);
                if (roleBranch) {
                    isAvailable = true;
                    reason = 'Rolle ist für diese Branch zugewiesen (RoleBranch Eintrag)';
                } else {
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
                activeRoleName: activeRole?.role.name || 'Keine',
                branchesVisibleInHeader: branchAvailability.filter(ba => 
                    ba.isAssignedToUser && (ba.isAvailableForActiveRole === true || ba.isAvailableForActiveRole === null)
                ).length
            }
        });
    } catch (error) {
        logger.error('Error in debugUserBranches:', error);
        res.status(500).json({
            message: 'Fehler beim Debug-Abruf',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 