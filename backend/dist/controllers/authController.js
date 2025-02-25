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
const prisma = new client_1.PrismaClient();
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, first_name, last_name } = req.body;
        console.log('Register-Versuch für:', { username, email, first_name, last_name });
        // Finde die Hamburger-Rolle
        const hamburgerRole = yield prisma.role.findFirst({
            where: { name: 'hamburger' }
        });
        if (!hamburgerRole) {
            console.log('Hamburger-Rolle nicht gefunden');
            return res.status(500).json({ message: 'Hamburger-Rolle nicht gefunden' });
        }
        // Prüfe ob Benutzer bereits existiert
        const existingUser = yield prisma.user.findFirst({
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
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Erstelle den Benutzer
        const user = yield prisma.user.create({
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            roleId: hamburgerRole.id
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
                }
            }))
        };
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
        const { username, password } = req.body;
        console.log('Login-Versuch für:', username);
        // Finde den Benutzer mit Rollen
        const user = yield prisma.user.findFirst({
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
        const isValid = yield bcrypt_1.default.compare(password, user.password);
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
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            roleId: activeRole.role.id
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
                }
            }))
        };
        res.json({
            message: 'Login erfolgreich',
            token,
            user: userResponse
        });
    }
    catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).json({
            message: 'Fehler beim Login',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.login = login;
const logout = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        res.json({ message: 'Logout erfolgreich' });
    }
    catch (error) {
        res.status(500).json({
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
        console.log('getCurrentUser für ID:', userId);
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
                }
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