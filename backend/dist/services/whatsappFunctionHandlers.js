"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.WhatsAppFunctionHandlers = void 0;
const prisma_1 = require("../utils/prisma");
const permissionMiddleware_1 = require("../middleware/permissionMiddleware");
const lobbyPmsService_1 = require("./lobbyPmsService");
const boldPaymentService_1 = require("./boldPaymentService");
const client_1 = require("@prisma/client");
const reservationNotificationService_1 = require("./reservationNotificationService");
const checkInLinkUtils_1 = require("../utils/checkInLinkUtils");
/**
 * WhatsApp Function Handlers
 *
 * Implementiert Funktionen für OpenAI Function Calling.
 * Jede Funktion prüft Berechtigungen und lädt Daten basierend auf User-Rolle.
 */
class WhatsAppFunctionHandlers {
    /**
     * Findet Reservationen mit gleichem Kunden-Namen (Name, Telefonnummer oder Email)
     */
    static findReservationByCustomerName(customerName, customerPhone, customerEmail, branchId, organizationId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const normalizedName = customerName.trim().toLowerCase();
                // Suche nach Name, Telefonnummer oder Email
                const where = {
                    organizationId: organizationId,
                    branchId: branchId,
                    status: {
                        in: [client_1.ReservationStatus.confirmed, client_1.ReservationStatus.notification_sent, client_1.ReservationStatus.checked_in]
                    },
                    OR: []
                };
                // Suche nach Name
                where.OR.push({
                    guestName: {
                        contains: normalizedName,
                        mode: 'insensitive'
                    }
                });
                // Suche nach Telefonnummer (falls vorhanden)
                if (customerPhone) {
                    const { LanguageDetectionService } = yield Promise.resolve().then(() => __importStar(require('./languageDetectionService')));
                    const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(customerPhone);
                    where.OR.push({
                        guestPhone: normalizedPhone
                    });
                }
                // Suche nach Email (falls vorhanden)
                if (customerEmail) {
                    where.OR.push({
                        guestEmail: {
                            equals: customerEmail.trim().toLowerCase(),
                            mode: 'insensitive'
                        }
                    });
                }
                const reservations = yield prisma_1.prisma.reservation.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                    take: 1
                });
                return reservations.length > 0 ? reservations[0] : null;
            }
            catch (error) {
                console.error('[findReservationByCustomerName] Fehler:', error);
                return null;
            }
        });
    }
    /**
     * Parst ein Datum in verschiedenen Formaten
     * Unterstützt: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD/MM, DD.MM
     */
    static parseDate(dateStr) {
        const trimmed = dateStr.trim();
        // Relative Daten (sollten bereits vorher behandelt werden, aber als Fallback)
        if (trimmed === 'today' || trimmed === 'heute' || trimmed === 'hoy') {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            return date;
        }
        if (trimmed === 'tomorrow' || trimmed === 'morgen' || trimmed === 'mañana') {
            const date = new Date();
            date.setDate(date.getDate() + 1);
            date.setHours(0, 0, 0, 0);
            return date;
        }
        if (trimmed === 'day after tomorrow' || trimmed === 'übermorgen' || trimmed === 'pasado mañana') {
            const date = new Date();
            date.setDate(date.getDate() + 2);
            date.setHours(0, 0, 0, 0);
            return date;
        }
        // Format: DD/MM/YYYY oder DD/MM (aktuelles Jahr)
        const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (slashMatch) {
            const day = parseInt(slashMatch[1], 10);
            const month = parseInt(slashMatch[2], 10) - 1; // Monate sind 0-indexiert
            const yearStr = slashMatch[3];
            let year;
            if (yearStr) {
                year = parseInt(yearStr, 10);
                // Wenn Jahr 2-stellig, interpretiere als 20XX
                if (year < 100) {
                    year = 2000 + year;
                }
            }
            else {
                // Kein Jahr angegeben → aktuelles Jahr
                year = new Date().getFullYear();
            }
            return new Date(year, month, day);
        }
        // Format: DD.MM.YYYY oder DD.MM (aktuelles Jahr)
        const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
        if (dotMatch) {
            const day = parseInt(dotMatch[1], 10);
            const month = parseInt(dotMatch[2], 10) - 1;
            const yearStr = dotMatch[3];
            let year;
            if (yearStr) {
                year = parseInt(yearStr, 10);
                if (year < 100) {
                    year = 2000 + year;
                }
            }
            else {
                year = new Date().getFullYear();
            }
            return new Date(year, month, day);
        }
        // Format: DD-MM-YYYY oder DD-MM (aktuelles Jahr)
        const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/);
        if (dashMatch) {
            const day = parseInt(dashMatch[1], 10);
            const month = parseInt(dashMatch[2], 10) - 1;
            const yearStr = dashMatch[3];
            let year;
            if (yearStr) {
                year = parseInt(yearStr, 10);
                if (year < 100) {
                    year = 2000 + year;
                }
            }
            else {
                year = new Date().getFullYear();
            }
            return new Date(year, month, day);
        }
        // Format: YYYY-MM-DD (ISO)
        const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (isoMatch) {
            const year = parseInt(isoMatch[1], 10);
            const month = parseInt(isoMatch[2], 10) - 1;
            const day = parseInt(isoMatch[3], 10);
            return new Date(year, month, day);
        }
        // Fallback: Standard Date-Parsing
        return new Date(trimmed);
    }
    /**
     * Holt Requests (Solicitudes) für einen User
     */
    static get_requests(args, userId, roleId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Prüfe ob roleId vorhanden ist
                if (!roleId) {
                    throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
                }
                // 2. Prüfe Berechtigung
                const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'table_requests', 'read', 'table');
                if (!hasPermission) {
                    throw new Error('Keine Berechtigung für Requests');
                }
                // 2. Parse Arguments
                const status = args.status;
                const dueDate = args.dueDate === 'today'
                    ? new Date()
                    : args.dueDate ? new Date(args.dueDate) : undefined;
                const targetUserId = args.userId || userId;
                // 3. Baue Where-Clause
                const where = {
                    branchId: branchId,
                    OR: [
                        { requesterId: targetUserId },
                        { responsibleId: targetUserId }
                    ]
                };
                if (status) {
                    where.status = status;
                }
                if (dueDate) {
                    // Für "today": Filtere nach Datum (ohne Zeit)
                    if (args.dueDate === 'today') {
                        const todayStart = new Date(dueDate);
                        todayStart.setHours(0, 0, 0, 0);
                        const todayEnd = new Date(dueDate);
                        todayEnd.setHours(23, 59, 59, 999);
                        where.dueDate = {
                            gte: todayStart,
                            lte: todayEnd
                        };
                    }
                    else {
                        where.dueDate = dueDate;
                    }
                }
                // 4. Lade Daten
                const requests = yield prisma_1.prisma.request.findMany({
                    where,
                    include: {
                        requester: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        },
                        responsible: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                });
                // 5. Formatiere für KI
                return requests.map(r => {
                    var _a;
                    return ({
                        id: r.id,
                        title: r.title,
                        description: r.description || '',
                        status: r.status,
                        type: r.type,
                        dueDate: ((_a = r.dueDate) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0]) || null,
                        requester: `${r.requester.firstName} ${r.requester.lastName}`,
                        responsible: r.responsible ? `${r.responsible.firstName} ${r.responsible.lastName}` : null,
                        createdAt: r.createdAt.toISOString().split('T')[0]
                    });
                });
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_requests Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Holt Todos/Tasks für einen User
     */
    static get_todos(args, userId, roleId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Prüfe ob roleId vorhanden ist
                if (!roleId) {
                    throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
                }
                // 2. Prüfe Berechtigung
                const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'table_tasks', 'read', 'table');
                if (!hasPermission) {
                    throw new Error('Keine Berechtigung für Tasks');
                }
                // 2. Parse Arguments
                const status = args.status;
                const dueDate = args.dueDate === 'today'
                    ? new Date()
                    : args.dueDate ? new Date(args.dueDate) : undefined;
                const targetUserId = args.userId || userId;
                // 3. Baue Where-Clause
                const where = {
                    branchId: branchId,
                    OR: [
                        { responsibleId: targetUserId },
                        { qualityControlId: targetUserId }
                    ]
                };
                if (status) {
                    where.status = status;
                }
                if (dueDate) {
                    if (args.dueDate === 'today') {
                        const todayStart = new Date(dueDate);
                        todayStart.setHours(0, 0, 0, 0);
                        const todayEnd = new Date(dueDate);
                        todayEnd.setHours(23, 59, 59, 999);
                        where.dueDate = {
                            gte: todayStart,
                            lte: todayEnd
                        };
                    }
                    else {
                        where.dueDate = dueDate;
                    }
                }
                // 4. Lade Daten
                const tasks = yield prisma_1.prisma.task.findMany({
                    where,
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
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                });
                // 5. Formatiere für KI
                return tasks.map(t => {
                    var _a;
                    return ({
                        id: t.id,
                        title: t.title,
                        description: t.description || '',
                        status: t.status,
                        dueDate: ((_a = t.dueDate) === null || _a === void 0 ? void 0 : _a.toISOString().split('T')[0]) || null,
                        responsible: t.responsible ? `${t.responsible.firstName} ${t.responsible.lastName}` : null,
                        qualityControl: `${t.qualityControl.firstName} ${t.qualityControl.lastName}`,
                        createdAt: t.createdAt.toISOString().split('T')[0]
                    });
                });
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_todos Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Holt Arbeitszeiten für einen User
     */
    static get_worktime(args, userId, roleId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Prüfe ob roleId vorhanden ist
                if (!roleId) {
                    throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
                }
                // 2. Prüfe Berechtigung
                const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'page_worktracker', 'read', 'page');
                if (!hasPermission) {
                    throw new Error('Keine Berechtigung für Arbeitszeiten');
                }
                // 2. Parse Arguments
                const targetUserId = args.userId || userId;
                let date;
                let startDate;
                let endDate;
                if (args.date === 'today') {
                    date = new Date();
                    date.setHours(0, 0, 0, 0);
                }
                else if (args.date) {
                    date = new Date(args.date);
                    date.setHours(0, 0, 0, 0);
                }
                if (args.startDate) {
                    startDate = new Date(args.startDate);
                    startDate.setHours(0, 0, 0, 0);
                }
                if (args.endDate) {
                    endDate = new Date(args.endDate);
                    endDate.setHours(23, 59, 59, 999);
                }
                // 3. Baue Where-Clause
                const where = {
                    userId: targetUserId,
                    branchId: branchId
                };
                if (date) {
                    // Einzelnes Datum
                    const dayStart = new Date(date);
                    dayStart.setHours(0, 0, 0, 0);
                    const dayEnd = new Date(date);
                    dayEnd.setHours(23, 59, 59, 999);
                    where.startTime = {
                        gte: dayStart,
                        lte: dayEnd
                    };
                }
                else if (startDate && endDate) {
                    // Zeitraum
                    where.startTime = {
                        gte: startDate,
                        lte: endDate
                    };
                }
                else if (!date && !startDate && !endDate) {
                    // Aktuelle Arbeitszeit (endTime ist null)
                    where.endTime = null;
                }
                // 4. Lade Daten
                const worktimes = yield prisma_1.prisma.workTime.findMany({
                    where,
                    orderBy: { startTime: 'desc' },
                    take: 50
                });
                // 5. Berechne Gesamtzeit
                let totalMinutes = 0;
                worktimes.forEach(wt => {
                    if (wt.endTime) {
                        const diff = wt.endTime.getTime() - wt.startTime.getTime();
                        totalMinutes += Math.floor(diff / 1000 / 60);
                    }
                    else {
                        // Aktive Arbeitszeit
                        const diff = Date.now() - wt.startTime.getTime();
                        totalMinutes += Math.floor(diff / 1000 / 60);
                    }
                });
                const totalHours = Math.floor(totalMinutes / 60);
                const remainingMinutes = totalMinutes % 60;
                // 6. Formatiere für KI
                return {
                    totalHours,
                    totalMinutes: remainingMinutes,
                    entries: worktimes.map(wt => {
                        var _a;
                        return ({
                            id: wt.id,
                            startTime: wt.startTime.toISOString(),
                            endTime: ((_a = wt.endTime) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                            isActive: !wt.endTime,
                            duration: wt.endTime
                                ? Math.floor((wt.endTime.getTime() - wt.startTime.getTime()) / 1000 / 60)
                                : Math.floor((Date.now() - wt.startTime.getTime()) / 1000 / 60)
                        });
                    }),
                    count: worktimes.length
                };
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_worktime Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Holt Cerebro-Artikel basierend auf Suchbegriffen
     */
    static get_cerebro_articles(args, userId, roleId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Prüfe ob roleId vorhanden ist
                if (!roleId) {
                    throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
                }
                // 2. Prüfe Berechtigung
                const hasPermission = yield (0, permissionMiddleware_1.checkUserPermission)(userId, roleId, 'cerebro', 'read', 'cerebro');
                if (!hasPermission) {
                    throw new Error('Keine Berechtigung für Cerebro-Artikel');
                }
                // 2. Parse Arguments
                const searchTerm = args.searchTerm;
                const tags = args.tags || [];
                const limit = args.limit || 10;
                // 3. Baue Where-Clause
                const where = {
                    isPublished: true
                };
                if (searchTerm || tags.length > 0) {
                    const orConditions = [];
                    if (searchTerm) {
                        orConditions.push({
                            title: {
                                contains: searchTerm,
                                mode: 'insensitive'
                            }
                        }, {
                            content: {
                                contains: searchTerm,
                                mode: 'insensitive'
                            }
                        });
                    }
                    if (tags.length > 0) {
                        orConditions.push({
                            tags: {
                                some: {
                                    name: {
                                        in: tags,
                                        mode: 'insensitive'
                                    }
                                }
                            }
                        });
                    }
                    where.OR = orConditions;
                }
                // 4. Lade Daten
                const articles = yield prisma_1.prisma.cerebroCarticle.findMany({
                    where,
                    include: {
                        tags: {
                            select: {
                                name: true
                            }
                        },
                        createdBy: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: { updatedAt: 'desc' },
                    take: limit
                });
                // 5. Formatiere für KI
                return articles.map(a => ({
                    id: a.id,
                    title: a.title,
                    slug: a.slug,
                    content: a.content ? a.content.substring(0, 500) : '', // Erste 500 Zeichen
                    tags: a.tags.map(t => t.name),
                    createdBy: `${a.createdBy.firstName} ${a.createdBy.lastName}`,
                    createdAt: a.createdAt.toISOString().split('T')[0],
                    updatedAt: a.updatedAt.toISOString().split('T')[0]
                }));
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_cerebro_articles Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Holt User-Informationen
     */
    static get_user_info(args, userId, roleId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Parse Arguments
                const targetUserId = args.userId || userId;
                // 2. Prüfe ob User eigene Daten abruft oder andere
                if (targetUserId !== userId) {
                    // TODO: Prüfe ob User Berechtigung hat, andere User-Daten zu sehen
                    // Für jetzt: Nur eigene Daten erlauben
                    throw new Error('Nur eigene User-Informationen können abgerufen werden');
                }
                // 3. Lade User-Daten
                const user = yield prisma_1.prisma.user.findUnique({
                    where: { id: targetUserId },
                    include: {
                        roles: {
                            include: {
                                role: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                });
                if (!user) {
                    throw new Error('User nicht gefunden');
                }
                // 4. Formatiere für KI
                return {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    roles: user.roles.map(ur => ({
                        id: ur.role.id,
                        name: ur.role.name
                    }))
                };
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_user_info Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Prüft Zimmerverfügbarkeit für einen Zeitraum
     */
    static check_room_availability(args, userId, roleId, branchId, conversationId // Optional: Conversation ID für Context-Speicherung
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 1. Parse Datum (unterstützt "today"/"heute"/"hoy"/"morgen"/"tomorrow"/"mañana")
                let startDate;
                const startDateStr = args.startDate.toLowerCase().trim();
                if (startDateStr === 'today' || startDateStr === 'heute' || startDateStr === 'hoy') {
                    startDate = new Date();
                    startDate.setHours(0, 0, 0, 0); // Setze auf Mitternacht
                }
                else if (startDateStr === 'tomorrow' || startDateStr === 'morgen' || startDateStr === 'mañana') {
                    startDate = new Date();
                    startDate.setDate(startDate.getDate() + 1);
                    startDate.setHours(0, 0, 0, 0);
                }
                else {
                    startDate = new Date(args.startDate);
                    if (isNaN(startDate.getTime())) {
                        throw new Error(`Ungültiges Startdatum: ${args.startDate}. Format: YYYY-MM-DD, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                    }
                }
                let endDate;
                if (args.endDate) {
                    const endDateStr = args.endDate.toLowerCase().trim();
                    if (endDateStr === 'today' || endDateStr === 'heute' || endDateStr === 'hoy') {
                        endDate = new Date();
                        endDate.setHours(23, 59, 59, 999); // Setze auf Ende des Tages
                    }
                    else if (endDateStr === 'tomorrow' || endDateStr === 'morgen' || endDateStr === 'mañana') {
                        endDate = new Date();
                        endDate.setDate(endDate.getDate() + 1);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    else {
                        endDate = new Date(args.endDate);
                        if (isNaN(endDate.getTime())) {
                            throw new Error(`Ungültiges Enddatum: ${args.endDate}. Format: YYYY-MM-DD, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                        }
                    }
                }
                else {
                    // WICHTIG: Wenn User nur "heute" sagt, zeige nur heute (nicht heute + morgen)
                    // Wenn User "morgen" sagt, zeige nur morgen
                    // Nur wenn User ein konkretes Datum angibt, füge +1 Tag hinzu
                    if (startDateStr === 'today' || startDateStr === 'heute' || startDateStr === 'hoy') {
                        // User fragt nur nach "heute" → zeige nur heute
                        endDate = new Date(startDate);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    else if (startDateStr === 'tomorrow' || startDateStr === 'morgen' || startDateStr === 'mañana') {
                        // User fragt nur nach "morgen" → zeige nur morgen
                        endDate = new Date(startDate);
                        endDate.setHours(23, 59, 59, 999);
                    }
                    else {
                        // User gibt konkretes Datum an → füge +1 Tag hinzu (für Check-out)
                        endDate = new Date(startDate);
                        endDate.setDate(endDate.getDate() + 1);
                    }
                }
                // 2. Prüfe Datum-Logik
                // WICHTIG: Erlaube endDate = startDate (gleicher Tag, z.B. "heute")
                if (endDate < startDate) {
                    throw new Error('Enddatum muss nach oder gleich Startdatum liegen');
                }
                // 3. Performance: Prüfe Zeitraum-Limit (max. 30 Tage)
                const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff > 30) {
                    throw new Error(`Zeitraum zu lang: ${daysDiff} Tage. Maximum: 30 Tage.`);
                }
                // 3. Verwende branchId aus args oder Context
                const targetBranchId = args.branchId || branchId;
                // 4. Erstelle LobbyPMS Service
                const service = yield lobbyPmsService_1.LobbyPmsService.createForBranch(targetBranchId);
                // 5. Rufe Verfügbarkeits-API auf
                const availability = yield service.checkAvailability(startDate, endDate);
                // Debug: Logge alle gefundenen Kategorien
                const uniqueCategories = new Set(availability.map(item => `${item.categoryId}:${item.roomName}`));
                console.log(`[WhatsApp Function Handlers] check_room_availability: ${availability.length} Einträge, ${uniqueCategories.size} eindeutige Kategorien`);
                for (const cat of uniqueCategories) {
                    console.log(`[WhatsApp Function Handlers]   - ${cat}`);
                }
                // Debug: Logge spezifisch "apartamento doble" und "primo deportista" falls vorhanden
                const apartamentoDoble = availability.filter(item => {
                    var _a, _b;
                    return ((_a = item.roomName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('apartamento doble')) ||
                        ((_b = item.roomName) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes('primo deportista'));
                });
                if (apartamentoDoble.length > 0) {
                    console.log(`[WhatsApp Function Handlers] ⚠️ Apartamento doble / Primo deportista gefunden: ${apartamentoDoble.length} Einträge`);
                    apartamentoDoble.forEach(item => {
                        console.log(`[WhatsApp Function Handlers]   - ${item.categoryId}: ${item.roomName}, roomType: ${item.roomType}, availableRooms: ${item.availableRooms}, date: ${item.date}`);
                    });
                }
                else {
                    console.log(`[WhatsApp Function Handlers] ⚠️ Apartamento doble / Primo deportista NICHT in API-Response gefunden!`);
                }
                // 6. Filtere nach roomType falls angegeben
                let filteredAvailability = availability;
                if (args.roomType) {
                    filteredAvailability = availability.filter(item => item.roomType === args.roomType);
                }
                // 7. Gruppiere nach Zimmer (über alle Daten hinweg)
                const roomMap = new Map();
                for (const item of filteredAvailability) {
                    if (!roomMap.has(item.categoryId)) {
                        roomMap.set(item.categoryId, {
                            categoryId: item.categoryId,
                            roomName: item.roomName,
                            roomType: item.roomType,
                            minAvailableRooms: item.availableRooms,
                            maxAvailableRooms: item.availableRooms,
                            pricePerNight: item.pricePerNight,
                            currency: item.currency,
                            prices: item.prices,
                            dates: []
                        });
                    }
                    const room = roomMap.get(item.categoryId);
                    room.minAvailableRooms = Math.min(room.minAvailableRooms, item.availableRooms);
                    room.maxAvailableRooms = Math.max(room.maxAvailableRooms, item.availableRooms);
                    room.dates.push({
                        date: item.date,
                        availableRooms: item.availableRooms
                    });
                }
                // 8. Formatiere für KI
                // Prüfe ob nur ein Tag abgefragt wird (gleicher Tag)
                const isSingleDay = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0];
                // WICHTIG: Zeige Zimmer auch wenn minAvailableRooms = 0, aber maxAvailableRooms > 0 (verfügbar an mindestens einem Tag)
                const rooms = Array.from(roomMap.values())
                    .filter(room => room.maxAvailableRooms > 0) // Filtere nur wenn mindestens an einem Tag verfügbar
                    .map(room => {
                    // WICHTIG: Wenn nur ein Tag abgefragt wird, zeige die Verfügbarkeit für diesen Tag (nicht maxAvailableRooms)
                    // Wenn mehrere Tage abgefragt werden, zeige minAvailableRooms (garantiert verfügbar) oder maxAvailableRooms (verfügbar an mindestens einem Tag)
                    let availableRooms;
                    if (isSingleDay) {
                        // Nur ein Tag: Zeige die Verfügbarkeit für diesen Tag (sollte minAvailableRooms = maxAvailableRooms sein)
                        availableRooms = room.minAvailableRooms;
                    }
                    else {
                        // Mehrere Tage: Zeige minAvailableRooms wenn > 0, sonst maxAvailableRooms (verfügbar an mindestens einem Tag)
                        availableRooms = room.minAvailableRooms > 0 ? room.minAvailableRooms : room.maxAvailableRooms;
                    }
                    return {
                        categoryId: room.categoryId,
                        name: room.roomName,
                        type: room.roomType,
                        availableRooms: availableRooms, // Zeige maxAvailableRooms wenn minAvailableRooms = 0
                        minAvailableRooms: room.minAvailableRooms, // Für Info: Minimum über alle Daten
                        maxAvailableRooms: room.maxAvailableRooms, // Für Info: Maximum über alle Daten
                        pricePerNight: room.pricePerNight,
                        currency: room.currency,
                        // WICHTIG: Terminologie - compartida = Betten, privada = Zimmer
                        unit: room.roomType === 'compartida' ? 'beds' : 'rooms', // Für KI: "beds" bei compartida, "rooms" bei privada
                        prices: room.prices.map(p => ({
                            people: p.people,
                            price: p.value
                        })),
                        availability: room.dates.map(d => ({
                            date: d.date,
                            availableRooms: d.availableRooms
                        }))
                    };
                });
                // Debug: Logge alle formatierten Zimmer
                console.log(`[WhatsApp Function Handlers] check_room_availability: ${rooms.length} Zimmer formatiert`);
                for (const room of rooms) {
                    console.log(`[WhatsApp Function Handlers]   - ${room.name} (${room.type}): ${room.availableRooms} verfügbar, ${room.pricePerNight.toLocaleString('de-CH')} COP`);
                }
                // Speichere Context in Conversation (falls conversationId vorhanden)
                if (conversationId) {
                    try {
                        const conversation = yield prisma_1.prisma.whatsAppConversation.findUnique({
                            where: { id: conversationId },
                            select: { context: true }
                        });
                        if (conversation) {
                            const context = conversation.context || {};
                            const bookingContext = context.booking || {};
                            // Aktualisiere Context mit Verfügbarkeitsprüfung
                            const updatedContext = Object.assign(Object.assign({}, bookingContext), { checkInDate: args.startDate, checkOutDate: args.endDate || (startDateStr === 'tomorrow' || startDateStr === 'morgen' || startDateStr === 'mañana'
                                    ? 'day after tomorrow'
                                    : undefined), roomType: args.roomType || bookingContext.roomType, lastAvailabilityCheck: {
                                    startDate: args.startDate,
                                    endDate: endDate.toISOString().split('T')[0],
                                    rooms: rooms.map(room => ({
                                        categoryId: room.categoryId,
                                        name: room.name,
                                        type: room.type,
                                        availableRooms: room.availableRooms
                                    }))
                                } });
                            yield prisma_1.prisma.whatsAppConversation.update({
                                where: { id: conversationId },
                                data: {
                                    context: Object.assign(Object.assign({}, context), { booking: updatedContext })
                                }
                            });
                            console.log('[check_room_availability] Context aktualisiert:', {
                                checkInDate: updatedContext.checkInDate,
                                checkOutDate: updatedContext.checkOutDate,
                                roomType: updatedContext.roomType
                            });
                        }
                    }
                    catch (contextError) {
                        console.error('[check_room_availability] Fehler beim Speichern des Contexts:', contextError);
                        // Nicht abbrechen, nur loggen
                    }
                }
                return {
                    startDate: args.startDate,
                    endDate: endDate.toISOString().split('T')[0],
                    roomType: args.roomType || 'all',
                    totalRooms: rooms.length,
                    rooms: rooms.map(room => {
                        // WICHTIG: Verwende availableRooms (bereits korrigiert: maxAvailableRooms wenn minAvailableRooms = 0)
                        const availableCount = room.availableRooms;
                        return Object.assign(Object.assign({}, room), { 
                            // WICHTIG: Füge explizite Terminologie-Hinweise hinzu für KI
                            description: room.type === 'compartida'
                                ? `${room.name}: ${availableCount} ${availableCount === 1 ? 'Bett' : 'Betten'} verfügbar (Dorm-Zimmer)`
                                : `${room.name}: ${availableCount} ${availableCount === 1 ? 'Zimmer' : 'Zimmer'} verfügbar (privates Zimmer)` });
                    })
                };
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] check_room_availability Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Holt verfügbare Touren
     */
    static get_tours(args, userId, roleId, branchId, conversationId // Optional: Conversation ID für Context-Speicherung
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Filter: isActive = true, availableFrom <= heute <= availableTo
                const where = {
                    isActive: true,
                    OR: [
                        { branchId: branchId },
                        { branchId: null } // Touren ohne Branch (für alle Branches)
                    ]
                };
                // Datum-Filter (optional)
                const now = new Date();
                if (args.availableFrom) {
                    where.availableFrom = { lte: new Date(args.availableFrom) };
                }
                else {
                    // Standard: Nur Touren die bereits verfügbar sind
                    where.OR = [
                        { availableFrom: { lte: now } },
                        { availableFrom: null }
                    ];
                }
                if (args.availableTo) {
                    where.availableTo = { gte: new Date(args.availableTo) };
                }
                else {
                    // Standard: Nur Touren die noch verfügbar sind
                    where.AND = [
                        {
                            OR: [
                                { availableTo: { gte: now } },
                                { availableTo: null }
                            ]
                        }
                    ];
                }
                // Typ-Filter (optional)
                if (args.type) {
                    where.type = args.type; // 'own' oder 'external'
                }
                const tours = yield prisma_1.prisma.tour.findMany({
                    where,
                    include: {
                        branch: {
                            select: { id: true, name: true }
                        },
                        organization: {
                            select: { id: true }
                        }
                    },
                    orderBy: { title: 'asc' },
                    take: args.limit || 20
                });
                const formattedTours = tours.map(t => ({
                    id: t.id,
                    title: t.title,
                    description: t.description || '',
                    type: t.type,
                    price: t.price ? Number(t.price) : null,
                    currency: t.currency || 'COP',
                    duration: t.duration,
                    maxParticipants: t.maxParticipants,
                    minParticipants: t.minParticipants,
                    location: t.location,
                    meetingPoint: t.meetingPoint,
                    imageUrl: t.imageUrl,
                    hasGallery: !!t.galleryUrls && Array.isArray(t.galleryUrls) && t.galleryUrls.length > 0
                }));
                // Speichere Context in Conversation (falls conversationId vorhanden)
                if (conversationId) {
                    try {
                        const conversation = yield prisma_1.prisma.whatsAppConversation.findUnique({
                            where: { id: conversationId },
                            select: { context: true }
                        });
                        if (conversation) {
                            const context = conversation.context || {};
                            const tourContext = context.tour || {};
                            // Aktualisiere Context mit Tour-Liste
                            const updatedContext = Object.assign(Object.assign({}, tourContext), { lastToursList: formattedTours.map(t => ({
                                    id: t.id,
                                    title: t.title,
                                    price: t.price,
                                    location: t.location
                                })), lastToursCheckAt: new Date().toISOString() });
                            yield prisma_1.prisma.whatsAppConversation.update({
                                where: { id: conversationId },
                                data: {
                                    context: Object.assign(Object.assign({}, context), { tour: updatedContext })
                                }
                            });
                            console.log('[get_tours] Context aktualisiert:', {
                                toursCount: formattedTours.length
                            });
                        }
                    }
                    catch (contextError) {
                        console.error('[get_tours] Fehler beim Speichern des Contexts:', contextError);
                        // Nicht abbrechen, nur loggen
                    }
                }
                return formattedTours;
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_tours Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Holt Details einer Tour (inkl. Bilder-URLs)
     */
    static get_tour_details(args, userId, roleId, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                if (!args.tourId) {
                    throw new Error('tourId ist erforderlich');
                }
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: parseInt(args.tourId, 10) },
                    include: {
                        branch: {
                            select: { id: true, name: true }
                        },
                        externalProvider: {
                            select: { id: true, name: true, phone: true }
                        }
                    }
                });
                if (!tour) {
                    throw new Error('Tour nicht gefunden');
                }
                // Parse galleryUrls (JSON)
                let galleryUrls = [];
                if (tour.galleryUrls) {
                    try {
                        galleryUrls = typeof tour.galleryUrls === 'string'
                            ? JSON.parse(tour.galleryUrls)
                            : tour.galleryUrls;
                    }
                    catch (e) {
                        console.warn('[get_tour_details] Fehler beim Parsen von galleryUrls:', e);
                    }
                }
                return {
                    id: tour.id,
                    title: tour.title,
                    description: tour.description || '',
                    type: tour.type,
                    price: tour.price ? Number(tour.price) : null,
                    currency: tour.currency || 'COP',
                    duration: tour.duration,
                    maxParticipants: tour.maxParticipants,
                    minParticipants: tour.minParticipants,
                    location: tour.location,
                    meetingPoint: tour.meetingPoint,
                    includes: tour.includes,
                    excludes: tour.excludes,
                    requirements: tour.requirements,
                    imageUrl: tour.imageUrl,
                    galleryUrls: galleryUrls,
                    availableFrom: ((_a = tour.availableFrom) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                    availableTo: ((_b = tour.availableTo) === null || _b === void 0 ? void 0 : _b.toISOString()) || null,
                    branch: tour.branch ? { id: tour.branch.id, name: tour.branch.name } : null,
                    externalProvider: tour.externalProvider ? {
                        id: tour.externalProvider.id,
                        name: tour.externalProvider.name,
                        phone: tour.externalProvider.phone
                    } : null
                };
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] get_tour_details Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt eine Tour-Reservation/Buchung
     */
    static book_tour(args, userId, roleId, branchId, phoneNumber // WhatsApp-Telefonnummer (wird automatisch aus Context übergeben)
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            try {
                // 1. Validierung: Alle erforderlichen Parameter
                if (!args.tourId) {
                    throw new Error('tourId ist erforderlich. Bitte wählen Sie eine Tour aus der Liste.');
                }
                if (!args.tourDate) {
                    throw new Error('Tour-Datum ist erforderlich. Bitte geben Sie das Datum der Tour an (z.B. "morgen" oder ein konkretes Datum).');
                }
                if (!args.numberOfParticipants || args.numberOfParticipants < 1) {
                    throw new Error('Anzahl Teilnehmer ist erforderlich und muss mindestens 1 sein.');
                }
                if (!args.customerName || !args.customerName.trim()) {
                    throw new Error('Name des Kunden ist erforderlich. Bitte geben Sie Ihren vollständigen Namen an.');
                }
                // 2. Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
                let tourDate;
                const tourDateStr = args.tourDate.toLowerCase().trim();
                if (tourDateStr === 'today' || tourDateStr === 'heute' || tourDateStr === 'hoy') {
                    tourDate = new Date();
                    tourDate.setHours(0, 0, 0, 0);
                }
                else if (tourDateStr === 'tomorrow' || tourDateStr === 'morgen' || tourDateStr === 'mañana') {
                    tourDate = new Date();
                    tourDate.setDate(tourDate.getDate() + 1);
                    tourDate.setHours(0, 0, 0, 0);
                }
                else if (tourDateStr === 'day after tomorrow' || tourDateStr === 'übermorgen' || tourDateStr === 'pasado mañana') {
                    tourDate = new Date();
                    tourDate.setDate(tourDate.getDate() + 2);
                    tourDate.setHours(0, 0, 0, 0);
                }
                else {
                    // Versuche verschiedene Datum-Formate zu parsen
                    tourDate = this.parseDate(args.tourDate);
                    if (isNaN(tourDate.getTime())) {
                        throw new Error(`Ungültiges Tour-Datum: ${args.tourDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                    }
                }
                // Validierung: Tour-Datum muss in der Zukunft sein
                if (tourDate < new Date()) {
                    throw new Error('Tour-Datum muss in der Zukunft sein');
                }
                // 3. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
                // WICHTIG: Nutze WhatsApp-Telefonnummer als Fallback, falls nicht angegeben
                let customerPhone = ((_a = args.customerPhone) === null || _a === void 0 ? void 0 : _a.trim()) || null;
                let customerEmail = ((_b = args.customerEmail) === null || _b === void 0 ? void 0 : _b.trim()) || null;
                // Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
                if (!customerPhone && phoneNumber) {
                    const { LanguageDetectionService } = yield Promise.resolve().then(() => __importStar(require('./languageDetectionService')));
                    customerPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
                    console.log(`[book_tour] WhatsApp-Telefonnummer als Fallback verwendet: ${customerPhone}`);
                }
                if (!customerPhone && !customerEmail) {
                    throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Tour-Buchung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
                }
                // Hole Branch für organizationId
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { organizationId: true }
                });
                if (!branch) {
                    throw new Error('Branch nicht gefunden');
                }
                // Hole Tour
                const tour = yield prisma_1.prisma.tour.findUnique({
                    where: { id: parseInt(args.tourId, 10) },
                    include: {
                        externalProvider: true
                    }
                });
                if (!tour) {
                    throw new Error('Tour nicht gefunden');
                }
                if (!tour.isActive) {
                    throw new Error('Tour ist nicht aktiv');
                }
                // Validierung: Anzahl Teilnehmer
                if (tour.minParticipants && args.numberOfParticipants < tour.minParticipants) {
                    throw new Error(`Mindestens ${tour.minParticipants} Teilnehmer erforderlich`);
                }
                if (tour.maxParticipants && args.numberOfParticipants > tour.maxParticipants) {
                    throw new Error(`Maximal ${tour.maxParticipants} Teilnehmer erlaubt`);
                }
                // Berechne Gesamtpreis
                const totalPrice = tour.price
                    ? Number(tour.price) * args.numberOfParticipants
                    : 0;
                // Erstelle Buchung
                const booking = yield prisma_1.prisma.tourBooking.create({
                    data: {
                        tourId: tour.id,
                        tourDate: tourDate,
                        numberOfParticipants: args.numberOfParticipants,
                        totalPrice: totalPrice,
                        currency: tour.currency || 'COP',
                        customerName: args.customerName.trim(),
                        customerEmail: customerEmail,
                        customerPhone: customerPhone,
                        customerNotes: ((_c = args.customerNotes) === null || _c === void 0 ? void 0 : _c.trim()) || null,
                        bookedById: userId || null,
                        organizationId: branch.organizationId,
                        branchId: branchId,
                        isExternal: tour.type === 'external',
                        amountPending: totalPrice,
                        // Automatische Stornierung
                        paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
                        autoCancelEnabled: true,
                        reservedUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde
                    },
                    include: {
                        tour: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                });
                // Prüfe ob Reservation mit gleichem Namen existiert und verknüpfe Tour
                try {
                    const matchingReservation = yield this.findReservationByCustomerName(args.customerName.trim(), customerPhone, customerEmail, branchId, branch.organizationId);
                    if (matchingReservation) {
                        console.log(`[book_tour] ✅ Reservation ${matchingReservation.id} mit gleichem Namen gefunden, verknüpfe Tour-Buchung`);
                        // Erstelle TourReservation Verknüpfung
                        // WICHTIG: tourPrice = totalPrice, accommodationPrice = 0 (Tour ist zusätzlich zur Reservation)
                        const tourReservation = yield prisma_1.prisma.tourReservation.create({
                            data: {
                                tourId: tour.id,
                                bookingId: booking.id,
                                reservationId: matchingReservation.id,
                                tourPrice: totalPrice,
                                accommodationPrice: 0, // Tour ist zusätzlich, keine Reduzierung der Accommodation
                                currency: tour.currency || 'COP',
                                tourPricePending: totalPrice,
                                accommodationPending: 0
                            }
                        });
                        console.log(`[book_tour] ✅ TourReservation Verknüpfung erstellt: ${tourReservation.id}`);
                        // WICHTIG: Payment Link für Tour bleibt separat (in TourBooking.paymentLink)
                        // Reservation hat bereits eigenen Payment Link (in Reservation.paymentLink)
                        // Beide Links können unabhängig bezahlt werden
                    }
                }
                catch (linkError) {
                    console.error('[book_tour] Fehler beim Verknüpfen mit Reservation:', linkError);
                    // Nicht abbrechen, nur loggen
                }
                // Generiere Payment Link (analog zu tourBookingController)
                let paymentLink = null;
                if (totalPrice > 0 && (customerPhone || customerEmail)) {
                    try {
                        // Erstelle "Dummy"-Reservation für Payment Link
                        const dummyReservation = yield prisma_1.prisma.reservation.create({
                            data: {
                                guestName: args.customerName,
                                guestPhone: customerPhone,
                                guestEmail: customerEmail,
                                checkInDate: tourDate,
                                checkOutDate: new Date(tourDate.getTime() + 24 * 60 * 60 * 1000), // +1 Tag
                                status: 'confirmed',
                                paymentStatus: 'pending',
                                amount: totalPrice,
                                currency: tour.currency || 'COP',
                                organizationId: branch.organizationId,
                                branchId: branchId
                            }
                        });
                        const boldPaymentService = yield boldPaymentService_1.BoldPaymentService.createForBranch(branchId);
                        paymentLink = yield boldPaymentService.createPaymentLink(dummyReservation, totalPrice, tour.currency || 'COP', `Zahlung für Tour-Buchung: ${tour.title}`);
                        // Aktualisiere Buchung mit Payment Link
                        yield prisma_1.prisma.tourBooking.update({
                            where: { id: booking.id },
                            data: { paymentLink }
                        });
                    }
                    catch (paymentError) {
                        console.error('[book_tour] Fehler beim Erstellen des Payment-Links:', paymentError);
                        // Nicht abbrechen, nur loggen
                    }
                }
                // Berechne Kommission (falls bookedById vorhanden)
                if (userId) {
                    try {
                        const { calculateCommission } = yield Promise.resolve().then(() => __importStar(require('../services/commissionService')));
                        yield calculateCommission(booking.id);
                    }
                    catch (commissionError) {
                        console.error('[book_tour] Fehler bei Kommissions-Berechnung:', commissionError);
                    }
                }
                // Sende Buchungsbestätigung per WhatsApp (wenn Payment Link vorhanden)
                if (paymentLink && (customerPhone || customerEmail)) {
                    try {
                        const { TourWhatsAppService } = yield Promise.resolve().then(() => __importStar(require('../services/tourWhatsAppService')));
                        yield TourWhatsAppService.sendBookingConfirmationToCustomer(booking.id, branch.organizationId, branchId, paymentLink, totalPrice, tour.currency || 'COP');
                        console.log(`[book_tour] ✅ Buchungsbestätigung per WhatsApp gesendet`);
                    }
                    catch (whatsappError) {
                        console.error('[book_tour] Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
                        // Nicht abbrechen, nur loggen
                    }
                }
                // Bei externer Tour: WhatsApp-Nachricht an Anbieter senden
                if (tour.type === 'external' && ((_d = tour.externalProvider) === null || _d === void 0 ? void 0 : _d.phone)) {
                    try {
                        const { TourWhatsAppService } = yield Promise.resolve().then(() => __importStar(require('../services/tourWhatsAppService')));
                        yield TourWhatsAppService.sendBookingRequestToProvider(booking.id, branch.organizationId, branchId);
                    }
                    catch (whatsappError) {
                        console.error('[book_tour] Fehler beim Senden der WhatsApp-Nachricht:', whatsappError);
                    }
                }
                return {
                    success: true,
                    bookingId: booking.id,
                    tourTitle: tour.title,
                    tourDate: tourDate.toISOString(),
                    numberOfParticipants: args.numberOfParticipants,
                    totalPrice: totalPrice,
                    currency: tour.currency || 'COP',
                    paymentLink: paymentLink,
                    paymentDeadline: ((_e = booking.paymentDeadline) === null || _e === void 0 ? void 0 : _e.toISOString()) || null,
                    message: `Tour-Buchung erstellt. Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Buchung automatisch storniert.`
                };
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] book_tour Fehler:', error);
                throw error;
            }
        });
    }
    /**
     * Erstellt eine Zimmer-Reservation für den aktuellen Branch
     * WICHTIG: Nur für ZIMMER, nicht für Touren!
     */
    /**
     * Erstellt eine potenzielle Reservierung (Status "potential")
     * Wird aufgerufen, wenn User erste Buchungsinformationen gibt, aber noch nicht bestätigt hat
     */
    static create_potential_reservation(args, userId, roleId, branchId, phoneNumber // WhatsApp-Telefonnummer
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            try {
                // 1. Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
                let checkInDate;
                const checkInDateStr = args.checkInDate.toLowerCase().trim();
                if (checkInDateStr === 'today' || checkInDateStr === 'heute' || checkInDateStr === 'hoy') {
                    checkInDate = new Date();
                    checkInDate.setHours(0, 0, 0, 0);
                }
                else if (checkInDateStr === 'tomorrow' || checkInDateStr === 'morgen' || checkInDateStr === 'mañana') {
                    checkInDate = new Date();
                    checkInDate.setDate(checkInDate.getDate() + 1);
                    checkInDate.setHours(0, 0, 0, 0);
                }
                else if (checkInDateStr === 'day after tomorrow' || checkInDateStr === 'übermorgen' || checkInDateStr === 'pasado mañana') {
                    checkInDate = new Date();
                    checkInDate.setDate(checkInDate.getDate() + 2);
                    checkInDate.setHours(0, 0, 0, 0);
                }
                else {
                    checkInDate = this.parseDate(args.checkInDate);
                    if (isNaN(checkInDate.getTime())) {
                        throw new Error(`Ungültiges Check-in Datum: ${args.checkInDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                    }
                }
                let checkOutDate;
                const checkOutDateStr = args.checkOutDate.toLowerCase().trim();
                if (checkOutDateStr === 'today' || checkOutDateStr === 'heute' || checkOutDateStr === 'hoy') {
                    checkOutDate = new Date();
                    checkOutDate.setHours(23, 59, 59, 999);
                }
                else if (checkOutDateStr === 'tomorrow' || checkOutDateStr === 'morgen' || checkOutDateStr === 'mañana') {
                    checkOutDate = new Date();
                    checkOutDate.setDate(checkOutDate.getDate() + 1);
                    checkOutDate.setHours(23, 59, 59, 999);
                }
                else if (checkOutDateStr === 'day after tomorrow' || checkOutDateStr === 'übermorgen' || checkOutDateStr === 'pasado mañana') {
                    checkOutDate = new Date();
                    checkOutDate.setDate(checkOutDate.getDate() + 2);
                    checkOutDate.setHours(23, 59, 59, 999);
                }
                else {
                    checkOutDate = this.parseDate(args.checkOutDate);
                    if (isNaN(checkOutDate.getTime())) {
                        throw new Error(`Ungültiges Check-out Datum: ${args.checkOutDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                    }
                }
                // 2. Validierung: Check-out muss mindestens 1 Tag nach Check-in liegen
                const daysDiff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff < 1) {
                    throw new Error('Check-out Datum muss mindestens 1 Tag nach Check-in Datum liegen.');
                }
                // 3. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
                let guestPhone = ((_a = args.guestPhone) === null || _a === void 0 ? void 0 : _a.trim()) || null;
                let guestEmail = ((_b = args.guestEmail) === null || _b === void 0 ? void 0 : _b.trim()) || null;
                // Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
                if (!guestPhone && phoneNumber) {
                    const { LanguageDetectionService } = yield Promise.resolve().then(() => __importStar(require('./languageDetectionService')));
                    guestPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
                    console.log(`[create_potential_reservation] WhatsApp-Telefonnummer als Fallback verwendet: ${guestPhone}`);
                }
                if (!guestPhone && !guestEmail) {
                    throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Reservierung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
                }
                // 4. Hole Branch für organizationId
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: {
                        id: true,
                        name: true,
                        organizationId: true
                    }
                });
                if (!branch) {
                    throw new Error(`Branch ${branchId} nicht gefunden`);
                }
                // 5. Berechne Betrag aus Verfügbarkeitsprüfung
                const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
                let estimatedAmount;
                try {
                    const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                    const availability = yield lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
                    // Finde Zimmer mit dieser categoryId
                    const room = availability.find(item => item.categoryId === args.categoryId);
                    if (room && room.pricePerNight > 0) {
                        estimatedAmount = nights * room.pricePerNight;
                        console.log(`[create_potential_reservation] Preis aus Verfügbarkeit: ${room.pricePerNight} COP/Nacht × ${nights} Nächte = ${estimatedAmount} COP`);
                    }
                    else {
                        console.warn(`[create_potential_reservation] Zimmer mit categoryId ${args.categoryId} nicht in Verfügbarkeit gefunden, verwende Platzhalter`);
                        estimatedAmount = nights * 50000; // Platzhalter
                    }
                }
                catch (error) {
                    console.error('[create_potential_reservation] Fehler beim Abrufen des Preises, verwende Platzhalter:', error);
                    estimatedAmount = nights * 50000; // Platzhalter
                }
                // 6. Prüfe ob bereits eine "potential" Reservation existiert (verhindert Duplikate)
                const existingPotentialReservation = yield prisma_1.prisma.reservation.findFirst({
                    where: {
                        guestPhone: guestPhone,
                        branchId: branchId,
                        status: client_1.ReservationStatus.potential,
                        checkInDate: checkInDate,
                        checkOutDate: checkOutDate
                    },
                    orderBy: { createdAt: 'desc' }
                });
                let reservation;
                if (existingPotentialReservation) {
                    // Aktualisiere bestehende Reservation
                    console.log(`[create_potential_reservation] Aktualisiere bestehende "potential" Reservation ${existingPotentialReservation.id}`);
                    reservation = yield prisma_1.prisma.reservation.update({
                        where: { id: existingPotentialReservation.id },
                        data: {
                            guestName: ((_c = args.guestName) === null || _c === void 0 ? void 0 : _c.trim()) || existingPotentialReservation.guestName,
                            guestPhone: guestPhone,
                            guestEmail: guestEmail,
                            amount: estimatedAmount,
                            currency: 'COP'
                        }
                    });
                }
                else {
                    // Erstelle neue "potential" Reservation
                    // WICHTIG: KEINE LobbyPMS-Buchung (erst bei Bestätigung!)
                    reservation = yield prisma_1.prisma.reservation.create({
                        data: {
                            guestName: ((_d = args.guestName) === null || _d === void 0 ? void 0 : _d.trim()) || 'Gast', // Fallback wenn kein Name
                            guestPhone: guestPhone,
                            guestEmail: guestEmail,
                            checkInDate: checkInDate,
                            checkOutDate: checkOutDate,
                            status: client_1.ReservationStatus.potential, // WICHTIG: Status "potential"
                            paymentStatus: client_1.PaymentStatus.pending,
                            amount: estimatedAmount,
                            currency: 'COP',
                            organizationId: branch.organizationId,
                            branchId: branchId,
                            // WICHTIG: lobbyReservationId bleibt null (wird erst bei Bestätigung erstellt)
                            // WICHTIG: paymentDeadline bleibt null (wird erst bei Bestätigung gesetzt)
                            autoCancelEnabled: false // Keine automatische Stornierung für "potential"
                        }
                    });
                    console.log(`[create_potential_reservation] Neue "potential" Reservation erstellt: ${reservation.id}`);
                }
                // 7. Verknüpfe WhatsApp-Nachrichten mit reservationId (über conversationId)
                // WICHTIG: conversationId muss übergeben werden, aber wir haben es hier nicht direkt
                // Lösung: Suche über phoneNumber und branchId
                try {
                    const { LanguageDetectionService } = yield Promise.resolve().then(() => __importStar(require('./languageDetectionService')));
                    const normalizedPhone = guestPhone ? LanguageDetectionService.normalizePhoneNumber(guestPhone) : null;
                    if (normalizedPhone) {
                        // Finde Conversation für diese Telefonnummer
                        const conversation = yield prisma_1.prisma.whatsAppConversation.findUnique({
                            where: {
                                phoneNumber_branchId: {
                                    phoneNumber: normalizedPhone,
                                    branchId: branchId
                                }
                            },
                            select: { id: true }
                        });
                        if (conversation) {
                            // Verknüpfe alle Nachrichten dieser Conversation mit reservationId
                            yield prisma_1.prisma.whatsAppMessage.updateMany({
                                where: {
                                    conversationId: conversation.id,
                                    reservationId: null // Nur Nachrichten ohne Reservation
                                },
                                data: {
                                    reservationId: reservation.id
                                }
                            });
                            console.log(`[create_potential_reservation] WhatsApp-Nachrichten mit Reservation ${reservation.id} verknüpft`);
                        }
                    }
                }
                catch (error) {
                    console.error('[create_potential_reservation] Fehler beim Verknüpfen der WhatsApp-Nachrichten:', error);
                    // Nicht abbrechen, nur loggen
                }
                return {
                    success: true,
                    reservationId: reservation.id,
                    branchId: branchId,
                    branchName: branch.name,
                    guestName: reservation.guestName,
                    checkInDate: checkInDate.toISOString().split('T')[0],
                    checkOutDate: checkOutDate.toISOString().split('T')[0],
                    status: reservation.status,
                    message: `Potenzielle Reservierung erstellt. Bitte bestätigen Sie die Buchung.`
                };
            }
            catch (error) {
                console.error('[create_potential_reservation] Fehler:', error);
                throw new Error(`Fehler beim Erstellen der potenziellen Reservierung: ${error.message}`);
            }
        });
    }
    static create_room_reservation(args, userId, roleId, branchId, // WICHTIG: Wird automatisch aus Context übergeben
    phoneNumber // Optional: WhatsApp-Telefonnummer (wird automatisch aus Context übergeben)
    ) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // 1. Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
                let checkInDate;
                const checkInDateStr = args.checkInDate.toLowerCase().trim();
                if (checkInDateStr === 'today' || checkInDateStr === 'heute' || checkInDateStr === 'hoy') {
                    checkInDate = new Date();
                    checkInDate.setHours(0, 0, 0, 0);
                }
                else if (checkInDateStr === 'tomorrow' || checkInDateStr === 'morgen' || checkInDateStr === 'mañana') {
                    checkInDate = new Date();
                    checkInDate.setDate(checkInDate.getDate() + 1);
                    checkInDate.setHours(0, 0, 0, 0);
                }
                else if (checkInDateStr === 'day after tomorrow' || checkInDateStr === 'übermorgen' || checkInDateStr === 'pasado mañana') {
                    checkInDate = new Date();
                    checkInDate.setDate(checkInDate.getDate() + 2);
                    checkInDate.setHours(0, 0, 0, 0);
                }
                else {
                    // Versuche verschiedene Datum-Formate zu parsen
                    checkInDate = this.parseDate(args.checkInDate);
                    if (isNaN(checkInDate.getTime())) {
                        throw new Error(`Ungültiges Check-in Datum: ${args.checkInDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                    }
                }
                let checkOutDate;
                const checkOutDateStr = args.checkOutDate.toLowerCase().trim();
                if (checkOutDateStr === 'today' || checkOutDateStr === 'heute' || checkOutDateStr === 'hoy') {
                    checkOutDate = new Date();
                    checkOutDate.setHours(23, 59, 59, 999);
                }
                else if (checkOutDateStr === 'tomorrow' || checkOutDateStr === 'morgen' || checkOutDateStr === 'mañana') {
                    checkOutDate = new Date();
                    checkOutDate.setDate(checkOutDate.getDate() + 1);
                    checkOutDate.setHours(23, 59, 59, 999);
                }
                else if (checkOutDateStr === 'day after tomorrow' || checkOutDateStr === 'übermorgen' || checkOutDateStr === 'pasado mañana') {
                    checkOutDate = new Date();
                    checkOutDate.setDate(checkOutDate.getDate() + 2);
                    checkOutDate.setHours(23, 59, 59, 999);
                }
                else {
                    // Versuche verschiedene Datum-Formate zu parsen
                    checkOutDate = this.parseDate(args.checkOutDate);
                    if (isNaN(checkOutDate.getTime())) {
                        throw new Error(`Ungültiges Check-out Datum: ${args.checkOutDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
                    }
                }
                // 2. Validierung: Check-out muss mindestens 1 Tag nach Check-in liegen
                // WICHTIG: "heute bis heute" gibt es nicht! Check-out muss mindestens 1 Tag später sein
                const daysDiff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff < 1) {
                    throw new Error('Check-out Datum muss mindestens 1 Tag nach Check-in Datum liegen. Bitte geben Sie ein Check-out-Datum an (z.B. "morgen" oder ein konkretes Datum).');
                }
                // 3. Validierung: categoryId ist erforderlich für LobbyPMS Buchung
                // Wenn categoryId fehlt, versuche sie aus Zimmer-Namen zu finden (falls roomType und Name bekannt)
                let categoryId = args.categoryId;
                if (!categoryId) {
                    // Versuche categoryId aus Verfügbarkeitsprüfung zu finden
                    try {
                        const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                        const availability = yield lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
                        // Finde Zimmer mit passendem roomType
                        let matchingRooms = availability.filter(item => item.roomType === args.roomType);
                        // WICHTIG: Wenn roomName angegeben ist, suche nach ähnlichem Namen
                        if (args.roomName && matchingRooms.length > 1) {
                            const roomNameLower = args.roomName.toLowerCase().trim();
                            // Suche nach exakter Übereinstimmung oder Teilübereinstimmung
                            const nameMatch = matchingRooms.find(item => {
                                const itemNameLower = item.roomName.toLowerCase();
                                return itemNameLower === roomNameLower ||
                                    itemNameLower.includes(roomNameLower) ||
                                    roomNameLower.includes(itemNameLower);
                            });
                            if (nameMatch) {
                                categoryId = nameMatch.categoryId;
                                console.log(`[create_room_reservation] categoryId aus Zimmer-Namen gefunden: ${categoryId} (${nameMatch.roomName})`);
                            }
                            else {
                                // Keine exakte Übereinstimmung, aber mehrere Zimmer → Fehler
                                throw new Error(`Mehrere ${args.roomType === 'compartida' ? 'Dorm-Zimmer' : 'private Zimmer'} verfügbar. Bitte wählen Sie ein spezifisches Zimmer aus der Verfügbarkeitsliste.`);
                            }
                        }
                        else if (matchingRooms.length === 1) {
                            // Nur ein Zimmer dieser Art verfügbar → verwende es
                            categoryId = matchingRooms[0].categoryId;
                            console.log(`[create_room_reservation] categoryId aus Verfügbarkeit gefunden: ${categoryId} (${matchingRooms[0].roomName})`);
                        }
                        else if (matchingRooms.length > 1) {
                            // Mehrere Zimmer verfügbar → kann nicht automatisch bestimmt werden
                            throw new Error(`Mehrere ${args.roomType === 'compartida' ? 'Dorm-Zimmer' : 'private Zimmer'} verfügbar. Bitte wählen Sie ein spezifisches Zimmer aus der Verfügbarkeitsliste.`);
                        }
                        else {
                            // Kein Zimmer dieser Art verfügbar
                            throw new Error(`Keine ${args.roomType === 'compartida' ? 'Dorm-Zimmer' : 'private Zimmer'} für diese Daten verfügbar.`);
                        }
                    }
                    catch (error) {
                        // Wenn automatische Suche fehlschlägt, werfe Fehler
                        if (error.message.includes('Mehrere') || error.message.includes('Keine')) {
                            throw error;
                        }
                        throw new Error('categoryId ist erforderlich für die Reservierung. Bitte zuerst Verfügbarkeit prüfen und ein Zimmer auswählen.');
                    }
                }
                // 4. Hole Branch für organizationId (WICHTIG: branchId aus Context verwenden!)
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: {
                        id: true,
                        name: true,
                        organizationId: true
                    }
                });
                if (!branch) {
                    throw new Error(`Branch ${branchId} nicht gefunden`);
                }
                // 4.5. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
                // WICHTIG: Nutze WhatsApp-Telefonnummer als Fallback, falls nicht angegeben
                let guestPhone = ((_a = args.guestPhone) === null || _a === void 0 ? void 0 : _a.trim()) || null;
                let guestEmail = ((_b = args.guestEmail) === null || _b === void 0 ? void 0 : _b.trim()) || null;
                // Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
                if (!guestPhone && phoneNumber) {
                    const { LanguageDetectionService } = yield Promise.resolve().then(() => __importStar(require('./languageDetectionService')));
                    guestPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
                    console.log(`[create_room_reservation] WhatsApp-Telefonnummer als Fallback verwendet: ${guestPhone}`);
                }
                if (!guestPhone && !guestEmail) {
                    throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Reservierung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
                }
                // 4.6. Validierung: guestName ist ERFORDERLICH
                if (!args.guestName || !args.guestName.trim()) {
                    throw new Error('Der Name des Gastes ist erforderlich für die Reservierung. Bitte geben Sie Ihren vollständigen Namen an.');
                }
                const guestName = args.guestName.trim();
                // 5. Prüfe ob bereits eine "potential" Reservation existiert
                // WICHTIG: Normalisiere Telefonnummer für Suche
                const { LanguageDetectionService } = yield Promise.resolve().then(() => __importStar(require('./languageDetectionService')));
                const searchPhone = guestPhone || (phoneNumber ? LanguageDetectionService.normalizePhoneNumber(phoneNumber) : null);
                const existingPotentialReservation = searchPhone ? yield prisma_1.prisma.reservation.findFirst({
                    where: {
                        guestPhone: searchPhone,
                        branchId: branchId,
                        status: client_1.ReservationStatus.potential,
                        checkInDate: checkInDate,
                        checkOutDate: checkOutDate
                    },
                    orderBy: { createdAt: 'desc' }
                }) : null;
                let reservation;
                let lobbyReservationId = null;
                if (existingPotentialReservation) {
                    // Bestätigung einer "potential" Reservation
                    console.log(`[create_room_reservation] Bestätige "potential" Reservation ${existingPotentialReservation.id}`);
                    // 5.1. Erstelle LobbyPMS-Buchung (nur bei Bestätigung!)
                    try {
                        const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                        lobbyReservationId = yield lobbyPmsService.createBooking(categoryId, checkInDate, checkOutDate, guestName, guestEmail || undefined, guestPhone || undefined, 1);
                        console.log(`[create_room_reservation] LobbyPMS Reservierung erstellt: booking_id=${lobbyReservationId}`);
                    }
                    catch (lobbyError) {
                        console.error('[create_room_reservation] Fehler beim Erstellen der LobbyPMS Reservierung:', lobbyError);
                        throw new Error(`Fehler beim Erstellen der Reservierung in LobbyPMS: ${lobbyError.message}`);
                    }
                }
                else {
                    // Neue Reservation (Rückwärtskompatibilität)
                    console.log(`[create_room_reservation] Erstelle neue Reservation (keine "potential" Reservation gefunden)`);
                    // 5.1. Erstelle Reservierung in LobbyPMS (WICHTIG: ZUERST in LobbyPMS, dann lokal!)
                    try {
                        const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                        lobbyReservationId = yield lobbyPmsService.createBooking(categoryId, // Verwende gefundene oder übergebene categoryId
                        checkInDate, checkOutDate, args.guestName.trim(), guestEmail || undefined, // Verwende validierte Email
                        guestPhone || undefined, // Verwende validierte Telefonnummer
                        1 // Anzahl Personen (default: 1, kann später erweitert werden)
                        );
                        console.log(`[create_room_reservation] LobbyPMS Reservierung erstellt: booking_id=${lobbyReservationId}`);
                    }
                    catch (lobbyError) {
                        console.error('[create_room_reservation] Fehler beim Erstellen der LobbyPMS Reservierung:', lobbyError);
                        throw new Error(`Fehler beim Erstellen der Reservierung in LobbyPMS: ${lobbyError.message}`);
                    }
                }
                // 6. Berechne Betrag aus Verfügbarkeitsprüfung (falls categoryId vorhanden)
                const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
                let estimatedAmount;
                if (args.categoryId || categoryId) {
                    try {
                        // Hole Preis aus Verfügbarkeitsprüfung für diese categoryId
                        const lobbyPmsService = yield lobbyPmsService_1.LobbyPmsService.createForBranch(branchId);
                        const availability = yield lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
                        // Finde Zimmer mit dieser categoryId
                        const room = availability.find(item => item.categoryId === (args.categoryId || categoryId));
                        if (room && room.pricePerNight > 0) {
                            // Verwende Preis aus Verfügbarkeitsprüfung
                            // TODO: Verschiedene Personenanzahl berücksichtigen (aktuell: 1 Person)
                            estimatedAmount = nights * room.pricePerNight;
                            console.log(`[create_room_reservation] Preis aus Verfügbarkeit: ${room.pricePerNight} COP/Nacht × ${nights} Nächte = ${estimatedAmount} COP`);
                        }
                        else {
                            // Fallback: Platzhalter wenn Zimmer nicht gefunden
                            console.warn(`[create_room_reservation] Zimmer mit categoryId ${args.categoryId || categoryId} nicht in Verfügbarkeit gefunden, verwende Platzhalter`);
                            estimatedAmount = nights * 50000; // Platzhalter
                        }
                    }
                    catch (error) {
                        // Fallback: Platzhalter bei Fehler
                        console.error('[create_room_reservation] Fehler beim Abrufen des Preises, verwende Platzhalter:', error);
                        estimatedAmount = nights * 50000; // Platzhalter
                    }
                }
                else {
                    // Fallback: Platzhalter wenn keine categoryId
                    console.warn('[create_room_reservation] Keine categoryId angegeben, verwende Platzhalter');
                    estimatedAmount = nights * 50000; // Platzhalter
                }
                // 7. Setze Payment-Deadline (konfigurierbar, Standard: 1 Stunde)
                const paymentDeadlineHours = parseInt(process.env.RESERVATION_PAYMENT_DEADLINE_HOURS || '1', 10);
                const paymentDeadline = new Date();
                paymentDeadline.setHours(paymentDeadline.getHours() + paymentDeadlineHours);
                // 8. Erstelle oder aktualisiere Reservierung in DB
                if (existingPotentialReservation) {
                    // Aktualisiere bestehende "potential" Reservation: Status "potential" → "confirmed"
                    reservation = yield prisma_1.prisma.reservation.update({
                        where: { id: existingPotentialReservation.id },
                        data: {
                            status: client_1.ReservationStatus.confirmed,
                            guestName: guestName,
                            guestPhone: guestPhone,
                            guestEmail: guestEmail,
                            lobbyReservationId: lobbyReservationId, // WICHTIG: LobbyPMS Booking ID!
                            amount: estimatedAmount,
                            currency: 'COP',
                            paymentDeadline: paymentDeadline, // Frist für Zahlung (Standard: 1 Stunde)
                            autoCancelEnabled: true // Automatische Stornierung aktiviert
                        }
                    });
                    console.log(`[create_room_reservation] Reservation ${reservation.id} von "potential" auf "confirmed" aktualisiert`);
                }
                else {
                    // Erstelle neue Reservation (Rückwärtskompatibilität)
                    reservation = yield prisma_1.prisma.reservation.create({
                        data: {
                            guestName: guestName,
                            guestPhone: guestPhone, // Verwende validierte Telefonnummer
                            guestEmail: guestEmail, // Verwende validierte Email
                            checkInDate: checkInDate,
                            checkOutDate: checkOutDate,
                            status: client_1.ReservationStatus.confirmed,
                            paymentStatus: client_1.PaymentStatus.pending,
                            amount: estimatedAmount,
                            currency: 'COP',
                            organizationId: branch.organizationId,
                            branchId: branchId, // WICHTIG: Branch-spezifisch!
                            lobbyReservationId: lobbyReservationId, // WICHTIG: LobbyPMS Booking ID!
                            paymentDeadline: paymentDeadline, // Frist für Zahlung (Standard: 1 Stunde)
                            autoCancelEnabled: true // Automatische Stornierung aktiviert
                            // HINWEIS: roomType und categoryId werden NICHT in der DB gespeichert, da sie nicht im Schema existieren.
                            // Diese Informationen sind in LobbyPMS über lobbyReservationId verfügbar.
                        }
                    });
                }
                // 9. Erstelle Payment Link (wenn Telefonnummer vorhanden)
                let paymentLink = null;
                if (args.guestPhone || reservation.guestPhone) {
                    try {
                        const boldPaymentService = yield boldPaymentService_1.BoldPaymentService.createForBranch(branchId);
                        paymentLink = yield boldPaymentService.createPaymentLink(reservation, estimatedAmount, 'COP', `Zahlung für Reservierung ${reservation.guestName}`);
                        // Aktualisiere Reservierung mit Payment Link
                        yield prisma_1.prisma.reservation.update({
                            where: { id: reservation.id },
                            data: { paymentLink }
                        });
                    }
                    catch (error) {
                        console.error('[create_room_reservation] Fehler beim Erstellen des Payment-Links:', error);
                        // Nicht abbrechen, nur loggen
                    }
                }
                // 10. Sende Links per WhatsApp (wenn Telefonnummer vorhanden)
                let linksSent = false;
                if (guestPhone || reservation.guestPhone) {
                    try {
                        yield reservationNotificationService_1.ReservationNotificationService.sendReservationInvitation(reservation.id, {
                            guestPhone: guestPhone || reservation.guestPhone || undefined,
                            amount: estimatedAmount,
                            currency: 'COP'
                        });
                        linksSent = true;
                    }
                    catch (error) {
                        console.error('[create_room_reservation] Fehler beim Versand der Links:', error);
                        // Nicht abbrechen, nur loggen
                    }
                }
                // 11. Generiere Check-in Link (falls Email vorhanden)
                // WICHTIG: Check-in Link kann erst nach erfolgreicher LobbyPMS-Buchung erstellt werden!
                let checkInLink = null;
                if (reservation.guestEmail && reservation.lobbyReservationId) {
                    try {
                        checkInLink = (0, checkInLinkUtils_1.generateLobbyPmsCheckInLink)({
                            id: reservation.id,
                            lobbyReservationId: reservation.lobbyReservationId,
                            guestEmail: reservation.guestEmail
                        });
                    }
                    catch (error) {
                        console.error('[create_room_reservation] Fehler beim Generieren des Check-in-Links:', error);
                    }
                }
                // 12. Return Ergebnis
                return {
                    success: true,
                    reservationId: reservation.id,
                    lobbyReservationId: lobbyReservationId, // WICHTIG: LobbyPMS Booking ID
                    branchId: branchId, // WICHTIG: Branch-ID zurückgeben
                    branchName: branch.name,
                    guestName: reservation.guestName,
                    checkInDate: checkInDate.toISOString().split('T')[0],
                    checkOutDate: checkOutDate.toISOString().split('T')[0],
                    roomType: args.roomType,
                    categoryId: categoryId, // Verwende gefundene oder übergebene categoryId
                    amount: estimatedAmount,
                    currency: 'COP',
                    paymentLink: paymentLink,
                    checkInLink: checkInLink,
                    paymentDeadline: paymentDeadline.toISOString(),
                    linksSent: linksSent,
                    message: linksSent
                        ? `Reservierung erstellt. Zahlungslink und Check-in-Link wurden per WhatsApp gesendet. Bitte zahlen Sie innerhalb von ${paymentDeadlineHours} Stunde(n), sonst wird die Reservierung automatisch storniert.`
                        : `Reservierung erstellt. Bitte Zahlungslink und Check-in-Link manuell senden. Bitte zahlen Sie innerhalb von ${paymentDeadlineHours} Stunde(n), sonst wird die Reservierung automatisch storniert.`
                };
            }
            catch (error) {
                console.error('[WhatsApp Function Handlers] create_room_reservation Fehler:', error);
                throw error;
            }
        });
    }
}
exports.WhatsAppFunctionHandlers = WhatsAppFunctionHandlers;
//# sourceMappingURL=whatsappFunctionHandlers.js.map