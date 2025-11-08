// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient, Prisma } from '@prisma/client';
import { sendRegistrationEmail, sendPasswordResetEmail } from '../services/emailService';

const prisma = new PrismaClient();

interface RegisterRequest {
    email: string;
    password: string;
    // Optional fields - werden nicht mehr vom Frontend gesendet
    username?: string;
    first_name?: string;
    last_name?: string;
    language?: string;
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
            entity: string;
            entityType: string;
            accessLevel: string;
        }>;
    };
    lastUsed?: boolean;
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
        const { email, password, username, first_name, last_name, language } = req.body;
        
        // Email als Username verwenden wenn kein Username angegeben
        const finalUsername = username || email;
        
        // Finde die User-Rolle mit ID 2 (Standard-Rolle für neue Benutzer)
        const userRole = await prisma.role.findUnique({
            where: { id: 2 }
        });

        if (!userRole) {
            console.error('User-Rolle nicht gefunden');
            return res.status(500).json({ message: 'User-Rolle nicht gefunden' });
        }
        
        // Prüfe ob Benutzer bereits existiert
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: finalUsername },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Benutzername oder E-Mail bereits vergeben' });
        }
        
        // Hash das Passwort
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Validiere Sprache (nur unterstützte Sprachen erlauben)
        const supportedLanguages = ['de', 'es', 'en'];
        const validLanguage = language && supportedLanguages.includes(language) ? language : 'es'; // Default: es
        
        // Erstelle den Benutzer
        const user = await prisma.user.create({
            data: {
                username: finalUsername,
                email,
                password: hashedPassword,
                firstName: first_name || null,
                lastName: last_name || null,
                language: validLanguage,
                roles: {
                    create: {
                        role: {
                            connect: {
                                id: userRole.id
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

        // Erstelle Token
        const token = jwt.sign(
            { 
                userId: user.id,
                roleId: userRole.id
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
                },
                lastUsed: r.lastUsed
            }))
        };

        // 📧 E-Mail mit Anmeldeinformationen versenden (asynchron, blockiert nicht die Response)
        sendRegistrationEmail(user.email, finalUsername, password).catch((error) => {
            console.error('Fehler beim Versenden der Registrierungs-E-Mail:', error);
            // E-Mail-Fehler blockieren nicht die Registrierung
        });

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
        let { username, password } = req.body;
        
        // Whitespace entfernen
        username = username?.trim();
        password = password?.trim();
        
        // Finde den Benutzer mit Rollen (case-insensitive für username und email)
        const user = await prisma.user.findFirst({
            where: { 
                OR: [
                    { username: { equals: username, mode: 'insensitive' } },
                    { email: { equals: username, mode: 'insensitive' } }
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
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }

        // Überprüfe das Passwort
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }
        
        // Finde die aktive Rolle
        let activeRole = user.roles.find(r => r.lastUsed === true);
        
        if (!activeRole) {
            // Wenn keine aktive Rolle gefunden wurde, aber der Benutzer hat Rollen
            if (user.roles.length > 0) {
                // Sortiere die Rollen nach ID aufsteigend (niedrigste ID zuerst)
                const sortedRoles = [...user.roles].sort((a, b) => a.roleId - b.roleId);
                const roleToActivate = sortedRoles[0];  // Rolle mit der niedrigsten ID
                
                try {
                    // Aktualisiere den UserRole-Eintrag in der Datenbank
                    await prisma.userRole.update({
                        where: { id: roleToActivate.id },
                        data: { lastUsed: true }
                    });
                    
                    activeRole = { ...roleToActivate, lastUsed: true };
                } catch (error) {
                    console.error('[LOGIN] Fehler beim Aktualisieren des UserRole-Eintrags:', error);
                    return res.status(500).json({ 
                        message: 'Fehler bei der Rollenzuweisung',
                        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
                    });
                }
            }
        }
        
        // Nach allen Versuchen, eine aktive Rolle zu finden oder zuzuweisen, überprüfen wir nochmals
        if (!activeRole) {
            console.error('[LOGIN] Kritischer Fehler: Keine aktive Rolle konnte zugewiesen werden');
            return res.status(500).json({ 
                message: 'Kritischer Fehler: Keine Rolle konnte zugewiesen werden'
            });
        }
        
        // Erstelle den JWT-Token mit Benutzer-ID und Rollen-ID
        const token = jwt.sign(
            { 
                userId: user.id,
                roleId: activeRole.roleId
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        // Bereite die Benutzerinformationen für die Antwort vor
        const userResponse = {
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
                },
                lastUsed: r.lastUsed
            }))
        };
        
        // Sende die Antwort an den Client
        res.json({
            message: 'Login erfolgreich',
            token,
            user: userResponse
        });
    } catch (error) {
        console.error('[LOGIN] Unbehandelter Fehler:', error);
        res.status(500).json({ 
            message: 'Fehler beim Login', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

export const logout = async (_req: Request, res: Response) => {
    try {
        return res.status(200).json({ message: 'Logout erfolgreich' });
    } catch (error) {
        console.error('Logout-Fehler:', error);
        return res.status(500).json({ 
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
                },
                lastUsed: r.lastUsed
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

interface RequestPasswordResetRequest {
    email: string;
}

interface ResetPasswordRequest {
    token: string;
    password: string;
}

/**
 * Anfrage zum Zurücksetzen des Passworts
 * Sendet eine E-Mail mit Reset-Link an die hinterlegte E-Mail-Adresse des Benutzers
 */
export const requestPasswordReset = async (req: Request<{}, {}, RequestPasswordResetRequest>, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'E-Mail-Adresse ist erforderlich' });
        }

        // Validiere E-Mail-Format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Ungültiges E-Mail-Format' });
        }

        // Finde den Benutzer anhand der E-Mail-Adresse (case-insensitive)
        const user = await prisma.user.findFirst({
            where: {
                email: { equals: email, mode: 'insensitive' }
            }
        });

        // WICHTIG: Immer die gleiche Erfolgsmeldung zurückgeben, auch wenn der Benutzer nicht existiert
        // Dies verhindert, dass Angreifer herausfinden können, welche E-Mail-Adressen im System registriert sind
        const successMessage = 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.';

        if (!user) {
            // Logge intern, aber sende keine Fehlermeldung
            console.log(`[PASSWORD_RESET] Passwort-Reset-Anfrage für nicht existierende E-Mail: ${email}`);
            return res.status(200).json({ message: successMessage });
        }

        // Generiere einen sicheren Token (32 Bytes = 44 Zeichen Base64)
        const token = crypto.randomBytes(32).toString('base64url');
        
        // Setze Ablaufzeit auf 1 Stunde
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Speichere Token in der Datenbank
        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: token,
                expiresAt: expiresAt
            }
        });

        // Generiere Reset-Link
        // Frontend-URL aus Umgebungsvariable oder Standardwert
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;

        // Sende E-Mail (asynchron, blockiert nicht die Response)
        sendPasswordResetEmail(user.email, user.username, resetLink).catch((error) => {
            console.error('Fehler beim Versenden der Passwort-Reset-E-Mail:', error);
            // E-Mail-Fehler blockieren nicht die Response
        });

        console.log(`[PASSWORD_RESET] Passwort-Reset-Token erstellt für Benutzer: ${user.username} (${user.email})`);

        res.status(200).json({ message: successMessage });
    } catch (error) {
        console.error('[PASSWORD_RESET] Fehler bei Passwort-Reset-Anfrage:', error);
        // Auch bei Fehlern die gleiche Erfolgsmeldung zurückgeben (Sicherheit)
        res.status(200).json({ 
            message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.'
        });
    }
};

/**
 * Setzt das Passwort mit einem gültigen Token zurück
 */
export const resetPassword = async (req: Request<{}, {}, ResetPasswordRequest>, res: Response) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token und Passwort sind erforderlich' });
        }

        // Validiere Passwort (Mindestlänge 8 Zeichen)
        if (password.length < 8) {
            return res.status(400).json({ message: 'Passwort muss mindestens 8 Zeichen lang sein' });
        }

        // Finde Token in der Datenbank
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token: token },
            include: { user: true }
        });

        if (!resetToken) {
            return res.status(400).json({ message: 'Ungültiger oder abgelaufener Token' });
        }

        // Prüfe, ob Token bereits verwendet wurde
        if (resetToken.used) {
            return res.status(400).json({ message: 'Dieser Token wurde bereits verwendet' });
        }

        // Prüfe, ob Token abgelaufen ist
        if (resetToken.expiresAt < new Date()) {
            return res.status(400).json({ message: 'Ungültiger oder abgelaufener Token' });
        }

        // Hash das neue Passwort
        const hashedPassword = await bcrypt.hash(password, 10);

        // Aktualisiere das Passwort und markiere Token als verwendet (in einer Transaktion)
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword }
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { used: true }
            })
        ]);

        console.log(`[PASSWORD_RESET] Passwort erfolgreich zurückgesetzt für Benutzer: ${resetToken.user.username} (${resetToken.user.email})`);

        res.status(200).json({ message: 'Passwort wurde erfolgreich zurückgesetzt. Sie können sich jetzt mit dem neuen Passwort anmelden.' });
    } catch (error) {
        console.error('[PASSWORD_RESET] Fehler beim Zurücksetzen des Passworts:', error);
        res.status(500).json({ 
            message: 'Fehler beim Zurücksetzen des Passworts', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 