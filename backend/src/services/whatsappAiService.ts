import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { decryptApiSettings } from '../utils/encryption';
import { LanguageDetectionService } from './languageDetectionService';

const prisma = new PrismaClient();

export interface AIResponse {
  message: string;
  language: string;
}

export interface AIConfig {
  enabled?: boolean;
  model?: string;
  systemPrompt?: string;
  rules?: string[];
  sources?: string[];
  temperature?: number;
  maxTokens?: number;
}

/**
 * WhatsApp AI Service
 * 
 * Generiert KI-Antworten basierend auf Branch-Konfiguration und OpenAI GPT-4o
 */
export class WhatsAppAiService {
  /**
   * Generiert KI-Antwort basierend auf Nachricht und Branch-Konfiguration
   */
  static async generateResponse(
    message: string,
    branchId: number,
    phoneNumber: string,
    conversationContext?: any
  ): Promise<AIResponse> {
    // 1. Lade Branch und KI-Konfiguration
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { whatsappSettings: true }
    });

    if (!branch?.whatsappSettings) {
      throw new Error('Branch WhatsApp Settings nicht gefunden');
    }

    // Branch-Settings sind flach strukturiert (apiKey direkt), nicht verschachtelt (whatsapp.apiKey)
    // Entschlüssele nur apiKey und apiSecret, nicht das gesamte Objekt
    const { decryptSecret } = await import('../utils/encryption');
    const settings = branch.whatsappSettings as any;
    
    // Entschlüssele apiKey und apiSecret falls verschlüsselt
    if (settings.apiKey && typeof settings.apiKey === 'string' && settings.apiKey.includes(':')) {
      try {
        settings.apiKey = decryptSecret(settings.apiKey);
      } catch (error) {
        console.warn('[WhatsApp AI Service] Fehler beim Entschlüsseln von apiKey:', error);
      }
    }
    if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
      try {
        settings.apiSecret = decryptSecret(settings.apiSecret);
      } catch (error) {
        console.warn('[WhatsApp AI Service] Fehler beim Entschlüsseln von apiSecret:', error);
      }
    }
    
    const whatsappSettings = settings; // Branch-Settings sind direkt WhatsApp Settings
    const aiConfig: AIConfig = whatsappSettings?.ai;

    if (!aiConfig?.enabled) {
      throw new Error('KI ist für diesen Branch nicht aktiviert');
    }

    // 2. Erkenne Sprache aus Nachricht (primär) oder Telefonnummer (Fallback)
    const detectedLanguage = this.detectLanguageFromMessage(message);
    const phoneLanguage = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
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

    // 4. Rufe OpenAI API auf
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY nicht gesetzt');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
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
          temperature: aiConfig.temperature ?? 0.7,
          max_tokens: aiConfig.maxTokens || 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          timeout: 30000
        }
      );

      const aiMessage = response.data.choices[0].message.content;

      return {
        message: aiMessage,
        language
      };
    } catch (error) {
      console.error('[WhatsApp AI Service] OpenAI API Fehler:', error);
      if (axios.isAxiosError(error)) {
        console.error('[WhatsApp AI Service] Status:', error.response?.status);
        console.error('[WhatsApp AI Service] Data:', error.response?.data);
      }
      throw new Error('Fehler bei der KI-Antwort-Generierung');
    }
  }

  /**
   * Baut System Prompt aus Konfiguration
   */
  private static buildSystemPrompt(
    aiConfig: AIConfig,
    language: string,
    conversationContext?: any
  ): string {
    // WICHTIG: Sprachanweisung GANZ AN DEN ANFANG setzen für maximale Priorität
    const languageInstructions: Record<string, string> = {
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
    
    const languageInstruction = languageInstructions[language] || languageInstructions.es;
    
    // Beginne mit Sprachanweisung
    let prompt = languageInstruction + '\n\n';
    
    // Dann System Prompt
    prompt += aiConfig.systemPrompt || 'Du bist ein hilfreicher Assistent.';

    // Füge Regeln hinzu
    if (aiConfig.rules && aiConfig.rules.length > 0) {
      prompt += '\n\nRegeln:\n';
      aiConfig.rules.forEach((rule: string, index: number) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }

    // Füge Quellen/Context hinzu (falls vorhanden)
    if (aiConfig.sources && aiConfig.sources.length > 0) {
      prompt += '\n\nVerfügbare Quellen für Informationen:\n';
      aiConfig.sources.forEach((source: string, index: number) => {
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
   * Erkennt Sprache aus Nachrichtentext (einfache Heuristik)
   */
  private static detectLanguageFromMessage(message: string): string | null {
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
      if (pattern.test(text)) spanishScore++;
    });
    
    germanIndicators.forEach(pattern => {
      if (pattern.test(text)) germanScore++;
    });
    
    englishIndicators.forEach(pattern => {
      if (pattern.test(text)) englishScore++;
    });
    
    frenchIndicators.forEach(pattern => {
      if (pattern.test(text)) frenchScore++;
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
  static async isAiEnabled(branchId: number): Promise<boolean> {
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { whatsappSettings: true }
      });

      if (!branch?.whatsappSettings) {
        return false;
      }

      // Branch-Settings sind flach strukturiert, nicht verschachtelt
      const settings = branch.whatsappSettings as any;
      const whatsappSettings = settings; // Branch-Settings sind direkt WhatsApp Settings
      const aiConfig: AIConfig = whatsappSettings?.ai;

      return aiConfig?.enabled === true;
    } catch (error) {
      console.error('[WhatsApp AI Service] Fehler beim Prüfen der KI-Aktivierung:', error);
      return false;
    }
  }
}

