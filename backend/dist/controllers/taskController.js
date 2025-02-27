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
        yield prisma.task.delete({
            where: { id: taskId }
        });
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