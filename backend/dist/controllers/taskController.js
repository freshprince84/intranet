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
exports.unlinkTaskFromCarticle = exports.linkTaskToCarticle = exports.getTaskCarticles = exports.deleteTask = exports.updateTask = exports.createTask = exports.getTaskById = exports.getAllTasks = void 0;
const client_1 = require("@prisma/client");
const taskValidation_1 = require("../validation/taskValidation");
const notificationController_1 = require("./notificationController");
const prisma = new client_1.PrismaClient();
const userSelect = {
    id: true,
    firstName: true,
    lastName: true
};
const roleSelect = {
    id: true,
    name: true
};
const branchSelect = {
    id: true,
    name: true
};
// Alle Tasks abrufen
const getAllTasks = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tasks = yield prisma.task.findMany({
            include: {
                responsible: {
                    select: userSelect
                },
                role: {
                    select: roleSelect
                },
                qualityControl: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });
        res.json(tasks);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der Tasks:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllTasks = getAllTasks;
// Einzelnen Task abrufen
const getTaskById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        const task = yield prisma.task.findUnique({
            where: { id: taskId },
            include: {
                responsible: {
                    select: userSelect
                },
                role: {
                    select: roleSelect
                },
                qualityControl: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        res.json(task);
    }
    catch (error) {
        console.error('Fehler beim Abrufen des Tasks:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getTaskById = getTaskById;
// Neuen Task erstellen
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskData = req.body;
        const validationError = (0, taskValidation_1.validateTask)(taskData);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        // Erstelle ein Basis-Datenobjekt ohne responsibleId/roleId
        const taskCreateData = {
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status || 'open',
            qualityControlId: taskData.qualityControlId,
            branchId: taskData.branchId,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null
        };
        // Füge responsibleId nur hinzu, wenn ein Wert angegeben ist (nicht null oder undefined)
        if (taskData.responsibleId) {
            taskCreateData.responsibleId = taskData.responsibleId;
        }
        // Füge roleId nur hinzu, wenn ein Wert angegeben ist (nicht null oder undefined)
        if (taskData.roleId) {
            taskCreateData.roleId = taskData.roleId;
        }
        const task = yield prisma.task.create({
            data: taskCreateData,
            include: {
                responsible: {
                    select: userSelect
                },
                role: {
                    select: roleSelect
                },
                qualityControl: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });
        // Benachrichtigung für den Verantwortlichen erstellen, nur wenn ein Benutzer zugewiesen ist
        if (taskData.responsibleId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: taskData.responsibleId,
                title: 'Neuer Task zugewiesen',
                message: `Dir wurde ein neuer Task zugewiesen: ${taskData.title}`,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'create'
            });
        }
        // Benachrichtigung für die Qualitätskontrolle erstellen
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: taskData.qualityControlId,
            title: 'Neue Qualitätskontrolle zugewiesen',
            message: `Du wurdest als Qualitätskontrolle für einen neuen Task zugewiesen: ${taskData.title}`,
            type: client_1.NotificationType.task,
            relatedEntityId: task.id,
            relatedEntityType: 'create'
        });
        res.status(201).json(task);
    }
    catch (error) {
        console.error('Fehler beim Erstellen des Tasks:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                error: 'Fehler beim Erstellen des Tasks',
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.createTask = createTask;
// Task aktualisieren
const updateTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        const updateData = req.body;
        // Aktuellen Task abrufen, um Änderungen zu erkennen
        const currentTask = yield prisma.task.findUnique({
            where: { id: taskId },
            include: {
                responsible: {
                    select: userSelect
                },
                qualityControl: {
                    select: userSelect
                }
            }
        });
        if (!currentTask) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        // Wenn nur der Status aktualisiert wird, keine vollständige Validierung
        if (Object.keys(updateData).length === 1 && updateData.status) {
            if (!Object.values(client_1.TaskStatus).includes(updateData.status)) {
                return res.status(400).json({ error: 'Ungültiger Status' });
            }
        }
        else {
            const validationError = (0, taskValidation_1.validateTask)(updateData);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }
        // Erstelle ein Objekt für die zu aktualisierenden Daten
        const updateDataForPrisma = {};
        // Füge nur die Felder hinzu, die tatsächlich aktualisiert werden sollen
        if (updateData.title !== undefined)
            updateDataForPrisma.title = updateData.title;
        if (updateData.description !== undefined)
            updateDataForPrisma.description = updateData.description;
        if (updateData.status !== undefined)
            updateDataForPrisma.status = updateData.status;
        if (updateData.branchId !== undefined)
            updateDataForPrisma.branchId = updateData.branchId;
        if (updateData.qualityControlId !== undefined)
            updateDataForPrisma.qualityControlId = updateData.qualityControlId;
        if (updateData.dueDate !== undefined)
            updateDataForPrisma.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
        // Füge responsibleId nur hinzu, wenn es einen Wert hat (nicht null/undefined)
        if (updateData.responsibleId) {
            updateDataForPrisma.responsibleId = updateData.responsibleId;
        }
        else if (updateData.responsibleId === null && 'responsibleId' in updateData) {
            // Wenn explizit null gesetzt wird und eine Rolle gewählt wurde, entferne die Beziehung
            updateDataForPrisma.responsibleId = null;
        }
        // Füge roleId nur hinzu, wenn es einen Wert hat (nicht null/undefined)
        if (updateData.roleId) {
            updateDataForPrisma.roleId = updateData.roleId;
        }
        else if (updateData.roleId === null && 'roleId' in updateData) {
            // Wenn explizit null gesetzt wird, entferne die Beziehung
            updateDataForPrisma.roleId = null;
        }
        const task = yield prisma.task.update({
            where: { id: taskId },
            data: updateDataForPrisma,
            include: {
                responsible: {
                    select: userSelect
                },
                role: {
                    select: roleSelect
                },
                qualityControl: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });
        // Benachrichtigung bei Statusänderung
        if (updateData.status && updateData.status !== currentTask.status) {
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.responsibleId,
                    title: 'Task-Status geändert',
                    message: `Der Status des Tasks "${task.title}" wurde von "${currentTask.status}" zu "${updateData.status}" geändert.`,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'status'
                });
            }
            // Benachrichtigung für die Qualitätskontrolle
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.qualityControlId,
                title: 'Task-Status geändert',
                message: `Der Status des Tasks "${task.title}" wurde von "${currentTask.status}" zu "${updateData.status}" geändert.`,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'status'
            });
        }
        // Benachrichtigung bei Änderung des Verantwortlichen
        else if (updateData.responsibleId && updateData.responsibleId !== currentTask.responsibleId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: updateData.responsibleId,
                title: 'Task zugewiesen',
                message: `Dir wurde der Task "${task.title}" zugewiesen.`,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Benachrichtigung bei Änderung der Qualitätskontrolle
        else if (updateData.qualityControlId && updateData.qualityControlId !== currentTask.qualityControlId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: updateData.qualityControlId,
                title: 'Qualitätskontrolle zugewiesen',
                message: `Du wurdest als Qualitätskontrolle für den Task "${task.title}" zugewiesen.`,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Allgemeine Aktualisierungsbenachrichtigung
        else if (Object.keys(updateData).length > 0) {
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.responsibleId,
                    title: 'Task aktualisiert',
                    message: `Der Task "${task.title}" wurde aktualisiert.`,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
            // Benachrichtigung für die Qualitätskontrolle
            if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.qualityControlId,
                    title: 'Task aktualisiert',
                    message: `Der Task "${task.title}" wurde aktualisiert.`,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
        }
        res.json(task);
    }
    catch (error) {
        console.error('Fehler beim Aktualisieren des Tasks:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                error: 'Fehler beim Aktualisieren des Tasks',
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateTask = updateTask;
// Task löschen
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        // Task vor dem Löschen abrufen, um Benachrichtigungen zu senden
        const task = yield prisma.task.findUnique({
            where: { id: taskId },
            include: {
                responsible: {
                    select: userSelect
                },
                qualityControl: {
                    select: userSelect
                }
            }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        yield prisma.task.delete({
            where: { id: taskId }
        });
        // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
        if (task.responsibleId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.responsibleId,
                title: 'Task gelöscht',
                message: `Der Task "${task.title}" wurde gelöscht.`,
                type: client_1.NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }
        // Benachrichtigung für die Qualitätskontrolle
        if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.qualityControlId,
                title: 'Task gelöscht',
                message: `Der Task "${task.title}" wurde gelöscht.`,
                type: client_1.NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Fehler beim Löschen des Tasks:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                error: 'Fehler beim Löschen des Tasks',
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.deleteTask = deleteTask;
// Cerebro-Artikel eines Tasks abrufen
const getTaskCarticles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        const task = yield prisma.task.findUnique({
            where: { id: taskId },
            include: {
                carticles: {
                    include: {
                        carticle: {
                            select: {
                                id: true,
                                title: true,
                                slug: true,
                                content: true,
                                createdAt: true,
                                updatedAt: true,
                                createdBy: {
                                    select: userSelect
                                }
                            }
                        }
                    }
                }
            }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        // Transformation der Daten für eine einfachere Frontend-Nutzung
        const carticles = task.carticles.map(link => ({
            id: link.carticle.id,
            title: link.carticle.title,
            slug: link.carticle.slug,
            content: link.carticle.content,
            createdAt: link.carticle.createdAt,
            updatedAt: link.carticle.updatedAt,
            createdBy: link.carticle.createdBy
        }));
        res.json(carticles);
    }
    catch (error) {
        console.error('Fehler beim Abrufen der verknüpften Artikel:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getTaskCarticles = getTaskCarticles;
// Cerebro-Artikel mit Task verknüpfen
const linkTaskToCarticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const carticleId = parseInt(req.params.carticleId, 10);
        if (isNaN(taskId) || isNaN(carticleId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID oder Artikel-ID' });
        }
        // Prüfen, ob Task existiert
        const task = yield prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        // Prüfen, ob Artikel existiert
        const carticle = yield prisma.cerebroCarticle.findUnique({ where: { id: carticleId } });
        if (!carticle) {
            return res.status(404).json({ error: 'Artikel nicht gefunden' });
        }
        // Verknüpfung erstellen
        const link = yield prisma.taskCerebroCarticle.create({
            data: {
                taskId,
                carticleId
            },
            include: {
                carticle: {
                    select: {
                        id: true,
                        title: true,
                        slug: true,
                        content: true,
                        createdAt: true,
                        updatedAt: true,
                        createdBy: {
                            select: userSelect
                        }
                    }
                }
            }
        });
        res.status(201).json(link.carticle);
    }
    catch (error) {
        console.error('Fehler beim Verknüpfen des Artikels:', error);
        // Behandlung von einzigartigen Einschränkungsverletzungen
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Diese Verknüpfung existiert bereits' });
        }
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.linkTaskToCarticle = linkTaskToCarticle;
// Verknüpfung zwischen Task und Cerebro-Artikel entfernen
const unlinkTaskFromCarticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const carticleId = parseInt(req.params.carticleId, 10);
        if (isNaN(taskId) || isNaN(carticleId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID oder Artikel-ID' });
        }
        // Verknüpfung suchen
        const link = yield prisma.taskCerebroCarticle.findUnique({
            where: {
                taskId_carticleId: {
                    taskId,
                    carticleId
                }
            }
        });
        if (!link) {
            return res.status(404).json({ error: 'Verknüpfung nicht gefunden' });
        }
        // Verknüpfung löschen
        yield prisma.taskCerebroCarticle.delete({
            where: {
                taskId_carticleId: {
                    taskId,
                    carticleId
                }
            }
        });
        res.status(200).json({ message: 'Verknüpfung erfolgreich entfernt' });
    }
    catch (error) {
        console.error('Fehler beim Entfernen der Verknüpfung:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.unlinkTaskFromCarticle = unlinkTaskFromCarticle;
//# sourceMappingURL=taskController.js.map