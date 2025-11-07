// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma, TaskStatus, NotificationType } from '@prisma/client';
import { validateTask, TaskData } from '../validation/taskValidation';
import { createNotificationIfEnabled } from './notificationController';
import { getDataIsolationFilter, getUserOrganizationFilter } from '../middleware/organization';

const prisma = new PrismaClient();

const userSelect = {
    id: true,
    firstName: true,
    lastName: true
} as const;

const roleSelect = {
    id: true,
    name: true
} as const;

const branchSelect = {
    id: true,
    name: true
} as const;

interface TaskParams {
    id: string;
}

// Alle Tasks abrufen
export const getAllTasks = async (req: Request, res: Response) => {
    try {
        // Datenisolation: Standalone User sehen nur ihre eigenen Tasks
        const isolationFilter = getDataIsolationFilter(req, 'task');
        
        const tasks = await prisma.task.findMany({
            where: isolationFilter,
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
                },
                attachments: {
                    orderBy: {
                        uploadedAt: 'desc'
                    }
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

        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = getDataIsolationFilter(req as any, 'task');
        
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ...isolationFilter
            },
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
                },
                attachments: {
                    orderBy: {
                        uploadedAt: 'desc'
                    }
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

        // Validierung: Prüfe ob User-IDs zur Organisation gehören
        const userFilter = getUserOrganizationFilter(req);
        
        if (taskData.responsibleId) {
            const responsibleUser = await prisma.user.findFirst({
                where: {
                    ...userFilter,
                    id: taskData.responsibleId
                }
            });
            if (!responsibleUser) {
                return res.status(400).json({ error: 'Verantwortlicher Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }

        if (taskData.qualityControlId) {
            const qualityControlUser = await prisma.user.findFirst({
                where: {
                    ...userFilter,
                    id: taskData.qualityControlId
                }
            });
            if (!qualityControlUser) {
                return res.status(400).json({ error: 'Qualitätskontrolle-Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }

        // Erstelle ein Basis-Datenobjekt ohne responsibleId/roleId
        const taskCreateData: any = {
            title: taskData.title,
            description: taskData.description || '',
            status: taskData.status || 'open',
            qualityControlId: taskData.qualityControlId,
            branchId: taskData.branchId,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
            organizationId: req.organizationId || null
        };

        // Füge responsibleId nur hinzu, wenn ein Wert angegeben ist (nicht null oder undefined)
        if (taskData.responsibleId) {
            taskCreateData.responsibleId = taskData.responsibleId;
        }

        // Füge roleId nur hinzu, wenn ein Wert angegeben ist (nicht null oder undefined)
        if (taskData.roleId) {
            taskCreateData.roleId = taskData.roleId;
        }

        const task = await prisma.task.create({
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
            await createNotificationIfEnabled({
                userId: taskData.responsibleId,
                title: 'Neuer Task zugewiesen',
                message: `Dir wurde ein neuer Task zugewiesen: ${taskData.title}`,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'create'
            });
        }

        // Benachrichtigung für die Qualitätskontrolle erstellen
        await createNotificationIfEnabled({
            userId: taskData.qualityControlId,
            title: 'Neue Qualitätskontrolle zugewiesen',
            message: `Du wurdest als Qualitätskontrolle für einen neuen Task zugewiesen: ${taskData.title}`,
            type: NotificationType.task,
            relatedEntityId: task.id,
            relatedEntityType: 'create'
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
        
        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = getDataIsolationFilter(req as any, 'task');
        
        // Aktuellen Task abrufen, um Änderungen zu erkennen
        const currentTask = await prisma.task.findFirst({
            where: {
                id: taskId,
                ...isolationFilter
            },
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
            if (!Object.values(TaskStatus).includes(updateData.status)) {
                return res.status(400).json({ error: 'Ungültiger Status' });
            }
        } else {
            const validationError = validateTask(updateData);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        // Validierung: Prüfe ob User-IDs zur Organisation gehören (wenn geändert)
        if (updateData.responsibleId !== undefined && updateData.responsibleId !== null) {
            const userFilter = getUserOrganizationFilter(req as any);
            const responsibleUser = await prisma.user.findFirst({
                where: {
                    ...userFilter,
                    id: updateData.responsibleId
                }
            });
            if (!responsibleUser) {
                return res.status(400).json({ error: 'Verantwortlicher Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }

        if (updateData.qualityControlId !== undefined && updateData.qualityControlId !== null) {
            const userFilter = getUserOrganizationFilter(req as any);
            const qualityControlUser = await prisma.user.findFirst({
                where: {
                    ...userFilter,
                    id: updateData.qualityControlId
                }
            });
            if (!qualityControlUser) {
                return res.status(400).json({ error: 'Qualitätskontrolle-Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }

        // Erstelle ein Objekt für die zu aktualisierenden Daten
        const updateDataForPrisma: any = {};

        // Füge nur die Felder hinzu, die tatsächlich aktualisiert werden sollen
        if (updateData.title !== undefined) updateDataForPrisma.title = updateData.title;
        if (updateData.description !== undefined) updateDataForPrisma.description = updateData.description;
        if (updateData.status !== undefined) updateDataForPrisma.status = updateData.status;
        if (updateData.branchId !== undefined) updateDataForPrisma.branchId = updateData.branchId;
        if (updateData.qualityControlId !== undefined) updateDataForPrisma.qualityControlId = updateData.qualityControlId;
        if (updateData.dueDate !== undefined) updateDataForPrisma.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;

        // Füge responsibleId nur hinzu, wenn es einen Wert hat (nicht null/undefined)
        if (updateData.responsibleId) {
            updateDataForPrisma.responsibleId = updateData.responsibleId;
        } else if (updateData.responsibleId === null && 'responsibleId' in updateData) {
            // Wenn explizit null gesetzt wird und eine Rolle gewählt wurde, entferne die Beziehung
            updateDataForPrisma.responsibleId = null;
        }

        // Füge roleId nur hinzu, wenn es einen Wert hat (nicht null/undefined)
        if (updateData.roleId) {
            updateDataForPrisma.roleId = updateData.roleId;
        } else if (updateData.roleId === null && 'roleId' in updateData) {
            // Wenn explizit null gesetzt wird, entferne die Beziehung
            updateDataForPrisma.roleId = null;
        }

        const task = await prisma.task.update({
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
            // Status-History speichern
            const userId = req.userId;
            if (userId) {
                await prisma.taskStatusHistory.create({
                    data: {
                        taskId: task.id,
                        userId: Number(userId),
                        oldStatus: currentTask.status,
                        newStatus: updateData.status,
                        branchId: task.branchId,
                        changedAt: new Date()
                    }
                });
            }
            
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                await createNotificationIfEnabled({
                    userId: task.responsibleId,
                    title: 'Task-Status geändert',
                    message: `Der Status des Tasks "${task.title}" wurde von "${currentTask.status}" zu "${updateData.status}" geändert.`,
                    type: NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'status'
                });
            }
            
            // Benachrichtigung für die Qualitätskontrolle
            await createNotificationIfEnabled({
                userId: task.qualityControlId,
                title: 'Task-Status geändert',
                message: `Der Status des Tasks "${task.title}" wurde von "${currentTask.status}" zu "${updateData.status}" geändert.`,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'status'
            });
        } 
        // Benachrichtigung bei Änderung des Verantwortlichen
        else if (updateData.responsibleId && updateData.responsibleId !== currentTask.responsibleId) {
            await createNotificationIfEnabled({
                userId: updateData.responsibleId,
                title: 'Task zugewiesen',
                message: `Dir wurde der Task "${task.title}" zugewiesen.`,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Benachrichtigung bei Änderung der Qualitätskontrolle
        else if (updateData.qualityControlId && updateData.qualityControlId !== currentTask.qualityControlId) {
            await createNotificationIfEnabled({
                userId: updateData.qualityControlId,
                title: 'Qualitätskontrolle zugewiesen',
                message: `Du wurdest als Qualitätskontrolle für den Task "${task.title}" zugewiesen.`,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Allgemeine Aktualisierungsbenachrichtigung
        else if (Object.keys(updateData).length > 0) {
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                await createNotificationIfEnabled({
                    userId: task.responsibleId,
                    title: 'Task aktualisiert',
                    message: `Der Task "${task.title}" wurde aktualisiert.`,
                    type: NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
            
            // Benachrichtigung für die Qualitätskontrolle
            if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
                await createNotificationIfEnabled({
                    userId: task.qualityControlId,
                    title: 'Task aktualisiert',
                    message: `Der Task "${task.title}" wurde aktualisiert.`,
                    type: NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
        }
        
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

        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = getDataIsolationFilter(req as any, 'task');

        // Task vor dem Löschen abrufen, um Benachrichtigungen zu senden
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ...isolationFilter
            },
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

        await prisma.task.delete({
            where: { id: taskId }
        });

        // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
        if (task.responsibleId) {
            await createNotificationIfEnabled({
                userId: task.responsibleId,
                title: 'Task gelöscht',
                message: `Der Task "${task.title}" wurde gelöscht.`,
                type: NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }
        
        // Benachrichtigung für die Qualitätskontrolle
        if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
            await createNotificationIfEnabled({
                userId: task.qualityControlId,
                title: 'Task gelöscht',
                message: `Der Task "${task.title}" wurde gelöscht.`,
                type: NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }

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

// Cerebro-Artikel eines Tasks abrufen
export const getTaskCarticles = async (req: Request<TaskParams>, res: Response) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }

        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = getDataIsolationFilter(req as any, 'task');

        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ...isolationFilter
            },
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
    } catch (error) {
        console.error('Fehler beim Abrufen der verknüpften Artikel:', error);
        res.status(500).json({ 
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Cerebro-Artikel mit Task verknüpfen
export const linkTaskToCarticle = async (req: Request, res: Response) => {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const carticleId = parseInt(req.params.carticleId, 10);
        
        if (isNaN(taskId) || isNaN(carticleId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID oder Artikel-ID' });
        }

        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = getDataIsolationFilter(req as any, 'task');

        // Prüfen, ob Task existiert
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                ...isolationFilter
            }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        
        // Prüfen, ob Artikel existiert
        const carticle = await prisma.cerebroCarticle.findUnique({ where: { id: carticleId } });
        if (!carticle) {
            return res.status(404).json({ error: 'Artikel nicht gefunden' });
        }
        
        // Verknüpfung erstellen
        const link = await prisma.taskCerebroCarticle.create({
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
    } catch (error) {
        console.error('Fehler beim Verknüpfen des Artikels:', error);
        
        // Behandlung von einzigartigen Einschränkungsverletzungen
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Diese Verknüpfung existiert bereits' });
        }
        
        res.status(500).json({ 
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Verknüpfung zwischen Task und Cerebro-Artikel entfernen
export const unlinkTaskFromCarticle = async (req: Request, res: Response) => {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const carticleId = parseInt(req.params.carticleId, 10);
        
        if (isNaN(taskId) || isNaN(carticleId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID oder Artikel-ID' });
        }

        // Verknüpfung suchen
        const link = await prisma.taskCerebroCarticle.findUnique({
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
        await prisma.taskCerebroCarticle.delete({
            where: {
                taskId_carticleId: {
                    taskId,
                    carticleId
                }
            }
        });
        
        res.status(200).json({ message: 'Verknüpfung erfolgreich entfernt' });
    } catch (error) {
        console.error('Fehler beim Entfernen der Verknüpfung:', error);
        res.status(500).json({ 
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 