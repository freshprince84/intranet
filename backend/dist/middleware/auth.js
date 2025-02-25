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
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Die globale Interface-Definition wird aus express.d.ts verwendet
const authMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Auth Headers:', req.headers); // Debug-Log
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Keine Auth Header gefunden oder falsches Format'); // Debug-Log
            return res.status(401).json({ message: 'Keine Authentifizierung vorhanden' });
        }
        const token = authHeader.split(' ')[1];
        console.log('Token gefunden:', token.substring(0, 20) + '...'); // Debug-Log
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        console.log('Token decoded:', decoded); // Debug-Log
        const user = yield prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            console.log('Benutzer nicht gefunden für ID:', decoded.userId); // Debug-Log
            return res.status(401).json({ message: 'Benutzer nicht gefunden' });
        }
        req.userId = decoded.userId;
        next();
    }
    catch (error) {
        console.error('Auth-Middleware Fehler:', error); // Debug-Log
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        res.status(401).json({ message: 'Ungültiger Token', error: errorMessage });
    }
});
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map