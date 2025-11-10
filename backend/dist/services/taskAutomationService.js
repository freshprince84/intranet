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
const client_2 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
                const user = yield prisma.user.findUnique({
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
                const organization = yield prisma.organization.findUnique({
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
                    const derechoRole = yield prisma.role.findFirst({
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
                    console.warn(`[createOnboardingTasks] Keine Legal-Rolle gefunden für Organisation ${organizationId}. Onboarding-Tasks werden nicht erstellt.`);
                    console.warn(`[createOnboardingTasks] LifecycleRoles config:`, JSON.stringify(lifecycleRoles, null, 2));
                    // Debug: Zeige alle Rollen der Organisation
                    const allRoles = yield prisma.role.findMany({
                        where: { organizationId },
                        select: { id: true, name: true }
                    });
                    console.warn(`[createOnboardingTasks] Verfügbare Rollen in Organisation ${organizationId}:`, allRoles);
                    return [];
                }
                console.log(`[createOnboardingTasks] Legal-Rolle gefunden: ID=${legalRoleId} für Organisation ${organizationId}`);
                // Bestimme Admin-User für Quality Control
                let adminUserId = null;
                if (lifecycleRoles === null || lifecycleRoles === void 0 ? void 0 : lifecycleRoles.adminRoleId) {
                    const adminUser = yield prisma.user.findFirst({
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
                    const adminRole = yield prisma.role.findFirst({
                        where: {
                            organizationId,
                            name: {
                                contains: 'Admin',
                                mode: 'insensitive'
                            }
                        }
                    });
                    if (adminRole) {
                        const adminUser = yield prisma.user.findFirst({
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
                    console.warn(`[createOnboardingTasks] User ${userId} hat keine Niederlassung zugewiesen. Verwende erste Branch der Organisation.`);
                    const firstOrgBranch = yield prisma.branch.findFirst({
                        where: { organizationId },
                        orderBy: { id: 'asc' }
                    });
                    if (!firstOrgBranch) {
                        console.error(`[createOnboardingTasks] Keine Branch in Organisation ${organizationId} gefunden. Tasks können nicht erstellt werden.`);
                        throw new Error('Organisation hat keine Niederlassung. Bitte erstellen Sie zuerst eine Niederlassung.');
                    }
                    userBranch = firstOrgBranch;
                    console.log(`[createOnboardingTasks] Verwende Branch "${userBranch.name}" (ID: ${userBranch.id}) als Fallback.`);
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
                        console.log(`[createOnboardingTasks] Erstelle Task "${taskData.title}" mit Daten:`, {
                            roleId: legalRoleId,
                            qualityControlId: adminUserId,
                            organizationId: organizationId,
                            branchId: userBranch.id
                        });
                        const task = yield prisma.task.create({
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
                        console.log(`[createOnboardingTasks] Task erstellt: ID=${task.id}, Title="${task.title}", RoleId=${task.roleId}, OrganizationId=${task.organizationId}`);
                        createdTasks.push(task);
                        // Erstelle Lifecycle-Event
                        const lifecycle = yield prisma.employeeLifecycle.findUnique({
                            where: { userId }
                        });
                        if (lifecycle) {
                            yield prisma.lifecycleEvent.create({
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
                        const legalUsers = yield prisma.user.findMany({
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
                            yield (0, notificationController_1.createNotificationIfEnabled)({
                                userId: legalUser.id,
                                title: 'Neuer Onboarding-Task',
                                message: `Ein neuer Task wurde zugewiesen: ${task.title}`,
                                type: client_2.NotificationType.task,
                                relatedEntityId: task.id,
                                relatedEntityType: 'create'
                            });
                        }
                    }
                    catch (error) {
                        console.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
                        // Weiter mit nächstem Task
                    }
                }
                return createdTasks;
            }
            catch (error) {
                console.error('Fehler beim Erstellen der Onboarding-Tasks:', error);
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
                const user = yield prisma.user.findUnique({
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
                const organization = yield prisma.organization.findUnique({
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
                    const adminRole = yield prisma.role.findFirst({
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
                    console.warn(`Keine HR-Rolle gefunden für Organisation ${organizationId}. Offboarding-Tasks werden nicht erstellt.`);
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
                        const task = yield prisma.task.create({
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
                        const lifecycle = yield prisma.employeeLifecycle.findUnique({
                            where: { userId }
                        });
                        if (lifecycle) {
                            yield prisma.lifecycleEvent.create({
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
                        const hrUsers = yield prisma.user.findMany({
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
                            yield (0, notificationController_1.createNotificationIfEnabled)({
                                userId: hrUser.id,
                                title: 'Neuer Offboarding-Task',
                                message: `Ein neuer Task wurde zugewiesen: ${task.title}`,
                                type: client_2.NotificationType.task,
                                relatedEntityId: task.id,
                                relatedEntityType: 'create'
                            });
                        }
                    }
                    catch (error) {
                        console.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
                        // Weiter mit nächstem Task
                    }
                }
                return createdTasks;
            }
            catch (error) {
                console.error('Fehler beim Erstellen der Offboarding-Tasks:', error);
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
                const user = yield prisma.user.findUnique({
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
                const organization = yield prisma.organization.findUnique({
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
                    const derechoRole = yield prisma.role.findFirst({
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
                const task = yield prisma.task.create({
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
                const lifecycle = yield prisma.employeeLifecycle.findUnique({
                    where: { userId }
                });
                if (lifecycle) {
                    yield prisma.lifecycleEvent.create({
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
                const legalUsers = yield prisma.user.findMany({
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
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: legalUser.id,
                        title: 'Neuer Sozialversicherungs-Task',
                        message: `Ein neuer Task wurde zugewiesen: ${task.title}`,
                        type: client_2.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'create'
                    });
                }
                return task;
            }
            catch (error) {
                console.error(`Fehler beim Erstellen des Sozialversicherungs-Tasks (${type}):`, error);
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
            try {
                // Hole Organisation Settings
                const organization = yield prisma.organization.findUnique({
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
                    console.log(`[TaskAutomation] Automatische Task-Erstellung ist für Organisation ${organizationId} deaktiviert`);
                    return null;
                }
                // Bestimme zuständige Rolle (z.B. "Rezeption")
                let receptionRoleId = null;
                // Suche nach "Rezeption" oder ähnlicher Rolle
                const receptionRole = yield prisma.role.findFirst({
                    where: {
                        organizationId,
                        name: {
                            in: ['Rezeption', 'Reception', 'Front Desk', 'Recepcion'],
                            mode: 'insensitive'
                        }
                    }
                });
                if (receptionRole) {
                    receptionRoleId = receptionRole.id;
                }
                else {
                    // Fallback: Verwende erste verfügbare Rolle der Organisation
                    const firstRole = yield prisma.role.findFirst({
                        where: { organizationId }
                    });
                    if (firstRole) {
                        receptionRoleId = firstRole.id;
                    }
                }
                if (!receptionRoleId) {
                    console.warn(`[TaskAutomation] Keine Rolle gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
                    return null;
                }
                // Hole erste Branch der Organisation (für Task)
                const branch = yield prisma.branch.findFirst({
                    where: { organizationId }
                });
                if (!branch) {
                    console.warn(`[TaskAutomation] Keine Branch gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
                    return null;
                }
                // Prüfe ob bereits ein Task für diese Reservierung existiert
                const existingTask = yield prisma.task.findUnique({
                    where: { reservationId: reservation.id }
                });
                if (existingTask) {
                    console.log(`[TaskAutomation] Task für Reservierung ${reservation.id} existiert bereits`);
                    return existingTask;
                }
                // Erstelle Task
                const taskTitle = `Check-in: ${reservation.guestName} - ${reservation.checkInDate.toLocaleDateString('de-DE')}`;
                const taskDescription = `
Reservierungsdetails:
- Gast: ${reservation.guestName}
- E-Mail: ${reservation.guestEmail || 'N/A'}
- Telefon: ${reservation.guestPhone || 'N/A'}
- Check-in: ${reservation.checkInDate.toLocaleDateString('de-DE')}
- Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')}
- Zimmer: ${reservation.roomNumber || 'Noch nicht zugewiesen'}
- Status: ${reservation.status}
- Zahlungsstatus: ${reservation.paymentStatus}
${reservation.arrivalTime ? `- Ankunftszeit: ${reservation.arrivalTime.toLocaleTimeString('de-DE')}` : ''}
      `.trim();
                const task = yield prisma.task.create({
                    data: {
                        title: taskTitle,
                        description: taskDescription,
                        status: 'open',
                        roleId: receptionRoleId,
                        branchId: branch.id,
                        organizationId: organizationId,
                        reservationId: reservation.id,
                        dueDate: reservation.checkInDate,
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
                console.log(`[TaskAutomation] Task ${task.id} für Reservierung ${reservation.id} erstellt`);
                // Benachrichtigung für alle User mit Rezeption-Rolle
                const receptionUsers = yield prisma.user.findMany({
                    where: {
                        roles: {
                            some: {
                                roleId: receptionRoleId,
                                lastUsed: true
                            }
                        }
                    }
                });
                for (const receptionUser of receptionUsers) {
                    yield (0, notificationController_1.createNotificationIfEnabled)({
                        userId: receptionUser.id,
                        title: 'Neue Reservierung',
                        message: `Neue Reservierung für Check-in: ${reservation.guestName}`,
                        type: client_2.NotificationType.task,
                        relatedEntityId: task.id,
                        relatedEntityType: 'create'
                    });
                }
                return task;
            }
            catch (error) {
                console.error(`[TaskAutomation] Fehler beim Erstellen des Reservierungs-Tasks:`, error);
                throw error;
            }
        });
    }
}
exports.TaskAutomationService = TaskAutomationService;
//# sourceMappingURL=taskAutomationService.js.map