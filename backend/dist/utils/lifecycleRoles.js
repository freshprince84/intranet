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
exports.hasLifecycleRole = hasLifecycleRole;
exports.isHROrAdmin = isHROrAdmin;
exports.isLegalOrAdmin = isLegalOrAdmin;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Prüft ob User eine bestimmte Lebenszyklus-Rolle hat
 * Nutzt req.organizationId und req.userRole aus organizationMiddleware
 */
function hasLifecycleRole(req, roleType) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!req.organizationId || !req.userRole) {
            return false; // Keine Organisation oder keine aktive Rolle
        }
        // 1. Hole Organization mit settings
        const organization = yield prisma.organization.findUnique({
            where: { id: req.organizationId },
            select: { settings: true }
        });
        if (!organization)
            return false;
        const settings = organization.settings;
        const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
        // 2. Falls keine Konfiguration: Standard-Zuordnung prüfen
        if (!lifecycleRoles) {
            return checkDefaultRoles(req.userRole.role, roleType);
        }
        // 3. Prüfe Rollen-ID gegen konfigurierte Rollen
        const targetRoleId = lifecycleRoles[`${roleType}RoleId`];
        if (!targetRoleId)
            return false;
        // 4. Prüfe ob aktive Rolle die Ziel-Rolle ist
        return req.userRole.roleId === targetRoleId;
    });
}
/**
 * Prüft Standard-Rollen (Fallback wenn keine Konfiguration)
 */
function checkDefaultRoles(role, roleType) {
    const roleName = role.name.toLowerCase();
    if (roleType === 'admin' || roleType === 'hr') {
        // Admin oder HR: Suche nach Admin-Rolle
        return roleName.includes('admin') || roleName.includes('administrator');
    }
    if (roleType === 'legal') {
        // Legal: Suche nach "Derecho"-Rolle
        return roleName === 'derecho';
    }
    return false;
}
/**
 * Prüft ob User HR oder Admin ist
 */
function isHROrAdmin(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const isHR = yield hasLifecycleRole(req, 'hr');
        const isAdmin = yield hasLifecycleRole(req, 'admin');
        return isHR || isAdmin;
    });
}
/**
 * Prüft ob User Legal oder Admin ist
 */
function isLegalOrAdmin(req) {
    return __awaiter(this, void 0, void 0, function* () {
        const isLegal = yield hasLifecycleRole(req, 'legal');
        const isAdmin = yield hasLifecycleRole(req, 'admin');
        return isLegal || isAdmin;
    });
}
//# sourceMappingURL=lifecycleRoles.js.map