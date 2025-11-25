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
    static generateResponse(message, branchId, phoneNumber, conversationContext) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e;
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
            // 4. Prüfe ob Function Calling aktiviert werden soll (nur für Mitarbeiter, nicht für Gäste)
            const isEmployee = !!(conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.userId);
            const functionDefinitions = isEmployee ? this.getFunctionDefinitions() : [];
            // 5. Rufe OpenAI API auf
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY nicht gesetzt');
            }
            try {
                // Erster API Call (mit Function Definitions, falls aktiviert)
                const requestPayload = {
                    model: aiConfig.model || 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: message
                        }
                    ],
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
                            const result = yield whatsappFunctionHandlers_1.WhatsAppFunctionHandlers[functionName](functionArgs, conversationContext.userId, conversationContext.roleId, branchId);
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
                    const finalResponse = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
                        model: aiConfig.model || 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: systemPromptWithLanguage
                            },
                            {
                                role: 'user',
                                content: message
                            },
                            {
                                role: 'assistant',
                                content: null,
                                tool_calls: responseMessage.tool_calls
                            },
                            ...toolResults,
                            {
                                role: 'user',
                                content: `WICHTIG: Antworte auf ${language === 'de' ? 'Deutsch' : language === 'es' ? 'Spanisch' : language === 'en' ? 'Englisch' : 'der erkannten Sprache'}. Die Function Results sind in JSON-Format, aber deine Antwort muss in der korrekten Sprache sein.`
                            }
                        ],
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
        // Füge Informationen zu verfügbaren Funktionen hinzu (nur für Mitarbeiter)
        if (conversationContext === null || conversationContext === void 0 ? void 0 : conversationContext.userId) {
            prompt += '\n\nVerfügbare Funktionen:\n';
            prompt += '- get_requests: Hole Requests basierend auf Filtern (status, dueDate)\n';
            prompt += '- get_todos: Hole Todos/Tasks basierend auf Filtern (status, dueDate)\n';
            prompt += '- get_worktime: Hole Arbeitszeiten für einen User (date, startDate, endDate)\n';
            prompt += '- get_cerebro_articles: Hole Cerebro-Artikel basierend auf Suchbegriffen oder Tags\n';
            prompt += '- get_user_info: Hole User-Informationen (Name, Email, Rollen)\n';
            prompt += '\nVerwende diese Funktionen, wenn der User nach spezifischen Daten fragt.';
            prompt += '\nBeispiel: "solicitudes abiertas de hoy" → get_requests({ status: "approval", dueDate: "today" })';
            prompt += '\nBeispiel: "wie lange habe ich heute gearbeitet" → get_worktime({ date: "today" })';
            prompt += '\nBeispiel: "welche cerebro artikel gibt es zu notfällen" → get_cerebro_articles({ tags: ["notfall"] })';
        }
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