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
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = void 0;
const prisma_1 = require("../utils/prisma");
const adminMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // Von der authMiddleware gesetzt
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const user = yield prisma_1.prisma.user.findUnique({
            where: { id: Number(userId) },
            include: {
                roles: true
            }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        const userWithRoles = user;
        const isAdmin = userWithRoles.roles.some((role) => role.name === 'admin');
        if (!isAdmin) {
            return res.status(403).json({ message: 'Keine Administratorrechte' });
        }
        next();
    }
    catch (error) {
        console.error('Fehler in der Admin-Middleware:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
});
exports.adminMiddleware = adminMiddleware;
//# sourceMappingURL=admin.js.map