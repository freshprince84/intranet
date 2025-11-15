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
exports.authenticateToken = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key';
/**
 * Authentication middleware to verify the JWT token
 * and attach the user to the request object.
 */
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'Authentifizierung erforderlich' });
        }
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Token erforderlich' });
        }
        // Verify the token
        const decoded = jsonwebtoken_1.default.verify(token, SECRET_KEY);
        // Get the user with roles, including the active role
        const user = yield prisma.user.findUnique({
            where: { id: decoded.userId },
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
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Attach the user to the request object
        req.user = user;
        // Set compatibility fields for legacy code
        req.userId = String(user.id);
        // Find and set active role
        const activeRole = user.roles.find(r => r.lastUsed);
        if (activeRole) {
            req.roleId = String(activeRole.role.id);
            // Logging entfernt: Zu viele Logs bei jedem Request
            // Nur bei Fehlern loggen (siehe else-Block)
        }
        else {
            // Nur bei Fehlern loggen (wenn keine aktive Rolle gefunden)
            console.error(`[authMiddleware] ❌ Keine aktive Rolle gefunden für User ${user.id}`);
            console.error(`[authMiddleware] Verfügbare Rollen: ${user.roles.length}`);
            user.roles.forEach(r => {
                console.error(`   - ${r.role.name} (ID: ${r.role.id}), lastUsed: ${r.lastUsed}`);
            });
        }
        next();
    }
    catch (error) {
        console.error('Fehler in der Auth-Middleware:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Ungültiger Token' });
        }
        else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token abgelaufen' });
        }
        res.status(500).json({ message: 'Server-Fehler bei der Authentifizierung' });
    }
});
exports.authMiddleware = authMiddleware;
// Exportiere auch unter dem alten Namen für Abwärtskompatibilität
exports.authenticateToken = exports.authMiddleware;
exports.default = exports.authMiddleware;
//# sourceMappingURL=auth.js.map