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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.createUser = exports.switchUserRole = exports.updateUserSettings = exports.updateUserRoles = exports.updateProfile = exports.updateUserById = exports.getCurrentUser = exports.getUserById = exports.getAllUsers = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const prisma = new client_1.PrismaClient();
// Alle Benutzer abrufen
const getAllUsers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true
            }
        });
        res.json(users);
    }
    catch (error) {
        console.error('Error in getAllUsers:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Benutzer',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllUsers = getAllUsers;
// Spezifischen Benutzer abrufen
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
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
        res.json(user);
    }
    catch (error) {
        console.error('Error in getUserById:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getUserById = getUserById;
// Aktuellen Benutzer abrufen
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10); // Die roleId aus dem Token lesen
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                birthday: true,
                bankDetails: true,
                contract: true,
                salary: true,
                settings: true,
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
        // Die Rolle aus dem Token als aktive Rolle markieren
        if (!isNaN(roleId)) {
            const modifiedUser = Object.assign(Object.assign({}, user), { roles: user.roles.map(roleEntry => (Object.assign(Object.assign({}, roleEntry), { lastUsed: roleEntry.role.id === roleId }))) });
            return res.json(modifiedUser);
        }
        res.json(user);
    }
    catch (error) {
        console.error('Error in getCurrentUser:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Benutzerprofils',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getCurrentUser = getCurrentUser;
// Spezifischen Benutzer aktualisieren
const updateUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary, 
        // Zusätzliche Lohnabrechnung-Felder
        payrollCountry, hourlyRate, contractType, monthlySalary, 
        // Arbeitszeit-Felder
        normalWorkingHours } = req.body;
        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = yield prisma.user.findFirst({
                where: {
                    OR: [
                        username ? { username } : {},
                        email ? { email } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    NOT: {
                        id: userId
                    }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Benutzername oder E-Mail wird bereits verwendet'
                });
            }
        }
        // Validiere E-Mail-Format
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                message: 'Ungültiges E-Mail-Format'
            });
        }
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (username && { username })), (email && { email })), (firstName && { firstName })), (lastName && { lastName })), (birthday && { birthday: new Date(birthday) })), (bankDetails && { bankDetails })), (contract && { contract })), (salary !== undefined && { salary: salary === null ? null : parseFloat(salary.toString()) })), (payrollCountry && { payrollCountry })), (hourlyRate !== undefined && { hourlyRate: hourlyRate === null ? null : hourlyRate })), (contractType !== undefined && { contractType })), (monthlySalary !== undefined && { monthlySalary: monthlySalary === null ? null : parseFloat(monthlySalary.toString()) })), (normalWorkingHours !== undefined && { normalWorkingHours: parseFloat(normalWorkingHours.toString()) }));
        console.log('Updating user with data:', updateData);
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: updateData,
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
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Error in updateUserById:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({
                message: 'Benutzername oder E-Mail bereits vergeben',
                error: error.message
            });
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Aktualisieren des Benutzers',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateUserById = updateUserById;
// Benutzerprofil aktualisieren
const updateProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary } = req.body;
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = yield prisma.user.findFirst({
                where: {
                    OR: [
                        username ? { username } : {},
                        email ? { email } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    NOT: {
                        id: userId
                    }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Benutzername oder E-Mail wird bereits verwendet'
                });
            }
        }
        // Validiere E-Mail-Format
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                message: 'Ungültiges E-Mail-Format'
            });
        }
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (username && { username })), (email && { email })), (firstName && { firstName })), (lastName && { lastName })), (birthday && { birthday: new Date(birthday) })), (bankDetails && { bankDetails })), (contract && { contract })), (salary && { salary: parseFloat(salary) }));
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                birthday: true,
                bankDetails: true,
                contract: true,
                salary: true,
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
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Error in updateProfile:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            res.status(400).json({
                message: 'Benutzername oder E-Mail bereits vergeben',
                error: error.message
            });
        }
        else {
            res.status(500).json({
                message: 'Fehler beim Aktualisieren des Profils',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateProfile = updateProfile;
// Benutzerrollen aktualisieren
const updateUserRoles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        const { roleIds } = req.body;
        if (!Array.isArray(roleIds)) {
            return res.status(400).json({ message: 'roleIds muss ein Array sein' });
        }
        // Überprüfe, ob der Benutzer existiert
        const userExists = yield prisma.user.findUnique({
            where: { id: userId }
        });
        if (!userExists) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Überprüfe, ob alle Rollen existieren
        const existingRoles = yield prisma.role.findMany({
            where: {
                id: {
                    in: roleIds
                }
            }
        });
        if (existingRoles.length !== roleIds.length) {
            return res.status(400).json({ message: 'Eine oder mehrere Rollen wurden nicht gefunden' });
        }
        // Aktuelle Benutzerrollen abrufen, um lastUsed-Status zu prüfen
        const currentUserRoles = yield prisma.userRole.findMany({
            where: { userId },
            orderBy: { role: { id: 'asc' } }
        });
        // Prüfen, welche Rolle aktuell als lastUsed markiert ist
        const currentLastUsedRole = currentUserRoles.find(ur => ur.lastUsed);
        // Lösche alle vorhandenen Benutzerrollen
        yield prisma.userRole.deleteMany({
            where: { userId }
        });
        // Erstelle neue Benutzerrollen
        const userRoles = yield Promise.all(roleIds.map((roleId) => __awaiter(void 0, void 0, void 0, function* () {
            return prisma.userRole.create({
                data: {
                    userId,
                    roleId,
                    lastUsed: false
                }
            });
        })));
        // Wenn Rollen zugewiesen wurden, setze lastUsed logisch
        if (roleIds.length > 0) {
            // Sortiere die erstellten UserRoles nach Rollen-ID
            const sortedUserRoles = [...userRoles].sort((a, b) => a.roleId - b.roleId);
            let roleToMarkAsLastUsed = sortedUserRoles[0]; // Standardmäßig die erste Rolle
            // Wenn zuvor eine Rolle als lastUsed markiert war, versuche diese zu finden
            if (currentLastUsedRole) {
                // Prüfe, ob die frühere lastUsed-Rolle noch in den neuen Rollen vorhanden ist
                const previousRoleStillExists = sortedUserRoles.find(ur => ur.roleId === currentLastUsedRole.roleId);
                if (previousRoleStillExists) {
                    // Wenn ja, behalte diese als lastUsed
                    roleToMarkAsLastUsed = previousRoleStillExists;
                }
                else {
                    // Wenn nicht, finde die nächsthöhere Rollen-ID
                    const higherRoles = sortedUserRoles.filter(ur => ur.roleId > currentLastUsedRole.roleId);
                    if (higherRoles.length > 0) {
                        // Wenn es höhere Rollen gibt, nimm die mit der niedrigsten ID
                        roleToMarkAsLastUsed = higherRoles[0];
                    }
                    // Sonst bleibt es bei der ersten Rolle
                }
            }
            // Markiere die ausgewählte Rolle als lastUsed
            yield prisma.userRole.update({
                where: {
                    id: roleToMarkAsLastUsed.id
                },
                data: {
                    lastUsed: true
                }
            });
        }
        // Benutzer mit aktualisierten Rollen abrufen
        const updatedUser = yield prisma.user.findUnique({
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
        // Benachrichtigung an den Benutzer senden, dessen Rollen aktualisiert wurden
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: userId,
            title: 'Deine Rollen wurden aktualisiert',
            message: `Deine Benutzerrollen wurden aktualisiert. Melde dich bei Fragen an einen Administrator.`,
            type: client_1.NotificationType.user,
            relatedEntityId: userId,
            relatedEntityType: 'update'
        });
        // Benachrichtigung für Administratoren senden
        const admins = yield prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });
        for (const admin of admins) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: 'Benutzerrollen aktualisiert',
                message: `Die Rollen für "${updatedUser.firstName} ${updatedUser.lastName}" wurden aktualisiert.`,
                type: client_1.NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'update'
            });
        }
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Error in updateUserRoles:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Benutzerrollen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUserRoles = updateUserRoles;
// Benutzereinstellungen aktualisieren
const updateUserSettings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ message: 'Nicht authentifiziert' });
        }
        // Prüfen, ob es bereits Einstellungen gibt
        let settings = yield prisma.settings.findUnique({
            where: { userId }
        });
        if (settings) {
            // Einstellungen aktualisieren
            settings = yield prisma.settings.update({
                where: { userId },
                data: Object.assign(Object.assign({}, (req.body.darkMode !== undefined && { darkMode: req.body.darkMode })), (req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed }))
            });
        }
        else {
            // Neue Einstellungen erstellen
            settings = yield prisma.settings.create({
                data: Object.assign(Object.assign({ userId }, (req.body.darkMode !== undefined && { darkMode: req.body.darkMode })), (req.body.sidebarCollapsed !== undefined && { sidebarCollapsed: req.body.sidebarCollapsed }))
            });
        }
        res.json(settings);
    }
    catch (error) {
        console.error('Error in updateUserSettings:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren der Benutzereinstellungen',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUserSettings = updateUserSettings;
// Aktive Rolle eines Benutzers wechseln
const switchUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Verwende entweder req.user?.id oder req.userId, falls verfügbar
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || parseInt(req.userId, 10);
        const { roleId } = req.body;
        if (!userId || isNaN(userId) || userId <= 0) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        if (isNaN(roleId) || roleId <= 0) {
            return res.status(400).json({ message: 'Ungültige Rollen-ID' });
        }
        // Prüfen, ob die Rolle dem Benutzer zugewiesen ist
        const userRole = yield prisma.userRole.findFirst({
            where: {
                userId,
                roleId
            }
        });
        if (!userRole) {
            return res.status(404).json({
                message: 'Diese Rolle ist dem Benutzer nicht zugewiesen'
            });
        }
        // Transaktion starten
        yield prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Alle Rollen des Benutzers auf lastUsed=false setzen
            yield tx.userRole.updateMany({
                where: { userId },
                data: { lastUsed: false }
            });
            // Die ausgewählte Rolle auf lastUsed=true setzen
            yield tx.userRole.update({
                where: { id: userRole.id },
                data: { lastUsed: true }
            });
        }));
        // Benutzer mit aktualisierten Rollen zurückgeben
        const updatedUser = yield prisma.user.findUnique({
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
                },
                settings: true
            }
        });
        return res.json(updatedUser);
    }
    catch (error) {
        console.error('Error in switchUserRole:', error);
        res.status(500).json({
            message: 'Fehler beim Wechseln der Benutzerrolle',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.switchUserRole = switchUserRole;
// Neuen Benutzer erstellen (für Admin-Bereich)
const createUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, firstName, lastName, roleIds, branchIds } = req.body;
        // Validiere erforderliche Felder
        if (!username || !email || !password || !firstName || !lastName) {
            return res.status(400).json({
                message: 'Alle Pflichtfelder müssen ausgefüllt sein'
            });
        }
        // Überprüfe, ob Benutzername oder E-Mail bereits existieren
        const existingUser = yield prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });
        if (existingUser) {
            return res.status(400).json({
                message: 'Benutzername oder E-Mail wird bereits verwendet'
            });
        }
        // Erstelle den Benutzer
        const user = yield prisma.user.create({
            data: {
                username,
                email,
                password, // In der Praxis sollte das Passwort gehasht werden
                firstName,
                lastName,
                roles: {
                    create: (roleIds || [999]).map(roleId => ({
                        role: {
                            connect: { id: Number(roleId) }
                        }
                    }))
                },
                branches: {
                    create: (branchIds || []).map(branchId => ({
                        branch: {
                            connect: { id: Number(branchId) }
                        }
                    }))
                },
                settings: {
                    create: {
                        darkMode: false
                    }
                }
            },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                },
                branches: {
                    include: {
                        branch: true
                    }
                }
            }
        });
        // Benachrichtigung für Administratoren senden
        const admins = yield prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });
        for (const admin of admins) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: 'Neuer Benutzer erstellt',
                message: `Ein neuer Benutzer "${firstName} ${lastName}" (${username}) wurde erstellt.`,
                type: client_1.NotificationType.user,
                relatedEntityId: user.id,
                relatedEntityType: 'create'
            });
        }
        res.status(201).json(user);
    }
    catch (error) {
        console.error('Error in createUser:', error);
        res.status(500).json({
            message: 'Fehler beim Erstellen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.createUser = createUser;
// Benutzer aktualisieren (für Admin-Bereich)
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // Aktuellen Benutzer abrufen
        const currentUser = yield prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: true
            }
        });
        if (!currentUser) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        const { username, email, firstName, lastName, birthday, bankDetails, contract, salary } = req.body;
        // Überprüfe, ob Username oder Email bereits existieren
        if (username || email) {
            const existingUser = yield prisma.user.findFirst({
                where: {
                    OR: [
                        username ? { username } : {},
                        email ? { email } : {}
                    ].filter(condition => Object.keys(condition).length > 0),
                    NOT: {
                        id: userId
                    }
                }
            });
            if (existingUser) {
                return res.status(400).json({
                    message: 'Benutzername oder E-Mail wird bereits verwendet'
                });
            }
        }
        // Aktualisiere den Benutzer
        const updateData = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (username && { username })), (email && { email })), (firstName && { firstName })), (lastName && { lastName })), (birthday && { birthday: new Date(birthday) })), (bankDetails && { bankDetails })), (contract && { contract })), (salary && { salary: parseFloat(salary.toString()) }));
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: updateData,
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });
        // Benachrichtigung für den aktualisierten Benutzer senden
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: updatedUser.id,
            title: 'Dein Profil wurde aktualisiert',
            message: 'Dein Benutzerprofil wurde aktualisiert.',
            type: client_1.NotificationType.user,
            relatedEntityId: updatedUser.id,
            relatedEntityType: 'update'
        });
        // Benachrichtigung für Administratoren senden
        const admins = yield prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                },
                id: {
                    not: userId // Nicht an den aktualisierten Benutzer senden, falls dieser Admin ist
                }
            }
        });
        for (const admin of admins) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: 'Benutzerprofil aktualisiert',
                message: `Das Profil von "${updatedUser.firstName} ${updatedUser.lastName}" wurde aktualisiert.`,
                type: client_1.NotificationType.user,
                relatedEntityId: updatedUser.id,
                relatedEntityType: 'update'
            });
        }
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Error in updateUser:', error);
        res.status(500).json({
            message: 'Fehler beim Aktualisieren des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.updateUser = updateUser;
// Benutzer löschen
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
        }
        // Benutzer vor dem Löschen abrufen
        const user = yield prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        // Lösche alle verknüpften Daten
        yield prisma.$transaction([
            prisma.userRole.deleteMany({
                where: { userId }
            }),
            prisma.usersBranches.deleteMany({
                where: { userId }
            }),
            prisma.settings.deleteMany({
                where: { userId }
            }),
            prisma.notification.deleteMany({
                where: { userId }
            }),
            prisma.userNotificationSettings.deleteMany({
                where: { userId }
            }),
            prisma.user.delete({
                where: { id: userId }
            })
        ]);
        // Benachrichtigung für Administratoren senden
        const admins = yield prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'Admin'
                        }
                    }
                }
            }
        });
        for (const admin of admins) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: admin.id,
                title: 'Benutzer gelöscht',
                message: `Der Benutzer "${user.firstName} ${user.lastName}" (${user.username}) wurde gelöscht.`,
                type: client_1.NotificationType.user,
                relatedEntityId: userId,
                relatedEntityType: 'delete'
            });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteUser:', error);
        res.status(500).json({
            message: 'Fehler beim Löschen des Benutzers',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.deleteUser = deleteUser;
//# sourceMappingURL=userController.js.map