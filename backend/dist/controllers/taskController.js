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
exports.unlinkTaskFromCarticle = exports.linkTaskToCarticle = exports.getTaskCarticles = exports.deleteTask = exports.updateTask = exports.createTask = exports.getTaskById = exports.getAllTasks = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = require("../utils/prisma");
const taskValidation_1 = require("../validation/taskValidation");
const notificationController_1 = require("./notificationController");
const organization_1 = require("../middleware/organization");
const logger_1 = require("../utils/logger");
const lifecycleService_1 = require("../services/lifecycleService");
const translations_1 = require("../utils/translations");
const filterToPrisma_1 = require("../utils/filterToPrisma");
const filterCache_1 = require("../services/filterCache");
const userSelect = {
    id: true,
    firstName: true,
    lastName: true
};
const roleSelect = {
    id: true,
    name: true
};
const branchSelect = {
    id: true,
    name: true
};
// Alle Tasks abrufen
const getAllTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = parseInt(req.userId, 10);
        const organizationId = req.organizationId;
        const userRoleId = (_b = (_a = req.userRole) === null || _a === void 0 ? void 0 : _a.role) === null || _b === void 0 ? void 0 : _b.id;
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
            const filterData = yield filterCache_1.filterCache.get(parseInt(filterId, 10));
            if (filterData) {
                const conditions = JSON.parse(filterData.conditions);
                const operators = JSON.parse(filterData.operators);
                filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(conditions, operators, 'task', req);
                // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
                filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'task');
            }
        }
        else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'task', req);
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'task');
        }
        // ✅ PERFORMANCE: Vereinfachte WHERE-Klausel für bessere Performance
        // ✅ PERFORMANCE: Flachere OR-Struktur für bessere Index-Nutzung
        const baseWhereConditions = [];
        // ✅ ROLLEN-ISOLATION: Isolation-Filter basierend auf Rolle
        if (organizationId) {
            if ((0, organization_1.isAdminOrOwner)(req)) {
                // Admin/Owner: Alle Tasks der Organisation
                baseWhereConditions.push({
                    organizationId: organizationId
                });
            }
            else {
                // User/Andere Rollen: Nur Tasks der eigenen Rolle + eigene Tasks, innerhalb der eigenen Branch
                const branchId = req.branchId;
                const taskFilter = {
                    organizationId: organizationId
                };
                if (branchId) {
                    taskFilter.branchId = branchId;
                }
                if (userRoleId) {
                    taskFilter.OR = [
                        { responsibleId: userId },
                        { qualityControlId: userId },
                        { roleId: userRoleId }
                    ];
                }
                else {
                    // Fallback: Nur eigene Tasks
                    taskFilter.OR = [
                        { responsibleId: userId },
                        { qualityControlId: userId }
                    ];
                }
                baseWhereConditions.push(taskFilter);
            }
        }
        else {
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
        // ✅ SOFT DELETE: Füge deletedAt Filter hinzu
        baseWhereConditions.push((0, prisma_1.getNotDeletedFilter)());
        // Kombiniere alle Filter
        const whereClause = baseWhereConditions.length === 1
            ? baseWhereConditions[0]
            : { AND: baseWhereConditions };
        // ✅ PAGINATION: totalCount für Infinite Scroll
        let totalCount = 0;
        try {
            totalCount = yield prisma_1.prisma.task.count({
                where: whereClause
            });
        }
        catch (countError) {
            logger_1.logger.error('[getAllTasks] Fehler beim Zählen der Tasks:', countError);
            // Fallback: Verwende 0, wird später durch tatsächliche Anzahl ersetzt
            totalCount = 0;
        }
        const queryStartTime = Date.now();
        const tasks = yield prisma_1.prisma.task.findMany({
            where: whereClause,
            // ✅ PAGINATION: Nur limit Items laden, offset überspringen
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }, // Neueste Tasks zuerst
            include: Object.assign({ responsible: {
                    select: userSelect
                }, role: {
                    select: roleSelect
                }, qualityControl: {
                    select: userSelect
                }, branch: {
                    select: branchSelect
                } }, (includeAttachments ? {
                attachments: {
                    orderBy: {
                        uploadedAt: 'desc'
                    }
                }
            } : {}))
        });
        const queryDuration = Date.now() - queryStartTime;
        // ✅ PERFORMANCE: Logging nur bei langsamen Queries (>500ms) oder Fehlern
        if (queryDuration > 500 || process.env.NODE_ENV === 'development') {
            logger_1.logger.log(`[getAllTasks] ✅ Query abgeschlossen: ${tasks.length} Tasks (${offset}-${offset + tasks.length} von ${totalCount}) in ${queryDuration}ms`);
        }
        // ✅ PAGINATION: Wenn totalCount noch 0 ist (z.B. bei Fehler), verwende tatsächliche Anzahl
        if (totalCount === 0 && tasks.length > 0) {
            // Fallback: Wenn wir Items haben, aber totalCount fehlt, schätze basierend auf offset + length
            totalCount = offset + tasks.length;
        }
        // ✅ Sicherstellen, dass tasks ein Array ist
        if (!Array.isArray(tasks)) {
            logger_1.logger.error('[getAllTasks] ❌ FEHLER: tasks ist kein Array!', {
                tasks,
                type: typeof tasks
            });
            throw new Error('tasks ist kein Array');
        }
        // ✅ PAGINATION: Response mit totalCount für Infinite Scroll
        const response = {
            data: tasks,
            totalCount: totalCount,
            limit: limit,
            offset: offset,
            hasMore: offset + tasks.length < totalCount
        };
        // ✅ PERFORMANCE: Logging nur bei langsamen Queries (>500ms) oder Fehlern
        if (queryDuration > 500 || process.env.NODE_ENV === 'development') {
            logger_1.logger.log('[getAllTasks] ✅ Response vorbereitet:', {
                dataLength: response.data.length,
                totalCount: response.totalCount,
                hasMore: response.hasMore,
                dataIsArray: Array.isArray(response.data)
            });
        }
        res.json(response);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Tasks:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getAllTasks = getAllTasks;
// Einzelnen Task abrufen
const getTaskById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        const task = yield prisma_1.prisma.task.findFirst({
            where: Object.assign(Object.assign({ id: taskId }, isolationFilter), (0, prisma_1.getNotDeletedFilter)() // ✅ SOFT DELETE: Nur nicht gelöschte Tasks
            ),
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen des Tasks:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getTaskById = getTaskById;
// Neuen Task erstellen
const createTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskData = req.body;
        const validationError = (0, taskValidation_1.validateTask)(taskData);
        if (validationError) {
            return res.status(400).json({ error: validationError });
        }
        // Validierung: Prüfe ob User-IDs zur Organisation gehören
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        if (taskData.responsibleId) {
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
            const responsibleUser = yield prisma_1.prisma.user.findFirst({
                where: Object.assign(Object.assign({}, userFilter), { id: taskData.responsibleId })
            });
            if (!responsibleUser) {
                return res.status(400).json({ error: 'Verantwortlicher Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }
        if (taskData.qualityControlId) {
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
            const qualityControlUser = yield prisma_1.prisma.user.findFirst({
                where: Object.assign(Object.assign({}, userFilter), { id: taskData.qualityControlId })
            });
            if (!qualityControlUser) {
                return res.status(400).json({ error: 'Qualitätskontrolle-Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }
        // Erstelle ein Basis-Datenobjekt ohne responsibleId/roleId
        const taskStatus = taskData.status || 'open';
        const taskCreateData = {
            title: taskData.title,
            description: taskData.description || '',
            status: taskStatus,
            qualityControlId: taskData.qualityControlId,
            branchId: taskData.branchId,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
            organizationId: req.organizationId || null,
            createdById: req.userId ? Number(req.userId) : null // NEU: Wer hat den Task erstellt
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
        const task = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.task.create({
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
        }));
        // Benachrichtigung für den Verantwortlichen erstellen, nur wenn ein Benutzer zugewiesen ist
        if (taskData.responsibleId) {
            const userLang = yield (0, translations_1.getUserLanguage)(taskData.responsibleId);
            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'assigned', taskData.title);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: taskData.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'create'
            });
        }
        // Benachrichtigung für die Qualitätskontrolle erstellen
        if (taskData.qualityControlId) {
            const userLang = yield (0, translations_1.getUserLanguage)(taskData.qualityControlId);
            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'quality_control_assigned', taskData.title);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: taskData.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'create'
            });
        }
        // ✅ INITIAL STATUS-HISTORIE: Erstelle initiale Status-Historie
        if (req.userId) {
            yield prisma_1.prisma.taskStatusHistory.create({
                data: {
                    taskId: task.id,
                    userId: Number(req.userId),
                    oldStatus: null, // Initial: kein alter Status
                    newStatus: taskStatus,
                    branchId: taskData.branchId,
                    changedAt: new Date()
                }
            });
        }
        res.status(201).json(task);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Erstellen des Tasks:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                error: 'Fehler beim Erstellen des Tasks',
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.createTask = createTask;
// Task aktualisieren
const updateTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        const updateData = req.body;
        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        // Aktuellen Task abrufen, um Änderungen zu erkennen
        // ✅ PERFORMANCE: READ-Operation OHNE executeWithRetry (blockiert nicht bei vollem Pool)
        const currentTask = yield prisma_1.prisma.task.findFirst({
            where: Object.assign(Object.assign({ id: taskId }, isolationFilter), (0, prisma_1.getNotDeletedFilter)() // ✅ SOFT DELETE: Nur nicht gelöschte Tasks
            ),
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
        });
        if (!currentTask) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        // Prüfe Task-Berechtigungen für User-Rolle
        const userId = parseInt(req.userId, 10);
        const roleId = parseInt(req.roleId, 10);
        // Prüfe ob User Admin ist
        // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
        const userRole = yield prisma_1.prisma.role.findUnique({
            where: { id: roleId },
            select: { name: true }
        });
        const isAdmin = (userRole === null || userRole === void 0 ? void 0 : userRole.name.toLowerCase()) === 'admin' || (userRole === null || userRole === void 0 ? void 0 : userRole.name.toLowerCase().includes('administrator'));
        // User-Rolle: Kann nur eigene Tasks oder Tasks der eigenen Rolle "User" status-shiften
        if (updateData.status && !isAdmin) {
            // Prüfe ob User die User-Rolle in der Organisation hat
            // READ-Operation: executeWithRetry NICHT nötig (nicht kritisch)
            const userRoleInOrg = yield prisma_1.prisma.role.findFirst({
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
            const canModify = currentTask.responsibleId === userId ||
                (userRoleInOrg && currentTask.roleId === userRoleInOrg.id);
            if (!canModify) {
                return res.status(403).json({
                    error: 'Sie können nur eigene Tasks oder Tasks Ihrer Rolle "User" bearbeiten'
                });
            }
        }
        // Wenn nur der Status aktualisiert wird, keine vollständige Validierung
        if (Object.keys(updateData).length === 1 && updateData.status) {
            if (!Object.values(client_1.TaskStatus).includes(updateData.status)) {
                return res.status(400).json({ error: 'Ungültiger Status' });
            }
        }
        else {
            const validationError = (0, taskValidation_1.validateTask)(updateData);
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }
        // Validierung: Prüfe ob User-IDs zur Organisation gehören (wenn geändert)
        if (updateData.responsibleId !== undefined && updateData.responsibleId !== null) {
            const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
            const responsibleUser = yield prisma_1.prisma.user.findFirst({
                where: Object.assign(Object.assign({}, userFilter), { id: updateData.responsibleId })
            });
            if (!responsibleUser) {
                return res.status(400).json({ error: 'Verantwortlicher Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }
        if (updateData.qualityControlId !== undefined && updateData.qualityControlId !== null) {
            const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
            // Validierung: executeWithRetry NICHT nötig (nicht kritisch)
            const qualityControlUser = yield prisma_1.prisma.user.findFirst({
                where: Object.assign(Object.assign({}, userFilter), { id: updateData.qualityControlId })
            });
            if (!qualityControlUser) {
                return res.status(400).json({ error: 'Qualitätskontrolle-Benutzer gehört nicht zu Ihrer Organisation' });
            }
        }
        // Erstelle ein Objekt für die zu aktualisierenden Daten
        const updateDataForPrisma = {};
        // Füge nur die Felder hinzu, die tatsächlich aktualisiert werden sollen
        if (updateData.title !== undefined)
            updateDataForPrisma.title = updateData.title;
        if (updateData.description !== undefined)
            updateDataForPrisma.description = updateData.description;
        if (updateData.status !== undefined)
            updateDataForPrisma.status = updateData.status;
        if (updateData.branchId !== undefined)
            updateDataForPrisma.branchId = updateData.branchId;
        if (updateData.qualityControlId !== undefined)
            updateDataForPrisma.qualityControlId = updateData.qualityControlId;
        if (updateData.dueDate !== undefined)
            updateDataForPrisma.dueDate = updateData.dueDate ? new Date(updateData.dueDate) : null;
        // Füge responsibleId nur hinzu, wenn es einen Wert hat (nicht null/undefined)
        if (updateData.responsibleId) {
            updateDataForPrisma.responsibleId = updateData.responsibleId;
        }
        else if (updateData.responsibleId === null && 'responsibleId' in updateData) {
            // Wenn explizit null gesetzt wird und eine Rolle gewählt wurde, entferne die Beziehung
            updateDataForPrisma.responsibleId = null;
        }
        // Füge roleId nur hinzu, wenn es einen Wert hat (nicht null/undefined)
        if (updateData.roleId) {
            updateDataForPrisma.roleId = updateData.roleId;
        }
        else if (updateData.roleId === null && 'roleId' in updateData) {
            // Wenn explizit null gesetzt wird, entferne die Beziehung
            updateDataForPrisma.roleId = null;
        }
        // ✅ PERFORMANCE: executeWithRetry für DB-Query
        const task = yield (0, prisma_1.executeWithRetry)(() => prisma_1.prisma.task.update({
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
        }));
        // Benachrichtigung bei Statusänderung
        if (updateData.status && updateData.status !== currentTask.status) {
            // Status-History speichern
            const userId = req.userId;
            if (userId) {
                yield prisma_1.prisma.taskStatusHistory.create({
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
                    const userIdMatch = (_a = task.description) === null || _a === void 0 ? void 0 : _a.match(/userId=(\d+)/);
                    if (!userIdMatch) {
                        logger_1.logger.log('[updateTask] Konnte userId nicht aus Task-Description extrahieren');
                    }
                    else {
                        const onboardingUserId = parseInt(userIdMatch[1], 10);
                        // Prüfe ob User contract, salary, normalWorkingHours hat
                        const onboardingUser = yield prisma_1.prisma.user.findUnique({
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
                                logger_1.logger.log(`[updateTask] Starte Lifecycle für User ${onboardingUserId} nach Admin-Onboarding`);
                                yield lifecycleService_1.LifecycleService.startLifecycleAfterOnboarding(onboardingUserId, task.organizationId);
                                // Benachrichtigung an User
                                const userLang = yield (0, translations_1.getUserLanguage)(onboardingUserId);
                                const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'onboarding_completed', task.title);
                                yield (0, notificationController_1.createNotificationIfEnabled)({
                                    userId: onboardingUserId,
                                    title: notificationText.title,
                                    message: notificationText.message,
                                    type: client_1.NotificationType.user,
                                    relatedEntityId: onboardingUserId,
                                    relatedEntityType: 'update'
                                });
                            }
                            else if (updateData.status === 'quality_control' && (!hasContract || !hasSalary || !hasNormalWorkingHours)) {
                                logger_1.logger.log(`[updateTask] Quality-Control-Status gesetzt, aber nicht alle Felder ausgefüllt für User ${onboardingUserId}`);
                            }
                        }
                    }
                }
                catch (lifecycleError) {
                    logger_1.logger.error('[updateTask] Fehler beim Starten des Lifecycle:', lifecycleError);
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
                    const bankDetailsUser = yield prisma_1.prisma.user.findUnique({
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
                            logger_1.logger.log(`[updateTask] BankDetails-To-Do erledigt für User ${bankDetailsUserId}`);
                            // Task ist bereits auf "done" gesetzt, keine weitere Aktion nötig
                        }
                        else if (updateData.status === 'quality_control' && !hasBankDetails) {
                            logger_1.logger.log(`[updateTask] Quality-Control-Status gesetzt, aber bankDetails nicht ausgefüllt für User ${bankDetailsUserId}`);
                        }
                    }
                }
                catch (bankDetailsError) {
                    logger_1.logger.error('[updateTask] Fehler bei BankDetails-To-Do-Prüfung:', bankDetailsError);
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
                    const identificationDocumentUser = yield prisma_1.prisma.user.findUnique({
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
                            logger_1.logger.log(`[updateTask] Identitätsdokument-To-Do erledigt für User ${identificationDocumentUserId}`);
                            // Task ist bereits auf "done" gesetzt, keine weitere Aktion nötig
                        }
                        else if (updateData.status === 'quality_control' && !hasIdentificationDocument) {
                            logger_1.logger.log(`[updateTask] Quality-Control-Status gesetzt, aber Identitätsdokument nicht vorhanden für User ${identificationDocumentUserId}`);
                        }
                    }
                }
                catch (identificationDocumentError) {
                    logger_1.logger.error('[updateTask] Fehler bei Identitätsdokument-To-Do-Prüfung:', identificationDocumentError);
                    // Fehler blockiert nicht die Task-Aktualisierung
                }
            }
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                const userLang = yield (0, translations_1.getUserLanguage)(task.responsibleId);
                const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'status_changed', task.title, currentTask.status, updateData.status);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.responsibleId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'status'
                });
            }
            // Benachrichtigung für die Qualitätskontrolle
            if (task.qualityControlId) {
                const userLang = yield (0, translations_1.getUserLanguage)(task.qualityControlId);
                const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'status_changed', task.title, currentTask.status, updateData.status);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.qualityControlId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'status'
                });
            }
        }
        // Benachrichtigung bei Änderung des Verantwortlichen
        else if (updateData.responsibleId && updateData.responsibleId !== currentTask.responsibleId) {
            const userLang = yield (0, translations_1.getUserLanguage)(updateData.responsibleId);
            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'assigned', task.title);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: updateData.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Benachrichtigung bei Änderung der Qualitätskontrolle
        else if (updateData.qualityControlId && updateData.qualityControlId !== currentTask.qualityControlId) {
            const userLang = yield (0, translations_1.getUserLanguage)(updateData.qualityControlId);
            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'quality_control_assigned', task.title);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: updateData.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.task,
                relatedEntityId: task.id,
                relatedEntityType: 'update'
            });
        }
        // Allgemeine Aktualisierungsbenachrichtigung
        else if (Object.keys(updateData).length > 0) {
            // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
            if (task.responsibleId) {
                const userLang = yield (0, translations_1.getUserLanguage)(task.responsibleId);
                const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'updated', task.title);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.responsibleId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
            // Benachrichtigung für die Qualitätskontrolle
            if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
                const userLang = yield (0, translations_1.getUserLanguage)(task.qualityControlId);
                const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'updated', task.title);
                yield (0, notificationController_1.createNotificationIfEnabled)({
                    userId: task.qualityControlId,
                    title: notificationText.title,
                    message: notificationText.message,
                    type: client_1.NotificationType.task,
                    relatedEntityId: task.id,
                    relatedEntityType: 'update'
                });
            }
        }
        res.json(task);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Aktualisieren des Tasks:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                error: 'Fehler beim Aktualisieren des Tasks',
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.updateTask = updateTask;
// Task löschen
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        // Task vor dem Löschen abrufen, um Benachrichtigungen zu senden
        const task = yield prisma_1.prisma.task.findFirst({
            where: Object.assign(Object.assign({ id: taskId }, isolationFilter), (0, prisma_1.getNotDeletedFilter)() // ✅ SOFT DELETE: Nur nicht gelöschte Tasks
            ),
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
        // ✅ SOFT DELETE: Statt hard delete, setze deletedAt
        // Abhängige Datensätze bleiben erhalten (TaskCerebroCarticle, WorkTimeTask)
        yield prisma_1.prisma.task.update({
            where: { id: taskId },
            data: {
                deletedAt: new Date(),
                deletedById: req.userId ? Number(req.userId) : null
            }
        });
        // Benachrichtigung für den Verantwortlichen, nur wenn ein Benutzer zugewiesen ist
        if (task.responsibleId) {
            const userLang = yield (0, translations_1.getUserLanguage)(task.responsibleId);
            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'deleted', task.title);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.responsibleId,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }
        // Benachrichtigung für die Qualitätskontrolle
        if (task.qualityControlId && (!task.responsibleId || task.responsibleId !== task.qualityControlId)) {
            const userLang = yield (0, translations_1.getUserLanguage)(task.qualityControlId);
            const notificationText = (0, translations_1.getTaskNotificationText)(userLang, 'deleted', task.title);
            yield (0, notificationController_1.createNotificationIfEnabled)({
                userId: task.qualityControlId,
                title: notificationText.title,
                message: notificationText.message,
                type: client_1.NotificationType.task,
                relatedEntityId: taskId,
                relatedEntityType: 'delete'
            });
        }
        res.status(204).send();
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Löschen des Tasks:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
            res.status(400).json({
                error: 'Fehler beim Löschen des Tasks',
                details: error.message,
                meta: error.meta
            });
        }
        else {
            res.status(500).json({
                error: 'Interner Serverfehler',
                details: error instanceof Error ? error.message : 'Unbekannter Fehler'
            });
        }
    }
});
exports.deleteTask = deleteTask;
// Cerebro-Artikel eines Tasks abrufen
const getTaskCarticles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID' });
        }
        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        const task = yield prisma_1.prisma.task.findFirst({
            where: Object.assign({ id: taskId }, isolationFilter),
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der verknüpften Artikel:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.getTaskCarticles = getTaskCarticles;
// Cerebro-Artikel mit Task verknüpfen
const linkTaskToCarticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const carticleId = parseInt(req.params.carticleId, 10);
        if (isNaN(taskId) || isNaN(carticleId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID oder Artikel-ID' });
        }
        // Datenisolation: Prüfe ob User Zugriff auf diesen Task hat
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        // Prüfen, ob Task existiert
        const task = yield prisma_1.prisma.task.findFirst({
            where: Object.assign({ id: taskId }, isolationFilter)
        });
        if (!task) {
            return res.status(404).json({ error: 'Task nicht gefunden' });
        }
        // Prüfen, ob Artikel existiert
        const carticle = yield prisma_1.prisma.cerebroCarticle.findUnique({ where: { id: carticleId } });
        if (!carticle) {
            return res.status(404).json({ error: 'Artikel nicht gefunden' });
        }
        // Verknüpfung erstellen
        const link = yield prisma_1.prisma.taskCerebroCarticle.create({
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Verknüpfen des Artikels:', error);
        // Behandlung von einzigartigen Einschränkungsverletzungen
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(409).json({ error: 'Diese Verknüpfung existiert bereits' });
        }
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.linkTaskToCarticle = linkTaskToCarticle;
// Verknüpfung zwischen Task und Cerebro-Artikel entfernen
const unlinkTaskFromCarticle = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = parseInt(req.params.taskId, 10);
        const carticleId = parseInt(req.params.carticleId, 10);
        if (isNaN(taskId) || isNaN(carticleId)) {
            return res.status(400).json({ error: 'Ungültige Task-ID oder Artikel-ID' });
        }
        // Verknüpfung suchen
        const link = yield prisma_1.prisma.taskCerebroCarticle.findUnique({
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
        yield prisma_1.prisma.taskCerebroCarticle.delete({
            where: {
                taskId_carticleId: {
                    taskId,
                    carticleId
                }
            }
        });
        res.status(200).json({ message: 'Verknüpfung erfolgreich entfernt' });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Entfernen der Verknüpfung:', error);
        res.status(500).json({
            error: 'Interner Serverfehler',
            details: error instanceof Error ? error.message : 'Unbekannter Fehler'
        });
    }
});
exports.unlinkTaskFromCarticle = unlinkTaskFromCarticle;
//# sourceMappingURL=taskController.js.map