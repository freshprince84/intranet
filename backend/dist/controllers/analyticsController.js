"use strict";
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
exports.getRequestsActivity = exports.getTasksActivity = exports.getUserRequestsActivity = exports.getUserTasksActivity = exports.getTodosShiftAnalysis = exports.getTodosFrequencyAnalysis = exports.getRequestsChronological = exports.getTodosChronological = exports.getRequestsByUserForDate = exports.getTodosByUserForDate = void 0;
const client_1 = require("@prisma/client");
const organization_1 = require("../middleware/organization");
const date_fns_1 = require("date-fns");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const dateHelpers_1 = require("../utils/dateHelpers");
const filterToPrisma_1 = require("../utils/filterToPrisma");
const filterCache_1 = require("../services/filterCache");
// To-Dos pro User für ein bestimmtes Datum
const getTodosByUserForDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const userId = req.userId;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }
        // Datenisolation: User sehen nur Daten ihrer Organisation
        const taskFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const selectedDate = (0, date_fns_1.parseISO)(date);
        const start = (0, date_fns_1.startOfDay)(selectedDate);
        const end = (0, date_fns_1.endOfDay)(selectedDate);
        // Alle User mit ihren To-Dos für das Datum
        const users = yield prisma_1.prisma.user.findMany({
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
                ...user.tasksResponsible.map(t => (Object.assign(Object.assign({}, t), { role: 'responsible' }))),
                ...user.tasksQualityControl.map(t => (Object.assign(Object.assign({}, t), { role: 'quality_control' })))
            ];
            // Entferne Duplikate (falls ein Task sowohl responsible als auch qualityControl ist)
            const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der To-Dos pro User:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der To-Dos' });
    }
});
exports.getTodosByUserForDate = getTodosByUserForDate;
// Requests pro User für ein bestimmtes Datum
const getRequestsByUserForDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const userId = req.userId;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }
        // Datenisolation: User sehen nur Daten ihrer Organisation
        const requestFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const selectedDate = (0, date_fns_1.parseISO)(date);
        const start = (0, date_fns_1.startOfDay)(selectedDate);
        const end = (0, date_fns_1.endOfDay)(selectedDate);
        // Alle User mit ihren Requests für das Datum
        const users = yield prisma_1.prisma.user.findMany({
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
                ...user.requestsRequester.map(r => (Object.assign(Object.assign({}, r), { role: 'requester' }))),
                ...user.requestsResponsible.map(r => (Object.assign(Object.assign({}, r), { role: 'responsible' })))
            ];
            // Entferne Duplikate
            const uniqueRequests = Array.from(new Map(allRequests.map(r => [r.id, r])).values());
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
                        createdAt: r.createdAt
                    }))
                }
            };
        });
        res.json(result);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Requests pro User:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Requests' });
    }
});
exports.getRequestsByUserForDate = getRequestsByUserForDate;
/**
 * ✅ PHASE 3: Extrahiert und konvertiert Zeitraum-Filter für Analytics-Tabellen
 *
 * Für Analytics-Tabellen muss die Filter-Bedingung für "time" nicht nur auf `createdAt` filtern,
 * sondern auch auf `deletedAt` und `statusHistory.changedAt`.
 *
 * @param filterWhereClause - Die konvertierte Prisma Where-Klausel
 * @returns Objekt mit timeFilter (OR-Bedingung) und remainingFilter (ohne createdAt-Bedingung)
 */
function extractAndConvertTimeFilterForAnalytics(filterWhereClause) {
    if (!filterWhereClause || typeof filterWhereClause !== 'object') {
        return { timeFilter: null, remainingFilter: filterWhereClause || {} };
    }
    // Rekursive Funktion zum Extrahieren von createdAt-Bedingungen
    const extractCreatedAtCondition = (clause) => {
        if (!clause || typeof clause !== 'object') {
            return null;
        }
        // Direkte createdAt-Bedingung mit gte/lte
        if (clause.createdAt && typeof clause.createdAt === 'object') {
            const createdAt = clause.createdAt;
            if (createdAt.gte || createdAt.lte) {
                return {
                    gte: createdAt.gte,
                    lte: createdAt.lte
                };
            }
        }
        // Rekursiv in AND/OR-Arrays suchen
        if (Array.isArray(clause.AND)) {
            for (const item of clause.AND) {
                const result = extractCreatedAtCondition(item);
                if (result) {
                    return result;
                }
            }
        }
        if (Array.isArray(clause.OR)) {
            for (const item of clause.OR) {
                const result = extractCreatedAtCondition(item);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    };
    // Rekursive Funktion zum Entfernen von createdAt-Bedingungen
    const removeCreatedAtCondition = (clause) => {
        if (!clause || typeof clause !== 'object') {
            return clause;
        }
        // Neues Objekt für bereinigte Klausel
        const cleaned = {};
        for (const [key, value] of Object.entries(clause)) {
            // Ignoriere createdAt direkt
            if (key === 'createdAt') {
                continue;
            }
            // Handle AND/OR Arrays
            if (key === 'AND' || key === 'OR') {
                if (Array.isArray(value)) {
                    const cleanedArray = value
                        .map(item => removeCreatedAtCondition(item))
                        .filter(item => {
                        // Entferne leere Objekte
                        if (!item || typeof item !== 'object') {
                            return true;
                        }
                        return Object.keys(item).length > 0;
                    });
                    if (cleanedArray.length > 0) {
                        cleaned[key] = cleanedArray.length === 1 ? cleanedArray[0] : cleanedArray;
                    }
                }
                else {
                    cleaned[key] = removeCreatedAtCondition(value);
                }
                continue;
            }
            // Rekursiv für verschachtelte Objekte
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                const cleanedValue = removeCreatedAtCondition(value);
                if (cleanedValue && Object.keys(cleanedValue).length > 0) {
                    cleaned[key] = cleanedValue;
                }
            }
            else {
                // Einfache Werte beibehalten
                cleaned[key] = value;
            }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : {};
    };
    // Extrahiere createdAt-Bedingung
    const createdAtCondition = extractCreatedAtCondition(filterWhereClause);
    if (createdAtCondition && (createdAtCondition.gte || createdAtCondition.lte)) {
        // Erstelle OR-Bedingung für Analytics
        const timeFilter = {
            OR: [
                {
                    createdAt: Object.assign(Object.assign({}, (createdAtCondition.gte && { gte: createdAtCondition.gte })), (createdAtCondition.lte && { lte: createdAtCondition.lte }))
                },
                {
                    deletedAt: Object.assign(Object.assign({}, (createdAtCondition.gte && { gte: createdAtCondition.gte })), (createdAtCondition.lte && { lte: createdAtCondition.lte }))
                },
                {
                    statusHistory: {
                        some: {
                            changedAt: Object.assign(Object.assign({}, (createdAtCondition.gte && { gte: createdAtCondition.gte })), (createdAtCondition.lte && { lte: createdAtCondition.lte }))
                        }
                    }
                }
            ]
        };
        // Entferne createdAt aus filterWhereClause
        const remainingFilter = removeCreatedAtCondition(filterWhereClause);
        return { timeFilter, remainingFilter };
    }
    // Keine createdAt-Bedingung gefunden
    return { timeFilter: null, remainingFilter: filterWhereClause };
}
// Alle To-Dos chronologisch für ein Datum oder Datumsbereich (Tab 2)
const getTodosChronological = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, period, startDate, endDate } = req.query;
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId;
        const filterConditions = req.query.filterConditions
            ? JSON.parse(req.query.filterConditions)
            : undefined;
        // Datenisolation
        const taskFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        // Unterstütze sowohl einzelnes Datum als auch Datumsbereich
        let start;
        let end;
        if (period && (period === 'custom' || period === 'week' || period === 'month' || period === 'year' || period === 'today')) {
            // Neues Format: Datumsbereich
            const dateRange = (0, dateHelpers_1.getDateRange)(period, startDate, endDate);
            start = dateRange.start;
            end = dateRange.end;
        }
        else if (date && typeof date === 'string') {
            // Altes Format: Einzelnes Datum (Rückwärtskompatibilität)
            const selectedDate = (0, date_fns_1.parseISO)(date);
            start = (0, date_fns_1.startOfDay)(selectedDate);
            end = (0, date_fns_1.endOfDay)(selectedDate);
        }
        else {
            return res.status(400).json({ error: 'Datum oder Datumsbereich erforderlich' });
        }
        // Filter-Bedingungen konvertieren (falls vorhanden)
        let filterWhereClause = {};
        if (filterId) {
            // OPTIMIERUNG: Lade Filter aus Cache (vermeidet DB-Query)
            try {
                const filterData = yield filterCache_1.filterCache.get(parseInt(filterId, 10));
                if (filterData) {
                    const conditions = JSON.parse(filterData.conditions);
                    const operators = JSON.parse(filterData.operators);
                    filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(conditions, operators, 'task', req);
                    // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
                    filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'task');
                }
                else {
                    logger_1.logger.warn(`[getTodosChronological] Filter ${filterId} nicht gefunden`);
                }
            }
            catch (filterError) {
                logger_1.logger.error(`[getTodosChronological] Fehler beim Laden von Filter ${filterId}:`, filterError);
                // Fallback: Versuche ohne Filter weiter
            }
        }
        else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'task', req);
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'task');
        }
        // ✅ PHASE 4: Extrahiere und konvertiere Zeitraum-Filter für Analytics
        const { timeFilter, remainingFilter } = extractAndConvertTimeFilterForAnalytics(filterWhereClause);
        // Kombiniere taskFilter mit Zeitfilter und Filter-Bedingungen
        // Zeige nur Tasks, die im Zeitraum erstellt, Status-Änderungen hatten oder gelöscht wurden
        // NICHT: Tasks, die nur andere Updates hatten (z.B. Titel geändert)
        const whereArray = [taskFilter];
        // ✅ FIX: Nur remainingFilter hinzufügen, wenn es nicht leer ist (Object.keys().length > 0)
        if (remainingFilter && typeof remainingFilter === 'object' && Object.keys(remainingFilter).length > 0) {
            whereArray.push(remainingFilter);
        }
        // Verwende timeFilter falls vorhanden, sonst Fallback auf period/date
        whereArray.push(timeFilter || {
            OR: [
                {
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                {
                    deletedAt: {
                        gte: start,
                        lte: end
                    }
                },
                {
                    statusHistory: {
                        some: {
                            changedAt: {
                                gte: start,
                                lte: end
                            }
                        }
                    }
                }
            ]
        });
        const where = {
            AND: whereArray.filter(Boolean) // Entferne null/undefined Werte
        };
        const tasks = yield prisma_1.prisma.task.findMany({
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
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
                    }
                },
                deletedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der chronologischen To-Dos:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der To-Dos' });
    }
});
exports.getTodosChronological = getTodosChronological;
// Alle Requests chronologisch für ein Datum oder Datumsbereich (Tab 3)
const getRequestsChronological = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date, period, startDate, endDate } = req.query;
        // Filter-Parameter aus Query lesen
        const filterId = req.query.filterId;
        const filterConditions = req.query.filterConditions
            ? JSON.parse(req.query.filterConditions)
            : undefined;
        // Datenisolation
        const requestFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        // Unterstütze sowohl einzelnes Datum als auch Datumsbereich
        let start;
        let end;
        if (period && (period === 'custom' || period === 'week' || period === 'month' || period === 'year' || period === 'today')) {
            // Neues Format: Datumsbereich
            const dateRange = (0, dateHelpers_1.getDateRange)(period, startDate, endDate);
            start = dateRange.start;
            end = dateRange.end;
        }
        else if (date && typeof date === 'string') {
            // Altes Format: Einzelnes Datum (Rückwärtskompatibilität)
            const selectedDate = (0, date_fns_1.parseISO)(date);
            start = (0, date_fns_1.startOfDay)(selectedDate);
            end = (0, date_fns_1.endOfDay)(selectedDate);
        }
        else {
            return res.status(400).json({ error: 'Datum oder Datumsbereich erforderlich' });
        }
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
                    logger_1.logger.warn(`[getRequestsChronological] Filter ${filterId} nicht gefunden`);
                }
            }
            catch (filterError) {
                logger_1.logger.error(`[getRequestsChronological] Fehler beim Laden von Filter ${filterId}:`, filterError);
                // Fallback: Versuche ohne Filter weiter
            }
        }
        else if (filterConditions) {
            // Direkte Filter-Bedingungen
            filterWhereClause = (0, filterToPrisma_1.convertFilterConditionsToPrismaWhere)(filterConditions.conditions || filterConditions, filterConditions.operators || [], 'request', req);
            // ✅ SICHERHEIT: Validiere Filter gegen Datenisolation
            filterWhereClause = (0, filterToPrisma_1.validateFilterAgainstIsolation)(filterWhereClause, req, 'request');
        }
        // ✅ PHASE 4: Extrahiere und konvertiere Zeitraum-Filter für Analytics
        const { timeFilter, remainingFilter } = extractAndConvertTimeFilterForAnalytics(filterWhereClause);
        // Kombiniere requestFilter mit Zeitfilter und Filter-Bedingungen
        // Zeige nur Requests, die im Zeitraum erstellt, Status-Änderungen hatten oder gelöscht wurden
        // NICHT: Requests, die nur andere Updates hatten (z.B. Titel geändert)
        const whereArray = [requestFilter];
        // ✅ FIX: Nur remainingFilter hinzufügen, wenn es nicht leer ist (Object.keys().length > 0)
        if (remainingFilter && typeof remainingFilter === 'object' && Object.keys(remainingFilter).length > 0) {
            whereArray.push(remainingFilter);
        }
        // Verwende timeFilter falls vorhanden, sonst Fallback auf period/date
        whereArray.push(timeFilter || {
            OR: [
                {
                    createdAt: {
                        gte: start,
                        lte: end
                    }
                },
                {
                    deletedAt: {
                        gte: start,
                        lte: end
                    }
                },
                {
                    statusHistory: {
                        some: {
                            changedAt: {
                                gte: start,
                                lte: end
                            }
                        }
                    }
                }
            ]
        });
        const where = {
            AND: whereArray.filter(Boolean) // Entferne null/undefined Werte
        };
        const requests = yield prisma_1.prisma.request.findMany({
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
                deletedBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        username: true
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
                createdAt: 'desc'
            }
        });
        res.json(requests);
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der chronologischen Requests:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Requests' });
    }
});
exports.getRequestsChronological = getRequestsChronological;
// Häufigkeitsanalyse für To-Dos (Tab 2)
const getTodosFrequencyAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const currentUserId = req.userId;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }
        // Datenisolation
        const taskFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        // Erstelle Filter für TaskStatusHistory (basierend auf Task-Filter)
        // Da TaskStatusHistory taskId referenziert, müssen wir über Tasks filtern
        const taskIdsForHistory = yield prisma_1.prisma.task.findMany({
            where: taskFilter,
            select: { id: true }
        });
        const allowedTaskIds = taskIdsForHistory.map(t => t.id);
        const selectedDate = (0, date_fns_1.parseISO)(date);
        const start = (0, date_fns_1.startOfDay)(selectedDate);
        const end = (0, date_fns_1.endOfDay)(selectedDate);
        // 1. Erledigungsrate pro User
        const userCompletionStats = yield prisma_1.prisma.taskStatusHistory.groupBy({
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
        const users = yield prisma_1.prisma.user.findMany({
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
        const taskCompletionStats = yield prisma_1.prisma.taskStatusHistory.groupBy({
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
        const tasks = yield prisma_1.prisma.task.findMany({
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
        const statusTimeStats = {};
        // Lade alle Status-Änderungen für das Datum
        const allStatusChanges = yield prisma_1.prisma.taskStatusHistory.findMany({
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
        const taskStatusDurations = {};
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
        const statusAverages = {};
        Object.keys(client_1.TaskStatus).forEach(status => {
            const allDurations = [];
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Häufigkeitsanalyse:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Häufigkeitsanalyse' });
    }
});
exports.getTodosFrequencyAnalysis = getTodosFrequencyAnalysis;
// Schicht-basierte Analysen für To-Dos (Tab 2)
const getTodosShiftAnalysis = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        const currentUserId = req.userId;
        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Datum erforderlich' });
        }
        // Datenisolation
        const taskFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        const userFilter = (0, organization_1.getUserOrganizationFilter)(req);
        const workTimeFilter = (0, organization_1.getDataIsolationFilter)(req, 'workTime');
        const selectedDate = (0, date_fns_1.parseISO)(date);
        const start = (0, date_fns_1.startOfDay)(selectedDate);
        const end = (0, date_fns_1.endOfDay)(selectedDate);
        // 1. Alle WorkTimes (Schichten) für das Datum mit verknüpften Tasks
        const workTimes = yield prisma_1.prisma.workTime.findMany({
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
            }, {});
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
        const taskShiftMap = {};
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
            const totalMinutes = item.shifts.reduce((sum, shift) => sum + (shift.durationMinutes || 0), 0);
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
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Schicht-Analyse:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Schicht-Analyse' });
    }
});
exports.getTodosShiftAnalysis = getTodosShiftAnalysis;
// User-zentriert: Tasks
const getUserTasksActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ PAGINATION: Query-Parameter
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const period = req.query.period || 'today';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : undefined;
        const { start, end } = (0, dateHelpers_1.getDateRange)(period, startDate, endDate);
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        // ✅ PERFORMANCE: Nur benötigte Felder selektieren (keine Attachments!)
        const tasks = yield prisma_1.prisma.task.findMany({
            where: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, isolationFilter), (0, prisma_1.getNotDeletedFilter)()), { createdAt: { gte: start, lte: end } }), (userId ? { createdById: userId } : {})), (branchId ? { branchId: branchId } : {})),
            select: {
                id: true,
                title: true,
                createdAt: true,
                createdById: true,
                deletedAt: true,
                deletedById: true,
                _count: {
                    select: { attachments: true }
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true }
                },
                deletedBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });
        // Status-Änderungen für diese Tasks
        const taskIds = tasks.map(t => t.id);
        const statusChanges = yield prisma_1.prisma.taskStatusHistory.findMany({
            where: {
                taskId: { in: taskIds },
                changedAt: { gte: start, lte: end }
            },
            select: {
                taskId: true,
                userId: true,
                oldStatus: true,
                newStatus: true,
                changedAt: true,
                user: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { changedAt: 'desc' }
        });
        const totalCount = yield prisma_1.prisma.task.count({
            where: Object.assign(Object.assign(Object.assign({}, isolationFilter), (0, prisma_1.getNotDeletedFilter)()), { createdAt: { gte: start, lte: end } })
        });
        // Gruppiere nach User
        const userActivity = {};
        tasks.forEach(task => {
            if (task.createdById) {
                if (!userActivity[task.createdById]) {
                    userActivity[task.createdById] = {
                        user: task.createdBy,
                        tasksCreated: [],
                        tasksDeleted: [],
                        statusChanges: []
                    };
                }
                userActivity[task.createdById].tasksCreated.push(task);
            }
            if (task.deletedAt && task.deletedById) {
                if (!userActivity[task.deletedById]) {
                    userActivity[task.deletedById] = {
                        user: task.deletedBy,
                        tasksCreated: [],
                        tasksDeleted: [],
                        statusChanges: []
                    };
                }
                userActivity[task.deletedById].tasksDeleted.push(task);
            }
        });
        statusChanges.forEach(change => {
            if (!userActivity[change.userId]) {
                userActivity[change.userId] = {
                    user: change.user,
                    tasksCreated: [],
                    tasksDeleted: [],
                    statusChanges: []
                };
            }
            userActivity[change.userId].statusChanges.push(change);
        });
        res.json({
            data: Object.values(userActivity),
            totalCount,
            hasMore: offset + tasks.length < totalCount
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der User Tasks Aktivität:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der User Tasks Aktivität' });
    }
});
exports.getUserTasksActivity = getUserTasksActivity;
// User-zentriert: Requests
const getUserRequestsActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ PAGINATION: Query-Parameter
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const period = req.query.period || 'today';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : undefined;
        const { start, end } = (0, dateHelpers_1.getDateRange)(period, startDate, endDate);
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        // ✅ PERFORMANCE: Nur benötigte Felder selektieren (keine Attachments!)
        const requests = yield prisma_1.prisma.request.findMany({
            where: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, isolationFilter), (0, prisma_1.getNotDeletedFilter)()), { createdAt: { gte: start, lte: end } }), (userId ? { requesterId: userId } : {})), (branchId ? { branchId: branchId } : {})),
            select: {
                id: true,
                title: true,
                createdAt: true,
                requesterId: true,
                deletedAt: true,
                deletedById: true,
                _count: {
                    select: { attachments: true }
                },
                requester: {
                    select: { id: true, firstName: true, lastName: true }
                },
                deletedBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });
        // Status-Änderungen für diese Requests
        const requestIds = requests.map(r => r.id);
        const statusChanges = yield prisma_1.prisma.requestStatusHistory.findMany({
            where: {
                requestId: { in: requestIds },
                changedAt: { gte: start, lte: end }
            },
            select: {
                requestId: true,
                userId: true,
                oldStatus: true,
                newStatus: true,
                changedAt: true,
                user: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { changedAt: 'desc' }
        });
        const totalCount = yield prisma_1.prisma.request.count({
            where: Object.assign(Object.assign(Object.assign({}, isolationFilter), (0, prisma_1.getNotDeletedFilter)()), { createdAt: { gte: start, lte: end } })
        });
        // Gruppiere nach User
        const userActivity = {};
        requests.forEach(request => {
            if (request.requesterId) {
                if (!userActivity[request.requesterId]) {
                    userActivity[request.requesterId] = {
                        user: request.requester,
                        requestsCreated: [],
                        requestsDeleted: [],
                        statusChanges: []
                    };
                }
                userActivity[request.requesterId].requestsCreated.push(request);
            }
            if (request.deletedAt && request.deletedById) {
                if (!userActivity[request.deletedById]) {
                    userActivity[request.deletedById] = {
                        user: request.deletedBy,
                        requestsCreated: [],
                        requestsDeleted: [],
                        statusChanges: []
                    };
                }
                userActivity[request.deletedById].requestsDeleted.push(request);
            }
        });
        statusChanges.forEach(change => {
            if (!userActivity[change.userId]) {
                userActivity[change.userId] = {
                    user: change.user,
                    requestsCreated: [],
                    requestsDeleted: [],
                    statusChanges: []
                };
            }
            userActivity[change.userId].statusChanges.push(change);
        });
        res.json({
            data: Object.values(userActivity),
            totalCount,
            hasMore: offset + requests.length < totalCount
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der User Requests Aktivität:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der User Requests Aktivität' });
    }
});
exports.getUserRequestsActivity = getUserRequestsActivity;
// Task-zentriert
const getTasksActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ PAGINATION: Query-Parameter
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const period = req.query.period || 'today';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : undefined;
        const includeDeleted = req.query.includeDeleted === 'true';
        const { start, end } = (0, dateHelpers_1.getDateRange)(period, startDate, endDate);
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'task');
        // ✅ PERFORMANCE: Nur benötigte Felder selektieren (keine Attachments!)
        const tasks = yield prisma_1.prisma.task.findMany({
            where: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, isolationFilter), (includeDeleted ? {} : (0, prisma_1.getNotDeletedFilter)())), { createdAt: { gte: start, lte: end } }), (userId ? { createdById: userId } : {})), (branchId ? { branchId: branchId } : {})),
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                createdById: true,
                deletedAt: true,
                deletedById: true,
                _count: {
                    select: { attachments: true, statusHistory: true }
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true }
                },
                deletedBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });
        // Status-Historie für diese Tasks
        const taskIds = tasks.map(t => t.id);
        const statusHistory = yield prisma_1.prisma.taskStatusHistory.findMany({
            where: {
                taskId: { in: taskIds }
            },
            select: {
                taskId: true,
                userId: true,
                oldStatus: true,
                newStatus: true,
                changedAt: true,
                user: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { changedAt: 'asc' }
        });
        // Gruppiere Status-Historie nach Task
        const statusHistoryByTask = {};
        statusHistory.forEach(change => {
            if (!statusHistoryByTask[change.taskId]) {
                statusHistoryByTask[change.taskId] = [];
            }
            statusHistoryByTask[change.taskId].push(change);
        });
        // Kombiniere Tasks mit Status-Historie
        const tasksWithHistory = tasks.map(task => (Object.assign(Object.assign({}, task), { statusHistory: statusHistoryByTask[task.id] || [] })));
        const totalCount = yield prisma_1.prisma.task.count({
            where: Object.assign(Object.assign(Object.assign({}, isolationFilter), (includeDeleted ? {} : (0, prisma_1.getNotDeletedFilter)())), { createdAt: { gte: start, lte: end } })
        });
        res.json({
            data: tasksWithHistory,
            totalCount,
            hasMore: offset + tasks.length < totalCount
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Tasks Aktivität:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Tasks Aktivität' });
    }
});
exports.getTasksActivity = getTasksActivity;
// Request-zentriert
const getRequestsActivity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // ✅ PAGINATION: Query-Parameter
        const limit = parseInt(req.query.limit, 10) || 50;
        const offset = parseInt(req.query.offset, 10) || 0;
        const period = req.query.period || 'today';
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const userId = req.query.userId ? parseInt(req.query.userId, 10) : undefined;
        const branchId = req.query.branchId ? parseInt(req.query.branchId, 10) : undefined;
        const includeDeleted = req.query.includeDeleted === 'true';
        const { start, end } = (0, dateHelpers_1.getDateRange)(period, startDate, endDate);
        const isolationFilter = (0, organization_1.getDataIsolationFilter)(req, 'request');
        // ✅ PERFORMANCE: Nur benötigte Felder selektieren (keine Attachments!)
        const requests = yield prisma_1.prisma.request.findMany({
            where: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, isolationFilter), (includeDeleted ? {} : (0, prisma_1.getNotDeletedFilter)())), { createdAt: { gte: start, lte: end } }), (userId ? { requesterId: userId } : {})), (branchId ? { branchId: branchId } : {})),
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                requesterId: true,
                deletedAt: true,
                deletedById: true,
                _count: {
                    select: { attachments: true, statusHistory: true }
                },
                requester: {
                    select: { id: true, firstName: true, lastName: true }
                },
                deletedBy: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            take: limit,
            skip: offset,
            orderBy: { createdAt: 'desc' }
        });
        // Status-Historie für diese Requests
        const requestIds = requests.map(r => r.id);
        const statusHistory = yield prisma_1.prisma.requestStatusHistory.findMany({
            where: {
                requestId: { in: requestIds }
            },
            select: {
                requestId: true,
                userId: true,
                oldStatus: true,
                newStatus: true,
                changedAt: true,
                user: {
                    select: { id: true, firstName: true, lastName: true }
                }
            },
            orderBy: { changedAt: 'asc' }
        });
        // Gruppiere Status-Historie nach Request
        const statusHistoryByRequest = {};
        statusHistory.forEach(change => {
            if (!statusHistoryByRequest[change.requestId]) {
                statusHistoryByRequest[change.requestId] = [];
            }
            statusHistoryByRequest[change.requestId].push(change);
        });
        // Kombiniere Requests mit Status-Historie
        const requestsWithHistory = requests.map(request => (Object.assign(Object.assign({}, request), { statusHistory: statusHistoryByRequest[request.id] || [] })));
        const totalCount = yield prisma_1.prisma.request.count({
            where: Object.assign(Object.assign(Object.assign({}, isolationFilter), (includeDeleted ? {} : (0, prisma_1.getNotDeletedFilter)())), { createdAt: { gte: start, lte: end } })
        });
        res.json({
            data: requestsWithHistory,
            totalCount,
            hasMore: offset + requests.length < totalCount
        });
    }
    catch (error) {
        logger_1.logger.error('Fehler beim Abrufen der Requests Aktivität:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Requests Aktivität' });
    }
});
exports.getRequestsActivity = getRequestsActivity;
//# sourceMappingURL=analyticsController.js.map