// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

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
}

// Interface für die Aktualisierung der Benutzereinstellungen
interface UpdateUserSettingsRequest {
    darkMode?: boolean;
    sidebarCollapsed?: boolean;
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
        
        console.log(`[GET_USER] Abrufen des Benutzers - UserId: ${userId}, RoleId: ${roleId}`);
        
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
                settings: true,
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
            console.log(`[GET_USER] Benutzer mit ID ${userId} nicht gefunden`);
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        
        // Die Rolle aus dem Token als aktive Rolle markieren
        if (!isNaN(roleId)) {
            console.log(`[GET_USER] Markiere Rolle mit ID ${roleId} als aktiv`);
            
            const modifiedUser = {
                ...user,
                roles: user.roles.map(roleEntry => ({
                    ...roleEntry,
                    lastUsed: roleEntry.role.id === roleId
                }))
            };
            
            console.log(`[GET_USER] Benutzer mit aktiver Rolle zurückgeben:`, 
                        `ID=${modifiedUser.id}, Rollen=${modifiedUser.roles.length}, ` +
                        `Aktive Rolle=${modifiedUser.roles.find(r => r.lastUsed)?.role.id}`);
            
            return res.json(modifiedUser);
        }
        
        console.log(`[GET_USER] Benutzer ohne Änderungen zurückgeben:`, 
                    `ID=${user.id}, Rollen=${user.roles.length}, ` +
                    `Aktive Rolle=${user.roles.find(r => r.lastUsed)?.role.id}`);
        
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
            salary
        } = req.body;

        console.log('Updating user with data:', req.body);

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
            ...(salary && { salary: parseFloat(salary.toString()) })
        };

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

        console.log('User updated successfully:', updatedUser);
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
            salary
        } = req.body;

        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }

        console.log('Updating profile with data:', req.body);

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
            ...(salary && { salary: parseFloat(salary) })
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

        console.log('Profile updated successfully:', updatedUser);
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

// Aktive Rolle eines Benutzers wechseln
export const switchUserRole = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        const { roleId } = req.body as SwitchRoleRequest;

        console.log(`Rollenwechsel angefordert - UserId: ${userId}, RoleId: ${roleId}`);
        console.log('Typ der req.userId:', typeof req.userId, 'Wert:', req.userId);

        if (isNaN(userId) || userId <= 0) {
            console.log('Ungültige Benutzer-ID:', req.userId);
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }

        if (isNaN(roleId) || roleId <= 0) {
            console.log('Ungültige Rollen-ID:', roleId);
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }

        // Prüfen, ob die Rolle dem Benutzer zugewiesen ist
        const userRole = await prisma.userRole.findFirst({
            where: {
                userId,
                roleId
            }
        });

        console.log('Gefundene UserRole:', userRole);

        if (!userRole) {
            console.log(`Rolle ${roleId} ist dem Benutzer ${userId} nicht zugewiesen`);
            return res.status(404).json({
                message: 'Diese Rolle ist dem Benutzer nicht zugewiesen'
            });
        }

        console.log('Starte Transaktion für Rollenwechsel...');
        
        // Transaktion starten
        await prisma.$transaction(async (tx) => {
            // Alle Rollen des Benutzers auf lastUsed=false setzen
            const resetResult = await tx.userRole.updateMany({
                where: { userId },
                data: { lastUsed: false }
            });
            
            console.log('Alle Rollen zurückgesetzt:', resetResult);

            // Die ausgewählte Rolle auf lastUsed=true setzen
            const updateResult = await tx.userRole.update({
                where: { id: userRole.id },
                data: { lastUsed: true }
            });
            
            console.log('Rolle aktiviert:', updateResult);
        });

        console.log('Transaktion erfolgreich abgeschlossen');

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

        console.log('Aktualisierter Benutzer:', JSON.stringify(updatedUser, null, 2));
        return res.json(updatedUser);
    } catch (error) {
        console.error('Error in switchUserRole:', error);
        res.status(500).json({ 
            message: 'Fehler beim Wechseln der Benutzerrolle', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 