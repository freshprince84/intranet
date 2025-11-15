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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppMessageHandler = void 0;
const client_1 = require("@prisma/client");
const whatsappAiService_1 = require("./whatsappAiService");
const languageDetectionService_1 = require("./languageDetectionService");
const whatsappService_1 = require("./whatsappService");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const prisma = new client_1.PrismaClient();
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
    static handleIncomingMessage(phoneNumber, messageText, branchId, mediaUrl) {
        return __awaiter(this, void 0, void 0, function* () {
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
                // 3. Lade/Erstelle Conversation State
                const conversation = yield this.getOrCreateConversation(normalizedPhone, branchId, user === null || user === void 0 ? void 0 : user.id);
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
                // 5. Prüfe Conversation State (für mehrstufige Interaktionen)
                if (conversation.state !== 'idle') {
                    return yield this.continueConversation(normalizedPhone, branchId, messageText, mediaUrl, conversation, user);
                }
                // 6. KI-Antwort generieren (falls kein Keyword und kein aktiver State)
                try {
                    const aiResponse = yield whatsappAiService_1.WhatsAppAiService.generateResponse(messageText, branchId, normalizedPhone, { userId: user === null || user === void 0 ? void 0 : user.id, conversationState: conversation.state });
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
                // Versuche exakte Übereinstimmung
                let user = yield prisma.user.findFirst({
                    where: {
                        phoneNumber: phoneNumber,
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
                // Fallback: Suche auch ohne + (falls WhatsApp ohne + sendet)
                if (phoneNumber.startsWith('+')) {
                    const phoneWithoutPlus = phoneNumber.substring(1);
                    console.log('[WhatsApp Message Handler] Versuche Suche ohne +:', phoneWithoutPlus);
                    user = yield prisma.user.findFirst({
                        where: {
                            OR: [
                                { phoneNumber: phoneNumber },
                                { phoneNumber: phoneWithoutPlus },
                                { phoneNumber: `+${phoneWithoutPlus}` }
                            ],
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
                        console.log('[WhatsApp Message Handler] User gefunden (mit Fallback):', user.id);
                        return user;
                    }
                }
                // Fallback: Suche ohne Branch-Filter (falls User in anderem Branch ist)
                console.log('[WhatsApp Message Handler] Exakte Suche fehlgeschlagen, versuche ohne Branch-Filter...');
                const userWithBranches = yield prisma.user.findFirst({
                    where: {
                        phoneNumber: phoneNumber
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
                    const allUsers = yield prisma.user.findMany({
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
                let conversation = yield prisma.whatsAppConversation.findUnique({
                    where: {
                        phoneNumber_branchId: {
                            phoneNumber: phoneNumber,
                            branchId: branchId
                        }
                    }
                });
                if (!conversation) {
                    conversation = yield prisma.whatsAppConversation.create({
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
                    conversation = yield prisma.whatsAppConversation.update({
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
                const requests = yield prisma.request.findMany({
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
                const tasks = yield prisma.task.findMany({
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
                yield prisma.whatsAppConversation.update({
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
                yield prisma.whatsAppConversation.update({
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
                        yield prisma.whatsAppConversation.update({
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
                        const branch = yield prisma.branch.findUnique({
                            where: { id: branchId },
                            select: { organizationId: true }
                        });
                        const request = yield prisma.request.create({
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
                                const attachment = yield prisma.requestAttachment.create({
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
                                yield prisma.request.update({
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
                        yield prisma.whatsAppConversation.update({
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
                        yield prisma.whatsAppConversation.update({
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
                        const qualityControlUser = (yield prisma.user.findFirst({
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
                        })) || (yield prisma.user.findFirst({
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
                        const branch = yield prisma.branch.findUnique({
                            where: { id: branchId },
                            select: { organizationId: true }
                        });
                        const task = yield prisma.task.create({
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
                                const attachment = yield prisma.taskAttachment.create({
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
                                yield prisma.task.update({
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
                        yield prisma.whatsAppConversation.update({
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
                yield prisma.whatsAppConversation.update({
                    where: { id: conversation.id },
                    data: { state: 'idle', context: null }
                });
                return yield this.getLanguageResponse(branchId, phoneNumber, 'unknown_state');
            }
            catch (error) {
                console.error('[WhatsApp Message Handler] Fehler bei Conversation-Continuation:', error);
                // Reset State bei Fehler
                try {
                    yield prisma.whatsAppConversation.update({
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
                    const user = yield prisma.user.findFirst({
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
                const users = yield prisma.user.findMany({
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
                }
            };
            return ((_a = responses[key]) === null || _a === void 0 ? void 0 : _a[language]) || ((_b = responses[key]) === null || _b === void 0 ? void 0 : _b.es) || 'Error';
        });
    }
}
exports.WhatsAppMessageHandler = WhatsAppMessageHandler;
//# sourceMappingURL=whatsappMessageHandler.js.map