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

    const settings = decryptApiSettings(branch.whatsappSettings as any);
    const whatsappSettings = settings?.whatsapp || settings; // Falls direkt WhatsApp Settings
    const aiConfig: AIConfig = whatsappSettings?.ai;

    if (!aiConfig?.enabled) {
      throw new Error('KI ist für diesen Branch nicht aktiviert');
    }

    // 2. Erkenne Sprache aus Telefonnummer
    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);

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
    let prompt = aiConfig.systemPrompt || 'Du bist ein hilfreicher Assistent.';

    // Füge Regeln hinzu
    if (aiConfig.rules && aiConfig.rules.length > 0) {
      prompt += '\n\nRegeln:\n';
      aiConfig.rules.forEach((rule: string, index: number) => {
        prompt += `${index + 1}. ${rule}\n`;
      });
    }

    // Füge Sprachanweisung hinzu
    const languageInstructions: Record<string, string> = {
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

      const settings = decryptApiSettings(branch.whatsappSettings as any);
      const whatsappSettings = settings?.whatsapp || settings;
      const aiConfig: AIConfig = whatsappSettings?.ai;

      return aiConfig?.enabled === true;
    } catch (error) {
      console.error('[WhatsApp AI Service] Fehler beim Prüfen der KI-Aktivierung:', error);
      return false;
    }
  }
}

