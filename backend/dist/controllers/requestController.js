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
exports.deleteRequest = exports.updateRequest = exports.createRequest = exports.getRequestById = exports.getAllRequests = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const prisma = new client_1.PrismaClient();
const userSelect = {
    id: true,
    username: true,
    firstName: true,
    lastName: true
};
const branchSelect = {
    id: true,
    name: true
};
// Alle Requests abrufen
const getAllRequests = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requests = yield prisma.request.findMany({
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
        const formattedRequests = requests.map(request => (Object.assign(Object.assign({}, request), { requestedBy: request.requester, requester: undefined })));
        res.json(formattedRequests);
    }
    catch (error) {
        console.error('Error in getAllRequests:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen der Requests',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllRequests = getAllRequests;
// Einen spezifischen Request abrufen
const getRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Request-ID' });
        }
        const request = yield prisma.request.findUnique({
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
        const formattedRequest = Object.assign(Object.assign({}, request), { requestedBy: request.requester, requester: undefined });
        res.json(formattedRequest);
    }
    catch (error) {
        console.error('Error in getRequestById:', error);
        res.status(500).json({
            message: 'Fehler beim Abrufen des Requests',
            error: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getRequestById = getRequestById;
// Neuen Request erstellen
const createRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const requesterId = parseInt(req.body.requested_by_id, 10);
        const responsibleId = parseInt(req.body.responsible_id, 10);
        const branchId = parseInt(req.body.branch_id, 10);
        if (isNaN(requesterId) || isNaN(responsibleId) || isNaN(branchId)) {
            return res.status(400).json({
                message: 'Ungültige ID-Werte'
            });
        }
        const request = yield prisma.request.create({
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
        // Benachrichtigung für den Verantwortlichen erstellen
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: responsibleId,
            title: 'Neuer Request zur Genehmigung',
            message: `Ein neuer Request "${req.body.title}" wurde erstellt und wartet auf deine Genehmigung.`,
            type: client_1.NotificationType.request,
            relatedEntityId: request.id,
            relatedEntityType: 'create'
        });
        // Formatiere die Antwort für das Frontend
        const formattedRequest = Object.assign(Object.assign({}, request), { requestedBy: request.requester, requester: undefined });
        res.status(201).json(formattedRequest);
    }
    catch (error) {
        console.error('Error in createRequest:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                message: 'Fehler beim Erstellen des Requests',
                error: error.message,
                details: error.meta
            });
        }
        else {
            res.status(400).json({
                message: 'Fehler beim Erstellen des Requests',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.createRequest = createRequest;
// Request aktualisieren
const updateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Request-ID' });
        }
        // Hole den aktuellen Request, um createTodo-Status zu prüfen
        const currentRequest = yield prisma.request.findUnique({
            where: { id: requestId },
            include: {
                requester: {
                    select: userSelect
                },
                responsible: {
                    select: userSelect
                }
            }
        });
        if (!currentRequest) {
            return res.status(404).json({ message: 'Request nicht gefunden' });
        }
        // Aktualisiere den Request
        const request = yield prisma.request.update({
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
        // Benachrichtigungen für Statusänderungen
        if (req.body.status && req.body.status !== currentRequest.status) {
            // Benachrichtigung für den Ersteller
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: request.requesterId,
                title: 'Request-Status geändert',
                message: `Der Status deines Requests "${request.title}" wurde von "${currentRequest.status}" zu "${req.body.status}" geändert.`,
                type: client_1.NotificationType.request,
                relatedEntityId: request.id,
                relatedEntityType: 'status'
            });
            // Spezifische Benachrichtigungen je nach neuem Status
            if (req.body.status === 'approved') {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: request.requesterId,
                    title: 'Request genehmigt',
                    message: `Dein Request "${request.title}" wurde genehmigt.`,
                    type: client_1.NotificationType.request,
                    relatedEntityId: request.id,
                    relatedEntityType: 'status'
                });
            }
            else if (req.body.status === 'denied') {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: request.requesterId,
                    title: 'Request abgelehnt',
                    message: `Dein Request "${request.title}" wurde abgelehnt.`,
                    type: client_1.NotificationType.request,
                    relatedEntityId: request.id,
                    relatedEntityType: 'status'
                });
            }
            else if (req.body.status === 'to_improve') {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: request.requesterId,
                    title: 'Request muss überarbeitet werden',
                    message: `Dein Request "${request.title}" muss überarbeitet werden.`,
                    type: client_1.NotificationType.request,
                    relatedEntityId: request.id,
                    relatedEntityType: 'status'
                });
            }
        }
        // Benachrichtigung bei Änderung des Verantwortlichen
        else if (req.body.responsible_id && parseInt(req.body.responsible_id, 10) !== currentRequest.responsibleId) {
            const newResponsibleId = parseInt(req.body.responsible_id, 10);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: newResponsibleId,
                title: 'Request zur Genehmigung zugewiesen',
                message: `Dir wurde der Request "${request.title}" zur Genehmigung zugewiesen.`,
                type: client_1.NotificationType.request,
                relatedEntityId: request.id,
                relatedEntityType: 'update'
            });
        }
        // Allgemeine Aktualisierungsbenachrichtigung
        else if (Object.keys(req.body).length > 0) {
            // Benachrichtigung für den Verantwortlichen
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: request.responsibleId,
                title: 'Request aktualisiert',
                message: `Der Request "${request.title}" wurde aktualisiert.`,
                type: client_1.NotificationType.request,
                relatedEntityId: request.id,
                relatedEntityType: 'update'
            });
            // Benachrichtigung für den Ersteller, falls nicht identisch mit Verantwortlichem
            if (request.requesterId !== request.responsibleId) {
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: request.requesterId,
                    title: 'Request aktualisiert',
                    message: `Dein Request "${request.title}" wurde aktualisiert.`,
                    type: client_1.NotificationType.request,
                    relatedEntityId: request.id,
                    relatedEntityType: 'update'
                });
            }
        }
        // Formatiere die Antwort für das Frontend
        const formattedRequest = Object.assign(Object.assign({}, request), { requestedBy: request.requester, requester: undefined });
        // Wenn der Status auf "approved" geändert wurde und createTodo true ist
        if (req.body.status === 'approved' && request.createTodo) {
            try {
                // Erstelle einen neuen Task
                const task = yield prisma.task.create({
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
            }
            catch (taskError) {
                console.error('Fehler bei der Task-Erstellung:', taskError);
            }
        }
        res.json(formattedRequest);
    }
    catch (error) {
        console.error('Error in updateRequest:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                message: 'Fehler beim Aktualisieren des Requests',
                error: error.message,
                details: error.meta
            });
        }
        else {
            res.status(400).json({
                message: 'Fehler beim Aktualisieren des Requests',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateRequest = updateRequest;
// Request löschen
const deleteRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const requestId = parseInt(req.params.id, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ message: 'Ungültige Request-ID' });
        }
        // Request vor dem Löschen abrufen, um Benachrichtigungen zu senden
        const request = yield prisma.request.findUnique({
            where: { id: requestId },
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
        yield prisma.request.delete({
            where: { id: requestId }
        });
        // Benachrichtigung für den Ersteller
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: request.requesterId,
            title: 'Request gelöscht',
            message: `Dein Request "${request.title}" wurde gelöscht.`,
            type: client_1.NotificationType.request,
            relatedEntityId: requestId,
            relatedEntityType: 'delete'
        });
        // Benachrichtigung für den Verantwortlichen, falls nicht identisch mit Ersteller
        if (request.requesterId !== request.responsibleId) {
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: request.responsibleId,
                title: 'Request gelöscht',
                message: `Der Request "${request.title}" wurde gelöscht.`,
                type: client_1.NotificationType.request,
                relatedEntityId: requestId,
                relatedEntityType: 'delete'
            });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error in deleteRequest:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                message: 'Fehler beim Löschen des Requests',
                error: error.message,
                details: error.meta
            });
        }
        else {
            res.status(400).json({
                message: 'Fehler beim Löschen des Requests',
                error: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.deleteRequest = deleteRequest;
//# sourceMappingURL=requestController.js.map