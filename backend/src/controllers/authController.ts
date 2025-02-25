// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
}

interface LoginRequest {
    username: string;
    password: string;
}

interface UserRoleWithPermissions {
    role: {
        id: number;
        name: string;
        permissions: Array<{
            id: number;
            page: string;
            accessLevel: string;
        }>;
    };
}

interface UserWithRoles {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: UserRoleWithPermissions[];
}

interface AuthenticatedRequest extends Request {
    userId: string;
}

export const register = async (req: Request<{}, {}, RegisterRequest>, res: Response) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;
        console.log('Register-Versuch für:', { username, email, first_name, last_name });
        
        // Finde die Hamburger-Rolle
        const hamburgerRole = await prisma.role.findFirst({
            where: { name: 'hamburger' }
        });

        if (!hamburgerRole) {
            console.log('Hamburger-Rolle nicht gefunden');
            return res.status(500).json({ message: 'Hamburger-Rolle nicht gefunden' });
        }
        
        // Prüfe ob Benutzer bereits existiert
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Benutzername oder E-Mail bereits vergeben' });
        }
        
        // Hash das Passwort
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Erstelle den Benutzer
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                firstName: first_name,
                lastName: last_name,
                roles: {
                    create: {
                        role: {
                            connect: {
                                id: hamburgerRole.id
                            }
                        },
                        lastUsed: true
                    }
                }
            },
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

        console.log('Benutzer erstellt:', { id: user.id, username: user.username });

        // Erstelle Token
        const token = jwt.sign(
            { 
                userId: user.id,
                roleId: hamburgerRole.id
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        const userResponse: UserWithRoles = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles.map(r => ({
                role: {
                    id: r.role.id,
                    name: r.role.name,
                    permissions: r.role.permissions
                }
            }))
        };

        res.status(201).json({
            message: 'Benutzer erfolgreich erstellt',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(400).json({ 
            message: 'Fehler bei der Registrierung', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

export const login = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
    try {
        const { username, password } = req.body;
        console.log('Login-Versuch für:', username);
        
        // Finde den Benutzer mit Rollen
        const user = await prisma.user.findFirst({
            where: { 
                OR: [
                    { username },
                    { email: username }
                ]
            },
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
            console.log('Benutzer nicht gefunden');
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }

        // Überprüfe das Passwort
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            console.log('Passwort ungültig');
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }

        // Finde die aktive Rolle
        const activeRole = user.roles.find(r => r.lastUsed) || user.roles[0];
        
        if (!activeRole) {
            return res.status(401).json({ message: 'Keine Rolle zugewiesen' });
        }

        // Erstelle Token
        const token = jwt.sign(
            { 
                userId: user.id,
                roleId: activeRole.role.id
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        const userResponse: UserWithRoles = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles.map(r => ({
                role: {
                    id: r.role.id,
                    name: r.role.name,
                    permissions: r.role.permissions
                }
            }))
        };

        res.json({
            message: 'Login erfolgreich',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).json({ 
            message: 'Fehler beim Login', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

export const logout = async (_req: Request, res: Response) => {
    try {
        res.json({ message: 'Logout erfolgreich' });
    } catch (error) {
        res.status(500).json({ 
            message: 'Fehler beim Logout', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        
        console.log('getCurrentUser für ID:', userId);
        
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

        const userResponse: UserWithRoles = {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roles.map(r => ({
                role: {
                    id: r.role.id,
                    name: r.role.name,
                    permissions: r.role.permissions
                }
            }))
        };

        res.json({ user: userResponse });
    } catch (error) {
        console.error('getCurrentUser Fehler:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Benutzers', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 