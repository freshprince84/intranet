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
exports.WhatsAppAiService = void 0;
const axios_1 = __importDefault(require("axios"));
const languageDetectionService_1 = require("./languageDetectionService");
const prisma_1 = require("../utils/prisma");
const whatsappFunctionHandlers_1 = require("./whatsappFunctionHandlers");
/**
 * WhatsApp AI Service
 *
 * Generiert KI-Antworten basierend auf Branch-Konfiguration und OpenAI GPT-4o
 */
class WhatsAppAiService {
    /**
     * Generiert KI-Antwort basierend auf Nachricht und Branch-Konfiguration
     */
    static generateResponse(message, branchId, phoneNumber, conversationContext, conversationId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
            // Speichere conversationId im conversationContext für Function Handlers
            if (conversationId && conversationContext) {
                conversationContext.conversationId = conversationId;
            }
            // 1. Lade Branch und KI-Konfiguration
            const branch = yield prisma_1.prisma.branch.findUnique({
                where: { id: branchId },
                select: { whatsappSettings: true }
            });
            if (!(branch === null || branch === void 0 ? void 0 : branch.whatsappSettings)) {
                throw new Error('Branch WhatsApp Settings nicht gefunden');
            }
            // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
            // Entschlüssele nur apiKey und apiSecret, nicht das gesamte Objekt
            const { decryptSecret } = yield Promise.resolve().then(() => __importStar(require('../utils/encryption')));
            const settings = branch.whatsappSettings;
            // Entschlüssele apiKey und apiSecret falls verschlüsselt
            if (settings.apiKey && typeof settings.apiKey === 'string' && settings.apiKey.includes(':')) {
                try {
                    settings.apiKey = decryptSecret(settings.apiKey);
                }
                catch (error) {
                    console.warn('[WhatsApp AI Service] Fehler beim Entschlüsseln von apiKey:', error);
                }
            }
            if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
                try {
                    settings.apiSecret = decryptSecret(settings.apiSecret);
                }
                catch (error) {
                    console.warn('[WhatsApp AI Service] Fehler beim Entschlüsseln von apiSecret:', error);
                }
            }
            const whatsappSettings = settings; // Branch-Settings sind direkt WhatsApp Settings
            // 2. Prüfe ob es eine Gruppen-Nachricht ist
            const groupId = conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.groupId;
            const isGroupMessage = !!groupId;
            // 3. Wähle entsprechende KI-Konfiguration
            let aiConfig;
            if (isGroupMessage && ((_a = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.guestGroup) === null || _a === void 0 ? void 0 : _a.ai)) {
                // Gruppen-Nachricht: Verwende guestGroup.ai Konfiguration
                const guestGroupId = whatsappSettings.guestGroup.groupId;
                // Prüfe ob groupId mit konfigurierter Group ID übereinstimmt
                if (guestGroupId && guestGroupId === groupId) {
                    aiConfig = whatsappSettings.guestGroup.ai;
                    console.log('[WhatsApp AI Service] Verwende Gäste-Gruppen-KI-Konfiguration');
                }
                else {
                    // Fallback: Verwende normale AI-Konfiguration
                    aiConfig = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.ai;
                    console.log('[WhatsApp AI Service] Group ID stimmt nicht überein, verwende normale KI-Konfiguration');
                }
            }
            else {
                // Einzel-Chat: Verwende normale AI-Konfiguration
                aiConfig = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.ai;
            }
            if (!(aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.enabled)) {
                throw new Error('KI ist für diesen Branch nicht aktiviert');
            }
            // 2. Erkenne Sprache aus Nachricht (primär) oder Telefonnummer (Fallback)
            const detectedLanguage = this.detectLanguageFromMessage(message);
            const phoneLanguage = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
            // Verwende erkannte Sprache aus Nachricht, falls vorhanden, sonst Telefonnummer
            const language = detectedLanguage || phoneLanguage;
            console.log('[WhatsApp AI Service] Spracherkennung:', {
                message: message.substring(0, 50),
                detectedFromMessage: detectedLanguage,
                detectedFromPhone: phoneLanguage,
                finalLanguage: language
            });
            // 3. Baue System Prompt
            const systemPrompt = this.buildSystemPrompt(aiConfig, language, conversationContext);
            // 4. Prüfe ob Function Calling aktiviert werden soll
            // WICHTIG: check_room_availability sollte auch für Gäste verfügbar sein!
            const isEmployee = !!(conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.userId);
            // Für Zimmerverfügbarkeit: Function auch für Gäste aktivieren
            const functionDefinitions = this.getFunctionDefinitions();
            // 5. Rufe OpenAI API auf
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY nicht gesetzt');
            }
            try {
                // Lade Message History (letzte 10 Nachrichten) falls conversationId vorhanden
                let messageHistory = [];
                if (conversationId) {
                    try {
                        const recentMessages = yield prisma_1.prisma.whatsAppMessage.findMany({
                            where: {
                                conversationId: conversationId,
                                branchId: branchId
                            },
                            orderBy: {
                                sentAt: 'desc'
                            },
                            take: 10, // Letzte 10 Nachrichten
                            select: {
                                direction: true,
                                message: true,
                                sentAt: true
                            }
                        });
                        // Konvertiere zu OpenAI-Format (neueste zuerst, dann umdrehen für chronologische Reihenfolge)
                        messageHistory = recentMessages
                            .reverse() // Älteste zuerst
                            .map(msg => ({
                            role: msg.direction === 'incoming' ? 'user' : 'assistant',
                            content: msg.message
                        }))
                            .filter(msg => msg.content && msg.content.trim().length > 0); // Filtere leere Nachrichten
                        console.log(`[WhatsApp AI Service] Message History geladen: ${messageHistory.length} Nachrichten`);
                    }
                    catch (historyError) {
                        console.error('[WhatsApp AI Service] Fehler beim Laden der Message History:', historyError);
                        // Weiter ohne History
                    }
                }
                // Erster API Call (mit Function Definitions, falls aktiviert)
                const messages = [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...messageHistory, // Füge Message History hinzu
                    {
                        role: 'user',
                        content: message
                    }
                ];
                const requestPayload = {
                    model: aiConfig.model || 'gpt-4o',
                    messages: messages,
                    temperature: (_b = aiConfig.temperature) !== null && _b !== void 0 ? _b : 0.7,
                    max_tokens: aiConfig.maxTokens || 500
                };
                // Füge Function Definitions hinzu, falls aktiviert
                if (functionDefinitions.length > 0) {
                    requestPayload.tools = functionDefinitions;
                    requestPayload.tool_choice = 'auto'; // KI entscheidet, ob Functions aufgerufen werden sollen
                }
                const response = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', requestPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    timeout: 30000
                });
                const responseMessage = response.data.choices[0].message;
                // Prüfe ob KI Function Calls machen möchte
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    console.log('[WhatsApp AI Service] Function Calls erkannt:', responseMessage.tool_calls.length);
                    // Führe Funktionen aus
                    const toolResults = [];
                    for (const toolCall of responseMessage.tool_calls) {
                        const functionName = toolCall.function.name;
                        const functionArgs = JSON.parse(toolCall.function.arguments);
                        console.log('[WhatsApp AI Service] Führe Function aus:', {
                            name: functionName,
                            args: functionArgs
                        });
                        try {
                            // Führe Function aus
                            // WICHTIG: check_room_availability kann auch ohne userId aufgerufen werden
                            // WICHTIG: Für create_room_reservation: Übergebe phoneNumber als Fallback für Kontaktdaten
                            const functionParams = [
                                functionArgs,
                                (conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.userId) || null,
                                (conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.roleId) || null,
                                branchId
                            ];
                            // Für create_room_reservation, create_potential_reservation und book_tour: Füge phoneNumber hinzu
                            if (functionName === 'create_room_reservation' || functionName === 'create_potential_reservation' || functionName === 'book_tour') {
                                functionParams.push(phoneNumber); // WhatsApp-Telefonnummer als Fallback
                            }
                            // Für check_room_availability und get_tours: Füge conversationId hinzu (für Context-Speicherung)
                            if (functionName === 'check_room_availability' || functionName === 'get_tours') {
                                functionParams.push(conversationId); // Conversation ID für Context-Speicherung
                            }
                            const result = yield whatsappFunctionHandlers_1.WhatsAppFunctionHandlers[functionName](...functionParams);
                            toolResults.push({
                                tool_call_id: toolCall.id,
                                role: 'tool',
                                name: functionName,
                                content: JSON.stringify(result)
                            });
                            console.log('[WhatsApp AI Service] Function Ergebnis:', {
                                name: functionName,
                                resultCount: Array.isArray(result) ? result.length : 1
                            });
                        }
                        catch (error) {
                            console.error('[WhatsApp AI Service] Function Fehler:', {
                                name: functionName,
                                error: error.message
                            });
                            toolResults.push({
                                tool_call_id: toolCall.id,
                                role: 'tool',
                                name: functionName,
                                content: JSON.stringify({ error: error.message })
                            });
                        }
                    }
                    // Erneuter API Call mit Function Results
                    // WICHTIG: Sprachanweisung explizit wiederholen, damit KI die richtige Sprache verwendet
                    const languageInstruction = this.getLanguageInstruction(language);
                    const systemPromptWithLanguage = languageInstruction + '\n\n' + systemPrompt;
                    // Erstelle Messages-Array mit History, aktueller Nachricht, Function Calls und Results
                    const finalMessages = [
                        {
                            role: 'system',
                            content: systemPromptWithLanguage
                        },
                        ...messageHistory, // Message History
                        {
                            role: 'user',
                            content: message
                        },
                        {
                            role: 'assistant',
                            content: null,
                            tool_calls: responseMessage.tool_calls
                        },
                        ...toolResults
                    ];
                    const finalResponse = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                        model: aiConfig.model || 'gpt-4o',
                        messages: finalMessages,
                        temperature: (_c = aiConfig.temperature) !== null && _c !== void 0 ? _c : 0.7,
                        max_tokens: aiConfig.maxTokens || 500
                    }, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${OPENAI_API_KEY}`
                        },
                        timeout: 30000
                    });
                    const finalMessage = finalResponse.data.choices[0].message.content;
                    return {
                        message: finalMessage,
                        language
                    };
                }
                else {
                    // Keine Function Calls, direkte Antwort
                    return {
                        message: responseMessage.content,
                        language
                    };
                }
            }
            catch (error) {
                console.error('[WhatsApp AI Service] OpenAI API Fehler:', error);
                if (axios_1.default.isAxiosError(error)) {
                    console.error('[WhatsApp AI Service] Status:', (_d = error.response) === null || _d === void 0 ? void 0 : _d.status);
                    console.error('[WhatsApp AI Service] Data:', (_e = error.response) === null || _e === void 0 ? void 0 : _e.data);
                }
                throw new Error('Fehler bei der KI-Antwort-Generierung');
            }
        });
    }
    /**
     * Gibt Function Definitions für OpenAI Function Calling zurück
     */
    static getFunctionDefinitions() {
        return [
            {
                type: 'function',
                function: {
                    name: 'get_requests',
                    description: 'Holt Requests (Solicitudes) für einen User. Filtere nach Status, Datum, etc. Verwende "today" für heute, "this_week" für diese Woche.',
                    parameters: {
                        type: 'object',
                        properties: {
                            status: {
                                type: 'string',
                                enum: ['approval', 'approved', 'to_improve', 'denied'],
                                description: 'Status des Requests'
                            },
                            dueDate: {
                                type: 'string',
                                description: 'Fälligkeitsdatum im Format YYYY-MM-DD. Verwende "today" für heute, "this_week" für diese Woche.'
                            },
                            userId: {
                                type: 'number',
                                description: 'User ID (optional, verwendet aktuellen User wenn nicht angegeben)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_todos',
                    description: 'Holt Todos/Tasks für einen User. Filtere nach Status, Datum, etc.',
                    parameters: {
                        type: 'object',
                        properties: {
                            status: {
                                type: 'string',
                                enum: ['open', 'in_progress', 'improval', 'quality_control', 'done'],
                                description: 'Status des Todos'
                            },
                            dueDate: {
                                type: 'string',
                                description: 'Fälligkeitsdatum im Format YYYY-MM-DD. Verwende "today" für heute.'
                            },
                            userId: {
                                type: 'number',
                                description: 'User ID (optional, verwendet aktuellen User wenn nicht angegeben)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_worktime',
                    description: 'Holt Arbeitszeiten für einen User. Zeigt aktuelle Arbeitszeit, Arbeitszeiten für ein bestimmtes Datum, oder Arbeitszeiten für einen Zeitraum.',
                    parameters: {
                        type: 'object',
                        properties: {
                            date: {
                                type: 'string',
                                description: 'Datum im Format YYYY-MM-DD. Verwende "today" für heute. Wenn nicht angegeben, zeigt aktuelle Arbeitszeit.'
                            },
                            startDate: {
                                type: 'string',
                                description: 'Startdatum für Zeitraum (Format: YYYY-MM-DD)'
                            },
                            endDate: {
                                type: 'string',
                                description: 'Enddatum für Zeitraum (Format: YYYY-MM-DD)'
                            },
                            userId: {
                                type: 'number',
                                description: 'User ID (optional, verwendet aktuellen User wenn nicht angegeben)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_cerebro_articles',
                    description: 'Holt Cerebro-Artikel basierend auf Suchbegriffen oder Tags. Prüft automatisch Berechtigungen des Users.',
                    parameters: {
                        type: 'object',
                        properties: {
                            searchTerm: {
                                type: 'string',
                                description: 'Suchbegriff für Titel oder Inhalt'
                            },
                            tags: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'Tags zum Filtern (z.B. ["notfall", "emergency"])'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximale Anzahl der Artikel (Standard: 10)',
                                default: 10
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_user_info',
                    description: 'Holt Informationen über einen User (Name, Email, Rollen). Wenn keine userId angegeben, verwendet aktuellen User.',
                    parameters: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'number',
                                description: 'User ID (optional, verwendet aktuellen User wenn nicht angegeben)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'check_room_availability',
                    description: 'Prüft Zimmerverfügbarkeit für einen Zeitraum. Zeigt verfügbare Zimmer, Preise und Anzahl verfügbarer Zimmer pro Datum. Unterstützt Filter nach Zimmerart (compartida/privada).',
                    parameters: {
                        type: 'object',
                        properties: {
                            startDate: {
                                type: 'string',
                                description: 'Startdatum im Format YYYY-MM-DD, "today"/"heute"/"hoy" für heute oder "tomorrow"/"morgen"/"mañana" für morgen (erforderlich). Verwende IMMER "today" wenn der User "heute" sagt! Verwende IMMER "tomorrow" wenn der User "morgen" sagt!'
                            },
                            endDate: {
                                type: 'string',
                                description: 'Enddatum im Format YYYY-MM-DD, "today"/"heute"/"hoy" für heute oder "tomorrow"/"morgen"/"mañana" für morgen (optional). WICHTIG: Wenn User nur "heute" sagt, lasse endDate leer (wird automatisch auf heute gesetzt, nicht +1 Tag)! Wenn User nur "morgen" sagt, lasse endDate leer (wird automatisch auf morgen gesetzt)!'
                            },
                            roomType: {
                                type: 'string',
                                enum: ['compartida', 'privada'],
                                description: 'Zimmerart (optional): "compartida" für Dorm-Zimmer, "privada" für private Zimmer'
                            },
                            branchId: {
                                type: 'number',
                                description: 'Branch ID (optional, verwendet Branch aus Context wenn nicht angegeben)'
                            }
                        },
                        required: ['startDate']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_tours',
                    description: 'Holt verfügbare Touren. Filtere nach Typ, Datum, etc. Zeigt Liste aller aktiven Touren mit Preisen, Dauer, Teilnehmeranzahl.',
                    parameters: {
                        type: 'object',
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['own', 'external'],
                                description: 'Tour-Typ (optional): "own" = eigene Tour, "external" = externe Tour'
                            },
                            availableFrom: {
                                type: 'string',
                                description: 'Verfügbar ab (ISO-Datum, z.B. "2025-01-27")'
                            },
                            availableTo: {
                                type: 'string',
                                description: 'Verfügbar bis (ISO-Datum)'
                            },
                            limit: {
                                type: 'number',
                                description: 'Maximale Anzahl Ergebnisse (Standard: 20)'
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_tour_details',
                    description: 'Holt detaillierte Informationen zu einer Tour (inkl. Bilder, Beschreibung, Preise, Inklusivleistungen, Exklusivleistungen, Anforderungen, etc.). Verwende diese Funktion wenn der User Details zu einer spezifischen Tour wissen möchte.',
                    parameters: {
                        type: 'object',
                        properties: {
                            tourId: {
                                type: 'number',
                                description: 'ID der Tour (erforderlich)'
                            }
                        },
                        required: ['tourId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'book_tour',
                    description: 'Erstellt eine Tour-Reservation/Buchung. Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde). Wenn Zahlung nicht innerhalb der Frist erfolgt, wird die Buchung automatisch storniert. WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: tourId, tourDate, numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail). WICHTIG: Wenn Daten fehlen (z.B. kein Name, kein Datum), rufe NICHT diese Function auf, sondern FRAGE nach fehlenden Daten! WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow" als tourDate! Wenn User "die 2." sagt nach get_tours(), ist das tourId=2! Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus vorheriger get_tours() Response! Benötigt: tourId, tourDate (unterstützt "tomorrow"/"morgen"/"mañana"), numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail).',
                    parameters: {
                        type: 'object',
                        properties: {
                            tourId: {
                                type: 'number',
                                description: 'ID der Tour (erforderlich)'
                            },
                            tourDate: {
                                type: 'string',
                                description: 'Datum der Tour (ISO-Format, z.B. "2025-01-27T10:00:00Z" oder "2025-01-27", oder "tomorrow"/"morgen"/"mañana" für morgen). WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow"! Wenn User "übermorgen" sagt, verwende "day after tomorrow"! Unterstützt auch DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY Formate.'
                            },
                            numberOfParticipants: {
                                type: 'number',
                                description: 'Anzahl Teilnehmer (erforderlich)'
                            },
                            customerName: {
                                type: 'string',
                                description: 'Name des Kunden (ERFORDERLICH - vollständiger Name). WICHTIG: Wenn kein Name vorhanden ist, rufe NICHT diese Function auf, sondern FRAGE nach dem Namen!'
                            },
                            customerPhone: {
                                type: 'string',
                                description: 'Telefonnummer des Kunden (optional, falls customerEmail vorhanden)'
                            },
                            customerEmail: {
                                type: 'string',
                                description: 'E-Mail des Kunden (optional, falls customerPhone vorhanden)'
                            },
                            customerNotes: {
                                type: 'string',
                                description: 'Zusätzliche Notizen (optional)'
                            }
                        },
                        required: ['tourId', 'tourDate', 'numberOfParticipants', 'customerName']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'create_potential_reservation',
                    description: 'Erstellt eine potenzielle Reservierung (Status "potential") mit ersten Buchungsinformationen. Wird aufgerufen, wenn User Check-in, Check-out und Zimmer angibt, aber noch nicht alle Daten hat (z.B. kein Name oder fehlende Kontaktdaten). WICHTIG: Diese Funktion erstellt sofort eine Reservation mit Status "potential" (ohne LobbyPMS-Buchung). guestName ist optional. Bei Bestätigung wird create_room_reservation() aufgerufen, die den Status auf "confirmed" ändert und die LobbyPMS-Buchung erstellt.',
                    parameters: {
                        type: 'object',
                        properties: {
                            checkInDate: {
                                type: 'string',
                                description: 'Check-in Datum (Format: YYYY-MM-DD, "today", "tomorrow", etc.)'
                            },
                            checkOutDate: {
                                type: 'string',
                                description: 'Check-out Datum (Format: YYYY-MM-DD, "tomorrow", etc.)'
                            },
                            guestName: {
                                type: 'string',
                                description: 'Name des Gastes (optional, kann später ergänzt werden)'
                            },
                            roomType: {
                                type: 'string',
                                enum: ['compartida', 'privada'],
                                description: 'Zimmer-Art'
                            },
                            categoryId: {
                                type: 'number',
                                description: 'Category ID des Zimmers (aus Verfügbarkeitsprüfung)'
                            },
                            roomName: {
                                type: 'string',
                                description: 'Zimmer-Name (optional)'
                            },
                            guestEmail: {
                                type: 'string',
                                description: 'Email-Adresse (optional, wird abgefragt wenn fehlt)'
                            }
                        },
                        required: ['checkInDate', 'checkOutDate', 'roomType', 'categoryId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'create_room_reservation',
                    description: 'Erstellt oder bestätigt eine Zimmer-Reservation für den aktuellen Branch. WICHTIG: Nur für ZIMMER verwenden, NICHT für Touren! WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: checkInDate, checkOutDate, guestName (vollständiger Name), roomType, categoryId. WICHTIG: Wenn Daten fehlen (z.B. kein Name), rufe NICHT diese Function auf, sondern create_potential_reservation() und FRAGE dann nach fehlenden Daten! WICHTIG: Wenn bereits eine "potential" Reservation existiert, wird diese bestätigt (Status "potential" → "confirmed") und LobbyPMS-Buchung erstellt. Wenn keine "potential" Reservation existiert, wird eine neue Reservation erstellt. WICHTIG: Nutze Kontext aus vorherigen Nachrichten! Wenn User "heute" gesagt hat, verwende "today" als checkInDate. Wenn User Zimmer-Namen sagt (z.B. "la tia artista"), finde categoryId aus vorheriger check_room_availability Response. Benötigt: checkInDate, checkOutDate, guestName (ERFORDERLICH - vollständiger Name), roomType (compartida/privada), categoryId (optional, wird automatisch gefunden). Optional: guestPhone (optional, WhatsApp-Nummer als Fallback), guestEmail (optional). Generiert automatisch Payment Link und Check-in-Link. Setzt Payment-Deadline auf 1 Stunde.',
                    parameters: {
                        type: 'object',
                        properties: {
                            checkInDate: {
                                type: 'string',
                                description: 'Check-in Datum (YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"). WICHTIG: Wenn User "heute" sagt, verwende "today"! Wenn User "morgen" sagt, verwende "tomorrow"! Wenn User "04/12" oder "04.12" sagt, verwende "2025-12-04" (Format: DD/MM oder DD.MM = Tag/Monat, Jahr wird automatisch ergänzt)!'
                            },
                            checkOutDate: {
                                type: 'string',
                                description: 'Check-out Datum (YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana", ERFORDERLICH). WICHTIG: Check-out muss mindestens 1 Tag nach Check-in liegen! "heute bis heute" gibt es nicht! WICHTIG: Wenn User "bis zum 3." sagt, bedeutet das Check-out am 4. (Check-out ist immer am Morgen des nächsten Tages)! Wenn User "04/12" sagt nach Check-in, ist das das Check-out Datum! Wenn User "para mañana" + "1 noche" sagt, dann checkOutDate="day after tomorrow" (übermorgen)! Wenn User nur "heute" sagt ohne Check-out, frage nach: "Für wie viele Nächte?" oder "Bis wann möchten Sie bleiben?"'
                            },
                            guestName: {
                                type: 'string',
                                description: 'Name des Gastes (ERFORDERLICH - vollständiger Name). WICHTIG: Wenn kein Name vorhanden ist, rufe NICHT diese Function auf, sondern create_potential_reservation() und FRAGE dann nach dem Namen!'
                            },
                            roomType: {
                                type: 'string',
                                enum: ['compartida', 'privada'],
                                description: 'Zimmerart: "compartida" für Dorm-Zimmer, "privada" für private Zimmer'
                            },
                            categoryId: {
                                type: 'number',
                                description: 'Category ID des Zimmers (optional, aus check_room_availability Ergebnis). WICHTIG: Wenn User einen Zimmer-Namen sagt (z.B. "la tia artista", "el primo aventurero", "el abuelo viajero"), finde die categoryId aus der vorherigen check_room_availability Response! Wenn User eine Nummer wählt (z.B. "2."), verwende die categoryId des entsprechenden Zimmers aus der Liste. Wenn nur ein Zimmer der gewählten Art (compartida/privada) verfügbar ist, kann categoryId weggelassen werden - wird automatisch gefunden.'
                            },
                            roomName: {
                                type: 'string',
                                description: 'Zimmer-Name (optional, z.B. "el abuelo viajero", "la tia artista", "el primo aventurero"). WICHTIG: Wenn User einen Zimmer-Namen sagt, verwende diesen Parameter! Die categoryId wird dann automatisch aus der Verfügbarkeitsprüfung gefunden.'
                            },
                            guestPhone: {
                                type: 'string',
                                description: 'Telefonnummer des Gastes (optional, wird aus WhatsApp-Kontext verwendet wenn nicht angegeben)'
                            },
                            guestEmail: {
                                type: 'string',
                                description: 'E-Mail des Gastes (optional)'
                            }
                        },
                        required: ['checkInDate', 'checkOutDate', 'guestName', 'roomType']
                    }
                }
            }
        ];
    }
    /**
     * Gibt Sprachanweisung für eine bestimmte Sprache zurück
     */
    static getLanguageInstruction(language) {
        const languageInstructions = {
            es: 'WICHTIG: Antworte IMMER auf Spanisch. Die Antwort muss vollständig auf Spanisch sein, unabhängig von der Sprache des System Prompts.',
            de: 'WICHTIG: Antworte IMMER auf Deutsch. Die Antwort muss vollständig auf Deutsch sein, unabhängig von der Sprache des System Prompts.',
            en: 'IMPORTANT: Always answer in English. The response must be completely in English, regardless of the system prompt language.',
            fr: 'IMPORTANT: Réponds TOUJOURS en français. La réponse doit être entièrement en français, indépendamment de la langue du prompt système.',
            it: 'IMPORTANTE: Rispondi SEMPRE in italiano. La risposta deve essere completamente in italiano, indipendentemente dalla lingua del prompt di sistema.',
            pt: 'IMPORTANTE: Responda SEMPRE em português. A resposta deve ser completamente em português, independentemente do idioma do prompt do sistema.',
            zh: '重要：始终用中文回答。回答必须完全用中文，无论系统提示的语言如何。',
            ja: '重要：常に日本語で答えてください。回答は完全に日本語でなければなりません。システムプロンプトの言語に関係なく。',
            ko: '중요: 항상 한국어로 답변하세요. 응답은 완전히 한국어로 작성되어야 하며, 시스템 프롬프트의 언어와 무관합니다.',
            hi: 'महत्वपूर्ण: हमेशा हिंदी में उत्तर दें। उत्तर पूरी तरह से हिंदी में होना चाहिए, सिस्टम प्रॉम्प्ट की भाषा की परवाह किए बिना।',
            ru: 'ВАЖНО: Всегда отвечай на русском языке. Ответ должен быть полностью на русском, независимо от языка системного промпта.',
            tr: 'ÖNEMLİ: Her zaman Türkçe cevap ver. Cevap tamamen Türkçe olmalıdır, sistem isteminin dilinden bağımsız olarak.',
            ar: 'مهم: أجب دائماً بالعربية. يجب أن تكون الإجابة بالكامل بالعربية، بغض النظر عن لغة مطالبة النظام.'
        };
        return languageInstructions[language] || languageInstructions.es;
    }
    /**
     * Baut System Prompt aus Konfiguration
     */
    static buildSystemPrompt(aiConfig, language, conversationContext) {
        // WICHTIG: Sprachanweisung GANZ AN DEN ANFANG setzen für maximale Priorität
        const languageInstruction = this.getLanguageInstruction(language);
        // Beginne mit Sprachanweisung
        let prompt = languageInstruction + '\n\n';
        // Dann System Prompt
        prompt += aiConfig.systemPrompt || 'Du bist ein hilfreicher Assistent.';
        // Füge Regeln hinzu
        if (aiConfig.rules && aiConfig.rules.length > 0) {
            prompt += '\n\nRegeln:\n';
            aiConfig.rules.forEach((rule, index) => {
                prompt += `${index + 1}. ${rule}\n`;
            });
        }
        // Füge Quellen/Context hinzu (falls vorhanden)
        if (aiConfig.sources && aiConfig.sources.length > 0) {
            prompt += '\n\nVerfügbare Quellen für Informationen:\n';
            aiConfig.sources.forEach((source, index) => {
                prompt += `${index + 1}. ${source}\n`;
            });
            prompt += '\nVerwende diese Quellen als Referenz, wenn relevant.';
        }
        // Füge Conversation Context hinzu (falls vorhanden)
        if (conversationContext) {
            prompt += `\n\nKontext der Konversation: ${JSON.stringify(conversationContext, null, 2)}`;
        }
        // Füge Informationen zu verfügbaren Funktionen hinzu
        // WICHTIG: check_room_availability und Tour-Funktionen sind für ALLE verfügbar (auch Gäste)!
        prompt += '\n\nVerfügbare Funktionen:\n';
        // Zimmerverfügbarkeit - IMMER verfügbar
        prompt += '- check_room_availability: Prüfe Zimmerverfügbarkeit für einen Zeitraum (startDate, endDate, roomType)\n';
        prompt += '  WICHTIG: Verwende IMMER diese Function wenn der User nach Zimmerverfügbarkeit fragt!\n';
        prompt += '  WICHTIG: Rufe diese Function NICHT mehrfach auf, wenn bereits Verfügbarkeitsinformationen vorhanden sind!\n';
        prompt += '  WICHTIG: Wenn der User bereits ein Zimmer ausgewählt hat (z.B. "ja, el tia artista"), rufe diese Function NICHT erneut auf!\n';
        prompt += '  WICHTIG: Zeige ALLE verfügbaren Zimmer aus dem Function-Ergebnis an, nicht nur einige!\n';
        prompt += '  WICHTIG: Jedes Zimmer im Function-Ergebnis muss in der Antwort erwähnt werden!\n';
        prompt += '  WICHTIG: Wenn User nur "heute" sagt, verwende startDate: "today" und lasse endDate leer (zeigt nur heute, nicht heute+morgen)!\n';
        prompt += '  WICHTIG: Wenn User nur "morgen" sagt, verwende startDate: "tomorrow" und lasse endDate leer (zeigt nur morgen)!\n';
        prompt += '  WICHTIG: Terminologie beachten!\n';
        prompt += '    - Bei compartida (Dorm-Zimmer): Verwende "Betten" (beds), NICHT "Zimmer"!\n';
        prompt += '    - Bei privada (private Zimmer): Verwende "Zimmer" (rooms)!\n';
        prompt += '    - Beispiel compartida: "1 Bett verfügbar" oder "3 Betten verfügbar"\n';
        prompt += '    - Beispiel privada: "1 Zimmer verfügbar" oder "2 Zimmer verfügbar"\n';
        prompt += '  Beispiele:\n';
        prompt += '    - "tienen habitacion para hoy?" → check_room_availability({ startDate: "today" })\n';
        prompt += '    - "Haben wir Zimmer frei morgen?" → check_room_availability({ startDate: "tomorrow" })\n';
        prompt += '    - "Haben wir Zimmer frei vom 1.2. bis 3.2.?" → check_room_availability({ startDate: "2025-02-01", endDate: "2025-02-03" })\n';
        prompt += '    - "gibt es Dorm-Zimmer frei?" → check_room_availability({ startDate: "today", roomType: "compartida" })\n';
        prompt += '    - "¿tienen habitaciones privadas disponibles?" → check_room_availability({ startDate: "today", roomType: "privada" })\n';
        // Tour-Funktionen - IMMER verfügbar (auch für Gäste)
        prompt += '\n- get_tours: Hole verfügbare Touren (type, availableFrom, availableTo, limit)\n';
        prompt += '  WICHTIG: Verwende diese Function wenn der User nach Touren fragt!\n';
        prompt += '  Beispiele:\n';
        prompt += '    - "welche touren gibt es?" → get_tours({})\n';
        prompt += '    - "zeige mir alle touren" → get_tours({})\n';
        prompt += '    - "¿qué tours tienen disponibles?" → get_tours({})\n';
        prompt += '\n- get_tour_details: Hole detaillierte Informationen zu einer Tour (tourId)\n';
        prompt += '  WICHTIG: Verwende diese Function wenn der User Details zu einer spezifischen Tour wissen möchte!\n';
        prompt += '  Beispiele:\n';
        prompt += '    - "zeige mir details zu tour 1" → get_tour_details({ tourId: 1 })\n';
        prompt += '    - "was ist in tour 5 inkludiert?" → get_tour_details({ tourId: 5 })\n';
        prompt += '\n- book_tour: Erstelle eine Tour-Buchung (tourId, tourDate, numberOfParticipants, customerName, customerPhone/customerEmail)\n';
        prompt += '  WICHTIG: Verwende diese Function wenn der User eine Tour buchen möchte!\n';
        prompt += '  WICHTIG: Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde)\n';
        prompt += '  WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind!\n';
        prompt += '  WICHTIG: Wenn Daten fehlen (z.B. kein Name, kein Datum), rufe NICHT diese Function auf, sondern FRAGE nach fehlenden Daten!\n';
        prompt += '  WICHTIG: Wenn User "morgen" sagt, verwende "tomorrow" als tourDate!\n';
        prompt += '  WICHTIG: Wenn User "die 2." sagt nach get_tours(), ist das tourId=2 (die zweite Tour aus der Liste)!\n';
        prompt += '  WICHTIG: Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus vorheriger get_tours() Response!\n';
        prompt += '  WICHTIG: Nutze Kontext aus vorherigen Nachrichten! Wenn User vorher get_tours() aufgerufen hat, behalte die Tour-Liste im Kontext!\n';
        prompt += '  WICHTIG: Wenn User "die 2., guatape. für morgen. für 2 personen" sagt, interpretiere: tourId=2 (aus get_tours()), tourDate="tomorrow", numberOfParticipants=2!\n';
        prompt += '  WICHTIG: Wenn customerName fehlt → FRAGE nach dem Namen, rufe Function NICHT auf!\n';
        prompt += '  WICHTIG: Wenn tourDate fehlt → FRAGE nach dem Datum, rufe Function NICHT auf!\n';
        prompt += '  WICHTIG: Wenn numberOfParticipants fehlt → FRAGE nach der Anzahl, rufe Function NICHT auf!\n';
        prompt += '  Beispiele:\n';
        prompt += '    - "ich möchte tour 1 für morgen buchen" → book_tour({ tourId: 1, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
        prompt += '    - "reservar tour 3 para mañana" → book_tour({ tourId: 3, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Juan Pérez", customerEmail: "juan@example.com" })\n';
        prompt += '    - "die 2., guatape. für morgen. für 2 personen" → book_tour({ tourId: 2, tourDate: "tomorrow", numberOfParticipants: 2, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
        prompt += '    - User sagt "die 2." nach get_tours() → tourId=2 (aus vorheriger Response)\n';
        prompt += '    - User sagt "Guatapé" → finde tourId aus get_tours() Response (z.B. tourId=2)\n';
        // Zimmer-Buchung - IMMER verfügbar (auch für Gäste)
        prompt += '\n- create_room_reservation: Erstelle eine Zimmer-Reservation (checkInDate, checkOutDate, guestName, roomType, categoryId optional)\n';
        prompt += '  WICHTIG: Verwende diese Function wenn der User ein ZIMMER buchen möchte (NICHT für Touren)!\n';
        prompt += '  WICHTIG: Unterscheide klar zwischen ZIMMER (create_room_reservation) und TOUREN (book_tour)!\n';
        prompt += '  WICHTIG: Wenn der User "reservar", "buchen", "buche", "buche mir", "reservame", "ich möchte buchen", "ich möchte reservieren", "quiero reservar", "quiero hacer una reserva" sagt → create_room_reservation!\n';
        prompt += '  WICHTIG: Wenn User "buche [Zimmer-Name]" oder "quiero reservar [Zimmer-Name]" sagt (z.B. "buche el abuelo viajero", "quiero reservar una doble estándar"), erkenne dies als Buchungsanfrage!\n';
        prompt += '  WICHTIG: Wenn User "buche [Zimmer-Name] von [Datum] auf [Datum] für [Name]" sagt, hat er ALLE Informationen - rufe SOFORT create_room_reservation auf!\n';
        prompt += '  WICHTIG: Wenn User einen Zimmer-Namen sagt (z.B. "doble estándar", "apartamento doble", "primo deportista"), erkenne dies IMMER als Zimmer-Name aus der Verfügbarkeitsliste, NICHT als sozialen Begriff!\n';
        prompt += '  WICHTIG: Zimmer-Namen aus Verfügbarkeitsliste: "doble estándar", "doble básica", "doble deluxe", "apartamento doble", "apartamento singular", "apartaestudio", "primo deportista", "el primo aventurero", "la tia artista", "el abuelo viajero"!\n';
        prompt += '  WICHTIG: Wenn der User eine Nummer wählt (z.B. "2.") nach Verfügbarkeitsanzeige → create_room_reservation mit categoryId!\n';
        prompt += '  WICHTIG: Wenn der User einen Zimmer-Namen sagt (z.B. "la tia artista", "el primo aventurero", "el abuelo viajero") → finde die categoryId aus der vorherigen check_room_availability Response!\n';
        prompt += '  WICHTIG: Wenn User in vorheriger Nachricht "heute" gesagt hat → verwende "today" als checkInDate!\n';
        prompt += '  WICHTIG: Wenn User "von heute auf morgen" sagt → checkInDate="today", checkOutDate="tomorrow"!\n';
        prompt += '  WICHTIG: Wenn User "para mañana" + "1 noche" sagt, dann: checkInDate="tomorrow", checkOutDate="day after tomorrow"!\n';
        prompt += '  WICHTIG: Wenn User "04/12" oder "04.12" sagt, erkenne dies als Datum (04. Dezember, aktuelles Jahr)!\n';
        prompt += '  WICHTIG: Wenn User nach Buchung Daten gibt (z.B. "01.dez bis 02.dez") → rufe create_room_reservation auf, NICHT check_room_availability!\n';
        prompt += '  WICHTIG: Generiert automatisch Payment Link und Check-in-Link, setzt Zahlungsfrist (1 Stunde)\n';
        prompt += '  WICHTIG: Alle Reservierungen sind Branch-spezifisch (Branch wird automatisch aus Context verwendet)\n';
        prompt += '  WICHTIG: Reservierungsablauf - KRITISCH BEACHTEN:\n';
        prompt += '    1. Wenn User erste Buchungsinformationen gibt (Check-in, Check-out, Zimmer) ABER noch nicht ALLE Daten hat (z.B. kein Name, keine categoryId) → rufe create_potential_reservation() auf\n';
        prompt += '    2. FRAGE IMMER nach fehlenden Daten (z.B. "Wie lautet Ihr vollständiger Name?" oder "Für welches Zimmer möchten Sie buchen?")\n';
        prompt += '    3. create_room_reservation() darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: checkInDate, checkOutDate, guestName (vollständiger Name), roomType, categoryId\n';
        prompt += '    4. Wenn guestName fehlt → rufe create_potential_reservation() auf und FRAGE nach dem Namen!\n';
        prompt += '    5. Wenn categoryId fehlt → rufe create_potential_reservation() auf und FRAGE nach dem Zimmer!\n';
        prompt += '  WICHTIG: create_potential_reservation() erstellt sofort eine Reservation mit Status "potential" (ohne LobbyPMS-Buchung, guestName optional)\n';
        prompt += '  WICHTIG: create_room_reservation() ändert Status von "potential" auf "confirmed" (keine neue Reservation) und erstellt LobbyPMS-Buchung (guestName ERFORDERLICH!)\n';
        prompt += '  WICHTIG: Payment-Link wird mit Betrag + 5% erstellt und versendet (automatisch in boldPaymentService)\n';
        prompt += '  WICHTIG: Wenn User direkt ALLE Daten gibt (Check-in, Check-out, Zimmer, Name) → rufe SOFORT create_room_reservation() auf (keine "potential" Reservation nötig)\n';
        prompt += '  WICHTIG: NIEMALS create_room_reservation() aufrufen, wenn guestName fehlt! Immer erst create_potential_reservation() und dann nachfragen!\n';
        prompt += '  Beispiele:\n';
        prompt += '    - "reservame 1 cama en el primo aventurero für heute, 1 nacht" → create_room_reservation({ checkInDate: "today", checkOutDate: "tomorrow", guestName: "Max Mustermann", roomType: "compartida", categoryId: 34280 })\n';
        prompt += '    - "ich möchte das Zimmer 2 buchen vom 1.12. bis 3.12." → create_room_reservation({ checkInDate: "2025-12-01", checkOutDate: "2025-12-04", guestName: "Max Mustermann", roomType: "compartida", categoryId: 34281 })\n';
        prompt += '    - "reservar habitación privada bis zum 3.12." → create_room_reservation({ checkInDate: "today", checkOutDate: "2025-12-04", guestName: "Juan Pérez", roomType: "privada" })\n';
        prompt += '    - "heute buchen" → FRAGE: "Für wie viele Nächte möchten Sie buchen?" oder "Bis wann möchten Sie bleiben?" (checkOutDate ist erforderlich!)\n';
        prompt += '    - User: "el abuelo viajero buchen für heute" → Bot fragt nach Check-out → User: "1" → Bot interpretiert als "1 Nacht" → create_room_reservation({ checkInDate: "today", checkOutDate: "tomorrow", ... })\n';
        prompt += '    - User: "checkin 02.12. und checkout 03.12.25" → Bot: "Möchten Sie bis zum 03.12. bleiben?" → User: "ja" → Bot interpretiert als Bestätigung → create_room_reservation({ checkInDate: "2025-12-02", checkOutDate: "2025-12-04", ... })\n';
        prompt += '    - User: "dorm, Patrick Ammann" (nachdem Daten bereits genannt wurden) → Bot hat alle Infos → User: "ok, buchen" → Bot ruft SOFORT create_room_reservation auf!\n';
        prompt += '    - User: "el abuelo viajero buchen für heute" → Bot fragt nach Check-out → User: "1" → Bot interpretiert als "1 Nacht" → create_room_reservation({ checkInDate: "today", checkOutDate: "tomorrow", ... })\n';
        prompt += '    - User: "checkin 02.12. und checkout 03.12.25" → Bot: "Möchten Sie bis zum 03.12. bleiben?" → User: "ja" → Bot interpretiert als Bestätigung → create_room_reservation({ checkInDate: "2025-12-02", checkOutDate: "2025-12-04", ... })\n';
        prompt += '    - User: "dorm, Patrick Ammann" (nachdem Daten bereits genannt wurden) → Bot hat alle Infos → User: "ok, buchen" → Bot ruft SOFORT create_room_reservation auf!\n';
        // Andere Funktionen - nur für Mitarbeiter
        if (conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.userId) {
            prompt += '- get_requests: Hole Requests basierend auf Filtern (status, dueDate) - NUR für Mitarbeiter\n';
            prompt += '- get_todos: Hole Todos/Tasks basierend auf Filtern (status, dueDate) - NUR für Mitarbeiter\n';
            prompt += '- get_worktime: Hole Arbeitszeiten für einen User (date, startDate, endDate) - NUR für Mitarbeiter\n';
            prompt += '- get_cerebro_articles: Hole Cerebro-Artikel basierend auf Suchbegriffen oder Tags - NUR für Mitarbeiter\n';
            prompt += '- get_user_info: Hole User-Informationen (Name, Email, Rollen) - NUR für Mitarbeiter\n';
            prompt += '\nBeispiele für Mitarbeiter-Funktionen:';
            prompt += '\n  - "solicitudes abiertas de hoy" → get_requests({ status: "approval", dueDate: "today" })';
            prompt += '\n  - "wie lange habe ich heute gearbeitet" → get_worktime({ date: "today" })';
            prompt += '\n  - "welche cerebro artikel gibt es zu notfällen" → get_cerebro_articles({ tags: ["notfall"] })';
        }
        prompt += '\n\nWICHTIG: Wenn der User nach Zimmerverfügbarkeit fragt, verwende IMMER check_room_availability!';
        prompt += '\nWICHTIG: Wenn der User nach Touren fragt, verwende IMMER get_tours oder get_tour_details!';
        prompt += '\nWICHTIG: Wenn der User eine Tour buchen möchte, verwende IMMER book_tour!';
        prompt += '\nWICHTIG: Wenn der User ein ZIMMER buchen möchte (z.B. "reservar", "buchen", "buche", "buche mir", "reservame", "ich möchte buchen", "ich möchte reservieren"), verwende IMMER create_room_reservation!';
        prompt += '\nWICHTIG: Unterscheide klar zwischen TOUR-Buchung (book_tour) und ZIMMER-Buchung (create_room_reservation)!';
        prompt += '\nWICHTIG: Wenn User nach get_tours() eine Nummer wählt (z.B. "2."), ist das IMMER eine Tour-ID, NICHT eine Zimmer-Nummer!';
        prompt += '\nWICHTIG: Wenn User nach check_room_availability() eine Nummer wählt (z.B. "2."), ist das IMMER eine Zimmer-categoryId, NICHT eine Tour-ID!';
        prompt += '\nWICHTIG: Wenn User "buche [Zimmer-Name]" sagt (z.B. "buche el abuelo viajero"), erkenne dies als vollständige Buchungsanfrage und rufe create_room_reservation auf!';
        prompt += '\nWICHTIG: Wenn User "buche [Zimmer-Name] von [Datum] auf [Datum] für [Name]" sagt, hat er ALLE Informationen gegeben - rufe SOFORT create_room_reservation auf!';
        prompt += '\nWICHTIG: Unterscheide klar zwischen ZIMMER (create_room_reservation) und TOUREN (book_tour)!';
        prompt += '\nWICHTIG: Wenn der User eine Nummer wählt (z.B. "2.") nach Verfügbarkeitsanzeige, prüfe ob ALLE Daten vorhanden sind (Name, Check-in, Check-out). Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
        prompt += '\nWICHTIG: Wenn der User sagt "reservame 1 cama" oder "buche mir 1 bett" oder ähnlich, prüfe ob ALLE Daten vorhanden sind. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
        prompt += '\nWICHTIG: Wenn User einen Zimmer-Namen sagt (z.B. "la tia artista"), finde die categoryId aus der vorherigen check_room_availability Response. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
        prompt += '\nWICHTIG: Wenn User in vorheriger Nachricht "heute" gesagt hat, verwende "today" als checkInDate!';
        prompt += '\nWICHTIG: Wenn User nach einer Buchungsanfrage Daten gibt (z.B. "01.dez bis 02.dez"), prüfe ob ALLE Daten vorhanden sind. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
        prompt += '\nWICHTIG: Beispiel: User sagt "apartamento doble para el 7. de diciembre entonces. 1 noche" → Name fehlt! → rufe create_potential_reservation() auf und FRAGE: "Wie lautet Ihr vollständiger Name?"';
        prompt += '\n\n=== KRITISCH: KONTEXT-NUTZUNG ===';
        prompt += '\nWICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!';
        prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "heute" gesagt hat, verwende es IMMER als checkInDate!';
        prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "checkin 02.12. und checkout 03.12." gesagt hat, verwende diese Daten IMMER!';
        prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht einen Zimmer-Namen gesagt hat (z.B. "el abuelo viajero"), behalte diesen IMMER im Kontext!';
        prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "dorm" oder "privada" gesagt hat, behalte diese Information IMMER!';
        prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht einen Namen gesagt hat (z.B. "Patrick Ammann"), verwende diesen als guestName!';
        prompt += '\nWICHTIG: Kombiniere Informationen aus MEHREREN Nachrichten! Wenn User "heute" sagt und später "1 nacht", dann: checkInDate="today", checkOutDate="tomorrow"!';
        prompt += '\nWICHTIG: Wenn User "1" sagt nachdem er "heute" gesagt hat, interpretiere es als "1 Nacht"!';
        prompt += '\nWICHTIG: Wenn User strukturierte Antworten gibt (z.B. "1. hoy, 02/12. 3. 1 4. sara"), interpretiere: 1. = Check-in, 3. = Nächte, 4. = Name!';
        prompt += '\nWICHTIG: Wenn User widersprüchliche Informationen gibt (z.B. erst "sí" dann "para mañana"), verwende IMMER die LETZTE/NEUESTE Information!';
        prompt += '\n\n=== KRITISCH: KONTEXT-NUTZUNG FÜR TOUREN ===';
        prompt += '\nWICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!';
        prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht get_tours() aufgerufen hat, behalte die Tour-Liste im Kontext!';
        prompt += '\nWICHTIG: Wenn User "die 2." sagt nach get_tours(), ist das tourId=2 (die zweite Tour aus der Liste)!';
        prompt += '\nWICHTIG: Wenn User Tour-Namen sagt (z.B. "Guatapé"), finde tourId aus der vorherigen get_tours() Response!';
        prompt += '\nWICHTIG: Wenn User "morgen" sagt, verwende IMMER "tomorrow" als tourDate!';
        prompt += '\nWICHTIG: Wenn User "für 2 personen" sagt, ist das numberOfParticipants=2!';
        prompt += '\nWICHTIG: Kombiniere Informationen aus MEHREREN Nachrichten! Wenn User "die 2." sagt und später "für morgen", dann: tourId=2, tourDate="tomorrow"!';
        prompt += '\nWICHTIG: Wenn User "die 2., guatape. für morgen. für 2 personen" sagt, hat er ALLE Informationen - rufe SOFORT book_tour auf!';
        prompt += '\nWICHTIG: Wenn User nur "die 2." sagt nach get_tours(), aber Name oder Datum fehlt → FRAGE nach fehlenden Daten, rufe book_tour NICHT auf!';
        prompt += '\nWICHTIG: Unterscheide klar zwischen TOUR-Buchung (book_tour) und ZIMMER-Buchung (create_room_reservation)!';
        prompt += '\nWICHTIG: Wenn User nach get_tours() eine Nummer wählt (z.B. "2."), ist das IMMER eine Tour-ID, NICHT eine Zimmer-Nummer!';
        prompt += '\nWICHTIG: Wenn User nach check_room_availability() eine Nummer wählt (z.B. "2."), ist das IMMER eine Zimmer-categoryId, NICHT eine Tour-ID!';
        prompt += '\nWICHTIG: Wenn User "ja" sagt nachdem du eine Frage gestellt hast, interpretiere es als Bestätigung deiner Vorschläge!';
        prompt += '\nWICHTIG: Wenn User "ja", "sí", "yes" sagt nachdem du eine Frage gestellt hast, interpretiere es als Bestätigung und führe die Aktion aus!';
        prompt += '\nWICHTIG: Wenn User "ja, ich bestätige, bitte buchen" oder "ja ich möchte buchen" oder "sí, quiero reservar" sagt, rufe SOFORT create_room_reservation auf!';
        prompt += '\nWICHTIG: Wenn User "ja" oder "sí" sagt nachdem du eine Buchungsbestätigung gefragt hast (z.B. "Möchten Sie buchen?"), rufe SOFORT create_room_reservation auf!';
        prompt += '\nWICHTIG: Wenn User "sí" sagt, verliere NICHT den Kontext! Nutze die Informationen aus vorherigen Nachrichten und führe die Buchung aus!';
        prompt += '\nWICHTIG: Wenn User "ok, buchen" oder "ok, reservar" sagt und ALLE Informationen vorhanden sind, rufe SOFORT create_room_reservation auf!';
        prompt += '\nWICHTIG: checkOutDate ist ERFORDERLICH und muss mindestens 1 Tag nach checkInDate liegen! "heute bis heute" gibt es NICHT!';
        prompt += '\nWICHTIG: Wenn User nur "heute" sagt ohne Check-out, frage: "Für wie viele Nächte möchten Sie buchen?" oder "Bis wann möchten Sie bleiben?"';
        prompt += '\nWICHTIG: "bis zum 3." bedeutet Check-out am 4. (Check-out ist immer am Morgen des nächsten Tages)! Wenn User "bis zum 3.12." sagt, verwende checkOutDate: "2025-12-04"!';
        prompt += '\nWICHTIG: "1 Nacht" bedeutet: Check-out ist 1 Tag nach Check-in! Wenn Check-in "heute" und User sagt "1 Nacht", dann checkOutDate: "tomorrow"!';
        prompt += '\nWICHTIG: "von heute auf morgen" bedeutet: checkInDate="today", checkOutDate="tomorrow"!';
        prompt += '\nWICHTIG: "von [Datum] auf [Datum]" bedeutet: checkInDate=[erstes Datum], checkOutDate=[zweites Datum]!';
        prompt += '\nWICHTIG: Wenn User "02.12.25 bis 03.12.25" sagt, bedeutet das: checkInDate="2025-12-02", checkOutDate="2025-12-04" (Check-out ist am Morgen des 4.12.)!';
        prompt += '\nWICHTIG: Wenn User "para mañana" sagt und "1 noche" oder "una noche", bedeutet das: checkInDate="tomorrow", checkOutDate="day after tomorrow" (übermorgen)!';
        prompt += '\nWICHTIG: Datum-Formate erkennen: "04/12", "04.12", "04-12" = 04. Dezember (aktuelles Jahr)! Wenn User "04/12" sagt nach Check-in, ist das das Check-out Datum!';
        prompt += '\nWICHTIG: Wenn User "04/12" sagt und Check-in bereits "mañana" ist, dann: checkInDate="tomorrow", checkOutDate="2025-12-04"!';
        prompt += '\nWICHTIG: Wenn User nur "reservar" sagt (ohne weitere Details), aber bereits Zimmer und Daten in vorherigen Nachrichten genannt hat, rufe create_room_reservation mit diesen Informationen auf!';
        prompt += '\nWICHTIG: Wenn User "reservar" sagt und alle Informationen vorhanden sind (Zimmer-Name, Daten, Name), rufe create_room_reservation direkt auf, frage NICHT nach Details!';
        prompt += '\nWICHTIG: Wenn User "ok, buchen" sagt und du bereits alle Informationen hast (Check-in, Check-out, Zimmer, Name), rufe create_room_reservation SOFORT auf!';
        prompt += '\nWICHTIG: Zeige NICHT nochmal Verfügbarkeit, wenn User bereits "buchen" oder "reservar" gesagt hat! Rufe direkt create_room_reservation auf!';
        prompt += '\nAntworte NICHT, dass du keinen Zugriff hast - nutze stattdessen die Function!';
        prompt += '\nWICHTIG: Wenn check_room_availability mehrere Zimmer zurückgibt, zeige ALLE Zimmer in der Antwort an!';
        prompt += '\nWICHTIG: Jedes Zimmer im Function-Ergebnis (rooms Array) muss in der Antwort erwähnt werden!';
        prompt += '\nWICHTIG: Wenn get_tours mehrere Touren zurückgibt, zeige ALLE Touren in der Antwort an!';
        return prompt;
    }
    /**
     * Erkennt Sprache aus Nachrichtentext (einfache Heuristik)
     */
    static detectLanguageFromMessage(message) {
        if (!message || message.trim().length === 0) {
            return null;
        }
        const text = message.toLowerCase();
        // Spanische Wörter/Zeichen
        const spanishIndicators = [
            /\b(hola|gracias|por favor|qué|cómo|dónde|cuándo|por qué|sí|no|buenos días|buenas tardes|buenas noches|adiós|hasta luego)\b/i,
            /[áéíóúñü]/,
            /\b(el|la|los|las|un|una|de|en|con|por|para|es|son|está|están)\b/i
        ];
        // Deutsche Wörter/Zeichen
        const germanIndicators = [
            /\b(hallo|guten tag|guten morgen|guten abend|danke|bitte|ja|nein|wie|wo|wann|warum|auf wiedersehen|tschüss)\b/i,
            /\b(haben|wir|heute|frei|zimmer|sind|gibt|gibt es|verfügbar|verfügbarkeit|buchung|reservierung|reservieren|buchen)\b/i,
            /\b(habt|hast|hat|seid|bist|ist|sind|werden|wird|kann|können|möchte|möchten|will|wollen)\b/i,
            /[äöüß]/,
            /\b(der|die|das|ein|eine|von|in|mit|für|ist|sind|sind)\b/i
        ];
        // Englische Wörter
        const englishIndicators = [
            /\b(hello|hi|thanks|thank you|please|yes|no|how|where|when|why|goodbye|bye|see you)\b/i,
            /\b(the|a|an|of|in|on|at|for|with|is|are|was|were)\b/i
        ];
        // Französische Wörter/Zeichen
        const frenchIndicators = [
            /\b(bonjour|bonsoir|merci|s'il vous plaît|oui|non|comment|où|quand|pourquoi|au revoir|à bientôt)\b/i,
            /[àâäéèêëïîôùûüÿç]/,
            /\b(le|la|les|un|une|de|du|des|dans|avec|pour|est|sont)\b/i
        ];
        // Zähle Treffer für jede Sprache
        let spanishScore = 0;
        let germanScore = 0;
        let englishScore = 0;
        let frenchScore = 0;
        spanishIndicators.forEach(pattern => {
            if (pattern.test(text))
                spanishScore++;
        });
        germanIndicators.forEach(pattern => {
            if (pattern.test(text))
                germanScore++;
        });
        englishIndicators.forEach(pattern => {
            if (pattern.test(text))
                englishScore++;
        });
        frenchIndicators.forEach(pattern => {
            if (pattern.test(text))
                frenchScore++;
        });
        // Finde Sprache mit höchstem Score
        const scores = [
            { lang: 'es', score: spanishScore },
            { lang: 'de', score: germanScore },
            { lang: 'en', score: englishScore },
            { lang: 'fr', score: frenchScore }
        ];
        scores.sort((a, b) => b.score - a.score);
        // Wenn höchster Score > 0, verwende diese Sprache
        if (scores[0].score > 0) {
            return scores[0].lang;
        }
        // Keine Sprache erkannt
        return null;
    }
    /**
     * Prüft ob KI für Branch aktiviert ist
     */
    static isAiEnabled(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const branch = yield prisma_1.prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { whatsappSettings: true }
                });
                if (!(branch === null || branch === void 0 ? void 0 : branch.whatsappSettings)) {
                    return false;
                }
                // Branch-Settings sind flach strukturiert, nicht verschachtelt
                const settings = branch.whatsappSettings;
                const whatsappSettings = settings; // Branch-Settings sind direkt WhatsApp Settings
                const aiConfig = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.ai;
                return (aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.enabled) === true;
            }
            catch (error) {
                console.error('[WhatsApp AI Service] Fehler beim Prüfen der KI-Aktivierung:', error);
                return false;
            }
        });
    }
}
exports.WhatsAppAiService = WhatsAppAiService;
//# sourceMappingURL=whatsappAiService.js.map