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
exports.TaskAutomationService = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("../controllers/notificationController");
const translations_1 = require("../utils/translations");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
/**
 * Service für automatische Task-Erstellung bei Lebenszyklus-Events
 */
class TaskAutomationService {
    /**
     * Erstellt automatisch Onboarding-Tasks für Sozialversicherungen
     * Wird aufgerufen, wenn ein neuer Lebenszyklus erstellt wird (Onboarding-Start)
     */
    static createOnboardingTasks(userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Hole User und Organization
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        branches: {
                            take: 1,
                            include: {
                                branch: true
                            }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                if (!organization) {
                    throw new Error('Organisation nicht gefunden');
                }
                // Hole Rollen-Konfiguration
                const settings = organization.settings;
                const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
                // Bestimme Legal-Rolle (für Sozialversicherungs-Tasks)
                let legalRoleId = null;
                if (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.legalRoleId) {
                    legalRoleId = lifecycleRoles.legalRoleId;
                }
                else {
                    // Fallback: Suche nach "Derecho"-Rolle
                    const derechoRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId,
                            name: {
                                contains: 'Derecho',
                                mode: 'insensitive'
                            }
                        }
                    });
                    if (derechoRole) {
                        legalRoleId = derechoRole.id;
                    }
                }
                // Wenn keine Legal-Rolle gefunden, keine Tasks erstellen
                if (!legalRoleId) {
                    logger_1.logger.warn(`[createOnboardingTasks] Keine Legal-Rolle gefunden für Organisation ${organizationId}. Onboarding-Tasks werden nicht erstellt.`);
                    logger_1.logger.warn(`[createOnboardingTasks] LifecycleRoles config:`, JSON.stringify(lifecycleRoles, null, 2));
                    // Debug: Zeige alle Rollen der Organisation
                    const allRoles = yield prisma_1.prisma.role.findMany({
                        where: { organizationId },
                        select: { id: true, name: true }
                    });
                    logger_1.logger.warn(`[createOnboardingTasks] Verfügbare Rollen in Organisation ${organizationId}:`, allRoles);
                    return [];
                }
                logger_1.logger.log(`[createOnboardingTasks] Legal-Rolle gefunden: ID=${legalRoleId} für Organisation ${organizationId}`);
                // Bestimme Admin-User für Quality Control
                let adminUserId = null;
                if (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.adminRoleId) {
                    const adminUser = yield prisma_1.prisma.user.findFirst({
                        where: {
                            roles: {
                                some: {
                                    roleId: lifecycleRoles.adminRoleId,
                                    lastUsed: true
                                }
                            }
                        }
                    });
                    if (adminUser) {
                        adminUserId = adminUser.id;
                    }
                }
                // Fallback: Suche nach Admin-Rolle und ersten Admin-User
                if (!adminUserId) {
                    const adminRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId,
                            name: {
                                contains: 'Admin',
                                mode: 'insensitive'
                            }
                        }
                    });
                    if (adminRole) {
                        const adminUser = yield prisma_1.prisma.user.findFirst({
                            where: {
                                roles: {
                                    some: {
                                        roleId: adminRole.id,
                                        lastUsed: true
                                    }
                                }
                            }
                        });
                        if (adminUser) {
                            adminUserId = adminUser.id;
                        }
                    }
                }
                // Hole erste Branch des Users (für Tasks)
                let userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                // Fallback: Wenn User keine Branch hat, verwende erste Branch der Organisation
                if (!userBranch) {
                    logger_1.logger.warn(`[createOnboardingTasks] User ${userId} hat keine Niederlassung zugewiesen. Verwende erste Branch der Organisation.`);
                    const firstOrgBranch = yield prisma_1.prisma.branch.findFirst({
                        where: { organizationId },
                        orderBy: { id: 'asc' }
                    });
                    if (!firstOrgBranch) {
                        logger_1.logger.error(`[createOnboardingTasks] Keine Branch in Organisation ${organizationId} gefunden. Tasks können nicht erstellt werden.`);
                        throw new Error('Organisation hat keine Niederlassung. Bitte erstellen Sie zuerst eine Niederlassung.');
                    }
                    userBranch = firstOrgBranch;
                    logger_1.logger.log(`[createOnboardingTasks] Verwende Branch "${userBranch.name}" (ID: ${userBranch.id}) als Fallback.`);
                }
                // Definiere Tasks für Sozialversicherungen (Kolumbien)
                const socialSecurityTasks = [
                    {
                        title: 'Realizar afiliación ARL',
                        description: `Realizar afiliación ARL para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
                        type: 'arl'
                    },
                    {
                        title: 'Revisar/realizar afiliación EPS',
                        description: `Revisar afiliación EPS para ${user.firstName} ${user.lastName}. Si es necesario, realizar la afiliación.`,
                        type: 'eps'
                    },
                    {
                        title: 'Realizar afiliación Pensión',
                        description: `Realizar afiliación Pensión para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
                        type: 'pension'
                    },
                    {
                        title: 'Realizar afiliación Caja',
                        description: `Realizar afiliación Caja para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
                        type: 'caja'
                    }
                ];
                const createdTasks = [];
                // Erstelle Tasks
                for (const taskData of socialSecurityTasks) {
                    try {
                        const taskDataToCreate = {
                            title: taskData.title,
                            description: taskData.description,
                            status: 'open',
                            roleId: legalRoleId,
                            branchId: userBranch.id,
                            organizationId: organizationId || undefined,
                            // Setze Fälligkeitsdatum auf 7 Tage in der Zukunft
                            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        };
                        // Füge qualityControlId nur hinzu, wenn ein Admin-User gefunden wurde
                        if (adminUserId) {
                            taskDataToCreate.qualityControlId = adminUserId;
                        }
                        logger_1.logger.log(`[createOnboardingTasks] Erstelle Task "${taskData.title}" mit Daten:`, {
                            roleId: legalRoleId,
                            qualityControlId: adminUserId,
                            organizationId: organizationId,
                            branchId: userBranch.id
                        });
                        const task = yield prisma_1.prisma.task.create({
                            data: taskDataToCreate,
                            include: {
                                role: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        });
                        logger_1.logger.log(`[createOnboardingTasks] Task erstellt: ID=${task.id}, Title="${task.title}", RoleId=${task.roleId}, OrganizationId=${task.organizationId}`);
                        createdTasks.push(task);
                        // Erstelle Lifecycle-Event
                        const lifecycle = yield prisma_1.prisma.employeeLifecycle.findUnique({
                            where: { userId }
                        });
                        if (lifecycle) {
                            yield prisma_1.prisma.lifecycleEvent.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    eventType: `task_created_${taskData.type}`,
                                    eventData: {
                                        taskId: task.id,
                                        taskTitle: task.title,
                                        taskType: taskData.type
                                    }
                                }
                            });
                        }
                        // Benachrichtigung für alle User mit Legal-Rolle
                        const legalUsers = yield prisma_1.prisma.user.findMany({
                            where: {
                                roles: {
                                    some: {
                                        roleId: legalRoleId,
                                        lastUsed: true
                                    }
                                }
                            }
                        });
                        for (const legalUser of legalUsers) {
                            const userLang = yield (0, translations_1.getUserLanguage)(legalUser.id);
                            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'new_onboarding_task', task.title);
                            yield (0, notificationController_1.createNotificationIfEnabled)({
                                userId: legalUser.id,
                                title: notificationText.title,
                                message: notificationText.message,
                                type: client_1.NotificationType.task,
                                relatedEntityId: task.id,
                                relatedEntityType: 'create'
                            });
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
                        // Weiter mit nächstem Task
                    }
                }
                return createdTasks;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Erstellen der Onboarding-Tasks:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt automatisch Offboarding-Tasks
     * Wird aufgerufen, wenn Offboarding gestartet wird
     */
    static createOffboardingTasks(userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Hole User und Organization
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        branches: {
                            take: 1,
                            include: {
                                branch: true
                            }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                if (!organization) {
                    throw new Error('Organisation nicht gefunden');
                }
                // Hole Rollen-Konfiguration
                const settings = organization.settings;
                const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
                // Bestimme HR-Rolle (für Offboarding-Tasks)
                let hrRoleId = null;
                if (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.hrRoleId) {
                    hrRoleId = lifecycleRoles.hrRoleId;
                }
                else if (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.adminRoleId) {
                    // Fallback: Admin-Rolle
                    hrRoleId = lifecycleRoles.adminRoleId;
                }
                else {
                    // Fallback: Suche nach Admin-Rolle
                    const adminRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId,
                            name: {
                                contains: 'Admin',
                                mode: 'insensitive'
                            }
                        }
                    });
                    if (adminRole) {
                        hrRoleId = adminRole.id;
                    }
                }
                if (!hrRoleId) {
                    logger_1.logger.warn(`Keine HR-Rolle gefunden für Organisation ${organizationId}. Offboarding-Tasks werden nicht erstellt.`);
                    return [];
                }
                // Hole erste Branch des Users
                const userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                if (!userBranch) {
                    throw new Error('User hat keine Niederlassung zugewiesen');
                }
                // Definiere Offboarding-Tasks
                const offboardingTasks = [
                    {
                        title: 'Crear certificado laboral',
                        description: `Crear certificado laboral para ${user.firstName} ${user.lastName}.`,
                        type: 'certificate'
                    },
                    {
                        title: 'Realizar liquidación final',
                        description: `Realizar liquidación final para ${user.firstName} ${user.lastName}.`,
                        type: 'payroll'
                    },
                    {
                        title: 'Desafiliar de seguridad social',
                        description: `Desafiliar de seguridad social (ARL, EPS, Pensión, Caja) para ${user.firstName} ${user.lastName}.`,
                        type: 'social_security'
                    }
                ];
                const createdTasks = [];
                // Erstelle Tasks
                for (const taskData of offboardingTasks) {
                    try {
                        const task = yield prisma_1.prisma.task.create({
                            data: {
                                title: taskData.title,
                                description: taskData.description,
                                status: 'open',
                                roleId: hrRoleId,
                                branchId: userBranch.id,
                                organizationId: organizationId || undefined
                            },
                            include: {
                                role: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        });
                        createdTasks.push(task);
                        // Erstelle Lifecycle-Event
                        const lifecycle = yield prisma_1.prisma.employeeLifecycle.findUnique({
                            where: { userId }
                        });
                        if (lifecycle) {
                            yield prisma_1.prisma.lifecycleEvent.create({
                                data: {
                                    lifecycleId: lifecycle.id,
                                    eventType: `task_created_${taskData.type}`,
                                    eventData: {
                                        taskId: task.id,
                                        taskTitle: task.title,
                                        taskType: taskData.type
                                    }
                                }
                            });
                        }
                        // Benachrichtigung für alle User mit HR-Rolle
                        const hrUsers = yield prisma_1.prisma.user.findMany({
                            where: {
                                roles: {
                                    some: {
                                        roleId: hrRoleId,
                                        lastUsed: true
                                    }
                                }
                            }
                        });
                        for (const hrUser of hrUsers) {
                            const userLang = yield (0, translations_1.getUserLanguage)(hrUser.id);
                            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'new_offboarding_task', task.title);
                            yield (0, notificationController_1.createNotificationIfEnabled)({
                                userId: hrUser.id,
                                title: notificationText.title,
                                message: notificationText.message,
                                type: client_1.NotificationType.task,
                                relatedEntityId: task.id,
                                relatedEntityType: 'create'
                            });
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
                        // Weiter mit nächstem Task
                    }
                }
                return createdTasks;
            }
            catch (error) {
                logger_1.logger.error('Fehler beim Erstellen der Offboarding-Tasks:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt einen einzelnen Task für eine Sozialversicherung
     * Wird verwendet, wenn eine Sozialversicherung manuell als "pending" gesetzt wird
     */
    static createSocialSecurityTask(userId, organizationId, type) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        branches: {
                            take: 1,
                            include: {
                                branch: true
                            }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                if (!organization) {
                    throw new Error('Organisation nicht gefunden');
                }
                // Hole Rollen-Konfiguration
                const settings = organization.settings;
                const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
                // Bestimme Legal-Rolle
                let legalRoleId = null;
                if (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.legalRoleId) {
                    legalRoleId = lifecycleRoles.legalRoleId;
                }
                else {
                    const derechoRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId,
                            name: {
                                contains: 'Derecho',
                                mode: 'insensitive'
                            }
                        }
                    });
                    if (derechoRole) {
                        legalRoleId = derechoRole.id;
                    }
                }
                if (!legalRoleId) {
                    throw new Error('Keine Legal-Rolle gefunden');
                }
                const userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                if (!userBranch) {
                    throw new Error('User hat keine Niederlassung zugewiesen');
                }
                const taskTitles = {
                    arl: 'Realizar afiliación ARL',
                    eps: 'Revisar/realizar afiliación EPS',
                    pension: 'Realizar afiliación Pensión',
                    caja: 'Realizar afiliación Caja'
                };
                const task = yield prisma_1.prisma.task.create({
                    data: {
                        title: taskTitles[type],
                        description: `${taskTitles[type]} para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
                        status: 'open',
                        roleId: legalRoleId,
                        branchId: userBranch.id,
                        organizationId: organizationId || undefined,
                        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    },
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                });
                // Erstelle Lifecycle-Event
                const lifecycle = yield prisma_1.prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });
                if (lifecycle) {
                    yield prisma_1.prisma.lifecycleEvent.create({
                        data: {
                            lifecycleId: lifecycle.id,
                            eventType: `task_created_${type}`,
                            eventData: {
                                taskId: task.id,
                                taskTitle: task.title,
                                taskType: type
                            }
                        }
                    });
                }
                // Benachrichtigung für Legal-User
                const legalUsers = yield prisma_1.prisma.user.findMany({
                    where: {
                        roles: {
                            some: {
                                roleId: legalRoleId,
                                lastUsed: true
                            }
                        }
                    }
                });
                for (const legalUser of legalUsers) {
                    const userLang = yield (0, translations_1.getUserLanguage)(legalUser.id);
                    const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'new_social_security_task', task.title);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: legalUser.id,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'create'
                    });
                }
                return task;
            }
            catch (error) {
                logger_1.logger.error(`Fehler beim Erstellen des Sozialversicherungs-Tasks (${type}):`, error);
                throw error;
            }
        });
    }
    /**
     * Erstellt automatisch einen Task für eine Reservierung
     * Wird aufgerufen, wenn eine neue Reservierung synchronisiert wird
     *
     * @param reservation - Reservierung
     * @param organizationId - ID der Organisation
     * @returns Erstellter Task
     */
    static createReservationTask(reservation, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f;
            try {
                // Hole Organisation Settings
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                if (!organization) {
                    throw new Error('Organisation nicht gefunden');
                }
                const settings = organization.settings;
                const lobbyPmsSettings = settings === null || settings === void 0 ? void 0 : settings.lobbyPms;
                // Prüfe ob automatische Task-Erstellung aktiviert ist
                if (!(lobbyPmsSettings === null || lobbyPmsSettings === void 0 ? void 0 : lobbyPmsSettings.autoCreateTasks)) {
                    logger_1.logger.log(`[TaskAutomation] Automatische Task-Erstellung ist für Organisation ${organizationId} deaktiviert`);
                    return null;
                }
                // Bestimme zuständige Rolle (Cleaning)
                let cleaningRoleId = null;
                // Suche nach "Cleaning" oder ähnlicher Rolle
                const cleaningRole = yield prisma_1.prisma.role.findFirst({
                    where: {
                        organizationId,
                        name: {
                            in: ['Cleaning', 'Limpieza', 'Reinigung'],
                            mode: 'insensitive'
                        }
                    }
                });
                if (cleaningRole) {
                    cleaningRoleId = cleaningRole.id;
                }
                else {
                    // Fallback: Verwende erste verfügbare Rolle der Organisation
                    const firstRole = yield prisma_1.prisma.role.findFirst({
                        where: { organizationId }
                    });
                    if (firstRole) {
                        cleaningRoleId = firstRole.id;
                    }
                }
                if (!cleaningRoleId) {
                    logger_1.logger.warn(`[TaskAutomation] Keine Cleaning-Rolle gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
                    return null;
                }
                // Hole Branch der Reservation (falls vorhanden), sonst erste Branch der Organisation
                let branchId = null;
                if (reservation.branchId) {
                    branchId = reservation.branchId;
                    logger_1.logger.log(`[TaskAutomation] Verwende Branch ${branchId} aus Reservation`);
                }
                else {
                    // Fallback: Hole erste Branch der Organisation
                    const branch = yield prisma_1.prisma.branch.findFirst({
                        where: { organizationId }
                    });
                    if (!branch) {
                        logger_1.logger.warn(`[TaskAutomation] Keine Branch gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
                        return null;
                    }
                    branchId = branch.id;
                    logger_1.logger.log(`[TaskAutomation] Verwende erste Branch ${branchId} der Organisation (Reservation hat keine branchId)`);
                }
                // Prüfe ob bereits ein Task für diese Reservierung existiert
                const existingTask = yield prisma_1.prisma.task.findUnique({
                    where: { reservationId: reservation.id }
                });
                if (existingTask) {
                    logger_1.logger.log(`[TaskAutomation] Task für Reservierung ${reservation.id} existiert bereits`);
                    return existingTask;
                }
                // Prüfe ob checkOutDate vorhanden ist
                if (!reservation.checkOutDate) {
                    logger_1.logger.error(`[TaskAutomation] Reservation ${reservation.id} hat kein checkOutDate. Task wird nicht erstellt.`);
                    return null;
                }
                // Erstelle Task
                // Titel: Zimmername (bei Dorms: "Zimmername (Bettnummer)", bei Privates: "Zimmername")
                const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
                let taskTitle;
                if (isDorm) {
                    // Dorm: "Zimmername (Bettnummer)"
                    const roomName = ((_a = reservation.roomDescription) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                    const bedNumber = ((_b = reservation.roomNumber) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                    taskTitle = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || `Reservation ${reservation.id}`);
                }
                else {
                    // Private: "Zimmername"
                    taskTitle = ((_c = reservation.roomDescription) === null || _c === void 0 ? void 0 : _c.trim()) || `Reservation ${reservation.id}`;
                }
                // Zimmer-Anzeige für Beschreibung
                let roomDisplay;
                if (isDorm) {
                    const roomName = ((_d = reservation.roomDescription) === null || _d === void 0 ? void 0 : _d.trim()) || '';
                    const bedNumber = ((_e = reservation.roomNumber) === null || _e === void 0 ? void 0 : _e.trim()) || '';
                    roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'Noch nicht zugewiesen');
                }
                else {
                    roomDisplay = ((_f = reservation.roomDescription) === null || _f === void 0 ? void 0 : _f.trim()) || 'Noch nicht zugewiesen';
                }
                const taskDescription = `
Reservierungsdetails:
- Gast: ${reservation.guestName}
- E-Mail: ${reservation.guestEmail || 'N/A'}
- Telefon: ${reservation.guestPhone || 'N/A'}
- Check-in: ${reservation.checkInDate.toLocaleDateString('de-DE')}
- Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')}
- Zimmer: ${roomDisplay}
- Status: ${reservation.status}
- Zahlungsstatus: ${reservation.paymentStatus}
${reservation.arrivalTime ? `- Ankunftszeit: ${reservation.arrivalTime.toLocaleTimeString('de-DE')}` : ''}
      `.trim();
                const task = yield prisma_1.prisma.task.create({
                    data: {
                        title: taskTitle,
                        description: taskDescription,
                        status: 'open',
                        roleId: cleaningRoleId,
                        branchId: branchId,
                        organizationId: organizationId,
                        reservationId: reservation.id,
                        dueDate: reservation.checkOutDate,
                        qualityControlId: 1 // TODO: Bestimme Quality Control User
                    },
                    include: {
                        role: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        reservation: true
                    }
                });
                logger_1.logger.log(`[TaskAutomation] Cleaning-Task ${task.id} für Reservierung ${reservation.id} erstellt (Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')})`);
                // Benachrichtigung für alle User mit Cleaning-Rolle
                const cleaningUsers = yield prisma_1.prisma.user.findMany({
                    where: {
                        roles: {
                            some: {
                                roleId: cleaningRoleId,
                                lastUsed: true
                            }
                        }
                    }
                });
                for (const cleaningUser of cleaningUsers) {
                    const userLang = yield (0, translations_1.getUserLanguage)(cleaningUser.id);
                    const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'check_in_started', task.title, undefined, undefined, reservation.guestName);
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: cleaningUser.id,
                        title: notificationText.title,
                        message: notificationText.message,
                        type: client_1.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'create'
                    });
                }
                return task;
            }
            catch (error) {
                logger_1.logger.error(`[TaskAutomation] Fehler beim Erstellen des Reservierungs-Tasks:`, error);
                throw error;
            }
        });
    }
    /**
     * Erstellt automatisch einen Admin-Onboarding-Task für Kolumbien
     * Wird aufgerufen, wenn ein User einer Organisation in Kolumbien beitritt und ein Dokument hochlädt
     *
     * @param userId - ID des Users
     * @param organizationId - ID der Organisation
     * @returns Erstellter Task oder null
     */
    static createAdminOnboardingTask(userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Prüfe: Organisation in Kolumbien?
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { country: true, settings: true }
                });
                if ((organization === null || organization === void 0 ? void 0 : organization.country) !== 'CO') {
                    logger_1.logger.log(`[createAdminOnboardingTask] Organisation ${organizationId} ist nicht in Kolumbien, überspringe Task-Erstellung`);
                    return null; // Nur für Kolumbien
                }
                // Hole User-Daten
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        branches: {
                            take: 1,
                            include: { branch: true }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                // Hole Admin-Rolle (nutze bestehende Logik aus createOnboardingTasks)
                const settings = organization.settings;
                const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
                let adminRoleId = (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.adminRoleId) || null;
                // Fallback: Suche nach Admin-Rolle
                if (!adminRoleId) {
                    const adminRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId: organizationId,
                            name: { contains: 'Admin', mode: 'insensitive' }
                        }
                    });
                    if (adminRole) {
                        adminRoleId = adminRole.id;
                    }
                }
                if (!adminRoleId) {
                    logger_1.logger.warn(`[createAdminOnboardingTask] Keine Admin-Rolle gefunden für Organisation ${organizationId}`);
                    return null;
                }
                // Hole Admin-User für QC (nutze bestehende Logik)
                let adminUserId = null;
                if (adminRoleId) {
                    const adminUser = yield prisma_1.prisma.user.findFirst({
                        where: {
                            roles: {
                                some: {
                                    roleId: adminRoleId,
                                    lastUsed: true
                                }
                            }
                        }
                    });
                    if (adminUser) {
                        adminUserId = adminUser.id;
                    }
                }
                // Hole Branch (nutze bestehende Logik)
                let userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                if (!userBranch) {
                    const firstOrgBranch = yield prisma_1.prisma.branch.findFirst({
                        where: { organizationId },
                        orderBy: { id: 'asc' }
                    });
                    if (!firstOrgBranch) {
                        throw new Error('Organisation hat keine Niederlassung');
                    }
                    userBranch = firstOrgBranch;
                }
                // Prüfe ob bereits ein Admin-Onboarding-Task existiert
                const existingTask = yield prisma_1.prisma.task.findFirst({
                    where: {
                        organizationId: organizationId,
                        title: {
                            contains: `Profil vervollständigen: ${user.firstName || ''} ${user.lastName || ''}`.trim() || `Profil vervollständigen: User ${userId}`
                        }
                    }
                });
                if (existingTask) {
                    logger_1.logger.log(`[createAdminOnboardingTask] Admin-Onboarding-Task existiert bereits für User ${userId}`);
                    return existingTask;
                }
                // Erstelle Task für Admin
                // WICHTIG: Task ist der Admin-Rolle zugewiesen (roleId), daher kann responsibleId NICHT gesetzt werden
                // Der Onboarding-User wird im Link in der description gespeichert: userId=XXX
                const task = yield prisma_1.prisma.task.create({
                    data: {
                        title: `Profil vervollständigen: ${user.firstName || ''} ${user.lastName || ''}`.trim() || `Profil vervollständigen: User ${userId}`,
                        description: `Bitte vervollständigen Sie das Profil für ${user.firstName || ''} ${user.lastName || ''}:\n- Contrato\n- Salario\n- Horas normales de trabajo\n\nLink: /organization?tab=users&userId=${userId}`,
                        status: 'open',
                        roleId: adminRoleId, // Zugewiesen an Admin-Rolle (entweder roleId ODER responsibleId, nicht beides!)
                        qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
                        branchId: userBranch.id,
                        organizationId: organizationId
                    }
                });
                // Notification an Admin (nutze bestehende Funktion)
                if (adminUserId) {
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: adminUserId,
                        title: 'Neues Onboarding-To-Do',
                        message: `Profil vervollständigen für ${user.firstName || ''} ${user.lastName || ''}`,
                        type: client_1.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'task'
                    });
                }
                logger_1.logger.log(`[createAdminOnboardingTask] Admin-Onboarding-Task erstellt: Task ID ${task.id} für User ${userId}`);
                return task;
            }
            catch (error) {
                logger_1.logger.error('[createAdminOnboardingTask] Fehler:', error);
                // Logge Fehler, aber breche nicht ab
                return null;
            }
        });
    }
    /**
     * Erstellt automatisch ein To-Do für User, um bankDetails einzugeben
     * Wird aufgerufen nach Organisation-Beitritt
     * User muss bankDetails eingeben, bevor Zeiterfassung möglich ist
     */
    static createUserBankDetailsTask(userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Hole User-Daten
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        branches: {
                            take: 1,
                            include: { branch: true }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                // Prüfe ob User bereits bankDetails hat
                if (user.bankDetails && user.bankDetails.trim() !== '') {
                    logger_1.logger.log(`[createUserBankDetailsTask] User ${userId} hat bereits bankDetails, überspringe Task-Erstellung`);
                    return null;
                }
                // Hole Branch (nutze bestehende Logik)
                let userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                if (!userBranch) {
                    const firstOrgBranch = yield prisma_1.prisma.branch.findFirst({
                        where: { organizationId },
                        orderBy: { id: 'asc' }
                    });
                    if (!firstOrgBranch) {
                        throw new Error('Organisation hat keine Niederlassung');
                    }
                    userBranch = firstOrgBranch;
                }
                // Hole Admin-User für QC (nutze bestehende Logik aus createAdminOnboardingTask)
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { settings: true }
                });
                const settings = organization === null || organization === void 0 ? void 0 : organization.settings;
                const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
                let adminRoleId = (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.adminRoleId) || null;
                // Fallback: Suche nach Admin-Rolle
                if (!adminRoleId) {
                    const adminRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId: organizationId,
                            name: { contains: 'Admin', mode: 'insensitive' }
                        }
                    });
                    if (adminRole) {
                        adminRoleId = adminRole.id;
                    }
                }
                let adminUserId = null;
                if (adminRoleId) {
                    const adminUser = yield prisma_1.prisma.user.findFirst({
                        where: {
                            roles: {
                                some: {
                                    roleId: adminRoleId,
                                    lastUsed: true
                                }
                            }
                        }
                    });
                    if (adminUser) {
                        adminUserId = adminUser.id;
                    }
                }
                // Prüfe ob bereits ein BankDetails-Task existiert (prüfe beide Varianten für Abwärtskompatibilität)
                const existingTask = yield prisma_1.prisma.task.findFirst({
                    where: {
                        organizationId: organizationId,
                        responsibleId: userId,
                        OR: [
                            { title: { contains: 'Ingresar datos bancarios' } },
                            { title: { contains: 'Bankverbindung eingeben' } }
                        ]
                    }
                });
                if (existingTask) {
                    logger_1.logger.log(`[createUserBankDetailsTask] BankDetails-Task existiert bereits für User ${userId}`);
                    return existingTask;
                }
                // Erstelle Task für User
                // WICHTIG: Task ist dem User zugewiesen (responsibleId), daher kann roleId NICHT gesetzt werden
                const task = yield prisma_1.prisma.task.create({
                    data: {
                        title: 'Ingresar datos bancarios',
                        description: `Por favor, ingrese sus datos bancarios en el perfil antes de poder utilizar el registro de tiempo.\n\nLink: /profile`,
                        status: 'open',
                        responsibleId: userId, // User ist verantwortlich für sein eigenes To-Do
                        qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
                        branchId: userBranch.id,
                        organizationId: organizationId
                    }
                });
                // Notification an User
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: userId,
                    title: 'Ingresar datos bancarios',
                    message: 'Por favor, ingrese sus datos bancarios en el perfil antes de poder utilizar el registro de tiempo.',
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'task'
                });
                logger_1.logger.log(`[createUserBankDetailsTask] BankDetails-Task erstellt: Task ID ${task.id} für User ${userId}`);
                return task;
            }
            catch (error) {
                logger_1.logger.error('[createUserBankDetailsTask] Fehler:', error);
                // Logge Fehler, aber breche nicht ab
                return null;
            }
        });
    }
    /**
     * Erstellt automatisch ein To-Do für User, um Identitätsdokument hochzuladen
     * Wird aufgerufen nach Organisation-Beitritt (nur für Kolumbien)
     * User muss Identitätsdokument hochladen, damit Admin das Profil vervollständigen kann
     */
    static createUserIdentificationDocumentTask(userId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                // Prüfe: Organisation in Kolumbien?
                const organization = yield prisma_1.prisma.organization.findUnique({
                    where: { id: organizationId },
                    select: { country: true, settings: true }
                });
                if ((organization === null || organization === void 0 ? void 0 : organization.country) !== 'CO') {
                    logger_1.logger.log(`[createUserIdentificationDocumentTask] Organisation ${organizationId} ist nicht in Kolumbien, überspringe Task-Erstellung`);
                    return null; // Nur für Kolumbien
                }
                // Hole User-Daten
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: userId },
                    include: {
                        branches: {
                            take: 1,
                            include: { branch: true }
                        },
                        identificationDocuments: {
                            take: 1,
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                // Prüfe ob User bereits ein Identitätsdokument hat
                if (user.identificationDocuments && user.identificationDocuments.length > 0) {
                    logger_1.logger.log(`[createUserIdentificationDocumentTask] User ${userId} hat bereits ein Identitätsdokument, überspringe Task-Erstellung`);
                    return null;
                }
                // Hole Branch (nutze bestehende Logik)
                let userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                if (!userBranch) {
                    const firstOrgBranch = yield prisma_1.prisma.branch.findFirst({
                        where: { organizationId },
                        orderBy: { id: 'asc' }
                    });
                    if (!firstOrgBranch) {
                        throw new Error('Organisation hat keine Niederlassung');
                    }
                    userBranch = firstOrgBranch;
                }
                // Hole Admin-User für QC (nutze bestehende Logik)
                const settings = organization.settings;
                const lifecycleRoles = settings === null || settings === void 0 ? void 0 : settings.lifecycleRoles;
                let adminRoleId = (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.adminRoleId) || null;
                // Fallback: Suche nach Admin-Rolle
                if (!adminRoleId) {
                    const adminRole = yield prisma_1.prisma.role.findFirst({
                        where: {
                            organizationId: organizationId,
                            name: { contains: 'Admin', mode: 'insensitive' }
                        }
                    });
                    if (adminRole) {
                        adminRoleId = adminRole.id;
                    }
                }
                let adminUserId = null;
                if (adminRoleId) {
                    const adminUser = yield prisma_1.prisma.user.findFirst({
                        where: {
                            roles: {
                                some: {
                                    roleId: adminRoleId,
                                    lastUsed: true
                                }
                            }
                        }
                    });
                    if (adminUser) {
                        adminUserId = adminUser.id;
                    }
                }
                // Prüfe ob bereits ein Identitätsdokument-Task existiert
                const existingTask = yield prisma_1.prisma.task.findFirst({
                    where: {
                        organizationId: organizationId,
                        responsibleId: userId,
                        OR: [
                            { title: { contains: 'Subir documento de identidad' } },
                            { title: { contains: 'Identitätsdokument hochladen' } }
                        ]
                    }
                });
                if (existingTask) {
                    logger_1.logger.log(`[createUserIdentificationDocumentTask] Identitätsdokument-Task existiert bereits für User ${userId}`);
                    return existingTask;
                }
                // Erstelle Task für User
                // WICHTIG: Task ist dem User zugewiesen (responsibleId), daher kann roleId NICHT gesetzt werden
                const task = yield prisma_1.prisma.task.create({
                    data: {
                        title: 'Subir documento de identidad',
                        description: `Por favor, suba su documento de identidad (Cédula o Pasaporte) en el perfil. Los campos se completarán automáticamente.\n\nLink: /profile`,
                        status: 'open',
                        responsibleId: userId, // User ist verantwortlich für sein eigenes To-Do
                        qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
                        branchId: userBranch.id,
                        organizationId: organizationId
                    }
                });
                // Notification an User
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: userId,
                    title: 'Subir documento de identidad',
                    message: 'Por favor, suba su documento de identidad (Cédula o Pasaporte) en el perfil. Los campos se completarán automáticamente.',
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'task'
                });
                logger_1.logger.log(`[createUserIdentificationDocumentTask] Identitätsdokument-Task erstellt: Task ID ${task.id} für User ${userId}`);
                return task;
            }
            catch (error) {
                logger_1.logger.error('[createUserIdentificationDocumentTask] Fehler:', error);
                // Logge Fehler, aber breche nicht ab
                return null;
            }
        });
    }
}
exports.TaskAutomationService = TaskAutomationService;
//# sourceMappingURL=taskAutomationService.js.map