// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma, TaskStatus } from '@prisma/client';
import { validateTask, TaskData } from '../validation/taskValidation';

const prisma = new PrismaClient();

const userSelect = {
    id: true,
    firstName: true,
    lastName: true
} as const;

const branchSelect = {
    id: true,
    name: true
} as const;

interface TaskParams {
    id: string;
}

// Alle Tasks abrufen
export const getAllTasks = async (_req: Request, res: Response) => {
    try {
        const tasks = await prisma.task.findMany({
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
    } catch (error) {
        console.error('Fehler beim Abrufen der Tasks:', error);
        res.status(500).json({ 
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Einzelnen Task abrufen
export const getTaskById = async (req: Request<TaskParams>, res: Response) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }

        const task = await prisma.task.findUnique({
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
    } catch (error) {
        console.error('Fehler beim Abrufen des Tasks:', error);
        res.status(500).json({ 
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Neuen Task erstellen
export const createTask = async (req: Request<{}, {}, TaskData>, res: Response) => {
    try {
        const taskData = req.body;
        const validationError = validateTask(taskData);
        
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }

        const task = await prisma.task.create({
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
    } catch (error) {
        console.error('Fehler beim Erstellen des Tasks:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                error: 'Fehler beim Erstellen des Tasks',
                details: error.message,
                meta: error.meta
            });
        } else {
            res.status(500).json({ 
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
};

// Task aktualisieren
export const updateTask = async (req: Request<TaskParams, {}, Partial<TaskData>>, res: Response) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }

        const updateData = req.body;
        
        // Wenn nur der Status aktualisiert wird, keine vollständige Validierung
        if (Object.keys(updateData).length === 1 && updateData.status) {
            if (!Object.values(TaskStatus).includes(updateData.status)) {
                return res.status(400).json({ error: 'Ungültiger Status' });
            }
        } else {
            const validationError = validateTask(updateData);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        const task = await prisma.task.update({
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
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Tasks:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                error: 'Fehler beim Aktualisieren des Tasks',
                details: error.message,
                meta: error.meta
            });
        } else {
            res.status(500).json({ 
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
};

// Task löschen
export const deleteTask = async (req: Request<TaskParams>, res: Response) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }

        await prisma.task.delete({
            where: { id: taskId }
        });
        res.status(204).send();
    } catch (error) {
        console.error('Fehler beim Löschen des Tasks:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                error: 'Fehler beim Löschen des Tasks',
                details: error.message,
                meta: error.meta
            });
        } else {
            res.status(500).json({ 
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
}; 