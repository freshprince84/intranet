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
exports.isTeamManager = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Middleware zur Überprüfung, ob ein Benutzer die Berechtigung hat, als Team-Manager zu agieren
 */
const isTeamManager = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Hole den Benutzer mit seiner aktiven Rolle und deren Berechtigungen
        const user = yield prisma.user.findUnique({
            where: { id: Number(userId) },
            include: {
                roles: {
                    where: { lastUsed: true },
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
        if (!user || user.roles.length === 0) {
            return res.status(403).json({ message: 'Keine aktive Rolle gefunden' });
        }
        // Prüfe, ob der Benutzer die Berechtigung für team_worktime_control hat
        const activeRole = user.roles[0].role;
        const hasTeamWorktimeControlPermission = activeRole.permissions.some(permission => permission.entity === 'team_worktime_control' &&
            permission.entityType === 'page' &&
            (permission.accessLevel === 'both' || permission.accessLevel === 'write'));
        // Prüfe, ob der Benutzer die Berechtigung für team_worktime hat
        const hasTeamWorktimePermission = activeRole.permissions.some(permission => permission.entity === 'team_worktime' &&
            permission.entityType === 'table' &&
            (permission.accessLevel === 'both' || permission.accessLevel === 'write'));
        if (!hasTeamWorktimeControlPermission || !hasTeamWorktimePermission) {
            return res.status(403).json({ message: 'Keine ausreichenden Berechtigungen für Team Worktime Control' });
        }
        // Benutzer hat die erforderlichen Berechtigungen
        next();
    }
    catch (error) {
        console.error('Fehler bei der Überprüfung der Team-Manager-Berechtigung:', error);
        res.status(500).json({ message: 'Interner Serverfehler' });
    }
});
exports.isTeamManager = isTeamManager;
//# sourceMappingURL=isTeamManager.js.map