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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequest = exports.updateRequest = exports.createRequest = exports.getRequestById = exports.getAllRequests = void 0;
const client_1 = require("@prisma/client");
const notificationController_1 = require("./notificationController");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
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
    }
    catch (error) {
        console.error('Error fetching requests:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Requests' });
    }
});
exports.getAllRequests = getAllRequests;
// Einen Request nach ID abrufen
const getRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const request = yield prisma.request.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen des Requests' });
    }
});
exports.getRequestById = getRequestById;
// Neuen Request erstellen
const createRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, requested_by_id, responsible_id, branch_id, status = 'approval', due_date, create_todo = false } = req.body;
        if (!title || !requested_by_id || !responsible_id || !branch_id) {
            return res.status(400).json({ message: 'Fehlende erforderliche Felder' });
        }
        const requesterId = parseInt(requested_by_id, 10);
        const responsibleId = parseInt(responsible_id, 10);
        const branchId = parseInt(branch_id, 10);
        const request = yield prisma.request.create({
            data: {
                title,
                description: description || '',
                status: status,
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
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: request.requesterId,
                targetId: request.id,
                targetType: 'request',
                type: client_1.NotificationType.request,
                title: `Neuer Request: ${request.title}`,
                message: `Du hast einen neuen Request erstellt: ${request.title}`
            });
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: request.responsibleId,
                targetId: request.id,
                targetType: 'request',
                type: client_1.NotificationType.request,
                title: `Neuer Request: ${request.title}`,
                message: `Dir wurde ein neuer Request zugewiesen: ${request.title}`
            });
        }
        res.status(201).json(formattedRequest);
    }
    catch (error) {
        console.error('Error creating request:', error);
        res.status(500).json({ message: 'Fehler beim Erstellen des Requests' });
    }
});
exports.createRequest = createRequest;
// Request aktualisieren
const updateRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description, requested_by_id, responsible_id, branch_id, status, due_date, create_todo } = req.body;
        // Prüfe, ob der Request existiert
        const existingRequest = yield prisma.request.findUnique({
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
        const updatedRequest = yield prisma.request.update({
            where: { id: parseInt(id) },
            data: {
                title: title,
                description: description,
                requesterId: req.body.requested_by_id ? parseInt(req.body.requested_by_id, 10) : undefined,
                responsibleId: req.body.responsible_id ? parseInt(req.body.responsible_id, 10) : undefined,
                branchId: req.body.branch_id ? parseInt(req.body.branch_id, 10) : undefined,
                status: status,
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
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: updatedRequest.requesterId,
                targetId: updatedRequest.id,
                targetType: 'request',
                type: client_1.NotificationType.request,
                title: `Statusänderung: ${updatedRequest.title}`,
                message: `Der Status deines Requests "${updatedRequest.title}" wurde zu "${status}" geändert.`
            });
        }
        // Benachrichtigung bei Verantwortlichkeitsänderung
        if (responsible_id && parseInt(responsible_id) !== existingRequest.responsibleId) {
            // Benachrichtigung für den alten Verantwortlichen
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: existingRequest.responsibleId,
                targetId: updatedRequest.id,
                targetType: 'request',
                type: client_1.NotificationType.request,
                title: `Verantwortlichkeit geändert: ${updatedRequest.title}`,
                message: `Die Verantwortlichkeit für den Request "${updatedRequest.title}" wurde geändert.`
            });
            // Benachrichtigung für den neuen Verantwortlichen
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: parseInt(responsible_id),
                targetId: updatedRequest.id,
                targetType: 'request',
                type: client_1.NotificationType.request,
                title: `Neuer Request: ${updatedRequest.title}`,
                message: `Dir wurde ein Request zugewiesen: ${updatedRequest.title}`
            });
        }
        // Wenn der Request genehmigt wird und createTodo aktiv ist, erstelle einen Task
        if (status === 'approved' && updatedRequest.createTodo) {
            const task = yield prisma.task.create({
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
            yield copyRequestAttachmentsToTask(updatedRequest.id, task.id);
            // Benachrichtigungen für den Task
            if (updatedRequest.requesterId !== updatedRequest.responsibleId) {
                // Benachrichtigung für den Verantwortlichen
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: updatedRequest.responsibleId,
                    targetId: task.id,
                    targetType: 'task',
                    type: client_1.NotificationType.task,
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
    }
    catch (error) {
        console.error('Error updating request:', error);
        res.status(500).json({ message: 'Fehler beim Aktualisieren des Requests' });
    }
});
exports.updateRequest = updateRequest;
// Hilfsfunktion zum Kopieren von Anhängen vom Request zum Task
const copyRequestAttachmentsToTask = (requestId, taskId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Hole alle Anhänge des Requests
        const requestAttachments = yield prisma.requestAttachment.findMany({
            where: {
                requestId: requestId
            }
        });
        if (requestAttachments.length === 0) {
            return; // Keine Anhänge zum Kopieren
        }
        const REQUEST_UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/request-attachments');
        const TASK_UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/task-attachments');
        // Stelle sicher, dass das Zielverzeichnis existiert
        if (!fs_1.default.existsSync(TASK_UPLOAD_DIR)) {
            fs_1.default.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });
        }
        // Kopiere jeden Anhang
        for (const attachment of requestAttachments) {
            // Generiere einen eindeutigen Dateinamen für den Task-Anhang
            const uniqueFileName = `${(0, uuid_1.v4)()}${path_1.default.extname(attachment.fileName)}`;
            // Quell- und Zieldateipfade
            const sourcePath = path_1.default.join(REQUEST_UPLOAD_DIR, attachment.filePath);
            const destPath = path_1.default.join(TASK_UPLOAD_DIR, uniqueFileName);
            // Kopiere die physische Datei
            if (fs_1.default.existsSync(sourcePath)) {
                fs_1.default.copyFileSync(sourcePath, destPath);
                // Erstelle einen neuen TaskAttachment-Eintrag
                yield prisma.taskAttachment.create({
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
    }
    catch (error) {
        console.error('Fehler beim Kopieren der Anhänge:', error);
    }
});
// Request löschen
const deleteRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Prüfe, ob der Request existiert
        const request = yield prisma.request.findUnique({
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
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: request.requesterId,
            targetId: request.id,
            targetType: 'request',
            type: client_1.NotificationType.request,
            title: `Request gelöscht: ${request.title}`,
            message: `Dein Request "${request.title}" wurde gelöscht.`
        });
        // Lösche den Request
        yield prisma.request.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: 'Request erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).json({ message: 'Fehler beim Löschen des Requests' });
    }
});
exports.deleteRequest = deleteRequest;
//# sourceMappingURL=requestController.js.map