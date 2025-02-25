// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
    userId: string;
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

// Aktuellen Benutzer abrufen
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = parseInt(req.userId, 10);
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
        console.error('Error in getCurrentUser:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Benutzerprofils', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
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