import axios from 'axios';
import { decryptApiSettings } from '../utils/encryption';
import { LanguageDetectionService } from './languageDetectionService';
import { prisma } from '../utils/prisma';
import { WhatsAppFunctionHandlers } from './whatsappFunctionHandlers';
import { logger } from '../utils/logger';
import { PromptBuilder } from './chatbot/PromptBuilder';

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
    conversationContext?: any,
    conversationId?: number
  ): Promise<AIResponse> {
    // Speichere conversationId im conversationContext für Function Handlers
    if (conversationId && conversationContext) {
      conversationContext.conversationId = conversationId;
    }
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
        logger.warn('[WhatsApp AI Service] Fehler beim Entschlüsseln von apiKey:', error);
      }
    }
    if (settings.apiSecret && typeof settings.apiSecret === 'string' && settings.apiSecret.includes(':')) {
      try {
        settings.apiSecret = decryptSecret(settings.apiSecret);
      } catch (error) {
        logger.warn('[WhatsApp AI Service] Fehler beim Entschlüsseln von apiSecret:', error);
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
        logger.log('[WhatsApp AI Service] Verwende Gäste-Gruppen-KI-Konfiguration');
      } else {
        // Fallback: Verwende normale AI-Konfiguration
        aiConfig = whatsappSettings?.ai;
        logger.log('[WhatsApp AI Service] Group ID stimmt nicht überein, verwende normale KI-Konfiguration');
      }
    } else {
      // Einzel-Chat: Verwende normale AI-Konfiguration
      aiConfig = whatsappSettings?.ai;
    }

    // DEBUG: Log AI-Konfiguration für Diagnose
    logger.log('[WhatsApp AI Service] AI-Konfiguration:', {
      branchId,
      hasWhatsappSettings: !!whatsappSettings,
      hasAiConfig: !!aiConfig,
      aiConfigEnabled: aiConfig?.enabled,
      aiConfigKeys: aiConfig ? Object.keys(aiConfig) : [],
      whatsappSettingsKeys: whatsappSettings ? Object.keys(whatsappSettings) : []
    });

    if (!aiConfig) {
      logger.error('[WhatsApp AI Service] KI-Konfiguration nicht gefunden:', {
        branchId,
        whatsappSettingsKeys: whatsappSettings ? Object.keys(whatsappSettings) : [],
        whatsappSettingsAi: whatsappSettings?.ai
      });
      throw new Error('KI-Konfiguration nicht gefunden für diesen Branch');
    }

    // Prüfe ob enabled explizit auf false gesetzt ist (undefined = aktiviert, false = deaktiviert)
    if (aiConfig.enabled === false) {
      logger.error('[WhatsApp AI Service] KI ist explizit deaktiviert:', {
        branchId,
        aiConfigEnabled: aiConfig.enabled,
        aiConfig: JSON.stringify(aiConfig, null, 2)
      });
      throw new Error('KI ist für diesen Branch nicht aktiviert');
    }
    
    // Wenn enabled undefined ist, behandeln wir es als aktiviert (Rückwärtskompatibilität)
    if (aiConfig.enabled === undefined) {
      logger.warn('[WhatsApp AI Service] KI enabled ist undefined, behandle als aktiviert (Rückwärtskompatibilität):', {
        branchId
      });
    }

    // 2. Erkenne Sprache aus Nachricht (primär) oder Telefonnummer (Fallback)
    const detectedLanguage = this.detectLanguageFromMessage(message);
    const phoneLanguage = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    // Verwende erkannte Sprache aus Nachricht, falls vorhanden, sonst Telefonnummer
    const language = detectedLanguage || phoneLanguage;
    
    logger.log('[WhatsApp AI Service] Spracherkennung:', {
      message: message.substring(0, 50),
      detectedFromMessage: detectedLanguage,
      detectedFromPhone: phoneLanguage,
      finalLanguage: language
    });

    // 3. Baue System Prompt (modularer PromptBuilder)
    const systemPrompt = PromptBuilder.buildPrompt(language, conversationContext, 'whatsapp', aiConfig);

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
      // Lade Message History (letzte 10 Nachrichten) falls conversationId vorhanden
      // WICHTIG: Prüfe zuerst, ob bereits eine Reservierung für diese Conversation existiert
      let messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
      if (conversationId) {
        try {
          // Prüfe, ob bereits eine Reservierung für diese Conversation existiert
          const existingReservation = await prisma.whatsAppMessage.findFirst({
            where: {
              conversationId: conversationId,
              branchId: branchId,
              reservationId: { not: null }
            },
            select: {
              reservationId: true,
              sentAt: true
            },
            orderBy: {
              sentAt: 'desc'
            }
          });

          if (existingReservation) {
            logger.log(`[WhatsApp AI Service] ⚠️ Bereits existierende Reservierung ${existingReservation.reservationId} für Conversation ${conversationId} gefunden. Filtere alte Buchungs-Nachrichten aus History.`);
          }

          // Prüfe Altersgrenze: Nur Nachrichten der letzten 24 Stunden
          const maxAge = new Date();
          maxAge.setHours(maxAge.getHours() - 24);

          const recentMessages = await prisma.whatsAppMessage.findMany({
            where: {
              conversationId: conversationId,
              branchId: branchId,
              sentAt: { gte: maxAge } // Nur Nachrichten der letzten 24 Stunden
            },
            orderBy: {
              sentAt: 'desc'
            },
            take: (aiConfig.model || 'gpt-4o').includes('gpt-4o') ? 10 : 5, // Weniger History für gpt-4 (8192 Tokens Limit)
            select: {
              direction: true,
              message: true,
              sentAt: true,
              reservationId: true
            }
          });
          
          // Konvertiere zu OpenAI-Format (neueste zuerst, dann umdrehen für chronologische Reihenfolge)
          // WICHTIG: Filtere Nachrichten, die zu einer bereits existierenden Reservierung gehören
          messageHistory = recentMessages
            .reverse() // Älteste zuerst
            .filter(msg => {
              // Wenn bereits eine Reservierung existiert, filtere Nachrichten mit reservationId
              if (existingReservation && msg.reservationId) {
                return false; // Filtere Nachrichten, die zu einer Reservierung gehören
              }
              return msg.message && msg.message.trim().length > 0; // Filtere leere Nachrichten
            })
            .map(msg => ({
              role: msg.direction === 'incoming' ? 'user' as const : 'assistant' as const,
              content: msg.message
            }));
          
          logger.log(`[WhatsApp AI Service] Message History geladen: ${messageHistory.length} Nachrichten (gefiltert: ${recentMessages.length - messageHistory.length} alte/Reservierungs-Nachrichten entfernt)`);
        } catch (historyError) {
          logger.error('[WhatsApp AI Service] Fehler beim Laden der Message History:', historyError);
          // Weiter ohne History
        }
      }
      
      // Erster API Call (mit Function Definitions, falls aktiviert)
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
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
      
      const requestPayload: any = {
        model: aiConfig.model || 'gpt-4o',
        messages: messages,
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
        logger.log('[WhatsApp AI Service] Function Calls erkannt:', responseMessage.tool_calls.length);
        
        // Führe Funktionen aus
        const toolResults = [];
        
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          
          logger.log('[WhatsApp AI Service] Führe Function aus:', {
            name: functionName,
            args: functionArgs
          });
          
          try {
            // Führe Function aus
            // WICHTIG: check_room_availability kann auch ohne userId aufgerufen werden
            // WICHTIG: Für create_room_reservation: Übergebe phoneNumber als Fallback für Kontaktdaten
            const functionParams: any[] = [
              functionArgs,
              conversationContext?.userId || null,
              conversationContext?.roleId || null,
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
            
            const result = await (WhatsAppFunctionHandlers as any)[functionName](...functionParams);
            
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify(result)
            });
            
            logger.log('[WhatsApp AI Service] Function Ergebnis:', {
              name: functionName,
              resultCount: Array.isArray(result) ? result.length : 1
            });
          } catch (error: any) {
            logger.error('[WhatsApp AI Service] Function Fehler:', {
              name: functionName,
              error: error.message
            });
            
            // WICHTIG: Übersetze Fehlermeldung in die erkannte Sprache
            let errorMessage = error.message;
            if (language === 'es') {
              // Übersetze häufige Fehlermeldungen ins Spanische
              if (errorMessage.includes('invalid input value for enum') && errorMessage.includes('potential')) {
                errorMessage = 'Error técnico: El estado "potential" no está disponible en la base de datos. Por favor, contacta al soporte.';
              } else if (errorMessage.includes('Der Name des Gastes ist erforderlich')) {
                errorMessage = 'El nombre del huésped es requerido para la reservación. Por favor, proporciona tu nombre completo.';
              } else if (errorMessage.includes('Mindestens eine Kontaktinformation')) {
                errorMessage = 'Se requiere al menos una información de contacto (número de teléfono o correo electrónico) para la reservación.';
              } else if (errorMessage.includes('Fehler beim Erstellen der Reservierung in LobbyPMS')) {
                errorMessage = 'Error al crear la reservación en LobbyPMS. Por favor, intenta de nuevo o contacta al soporte.';
              } else if (errorMessage.includes('categoryId ist erforderlich')) {
                errorMessage = 'Se requiere la categoría de la habitación. Por favor, selecciona una habitación específica de la lista.';
              }
            } else if (language === 'en') {
              // Übersetze häufige Fehlermeldungen ins Englische
              if (errorMessage.includes('invalid input value for enum') && errorMessage.includes('potential')) {
                errorMessage = 'Technical error: The "potential" status is not available in the database. Please contact support.';
              } else if (errorMessage.includes('Der Name des Gastes ist erforderlich')) {
                errorMessage = 'Guest name is required for the reservation. Please provide your full name.';
              } else if (errorMessage.includes('Mindestens eine Kontaktinformation')) {
                errorMessage = 'At least one contact information (phone number or email) is required for the reservation.';
              } else if (errorMessage.includes('Fehler beim Erstellen der Reservierung in LobbyPMS')) {
                errorMessage = 'Error creating reservation in LobbyPMS. Please try again or contact support.';
              } else if (errorMessage.includes('categoryId ist erforderlich')) {
                errorMessage = 'Room category is required. Please select a specific room from the list.';
              }
            }
            
            toolResults.push({
              tool_call_id: toolCall.id,
              role: 'tool',
              name: functionName,
              content: JSON.stringify({ error: errorMessage })
            });
          }
        }
        
        // Erneuter API Call mit Function Results
        // WICHTIG: Sprachanweisung explizit wiederholen, damit KI die richtige Sprache verwendet
        const languageInstruction = this.getLanguageInstruction(language);
        // Mehrfache Wiederholung der Sprachinstruktion für maximale Betonung
        const systemPromptWithLanguage = languageInstruction + '\n\n' + languageInstruction + '\n\n' + systemPrompt;
        
        // Erstelle Messages-Array mit History, aktueller Nachricht, Function Calls und Results
        const finalMessages: Array<any> = [
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
        
        const finalResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: aiConfig.model || 'gpt-4o',
            messages: finalMessages,
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
      logger.error('[WhatsApp AI Service] OpenAI API Fehler:', error);
      if (axios.isAxiosError(error)) {
        logger.error('[WhatsApp AI Service] Status:', error.response?.status);
        logger.error('[WhatsApp AI Service] Data:', error.response?.data);
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
          description: 'Erstellt oder bestätigt eine Zimmer-Reservation für den aktuellen Branch. WICHTIG: Nur für ZIMMER verwenden, NICHT für Touren! WICHTIG: Diese Function darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: checkInDate, checkOutDate, guestName (vollständiger Name), roomType, categoryId. WICHTIG: Wenn Daten fehlen (z.B. kein Name), rufe NICHT diese Function auf, sondern create_potential_reservation() und FRAGE dann nach fehlenden Daten! WICHTIG: Wenn bereits eine "potential" Reservation existiert, wird diese bestätigt (Status "potential" → "confirmed") und LobbyPMS-Buchung erstellt. Wenn keine "potential" Reservation existiert, wird eine neue Reservation erstellt. WICHTIG: Nutze Kontext aus vorherigen Nachrichten! Wenn User "heute" gesagt hat, verwende "today" als checkInDate. Wenn User Zimmer-Namen sagt (z.B. "la tia artista"), finde categoryId aus vorheriger check_room_availability Response. Benötigt: checkInDate, checkOutDate, guestName (ERFORDERLICH - vollständiger Name), roomType (compartida/privada), categoryId (optional, wird automatisch gefunden). Optional: guestPhone (optional, WhatsApp-Nummer als Fallback), guestEmail (optional). Generiert automatisch Payment Link und Check-in-Link (falls Email vorhanden). Setzt Payment-Deadline auf 1 Stunde. WICHTIG: Nach dem Aufruf dieser Function MUSS DU eine vollständige Nachricht generieren mit paymentLink, checkInLink (falls nicht null), Hinweis für 18:00 (NICHT 22:00!) und PIN-Code-Hinweis. Die Function sendet KEINE Nachricht automatisch - DU musst die Nachricht generieren!',
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
  private static getLanguageInstruction(language: string): string {
    const languageInstructions: Record<string, string> = {
      es: '=== KRITISCH: SPRACH-ANWEISUNG ===\n' +
          'DU MUSST IMMER UND AUSSCHLIESSLICH AUF SPANISCH ANTWORTEN!\n' +
          'Die gesamte Antwort muss vollständig auf Spanisch sein.\n' +
          'Verwende KEIN Deutsch, KEIN Englisch, NUR Spanisch.\n' +
          'Alle Texte, Erklärungen, Fragen und Antworten müssen auf Spanisch sein.\n' +
          'Auch wenn der System Prompt auf Deutsch ist, antworte IMMER auf Spanisch.\n' +
          'Wenn du Function Results interpretierst, erkläre sie auf Spanisch.\n' +
          'Wenn du Fragen stellst, stelle sie auf Spanisch.\n' +
          'Wenn du Fehler meldest, melde sie auf Spanisch.\n' +
          'ANTWORTE NUR AUF SPANISCH - KEINE AUSNAHME!\n' +
          '=== ENDE SPRACH-ANWEISUNG ===\n',
      de: '=== KRITISCH: SPRACH-ANWEISUNG ===\n' +
          'DU MUSST IMMER UND AUSSCHLIESSLICH AUF DEUTSCH ANTWORTEN!\n' +
          'Die gesamte Antwort muss vollständig auf Deutsch sein.\n' +
          'Verwende KEIN Spanisch, KEIN Englisch, NUR Deutsch.\n' +
          'Alle Texte, Erklärungen, Fragen und Antworten müssen auf Deutsch sein.\n' +
          'Auch wenn der System Prompt auf Deutsch ist, antworte IMMER auf Deutsch.\n' +
          'Wenn du Function Results interpretierst, erkläre sie auf Deutsch.\n' +
          'Wenn du Fragen stellst, stelle sie auf Deutsch.\n' +
          'Wenn du Fehler meldest, melde sie auf Deutsch.\n' +
          'ANTWORTE NUR AUF DEUTSCH - KEINE AUSNAHME!\n' +
          '=== ENDE SPRACH-ANWEISUNG ===\n',
      en: '=== CRITICAL: LANGUAGE INSTRUCTION ===\n' +
          'YOU MUST ALWAYS AND EXCLUSIVELY ANSWER IN ENGLISH!\n' +
          'The entire response must be completely in English.\n' +
          'Do NOT use German, do NOT use Spanish, ONLY English.\n' +
          'All texts, explanations, questions and answers must be in English.\n' +
          'Even if the system prompt is in German, ALWAYS answer in English.\n' +
          'IMPORTANT: If Function Results contain German terms (e.g. "Dorm-Zimmer", "Privates Zimmer", "Betten", "Zimmer"), ALWAYS translate them to English!\n' +
          'IMPORTANT: "Dorm-Zimmer" → "Shared rooms" or "Dorm rooms", "Privates Zimmer" → "Private rooms"\n' +
          'IMPORTANT: "Betten" → "beds", "Zimmer" → "rooms"\n' +
          'IMPORTANT: "compartida" → "shared", "privada" → "private"\n' +
          'When you interpret Function Results, explain them in English and translate ALL terms.\n' +
          'When you ask questions, ask them in English.\n' +
          'When you report errors, report them in English.\n' +
          'ANSWER ONLY IN ENGLISH - NO EXCEPTION!\n' +
          'TRANSLATE ALL GERMAN TERMS FROM FUNCTION RESULTS TO ENGLISH!\n' +
          '=== END LANGUAGE INSTRUCTION ===\n',
      fr: '=== CRITIQUE: INSTRUCTION DE LANGUE ===\n' +
          'TU DOIS TOUJOURS ET EXCLUSIVEMENT RÉPONDRE EN FRANÇAIS!\n' +
          'La réponse entière doit être complètement en français.\n' +
          'N\'utilise PAS l\'allemand, N\'utilise PAS l\'espagnol, UNIQUEMENT le français.\n' +
          'Tous les textes, explications, questions et réponses doivent être en français.\n' +
          'Même si le prompt système est en allemand, réponds TOUJOURS en français.\n' +
          'Quand tu interprètes les résultats de fonction, explique-les en français.\n' +
          'Quand tu poses des questions, pose-les en français.\n' +
          'Quand tu signales des erreurs, signale-les en français.\n' +
          'RÉPONDS UNIQUEMENT EN FRANÇAIS - AUCUNE EXCEPTION!\n' +
          '=== FIN INSTRUCTION DE LANGUE ===\n',
      it: '=== CRITICO: ISTRUZIONE LINGUISTICA ===\n' +
          'DEVI SEMPRE E ESCLUSIVAMENTE RISpondere IN ITALIANO!\n' +
          'L\'intera risposta deve essere completamente in italiano.\n' +
          'NON usare tedesco, NON usare spagnolo, SOLO italiano.\n' +
          'Tutti i testi, spiegazioni, domande e risposte devono essere in italiano.\n' +
          'Anche se il prompt di sistema è in tedesco, rispondi SEMPRE in italiano.\n' +
          'Quando interpreti i risultati delle funzioni, spiegalo in italiano.\n' +
          'Quando fai domande, fallo in italiano.\n' +
          'Quando segnali errori, segnalali in italiano.\n' +
          'RISpondi SOLO IN ITALIANO - NESSUNA ECCEZIONE!\n' +
          '=== FINE ISTRUZIONE LINGUISTICA ===\n',
      pt: '=== CRÍTICO: INSTRUÇÃO DE IDIOMA ===\n' +
          'VOCÊ DEVE SEMPRE E EXCLUSIVAMENTE RESPONDER EM PORTUGUÊS!\n' +
          'A resposta inteira deve ser completamente em português.\n' +
          'NÃO use alemão, NÃO use espanhol, APENAS português.\n' +
          'Todos os textos, explicações, perguntas e respostas devem estar em português.\n' +
          'Mesmo que o prompt do sistema esteja em alemão, responda SEMPRE em português.\n' +
          'Quando você interpreta resultados de função, explique-os em português.\n' +
          'Quando você faz perguntas, faça-as em português.\n' +
          'Quando você relata erros, relate-os em português.\n' +
          'RESPONDA APENAS EM PORTUGUÊS - SEM EXCEÇÃO!\n' +
          '=== FIM DA INSTRUÇÃO DE IDIOMA ===\n',
      zh: '=== 关键：语言指令 ===\n' +
          '你必须始终且仅用中文回答！\n' +
          '整个回答必须完全用中文。\n' +
          '不要使用德语，不要使用西班牙语，仅使用中文。\n' +
          '所有文本、解释、问题和答案都必须用中文。\n' +
          '即使系统提示是德语，也要始终用中文回答。\n' +
          '当你解释函数结果时，用中文解释。\n' +
          '当你提问时，用中文提问。\n' +
          '当你报告错误时，用中文报告。\n' +
          '仅用中文回答 - 无例外！\n' +
          '=== 语言指令结束 ===\n',
      ja: '=== 重要：言語指示 ===\n' +
          'あなたは常に日本語でのみ回答する必要があります！\n' +
          '回答全体は完全に日本語である必要があります。\n' +
          'ドイツ語を使用せず、スペイン語を使用せず、日本語のみを使用してください。\n' +
          'すべてのテキスト、説明、質問、回答は日本語である必要があります。\n' +
          'システムプロンプトがドイツ語であっても、常に日本語で回答してください。\n' +
          '関数結果を解釈する場合、日本語で説明してください。\n' +
          '質問をする場合、日本語で質問してください。\n' +
          'エラーを報告する場合、日本語で報告してください。\n' +
          '日本語でのみ回答してください - 例外なし！\n' +
          '=== 言語指示終了 ===\n',
      ko: '=== 중요: 언어 지시 ===\n' +
          '당신은 항상 한국어로만 답변해야 합니다!\n' +
          '전체 응답은 완전히 한국어여야 합니다.\n' +
          '독일어를 사용하지 말고, 스페인어를 사용하지 말고, 한국어만 사용하세요.\n' +
          '모든 텍스트, 설명, 질문 및 답변은 한국어여야 합니다.\n' +
          '시스템 프롬프트가 독일어라도 항상 한국어로 답변하세요.\n' +
          '함수 결과를 해석할 때 한국어로 설명하세요.\n' +
          '질문을 할 때 한국어로 질문하세요.\n' +
          '오류를 보고할 때 한국어로 보고하세요.\n' +
          '한국어로만 답변하세요 - 예외 없음!\n' +
          '=== 언어 지시 종료 ===\n',
      hi: '=== महत्वपूर्ण: भाषा निर्देश ===\n' +
          'आपको हमेशा और विशेष रूप से हिंदी में उत्तर देना चाहिए!\n' +
          'पूरा उत्तर पूरी तरह से हिंदी में होना चाहिए।\n' +
          'जर्मन का उपयोग न करें, स्पेनिश का उपयोग न करें, केवल हिंदी।\n' +
          'सभी पाठ, स्पष्टीकरण, प्रश्न और उत्तर हिंदी में होने चाहिए।\n' +
          'भले ही सिस्टम प्रॉम्प्ट जर्मन में हो, हमेशा हिंदी में उत्तर दें।\n' +
          'जब आप फ़ंक्शन परिणामों की व्याख्या करते हैं, तो उन्हें हिंदी में समझाएं।\n' +
          'जब आप प्रश्न पूछते हैं, तो उन्हें हिंदी में पूछें।\n' +
          'जब आप त्रुटियों की रिपोर्ट करते हैं, तो उन्हें हिंदी में रिपोर्ट करें।\n' +
          'केवल हिंदी में उत्तर दें - कोई अपवाद नहीं!\n' +
          '=== भाषा निर्देश समाप्त ===\n',
      ru: '=== КРИТИЧЕСКИ ВАЖНО: ЯЗЫКОВАЯ ИНСТРУКЦИЯ ===\n' +
          'ВЫ ДОЛЖНЫ ВСЕГДА И ИСКЛЮЧИТЕЛЬНО ОТВЕЧАТЬ НА РУССКОМ ЯЗЫКЕ!\n' +
          'Весь ответ должен быть полностью на русском языке.\n' +
          'НЕ используйте немецкий, НЕ используйте испанский, ТОЛЬКО русский.\n' +
          'Все тексты, объяснения, вопросы и ответы должны быть на русском языке.\n' +
          'Даже если системный промпт на немецком, ВСЕГДА отвечайте на русском.\n' +
          'Когда вы интерпретируете результаты функций, объясняйте их на русском.\n' +
          'Когда вы задаете вопросы, задавайте их на русском.\n' +
          'Когда вы сообщаете об ошибках, сообщайте их на русском.\n' +
          'ОТВЕЧАЙТЕ ТОЛЬКО НА РУССКОМ ЯЗЫКЕ - БЕЗ ИСКЛЮЧЕНИЙ!\n' +
          '=== КОНЕЦ ЯЗЫКОВОЙ ИНСТРУКЦИИ ===\n',
      tr: '=== KRİTİK: DİL TALİMATI ===\n' +
          'HER ZAMAN VE YALNIZCA TÜRKÇE CEVAP VERMELİSİNİZ!\n' +
          'Tüm cevap tamamen Türkçe olmalıdır.\n' +
          'Almanca kullanmayın, İspanyolca kullanmayın, YALNIZCA Türkçe.\n' +
          'Tüm metinler, açıklamalar, sorular ve cevaplar Türkçe olmalıdır.\n' +
          'Sistem istemi Almanca olsa bile, HER ZAMAN Türkçe cevap verin.\n' +
          'Fonksiyon sonuçlarını yorumlarken, Türkçe açıklayın.\n' +
          'Soru sorarken, Türkçe sorun.\n' +
          'Hataları bildirirken, Türkçe bildirin.\n' +
          'YALNIZCA TÜRKÇE CEVAP VERİN - İSTİSNA YOK!\n' +
          '=== DİL TALİMATI SONU ===\n',
      ar: '=== حرج: تعليمات اللغة ===\n' +
          'يجب عليك دائمًا وحصريًا الإجابة بالعربية!\n' +
          'يجب أن تكون الإجابة بأكملها بالعربية تمامًا.\n' +
          'لا تستخدم الألمانية، لا تستخدم الإسبانية، العربية فقط.\n' +
          'يجب أن تكون جميع النصوص والتفسيرات والأسئلة والإجابات بالعربية.\n' +
          'حتى لو كان مطالبة النظام بالألمانية، أجب دائمًا بالعربية.\n' +
          'عند تفسير نتائج الوظائف، اشرحها بالعربية.\n' +
          'عند طرح الأسئلة، اطرحها بالعربية.\n' +
          'عند الإبلاغ عن الأخطاء، أبلغ عنها بالعربية.\n' +
          'أجب بالعربية فقط - لا استثناء!\n' +
          '=== نهاية تعليمات اللغة ===\n'
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
    
    // Beginne mit Sprachanweisung (mehrfach für maximale Betonung)
    let prompt = languageInstruction + '\n\n';
    prompt += languageInstruction + '\n\n'; // Wiederholung für maximale Betonung
    
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
    prompt += '  WICHTIG: Rufe diese Function NICHT mehrfach auf, wenn bereits Verfügbarkeitsinformationen vorhanden sind!\n';
    prompt += '  WICHTIG: Wenn der User bereits ein Zimmer ausgewählt hat (z.B. "ja, el tia artista"), rufe diese Function NICHT erneut auf!\n';
    prompt += '  WICHTIG: Zeige ALLE verfügbaren Zimmer aus dem Function-Ergebnis an, nicht nur einige!\n';
    prompt += '  WICHTIG: Jedes Zimmer im Function-Ergebnis muss in der Antwort erwähnt werden!\n';
    prompt += '  WICHTIG: Wenn User nur "heute" sagt, verwende startDate: "today" und lasse endDate leer (zeigt nur heute, nicht heute+morgen)!\n';
    prompt += '  WICHTIG: Wenn User nur "morgen" sagt, verwende startDate: "tomorrow" und lasse endDate leer (zeigt nur morgen)!\n';
    prompt += '  WICHTIG: Terminologie beachten - IMMER in der erkannten Sprache!\n';
    if (language === 'es') {
      prompt += '    - Bei compartida: Verwende "camas" (beds), NICHT "habitaciones"!\n';
      prompt += '    - Bei privada: Verwende "habitaciones" (rooms), NICHT "camas"!\n';
      prompt += '    - Beispiel compartida: "4 camas disponibles" oder "1 cama disponible"\n';
      prompt += '    - Beispiel privada: "1 habitación disponible" oder "2 habitaciones disponibles"\n';
      prompt += '    - Kategorien: "Habitaciones compartidas" (nicht "Dorm-Zimmer") und "Habitaciones privadas" (nicht "Privates Zimmer")\n';
    } else if (language === 'en') {
      prompt += '    - Bei compartida: Verwende "beds", NICHT "rooms"!\n';
      prompt += '    - Bei privada: Verwende "rooms", NICHT "beds"!\n';
      prompt += '    - Beispiel compartida: "4 beds available" oder "1 bed available"\n';
      prompt += '    - Beispiel privada: "1 room available" oder "2 rooms available"\n';
      prompt += '    - Kategorien: "Shared rooms" (nicht "Dorm-Zimmer") und "Private rooms" (nicht "Privates Zimmer")\n';
    } else {
      prompt += '    - Bei compartida: Verwende "Betten", NICHT "Zimmer"!\n';
      prompt += '    - Bei privada: Verwende "Zimmer", NICHT "Betten"!\n';
      prompt += '    - Beispiel compartida: "4 Betten verfügbar" oder "1 Bett verfügbar"\n';
      prompt += '    - Beispiel privada: "1 Zimmer verfügbar" oder "2 Zimmer verfügbar"\n';
      prompt += '    - Kategorien: "Dorm-Zimmer" (compartida) und "Privates Zimmer" (privada)\n';
    }
    prompt += '  WICHTIG: Übersetze ALLE Begriffe aus Function Results in die erkannte Sprache!\n';
    prompt += '  WICHTIG: Wenn Function Results "Dorm-Zimmer" oder "Privates Zimmer" enthalten, übersetze diese IMMER!\n';
    prompt += '  WICHTIG: Wenn Function Results einen Fehler enthalten (error-Feld), erkläre den Fehler in der erkannten Sprache und gib hilfreiche Anweisungen!\n';
    prompt += '  WICHTIG: Bei Fehlern in Function Results: Erkläre den Fehler auf ' + (language === 'es' ? 'Spanisch' : language === 'en' ? 'Englisch' : 'Deutsch') + ' und gib dem User hilfreiche Anweisungen, was zu tun ist!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "tienen habitacion para hoy?" → check_room_availability({ startDate: "today" })\n';
    prompt += '    - "Haben wir Zimmer frei morgen?" → check_room_availability({ startDate: "tomorrow" })\n';
    prompt += '    - "Haben wir Zimmer frei vom 1.2. bis 3.2.?" → check_room_availability({ startDate: "2025-02-01", endDate: "2025-02-03" })\n';
    prompt += '    - "gibt es Dorm-Zimmer frei?" → check_room_availability({ startDate: "today", roomType: "compartida" })\n';
    prompt += '    - "¿tienen habitaciones privadas disponibles?" → check_room_availability({ startDate: "today", roomType: "privada" })\n';
    
    // Tour-Funktionen - IMMER verfügbar (auch für Gäste)
    prompt += '\n- get_tours: Hole verfügbare Touren (type, availableFrom, availableTo, limit)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User nach Touren fragt!\n';
    prompt += '  WICHTIG: Diese Function zeigt eine Liste aller verfügbaren Touren\n';
    prompt += '  KRITISCH: Bei get_tours() NUR Flyer-Bilder senden, ABSOLUT KEINEN Text!\n';
    prompt += '  KRITISCH: Jede Tour hat ein imageUrl-Feld - verwende dieses als Flyer-Bild!\n';
    prompt += '  KRITISCH: Format für Flyer-Bilder: ![Tour-Titel](/api/tours/{tourId}/image) - verwende IMMER /api/tours/{tourId}/image als URL!\n';
    prompt += '  KRITISCH: Deine Antwort muss NUR Markdown-Bildreferenzen enthalten, KEINEN anderen Text!\n';
    prompt += '  KRITISCH: Beispiel für get_tours() Antwort: ![Comuna 13](/api/tours/1/image)\\n![Guatapé](/api/tours/2/image)\\n![Tour 3](/api/tours/3/image)\n';
    prompt += '  KRITISCH: KEINE Tour-Namen als Text, KEINE Beschreibungen, KEINE Preise - NUR die Bildreferenzen!\n';
    prompt += '  KRITISCH: Der Text wird automatisch nach den Bildern hinzugefügt, du musst NICHTS schreiben!\n';
    prompt += '  KRITISCH: Wenn User bereits eine Tour gewählt hat (z.B. "die 2.", "guatape", "tour 2"), rufe diese Function NICHT nochmal auf!\n';
    prompt += '  KRITISCH: Wenn User nach get_tours() eine Tour wählt, rufe stattdessen book_tour() auf!\n';
    prompt += '  KRITISCH: Liste NICHT alle Touren nochmal auf, wenn User bereits eine Tour gewählt hat!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "welche touren gibt es?" → get_tours({})\n';
    prompt += '    - "zeige mir alle touren" → get_tours({})\n';
    prompt += '    - "¿qué tours tienen disponibles?" → get_tours({})\n';
    prompt += '    - User sagt "die 2." nach get_tours() → NICHT get_tours() nochmal, sondern book_tour()!\n';
    prompt += '\n- get_tour_details: Hole detaillierte Informationen zu einer Tour (tourId)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User Details zu einer spezifischen Tour wissen möchte!\n';
    prompt += '  WICHTIG: Diese Function gibt imageUrl (Hauptbild) und galleryUrls (Galerie-Bilder) zurück!\n';
    prompt += '  KRITISCH: Bei get_tour_details() NUR Bilder senden (Hauptbild + alle Galerie-Bilder), ABSOLUT KEINEN Text!\n';
    prompt += '  KRITISCH: Wenn imageUrl vorhanden ist, füge IMMER das Hauptbild ein: ![Tour-Name](imageUrl)\n';
    prompt += '  KRITISCH: Wenn galleryUrls vorhanden sind, füge ALLE Galerie-Bilder ein: ![Bild 1](galleryUrls[0])\\n![Bild 2](galleryUrls[1])\\n![Bild 3](galleryUrls[2])\n';
    prompt += '  KRITISCH: Format für Bilder: ![Tour-Titel](/api/tours/{tourId}/image) und ![Galerie-Bild](/api/tours/{tourId}/gallery/{index})\n';
    prompt += '  KRITISCH: Deine Antwort muss NUR Markdown-Bildreferenzen enthalten, KEINEN anderen Text!\n';
    prompt += '  KRITISCH: Beispiel für get_tour_details() Antwort: ![Guatapé](/api/tours/2/image)\\n![Galerie 1](/api/tours/2/gallery/0)\\n![Galerie 2](/api/tours/2/gallery/1)\n';
    prompt += '  KRITISCH: KEINE Tour-Namen als Text, KEINE Beschreibungen, KEINE Details - NUR die Bildreferenzen!\n';
    prompt += '  KRITISCH: Der Text wird automatisch nach den Bildern hinzugefügt, du musst NICHTS schreiben!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "zeige mir details zu tour 1" → get_tour_details({ tourId: 1 })\n';
    prompt += '    - "was ist in tour 5 inkludiert?" → get_tour_details({ tourId: 5 })\n';
    prompt += '    - "gibt es bilder zu tour 2?" → get_tour_details({ tourId: 2 })\n';
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
    prompt += '  KRITISCH: Wenn User nach get_tours() eine Tour wählt (z.B. "die 2.", "guatape", "tour 2"), rufe SOFORT book_tour() auf, NICHT get_tours() nochmal!\n';
    prompt += '  KRITISCH: NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!\n';
    prompt += '  KRITISCH: Wenn User "die 2. guatape. für morgen" sagt, hat er eine Tour gewählt → rufe book_tour() auf, liste NICHT alle Touren nochmal auf!\n';
    prompt += '  Beispiele:\n';
    prompt += '    - "ich möchte tour 1 für morgen buchen" → book_tour({ tourId: 1, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
    prompt += '    - "reservar tour 3 para mañana" → book_tour({ tourId: 3, tourDate: "tomorrow", numberOfParticipants: 1, customerName: "Juan Pérez", customerEmail: "juan@example.com" })\n';
    prompt += '    - "die 2., guatape. für morgen. für 2 personen" → book_tour({ tourId: 2, tourDate: "tomorrow", numberOfParticipants: 2, customerName: "Max Mustermann", customerPhone: "+573001234567" })\n';
    prompt += '    - User sagt "die 2." nach get_tours() → tourId=2 (aus vorheriger Response), rufe book_tour() auf, NICHT get_tours() nochmal!\n';
    prompt += '    - User sagt "Guatapé" → finde tourId aus get_tours() Response (z.B. tourId=2), rufe book_tour() auf, NICHT get_tours() nochmal!\n';
    
    // Zimmer-Buchung - IMMER verfügbar (auch für Gäste)
    prompt += '\n- create_room_reservation: Erstelle eine Zimmer-Reservation (checkInDate, checkOutDate, guestName, roomType, categoryId optional)\n';
    prompt += '  WICHTIG: Verwende diese Function wenn der User ein ZIMMER buchen möchte (NICHT für Touren)!\n';
    prompt += '  WICHTIG: Unterscheide klar zwischen ZIMMER (create_room_reservation) und TOUREN (book_tour)!\n';
    prompt += '  WICHTIG: Wenn der User "reservar", "buchen", "buche", "buche mir", "reservame", "ich möchte buchen", "ich möchte reservieren", "quiero reservar", "quiero hacer una reserva" sagt → create_room_reservation!\n';
    prompt += '  WICHTIG: Wenn User "buche [Zimmer-Name]" oder "quiero reservar [Zimmer-Name]" sagt (z.B. "buche el abuelo viajero", "quiero reservar una doble estándar"), erkenne dies als Buchungsanfrage!\n';
    prompt += '  WICHTIG: Wenn User "buche [Zimmer-Name] von [Datum] auf [Datum] für [Name]" sagt, hat er ALLE Informationen - rufe SOFORT create_room_reservation auf!\n';
    prompt += '  WICHTIG: Wenn User einen Zimmer-Namen sagt (z.B. "doble estándar", "apartamento doble", "primo deportista"), erkenne dies IMMER als Zimmer-Name aus der Verfügbarkeitsliste, NICHT als sozialen Begriff!\n';
    prompt += '  WICHTIG: Zimmer-Namen aus Verfügbarkeitsliste: "doble estándar", "doble básica", "doble deluxe", "apartamento doble", "apartamento singular", "apartaestudio", "primo deportista", "el primo aventurero", "la tia artista", "el abuelo viajero"!\n';
    prompt += '  WICHTIG: Terminologie - Wenn du Dorm-Zimmer (compartida) auflistest, verwende "Dorm-Zimmer" oder "Schlafsaal" in der Frage, NICHT "Bett"! Beispiel: "Welches Dorm-Zimmer möchten Sie buchen?" oder "Welchen Schlafsaal möchten Sie buchen?" statt "welches Bett"!\n';
    prompt += '  WICHTIG: Wenn der User eine Nummer wählt (z.B. "2.") nach Verfügbarkeitsanzeige → create_room_reservation mit categoryId!\n';
    prompt += '  WICHTIG: Wenn der User einen Zimmer-Namen sagt (z.B. "la tia artista", "el primo aventurero", "el abuelo viajero") → finde die categoryId aus der vorherigen check_room_availability Response!\n';
    prompt += '  WICHTIG: Wenn User in vorheriger Nachricht "heute" gesagt hat → verwende "today" als checkInDate!\n';
    prompt += '  WICHTIG: Wenn User "von heute auf morgen" sagt → checkInDate="today", checkOutDate="tomorrow"!\n';
    prompt += '  WICHTIG: Wenn User "para mañana" + "1 noche" sagt, dann: checkInDate="tomorrow", checkOutDate="day after tomorrow"!\n';
    prompt += '  WICHTIG: Wenn User "04/12" oder "04.12" sagt, erkenne dies als Datum (04. Dezember, aktuelles Jahr)!\n';
    prompt += '  WICHTIG: Wenn User nach Buchung Daten gibt (z.B. "01.dez bis 02.dez") → rufe create_room_reservation auf, NICHT check_room_availability!\n';
    prompt += '  WICHTIG: Alle Reservierungen sind Branch-spezifisch (Branch wird automatisch aus Context verwendet)\n';
    prompt += '  WICHTIG: Reservierungsablauf - KRITISCH BEACHTEN:\n';
    prompt += '    1. Wenn User erste Buchungsinformationen gibt (Check-in, Check-out, Zimmer) ABER noch nicht ALLE Daten hat (z.B. kein Name, keine categoryId) → rufe create_potential_reservation() auf\n';
    prompt += '    2. FRAGE IMMER nach fehlenden Daten (z.B. "Wie lautet Ihr vollständiger Name?" oder "Für welches Zimmer möchten Sie buchen?")\n';
    prompt += '    3. create_room_reservation() darf NUR aufgerufen werden, wenn ALLE erforderlichen Daten vorhanden sind: checkInDate, checkOutDate, guestName (vollständiger Name), roomType, categoryId\n';
    prompt += '    4. Wenn guestName fehlt → rufe create_potential_reservation() auf und FRAGE nach dem Namen!\n';
    prompt += '    5. Wenn categoryId fehlt → rufe create_potential_reservation() auf und FRAGE nach dem Zimmer!\n';
    prompt += '  WICHTIG: create_potential_reservation() erstellt sofort eine Reservation mit Status "potential" (ohne LobbyPMS-Buchung, guestName optional)\n';
    prompt += '  WICHTIG: create_room_reservation() ändert Status von "potential" auf "confirmed" (keine neue Reservation) und erstellt LobbyPMS-Buchung (guestName ERFORDERLICH!)\n';
    prompt += '  WICHTIG: Payment-Link wird mit Betrag + 5% erstellt (automatisch in boldPaymentService)\n';
    prompt += '  WICHTIG: Wenn User direkt ALLE Daten gibt (Check-in, Check-out, Zimmer, Name) → rufe SOFORT create_room_reservation() auf (keine "potential" Reservation nötig)\n';
    prompt += '  WICHTIG: NIEMALS create_room_reservation() aufrufen, wenn guestName fehlt! Immer erst create_potential_reservation() und dann nachfragen!\n';
    prompt += '  WICHTIG: Nach create_room_reservation() - KRITISCH BEACHTEN:\n';
    prompt += '    1. Das Return-Objekt enthält: paymentLink, checkInLink (kann null sein), checkInDate, checkOutDate, guestName, amount, currency\n';
    prompt += '    2. DU MUSST eine vollständige Nachricht generieren mit:\n';
    prompt += '       - Reservierungsbestätigung (Gast-Name, Zimmer, Check-in/Check-out Datum)\n';
    prompt += '       - Payment-Link (immer vorhanden, aus paymentLink)\n';
    prompt += '       - Check-in-Link (nur wenn checkInLink nicht null ist!)\n';
    prompt += '       - Hinweis: "Falls Ankunft nach 18:00 (NICHT 22:00!), bitte Check-in-Link vor Ankunft erledigen, damit PIN-Code zugesendet wird"\n';
    prompt += '       - Zahlungsfrist: "Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Reservierung automatisch storniert"\n';
    prompt += '    3. Verwende IMMER 18:00 (NICHT 22:00!) für den Ankunfts-Hinweis!\n';
    prompt += '    4. Wenn checkInLink null ist, erwähne den Check-in-Link NICHT in der Nachricht!\n';
    prompt += '    5. Die Nachricht muss in der erkannten Sprache sein (Spanisch/Deutsch/Englisch)\n';
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
    prompt += '\nWICHTIG: Fehlerbehandlung - Wenn Zimmer-Name nicht in Verfügbarkeitsliste gefunden wird, frage: "Dieses Zimmer ist nicht verfügbar. Möchten Sie ein anderes Zimmer wählen?" und zeige verfügbare Alternativen!';
    prompt += '\nWICHTIG: Wenn User in vorheriger Nachricht "heute" gesagt hat, verwende "today" als checkInDate!';
    prompt += '\nWICHTIG: Wenn User nach einer Buchungsanfrage Daten gibt (z.B. "01.dez bis 02.dez"), prüfe ob ALLE Daten vorhanden sind. Wenn Name fehlt → create_potential_reservation() und FRAGE nach Name!';
    prompt += '\nWICHTIG: Beispiel: User sagt "apartamento doble para el 7. de diciembre entonces. 1 noche" → Name fehlt! → rufe create_potential_reservation() auf und FRAGE: "Wie lautet Ihr vollständiger Name?"';
    prompt += '\n\n=== KRITISCH: KONTEXT-NUTZUNG ===';
    prompt += '\nWICHTIG: Du MUSST ALLE Informationen aus der aktuellen UND vorherigen Nachrichten nutzen!';
    prompt += '\nWICHTIG: Effizienz - Prüfe IMMER zuerst, ob alle Informationen bereits im Context vorhanden sind, bevor du nachfragst! Kombiniere alle verfügbaren Informationen aus Context und aktueller Nachricht!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "heute" gesagt hat, verwende es IMMER als checkInDate!';
    prompt += '\nWICHTIG: Datumsbestätigung - Wenn User "heute" sagt, bestätige das konkrete Datum explizit in deiner Antwort! Beispiel: "Gerne, für den [Datum]. Welche Art von Zimmer suchen Sie?"';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "checkin 02.12. und checkout 03.12." gesagt hat, verwende diese Daten IMMER!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht einen Zimmer-Namen gesagt hat (z.B. "el abuelo viajero"), behalte diesen IMMER im Kontext!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht "dorm" oder "privada" gesagt hat, behalte diese Information IMMER!';
    prompt += '\nWICHTIG: Wenn User in einer vorherigen Nachricht einen Namen gesagt hat (z.B. "Patrick Ammann"), verwende diesen als guestName!';
    prompt += '\nWICHTIG: Namensabfrage optimieren - Wenn Name bereits im Context vorhanden ist (z.B. User hat "Patrick Ammann" in vorheriger Nachricht gesagt), frage: "Ist Patrick Ammann Ihr vollständiger Name?" statt "Wie lautet Ihr vollständiger Name?"!';
    prompt += '\nWICHTIG: Wenn User den bereits genannten Namen bestätigt (z.B. "ja" oder "genau"), verwende diesen Namen direkt für die Buchung, frage NICHT nochmal!';
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
    prompt += '\nKRITISCH: Wenn User nach get_tours() eine Tour wählt (z.B. "die 2.", "guatape", "tour 2"), rufe SOFORT book_tour() auf, NICHT get_tours() nochmal!';
    prompt += '\nKRITISCH: NIEMALS get_tours() nochmal aufrufen, wenn User bereits eine Tour gewählt hat!';
    prompt += '\nKRITISCH: Liste NICHT alle Touren nochmal auf, wenn User bereits eine Tour gewählt hat!';
    prompt += '\nKRITISCH: Wenn User "die 2. guatape. für morgen" sagt, hat er eine Tour gewählt → rufe book_tour() auf, liste NICHT alle Touren nochmal auf!';
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
    prompt += '\nWICHTIG: Wenn get_tours mehrere Touren zurückgibt, sende ALLE Flyer-Bilder (ein Bild pro Tour)!';

    return prompt;
  }

  /**
   * Erkennt Sprache aus Nachrichtentext (einfache Heuristik)
   * WICHTIG: Public, damit andere Services diese Funktion nutzen können
   */
  static detectLanguageFromMessage(message: string): string | null {
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
      /\b(hello|hi|thanks|thank you|please|yes|no|how|where|when|why|what|which|goodbye|bye|see you)\b/i,
      /\b(the|a|an|of|in|on|at|for|with|is|are|was|were|do|does|did|have|has|had|you|your|tours|tour|available)\b/i,
      /\b(can|could|would|should|will|want|need|show|tell|give|get|see|book|reserve|reservation)\b/i
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
      logger.log(`[detectLanguageFromMessage] Sprache erkannt: ${scores[0].lang} (Score: ${scores[0].score}, alle Scores: es=${spanishScore}, de=${germanScore}, en=${englishScore}, fr=${frenchScore})`);
      return scores[0].lang;
    }
    
    // Keine Sprache erkannt
    logger.log(`[detectLanguageFromMessage] Keine Sprache erkannt für: "${message.substring(0, 50)}"`);
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
      logger.error('[WhatsApp AI Service] Fehler beim Prüfen der KI-Aktivierung:', error);
      return false;
    }
  }
}

