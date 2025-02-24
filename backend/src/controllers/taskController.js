const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { validateTask } = require('../validation/taskValidation');

const taskController = {
    // Alle Tasks abrufen
    getAllTasks: async (req, res) => {
        try {
            const tasks = await prisma.task.findMany({
                include: {
                    responsible: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    qualityControl: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                }
            });
            res.json(tasks);
        } catch (error) {
            console.error('Fehler beim Abrufen der Tasks:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    },

    // Einzelnen Task abrufen
    getTaskById: async (req, res) => {
        try {
            const { id } = req.params;
            const task = await prisma.task.findUnique({
                where: { id: parseInt(id) },
                include: {
                    responsible: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    qualityControl: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                }
            });
            
            if (!task) {
                return res.status(404).json({ error: 'Task nicht gefunden' });
            }
            
            res.json(task);
        } catch (error) {
            console.error('Fehler beim Abrufen des Tasks:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    },

    // Neuen Task erstellen
    createTask: async (req, res) => {
        try {
            const taskData = req.body;
            const validationError = validateTask(taskData);
            
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }

            const task = await prisma.task.create({
                data: {
                    title: taskData.title,
                    description: taskData.description,
                    status: taskData.status || 'open',
                    responsibleId: taskData.responsibleId,
                    qualityControlId: taskData.qualityControlId,
                    branchId: taskData.branchId,
                    dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
                    requestId: taskData.requestId || null,
                },
                include: {
                    responsible: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    qualityControl: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                }
            });
            
            res.status(201).json(task);
        } catch (error) {
            console.error('Fehler beim Erstellen des Tasks:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    },

    // Task aktualisieren
    updateTask: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            
            // Wenn nur der Status aktualisiert wird, keine vollständige Validierung
            if (Object.keys(updateData).length === 1 && updateData.status) {
                if (!['open', 'in_progress', 'improval', 'quality_control', 'done'].includes(updateData.status)) {
                    return res.status(400).json({ error: 'Ungültiger Status' });
                }
            } else {
                const validationError = validateTask(updateData);
                if (validationError) {
                    return res.status(400).json({ error: validationError });
                }
            }

            const task = await prisma.task.update({
                where: { id: parseInt(id) },
                data: {
                    title: updateData.title,
                    description: updateData.description,
                    status: updateData.status,
                    responsibleId: updateData.responsibleId,
                    qualityControlId: updateData.qualityControlId,
                    branchId: updateData.branchId,
                    dueDate: updateData.dueDate ? new Date(updateData.dueDate) : null,
                    requestId: updateData.requestId,
                },
                include: {
                    responsible: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    qualityControl: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true,
                        }
                    },
                }
            });
            
            res.json(task);
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Tasks:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    },

    // Task löschen
    deleteTask: async (req, res) => {
        try {
            const { id } = req.params;
            await prisma.task.delete({
                where: { id: parseInt(id) }
            });
            res.status(204).send();
        } catch (error) {
            console.error('Fehler beim Löschen des Tasks:', error);
            res.status(500).json({ error: 'Interner Serverfehler' });
        }
    }
};

module.exports = taskController; 