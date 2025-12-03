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
const prisma_1 = require("../utils/prisma");
const notificationController_1 = require("./notificationController");
const translations_1 = require("../utils/translations");
const organization_1 = require("../middleware/organization");
const filterToPrisma_1 = require("../utils/filterToPrisma");
const filterCache_1 = require("../services/filterCache");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
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
const getAllRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId;
        const filterConditions = req.query.filterConditions
            ? JSON.parse(req.query.filterConditions)
            : undefined;
        // ✅ PAGINATION: limit/offset Parameter wieder einführen
        const limit = req.query.limit
            ? parseInt(req.query.limit, 10)
            : 20; // Standard: 20 Items
        const offset = req.query.offset
            ? parseInt(req.query.offset, 10)
            : 0; // Standard: 0
        const includeAttachments = req.query.includeAttachments === 'true'; // OPTIMIERUNG: Attachments optional
        // Filter-Bedingungen konvertieren (falls vorhanden)
        let filterWhereClause = {};
        if (filterId) {
            // OPTIMIERUNG: Lade Filter aus Cache (vermeidet DB-Query)
            try {
                const filterData = yield filterCache_1.filterCache.get(parseInt(filterId, 10));
                if (filterData) {
                    const conditions = JSON.parse(filterData.conditions);
                    const operators = JSON.parse(filterData.operators);
                    filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(conditions, operators, 'request', req);
                    // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
                    filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'request');
                }
                else {
                    console.warn(`[getAllRequests] Filter ${filterId} nicht gefunden`);
                }
            }
            catch (filterError) {
                console.error(`[getAllRequests] Fehler beim Laden von Filter ${filterId}:`, filterError);
                // Fallback: Versuche ohne Filter weiter
            }
        }
        else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'request', req);
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'request');
        }
        // OPTIMIERUNG: Vereinfachte WHERE-Klausel für bessere Performance
        // Kombiniere organizationId direkt in OR-Bedingung statt verschachtelter AND/OR
        const baseWhereConditions = [];
        // ✅ ROLLEN-ISOLATION: Isolation-Filter basierend auf Rolle
        if (organizationId) {
            if ((0, organization_1.isAdminOrOwner)(req)) {
                // Admin/Owner: Alle Requests der Organisation (inkl. private, ohne Einschränkung)
                baseWhereConditions.push({
                    OR: [
                        // Öffentliche Requests
                        {
                            isPrivate: false,
                            organizationId: organizationId
                        },
                        // Private Requests: Alle (ohne requesterId/responsibleId Einschränkung)
                        {
                            isPrivate: true,
                            organizationId: organizationId
                        }
                    ]
                });
            }
            else {
                // User/Andere Rollen: Nur Requests der eigenen Branch
                const branchId = req.branchId;
                if (branchId) {
                    baseWhereConditions.push({
                        AND: [
                            {
                                OR: [
                                    // Öffentliche Requests der eigenen Branch
                                    {
                                        isPrivate: false,
                                        organizationId: organizationId,
                                        branchId: branchId
                                    },
                                    // Private Requests: Nur wenn User Ersteller ist
                                    {
                                        isPrivate: true,
                                        organizationId: organizationId,
                                        branchId: branchId,
                                        requesterId: userId
                                    },
                                    // Private Requests: Nur wenn User Verantwortlicher ist
                                    {
                                        isPrivate: true,
                                        organizationId: organizationId,
                                        branchId: branchId,
                                        responsibleId: userId
                                    }
                                ]
                            }
                        ]
                    });
                }
                else {
                    // Fallback: Nur eigene Requests (wenn keine Branch)
                    baseWhereConditions.push({
                        OR: [
                            { requesterId: userId },
                            { responsibleId: userId }
                        ]
                    });
                }
            }
        }
        else {
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
        const whereClause = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        // ✅ PAGINATION: totalCount für Infinite Scroll
        let totalCount = 0;
        try {
            totalCount = yield prisma_1.prisma.request.count({
                where: whereClause
            });
        }
        catch (countError) {
            console.error('[getAllRequests] Fehler beim Zählen der Requests:', countError);
            // Fallback: Verwende 0, wird später durch tatsächliche Anzahl ersetzt
            totalCount = 0;
        }
        const queryStartTime = Date.now();
        const requests = yield prisma_1.prisma.request.findMany({
            where: whereClause,
            // ✅ PAGINATION: Nur limit Items laden, offset überspringen
            take: limit,
            skip: offset,
            include: Object.assign({ requester: {
                    select: userSelect
                }, responsible: {
                    select: userSelect
                }, branch: {
                    select: branchSelect
                } }, (includeAttachments ? {
                attachments: {
                    orderBy: {
                        uploadedAt: 'desc'
                    }
                }
            } : {})),
            orderBy: {
                createdAt: 'desc'
            }
        });
        const queryDuration = Date.now() - queryStartTime;
        console.log(`[getAllRequests] ✅ Query abgeschlossen: ${requests.length} Requests (${offset}-${offset + requests.length} von ${totalCount}) in ${queryDuration}ms`);
        // ✅ PAGINATION: Wenn totalCount noch 0 ist (z.B. bei Fehler), verwende tatsächliche Anzahl
        if (totalCount === 0 && requests.length > 0) {
            // Fallback: Wenn wir Items haben, aber totalCount fehlt, schätze basierend auf offset + length
            // Dies ist nur ein Fallback, normalerweise sollte totalCount korrekt sein
            totalCount = offset + requests.length;
        }
        // Formatiere die Daten für die Frontend-Nutzung
        // ✅ Sicherstellen, dass requests ein Array ist
        if (!Array.isArray(requests)) {
            console.error('[getAllRequests] ❌ FEHLER: requests ist kein Array!', {
                requests,
                type: typeof requests
            });
            throw new Error('requests ist kein Array');
        }
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
        // ✅ PAGINATION: Response mit totalCount für Infinite Scroll
        // ✅ Sicherstellen, dass formattedRequests ein Array ist
        if (!Array.isArray(formattedRequests)) {
            console.error('[getAllRequests] ❌ FEHLER: formattedRequests ist kein Array!', {
                formattedRequests,
                type: typeof formattedRequests
            });
            throw new Error('formattedRequests ist kein Array');
        }
        const response = {
            data: formattedRequests,
            totalCount: totalCount,
            limit: limit,
            offset: offset,
            hasMore: offset + formattedRequests.length < totalCount
        };
        console.log('[getAllRequests] ✅ Response vorbereitet:', {
            dataLength: response.data.length,
            totalCount: response.totalCount,
            hasMore: response.hasMore,
            dataIsArray: Array.isArray(response.data)
        });
        res.json(response);
    }
    catch (error) {
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
});
exports.getAllRequests = getAllRequests;
// Einen Request nach ID abrufen
const getRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        // Basis-Filter: Datenisolation
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        // Erweitere Filter um private/öffentliche Logik
        // WICHTIG: isolationFilter und OR-Bedingung müssen mit AND kombiniert werden,
        // damit das OR aus isolationFilter nicht überschrieben wird
        const whereClause = {
            id: parseInt(id),
            AND: [
                isolationFilter,
                {
                    OR: [
                        Object.assign({ isPrivate: false }, (organizationId ? { organizationId } : {})),
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
        const request = yield prisma_1.prisma.request.findFirst({
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
        const { title, description, requested_by_id, responsible_id, branch_id, status = 'approval', type = 'other', is_private = false, due_date, create_todo = false } = req.body;
        if (!title || !requested_by_id || !responsible_id || !branch_id) {
            return res.status(400).json({ message: 'Fehlende erforderliche Felder' });
        }
        const requesterId = parseInt(requested_by_id, 10);
        const responsibleId = parseInt(responsible_id, 10);
        const branchId = parseInt(branch_id, 10);
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);
        // Prüfe ob User Admin ist
        const userRole = yield prisma_1.prisma.role.findUnique({
            where: { id: roleId },
            select: { name: true }
        });
        const isAdmin = (userRole === null || userRole === void 0 ? void 0 : userRole.name.toLowerCase()) === 'admin' || (userRole === null || userRole === void 0 ? void 0 : userRole.name.toLowerCase().includes('administrator'));
        // User-Rolle: Kann nur eigene Requests erstellen
        if (!isAdmin && requesterId !== userId) {
            return res.status(403).json({ message: 'Sie können nur eigene Requests erstellen' });
        }
        // Validierung: Prüfe ob User-IDs zur Organisation gehören
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
        const requesterUser = yield prisma_1.prisma.user.findFirst({
            where: Object.assign(Object.assign({}, userFilter), { id: requesterId })
        });
        if (!requesterUser) {
            return res.status(400).json({ message: 'Antragsteller gehört nicht zu Ihrer Organisation' });
        }
        // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
        const responsibleUser = yield prisma_1.prisma.user.findFirst({
            where: Object.assign(Object.assign({}, userFilter), { id: responsibleId })
        });
        if (!responsibleUser) {
            return res.status(400).json({ message: 'Verantwortlicher gehört nicht zu Ihrer Organisation' });
        }
        // ✅ PERFORMANCE: executeWithRetry für DB-Query
        const request = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.request.create({
            data: {
                title,
                description: description || '',
                status: status,
                type: type,
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
        }));
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
                const requesterLang = yield (0, translations_1.getUserLanguage)(request.requesterId);
                console.log(`[createRequest] Requester Sprache: ${requesterLang}`);
                const requesterNotificationText = (0, translations_1.getRequestNotificationText)(requesterLang, 'created', request.title, true);
                console.log(`[createRequest] Erstelle Notification für Requester ${request.requesterId}: ${requesterNotificationText.title}`);
                const requesterCreated = yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: request.requesterId,
                    relatedEntityId: request.id,
                    relatedEntityType: 'create',
                    type: client_1.NotificationType.request,
                    title: requesterNotificationText.title,
                    message: requesterNotificationText.message
                });
                console.log(`[createRequest] Requester Notification erstellt: ${requesterCreated}`);
                const responsibleLang = yield (0, translations_1.getUserLanguage)(request.responsibleId);
                console.log(`[createRequest] Responsible Sprache: ${responsibleLang}`);
                const responsibleNotificationText = (0, translations_1.getRequestNotificationText)(responsibleLang, 'created', request.title, false);
                console.log(`[createRequest] Erstelle Notification für Responsible ${request.responsibleId}: ${responsibleNotificationText.title}`);
                const responsibleCreated = yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: request.responsibleId,
                    relatedEntityId: request.id,
                    relatedEntityType: 'create',
                    type: client_1.NotificationType.request,
                    title: responsibleNotificationText.title,
                    message: responsibleNotificationText.message
                });
                console.log(`[createRequest] Responsible Notification erstellt: ${responsibleCreated}`);
            }
            catch (notificationError) {
                console.error('[createRequest] Fehler beim Erstellen der Notifications:', notificationError);
            }
        }
        else {
            console.log(`[createRequest] Requester und Responsible sind identisch, keine Notifications erstellt`);
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
        const { title, description, requested_by_id, responsible_id, branch_id, status, type, is_private, due_date, create_todo } = req.body;
        // Prüfe, ob der Request existiert und zur Organisation gehört
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        const existingRequest = yield prisma_1.prisma.request.findFirst({
            where: Object.assign({ id: parseInt(id) }, isolationFilter),
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
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);
        // Prüfe ob User Admin ist
        const userRole = yield prisma_1.prisma.role.findUnique({
            where: { id: roleId },
            select: { name: true }
        });
        const isAdmin = (userRole === null || userRole === void 0 ? void 0 : userRole.name.toLowerCase()) === 'admin' || (userRole === null || userRole === void 0 ? void 0 : userRole.name.toLowerCase().includes('administrator'));
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
            const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
            const requesterUser = yield prisma_1.prisma.user.findFirst({
                where: Object.assign(Object.assign({}, userFilter), { id: parseInt(requested_by_id, 10) })
            });
            if (!requesterUser) {
                return res.status(400).json({ message: 'Antragsteller gehört nicht zu Ihrer Organisation' });
            }
        }
        if (responsible_id) {
            const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
            const responsibleUser = yield prisma_1.prisma.user.findFirst({
                where: Object.assign(Object.assign({}, userFilter), { id: parseInt(responsible_id, 10) })
            });
            if (!responsibleUser) {
                return res.status(400).json({ message: 'Verantwortlicher gehört nicht zu Ihrer Organisation' });
            }
        }
        // Update den Request
        // ✅ PERFORMANCE: executeWithRetry für DB-Query
        const updatedRequest = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.request.update({
            where: { id: parseInt(id) },
            data: {
                title: title,
                description: description,
                requesterId: req.body.requested_by_id ? parseInt(req.body.requested_by_id, 10) : undefined,
                responsibleId: req.body.responsible_id ? parseInt(req.body.responsible_id, 10) : undefined,
                branchId: req.body.branch_id ? parseInt(req.body.branch_id, 10) : undefined,
                status: status,
                type: type,
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
        }));
        // Benachrichtigungen bei Statusänderungen
        if (status && status !== existingRequest.status) {
            // Benachrichtigung für den Ersteller
            const userLang = yield (0, translations_1.getUserLanguage)(updatedRequest.requesterId);
            const notificationText = (0, translations_1.getRequestNotificationText)(userLang, 'status_changed', updatedRequest.title, true, status);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: updatedRequest.requesterId,
                relatedEntityId: updatedRequest.id,
                relatedEntityType: 'status',
                type: client_1.NotificationType.request,
                title: notificationText.title,
                message: notificationText.message
            });
        }
        // Benachrichtigung bei Verantwortlichkeitsänderung
        if (responsible_id && parseInt(responsible_id) !== existingRequest.responsibleId) {
            // Benachrichtigung für den alten Verantwortlichen
            const oldResponsibleLang = yield (0, translations_1.getUserLanguage)(existingRequest.responsibleId);
            const oldNotificationText = (0, translations_1.getRequestNotificationText)(oldResponsibleLang, 'responsibility_changed', updatedRequest.title, false, undefined, true);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: existingRequest.responsibleId,
                relatedEntityId: updatedRequest.id,
                relatedEntityType: 'update',
                type: client_1.NotificationType.request,
                title: oldNotificationText.title,
                message: oldNotificationText.message
            });
            // Benachrichtigung für den neuen Verantwortlichen
            const newResponsibleLang = yield (0, translations_1.getUserLanguage)(parseInt(responsible_id));
            const newNotificationText = (0, translations_1.getRequestNotificationText)(newResponsibleLang, 'responsibility_changed', updatedRequest.title, false, undefined, false);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: parseInt(responsible_id),
                relatedEntityId: updatedRequest.id,
                relatedEntityType: 'update',
                type: client_1.NotificationType.request,
                title: newNotificationText.title,
                message: newNotificationText.message
            });
        }
        // Wenn der Request genehmigt wird und createTodo aktiv ist, erstelle einen Task
        if (status === 'approved' && updatedRequest.createTodo) {
            const task = yield prisma_1.prisma.task.create({
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
            yield copyRequestAttachmentsToTask(updatedRequest.id, task.id);
            // Benachrichtigungen für den Task
            if (updatedRequest.requesterId !== updatedRequest.responsibleId) {
                // Benachrichtigung für den Verantwortlichen
                const userLang = yield (0, translations_1.getUserLanguage)(updatedRequest.responsibleId);
                const notificationText = (0, translations_1.getRequestNotificationText)(userLang, 'new_task_from_request', task.title);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: updatedRequest.responsibleId,
                    relatedEntityId: task.id,
                    relatedEntityType: 'create',
                    type: client_1.NotificationType.task,
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
        const requestAttachments = yield prisma_1.prisma.requestAttachment.findMany({
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
                yield prisma_1.prisma.taskAttachment.create({
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
        // Prüfe, ob der Request existiert und zur Organisation gehört
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        const request = yield prisma_1.prisma.request.findFirst({
            where: Object.assign({ id: parseInt(id) }, isolationFilter),
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
        const userLang = yield (0, translations_1.getUserLanguage)(request.requesterId);
        const notificationText = (0, translations_1.getRequestNotificationText)(userLang, 'deleted', request.title);
        yield (0, notificationController_1.createNotificationIfEnabled)({
            userId: request.requesterId,
            relatedEntityId: request.id,
            relatedEntityType: 'delete',
            type: client_1.NotificationType.request,
            title: notificationText.title,
            message: notificationText.message
        });
        // Lösche den Request
        yield prisma_1.prisma.request.delete({
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