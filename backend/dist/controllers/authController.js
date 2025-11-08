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
exports.getCurrentUser = exports.logout = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
                                permissions: true
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
                    permissions: r.role.permissions
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
//# sourceMappingURL=authController.js.map