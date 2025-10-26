// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma, RequestStatus, NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from './notificationController';
import { getDataIsolationFilter } from '../middleware/organization';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

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
        // Datenisolation: Standalone User sehen nur ihre eigenen Requests
        const isolationFilter = getDataIsolationFilter(req as any, 'request');
        
        const requests = await prisma.request.findMany({
            where: isolationFilter,
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequests = requests.map(request => ({
            id: request.id,
            title: request.title,
            description: request.description,
            status: request.status,
            dueDate: request.dueDate,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            requestedBy: request.requester,
            responsible: request.responsible,
            branch: request.branch,
            createTodo: request.createTodo
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Requests' });
    }
};

// Einen Request nach ID abrufen
export const getRequestById = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const { id } = req.params;
        
        // Datenisolation: Prüfe ob User Zugriff auf diesen Request hat
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
                },
                branch: {
                    select: branchSelect
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
            dueDate: request.dueDate,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            requestedBy: request.requester,
            responsible: request.responsible,
            branch: request.branch,
            createTodo: request.createTodo
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
            due_date,
            create_todo = false
        } = req.body;

        if (!title || !requested_by_id || !responsible_id || !branch_id) {
            return res.status(400).json({ message: 'Fehlende erforderliche Felder' });
        }

        const requesterId = parseInt(requested_by_id, 10);
        const responsibleId = parseInt(responsible_id, 10);
        const branchId = parseInt(branch_id, 10);

        const request = await prisma.request.create({
            data: {
                title,
                description: description || '',
                status: status as RequestStatus,
                requesterId,
                responsibleId,
                branchId,
                dueDate: due_date ? new Date(due_date) : null,
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

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequest = {
            id: request.id,
            title: request.title,
            description: request.description,
            status: request.status,
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
        if (requesterId !== responsibleId) {
            await createNotificationIfEnabled({
                userId: request.requesterId,
                targetId: request.id,
                targetType: 'request',
                type: NotificationType.request,
                title: `Neuer Request: ${request.title}`,
                message: `Du hast einen neuen Request erstellt: ${request.title}`
            });

            await createNotificationIfEnabled({
                userId: request.responsibleId,
                targetId: request.id,
                targetType: 'request',
                type: NotificationType.request,
                title: `Neuer Request: ${request.title}`,
                message: `Dir wurde ein neuer Request zugewiesen: ${request.title}`
            });
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
            due_date,
            create_todo
        } = req.body;

        // Prüfe, ob der Request existiert
        const existingRequest = await prisma.request.findUnique({
            where: { id: parseInt(id) },
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
            await createNotificationIfEnabled({
                userId: updatedRequest.requesterId,
                targetId: updatedRequest.id,
                targetType: 'request',
                type: NotificationType.request,
                title: `Statusänderung: ${updatedRequest.title}`,
                message: `Der Status deines Requests "${updatedRequest.title}" wurde zu "${status}" geändert.`
            });
        }

        // Benachrichtigung bei Verantwortlichkeitsänderung
        if (responsible_id && parseInt(responsible_id) !== existingRequest.responsibleId) {
            // Benachrichtigung für den alten Verantwortlichen
            await createNotificationIfEnabled({
                userId: existingRequest.responsibleId,
                targetId: updatedRequest.id,
                targetType: 'request',
                type: NotificationType.request,
                title: `Verantwortlichkeit geändert: ${updatedRequest.title}`,
                message: `Die Verantwortlichkeit für den Request "${updatedRequest.title}" wurde geändert.`
            });

            // Benachrichtigung für den neuen Verantwortlichen
            await createNotificationIfEnabled({
                userId: parseInt(responsible_id),
                targetId: updatedRequest.id,
                targetType: 'request',
                type: NotificationType.request,
                title: `Neuer Request: ${updatedRequest.title}`,
                message: `Dir wurde ein Request zugewiesen: ${updatedRequest.title}`
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
                    dueDate: updatedRequest.dueDate
                }
            });

            // Kopiere Anhänge vom Request zum Task
            await copyRequestAttachmentsToTask(updatedRequest.id, task.id);

            // Benachrichtigungen für den Task
            if (updatedRequest.requesterId !== updatedRequest.responsibleId) {
                // Benachrichtigung für den Verantwortlichen
                await createNotificationIfEnabled({
                    userId: updatedRequest.responsibleId,
                    targetId: task.id,
                    targetType: 'task',
                    type: NotificationType.task,
                    title: `Neuer Task: ${task.title}`,
                    message: `Dir wurde ein neuer Task zugewiesen: ${task.title}`
                });
            }
        }

        // Formatiere die Daten für die Frontend-Nutzung
        const formattedRequest = {
            id: updatedRequest.id,
            title: updatedRequest.title,
            description: updatedRequest.description,
            status: updatedRequest.status,
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

        // Prüfe, ob der Request existiert
        const request = await prisma.request.findUnique({
            where: { id: parseInt(id) },
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
        await createNotificationIfEnabled({
            userId: request.requesterId,
            targetId: request.id,
            targetType: 'request',
            type: NotificationType.request,
            title: `Request gelöscht: ${request.title}`,
            message: `Dein Request "${request.title}" wurde gelöscht.`
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