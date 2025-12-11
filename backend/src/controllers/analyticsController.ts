import { Request, Response } from 'express';
import { TaskStatus, RequestStatus } from '@prisma/client';
import { getDataIsolationFilter, getUserOrganizationFilter } from '../middleware/organization';
import { startOfDay, endOfDay, parseISO, format } from 'date-fns';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// To-Dos pro User für ein bestimmtes Datum
export const getTodosByUserForDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const userId = req.userId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }

        // Datenisolation: User sehen nur Daten ihrer Organisation
        const taskFilter = getDataIsolationFilter(req, 'task');
        const userFilter = getUserOrganizationFilter(req);

        const selectedDate = parseISO(date);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        // Alle User mit ihren To-Dos für das Datum
        const users = await prisma.user.findMany({
            where: userFilter,
            include: {
                tasksResponsible: {
                    where: {
                        AND: [
                            taskFilter,
                            {
                                OR: [
                                    {
                                        updatedAt: {
                                            gte: start,
                                            lte: end
                                        }
                                    },
                                    {
                                        createdAt: {
                                            gte: start,
                                            lte: end
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    // ✅ PERFORMANCE: Nur benötigte Felder, KEINE Attachments (Binary-Daten)
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        updatedAt: true,
                        createdAt: true,
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        _count: {
                            select: { attachments: true }
                        }
                    }
                },
                tasksQualityControl: {
                    where: {
                        AND: [
                            taskFilter,
                            {
                                OR: [
                                    {
                                        updatedAt: {
                                            gte: start,
                                            lte: end
                                        }
                                    },
                                    {
                                        createdAt: {
                                            gte: start,
                                            lte: end
                                        }
                                    }
                                ]
                            }
                        ]
                    },
                    // ✅ PERFORMANCE: Nur benötigte Felder, KEINE Attachments (Binary-Daten)
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        updatedAt: true,
                        createdAt: true,
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        _count: {
                            select: { attachments: true }
                        }
                    }
                }
            }
        });

        // Kombiniere beide Listen und formatiere
        const result = users.map(user => {
            // Kombiniere responsible und qualityControl Tasks
            const allTasks = [
                ...user.tasksResponsible.map(t => ({ ...t, role: 'responsible' as const })),
                ...user.tasksQualityControl.map(t => ({ ...t, role: 'quality_control' as const }))
            ];

            // Entferne Duplikate (falls ein Task sowohl responsible als auch qualityControl ist)
            const uniqueTasks = Array.from(
                new Map(allTasks.map(t => [t.id, t])).values()
            );

            const completed = uniqueTasks.filter(t => t.status === 'done').length;
            const open = uniqueTasks.filter(t => t.status === 'open').length;
            const inProgress = uniqueTasks.filter(t => t.status === 'in_progress').length;
            const inQualityControl = uniqueTasks.filter(t => t.status === 'quality_control').length;

            return {
                userId: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                todos: {
                    total: uniqueTasks.length,
                    completed,
                    open,
                    inProgress,
                    inQualityControl,
                    details: uniqueTasks.map(t => ({
                        id: t.id,
                        title: t.title,
                        status: t.status,
                        role: t.role,
                        branch: t.branch,
                        updatedAt: t.updatedAt,
                        createdAt: t.createdAt
                    }))
                }
            };
        });

        res.json(result);
    } catch (error) {
        logger.error('Fehler beim Abrufen der To-Dos pro User:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der To-Dos' });
    }
};

// Requests pro User für ein bestimmtes Datum
export const getRequestsByUserForDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const userId = req.userId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }

        // Datenisolation: User sehen nur Daten ihrer Organisation
        const requestFilter = getDataIsolationFilter(req, 'request');
        const userFilter = getUserOrganizationFilter(req);

        const selectedDate = parseISO(date);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        // Alle User mit ihren Requests für das Datum
        const users = await prisma.user.findMany({
            where: userFilter,
            include: {
                requestsRequester: {
                    where: {
                        AND: [
                            requestFilter,
                            {
                                createdAt: {
                                    gte: start,
                                    lte: end
                                }
                            }
                        ]
                    },
                    // ✅ PERFORMANCE: Nur benötigte Felder, KEINE Attachments
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        createdAt: true,
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        _count: {
                            select: { attachments: true }
                        }
                    }
                },
                requestsResponsible: {
                    where: {
                        AND: [
                            requestFilter,
                            {
                                createdAt: {
                                    gte: start,
                                    lte: end
                                }
                            }
                        ]
                    },
                    // ✅ PERFORMANCE: Nur benötigte Felder, KEINE Attachments
                    select: {
                        id: true,
                        title: true,
                        status: true,
                        createdAt: true,
                        branch: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        _count: {
                            select: { attachments: true }
                        }
                    }
                }
            }
        });

        // Kombiniere beide Listen und formatiere
        const result = users.map(user => {
            // Kombiniere requester und responsible Requests
            const allRequests = [
                ...user.requestsRequester.map(r => ({ ...r, role: 'requester' as const })),
                ...user.requestsResponsible.map(r => ({ ...r, role: 'responsible' as const }))
            ];

            // Entferne Duplikate
            const uniqueRequests = Array.from(
                new Map(allRequests.map(r => [r.id, r])).values()
            );

            const approved = uniqueRequests.filter(r => r.status === 'approved').length;
            const pending = uniqueRequests.filter(r => r.status === 'approval').length;
            const denied = uniqueRequests.filter(r => r.status === 'denied').length;
            const toImprove = uniqueRequests.filter(r => r.status === 'to_improve').length;

            return {
                userId: user.id,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                requests: {
                    total: uniqueRequests.length,
                    approved,
                    pending,
                    denied,
                    toImprove,
                    details: uniqueRequests.map(r => ({
                        id: r.id,
                        title: r.title,
                        status: r.status,
                        role: r.role,
                        branch: r.branch,
                        createdAt: r.createdAt,
                        updatedAt: r.updatedAt
                    }))
                }
            };
        });

        res.json(result);
    } catch (error) {
        logger.error('Fehler beim Abrufen der Requests pro User:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Requests' });
    }
};

// Alle To-Dos chronologisch für ein Datum (Tab 2)
export const getTodosChronological = async (req: Request, res: Response) => {
    try {
        const { date, branchId, userId } = req.query;
        const currentUserId = req.userId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }

        // Datenisolation
        const taskFilter = getDataIsolationFilter(req, 'task');

        const selectedDate = parseISO(date);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        // Kombiniere taskFilter mit Zeitfilter
        const where: any = {
            AND: [
                taskFilter,
                {
                    OR: [
                        {
                            updatedAt: {
                                gte: start,
                                lte: end
                            }
                        },
                        {
                            createdAt: {
                                gte: start,
                                lte: end
                            }
                        }
                    ]
                }
            ]
        };

        if (branchId) {
            where.AND.push({
                branchId: parseInt(branchId as string, 10)
            });
        }

        if (userId) {
            // Wenn userId gefiltert wird, überschreibe taskFilter
            where.AND = [
                {
                    OR: [
                        { responsibleId: parseInt(userId as string, 10) },
                        { qualityControlId: parseInt(userId as string, 10) }
                    ]
                },
                {
                    OR: [
                        {
                            updatedAt: {
                                gte: start,
                                lte: end
                            }
                        },
                        {
                            createdAt: {
                                gte: start,
                                lte: end
                            }
                        }
                    ]
                }
            ];
            if (branchId) {
                where.AND.push({
                    branchId: parseInt(branchId as string, 10)
                });
            }
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                responsible: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                },
                qualityControl: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                // ✅ PERFORMANCE: Nur Count, KEINE Binary-Daten
                _count: {
                    select: { attachments: true }
                },
                statusHistory: {
                    where: {
                        changedAt: {
                            gte: start,
                            lte: end
                        }
                    },
                    orderBy: {
                        changedAt: 'desc'
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                username: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });

        res.json(tasks);
    } catch (error) {
        logger.error('Fehler beim Abrufen der chronologischen To-Dos:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der To-Dos' });
    }
};

// Alle Requests chronologisch für ein Datum (Tab 3)
export const getRequestsChronological = async (req: Request, res: Response) => {
    try {
        const { date, branchId, userId } = req.query;
        const currentUserId = req.userId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }

        // Datenisolation
        const requestFilter = getDataIsolationFilter(req, 'request');

        const selectedDate = parseISO(date);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        // Kombiniere requestFilter mit Zeitfilter
        const where: any = {
            AND: [
                requestFilter,
                {
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                }
            ]
        };

        if (branchId) {
            where.AND.push({
                branchId: parseInt(branchId as string, 10)
            });
        }

        if (userId) {
            // Wenn userId gefiltert wird, überschreibe requestFilter
            where.AND = [
                {
                    OR: [
                        { requesterId: parseInt(userId as string, 10) },
                        { responsibleId: parseInt(userId as string, 10) }
                    ]
                },
                {
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                }
            ];
            if (branchId) {
                where.AND.push({
                    branchId: parseInt(branchId as string, 10)
                });
            }
        }

        const requests = await prisma.request.findMany({
            where,
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                },
                responsible: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                // ✅ PERFORMANCE: Nur Count, KEINE Binary-Daten
                _count: {
                    select: { attachments: true }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(requests);
    } catch (error) {
        logger.error('Fehler beim Abrufen der chronologischen Requests:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Requests' });
    }
};

// Häufigkeitsanalyse für To-Dos (Tab 2)
export const getTodosFrequencyAnalysis = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const currentUserId = req.userId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }

        // Datenisolation
        const taskFilter = getDataIsolationFilter(req, 'task');
        const userFilter = getUserOrganizationFilter(req);
        
        // Erstelle Filter für TaskStatusHistory (basierend auf Task-Filter)
        // Da TaskStatusHistory taskId referenziert, müssen wir über Tasks filtern
        const taskIdsForHistory = await prisma.task.findMany({
            where: taskFilter,
            select: { id: true }
        });
        const allowedTaskIds = taskIdsForHistory.map(t => t.id);

        const selectedDate = parseISO(date);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        // 1. Erledigungsrate pro User
        const userCompletionStats = await prisma.taskStatusHistory.groupBy({
            by: ['userId'],
            where: {
                AND: [
                    {
                        taskId: { in: allowedTaskIds }
                    },
                    {
                        newStatus: 'done',
                        changedAt: {
                            gte: start,
                            lte: end
                        }
                    }
                ]
            },
            _count: {
                id: true
            },
            _max: {
                changedAt: true
            }
        });

        // User-Details für die Stats
        const userIds = userCompletionStats.map(s => s.userId);
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    userFilter,
                    { id: { in: userIds } }
                ]
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true
            }
        });

        const userStats = userCompletionStats.map(stat => {
            const user = users.find(u => u.id === stat.userId);
            return {
                userId: stat.userId,
                user: user ? {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    username: user.username
                } : null,
                completedCount: stat._count.id,
                lastCompletedAt: stat._max.changedAt
            };
        }).sort((a, b) => b.completedCount - a.completedCount);

        // 2. Häufigste/nicht erledigte To-Dos (basierend auf Status-Wechseln zu "done")
        const taskCompletionStats = await prisma.taskStatusHistory.groupBy({
            by: ['taskId'],
            where: {
                AND: [
                    {
                        taskId: { in: allowedTaskIds }
                    },
                    {
                        newStatus: 'done',
                        changedAt: {
                            gte: start,
                            lte: end
                        }
                    }
                ]
            },
            _count: {
                id: true
            },
            _max: {
                changedAt: true
            }
        });

        // Task-Details für die Stats
        const taskIds = taskCompletionStats.map(s => s.taskId);
        const tasks = await prisma.task.findMany({
            where: {
                AND: [
                    taskFilter,
                    {
                        OR: [
                            { id: { in: taskIds } },
                            // Auch Tasks, die NICHT erledigt wurden (für Vergleich)
                            {
                                updatedAt: {
                                    gte: start,
                                    lte: end
                                }
                            }
                        ]
                    }
                ]
            },
            select: {
                id: true,
                title: true,
                status: true,
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        // Kombiniere Completion-Stats mit Task-Details
        const taskStats = tasks.map(task => {
            const completionStat = taskCompletionStats.find(s => s.taskId === task.id);
            return {
                taskId: task.id,
                title: task.title,
                currentStatus: task.status,
                branch: task.branch,
                completedCount: completionStat ? completionStat._count.id : 0,
                lastCompletedAt: completionStat ? completionStat._max.changedAt : null,
                isCompleted: task.status === 'done',
                neverCompleted: !completionStat || completionStat._count.id === 0
            };
        }).sort((a, b) => {
            // Sortiere: zuerst häufig erledigte, dann nie erledigte
            if (a.completedCount !== b.completedCount) {
                return b.completedCount - a.completedCount;
            }
            return a.neverCompleted ? 1 : -1;
        });

        // 3. Durchschnittliche Zeit pro Status (basierend auf Status-Historie)
        // Berechne die Zeit, die Tasks in jedem Status verbracht haben
        const statusTimeStats: Record<string, { totalTime: number; count: number }> = {};
        
        // Lade alle Status-Änderungen für das Datum
        const allStatusChanges = await prisma.taskStatusHistory.findMany({
            where: {
                AND: [
                    {
                        taskId: { in: allowedTaskIds }
                    },
                    {
                        changedAt: {
                            gte: start,
                            lte: end
                        }
                    }
                ]
            },
            orderBy: {
                changedAt: 'asc'
            },
            include: {
                task: {
                    select: {
                        id: true,
                        createdAt: true
                    }
                }
            }
        });

        // Gruppiere nach Task und berechne Status-Dauer
        const taskStatusDurations: Record<number, Record<string, number[]>> = {};
        
        allStatusChanges.forEach((change, index) => {
            if (!taskStatusDurations[change.taskId]) {
                taskStatusDurations[change.taskId] = {};
            }

            // Finde nächste Änderung für diesen Task oder verwende aktuellen Zeitpunkt
            const nextChange = allStatusChanges
                .slice(index + 1)
                .find(c => c.taskId === change.taskId);
            
            const durationEnd = nextChange 
                ? new Date(nextChange.changedAt).getTime()
                : end.getTime();
            
            const duration = durationEnd - new Date(change.changedAt).getTime();
            const durationHours = duration / (1000 * 60 * 60); // Konvertiere zu Stunden

            if (!taskStatusDurations[change.taskId][change.newStatus]) {
                taskStatusDurations[change.taskId][change.newStatus] = [];
            }
            taskStatusDurations[change.taskId][change.newStatus].push(durationHours);
        });

        // Berechne Durchschnitte
        const statusAverages: Record<string, { averageHours: number; taskCount: number }> = {};
        
        Object.keys(TaskStatus).forEach(status => {
            const allDurations: number[] = [];
            Object.values(taskStatusDurations).forEach(taskStatuses => {
                if (taskStatuses[status]) {
                    allDurations.push(...taskStatuses[status]);
                }
            });

            if (allDurations.length > 0) {
                const average = allDurations.reduce((a, b) => a + b, 0) / allDurations.length;
                statusAverages[status] = {
                    averageHours: Math.round(average * 100) / 100, // Runde auf 2 Dezimalen
                    taskCount: allDurations.length
                };
            }
        });

        // Gesamt-Statistiken
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'done').length;
        const neverCompletedTasks = taskStats.filter(t => t.neverCompleted).length;
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        res.json({
            userStats,
            taskStats: taskStats.slice(0, 50), // Top 50
            statusAverages,
            summary: {
                totalTasks,
                completedTasks,
                neverCompletedTasks,
                completionRate: Math.round(completionRate * 100) / 100
            }
        });
    } catch (error) {
        logger.error('Fehler beim Abrufen der Häufigkeitsanalyse:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Häufigkeitsanalyse' });
    }
};

// Schicht-basierte Analysen für To-Dos (Tab 2)
export const getTodosShiftAnalysis = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        const currentUserId = req.userId;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }

        // Datenisolation
        const taskFilter = getDataIsolationFilter(req, 'task');
        const userFilter = getUserOrganizationFilter(req);
        const workTimeFilter = getDataIsolationFilter(req, 'workTime');

        const selectedDate = parseISO(date);
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);

        // 1. Alle WorkTimes (Schichten) für das Datum mit verknüpften Tasks
        const workTimes = await prisma.workTime.findMany({
            where: {
                AND: [
                    workTimeFilter,
                    {
                        startTime: {
                            gte: start,
                            lte: end
                        }
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                },
                branch: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                taskLinks: {
                    include: {
                        task: {
                            include: {
                                responsible: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true
                                    }
                                },
                                qualityControl: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true
                                    }
                                },
                                branch: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        // 2. Statistiken pro Schicht
        const shiftStats = workTimes.map(workTime => {
            const durationMinutes = workTime.endTime
                ? Math.round((new Date(workTime.endTime).getTime() - new Date(workTime.startTime).getTime()) / (1000 * 60))
                : null;
            const durationHours = durationMinutes ? (durationMinutes / 60).toFixed(2) : null;

            const linkedTasks = workTime.taskLinks.map(link => link.task);
            
            // Task-Status-Verteilung in dieser Schicht
            const taskStatusCounts = linkedTasks.reduce((acc, task) => {
                acc[task.status] = (acc[task.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return {
                workTimeId: workTime.id,
                userId: workTime.userId,
                user: workTime.user,
                branchId: workTime.branchId,
                branch: workTime.branch,
                startTime: workTime.startTime,
                endTime: workTime.endTime,
                durationMinutes,
                durationHours,
                linkedTasksCount: linkedTasks.length,
                linkedTasks,
                taskStatusCounts,
                clientId: workTime.clientId,
                notes: workTime.notes
            };
        });

        // 3. Aggregierte Statistiken
        const totalShifts = shiftStats.length;
        const totalTasksInShifts = shiftStats.reduce((sum, shift) => sum + shift.linkedTasksCount, 0);
        const totalDurationMinutes = shiftStats
            .filter(shift => shift.durationMinutes !== null)
            .reduce((sum, shift) => sum + (shift.durationMinutes || 0), 0);
        const averageDurationHours = totalShifts > 0 && totalDurationMinutes > 0
            ? (totalDurationMinutes / 60 / totalShifts).toFixed(2)
            : null;

        // 4. Tasks mit ihrer Schicht-Verteilung
        const taskShiftMap: Record<number, { task: any; shifts: any[] }> = {};
        
        shiftStats.forEach(shift => {
            shift.linkedTasks.forEach(task => {
                if (!taskShiftMap[task.id]) {
                    taskShiftMap[task.id] = {
                        task,
                        shifts: []
                    };
                }
                taskShiftMap[task.id].shifts.push({
                    workTimeId: shift.workTimeId,
                    userId: shift.userId,
                    user: shift.user,
                    startTime: shift.startTime,
                    endTime: shift.endTime,
                    durationMinutes: shift.durationMinutes,
                    durationHours: shift.durationHours
                });
            });
        });

        const tasksWithShifts = Object.values(taskShiftMap).map(item => {
            const totalMinutes = item.shifts.reduce((sum, shift) => 
                sum + (shift.durationMinutes || 0), 0
            );
            const totalHours = (totalMinutes / 60).toFixed(2);

            return {
                task: item.task,
                shiftCount: item.shifts.length,
                totalDurationMinutes: totalMinutes,
                totalDurationHours: totalHours,
                shifts: item.shifts
            };
        }).sort((a, b) => b.shiftCount - a.shiftCount);

        res.json({
            shifts: shiftStats,
            summary: {
                totalShifts,
                totalTasksInShifts,
                totalDurationMinutes,
                totalDurationHours: totalDurationMinutes > 0 ? (totalDurationMinutes / 60).toFixed(2) : null,
                averageDurationHours
            },
            tasksWithShifts: tasksWithShifts.slice(0, 100) // Top 100
        });
    } catch (error) {
        logger.error('Fehler beim Abrufen der Schicht-Analyse:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Schicht-Analyse' });
    }
};

