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
        // Finde die Hamburger-Rolle mit ID 999
        const hamburgerRole = yield prisma.role.findUnique({
            where: { id: 999 }
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
                },
                lastUsed: r.lastUsed
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
        console.log(`[LOGIN] Login-Versuch für: ${username}`);
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
            console.log('[LOGIN] Benutzer nicht gefunden');
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }
        console.log(`[LOGIN] Benutzer gefunden: ID=${user.id}, Username=${user.username}`);
        console.log(`[LOGIN] Anzahl zugewiesener Rollen: ${user.roles.length}`);
        user.roles.forEach((role, index) => {
            console.log(`[LOGIN] Rolle ${index + 1}: ID=${role.roleId}, Name=${role.role.name}, lastUsed=${role.lastUsed}`);
        });
        // Überprüfe das Passwort
        const isValid = yield bcrypt_1.default.compare(password, user.password);
        if (!isValid) {
            console.log('[LOGIN] Passwort ungültig');
            return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen' });
        }
        console.log('[LOGIN] Passwort korrekt');
        // Finde die aktive Rolle
        let activeRole = user.roles.find(r => r.lastUsed === true);
        if (activeRole) {
            console.log(`[LOGIN] Aktive Rolle gefunden: ID=${activeRole.roleId}, Name=${activeRole.role.name}`);
        }
        else {
            console.log('[LOGIN] Keine aktive Rolle (lastUsed=true) gefunden');
            // Wenn keine aktive Rolle gefunden wurde, aber der Benutzer hat Rollen
            if (user.roles.length > 0) {
                console.log('[LOGIN] Benutzer hat Rollen, aber keine ist aktiv. Wähle Rolle mit niedrigster ID.');
                // Sortiere die Rollen nach ID aufsteigend (niedrigste ID zuerst)
                const sortedRoles = [...user.roles].sort((a, b) => a.roleId - b.roleId);
                const roleToActivate = sortedRoles[0]; // Rolle mit der niedrigsten ID
                console.log(`[LOGIN] Aktiviere Rolle mit niedrigster ID: ID=${roleToActivate.roleId}, Name=${roleToActivate.role.name}`);
                try {
                    // Aktualisiere den UserRole-Eintrag in der Datenbank
                    yield prisma.userRole.update({
                        where: { id: roleToActivate.id },
                        data: { lastUsed: true }
                    });
                    console.log(`[LOGIN] Rolle ID=${roleToActivate.roleId} wurde auf lastUsed=true gesetzt`);
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
        // Wenn wir hier ankommen, haben wir eine aktive Rolle
        console.log(`[LOGIN] Aktive Rolle für Token: ID=${activeRole.roleId}, Name=${activeRole.role.name}`);
        // Erstelle den JWT-Token mit Benutzer-ID und Rollen-ID
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            roleId: activeRole.roleId
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
        console.log(`[LOGIN] JWT-Token erstellt für Benutzer ID=${user.id} mit Rolle ID=${activeRole.roleId}`);
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
        console.log('[LOGIN] Prüfe Berechtigungsformat im userResponse:');
        userResponse.roles.forEach((roleData, idx) => {
            console.log(`[LOGIN] Rolle ${idx + 1}: ${roleData.role.name}`);
            roleData.role.permissions.forEach((perm, permIdx) => {
                console.log(`[LOGIN] Permission ${permIdx + 1}:`, JSON.stringify(perm));
            });
        });
        console.log('[LOGIN] Login erfolgreich');
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
        console.log('Logout-Anfrage erhalten');
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
                },
                lastUsed: r.lastUsed
            }))
        };
        console.log('[getCurrentUser] Prüfe Berechtigungsformat im userResponse:');
        userResponse.roles.forEach((roleData, idx) => {
            console.log(`[getCurrentUser] Rolle ${idx + 1}: ${roleData.role.name}`);
            roleData.role.permissions.forEach((perm, permIdx) => {
                console.log(`[getCurrentUser] Permission ${permIdx + 1}:`, JSON.stringify(perm));
            });
        });
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