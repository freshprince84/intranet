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
exports.deleteTask = exports.updateTask = exports.createTask = exports.getTaskById = exports.getAllTasks = void 0;
const client_1 = require("@prisma/client");
const taskValidation_1 = require("../validation/taskValidation");
const notificationController_1 = require("./notificationController");
const prisma = new client_1.PrismaClient();
const userSelect = {
    id: true,
    firstName: true,
    lastName: true
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
        const task = yield prisma.task.create({
            data: {
                title: taskData.title,
                description: taskData.description || '',
                status: taskData.status || 'open',
                responsibleId: taskData.responsibleId,
                qualityControlId: taskData.qualityControlId,
                branchId: taskData.branchId,
                dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null
            },
            include: {
                responsible: {
                    select: userSelect
                },
                qualityControl: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });
        // Benachrichtigung für den Verantwortlichen erstellen
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: taskData.responsibleId,
            title: 'Neuer Task zugewiesen',
            message: `Dir wurde ein neuer Task zugewiesen: ${taskData.title}`,
            type: client_1.NotificationType.task,
            relatedEntityId: task.id,
            relatedEntityType: 'create'
        });
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
        const task = yield prisma.task.update({
            where: { id: taskId },
            data: {
                title: updateData.title,
                description: updateData.description,
                status: updateData.status,
                responsibleId: updateData.responsibleId,
                qualityControlId: updateData.qualityControlId,
                branchId: updateData.branchId,
                dueDate: updateData.dueDate ? new Date(updateData.dueDate) : undefined
            },
            include: {
                responsible: {
                    select: userSelect
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
            // Benachrichtigung für den Verantwortlichen
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.responsibleId,
                title: 'Task-Status geändert',
                message: `Der Status des Tasks "${task.title}" wurde von "${currentTask.status}" zu "${updateData.status}" geändert.`,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'status'
            });
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
            // Benachrichtigung für den Verantwortlichen
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.responsibleId,
                title: 'Task aktualisiert',
                message: `Der Task "${task.title}" wurde aktualisiert.`,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
            // Benachrichtigung für die Qualitätskontrolle
            if (task.responsibleId !== task.qualityControlId) {
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
        // Benachrichtigung für den Verantwortlichen
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: task.responsibleId,
            title: 'Task gelöscht',
            message: `Der Task "${task.title}" wurde gelöscht.`,
            type: client_1.NotificationType.task,
            relatedEntityId: taskId,
            relatedEntityType: 'delete'
        });
        // Benachrichtigung für die Qualitätskontrolle
        if (task.responsibleId !== task.qualityControlId) {
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
//# sourceMappingURL=taskController.js.map