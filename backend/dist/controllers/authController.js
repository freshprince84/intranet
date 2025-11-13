"use strict";
// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types
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
exports.resetPassword = exports.requestPasswordReset = exports.getCurrentUser = exports.logout = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const emailService_1 = require("../services/emailService");
const prisma = new client_1.PrismaClient();
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, username, first_name, last_name, language } = req.body;
        // Email als Username verwenden wenn kein Username angegeben
        const finalUsername = username || email;
        // Finde die User-Rolle mit ID 2 (Standard-Rolle für neue Benutzer)
        const userRole = yield prisma.role.findUnique({
            where: { id: 2 }
        });
        if (!userRole) {
            console.error('User-Rolle nicht gefunden');
            return res.status(500).json({ message: 'User-Rolle nicht gefunden' });
        }
        // Prüfe ob Benutzer bereits existiert
        const existingUser = yield prisma.user.findFirst({
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
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Validiere Sprache (nur unterstützte Sprachen erlauben)
        const supportedLanguages = ['de', 'es', 'en'];
        const validLanguage = language && supportedLanguages.includes(language) ? language : 'es'; // Default: es
        // Erstelle den Benutzer
        const user = yield prisma.user.create({
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
        // Erstelle Token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            roleId: userRole.id
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
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
                    permissions: r.role.permissions,
                    organization: r.role.organization ? {
                        id: r.role.organization.id,
                        name: r.role.organization.name,
                        displayName: r.role.organization.displayName
                    } : null
                },
                lastUsed: r.lastUsed
            }))
        };
        // 📧 E-Mail mit Anmeldeinformationen versenden (asynchron, blockiert nicht die Response)
        (0, emailService_1.sendRegistrationEmail)(user.email, finalUsername, password).catch((error) => {
            console.error('Fehler beim Versenden der Registrierungs-E-Mail:', error);
            // E-Mail-Fehler blockieren nicht die Registrierung
        });
        res.status(201).json({
            message: 'Benutzer erfolgreich erstellt',
            token,
            user: userResponse
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(400).json({
            message: 'Fehler bei der Registrierung',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let { username, password } = req.body;
        // Whitespace entfernen
        username = username === null || username === void 0 ? void 0 : username.trim();
        password = password === null || password === void 0 ? void 0 : password.trim();
        // Finde den Benutzer mit Rollen (case-insensitive für username und email)
        const user = yield prisma.user.findFirst({
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
        if (!user) {
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }
        // Überprüfe das Passwort
        const isValid = yield bcrypt_1.default.compare(password, user.password);
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
                const roleToActivate = sortedRoles[0]; // Rolle mit der niedrigsten ID
                try {
                    // Aktualisiere den UserRole-Eintrag in der Datenbank
                    yield prisma.userRole.update({
                        where: { id: roleToActivate.id },
                        data: { lastUsed: true }
                    });
                    activeRole = Object.assign(Object.assign({}, roleToActivate), { lastUsed: true });
                }
                catch (error) {
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            roleId: activeRole.roleId
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
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
                    permissions: r.role.permissions,
                    organization: r.role.organization ? {
                        id: r.role.organization.id,
                        name: r.role.organization.name,
                        displayName: r.role.organization.displayName
                    } : null
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
    }
    catch (error) {
        console.error('[LOGIN] Unbehandelter Fehler:', error);
        res.status(500).json({
            message: 'Fehler beim Login',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.login = login;
const logout = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return res.status(200).json({ message: 'Logout erfolgreich' });
    }
    catch (error) {
        console.error('Logout-Fehler:', error);
        return res.status(500).json({
            message: 'Fehler beim Logout',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.logout = logout;
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const user = yield prisma.user.findUnique({
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
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
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
                    permissions: r.role.permissions,
                    organization: r.role.organization ? {
                        id: r.role.organization.id,
                        name: r.role.organization.name,
                        displayName: r.role.organization.displayName
                    } : null
                },
                lastUsed: r.lastUsed
            }))
        };
        res.json({ user: userResponse });
    }
    catch (error) {
        console.error('getCurrentUser Fehler:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getCurrentUser = getCurrentUser;
/**
 * Anfrage zum Zurücksetzen des Passworts
 * Sendet eine E-Mail mit Reset-Link an die hinterlegte E-Mail-Adresse des Benutzers
 */
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
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
        // Finde den Benutzer anhand der E-Mail-Adresse (case-insensitive) mit Rollen/Organisation
        const user = yield prisma.user.findFirst({
            where: {
                email: { equals: email, mode: 'insensitive' }
            },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                organization: true
                            }
                        }
                    }
                }
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
        const token = crypto_1.default.randomBytes(32).toString('base64url');
        // Setze Ablaufzeit auf 1 Stunde
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        // Speichere Token in der Datenbank
        yield prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: token,
                expiresAt: expiresAt
            }
        });
        // Finde die Organisation des Benutzers (erste aktive Rolle oder erste Rolle)
        let organizationId = undefined;
        console.log(`[PASSWORD_RESET] Benutzer hat ${user.roles.length} Rolle(n)`);
        const activeRole = user.roles.find(r => r.lastUsed === true);
        if ((_a = activeRole === null || activeRole === void 0 ? void 0 : activeRole.role) === null || _a === void 0 ? void 0 : _a.organization) {
            organizationId = activeRole.role.organization.id;
            console.log(`[PASSWORD_RESET] ✅ Verwende Organisation ${organizationId} für SMTP-Einstellungen (aktive Rolle)`);
        }
        else if (user.roles.length > 0 && ((_c = (_b = user.roles[0]) === null || _b === void 0 ? void 0 : _b.role) === null || _c === void 0 ? void 0 : _c.organization)) {
            organizationId = user.roles[0].role.organization.id;
            console.log(`[PASSWORD_RESET] ✅ Verwende Organisation ${organizationId} für SMTP-Einstellungen (erste Rolle)`);
        }
        else {
            console.log(`[PASSWORD_RESET] ⚠️ Keine Organisation gefunden für Benutzer ${user.id}`);
            if (user.roles.length > 0) {
                console.log(`[PASSWORD_RESET] Rollen vorhanden, aber keine Organisation zugeordnet`);
            }
        }
        // Generiere Reset-Link
        // Frontend-URL aus Umgebungsvariable oder Standardwert
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/reset-password?token=${token}`;
        // Sende E-Mail (asynchron, blockiert nicht die Response) mit organisationId
        (0, emailService_1.sendPasswordResetEmail)(user.email, user.username, resetLink, organizationId).catch((error) => {
            console.error('Fehler beim Versenden der Passwort-Reset-E-Mail:', error);
            // E-Mail-Fehler blockieren nicht die Response
        });
        console.log(`[PASSWORD_RESET] Passwort-Reset-Token erstellt für Benutzer: ${user.username} (${user.email})`);
        res.status(200).json({ message: successMessage });
    }
    catch (error) {
        console.error('[PASSWORD_RESET] Fehler bei Passwort-Reset-Anfrage:', error);
        // Auch bei Fehlern die gleiche Erfolgsmeldung zurückgeben (Sicherheit)
        res.status(200).json({
            message: 'Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail mit Anweisungen zum Zurücksetzen des Passworts gesendet.'
        });
    }
});
exports.requestPasswordReset = requestPasswordReset;
/**
 * Setzt das Passwort mit einem gültigen Token zurück
 */
const resetPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const resetToken = yield prisma.passwordResetToken.findUnique({
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
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Aktualisiere das Passwort und markiere Token als verwendet (in einer Transaktion)
        yield prisma.$transaction([
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
    }
    catch (error) {
        console.error('[PASSWORD_RESET] Fehler beim Zurücksetzen des Passworts:', error);
        res.status(500).json({
            message: 'Fehler beim Zurücksetzen des Passworts',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.resetPassword = resetPassword;
//# sourceMappingURL=authController.js.map