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
exports.getPasswordEntryAuditLogs = exports.generatePassword = exports.deletePasswordEntry = exports.updatePasswordEntry = exports.createPasswordEntry = exports.getPasswordEntryPassword = exports.getPasswordEntry = exports.getAllPasswordEntries = void 0;
const prisma_1 = require("../utils/prisma");
const encryption_1 = require("../utils/encryption");
/**
 * Prüft, ob User/Rolle Zugriff auf einen Passwort-Eintrag hat
 */
const checkPasswordEntryPermission = (userId, roleId, entryId, requiredPermission) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const entry = yield prisma_1.prisma.passwordEntry.findUnique({
            where: { id: entryId },
            include: {
                rolePermissions: {
                    where: roleId ? { roleId } : undefined
                },
                userPermissions: {
                    where: { userId }
                }
            }
        });
        if (!entry) {
            return false;
        }
        // Prüfe User-Permissions (höchste Priorität)
        const userPermission = entry.userPermissions.find(p => p.userId === userId);
        if (userPermission) {
            if (requiredPermission === 'view' && userPermission.canView)
                return true;
            if (requiredPermission === 'edit' && userPermission.canEdit)
                return true;
            if (requiredPermission === 'delete' && userPermission.canDelete)
                return true;
        }
        // Prüfe Role-Permissions
        if (roleId) {
            const rolePermission = entry.rolePermissions.find(p => p.roleId === roleId);
            if (rolePermission) {
                if (requiredPermission === 'view' && rolePermission.canView)
                    return true;
                if (requiredPermission === 'edit' && rolePermission.canEdit)
                    return true;
                if (requiredPermission === 'delete' && rolePermission.canDelete)
                    return true;
            }
        }
        // Prüfe ob User der Creator ist (hat automatisch alle Rechte)
        if (entry.createdById === userId) {
            return true;
        }
        return false;
    }
    catch (error) {
        console.error('Error checking password entry permission:', error);
        return false;
    }
});
/**
 * Erstellt Audit-Log
 */
const createAuditLog = (entryId, userId, action, details, ipAddress, userAgent) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield prisma_1.prisma.passwordEntryAuditLog.create({
            data: {
                entryId,
                userId,
                action,
                details: details ? JSON.parse(JSON.stringify(details)) : null,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null
            }
        });
    }
    catch (error) {
        console.error('Error creating audit log:', error);
        // Nicht kritisch, weiter machen
    }
});
/**
 * Alle Passwort-Einträge abrufen (nur Metadaten, keine Passwörter)
 */
const getAllPasswordEntries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = req.roleId ? parseInt(req.roleId, 10) : undefined;
        const organizationId = req.organizationId;
        // Hole alle Einträge, die der User sehen darf
        const allEntries = yield prisma_1.prisma.passwordEntry.findMany({
            where: organizationId ? { organizationId } : {},
            include: {
                rolePermissions: roleId ? {
                    where: { roleId }
                } : true,
                userPermissions: {
                    where: { userId }
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        // Filtere nach Berechtigungen
        const visibleEntries = [];
        for (const entry of allEntries) {
            // Prüfe ob User der Creator ist
            if (entry.createdById === userId) {
                visibleEntries.push({
                    id: entry.id,
                    title: entry.title,
                    url: entry.url,
                    username: entry.username,
                    notes: entry.notes,
                    organizationId: entry.organizationId,
                    createdById: entry.createdById,
                    createdBy: entry.createdBy,
                    createdAt: entry.createdAt,
                    updatedAt: entry.updatedAt
                });
                continue;
            }
            // Prüfe User-Permissions
            const userPermission = entry.userPermissions.find(p => p.userId === userId);
            if (userPermission && userPermission.canView) {
                visibleEntries.push({
                    id: entry.id,
                    title: entry.title,
                    url: entry.url,
                    username: entry.username,
                    notes: entry.notes,
                    organizationId: entry.organizationId,
                    createdById: entry.createdById,
                    createdBy: entry.createdBy,
                    createdAt: entry.createdAt,
                    updatedAt: entry.updatedAt
                });
                continue;
            }
            // Prüfe Role-Permissions
            if (roleId) {
                const rolePermission = entry.rolePermissions.find(p => p.roleId === roleId);
                if (rolePermission && rolePermission.canView) {
                    visibleEntries.push({
                        id: entry.id,
                        title: entry.title,
                        url: entry.url,
                        username: entry.username,
                        notes: entry.notes,
                        organizationId: entry.organizationId,
                        createdById: entry.createdById,
                        createdBy: entry.createdBy,
                        createdAt: entry.createdAt,
                        updatedAt: entry.updatedAt
                    });
                }
            }
        }
        res.json(visibleEntries);
    }
    catch (error) {
        console.error('Error getting password entries:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Passwort-Einträge' });
    }
});
exports.getAllPasswordEntries = getAllPasswordEntries;
/**
 * Einzelnen Passwort-Eintrag abrufen (mit Passwort, wenn berechtigt)
 */
const getPasswordEntry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = req.roleId ? parseInt(req.roleId, 10) : undefined;
        const entryId = parseInt(req.params.id, 10);
        // Prüfe Berechtigung
        const hasPermission = yield checkPasswordEntryPermission(userId, roleId, entryId, 'view');
        if (!hasPermission) {
            return res.status(403).json({ message: 'Keine Berechtigung für diesen Eintrag' });
        }
        const entry = yield prisma_1.prisma.passwordEntry.findUnique({
            where: { id: entryId },
            include: {
                rolePermissions: {
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                userPermissions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        if (!entry) {
            return res.status(404).json({ message: 'Eintrag nicht gefunden' });
        }
        // Entschlüssele Passwort
        let decryptedPassword = null;
        try {
            decryptedPassword = (0, encryption_1.decryptSecret)(entry.password);
        }
        catch (error) {
            console.error('Error decrypting password:', error);
            return res.status(500).json({ message: 'Fehler beim Entschlüsseln des Passworts' });
        }
        // Audit-Log erstellen
        yield createAuditLog(entryId, userId, 'view', undefined, req.ip, req.get('user-agent'));
        res.json(Object.assign(Object.assign({}, entry), { password: decryptedPassword }));
    }
    catch (error) {
        console.error('Error getting password entry:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Passwort-Eintrags' });
    }
});
exports.getPasswordEntry = getPasswordEntry;
/**
 * Nur Passwort abrufen (für "Passwort anzeigen" Button)
 */
const getPasswordEntryPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = req.roleId ? parseInt(req.roleId, 10) : undefined;
        const entryId = parseInt(req.params.id, 10);
        // Prüfe Berechtigung
        const hasPermission = yield checkPasswordEntryPermission(userId, roleId, entryId, 'view');
        if (!hasPermission) {
            return res.status(403).json({ message: 'Keine Berechtigung für diesen Eintrag' });
        }
        const entry = yield prisma_1.prisma.passwordEntry.findUnique({
            where: { id: entryId },
            select: {
                id: true,
                password: true
            }
        });
        if (!entry) {
            return res.status(404).json({ message: 'Eintrag nicht gefunden' });
        }
        // Entschlüssele Passwort
        let decryptedPassword;
        try {
            decryptedPassword = (0, encryption_1.decryptSecret)(entry.password);
        }
        catch (error) {
            console.error('Error decrypting password:', error);
            return res.status(500).json({ message: 'Fehler beim Entschlüsseln des Passworts' });
        }
        // Audit-Log erstellen
        yield createAuditLog(entryId, userId, 'view_password', undefined, req.ip, req.get('user-agent'));
        res.json({
            password: decryptedPassword
        });
    }
    catch (error) {
        console.error('Error getting password:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Passworts' });
    }
});
exports.getPasswordEntryPassword = getPasswordEntryPassword;
/**
 * Neuen Passwort-Eintrag erstellen
 */
const createPasswordEntry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        const { title, url, username, password, notes, rolePermissions, userPermissions } = req.body;
        // Validierung
        if (!title || !password) {
            return res.status(400).json({ message: 'Titel und Passwort sind erforderlich' });
        }
        // Verschlüssele Passwort
        let encryptedPassword;
        try {
            encryptedPassword = (0, encryption_1.encryptSecret)(password);
        }
        catch (error) {
            console.error('Error encrypting password:', error);
            return res.status(500).json({ message: 'Fehler beim Verschlüsseln des Passworts' });
        }
        // Erstelle Eintrag
        const entry = yield prisma_1.prisma.passwordEntry.create({
            data: {
                title,
                url: url || null,
                username: username || null,
                password: encryptedPassword,
                notes: notes || null,
                organizationId: organizationId || null,
                createdById: userId,
                rolePermissions: rolePermissions ? {
                    create: rolePermissions.map((rp) => ({
                        roleId: rp.roleId,
                        canView: rp.canView || false,
                        canEdit: rp.canEdit || false,
                        canDelete: rp.canDelete || false
                    }))
                } : undefined,
                userPermissions: userPermissions ? {
                    create: userPermissions.map((up) => ({
                        userId: up.userId,
                        canView: up.canView || false,
                        canEdit: up.canEdit || false,
                        canDelete: up.canDelete || false
                    }))
                } : undefined
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        // Audit-Log erstellen
        yield createAuditLog(entry.id, userId, 'create', { title, url, username }, req.ip, req.get('user-agent'));
        res.status(201).json(Object.assign(Object.assign({}, entry), { password: undefined // Passwort nicht zurückgeben
         }));
    }
    catch (error) {
        console.error('Error creating password entry:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des Passwort-Eintrags' });
    }
});
exports.createPasswordEntry = createPasswordEntry;
/**
 * Passwort-Eintrag aktualisieren
 */
const updatePasswordEntry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = req.roleId ? parseInt(req.roleId, 10) : undefined;
        const entryId = parseInt(req.params.id, 10);
        const { title, url, username, password, notes } = req.body;
        // Prüfe Berechtigung
        const hasPermission = yield checkPasswordEntryPermission(userId, roleId, entryId, 'edit');
        if (!hasPermission) {
            return res.status(403).json({ message: 'Keine Berechtigung für diesen Eintrag' });
        }
        // Hole alten Eintrag für Audit-Log
        const oldEntry = yield prisma_1.prisma.passwordEntry.findUnique({
            where: { id: entryId }
        });
        if (!oldEntry) {
            return res.status(404).json({ message: 'Eintrag nicht gefunden' });
        }
        // Bereite Update-Daten vor
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (url !== undefined)
            updateData.url = url;
        if (username !== undefined)
            updateData.username = username;
        if (notes !== undefined)
            updateData.notes = notes;
        // Verschlüssele Passwort, falls geändert
        if (password !== undefined) {
            try {
                updateData.password = (0, encryption_1.encryptSecret)(password);
            }
            catch (error) {
                console.error('Error encrypting password:', error);
                return res.status(500).json({ message: 'Fehler beim Verschlüsseln des Passworts' });
            }
        }
        // Aktualisiere Eintrag
        const entry = yield prisma_1.prisma.passwordEntry.update({
            where: { id: entryId },
            data: updateData,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });
        // Erstelle Audit-Log mit Änderungen
        const changes = {};
        if (title !== undefined && title !== oldEntry.title)
            changes.title = { old: oldEntry.title, new: title };
        if (url !== undefined && url !== oldEntry.url)
            changes.url = { old: oldEntry.url, new: url };
        if (username !== undefined && username !== oldEntry.username)
            changes.username = { old: oldEntry.username, new: username };
        if (notes !== undefined && notes !== oldEntry.notes)
            changes.notes = { old: oldEntry.notes, new: notes };
        if (password !== undefined)
            changes.password = { changed: true };
        yield createAuditLog(entryId, userId, 'update', changes, req.ip, req.get('user-agent'));
        res.json(Object.assign(Object.assign({}, entry), { password: undefined // Passwort nicht zurückgeben
         }));
    }
    catch (error) {
        console.error('Error updating password entry:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Passwort-Eintrags' });
    }
});
exports.updatePasswordEntry = updatePasswordEntry;
/**
 * Passwort-Eintrag löschen
 */
const deletePasswordEntry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = req.roleId ? parseInt(req.roleId, 10) : undefined;
        const entryId = parseInt(req.params.id, 10);
        // Prüfe Berechtigung
        const hasPermission = yield checkPasswordEntryPermission(userId, roleId, entryId, 'delete');
        if (!hasPermission) {
            return res.status(403).json({ message: 'Keine Berechtigung für diesen Eintrag' });
        }
        // Hole Eintrag für Audit-Log
        const entry = yield prisma_1.prisma.passwordEntry.findUnique({
            where: { id: entryId }
        });
        if (!entry) {
            return res.status(404).json({ message: 'Eintrag nicht gefunden' });
        }
        // Erstelle Audit-Log vor dem Löschen
        yield createAuditLog(entryId, userId, 'delete', { title: entry.title }, req.ip, req.get('user-agent'));
        // Lösche Eintrag (Cascade löscht auch Permissions und Audit-Logs)
        yield prisma_1.prisma.passwordEntry.delete({
            where: { id: entryId }
        });
        res.json({ message: 'Eintrag erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error deleting password entry:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Passwort-Eintrags' });
    }
});
exports.deletePasswordEntry = deletePasswordEntry;
/**
 * Passwort generieren
 */
const generatePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const length = req.body.length || 16;
        const includeNumbers = req.body.includeNumbers !== false;
        const includeSymbols = req.body.includeSymbols !== false;
        if (length < 8 || length > 128) {
            return res.status(400).json({ message: 'Passwort-Länge muss zwischen 8 und 128 Zeichen liegen' });
        }
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        let charset = lowercase + uppercase;
        if (includeNumbers)
            charset += numbers;
        if (includeSymbols)
            charset += symbols;
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        res.json({ password });
    }
    catch (error) {
        console.error('Error generating password:', error);
        res.status(500).json({ message: 'Fehler beim Generieren des Passworts' });
    }
});
exports.generatePassword = generatePassword;
/**
 * Audit-Logs für Eintrag abrufen
 */
const getPasswordEntryAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const userId = parseInt(req.userId, 10);
        const roleId = req.roleId ? parseInt(req.roleId, 10) : undefined;
        const entryId = parseInt(req.params.id, 10);
        // Prüfe Berechtigung (nur Creator oder Admin)
        const entry = yield prisma_1.prisma.passwordEntry.findUnique({
            where: { id: entryId }
        });
        if (!entry) {
            return res.status(404).json({ message: 'Eintrag nicht gefunden' });
        }
        // Nur Creator oder Admin können Audit-Logs sehen
        if (entry.createdById !== userId) {
            // TODO: Prüfe ob User Admin ist
            return res.status(403).json({ message: 'Keine Berechtigung für Audit-Logs' });
        }
        const auditLogs = yield prisma_1.prisma.passwordEntryAuditLog.findMany({
            where: { entryId },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(auditLogs);
    }
    catch (error) {
        console.error('Error getting audit logs:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Audit-Logs' });
    }
});
exports.getPasswordEntryAuditLogs = getPasswordEntryAuditLogs;
//# sourceMappingURL=passwordManagerController.js.map