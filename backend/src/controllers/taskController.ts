// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { Prisma, TaskStatus, NotificationType } from '@prisma/client';
import { prisma, executeWithRetry } from '../utils/prisma';
import { validateTask, TaskData } from '../validation/taskValidation';
import { createNotificationIfEnabled } from './notificationController';
import { getDataIsolationFilter, getUserOrganizationFilter } from '../middleware/organization';
import { LifecycleService } from '../services/lifecycleService';
import { getUserLanguage, getTaskNotificationText } from '../utils/translations';
import { convertFilterConditionsToPrismaWhere } from '../utils/filterToPrisma';
import { filterCache } from '../services/filterCache';

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
        const userId = parseInt(req.userId as string, 10);
        const organizationId = (req as any).organizationId;
        const userRoleId = (req as any).userRole?.role?.id;
        
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId as string | undefined;
        const filterConditions = req.query.filterConditions 
            ? JSON.parse(req.query.filterConditions as string) 
            : undefined;
        // ✅ PAGINATION: limit/offset Parameter wieder einführen
        const limit = req.query.limit 
            ? parseInt(req.query.limit as string, 10) 
            : 20; // Standard: 20 Items
        const offset = req.query.offset 
            ? parseInt(req.query.offset as string, 10) 
            : 0; // Standard: 0
        const includeAttachments = req.query.includeAttachments === 'true'; // OPTIMIERUNG: Attachments optional
        
        // Filter-Bedingungen konvertieren (falls vorhanden)
        let filterWhereClause: any = {};
        if (filterId) {
            // OPTIMIERUNG: Lade Filter aus Cache (vermeidet DB-Query)
            const filterData = await filterCache.get(parseInt(filterId, 10));
            if (filterData) {
                const conditions = JSON.parse(filterData.conditions);
                const operators = JSON.parse(filterData.operators);
                filterWhereClause = convertFilterConditionsToPrismaWhere(
                    conditions,
                    operators,
                    'task'
                );
            }
        } else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = convertFilterConditionsToPrismaWhere(
                filterConditions.conditions || filterConditions,
                filterConditions.operators || [],
                'task'
            );
        }
        
        // ✅ PERFORMANCE: Vereinfachte WHERE-Klausel für bessere Performance
        // ✅ PERFORMANCE: Flachere OR-Struktur für bessere Index-Nutzung
        const baseWhereConditions: any[] = [];
        
        // Isolation-Filter: organizationId (wenn vorhanden)
        if (organizationId) {
            // ✅ PERFORMANCE: Flachere OR-Struktur - organizationId in jeder OR-Bedingung
            if (userRoleId) {
                baseWhereConditions.push({
                    OR: [
                        {
                            organizationId: organizationId,
                            responsibleId: userId
                        },
                        {
                            organizationId: organizationId,
                            qualityControlId: userId
                        },
                        {
                            organizationId: organizationId,
                            roleId: userRoleId
                        }
                    ]
                });
            } else {
                // Fallback: Nur eigene Tasks
                baseWhereConditions.push({
                    OR: [
                        {
                            organizationId: organizationId,
                            responsibleId: userId
                        },
                        {
                            organizationId: organizationId,
                            qualityControlId: userId
                        }
                    ]
                });
            }
        } else {
            // Standalone User: Nur eigene Tasks
            baseWhereConditions.push({
                OR: [
                    { responsibleId: userId },
                    { qualityControlId: userId }
                ]
            });
        }
        
        // Füge Filter-Bedingungen hinzu (falls vorhanden)
        if (Object.keys(filterWhereClause).length > 0) {
            baseWhereConditions.push(filterWhereClause);
        }
        
        // Kombiniere alle Filter
        const whereClause = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        
        // ✅ PAGINATION: totalCount für Infinite Scroll
        const totalCount = await prisma.task.count({
            where: whereClause
        });
        
        const queryStartTime = Date.now();
        const tasks = await prisma.task.findMany({
            where: whereClause,
            // ✅ PAGINATION: Nur limit Items laden, offset überspringen
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }, // Neueste Tasks zuerst
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
                // OPTIMIERUNG: Attachments nur laden wenn explizit angefragt
                ...(includeAttachments ? {
                    attachments: {
                        orderBy: {
                            uploadedAt: 'desc'
                        }
                    }
                } : {})
            }
        });
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[getAllTasks] ✅ Query abgeschlossen: ${tasks.length} Tasks (${offset}-${offset + tasks.length} von ${totalCount}) in ${queryDuration}ms`);
        
        // ✅ PAGINATION: Response mit totalCount für Infinite Scroll
        res.json({
            data: tasks,
            totalCount: totalCount,
            limit: limit,
            offset: offset,
            hasMore: offset + tasks.length < totalCount
        });
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
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
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
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
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

        // ✅ PERFORMANCE: executeWithRetry für DB-Query
        const task = await executeWithRetry(() =>
            prisma.task.create({
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
            })
        );
        
        // Benachrichtigung für den Verantwortlichen erstellen, nur wenn ein Benutzer zugewiesen ist
        if (taskData.responsibleId) {
            const userLang = await getUserLanguage(taskData.responsibleId);
            const notificationText = getTaskNotificationText(userLang, 'assigned', taskData.title);
            await createNotificationIfEnabled({
                userId: taskData.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'create'
            });
        }

        // Benachrichtigung für die Qualitätskontrolle erstellen
        if (taskData.qualityControlId) {
            const userLang = await getUserLanguage(taskData.qualityControlId);
            const notificationText = getTaskNotificationText(userLang, 'quality_control_assigned', taskData.title);
            await createNotificationIfEnabled({
                userId: taskData.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'create'
            });
        }
        
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
        // ✅ PERFORMANCE: executeWithRetry für DB-Query
        const currentTask = await executeWithRetry(() =>
            prisma.task.findFirst({
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
                },
                role: {
                    select: { id: true, name: true, organizationId: true }
                }
            }
            })
        );

        if (!currentTask) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }

        // Prüfe Task-Berechtigungen für User-Rolle
        const userId = parseInt(req.userId as string, 10);
        const roleId = parseInt((req as any).roleId as string, 10);
        
        // Prüfe ob User Admin ist
        // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
        const userRole = await prisma.role.findUnique({
            where: { id: roleId },
            select: { name: true }
        });
        const isAdmin = userRole?.name.toLowerCase() === 'admin' || userRole?.name.toLowerCase().includes('administrator');

        // User-Rolle: Kann nur eigene Tasks oder Tasks der eigenen Rolle "User" status-shiften
        if (updateData.status && !isAdmin) {
            // Prüfe ob User die User-Rolle in der Organisation hat
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const userRoleInOrg = await prisma.role.findFirst({
                where: {
                    organizationId: currentTask.organizationId,
                    name: 'User',
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                }
            });

            // Erlaube Status-Update nur wenn:
            // 1. Task ist dem User zugewiesen (responsibleId === userId), ODER
            // 2. Task gehört zur User-Rolle und User hat diese Rolle
            const canModify = 
                currentTask.responsibleId === userId ||
                (userRoleInOrg && currentTask.roleId === userRoleInOrg.id);

            if (!canModify) {
                return res.status(403).json({ 
                    error: 'Sie können nur eigene Tasks oder Tasks Ihrer Rolle "User" bearbeiten' 
                });
            }
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
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
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
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
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

        // ✅ PERFORMANCE: executeWithRetry für DB-Query
        const task = await executeWithRetry(() =>
            prisma.task.update({
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
            })
        );
        
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
            
            // Prüfe ob es ein Admin-Onboarding-Task ist und starte Lifecycle
            // Erkenne Admin-Onboarding-Task am Titel-Pattern "Profil vervollständigen:"
            // WICHTIG: Task ist der Admin-Rolle zugewiesen (roleId), daher ist responsibleId = null
            // Der Onboarding-User wird aus dem Link in der description extrahiert: userId=XXX
            if ((updateData.status === 'quality_control' || updateData.status === 'done') && 
                task.title.includes('Profil vervollständigen:') && 
                task.organizationId) {
                try {
                    // Extrahiere userId aus description (Link: /organization?tab=users&userId=XXX)
                    const userIdMatch = task.description?.match(/userId=(\d+)/);
                    if (!userIdMatch) {
                        console.log('[updateTask] Konnte userId nicht aus Task-Description extrahieren');
                    } else {
                        const onboardingUserId = parseInt(userIdMatch[1], 10);
                    
                    // Prüfe ob User contract, salary, normalWorkingHours hat
                    const onboardingUser = await prisma.user.findUnique({
                        where: { id: onboardingUserId },
                        select: {
                            id: true,
                            contract: true,
                            salary: true,
                            normalWorkingHours: true
                        }
                    });

                    if (onboardingUser) {
                        // Prüfe ob alle Felder ausgefüllt sind
                        const hasContract = onboardingUser.contract && onboardingUser.contract.trim() !== '';
                        const hasSalary = onboardingUser.salary !== null && onboardingUser.salary !== undefined;
                        const hasNormalWorkingHours = onboardingUser.normalWorkingHours !== null && onboardingUser.normalWorkingHours !== undefined;

                        // Nur wenn Status "done" UND alle Felder ausgefüllt sind, starte Lifecycle
                        if (updateData.status === 'done' && hasContract && hasSalary && hasNormalWorkingHours) {
                            console.log(`[updateTask] Starte Lifecycle für User ${onboardingUserId} nach Admin-Onboarding`);
                            await LifecycleService.startLifecycleAfterOnboarding(onboardingUserId, task.organizationId);
                            
                            // Benachrichtigung an User
                            const userLang = await getUserLanguage(onboardingUserId);
                            const notificationText = getTaskNotificationText(userLang, 'onboarding_completed', task.title);
                            await createNotificationIfEnabled({
                                userId: onboardingUserId,
                                title: notificationText.title,
                                message: notificationText.message,
                                type: NotificationType.user,
                                relatedEntityId: onboardingUserId,
                                relatedEntityType: 'update'
                            });
                        } else if (updateData.status === 'quality_control' && (!hasContract || !hasSalary || !hasNormalWorkingHours)) {
                            console.log(`[updateTask] Quality-Control-Status gesetzt, aber nicht alle Felder ausgefüllt für User ${onboardingUserId}`);
                        }
                    }
                    }
                } catch (lifecycleError) {
                    console.error('[updateTask] Fehler beim Starten des Lifecycle:', lifecycleError);
                    // Fehler blockiert nicht die Task-Aktualisierung
                }
            }

            // Prüfe ob es ein BankDetails-To-Do ist
            // Erkenne BankDetails-To-Do am Titel-Pattern (prüfe beide Varianten für Abwärtskompatibilität)
            // Task ist dem User zugewiesen (responsibleId = userId)
            if ((updateData.status === 'quality_control' || updateData.status === 'done') && 
                (task.title.includes('Ingresar datos bancarios') || task.title.includes('Bankverbindung eingeben')) && 
                task.responsibleId) {
                try {
                    const bankDetailsUserId = task.responsibleId;
                    
                    // Prüfe ob User bankDetails hat
                    const bankDetailsUser = await prisma.user.findUnique({
                        where: { id: bankDetailsUserId },
                        select: {
                            id: true,
                            bankDetails: true
                        }
                    });

                    if (bankDetailsUser) {
                        // Prüfe ob bankDetails ausgefüllt ist
                        const hasBankDetails = bankDetailsUser.bankDetails && bankDetailsUser.bankDetails.trim() !== '';

                        // Nur wenn Status "done" UND bankDetails ausgefüllt ist, Task als erledigt markieren
                        if (updateData.status === 'done' && hasBankDetails) {
                            console.log(`[updateTask] BankDetails-To-Do erledigt für User ${bankDetailsUserId}`);
                            // Task ist bereits auf "done" gesetzt, keine weitere Aktion nötig
                        } else if (updateData.status === 'quality_control' && !hasBankDetails) {
                            console.log(`[updateTask] Quality-Control-Status gesetzt, aber bankDetails nicht ausgefüllt für User ${bankDetailsUserId}`);
                        }
                    }
                } catch (bankDetailsError) {
                    console.error('[updateTask] Fehler bei BankDetails-To-Do-Prüfung:', bankDetailsError);
                    // Fehler blockiert nicht die Task-Aktualisierung
                }
            }

            // Prüfe ob es ein Identitätsdokument-To-Do ist
            // Erkenne Identitätsdokument-To-Do am Titel-Pattern (prüfe beide Varianten für Abwärtskompatibilität)
            // Task ist dem User zugewiesen (responsibleId = userId)
            if ((updateData.status === 'quality_control' || updateData.status === 'done') && 
                (task.title.includes('Subir documento de identidad') || task.title.includes('Identitätsdokument hochladen')) && 
                task.responsibleId) {
                try {
                    const identificationDocumentUserId = task.responsibleId;
                    
                    // Prüfe ob User ein Identitätsdokument hat
                    const identificationDocumentUser = await prisma.user.findUnique({
                        where: { id: identificationDocumentUserId },
                        include: {
                            identificationDocuments: {
                                take: 1,
                                orderBy: { createdAt: 'desc' }
                            }
                        }
                    });

                    if (identificationDocumentUser) {
                        // Prüfe ob Identitätsdokument vorhanden ist
                        const hasIdentificationDocument = identificationDocumentUser.identificationDocuments && identificationDocumentUser.identificationDocuments.length > 0;

                        // Nur wenn Status "done" UND Identitätsdokument vorhanden ist, Task als erledigt markieren
                        if (updateData.status === 'done' && hasIdentificationDocument) {
                            console.log(`[updateTask] Identitätsdokument-To-Do erledigt für User ${identificationDocumentUserId}`);
                            // Task ist bereits auf "done" gesetzt, keine weitere Aktion nötig
                        } else if (updateData.status === 'quality_control' && !hasIdentificationDocument) {
                            console.log(`[updateTask] Quality-Control-Status gesetzt, aber Identitätsdokument nicht vorhanden für User ${identificationDocumentUserId}`);
                        }
                    }
                } catch (identificationDocumentError) {
                    console.error('[updateTask] Fehler bei Identitätsdokument-To-Do-Prüfung:', identificationDocumentError);
                    // Fehler blockiert nicht die Task-Aktualisierung
                }
            }
            
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                const userLang = await getUserLanguage(task.responsibleId);
                const notificationText = getTaskNotificationText(userLang, 'status_changed', task.title, currentTask.status, updateData.status);
                await createNotificationIfEnabled({
                    userId: task.responsibleId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'status'
                });
            }
            
            // Benachrichtigung für die Qualitätskontrolle
            if (task.qualityControlId) {
                const userLang = await getUserLanguage(task.qualityControlId);
                const notificationText = getTaskNotificationText(userLang, 'status_changed', task.title, currentTask.status, updateData.status);
                await createNotificationIfEnabled({
                    userId: task.qualityControlId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'status'
                });
            }
        } 
        // Benachrichtigung bei Änderung des Verantwortlichen
        else if (updateData.responsibleId && updateData.responsibleId !== currentTask.responsibleId) {
            const userLang = await getUserLanguage(updateData.responsibleId);
            const notificationText = getTaskNotificationText(userLang, 'assigned', task.title);
            await createNotificationIfEnabled({
                userId: updateData.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Benachrichtigung bei Änderung der Qualitätskontrolle
        else if (updateData.qualityControlId && updateData.qualityControlId !== currentTask.qualityControlId) {
            const userLang = await getUserLanguage(updateData.qualityControlId);
            const notificationText = getTaskNotificationText(userLang, 'quality_control_assigned', task.title);
            await createNotificationIfEnabled({
                userId: updateData.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Allgemeine Aktualisierungsbenachrichtigung
        else if (Object.keys(updateData).length > 0) {
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                const userLang = await getUserLanguage(task.responsibleId);
                const notificationText = getTaskNotificationText(userLang, 'updated', task.title);
                await createNotificationIfEnabled({
                    userId: task.responsibleId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
            
            // Benachrichtigung für die Qualitätskontrolle
            if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
                const userLang = await getUserLanguage(task.qualityControlId);
                const notificationText = getTaskNotificationText(userLang, 'updated', task.title);
                await createNotificationIfEnabled({
                    userId: task.qualityControlId,
                    title: notificationText.title,
                    message: notificationText.message,
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

        // Lösche abhängige Datensätze vor dem Löschen des Tasks
        // TaskCerebroCarticle und WorkTimeTask haben keine Cascade Delete
        await prisma.taskCerebroCarticle.deleteMany({
            where: { taskId: taskId }
        });

        await prisma.workTimeTask.deleteMany({
            where: { taskId: taskId }
        });

        await prisma.task.delete({
            where: { id: taskId }
        });

        // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
        if (task.responsibleId) {
            const userLang = await getUserLanguage(task.responsibleId);
            const notificationText = getTaskNotificationText(userLang, 'deleted', task.title);
            await createNotificationIfEnabled({
                userId: task.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }
        
        // Benachrichtigung für die Qualitätskontrolle
        if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
            const userLang = await getUserLanguage(task.qualityControlId);
            const notificationText = getTaskNotificationText(userLang, 'deleted', task.title);
            await createNotificationIfEnabled({
                userId: task.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
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