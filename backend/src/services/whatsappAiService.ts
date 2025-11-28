import axios from 'axios';
import { decryptApiSettings } from '../utils/encryption';
import { LanguageDetectionService } from './languageDetectionService';
import { prisma } from '../utils/prisma';
import { WhatsAppFunctionHandlers } from './whatsappFunctionHandlers';

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
    
    // 2. Prüfe ob es eine Gruppen-Nachricht ist
    const groupId = conversationContext?.groupId;
    const isGroupMessage = !!groupId;
    
    // 3. Wähle entsprechende KI-Konfiguration
    let aiConfig: AIConfig;
    
    if (isGroupMessage && whatsappSettings?.guestGroup?.ai) {
      // Gruppen-Nachricht: Verwende guestGroup.ai Konfiguration
      const guestGroupId = whatsappSettings.guestGroup.groupId;
      
      // Prüfe ob groupId mit konfigurierter Group ID übereinstimmt
      if (guestGroupId && guestGroupId === groupId) {
        aiConfig = whatsappSettings.guestGroup.ai;
        console.log('[WhatsApp AI Service] Verwende Gäste-Gruppen-KI-Konfiguration');
      } else {
        // Fallback: Verwende normale AI-Konfiguration
        aiConfig = whatsappSettings?.ai;
        console.log('[WhatsApp AI Service] Group ID stimmt nicht überein, verwende normale KI-Konfiguration');
      }
    } else {
      // Einzel-Chat: Verwende normale AI-Konfiguration
      aiConfig = whatsappSettings?.ai;
    }

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

    // 4. Prüfe ob Function Calling aktiviert werden soll
    // WICHTIG: check_room_availability sollte auch für Gäste verfügbar sein!
    const isEmployee = !!conversationContext?.userId;
    // Für Zimmerverfügbarkeit: Function auch für Gäste aktivieren
    const functionDefinitions = this.getFunctionDefinitions();

    // 5. Rufe OpenAI API auf
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY nicht gesetzt');
    }

    try {
      // Erster API Call (mit Function Definitions, falls aktiviert)
      const requestPayload: any = {
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
      };

      // Füge Function Definitions hinzu, falls aktiviert
      if (functionDefinitions.length > 0) {
        requestPayload.tools = functionDefinitions;
        requestPayload.tool_choice = 'auto'; // KI entscheidet, ob Functions aufgerufen werden sollen
      }

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          timeout: 30000
        }
      );

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
            const result = await (WhatsAppFunctionHandlers as any)[functionName](
              functionArgs,
              conversationContext?.userId || null,
              conversationContext?.roleId || null,
              branchId
            );
            
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
          } catch (error: any) {
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
        
        const finalResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
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
        
        const finalMessage = finalResponse.data.choices[0].message.content;
        
        return {
          message: finalMessage,
          language
        };
      } else {
        // Keine Function Calls, direkte Antwort
        return {
          message: responseMessage.content,
          language
        };
      }
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
   * Gibt Function Definitions für OpenAI Function Calling zurück
   */
  private static getFunctionDefinitions(): any[] {
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
                description: 'Check-in Datum im Format YYYY-MM-DD oder "today"/"heute"/"hoy" für heute (erforderlich). Verwende IMMER "today" wenn der User "heute" sagt!'
              },
              endDate: {
                type: 'string',
                description: 'Check-out Datum im Format YYYY-MM-DD oder "today"/"heute"/"hoy" für heute (optional, falls nicht angegeben: startDate + 1 Tag)'
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
          description: 'Erstellt eine Tour-Reservation/Buchung. Generiert automatisch Payment Link und setzt Zahlungsfrist (1 Stunde). Wenn Zahlung nicht innerhalb der Frist erfolgt, wird die Buchung automatisch storniert. Benötigt: tourId, tourDate, numberOfParticipants, customerName, und mindestens eine Kontaktinformation (customerPhone oder customerEmail).',
          parameters: {
            type: 'object',
            properties: {
              tourId: {
                type: 'number',
                description: 'ID der Tour (erforderlich)'
              },
              tourDate: {
                type: 'string',
                description: 'Datum der Tour (ISO-Format, z.B. "2025-01-27T10:00:00Z" oder "2025-01-27")'
              },
              numberOfParticipants: {
                type: 'number',
                description: 'Anzahl Teilnehmer (erforderlich)'
              },
              customerName: {
                type: 'string',
                description: 'Name des Kunden (erforderlich)'
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
      }
    ];
  }

  /**
   * Gibt Sprachanweisung für eine bestimmte Sprache zurück
   */
  private static getLanguageInstruction(language: string): string {
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
    
    return languageInstructions[language] || languageInstructions.es;
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
    const languageInstruction = this.getLanguageInstruction(language);
    
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

    // Füge Informationen zu verfügbaren Funktionen hinzu
    // WICHTIG: check_room_availability und Tour-Funktionen sind für ALLE verfügbar (auch Gäste)!
    prompt += '\n\nVerfügbare Funktionen:\n';
    
    // Zimmerverfügbarkeit - IMMER verfügbar
    prompt += '- check_room_availability: Prüfe Zimmerverfügbarkeit für einen Zeitraum (startDate, endDate, roomType)\n';
    prompt += '  WICHTIG: Verwende IMMER diese Function wenn der User nach Zimmerverfügbarkeit fragt!\n';
    prompt += '  WICHTIG: Zeige ALLE verfügbaren Zimmer aus dem Function-Ergebnis an, nicht nur einige!\n';
    prompt += '  WICHTIG: Jedes Zimmer im Function-Ergebnis muss in der Antwort erwähnt werden!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "tienen habitacion para hoy?" → check_room_availability({ startDate: "today" })\n';
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
    prompt += '  Beispiele:\n';
    prompt += '    - "ich möchte tour 1 für morgen buchen" → book_tour({ tourId: 1, tourDate: "2025-01-27T10:00:00Z", numberOfParticipants: 2, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
    prompt += '    - "reservar tour 3 para mañana" → book_tour({ tourId: 3, tourDate: "2025-01-27", numberOfParticipants: 1, customerName: "Juan Pérez", customerEmail: "juan@example.com" })\n';
    
    // Andere Funktionen - nur für Mitarbeiter
    if (conversationContext?.userId) {
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
    prompt += '\nAntworte NICHT, dass du keinen Zugriff hast - nutze stattdessen die Function!';
    prompt += '\nWICHTIG: Wenn check_room_availability mehrere Zimmer zurückgibt, zeige ALLE Zimmer in der Antwort an!';
    prompt += '\nWICHTIG: Jedes Zimmer im Function-Ergebnis (rooms Array) muss in der Antwort erwähnt werden!';
    prompt += '\nWICHTIG: Wenn get_tours mehrere Touren zurückgibt, zeige ALLE Touren in der Antwort an!';

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

