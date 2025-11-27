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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMessageHandler = void 0;
const whatsappAiService_1 = require("./whatsappAiService");
const languageDetectionService_1 = require("./languageDetectionService");
const whatsappService_1 = require("./whatsappService");
const whatsappGuestService_1 = require("./whatsappGuestService");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const prisma_1 = require("../utils/prisma");
/**
 * WhatsApp Message Handler
 *
 * Verarbeitet eingehende WhatsApp-Nachrichten:
 * - Keyword-Erkennung ("requests", "todos", "request", "todo")
 * - User-Identifikation via Telefonnummer
 * - Conversation State Management
 * - Interaktive Request/Task-Erstellung
 * - KI-Antworten (falls kein Keyword)
 */
class WhatsAppMessageHandler {
    /**
     * Verarbeitet eingehende WhatsApp-Nachricht
     */
    static handleIncomingMessage(phoneNumber, messageText, branchId, mediaUrl, groupId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                // 1. Normalisiere Telefonnummer
                const normalizedPhone = languageDetectionService_1.LanguageDetectionService.normalizePhoneNumber(phoneNumber);
                console.log('[WhatsApp Message Handler] Telefonnummer:', {
                    original: phoneNumber,
                    normalized: normalizedPhone
                });
                // 2. Identifiziere User via phoneNumber
                const user = yield this.identifyUser(normalizedPhone, branchId);
                console.log('[WhatsApp Message Handler] User-Identifikation:', {
                    phoneNumber: normalizedPhone,
                    branchId: branchId,
                    userFound: !!user,
                    userId: user === null || user === void 0 ? void 0 : user.id,
                    userName: user ? `${user.firstName} ${user.lastName}` : null
                });
                // 2.5. Lade User mit Rollen (für Function Calling)
                let userWithRoles = null;
                let roleId = null;
                if (user) {
                    try {
                        userWithRoles = yield prisma_1.prisma.user.findUnique({
                            where: { id: user.id },
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                                phoneNumber: true,
                                roles: {
                                    select: {
                                        roleId: true,
                                        role: {
                                            select: {
                                                id: true,
                                                name: true
                                            }
                                        }
                                    }
                                    // WICHTIG: take: 1 entfernt, da es innerhalb von select nicht immer funktioniert
                                    // Wir nehmen einfach die erste Rolle aus dem Array
                                }
                            }
                        });
                        console.log('[WhatsApp Message Handler] User mit Rollen geladen:', {
                            userId: userWithRoles === null || userWithRoles === void 0 ? void 0 : userWithRoles.id,
                            rolesCount: ((_a = userWithRoles === null || userWithRoles === void 0 ? void 0 : userWithRoles.roles) === null || _a === void 0 ? void 0 : _a.length) || 0,
                            roles: ((_b = userWithRoles === null || userWithRoles === void 0 ? void 0 : userWithRoles.roles) === null || _b === void 0 ? void 0 : _b.map(r => ({ roleId: r.roleId, name: r.role.name }))) || []
                        });
                        if ((userWithRoles === null || userWithRoles === void 0 ? void 0 : userWithRoles.roles) && userWithRoles.roles.length > 0) {
                            roleId = userWithRoles.roles[0].roleId;
                            console.log('[WhatsApp Message Handler] roleId gesetzt:', roleId);
                        }
                        else {
                            console.error('[WhatsApp Message Handler] ⚠️ WARNUNG: User hat KEINE Rollen!', {
                                userId: user.id,
                                userName: `${user.firstName} ${user.lastName}`
                            });
                            // Fallback: Versuche alle Rollen zu laden (ohne select-Beschränkung)
                            const userWithAllRoles = yield prisma_1.prisma.user.findUnique({
                                where: { id: user.id },
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
                            if ((userWithAllRoles === null || userWithAllRoles === void 0 ? void 0 : userWithAllRoles.roles) && userWithAllRoles.roles.length > 0) {
                                roleId = userWithAllRoles.roles[0].roleId;
                                console.log('[WhatsApp Message Handler] Fallback: roleId aus include-Query:', roleId);
                            }
                        }
                    }
                    catch (error) {
                        console.error('[WhatsApp Message Handler] Fehler beim Laden der Rollen:', error);
                    }
                }
                // 3. Lade/Erstelle Conversation State
                const conversation = yield this.getOrCreateConversation(normalizedPhone, branchId, user === null || user === void 0 ? void 0 : user.id);
                // 3.5. Tour-Buchungsantwort vom Anbieter erkennen (VOR Keyword-Erkennung)
                const tourProvider = yield prisma_1.prisma.tourProvider.findFirst({
                    where: {
                        phone: normalizedPhone
                    },
                    include: {
                        tours: {
                            include: {
                                bookings: {
                                    where: {
                                        status: { in: ['confirmed'] },
                                        isExternal: true
                                    },
                                    orderBy: {
                                        createdAt: 'desc'
                                    },
                                    take: 1
                                }
                            }
                        }
                    }
                });
                if (tourProvider && tourProvider.tours.length > 0) {
                    const tour = tourProvider.tours[0];
                    if (tour.bookings && tour.bookings.length > 0) {
                        const latestBooking = tour.bookings[0];
                        // Verarbeite Anbieter-Antwort
                        try {
                            const { TourWhatsAppService } = yield Promise.resolve().then(() => __importStar(require('./tourWhatsAppService')));
                            const branch = yield prisma_1.prisma.branch.findUnique({
                                where: { id: branchId },
                                select: { organizationId: true }
                            });
                            yield TourWhatsAppService.processProviderResponse(latestBooking.id, messageText, (branch === null || branch === void 0 ? void 0 : branch.organizationId) || 0, branchId);
                            const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(normalizedPhone);
                            const translations = {
                                es: 'Gracias por tu respuesta. La reserva será procesada.',
                                de: 'Vielen Dank für Ihre Antwort. Die Buchung wird verarbeitet.',
                                en: 'Thank you for your response. The booking will be processed.'
                            };
                            return translations[language] || translations.es;
                        }
                        catch (error) {
                            console.error('[WhatsApp Message Handler] Fehler bei Tour-Anbieter-Antwort:', error);
                            // Weiter mit normaler Verarbeitung
                        }
                    }
                }
                // 4. Prüfe Keywords
                const normalizedText = messageText.toLowerCase().trim();
                // Keyword: "requests" - Liste aller Requests
                if (normalizedText === 'requests') {
                    if (user) {
                        return yield this.handleRequestsKeyword(user.id, branchId, conversation);
                    }
                    return yield this.getLanguageResponse(branchId, normalizedPhone, 'requests_require_auth');
                }
                // Keyword: "todos" / "to do's" - Liste aller Tasks (PLURAL für Liste)
                if (normalizedText === 'todos' || normalizedText === 'to do\'s' || normalizedText === 'to dos') {
                    if (user) {
                        return yield this.handleTodosKeyword(user.id, branchId, conversation);
                    }
                    return yield this.getLanguageResponse(branchId, normalizedPhone, 'todos_require_auth');
                }
                // Keyword: "request" - Starte Request-Erstellung (SINGULAR für Erstellung)
                if (normalizedText === 'request' && conversation.state === 'idle') {
                    if (!user) {
                        return yield this.getLanguageResponse(branchId, normalizedPhone, 'request_creation_require_auth');
                    }
                    return yield this.startRequestCreation(normalizedPhone, branchId, conversation);
                }
                // Keyword: "todo" - Starte Task-Erstellung (SINGULAR für Erstellung)
                if (normalizedText === 'todo' && conversation.state === 'idle') {
                    if (!user) {
                        return yield this.getLanguageResponse(branchId, normalizedPhone, 'task_creation_require_auth');
                    }
                    return yield this.startTaskCreation(normalizedPhone, branchId, conversation);
                }
                // Keyword: "code" / "código" / "pin" / "password" - Gast-Code-Versand
                const codeKeywords = ['code', 'código', 'codigo', 'pin', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
                if (codeKeywords.includes(normalizedText) && conversation.state === 'idle') {
                    return yield this.handleGuestCodeRequest(normalizedPhone, branchId, conversation);
                }
                // 5. Prüfe Conversation State (für mehrstufige Interaktionen)
                if (conversation.state !== 'idle') {
                    // Prüfe ob es Gast-Identifikation ist
                    if (conversation.state.startsWith('guest_identification')) {
                        return yield this.continueGuestIdentification(normalizedPhone, messageText, conversation, branchId);
                    }
                    return yield this.continueConversation(normalizedPhone, branchId, messageText, mediaUrl, conversation, user);
                }
                // 6. KI-Antwort generieren (falls kein Keyword und kein aktiver State)
                try {
                    // Erweitere Conversation Context mit Rollen für Function Calling
                    const conversationContext = {
                        userId: user === null || user === void 0 ? void 0 : user.id,
                        roleId: roleId,
                        userName: userWithRoles ? `${userWithRoles.firstName} ${userWithRoles.lastName}` : null,
                        conversationState: conversation.state,
                        groupId: groupId
                    };
                    const aiResponse = yield whatsappAiService_1.WhatsAppAiService.generateResponse(messageText, branchId, normalizedPhone, conversationContext);
                    return aiResponse.message;
                }
                catch (error) {
                    console.error('[WhatsApp Message Handler] KI-Fehler:', error);
                    return yield this.getLanguageResponse(branchId, normalizedPhone, 'ai_error');
                }
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler:', error);
                return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
            }
        });
    }
    /**
     * Identifiziert User via Telefonnummer
     */
    static identifyUser(phoneNumber, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('[WhatsApp Message Handler] Suche User:', { phoneNumber, branchId });
                // Normalisiere Telefonnummer für Suche (verschiedene Formate)
                const normalizedPhone = languageDetectionService_1.LanguageDetectionService.normalizePhoneNumber(phoneNumber);
                const phoneWithoutPlus = normalizedPhone.startsWith('+') ? normalizedPhone.substring(1) : normalizedPhone;
                const phoneWithPlus = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone}`;
                // Alle möglichen Formate für Suche
                const searchFormats = [
                    normalizedPhone,
                    phoneWithoutPlus,
                    phoneWithPlus,
                    phoneNumber, // Original (falls nicht normalisiert)
                    phoneNumber.replace(/[\s-]/g, ''), // Ohne Leerzeichen/Bindestriche
                ];
                // Entferne Duplikate
                const uniqueFormats = [...new Set(searchFormats)];
                console.log('[WhatsApp Message Handler] Suche mit Formaten:', uniqueFormats);
                // Versuche exakte Übereinstimmung mit allen Formaten
                let user = yield prisma_1.prisma.user.findFirst({
                    where: {
                        OR: uniqueFormats.map(format => ({ phoneNumber: format })),
                        branches: {
                            some: {
                                branchId: branchId
                            }
                        }
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true
                    }
                });
                if (user) {
                    console.log('[WhatsApp Message Handler] User gefunden (exakt):', user.id);
                    return user;
                }
                // Fallback: Suche ohne Branch-Filter (falls User in anderem Branch ist)
                console.log('[WhatsApp Message Handler] Exakte Suche fehlgeschlagen, versuche ohne Branch-Filter...');
                const userWithBranches = yield prisma_1.prisma.user.findFirst({
                    where: {
                        OR: uniqueFormats.map(format => ({ phoneNumber: format }))
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phoneNumber: true,
                        branches: {
                            select: {
                                branchId: true,
                                branch: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                });
                if (userWithBranches) {
                    console.log('[WhatsApp Message Handler] User gefunden (ohne Branch-Filter):', {
                        userId: userWithBranches.id,
                        userName: `${userWithBranches.firstName} ${userWithBranches.lastName}`,
                        userBranches: userWithBranches.branches.map(b => ({ id: b.branchId, name: b.branch.name })),
                        targetBranchId: branchId
                    });
                    // Prüfe ob User im Branch ist
                    const isInBranch = userWithBranches.branches.some(b => b.branchId === branchId);
                    if (!isInBranch) {
                        console.warn('[WhatsApp Message Handler] User ist nicht im Branch!', {
                            userId: userWithBranches.id,
                            targetBranchId: branchId,
                            userBranches: userWithBranches.branches.map(b => b.branchId)
                        });
                        // User nicht im Branch - return null
                        return null;
                    }
                    // User ist im Branch - return user (ohne branches für Kompatibilität)
                    user = {
                        id: userWithBranches.id,
                        firstName: userWithBranches.firstName,
                        lastName: userWithBranches.lastName,
                        email: userWithBranches.email,
                        phoneNumber: userWithBranches.phoneNumber
                    };
                }
                else {
                    console.warn('[WhatsApp Message Handler] Kein User gefunden für Telefonnummer:', phoneNumber);
                    // Debug: Zeige alle User mit ähnlichen Telefonnummern
                    const allUsers = yield prisma_1.prisma.user.findMany({
                        where: {
                            phoneNumber: { not: null }
                        },
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            phoneNumber: true
                        },
                        take: 10
                    });
                    console.log('[WhatsApp Message Handler] Verfügbare User mit Telefonnummer:', allUsers.map(u => ({
                        id: u.id,
                        name: `${u.firstName} ${u.lastName}`,
                        phone: u.phoneNumber
                    })));
                }
                return user;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei User-Identifikation:', error);
                if (error instanceof Error) {
                    console.error('[WhatsApp Message Handler] Fehlermeldung:', error.message);
                    console.error('[WhatsApp Message Handler] Stack:', error.stack);
                }
                return null;
            }
        });
    }
    /**
     * Lädt oder erstellt Conversation
     */
    static getOrCreateConversation(phoneNumber, branchId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let conversation = yield prisma_1.prisma.whatsAppConversation.findUnique({
                    where: {
                        phoneNumber_branchId: {
                            phoneNumber: phoneNumber,
                            branchId: branchId
                        }
                    }
                });
                if (!conversation) {
                    conversation = yield prisma_1.prisma.whatsAppConversation.create({
                        data: {
                            phoneNumber: phoneNumber,
                            branchId: branchId,
                            userId: userId || null,
                            state: 'idle'
                        }
                    });
                }
                else {
                    // Update lastMessageAt und userId (falls geändert)
                    conversation = yield prisma_1.prisma.whatsAppConversation.update({
                        where: { id: conversation.id },
                        data: {
                            lastMessageAt: new Date(),
                            userId: userId || conversation.userId
                        }
                    });
                }
                return conversation;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Conversation:', error);
                throw error;
            }
        });
    }
    /**
     * Verarbeitet Keyword "requests"
     */
    static handleRequestsKeyword(userId, branchId, conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const requests = yield prisma_1.prisma.request.findMany({
                    where: {
                        OR: [
                            { requesterId: userId },
                            { responsibleId: userId }
                        ],
                        branchId: branchId
                    },
                    include: {
                        requester: { select: { firstName: true, lastName: true } },
                        responsible: { select: { firstName: true, lastName: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                });
                const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(conversation.phoneNumber);
                const translations = {
                    es: {
                        title: '📋 Tus Requests:',
                        none: 'No tienes requests.',
                        item: (r) => {
                            const statusMap = {
                                'approval': '⏳ Pendiente',
                                'approved': '✅ Aprobado',
                                'to_improve': '🔧 Mejorar',
                                'denied': '❌ Denegado'
                            };
                            return `• ${r.title} - ${statusMap[r.status] || r.status}`;
                        }
                    },
                    de: {
                        title: '📋 Deine Requests:',
                        none: 'Du hast keine Requests.',
                        item: (r) => {
                            const statusMap = {
                                'approval': '⏳ Ausstehend',
                                'approved': '✅ Genehmigt',
                                'to_improve': '🔧 Verbessern',
                                'denied': '❌ Abgelehnt'
                            };
                            return `• ${r.title} - ${statusMap[r.status] || r.status}`;
                        }
                    },
                    en: {
                        title: '📋 Your Requests:',
                        none: 'You have no requests.',
                        item: (r) => {
                            const statusMap = {
                                'approval': '⏳ Pending',
                                'approved': '✅ Approved',
                                'to_improve': '🔧 To Improve',
                                'denied': '❌ Denied'
                            };
                            return `• ${r.title} - ${statusMap[r.status] || r.status}`;
                        }
                    }
                };
                const t = translations[language] || translations.es;
                if (requests.length === 0) {
                    return t.none;
                }
                let message = t.title + '\n\n';
                requests.forEach(r => {
                    message += t.item(r) + '\n';
                });
                return message;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Requests:', error);
                return yield this.getLanguageResponse(conversation.branchId, conversation.phoneNumber, 'error');
            }
        });
    }
    /**
     * Verarbeitet Keyword "todos"
     */
    static handleTodosKeyword(userId, branchId, conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const tasks = yield prisma_1.prisma.task.findMany({
                    where: {
                        OR: [
                            { responsibleId: userId },
                            { qualityControlId: userId }
                        ],
                        branchId: branchId
                    },
                    include: {
                        responsible: { select: { firstName: true, lastName: true } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10
                });
                const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(conversation.phoneNumber);
                const translations = {
                    es: {
                        title: '✅ Tus To-Dos:',
                        none: 'No tienes to-dos.',
                        item: (t) => {
                            const statusMap = {
                                'open': '📝 Abierto',
                                'in_progress': '🔄 En Progreso',
                                'improval': '🔧 Mejorar',
                                'quality_control': '👀 Control Calidad',
                                'done': '✅ Hecho'
                            };
                            return `• ${t.title} - ${statusMap[t.status] || t.status}`;
                        }
                    },
                    de: {
                        title: '✅ Deine To-Dos:',
                        none: 'Du hast keine To-Dos.',
                        item: (t) => {
                            const statusMap = {
                                'open': '📝 Offen',
                                'in_progress': '🔄 In Bearbeitung',
                                'improval': '🔧 Verbessern',
                                'quality_control': '👀 Qualitätskontrolle',
                                'done': '✅ Erledigt'
                            };
                            return `• ${t.title} - ${statusMap[t.status] || t.status}`;
                        }
                    },
                    en: {
                        title: '✅ Your To-Dos:',
                        none: 'You have no to-dos.',
                        item: (t) => {
                            const statusMap = {
                                'open': '📝 Open',
                                'in_progress': '🔄 In Progress',
                                'improval': '🔧 To Improve',
                                'quality_control': '👀 Quality Control',
                                'done': '✅ Done'
                            };
                            return `• ${t.title} - ${statusMap[t.status] || t.status}`;
                        }
                    }
                };
                const t = translations[language] || translations.es;
                if (tasks.length === 0) {
                    return t.none;
                }
                let message = t.title + '\n\n';
                tasks.forEach(task => {
                    message += t.item(task) + '\n';
                });
                return message;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Todos:', error);
                return yield this.getLanguageResponse(conversation.branchId, conversation.phoneNumber, 'error');
            }
        });
    }
    /**
     * Startet Request-Erstellung
     */
    static startRequestCreation(phoneNumber, branchId, conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Setze State auf "request_creation"
                yield prisma_1.prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: {
                        state: 'request_creation',
                        context: { step: 'waiting_for_responsible' }
                    }
                });
                const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                const translations = {
                    es: 'Para quién es este request? (Escribe el nombre o ID del usuario)',
                    de: 'Für wen ist dieser Request? (Schreibe den Namen oder die ID des Benutzers)',
                    en: 'For whom is this request? (Write the name or ID of the user)'
                };
                return translations[language] || translations.es;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler beim Starten der Request-Erstellung:', error);
                return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
            }
        });
    }
    /**
     * Startet Task-Erstellung
     */
    static startTaskCreation(phoneNumber, branchId, conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Setze State auf "task_creation"
                yield prisma_1.prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: {
                        state: 'task_creation',
                        context: { step: 'waiting_for_responsible' }
                    }
                });
                const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                const translations = {
                    es: 'Para quién es este to-do? (Escribe el nombre o ID del usuario)',
                    de: 'Für wen ist dieser To-Do? (Schreibe den Namen oder die ID des Benutzers)',
                    en: 'For whom is this to-do? (Write the name or ID of the user)'
                };
                return translations[language] || translations.es;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler beim Starten der Task-Erstellung:', error);
                return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
            }
        });
    }
    /**
     * Setzt Conversation fort (für mehrstufige Interaktionen)
     */
    static continueConversation(phoneNumber, branchId, messageText, mediaUrl, conversation, user) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const context = conversation.context || {};
                const step = context.step || '';
                // Request-Erstellung
                if (conversation.state === 'request_creation') {
                    if (step === 'waiting_for_responsible') {
                        // Suche User nach Name oder ID
                        const responsibleUser = yield this.findUserByNameOrId(messageText, branchId);
                        if (!responsibleUser) {
                            const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                            const translations = {
                                es: 'Usuario no encontrado. Por favor, escribe el nombre completo o ID del usuario.',
                                de: 'Benutzer nicht gefunden. Bitte schreibe den vollständigen Namen oder die ID des Benutzers.',
                                en: 'User not found. Please write the full name or ID of the user.'
                            };
                            return translations[language] || translations.es;
                        }
                        // Update Context
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                context: {
                                    step: 'waiting_for_description',
                                    responsibleId: responsibleUser.id,
                                    responsibleName: `${responsibleUser.firstName} ${responsibleUser.lastName}`
                                }
                            }
                        });
                        const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                        const translations = {
                            es: `Usuario encontrado: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\n¿Qué quieres solicitar? (Escribe la descripción o envía una imagen)`,
                            de: `Benutzer gefunden: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWas möchtest du anfragen? (Schreibe die Beschreibung oder sende ein Bild)`,
                            en: `User found: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWhat do you want to request? (Write the description or send an image)`
                        };
                        return translations[language] || translations.es;
                    }
                    if (step === 'waiting_for_description') {
                        // Erstelle Request
                        if (!user) {
                            return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
                        }
                        const responsibleId = context.responsibleId;
                        let description = messageText || 'Request via WhatsApp';
                        // Hole Branch für organizationId
                        const branch = yield prisma_1.prisma.branch.findUnique({
                            where: { id: branchId },
                            select: { organizationId: true }
                        });
                        const request = yield prisma_1.prisma.request.create({
                            data: {
                                title: `Request de ${user.firstName} ${user.lastName}`,
                                description: description,
                                status: 'approval',
                                type: 'other',
                                isPrivate: false,
                                requesterId: user.id,
                                responsibleId: responsibleId,
                                branchId: branchId,
                                organizationId: (branch === null || branch === void 0 ? void 0 : branch.organizationId) || null
                            }
                        });
                        // Lade und speichere Media, falls vorhanden
                        if (mediaUrl) {
                            try {
                                console.log(`[WhatsApp Message Handler] Lade Media ${mediaUrl} für Request ${request.id}...`);
                                const whatsappService = yield whatsappService_1.WhatsAppService.getServiceForBranch(branchId);
                                const mediaData = yield whatsappService.downloadMedia(mediaUrl);
                                // Speichere Media als RequestAttachment
                                const UPLOAD_DIR = path_1.default.join(__dirname, '../../uploads/request-attachments');
                                if (!fs_1.default.existsSync(UPLOAD_DIR)) {
                                    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
                                }
                                const uniqueFileName = `${(0, uuid_1.v4)()}${path_1.default.extname(mediaData.fileName)}`;
                                const filePath = path_1.default.join(UPLOAD_DIR, uniqueFileName);
                                fs_1.default.writeFileSync(filePath, mediaData.buffer);
                                const attachment = yield prisma_1.prisma.requestAttachment.create({
                                    data: {
                                        requestId: request.id,
                                        fileName: mediaData.fileName,
                                        fileType: mediaData.mimeType,
                                        fileSize: mediaData.buffer.length,
                                        filePath: uniqueFileName
                                    }
                                });
                                console.log(`[WhatsApp Message Handler] Media erfolgreich als Attachment gespeichert für Request ${request.id}, Attachment ID: ${attachment.id}`);
                                // Aktualisiere Beschreibung mit Markdown-Link zum Attachment
                                // Format: ![filename](/api/requests/{requestId}/attachments/{attachmentId})
                                const attachmentUrl = `/api/requests/${request.id}/attachments/${attachment.id}`;
                                const markdownImageLink = `\n\n![${mediaData.fileName}](${attachmentUrl})`;
                                yield prisma_1.prisma.request.update({
                                    where: { id: request.id },
                                    data: {
                                        description: description + markdownImageLink
                                    }
                                });
                            }
                            catch (error) {
                                console.error(`[WhatsApp Message Handler] Fehler beim Herunterladen/Speichern von Media:`, error);
                                // Weiter ohne Media - Request wurde bereits erstellt
                            }
                        }
                        // Reset Conversation State
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                        const translations = {
                            es: `✅ Request creado exitosamente!\n\nID: ${request.id}\nTítulo: ${request.title}\nEstado: Pendiente de aprobación`,
                            de: `✅ Request erfolgreich erstellt!\n\nID: ${request.id}\nTitel: ${request.title}\nStatus: Ausstehend`,
                            en: `✅ Request created successfully!\n\nID: ${request.id}\nTitle: ${request.title}\nStatus: Pending approval`
                        };
                        return translations[language] || translations.es;
                    }
                }
                // Task-Erstellung (ähnlich wie Request)
                if (conversation.state === 'task_creation') {
                    if (step === 'waiting_for_responsible') {
                        const responsibleUser = yield this.findUserByNameOrId(messageText, branchId);
                        if (!responsibleUser) {
                            const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                            const translations = {
                                es: 'Usuario no encontrado. Por favor, escribe el nombre completo o ID del usuario.',
                                de: 'Benutzer nicht gefunden. Bitte schreibe den vollständigen Namen oder die ID des Benutzers.',
                                en: 'User not found. Please write the full name or ID of the user.'
                            };
                            return translations[language] || translations.es;
                        }
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                context: {
                                    step: 'waiting_for_description',
                                    responsibleId: responsibleUser.id,
                                    responsibleName: `${responsibleUser.firstName} ${responsibleUser.lastName}`
                                }
                            }
                        });
                        const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                        const translations = {
                            es: `Usuario encontrado: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\n¿Qué to-do quieres crear? (Escribe la descripción)`,
                            de: `Benutzer gefunden: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWelchen To-Do möchtest du erstellen? (Schreibe die Beschreibung)`,
                            en: `User found: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWhat to-do do you want to create? (Write the description)`
                        };
                        return translations[language] || translations.es;
                    }
                    if (step === 'waiting_for_description') {
                        if (!user) {
                            return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
                        }
                        const responsibleId = context.responsibleId;
                        let description = messageText || 'Task via WhatsApp';
                        // Hole Quality Control User (erster Admin oder Verantwortlicher)
                        const qualityControlUser = (yield prisma_1.prisma.user.findFirst({
                            where: {
                                branches: {
                                    some: { branchId: branchId }
                                },
                                roles: {
                                    some: {
                                        role: {
                                            name: { contains: 'admin', mode: 'insensitive' }
                                        }
                                    }
                                }
                            }
                        })) || (yield prisma_1.prisma.user.findFirst({
                            where: {
                                branches: {
                                    some: { branchId: branchId }
                                }
                            }
                        }));
                        if (!qualityControlUser) {
                            return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
                        }
                        // Hole Branch für organizationId
                        const branch = yield prisma_1.prisma.branch.findUnique({
                            where: { id: branchId },
                            select: { organizationId: true }
                        });
                        const task = yield prisma_1.prisma.task.create({
                            data: {
                                title: `To-Do de ${user.firstName} ${user.lastName}`,
                                description: description,
                                status: 'open',
                                responsibleId: responsibleId,
                                qualityControlId: qualityControlUser.id,
                                branchId: branchId,
                                organizationId: (branch === null || branch === void 0 ? void 0 : branch.organizationId) || null
                            }
                        });
                        // Lade und speichere Media, falls vorhanden
                        if (mediaUrl) {
                            try {
                                console.log(`[WhatsApp Message Handler] Lade Media ${mediaUrl} für Task ${task.id}...`);
                                const whatsappService = yield whatsappService_1.WhatsAppService.getServiceForBranch(branchId);
                                const mediaData = yield whatsappService.downloadMedia(mediaUrl);
                                // Speichere Media als TaskAttachment
                                const UPLOAD_DIR_TASK = path_1.default.join(__dirname, '../../uploads/task-attachments');
                                if (!fs_1.default.existsSync(UPLOAD_DIR_TASK)) {
                                    fs_1.default.mkdirSync(UPLOAD_DIR_TASK, { recursive: true });
                                }
                                const uniqueFileName = `${(0, uuid_1.v4)()}${path_1.default.extname(mediaData.fileName)}`;
                                const filePath = path_1.default.join(UPLOAD_DIR_TASK, uniqueFileName);
                                fs_1.default.writeFileSync(filePath, mediaData.buffer);
                                const attachment = yield prisma_1.prisma.taskAttachment.create({
                                    data: {
                                        taskId: task.id,
                                        fileName: mediaData.fileName,
                                        fileType: mediaData.mimeType,
                                        fileSize: mediaData.buffer.length,
                                        filePath: uniqueFileName
                                    }
                                });
                                console.log(`[WhatsApp Message Handler] Media erfolgreich als Attachment gespeichert für Task ${task.id}, Attachment ID: ${attachment.id}`);
                                // Aktualisiere Beschreibung mit Markdown-Link zum Attachment
                                // Format: ![filename](/api/tasks/{taskId}/attachments/{attachmentId})
                                const attachmentUrl = `/api/tasks/${task.id}/attachments/${attachment.id}`;
                                const markdownImageLink = `\n\n![${mediaData.fileName}](${attachmentUrl})`;
                                yield prisma_1.prisma.task.update({
                                    where: { id: task.id },
                                    data: {
                                        description: description + markdownImageLink
                                    }
                                });
                            }
                            catch (error) {
                                console.error(`[WhatsApp Message Handler] Fehler beim Herunterladen/Speichern von Media:`, error);
                                // Weiter ohne Media - Task wurde bereits erstellt
                            }
                        }
                        // Reset Conversation State
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                        const translations = {
                            es: `✅ To-Do creado exitosamente!\n\nID: ${task.id}\nTítulo: ${task.title}\nEstado: Abierto`,
                            de: `✅ To-Do erfolgreich erstellt!\n\nID: ${task.id}\nTitel: ${task.title}\nStatus: Offen`,
                            en: `✅ To-do created successfully!\n\nID: ${task.id}\nTitle: ${task.title}\nStatus: Open`
                        };
                        return translations[language] || translations.es;
                    }
                }
                // Unbekannter State - reset
                yield prisma_1.prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: { state: 'idle', context: null }
                });
                return yield this.getLanguageResponse(branchId, phoneNumber, 'unknown_state');
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Conversation-Continuation:', error);
                // Reset State bei Fehler
                try {
                    yield prisma_1.prisma.whatsAppConversation.update({
                        where: { id: conversation.id },
                        data: { state: 'idle', context: null }
                    });
                }
                catch (_a) { }
                return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
            }
        });
    }
    /**
     * Findet User nach Name oder ID
     */
    static findUserByNameOrId(searchTerm, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Versuche zuerst als ID zu parsen
                const userId = parseInt(searchTerm, 10);
                if (!isNaN(userId)) {
                    const user = yield prisma_1.prisma.user.findFirst({
                        where: {
                            id: userId,
                            branches: {
                                some: { branchId: branchId }
                            }
                        },
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true
                        }
                    });
                    if (user)
                        return user;
                }
                // Suche nach Name
                const searchLower = searchTerm.toLowerCase();
                const users = yield prisma_1.prisma.user.findMany({
                    where: {
                        branches: {
                            some: { branchId: branchId }
                        },
                        OR: [
                            { firstName: { contains: searchTerm, mode: 'insensitive' } },
                            { lastName: { contains: searchTerm, mode: 'insensitive' } },
                            {
                                AND: [
                                    { firstName: { contains: searchLower.split(' ')[0] || '', mode: 'insensitive' } },
                                    { lastName: { contains: searchLower.split(' ')[1] || '', mode: 'insensitive' } }
                                ]
                            }
                        ]
                    },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true
                    },
                    take: 5
                });
                // Wenn genau ein User gefunden, return ihn
                if (users.length === 1) {
                    return users[0];
                }
                // Wenn mehrere gefunden, return null (User muss spezifischer sein)
                return null;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei User-Suche:', error);
                return null;
            }
        });
    }
    /**
     * Holt sprachspezifische Antwort
     */
    static getLanguageResponse(branchId, phoneNumber, key) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
            const responses = {
                requests_require_auth: {
                    es: 'Debes estar registrado para ver tus requests. Por favor, agrega tu número de teléfono a tu perfil.',
                    de: 'Du musst registriert sein, um deine Requests zu sehen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.',
                    en: 'You must be registered to see your requests. Please add your phone number to your profile.'
                },
                todos_require_auth: {
                    es: 'Debes estar registrado para ver tus to-dos. Por favor, agrega tu número de teléfono a tu perfil.',
                    de: 'Du musst registriert sein, um deine To-Dos zu sehen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.',
                    en: 'You must be registered to see your to-dos. Please add your phone number to your profile.'
                },
                request_creation_require_auth: {
                    es: 'Debes estar registrado para crear requests. Por favor, agrega tu número de teléfono a tu perfil.',
                    de: 'Du musst registriert sein, um Requests zu erstellen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.',
                    en: 'You must be registered to create requests. Please add your phone number to your profile.'
                },
                task_creation_require_auth: {
                    es: 'Debes estar registrado para crear to-dos. Por favor, agrega tu número de teléfono a tu perfil.',
                    de: 'Du musst registriert sein, um To-Dos zu erstellen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.',
                    en: 'You must be registered to create to-dos. Please add your phone number to your profile.'
                },
                ai_error: {
                    es: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
                    de: 'Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Nachricht. Bitte versuche es erneut.',
                    en: 'Sorry, there was an error processing your message. Please try again.'
                },
                error: {
                    es: 'Lo siento, ocurrió un error. Por favor, intenta de nuevo más tarde.',
                    de: 'Entschuldigung, ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
                    en: 'Sorry, an error occurred. Please try again later.'
                },
                unknown_state: {
                    es: 'Estado desconocido. Por favor, intenta de nuevo.',
                    de: 'Unbekannter Status. Bitte versuche es erneut.',
                    en: 'Unknown state. Please try again.'
                },
                guest_not_found: {
                    es: 'No se encontró ninguna reservación. Por favor, verifica tus datos o contacta con el personal.',
                    de: 'Keine Reservierung gefunden. Bitte überprüfe deine Daten oder kontaktiere das Personal.',
                    en: 'No reservation found. Please verify your data or contact staff.'
                },
                guest_multiple_found: {
                    es: 'Se encontraron varias reservaciones. Por favor, proporciona más información.',
                    de: 'Mehrere Reservierungen gefunden. Bitte gib weitere Informationen an.',
                    en: 'Multiple reservations found. Please provide more information.'
                }
            };
            return ((_a = responses[key]) === null || _a === void 0 ? void 0 : _a[language]) || ((_b = responses[key]) === null || _b === void 0 ? void 0 : _b.es) || 'Error';
        });
    }
    /**
     * Verarbeitet Gast-Code-Anfrage
     */
    static handleGuestCodeRequest(phoneNumber, branchId, conversation) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Versuche zuerst via Telefonnummer zu identifizieren
                const reservation = yield whatsappGuestService_1.WhatsAppGuestService.identifyGuestByPhone(phoneNumber, branchId);
                if (reservation) {
                    // Gast gefunden via Telefonnummer - sende Code + Links
                    const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                    return yield whatsappGuestService_1.WhatsAppGuestService.buildStatusMessage(reservation, language);
                }
                // Keine Telefonnummer vorhanden - starte mehrstufige Identifikation
                yield prisma_1.prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: {
                        state: 'guest_identification_name',
                        context: {
                            step: 'name',
                            collectedData: {}
                        }
                    }
                });
                const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                const translations = {
                    es: 'No encontré tu reservación con tu número de teléfono. Por favor, proporciona los siguientes datos:\n\n¿Cuál es tu nombre?',
                    de: 'Ich habe deine Reservierung mit deiner Telefonnummer nicht gefunden. Bitte gib die folgenden Daten an:\n\nWie lautet dein Vorname?',
                    en: 'I could not find your reservation with your phone number. Please provide the following information:\n\nWhat is your first name?'
                };
                return translations[language] || translations.es;
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Gast-Code-Anfrage:', error);
                return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
            }
        });
    }
    /**
     * Setzt Gast-Identifikation fort
     */
    static continueGuestIdentification(phoneNumber, messageText, conversation, branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const context = conversation.context || {};
                const step = context.step || conversation.state;
                const collectedData = context.collectedData || {};
                const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
                // Schritt 1: Vorname
                if (step === 'guest_identification_name' || step === 'name') {
                    const firstName = messageText.trim();
                    if (!firstName || firstName.length < 2) {
                        const translations = {
                            es: 'Por favor, proporciona un nombre válido.',
                            de: 'Bitte gib einen gültigen Namen an.',
                            en: 'Please provide a valid name.'
                        };
                        return translations[language] || translations.es;
                    }
                    yield prisma_1.prisma.whatsAppConversation.update({
                        where: { id: conversation.id },
                        data: {
                            state: 'guest_identification_lastname',
                            context: {
                                step: 'lastname',
                                collectedData: Object.assign(Object.assign({}, collectedData), { firstName: firstName })
                            }
                        }
                    });
                    const translations = {
                        es: `Gracias, ${firstName}. ¿Cuál es tu apellido?`,
                        de: `Danke, ${firstName}. Wie lautet dein Nachname?`,
                        en: `Thank you, ${firstName}. What is your last name?`
                    };
                    return translations[language] || translations.es;
                }
                // Schritt 2: Nachname
                if (step === 'guest_identification_lastname' || step === 'lastname') {
                    const lastName = messageText.trim();
                    if (!lastName || lastName.length < 2) {
                        const translations = {
                            es: 'Por favor, proporciona un apellido válido.',
                            de: 'Bitte gib einen gültigen Nachnamen an.',
                            en: 'Please provide a valid last name.'
                        };
                        return translations[language] || translations.es;
                    }
                    yield prisma_1.prisma.whatsAppConversation.update({
                        where: { id: conversation.id },
                        data: {
                            state: 'guest_identification_nationality',
                            context: {
                                step: 'nationality',
                                collectedData: Object.assign(Object.assign({}, collectedData), { lastName: lastName })
                            }
                        }
                    });
                    const translations = {
                        es: `Gracias. ¿De qué país eres?`,
                        de: `Danke. Aus welchem Land kommst du?`,
                        en: `Thank you. What country are you from?`
                    };
                    return translations[language] || translations.es;
                }
                // Schritt 3: Land
                if (step === 'guest_identification_nationality' || step === 'nationality') {
                    const nationality = messageText.trim();
                    if (!nationality || nationality.length < 2) {
                        const translations = {
                            es: 'Por favor, proporciona un país válido.',
                            de: 'Bitte gib ein gültiges Land an.',
                            en: 'Please provide a valid country.'
                        };
                        return translations[language] || translations.es;
                    }
                    // Suche Reservationen mit den bisherigen Daten
                    const reservations = yield whatsappGuestService_1.WhatsAppGuestService.findReservationsByDetails(collectedData.firstName, collectedData.lastName, nationality, null, // Geburtsdatum optional
                    branchId);
                    if (reservations.length === 0) {
                        // Keine Reservation gefunden
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        return yield this.getLanguageResponse(branchId, phoneNumber, 'guest_not_found');
                    }
                    if (reservations.length === 1) {
                        // Genau eine Reservation gefunden - sende Code + Links
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        return yield whatsappGuestService_1.WhatsAppGuestService.buildStatusMessage(reservations[0], language);
                    }
                    // Mehrere Reservationen gefunden - frage nach Geburtsdatum
                    yield prisma_1.prisma.whatsAppConversation.update({
                        where: { id: conversation.id },
                        data: {
                            state: 'guest_identification_birthdate',
                            context: {
                                step: 'birthdate',
                                collectedData: Object.assign(Object.assign({}, collectedData), { nationality: nationality }),
                                candidateReservations: reservations.map((r) => ({
                                    id: r.id,
                                    checkInDate: r.checkInDate,
                                    checkOutDate: r.checkOutDate
                                }))
                            }
                        }
                    });
                    const translations = {
                        es: `Se encontraron varias reservaciones. Por favor, proporciona tu fecha de nacimiento (DD.MM.YYYY) o escribe "saltar" para ver todas.`,
                        de: `Mehrere Reservierungen gefunden. Bitte gib dein Geburtsdatum an (TT.MM.JJJJ) oder schreibe "überspringen" um alle zu sehen.`,
                        en: `Multiple reservations found. Please provide your birth date (DD.MM.YYYY) or type "skip" to see all.`
                    };
                    return translations[language] || translations.es;
                }
                // Schritt 4: Geburtsdatum (optional)
                if (step === 'guest_identification_birthdate' || step === 'birthdate') {
                    let birthDate = null;
                    const messageLower = messageText.toLowerCase().trim();
                    // Prüfe ob "skip" / "überspringen" / "saltar"
                    if (messageLower === 'skip' || messageLower === 'überspringen' || messageLower === 'saltar') {
                        // Zeige Liste aller Reservationen
                        const candidateReservations = context.candidateReservations || [];
                        let message = 'Se encontraron las siguientes reservaciones:\n\n';
                        candidateReservations.forEach((res, index) => {
                            const checkIn = new Date(res.checkInDate).toLocaleDateString('es-ES');
                            const checkOut = new Date(res.checkOutDate).toLocaleDateString('es-ES');
                            message += `${index + 1}. Check-in: ${checkIn}, Check-out: ${checkOut}\n`;
                        });
                        message += '\nPor favor, contacta con el personal para más información.';
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        return message;
                    }
                    // Versuche Geburtsdatum zu parsen
                    try {
                        // Format: DD.MM.YYYY oder DD/MM/YYYY oder DD-MM-YYYY
                        const dateMatch = messageText.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
                        if (dateMatch) {
                            const day = parseInt(dateMatch[1], 10);
                            const month = parseInt(dateMatch[2], 10) - 1; // Monate sind 0-indexiert
                            const year = parseInt(dateMatch[3], 10);
                            birthDate = new Date(year, month, day);
                        }
                    }
                    catch (error) {
                        // Ignoriere Parsing-Fehler
                    }
                    // Suche mit Geburtsdatum
                    const reservations = yield whatsappGuestService_1.WhatsAppGuestService.findReservationsByDetails(collectedData.firstName, collectedData.lastName, collectedData.nationality, birthDate, branchId);
                    if (reservations.length === 0) {
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        return yield this.getLanguageResponse(branchId, phoneNumber, 'guest_not_found');
                    }
                    if (reservations.length === 1) {
                        // Genau eine Reservation gefunden
                        yield prisma_1.prisma.whatsAppConversation.update({
                            where: { id: conversation.id },
                            data: {
                                state: 'idle',
                                context: null
                            }
                        });
                        return yield whatsappGuestService_1.WhatsAppGuestService.buildStatusMessage(reservations[0], language);
                    }
                    // Immer noch mehrere - zeige Liste
                    let message = 'Se encontraron varias reservaciones:\n\n';
                    reservations.forEach((res, index) => {
                        const checkIn = new Date(res.checkInDate).toLocaleDateString('es-ES');
                        const checkOut = new Date(res.checkOutDate).toLocaleDateString('es-ES');
                        message += `${index + 1}. Check-in: ${checkIn}, Check-out: ${checkOut}\n`;
                    });
                    message += '\nPor favor, contacta con el personal para más información.';
                    yield prisma_1.prisma.whatsAppConversation.update({
                        where: { id: conversation.id },
                        data: {
                            state: 'idle',
                            context: null
                        }
                    });
                    return message;
                }
                // Unbekannter Schritt - reset
                yield prisma_1.prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: {
                        state: 'idle',
                        context: null
                    }
                });
                return yield this.getLanguageResponse(branchId, phoneNumber, 'unknown_state');
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Gast-Identifikation:', error);
                yield prisma_1.prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: {
                        state: 'idle',
                        context: null
                    }
                });
                return yield this.getLanguageResponse(branchId, phoneNumber, 'error');
            }
        });
    }
}
exports.WhatsAppMessageHandler = WhatsAppMessageHandler;
//# sourceMappingURL=whatsappMessageHandler.js.map