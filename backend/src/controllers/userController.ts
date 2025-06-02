// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from './notificationController';

const prisma = new PrismaClient();

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

// Interface für den Rollenwechsel
interface SwitchRoleRequest {
    roleId: number;
}

// Alle Benutzer abrufen
export const getAllUsers = async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true
            }
        });
        res.json(users);
    } catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Benutzer', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Spezifischen Benutzer abrufen
export const getUserById = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error in getUserById:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Benutzers', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Aktuellen Benutzer abrufen
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10); // Die roleId aus dem Token lesen
        
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
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
                settings: true,
                invoiceSettings: true,
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        
        // Die Rolle aus dem Token als aktive Rolle markieren
        if (!isNaN(roleId)) {
            const modifiedUser = {
                ...user,
                roles: user.roles.map(roleEntry => ({
                    ...roleEntry,
                    lastUsed: roleEntry.role.id === roleId
                }))
            };
            
            return res.json(modifiedUser);
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Benutzerprofils', 
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
            normalWorkingHours
        } = req.body;

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
            ...(contract && { contract }),
            ...(salary !== undefined && { salary: salary === null ? null : parseFloat(salary.toString()) }),
            // Zusätzliche Lohnabrechnung-Felder
            ...(payrollCountry && { payrollCountry }),
            ...(hourlyRate !== undefined && { hourlyRate: hourlyRate === null ? null : hourlyRate }),
            ...(contractType !== undefined && { contractType }),
            ...(monthlySalary !== undefined && { monthlySalary: monthlySalary === null ? null : parseFloat(monthlySalary.toString()) }),
            // Arbeitszeit-Felder
            ...(normalWorkingHours !== undefined && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) })
        };

        console.log('Updating user with data:', updateData);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error in updateUserById:', error);
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
            normalWorkingHours
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

        const updateData: Prisma.UserUpdateInput = {
            ...(username && { username }),
            ...(email && { email }),
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(birthday && { birthday: new Date(birthday) }),
            ...(bankDetails && { bankDetails }),
            ...(contract && { contract }),
            ...(salary && { salary: parseFloat(salary) }),
            ...(normalWorkingHours && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) })
        };

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
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                }
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Error in updateProfile:', error);
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

        // Überprüfe, ob alle Rollen existieren
        const existingRoles = await prisma.role.findMany({
            where: {
                id: {
                    in: roleIds
                }
            }
        });

        if (existingRoles.length !== roleIds.length) {
            return res.status(400).json({ message: 'Eine oder mehrere Rollen wurden nicht gefunden' });
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
                                permissions: true
                            }
                        }
                    }
                }
            }
        });

        // Benachrichtigung an den Benutzer senden, dessen Rollen aktualisiert wurden
        await createNotificationIfEnabled({
            userId: userId,
            title: 'Deine Rollen wurden aktualisiert',
            message: `Deine Benutzerrollen wurden aktualisiert. Melde dich bei Fragen an einen Administrator.`,
            type: NotificationType.user,
            relatedEntityId: userId,
            relatedEntityType: 'update'
        });

        // Benachrichtigung für Administratoren senden
        const admins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });

        for (const admin of admins) {
            await createNotificationIfEnabled({
                userId: admin.id,
                title: 'Benutzerrollen aktualisiert',
                message: `Die Rollen für "${updatedUser.firstName} ${updatedUser.lastName}" wurden aktualisiert.`,
                type: NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'update'
            });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Error in updateUserRoles:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Benutzerrollen', 
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
        console.error('Error in updateUserSettings:', error);
        res.status(500).json({ 
            message: 'Fehler beim Aktualisieren der Benutzereinstellungen', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

export const updateInvoiceSettings = async (req: AuthenticatedRequest & { body: UpdateInvoiceSettingsRequest }, res: Response) => {
    try {
        console.log('DEBUG updateInvoiceSettings:', {
            userId: req.userId,
            userIdType: typeof req.userId,
            userObject: req.user?.id,
            body: req.body
        });
        
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            console.error('ERROR: userId is NaN', { 
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
        console.error('Error in updateInvoiceSettings:', error);
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

        // Prüfen, ob die Rolle dem Benutzer zugewiesen ist
        const userRole = await prisma.userRole.findFirst({
            where: {
                userId,
                roleId
            }
        });

        if (!userRole) {
            return res.status(404).json({
                message: 'Diese Rolle ist dem Benutzer nicht zugewiesen'
            });
        }
        
        // Transaktion starten
        await prisma.$transaction(async (tx) => {
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
        });

        // Benutzer mit aktualisierten Rollen zurückgeben
        const updatedUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: true
                            }
                        }
                    }
                },
                settings: true
            }
        });

        return res.json(updatedUser);
    } catch (error) {
        console.error('Error in switchUserRole:', error);
        res.status(500).json({ 
            message: 'Fehler beim Wechseln der Benutzerrolle', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Neuen Benutzer erstellen (für Admin-Bereich)
export const createUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password, firstName, lastName, roleIds, branchIds } = req.body;

        // Validiere erforderliche Felder
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                message: 'Alle Pflichtfelder müssen ausgefüllt sein'
            });
        }

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

        // Erstelle den Benutzer
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password, // In der Praxis sollte das Passwort gehasht werden
                firstName,
                lastName,
                roles: {
                    create: (roleIds || [999]).map(roleId => ({
                        role: {
                            connect: { id: Number(roleId) }
                        }
                    }))
                },
                branches: {
                    create: (branchIds || []).map(branchId => ({
                        branch: {
                            connect: { id: Number(branchId) }
                        }
                    }))
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
                },
                branches: {
                    include: {
                        branch: true
                    }
                }
            }
        });

        // Benachrichtigung für Administratoren senden
        const admins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });

        for (const admin of admins) {
            await createNotificationIfEnabled({
                userId: admin.id,
                title: 'Neuer Benutzer erstellt',
                message: `Ein neuer Benutzer "${firstName} ${lastName}" (${username}) wurde erstellt.`,
                type: NotificationType.user,
                relatedEntityId: user.id,
                relatedEntityType: 'create'
            });
        }

        res.status(201).json(user);
    } catch (error) {
        console.error('Error in createUser:', error);
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

        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary } = req.body;

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
            ...(contract && { contract }),
            ...(salary && { salary: parseFloat(salary.toString()) })
        };

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

        // Benachrichtigung für den aktualisierten Benutzer senden
        await createNotificationIfEnabled({
            userId: updatedUser.id,
            title: 'Dein Profil wurde aktualisiert',
            message: 'Dein Benutzerprofil wurde aktualisiert.',
            type: NotificationType.user,
            relatedEntityId: updatedUser.id,
            relatedEntityType: 'update'
        });

        // Benachrichtigung für Administratoren senden
        const admins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });

        for (const admin of admins) {
            await createNotificationIfEnabled({
                userId: admin.id,
                title: 'Benutzerprofil aktualisiert',
                message: `Das Profil von "${updatedUser.firstName} ${updatedUser.lastName}" wurde aktualisiert.`,
                type: NotificationType.user,
                relatedEntityId: updatedUser.id,
                relatedEntityType: 'update'
            });
        }

        res.json(updatedUser);
    } catch (error) {
        console.error('Error in updateUser:', error);
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

        // Benachrichtigung für Administratoren senden
        const admins = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });

        for (const admin of admins) {
            await createNotificationIfEnabled({
                userId: admin.id,
                title: 'Benutzer gelöscht',
                message: `Der Benutzer "${user.firstName} ${user.lastName}" (${user.username}) wurde gelöscht.`,
                type: NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'delete'
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 