// TODO: Nach einem Server-Neustart müssen die Prisma-Types neu generiert werden mit:
// cd backend && npx prisma generate
// Die aktuellen Linter-Fehler entstehen durch nicht aktualisierte Types

import { Request, Response } from 'express';
import { PrismaClient, Prisma, RequestStatus } from '@prisma/client';

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
export const getAllRequests = async (_req: Request, res: Response) => {
    try {
        const requests = await prisma.request.findMany({
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

        // Formatiere die Antwort für das Frontend
        const formattedRequests = requests.map(request => ({
            ...request,
            requestedBy: request.requester,
            requester: undefined
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('Error in getAllRequests:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen der Requests', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Einen spezifischen Request abrufen
export const getRequestById = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Request-ID' });
        }

        const request = await prisma.request.findUnique({
            where: { id: requestId },
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

        // Formatiere die Antwort für das Frontend
        const formattedRequest = {
            ...request,
            requestedBy: request.requester,
            requester: undefined
        };

        res.json(formattedRequest);
    } catch (error) {
        console.error('Error in getRequestById:', error);
        res.status(500).json({ 
            message: 'Fehler beim Abrufen des Requests', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Neuen Request erstellen
export const createRequest = async (req: Request<{}, {}, CreateRequestBody>, res: Response) => {
    try {
        // Validiere erforderliche Felder
        const requiredFields = ['title', 'requested_by_id', 'responsible_id', 'branch_id'] as const;
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Folgende Pflichtfelder fehlen: ${missingFields.join(', ')}`
            });
        }

        // Parse und validiere IDs
        const requesterId = parseInt(req.body.requested_by_id, 10);
        const responsibleId = parseInt(req.body.responsible_id, 10);
        const branchId = parseInt(req.body.branch_id, 10);

        if (isNaN(requesterId) || isNaN(responsibleId) || isNaN(branchId)) {
            return res.status(400).json({
                message: 'Ungültige ID-Werte'
            });
        }

        const request = await prisma.request.create({
            data: {
                title: req.body.title,
                description: req.body.description || '',
                status: req.body.status || 'approval',
                requesterId,
                responsibleId,
                branchId,
                dueDate: req.body.due_date ? new Date(req.body.due_date) : null,
                createTodo: req.body.create_todo || false
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

        // Formatiere die Antwort für das Frontend
        const formattedRequest = {
            ...request,
            requestedBy: request.requester,
            requester: undefined
        };

        res.status(201).json(formattedRequest);
    } catch (error) {
        console.error('Error in createRequest:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({ 
                message: 'Fehler beim Erstellen des Requests', 
                error: error.message,
                details: error.meta
            });
        } else {
            res.status(400).json({ 
                message: 'Fehler beim Erstellen des Requests', 
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
};

// Request aktualisieren
export const updateRequest = async (req: Request<{ id: string }, {}, UpdateRequestBody>, res: Response) => {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Request-ID' });
        }

        // Hole den aktuellen Request, um createTodo-Status zu prüfen
        const currentRequest = await prisma.request.findUnique({
            where: { id: requestId }
        });

        if (!currentRequest) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }

        // Aktualisiere den Request
        const request = await prisma.request.update({
            where: { id: requestId },
            data: {
                title: req.body.title || currentRequest.title,
                description: req.body.description || currentRequest.description,
                status: req.body.status || currentRequest.status,
                requesterId: req.body.requested_by_id ? parseInt(req.body.requested_by_id, 10) : undefined,
                responsibleId: req.body.responsible_id ? parseInt(req.body.responsible_id, 10) : undefined,
                branchId: req.body.branch_id ? parseInt(req.body.branch_id, 10) : undefined,
                dueDate: req.body.due_date ? new Date(req.body.due_date) : undefined,
                createTodo: req.body.create_todo !== undefined ? req.body.create_todo : currentRequest.createTodo
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

        // Formatiere die Antwort für das Frontend
        const formattedRequest = {
            ...request,
            requestedBy: request.requester,
            requester: undefined
        };

        // Wenn der Status auf "approved" geändert wurde und createTodo true ist
        if (req.body.status === 'approved' && 
            currentRequest.status !== 'approved' && 
            formattedRequest.createTodo) {
            
            try {
                // Erstelle einen neuen Task
                const task = await prisma.task.create({
                    data: {
                        title: `Task aus Request: ${formattedRequest.title}`,
                        description: formattedRequest.description || '',
                        status: 'open',
                        responsibleId: formattedRequest.responsibleId,
                        qualityControlId: formattedRequest.requesterId,
                        branchId: formattedRequest.branchId,
                        dueDate: formattedRequest.dueDate
                    }
                });
                console.log('Task erfolgreich erstellt:', task);
            } catch (taskError) {
                console.error('Fehler bei der Task-Erstellung:', taskError);
            }
        }

        res.json(formattedRequest);
    } catch (error) {
        console.error('Error in updateRequest:', error);
        res.status(400).json({ 
            message: 'Fehler beim Aktualisieren des Requests', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
};

// Request löschen
export const deleteRequest = async (req: Request<{ id: string }>, res: Response) => {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Request-ID' });
        }

        await prisma.request.delete({
            where: { id: requestId }
        });
        res.json({ message: 'Request erfolgreich gelöscht' });
    } catch (error) {
        console.error('Error in deleteRequest:', error);
        res.status(500).json({ 
            message: 'Fehler beim Löschen des Requests', 
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
}; 