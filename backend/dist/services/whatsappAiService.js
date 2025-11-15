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
exports.WhatsAppAiService = void 0;
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const encryption_1 = require("../utils/encryption");
const languageDetectionService_1 = require("./languageDetectionService");
const prisma = new client_1.PrismaClient();
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
            var _a, _b, _c;
            // 1. Lade Branch und KI-Konfiguration
            const branch = yield prisma.branch.findUnique({
                where: { id: branchId },
                select: { whatsappSettings: true }
            });
            if (!(branch === null || branch === void 0 ? void 0 : branch.whatsappSettings)) {
                throw new Error('Branch WhatsApp Settings nicht gefunden');
            }
            const settings = (0, encryption_1.decryptApiSettings)(branch.whatsappSettings);
            const whatsappSettings = (settings === null || settings === void 0 ? void 0 : settings.whatsapp) || settings; // Falls direkt WhatsApp Settings
            const aiConfig = whatsappSettings === null || whatsappSettings === void 0 ? void 0 : whatsappSettings.ai;
            if (!(aiConfig === null || aiConfig === void 0 ? void 0 : aiConfig.enabled)) {
                throw new Error('KI ist für diesen Branch nicht aktiviert');
            }
            // 2. Erkenne Sprache aus Telefonnummer
            const language = languageDetectionService_1.LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
            // 3. Baue System Prompt
            const systemPrompt = this.buildSystemPrompt(aiConfig, language, conversationContext);
            // 4. Rufe OpenAI API auf
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY nicht gesetzt');
            }
            try {
                const response = yield axios_1.default.post('https://api.openai.com/v1/chat/completions', {
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
                    temperature: (_a = aiConfig.temperature) !== null && _a !== void 0 ? _a : 0.7,
                    max_tokens: aiConfig.maxTokens || 500
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    timeout: 30000
                });
                const aiMessage = response.data.choices[0].message.content;
                return {
                    message: aiMessage,
                    language
                };
            }
            catch (error) {
                console.error('[WhatsApp AI Service] OpenAI API Fehler:', error);
                if (axios_1.default.isAxiosError(error)) {
                    console.error('[WhatsApp AI Service] Status:', (_b = error.response) === null || _b === void 0 ? void 0 : _b.status);
                    console.error('[WhatsApp AI Service] Data:', (_c = error.response) === null || _c === void 0 ? void 0 : _c.data);
                }
                throw new Error('Fehler bei der KI-Antwort-Generierung');
            }
        });
    }
    /**
     * Baut System Prompt aus Konfiguration
     */
    static buildSystemPrompt(aiConfig, language, conversationContext) {
        let prompt = aiConfig.systemPrompt || 'Du bist ein hilfreicher Assistent.';
        // Füge Regeln hinzu
        if (aiConfig.rules && aiConfig.rules.length > 0) {
            prompt += '\n\nRegeln:\n';
            aiConfig.rules.forEach((rule, index) => {
                prompt += `${index + 1}. ${rule}\n`;
            });
        }
        // Füge Sprachanweisung hinzu
        const languageInstructions = {
            es: 'Antworte auf Spanisch.',
            de: 'Antworte auf Deutsch.',
            en: 'Answer in English.',
            fr: 'Réponds en français.',
            it: 'Rispondi in italiano.',
            pt: 'Responda em português.',
            zh: '用中文回答。',
            ja: '日本語で答えてください。',
            ko: '한국어로 답변하세요.',
            hi: 'हिंदी में उत्तर दें।',
            ru: 'Отвечай на русском языке.',
            tr: 'Türkçe cevap ver.',
            ar: 'أجب بالعربية.'
        };
        const languageInstruction = languageInstructions[language] || languageInstructions.es;
        prompt += `\n${languageInstruction}`;
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
        return prompt;
    }
    /**
     * Prüft ob KI für Branch aktiviert ist
     */
    static isAiEnabled(branchId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const branch = yield prisma.branch.findUnique({
                    where: { id: branchId },
                    select: { whatsappSettings: true }
                });
                if (!(branch === null || branch === void 0 ? void 0 : branch.whatsappSettings)) {
                    return false;
                }
                const settings = (0, encryption_1.decryptApiSettings)(branch.whatsappSettings);
                const whatsappSettings = (settings === null || settings === void 0 ? void 0 : settings.whatsapp) || settings;
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