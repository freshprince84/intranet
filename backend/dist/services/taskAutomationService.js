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
                    console.warn(`Keine Legal-Rolle gefunden für Organisation ${organizationId}. Onboarding-Tasks werden nicht erstellt.`);
                    return [];
                }
                // Hole erste Branch des Users (für Tasks)
                const userBranch = (_a = user.branches[0]) === null || _a === void 0 ? void 0 : _a.branch;
                if (!userBranch) {
                    throw new Error('User hat keine Niederlassung zugewiesen');
                }
                // Definiere Tasks für Sozialversicherungen (Kolumbien)
                const socialSecurityTasks = [
                    {
                        title: 'ARL-Anmeldung durchführen',
                        description: `ARL-Anmeldung für ${user.firstName} ${user.lastName} durchführen. Erforderliche Daten werden automatisch generiert.`,
                        type: 'arl'
                    },
                    {
                        title: 'EPS-Anmeldung prüfen/ durchführen',
                        description: `EPS-Anmeldung für ${user.firstName} ${user.lastName} prüfen. Falls erforderlich, Anmeldung durchführen.`,
                        type: 'eps'
                    },
                    {
                        title: 'Pension-Anmeldung durchführen',
                        description: `Pension-Anmeldung für ${user.firstName} ${user.lastName} durchführen. Erforderliche Daten werden automatisch generiert.`,
                        type: 'pension'
                    },
                    {
                        title: 'Caja-Anmeldung durchführen',
                        description: `Caja-Anmeldung für ${user.firstName} ${user.lastName} durchführen. Erforderliche Daten werden automatisch generiert.`,
                        type: 'caja'
                    }
                ];
                const createdTasks = [];
                // Erstelle Tasks
                for (const taskData of socialSecurityTasks) {
                    try {
                        const task = yield prisma.task.create({
                            data: {
                                title: taskData.title,
                                description: taskData.description,
                                status: 'open',
                                roleId: legalRoleId,
                                branchId: userBranch.id,
                                organizationId: organizationId || undefined,
                                // Setze Fälligkeitsdatum auf 7 Tage in der Zukunft
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
                        title: 'Arbeitszeugnis erstellen',
                        description: `Arbeitszeugnis für ${user.firstName} ${user.lastName} erstellen.`,
                        type: 'certificate'
                    },
                    {
                        title: 'Finale Abrechnung durchführen',
                        description: `Finale Abrechnung für ${user.firstName} ${user.lastName} durchführen.`,
                        type: 'payroll'
                    },
                    {
                        title: 'Sozialversicherungen abmelden',
                        description: `Sozialversicherungen (ARL, EPS, Pension, Caja) für ${user.firstName} ${user.lastName} abmelden.`,
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
                    arl: 'ARL-Anmeldung durchführen',
                    eps: 'EPS-Anmeldung prüfen/durchführen',
                    pension: 'Pension-Anmeldung durchführen',
                    caja: 'Caja-Anmeldung durchführen'
                };
                const task = yield prisma.task.create({
                    data: {
                        title: taskTitles[type],
                        description: `${taskTitles[type]} für ${user.firstName} ${user.lastName}. Erforderliche Daten werden automatisch generiert.`,
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
}
exports.TaskAutomationService = TaskAutomationService;
//# sourceMappingURL=taskAutomationService.js.map