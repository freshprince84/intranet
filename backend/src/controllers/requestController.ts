// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { Prisma, RequestStatus, RequestType, NotificationType } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { createNotificationIfEnabled } from './notificationController';
import { getUserLanguage, getRequestNotificationText } from '../utils/translations';
import { getDataIsolationFilter, getUserOrganizationFilter } from '../middleware/organization';
import { convertFilterConditionsToPrismaWhere } from '../utils/filterToPrisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import { filterCache } from '../services/filterCache';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface AuthenticatedRequest extends Request {
    userId: string;
}

interface CreateRequestBody {
    title: string;
    description?: string;
    requested_by_id: string;
    responsible_id: string;
    branch_id: string;
    status?: RequestStatus;
    type?: RequestType;
    is_private?: boolean;
    due_date?: string;
    create_todo?: boolean;
}

interface UpdateRequestBody {
    title?: string;
    description?: string;
    requested_by_id?: string;
    responsible_id?: string;
    branch_id?: string;
    status?: RequestStatus;
    type?: RequestType;
    is_private?: boolean;
    due_date?: string;
    create_todo?: boolean;
}

const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
} as const;

const branchSelect = {
    id: true,
    name: true
} as const;

// Alle Requests abrufen
export const getAllRequests = async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.userId as string, 10);
        const organizationId = (req as any).organizationId;
        
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId as string | undefined;
        const filterConditions = req.query.filterConditions 
            ? JSON.parse(req.query.filterConditions as string) 
            : undefined;
        const limit = req.query.limit 
            ? parseInt(req.query.limit as string, 10) 
            : 50; // OPTIMIERUNG: Standard-Limit 50 statt alle
        const includeAttachments = req.query.includeAttachments === 'true'; // OPTIMIERUNG: Attachments optional
        
        // Filter-Bedingungen konvertieren (falls vorhanden)
        let filterWhereClause: any = {};
        if (filterId) {
            // OPTIMIERUNG: Lade Filter aus Cache (vermeidet DB-Query)
            try {
                const filterData = await filterCache.get(parseInt(filterId, 10));
                if (filterData) {
                    const conditions = JSON.parse(filterData.conditions);
                    const operators = JSON.parse(filterData.operators);
                filterWhereClause = convertFilterConditionsToPrismaWhere(
                    conditions,
                    operators,
                    'request'
                );
                } else {
                    console.warn(`[getAllRequests] Filter ${filterId} nicht gefunden`);
                }
            } catch (filterError) {
                console.error(`[getAllRequests] Fehler beim Laden von Filter ${filterId}:`, filterError);
                // Fallback: Versuche ohne Filter weiter
            }
        } else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = convertFilterConditionsToPrismaWhere(
                filterConditions.conditions || filterConditions,
                filterConditions.operators || [],
                'request'
            );
        }
        
        // OPTIMIERUNG: Vereinfachte WHERE-Klausel für bessere Performance
        // Kombiniere organizationId direkt in OR-Bedingung statt verschachtelter AND/OR
        const baseWhereConditions: any[] = [];
        
        // Isolation-Filter: organizationId (wenn vorhanden)
        if (organizationId) {
            baseWhereConditions.push({
                OR: [
                    // Öffentliche Requests (isPrivate = false) innerhalb der Organisation
                    {
                        isPrivate: false,
                        organizationId: organizationId
                    },
                    // Private Requests: Nur wenn User Ersteller oder Verantwortlicher ist
                    {
                        isPrivate: true,
                        organizationId: organizationId,
                        OR: [
                            { requesterId: userId },
                            { responsibleId: userId }
                        ]
                    }
                ]
            });
        } else {
            // Standalone User: Nur eigene Requests
            baseWhereConditions.push({
                OR: [
                    { requesterId: userId },
                    { responsibleId: userId }
                ]
            });
        }
        
        // Füge Filter-Bedingungen hinzu (falls vorhanden)
        if (Object.keys(filterWhereClause).length > 0) {
            baseWhereConditions.push(filterWhereClause);
        }
        
        // Kombiniere alle Filter
        const whereClause: Prisma.RequestWhereInput = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        
        const queryStartTime = Date.now();
        const requests = await prisma.request.findMany({
            where: whereClause,
            take: limit,
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[getAllRequests] ✅ Query abgeschlossen: ${requests.length} Requests in ${queryDuration}ms`);

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequests = requests.map(request => ({
            id: request.id,
            title: request.title,
            description: request.description,
            status: request.status,
            type: request.type,
            isPrivate: request.isPrivate,
            dueDate: request.dueDate,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            requestedBy: request.requester,
            responsible: request.responsible,
            branch: request.branch,
            createTodo: request.createTodo,
            // OPTIMIERUNG: Attachments nur wenn geladen
            attachments: includeAttachments && request.attachments 
                ? request.attachments.map(att => ({
                id: att.id,
                fileName: att.fileName,
                fileType: att.fileType,
                fileSize: att.fileSize,
                filePath: att.filePath,
                uploadedAt: att.uploadedAt
            }))
                : []
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('[getAllRequests] Error fetching requests:', error);
        console.error('[getAllRequests] Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            filterId: req.query.filterId,
            userId: req.userId
        });
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Requests',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Einen Request nach ID abrufen
export const getRequestById = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;
        const userId = parseInt(req.userId as string, 10);
        const organizationId = (req as any).organizationId;
        
        // Basis-Filter: Datenisolation
        const isolationFilter = getDataIsolationFilter(req as any, 'request');
        
        // Erweitere Filter um private/öffentliche Logik
        // WICHTIG: isolationFilter und OR-Bedingung müssen mit AND kombiniert werden,
        // damit das OR aus isolationFilter nicht überschrieben wird
        const whereClause: Prisma.RequestWhereInput = {
            id: parseInt(id),
            AND: [
                isolationFilter,
                {
                    OR: [
                        // Öffentliche Requests
                        {
                            isPrivate: false,
                            ...(organizationId ? { organizationId } : {})
                        },
                        // Private Requests: Nur wenn User Ersteller oder Verantwortlicher ist
                        {
                            isPrivate: true,
                            OR: [
                                { requesterId: userId },
                                { responsibleId: userId }
                            ]
                        }
                    ]
                }
            ]
        };
        
        const request = await prisma.request.findFirst({
            where: whereClause,
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
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

        if (!request) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequest = {
            id: request.id,
            title: request.title,
            description: request.description,
            status: request.status,
            type: request.type,
            isPrivate: request.isPrivate,
            dueDate: request.dueDate,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            requestedBy: request.requester,
            responsible: request.responsible,
            branch: request.branch,
            createTodo: request.createTodo,
            attachments: request.attachments.map(att => ({
                id: att.id,
                fileName: att.fileName,
                fileType: att.fileType,
                fileSize: att.fileSize,
                filePath: att.filePath,
                uploadedAt: att.uploadedAt
            }))
        };

        res.json(formattedRequest);
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Requests' });
    }
};

// Neuen Request erstellen
export const createRequest = async (req: Request<{}, {}, CreateRequestBody>, res: Response) => {
    try {
        const {
            title,
            description,
            requested_by_id,
            responsible_id,
            branch_id,
            status = 'approval',
            type = 'other',
            is_private = false,
            due_date,
            create_todo = false
        } = req.body;

        if (!title || !requested_by_id || !responsible_id || !branch_id) {
            return res.status(400).json({ message: 'Fehlende erforderliche Felder' });
        }

        const requesterId = parseInt(requested_by_id, 10);
        const responsibleId = parseInt(responsible_id, 10);
        const branchId = parseInt(branch_id, 10);
        const userId = parseInt(req.userId as string, 10);
        const roleId = parseInt((req as any).roleId as string, 10);

        // Prüfe ob User Admin ist
        const userRole = await prisma.role.findUnique({
            where: { id: roleId },
            select: { name: true }
        });
        const isAdmin = userRole?.name.toLowerCase() === 'admin' || userRole?.name.toLowerCase().includes('administrator');

        // User-Rolle: Kann nur eigene Requests erstellen
        if (!isAdmin && requesterId !== userId) {
            return res.status(403).json({ message: 'Sie können nur eigene Requests erstellen' });
        }

        // Validierung: Prüfe ob User-IDs zur Organisation gehören
        const userFilter = getUserOrganizationFilter(req);

        const requesterUser = await prisma.user.findFirst({
            where: {
                ...userFilter,
                id: requesterId
            }
        });
        if (!requesterUser) {
            return res.status(400).json({ message: 'Antragsteller gehört nicht zu Ihrer Organisation' });
        }

        const responsibleUser = await prisma.user.findFirst({
            where: {
                ...userFilter,
                id: responsibleId
            }
        });
        if (!responsibleUser) {
            return res.status(400).json({ message: 'Verantwortlicher gehört nicht zu Ihrer Organisation' });
        }

        const request = await prisma.request.create({
            data: {
                title,
                description: description || '',
                status: status as RequestStatus,
                type: type as RequestType,
                isPrivate: is_private,
                requesterId,
                responsibleId,
                branchId,
                dueDate: due_date ? new Date(due_date) : null,
                createTodo: create_todo,
                organizationId: req.organizationId || null
            },
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequest = {
            id: request.id,
            title: request.title,
            description: request.description,
            status: request.status,
            type: request.type,
            isPrivate: request.isPrivate,
            dueDate: request.dueDate,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            requestedBy: request.requester,
            responsible: request.responsible,
            branch: request.branch,
            createTodo: request.createTodo
        };

        // Benachrichtigungen erstellen
        // 1. Für den Verantwortlichen
        console.log(`[createRequest] RequesterId: ${requesterId}, ResponsibleId: ${responsibleId}`);
        if (requesterId !== responsibleId) {
            try {
                const requesterLang = await getUserLanguage(request.requesterId);
                console.log(`[createRequest] Requester Sprache: ${requesterLang}`);
                const requesterNotificationText = getRequestNotificationText(requesterLang, 'created', request.title, true);
                console.log(`[createRequest] Erstelle Notification für Requester ${request.requesterId}: ${requesterNotificationText.title}`);
                const requesterCreated = await createNotificationIfEnabled({
                    userId: request.requesterId,
                    relatedEntityId: request.id,
                    relatedEntityType: 'create',
                    type: NotificationType.request,
                    title: requesterNotificationText.title,
                    message: requesterNotificationText.message
                });
                console.log(`[createRequest] Requester Notification erstellt: ${requesterCreated}`);

                const responsibleLang = await getUserLanguage(request.responsibleId);
                console.log(`[createRequest] Responsible Sprache: ${responsibleLang}`);
                const responsibleNotificationText = getRequestNotificationText(responsibleLang, 'created', request.title, false);
                console.log(`[createRequest] Erstelle Notification für Responsible ${request.responsibleId}: ${responsibleNotificationText.title}`);
                const responsibleCreated = await createNotificationIfEnabled({
                    userId: request.responsibleId,
                    relatedEntityId: request.id,
                    relatedEntityType: 'create',
                    type: NotificationType.request,
                    title: responsibleNotificationText.title,
                    message: responsibleNotificationText.message
                });
                console.log(`[createRequest] Responsible Notification erstellt: ${responsibleCreated}`);
            } catch (notificationError) {
                console.error('[createRequest] Fehler beim Erstellen der Notifications:', notificationError);
            }
        } else {
            console.log(`[createRequest] Requester und Responsible sind identisch, keine Notifications erstellt`);
        }

        res.status(201).json(formattedRequest);
    } catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des Requests' });
    }
};

// Request aktualisieren
export const updateRequest = async (req: Request<{ id: string }, {}, UpdateRequestBody>, res: Response) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            requested_by_id,
            responsible_id,
            branch_id,
            status,
            type,
            is_private,
            due_date,
            create_todo
        } = req.body;

        // Prüfe, ob der Request existiert und zur Organisation gehört
        const isolationFilter = getDataIsolationFilter(req as any, 'request');
        const existingRequest = await prisma.request.findFirst({
            where: {
                id: parseInt(id),
                ...isolationFilter
            },
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });

        if (!existingRequest) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }

        const userId = parseInt(req.userId as string, 10);
        const roleId = parseInt((req as any).roleId as string, 10);

        // Prüfe ob User Admin ist
        const userRole = await prisma.role.findUnique({
            where: { id: roleId },
            select: { name: true }
        });
        const isAdmin = userRole?.name.toLowerCase() === 'admin' || userRole?.name.toLowerCase().includes('administrator');

        // User-Rolle: Kann nur eigene Requests bearbeiten
        if (!isAdmin && existingRequest.requesterId !== userId) {
            return res.status(403).json({ message: 'Sie können nur eigene Requests bearbeiten' });
        }

        // Status-Update-Prüfung: User-Rolle kann nur "to improve" → "to approve" status-shiften
        if (status && status !== existingRequest.status && !isAdmin) {
            const allowedStatusShift = existingRequest.status === 'to_improve' && status === 'approval';
            if (!allowedStatusShift) {
                return res.status(403).json({ 
                    message: 'Sie können den Status nur von "to improve" auf "to approve" ändern' 
                });
            }
        }

        // Validierung: Prüfe ob User-IDs zur Organisation gehören (wenn geändert)
        if (requested_by_id) {
            const userFilter = getUserOrganizationFilter(req);
            const requesterUser = await prisma.user.findFirst({
                where: {
                    ...userFilter,
                    id: parseInt(requested_by_id, 10)
                }
            });
            if (!requesterUser) {
                return res.status(400).json({ message: 'Antragsteller gehört nicht zu Ihrer Organisation' });
            }
        }

        if (responsible_id) {
            const userFilter = getUserOrganizationFilter(req);
            const responsibleUser = await prisma.user.findFirst({
                where: {
                    ...userFilter,
                    id: parseInt(responsible_id, 10)
                }
            });
            if (!responsibleUser) {
                return res.status(400).json({ message: 'Verantwortlicher gehört nicht zu Ihrer Organisation' });
            }
        }

        // Update den Request
        const updatedRequest = await prisma.request.update({
            where: { id: parseInt(id) },
            data: {
                title: title,
                description: description,
                requesterId: req.body.requested_by_id ? parseInt(req.body.requested_by_id, 10) : undefined,
                responsibleId: req.body.responsible_id ? parseInt(req.body.responsible_id, 10) : undefined,
                branchId: req.body.branch_id ? parseInt(req.body.branch_id, 10) : undefined,
                status: status as RequestStatus | undefined,
                type: type as RequestType | undefined,
                isPrivate: is_private !== undefined ? is_private : undefined,
                dueDate: due_date ? new Date(due_date) : undefined,
                createTodo: create_todo
            },
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
                    select: userSelect
                },
                branch: {
                    select: branchSelect
                }
            }
        });

        // Benachrichtigungen bei Statusänderungen
        if (status && status !== existingRequest.status) {
            // Benachrichtigung für den Ersteller
            const userLang = await getUserLanguage(updatedRequest.requesterId);
            const notificationText = getRequestNotificationText(userLang, 'status_changed', updatedRequest.title, true, status);
            await createNotificationIfEnabled({
                userId: updatedRequest.requesterId,
                relatedEntityId: updatedRequest.id,
                relatedEntityType: 'status',
                type: NotificationType.request,
                title: notificationText.title,
                message: notificationText.message
            });
        }

        // Benachrichtigung bei Verantwortlichkeitsänderung
        if (responsible_id && parseInt(responsible_id) !== existingRequest.responsibleId) {
            // Benachrichtigung für den alten Verantwortlichen
            const oldResponsibleLang = await getUserLanguage(existingRequest.responsibleId);
            const oldNotificationText = getRequestNotificationText(oldResponsibleLang, 'responsibility_changed', updatedRequest.title, false, undefined, true);
            await createNotificationIfEnabled({
                userId: existingRequest.responsibleId,
                relatedEntityId: updatedRequest.id,
                relatedEntityType: 'update',
                type: NotificationType.request,
                title: oldNotificationText.title,
                message: oldNotificationText.message
            });

            // Benachrichtigung für den neuen Verantwortlichen
            const newResponsibleLang = await getUserLanguage(parseInt(responsible_id));
            const newNotificationText = getRequestNotificationText(newResponsibleLang, 'responsibility_changed', updatedRequest.title, false, undefined, false);
            await createNotificationIfEnabled({
                userId: parseInt(responsible_id),
                relatedEntityId: updatedRequest.id,
                relatedEntityType: 'update',
                type: NotificationType.request,
                title: newNotificationText.title,
                message: newNotificationText.message
            });
        }

        // Wenn der Request genehmigt wird und createTodo aktiv ist, erstelle einen Task
        if (status === 'approved' && updatedRequest.createTodo) {
            const task = await prisma.task.create({
                data: {
                    title: `[Request] ${updatedRequest.title}`,
                    description: updatedRequest.description || '',
                    status: 'open',
                    responsibleId: updatedRequest.responsibleId,
                    qualityControlId: updatedRequest.requesterId,
                    branchId: updatedRequest.branchId,
                    dueDate: updatedRequest.dueDate,
                    organizationId: updatedRequest.organizationId || req.organizationId || null
                }
            });

            // Kopiere Anhänge vom Request zum Task
            await copyRequestAttachmentsToTask(updatedRequest.id, task.id);

            // Benachrichtigungen für den Task
            if (updatedRequest.requesterId !== updatedRequest.responsibleId) {
                // Benachrichtigung für den Verantwortlichen
                const userLang = await getUserLanguage(updatedRequest.responsibleId);
                const notificationText = getRequestNotificationText(userLang, 'new_task_from_request', task.title);
                await createNotificationIfEnabled({
                    userId: updatedRequest.responsibleId,
                    relatedEntityId: task.id,
                    relatedEntityType: 'create',
                    type: NotificationType.task,
                    title: notificationText.title,
                    message: notificationText.message
                });
            }
        }

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequest = {
            id: updatedRequest.id,
            title: updatedRequest.title,
            description: updatedRequest.description,
            status: updatedRequest.status,
            type: updatedRequest.type,
            isPrivate: updatedRequest.isPrivate,
            dueDate: updatedRequest.dueDate,
            createdAt: updatedRequest.createdAt,
            updatedAt: updatedRequest.updatedAt,
            requestedBy: updatedRequest.requester,
            responsible: updatedRequest.responsible,
            branch: updatedRequest.branch,
            createTodo: updatedRequest.createTodo
        };

        res.json(formattedRequest);

    } catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Requests' });
    }
};

// Hilfsfunktion zum Kopieren von Anhängen vom Request zum Task
const copyRequestAttachmentsToTask = async (requestId: number, taskId: number) => {
    try {
        // Hole alle Anhänge des Requests
        const requestAttachments = await prisma.requestAttachment.findMany({
            where: {
                requestId: requestId
            }
        });

        if (requestAttachments.length === 0) {
            return; // Keine Anhänge zum Kopieren
        }

        const REQUEST_UPLOAD_DIR = path.join(__dirname, '../../uploads/request-attachments');
        const TASK_UPLOAD_DIR = path.join(__dirname, '../../uploads/task-attachments');

        // Stelle sicher, dass das Zielverzeichnis existiert
        if (!fs.existsSync(TASK_UPLOAD_DIR)) {
            fs.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });
        }

        // Kopiere jeden Anhang
        for (const attachment of requestAttachments) {
            // Generiere einen eindeutigen Dateinamen für den Task-Anhang
            const uniqueFileName = `${uuidv4()}${path.extname(attachment.fileName)}`;
            
            // Quell- und Zieldateipfade
            const sourcePath = path.join(REQUEST_UPLOAD_DIR, attachment.filePath);
            const destPath = path.join(TASK_UPLOAD_DIR, uniqueFileName);
            
            // Kopiere die physische Datei
            if (fs.existsSync(sourcePath)) {
                fs.copyFileSync(sourcePath, destPath);
                
                // Erstelle einen neuen TaskAttachment-Eintrag
                await prisma.taskAttachment.create({
                    data: {
                        taskId: taskId,
                        fileName: attachment.fileName,
                        fileType: attachment.fileType,
                        fileSize: attachment.fileSize,
                        filePath: uniqueFileName
                    }
                });
            }
        }
        
        console.log(`${requestAttachments.length} Anhänge erfolgreich kopiert von Request ${requestId} zu Task ${taskId}`);
    } catch (error) {
        console.error('Fehler beim Kopieren der Anhänge:', error);
    }
};

// Request löschen
export const deleteRequest = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;

        // Prüfe, ob der Request existiert und zur Organisation gehört
        const isolationFilter = getDataIsolationFilter(req as any, 'request');
        const request = await prisma.request.findFirst({
            where: {
                id: parseInt(id),
                ...isolationFilter
            },
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
                    select: userSelect
                }
            }
        });

        if (!request) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }

        // Benachrichtigung für den Ersteller
        const userLang = await getUserLanguage(request.requesterId);
        const notificationText = getRequestNotificationText(userLang, 'deleted', request.title);
        await createNotificationIfEnabled({
            userId: request.requesterId,
            relatedEntityId: request.id,
            relatedEntityType: 'delete',
            type: NotificationType.request,
            title: notificationText.title,
            message: notificationText.message
        });

        // Lösche den Request
        await prisma.request.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'Request erfolgreich gelöscht' });
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Requests' });
    }
}; 