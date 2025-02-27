"use strict";
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
exports.authMiddleware = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Middleware zur Überprüfung des JWT-Tokens
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Auth Headers:', req.headers);
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Kein Token bereitgestellt' });
        }
        console.log('Token gefunden:', token.substring(0, 20) + '...');
        // JWT-Secret aus der Umgebungsvariable
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.error('JWT_SECRET ist nicht definiert');
            return res.status(500).json({ message: 'Interner Server-Fehler' });
        }
        // Token verifizieren
        jsonwebtoken_1.default.verify(token, secret, (err, decoded) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                console.error('Token-Verifizierung fehlgeschlagen:', err);
                return res.status(403).json({ message: 'Ungültiges oder abgelaufenes Token' });
            }
            console.log('Token decoded:', decoded);
            // Für Abwärtskompatibilität
            if (decoded.userId) {
                req.userId = decoded.userId.toString(); // Als String speichern
                req.roleId = decoded.roleId.toString(); // Als String speichern
                console.log('Typ von req.userId:', typeof req.userId, 'Wert:', req.userId);
                console.log('Typ von req.roleId:', typeof req.roleId, 'Wert:', req.roleId);
            }
            // Benutzer aus der Datenbank abrufen
            const user = yield prisma.user.findUnique({
                where: { id: Number(decoded.userId) },
                include: {
                    roles: {
                        include: {
                            role: true
                        }
                    }
                }
            });
            if (!user) {
                return res.status(404).json({ message: 'Benutzer nicht gefunden' });
            }
            // Benutzerinformationen zum Request hinzufügen
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                roles: user.roles.map(ur => ur.role.name)
            };
            next();
        }));
    }
    catch (error) {
        console.error('Fehler bei der Authentifizierung:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.authenticateToken = authenticateToken;
// Export der Middleware unter beiden Namen für Kompatibilität
exports.authMiddleware = exports.authenticateToken;
//# sourceMappingURL=auth.js.map