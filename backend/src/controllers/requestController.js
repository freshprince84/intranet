const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Alle Requests abrufen
exports.getAllRequests = async (req, res) => {
    try {
        const requests = await prisma.request.findMany({
            include: {
                requestedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                responsible: {
                    select: {
                        id: true,
                        username: true,
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
        });
        res.json(requests);
    } catch (error) {
        console.error('Error in getAllRequests:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Requests', error: error.message });
    }
};

// Einen spezifischen Request abrufen
exports.getRequestById = async (req, res) => {
    try {
        const request = await prisma.request.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                requestedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                responsible: {
                    select: {
                        id: true,
                        username: true,
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
        });
        
        if (!request) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }
        res.json(request);
    } catch (error) {
        console.error('Error in getRequestById:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Requests', error: error.message });
    }
};

// Neuen Request erstellen
exports.createRequest = async (req, res) => {
    try {
        // Validiere erforderliche Felder
        const requiredFields = ['title', 'requested_by_id', 'responsible_id', 'branch_id'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                message: `Folgende Pflichtfelder fehlen: ${missingFields.join(', ')}`
            });
        }

        // Parse und validiere IDs
        const requestedById = parseInt(req.body.requested_by_id);
        const responsibleId = parseInt(req.body.responsible_id);
        const branchId = parseInt(req.body.branch_id);

        if (isNaN(requestedById) || isNaN(responsibleId) || isNaN(branchId)) {
            return res.status(400).json({
                message: 'Ungültige ID-Werte'
            });
        }

        const request = await prisma.request.create({
            data: {
                title: req.body.title,
                description: req.body.description || '',
                status: req.body.status || 'approval',
                requestedById: requestedById,
                responsibleId: responsibleId,
                branchId: branchId,
                dueDate: req.body.due_date ? new Date(req.body.due_date) : null,
                createTodo: req.body.create_todo || false
            },
            include: {
                requestedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                responsible: {
                    select: {
                        id: true,
                        username: true,
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
        });

        res.status(201).json(request);
    } catch (error) {
        console.error('Error in createRequest:', error);
        res.status(400).json({ 
            message: 'Fehler beim Erstellen des Requests', 
            error: error.message,
            details: error.meta // Füge Prisma-spezifische Fehlerdetails hinzu
        });
    }
};

// Request aktualisieren
exports.updateRequest = async (req, res) => {
    try {
        // Hole den aktuellen Request, um createTodo-Status zu prüfen
        const currentRequest = await prisma.request.findUnique({
            where: { id: parseInt(req.params.id) }
        });

        if (!currentRequest) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }

        console.log('Aktueller Request Status:', currentRequest.status);
        console.log('Neuer Status:', req.body.status);
        console.log('CreateTodo Flag:', currentRequest.createTodo);

        // Aktualisiere den Request
        const request = await prisma.request.update({
            where: { id: parseInt(req.params.id) },
            data: {
                title: req.body.title || currentRequest.title,
                description: req.body.description || currentRequest.description,
                status: req.body.status || currentRequest.status,
                requestedById: req.body.requested_by_id ? parseInt(req.body.requested_by_id) : undefined,
                responsibleId: req.body.responsible_id ? parseInt(req.body.responsible_id) : undefined,
                branchId: req.body.branch_id ? parseInt(req.body.branch_id) : undefined,
                dueDate: req.body.due_date ? new Date(req.body.due_date) : undefined,
                createTodo: req.body.create_todo !== undefined ? req.body.create_todo : currentRequest.createTodo
            },
            include: {
                requestedBy: {
                    select: {
                        id: true,
                        username: true,
                        firstName: true,
                        lastName: true
                    }
                },
                responsible: {
                    select: {
                        id: true,
                        username: true,
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
        });

        // Wenn der Status auf "approved" geändert wurde und createTodo true ist
        if (req.body.status === 'approved' && 
            currentRequest.status !== 'approved' && 
            request.createTodo) {
            
            console.log('Task-Erstellung wird gestartet...');
            console.log('Request ID:', request.id);
            console.log('Request Title:', request.title);
            console.log('Responsible ID:', request.responsibleId);
            console.log('Branch ID:', request.branchId);
            
            try {
                // Erstelle einen neuen Task
                const task = await prisma.task.create({
                    data: {
                        title: `Task aus Request: ${request.title}`,
                        description: request.description || '',
                        status: 'open',
                        responsibleId: request.responsibleId,
                        branchId: request.branchId,
                        dueDate: request.dueDate,
                        requestId: request.id
                    }
                });
                console.log('Task erfolgreich erstellt:', task);
            } catch (taskError) {
                console.error('Fehler bei der Task-Erstellung:', taskError);
                // Wir werfen den Fehler nicht, damit der Request-Update trotzdem durchgeht
            }
        } else {
            console.log('Keine Task-Erstellung nötig:');
            console.log('- Status zu approved:', req.body.status === 'approved');
            console.log('- Alter Status nicht approved:', currentRequest.status !== 'approved');
            console.log('- CreateTodo aktiv:', request.createTodo);
        }

        res.json(request);
    } catch (error) {
        console.error('Error in updateRequest:', error);
        res.status(400).json({ message: 'Fehler beim Aktualisieren des Requests', error: error.message });
    }
};

// Request löschen
exports.deleteRequest = async (req, res) => {
    try {
        await prisma.request.delete({
            where: { id: parseInt(req.params.id) }
        });
        res.json({ message: 'Request erfolgreich gelöscht' });
    } catch (error) {
        console.error('Error in deleteRequest:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Requests', error: error.message });
    }
}; 