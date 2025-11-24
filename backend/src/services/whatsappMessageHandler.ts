import { WhatsAppAiService } from './whatsappAiService';
import { LanguageDetectionService } from './languageDetectionService';
import { WhatsAppService } from './whatsappService';
import { WhatsAppGuestService } from './whatsappGuestService';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/prisma';

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
export class WhatsAppMessageHandler {
  /**
   * Verarbeitet eingehende WhatsApp-Nachricht
   */
  static async handleIncomingMessage(
    phoneNumber: string,
    messageText: string,
    branchId: number,
    mediaUrl?: string,
    groupId?: string
  ): Promise<string> {
    try {
      // 1. Normalisiere Telefonnummer
      const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
      console.log('[WhatsApp Message Handler] Telefonnummer:', {
        original: phoneNumber,
        normalized: normalizedPhone
      });

      // 2. Identifiziere User via phoneNumber
      const user = await this.identifyUser(normalizedPhone, branchId);
      console.log('[WhatsApp Message Handler] User-Identifikation:', {
        phoneNumber: normalizedPhone,
        branchId: branchId,
        userFound: !!user,
        userId: user?.id,
        userName: user ? `${user.firstName} ${user.lastName}` : null
      });

      // 2.5. Lade User mit Rollen (für Function Calling)
      let userWithRoles = null;
      let roleId: number | null = null;
      
      if (user) {
        try {
          userWithRoles = await prisma.user.findUnique({
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
            userId: userWithRoles?.id,
            rolesCount: userWithRoles?.roles?.length || 0,
            roles: userWithRoles?.roles?.map(r => ({ roleId: r.roleId, name: r.role.name })) || []
          });
          
          if (userWithRoles?.roles && userWithRoles.roles.length > 0) {
            roleId = userWithRoles.roles[0].roleId;
            console.log('[WhatsApp Message Handler] roleId gesetzt:', roleId);
          } else {
            console.error('[WhatsApp Message Handler] ⚠️ WARNUNG: User hat KEINE Rollen!', {
              userId: user.id,
              userName: `${user.firstName} ${user.lastName}`
            });
            // Fallback: Versuche alle Rollen zu laden (ohne select-Beschränkung)
            const userWithAllRoles = await prisma.user.findUnique({
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
            
            if (userWithAllRoles?.roles && userWithAllRoles.roles.length > 0) {
              roleId = userWithAllRoles.roles[0].roleId;
              console.log('[WhatsApp Message Handler] Fallback: roleId aus include-Query:', roleId);
            }
          }
        } catch (error) {
          console.error('[WhatsApp Message Handler] Fehler beim Laden der Rollen:', error);
        }
      }

      // 3. Lade/Erstelle Conversation State
      const conversation = await this.getOrCreateConversation(normalizedPhone, branchId, user?.id);

      // 4. Prüfe Keywords
      const normalizedText = messageText.toLowerCase().trim();
      
      // Keyword: "requests" - Liste aller Requests
      if (normalizedText === 'requests') {
        if (user) {
          return await this.handleRequestsKeyword(user.id, branchId, conversation);
        }
        return await this.getLanguageResponse(branchId, normalizedPhone, 'requests_require_auth');
      }

      // Keyword: "todos" / "to do's" - Liste aller Tasks (PLURAL für Liste)
      if (normalizedText === 'todos' || normalizedText === 'to do\'s' || normalizedText === 'to dos') {
        if (user) {
          return await this.handleTodosKeyword(user.id, branchId, conversation);
        }
        return await this.getLanguageResponse(branchId, normalizedPhone, 'todos_require_auth');
      }

      // Keyword: "request" - Starte Request-Erstellung (SINGULAR für Erstellung)
      if (normalizedText === 'request' && conversation.state === 'idle') {
        if (!user) {
          return await this.getLanguageResponse(branchId, normalizedPhone, 'request_creation_require_auth');
        }
        return await this.startRequestCreation(normalizedPhone, branchId, conversation);
      }

      // Keyword: "todo" - Starte Task-Erstellung (SINGULAR für Erstellung)
      if (normalizedText === 'todo' && conversation.state === 'idle') {
        if (!user) {
          return await this.getLanguageResponse(branchId, normalizedPhone, 'task_creation_require_auth');
        }
        return await this.startTaskCreation(normalizedPhone, branchId, conversation);
      }

      // Keyword: "code" / "código" / "pin" / "password" - Gast-Code-Versand
      const codeKeywords = ['code', 'código', 'codigo', 'pin', 'password', 'verloren', 'lost', 'perdido', 'acceso'];
      if (codeKeywords.includes(normalizedText) && conversation.state === 'idle') {
        return await this.handleGuestCodeRequest(normalizedPhone, branchId, conversation);
      }

      // 5. Prüfe Conversation State (für mehrstufige Interaktionen)
      if (conversation.state !== 'idle') {
        // Prüfe ob es Gast-Identifikation ist
        if (conversation.state.startsWith('guest_identification')) {
          return await this.continueGuestIdentification(normalizedPhone, messageText, conversation, branchId);
        }
        return await this.continueConversation(normalizedPhone, branchId, messageText, mediaUrl, conversation, user);
      }

      // 6. KI-Antwort generieren (falls kein Keyword und kein aktiver State)
      try {
        // Erweitere Conversation Context mit Rollen für Function Calling
        const conversationContext: any = {
          userId: user?.id,
          roleId: roleId,
          userName: userWithRoles ? `${userWithRoles.firstName} ${userWithRoles.lastName}` : null,
          conversationState: conversation.state,
          groupId: groupId
        };
        
        const aiResponse = await WhatsAppAiService.generateResponse(
          messageText,
          branchId,
          normalizedPhone,
          conversationContext
        );
        return aiResponse.message;
      } catch (error) {
        console.error('[WhatsApp Message Handler] KI-Fehler:', error);
        return await this.getLanguageResponse(branchId, normalizedPhone, 'ai_error');
      }
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler:', error);
      return await this.getLanguageResponse(branchId, phoneNumber, 'error');
    }
  }

  /**
   * Identifiziert User via Telefonnummer
   */
  private static async identifyUser(phoneNumber: string, branchId: number): Promise<any | null> {
    try {
      console.log('[WhatsApp Message Handler] Suche User:', { phoneNumber, branchId });
      
      // Normalisiere Telefonnummer für Suche (verschiedene Formate)
      const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
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
      let user = await prisma.user.findFirst({
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
      const userWithBranches = await prisma.user.findFirst({
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
      } else {
        console.warn('[WhatsApp Message Handler] Kein User gefunden für Telefonnummer:', phoneNumber);
        
        // Debug: Zeige alle User mit ähnlichen Telefonnummern
        const allUsers = await prisma.user.findMany({
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
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei User-Identifikation:', error);
      if (error instanceof Error) {
        console.error('[WhatsApp Message Handler] Fehlermeldung:', error.message);
        console.error('[WhatsApp Message Handler] Stack:', error.stack);
      }
      return null;
    }
  }

  /**
   * Lädt oder erstellt Conversation
   */
  private static async getOrCreateConversation(
    phoneNumber: string,
    branchId: number,
    userId?: number
  ): Promise<any> {
    try {
      let conversation = await prisma.whatsAppConversation.findUnique({
        where: {
          phoneNumber_branchId: {
            phoneNumber: phoneNumber,
            branchId: branchId
          }
        }
      });

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            phoneNumber: phoneNumber,
            branchId: branchId,
            userId: userId || null,
            state: 'idle'
          }
        });
      } else {
        // Update lastMessageAt und userId (falls geändert)
        conversation = await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { 
            lastMessageAt: new Date(),
            userId: userId || conversation.userId
          }
        });
      }

      return conversation;
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei Conversation:', error);
      throw error;
    }
  }

  /**
   * Verarbeitet Keyword "requests"
   */
  private static async handleRequestsKeyword(
    userId: number,
    branchId: number,
    conversation: any
  ): Promise<string> {
    try {
      const requests = await prisma.request.findMany({
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

      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(conversation.phoneNumber);
      
      const translations: Record<string, any> = {
        es: {
          title: '📋 Tus Requests:',
          none: 'No tienes requests.',
          item: (r: any) => {
            const statusMap: Record<string, string> = {
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
          item: (r: any) => {
            const statusMap: Record<string, string> = {
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
          item: (r: any) => {
            const statusMap: Record<string, string> = {
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
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei Requests:', error);
      return await this.getLanguageResponse(conversation.branchId, conversation.phoneNumber, 'error');
    }
  }

  /**
   * Verarbeitet Keyword "todos"
   */
  private static async handleTodosKeyword(
    userId: number,
    branchId: number,
    conversation: any
  ): Promise<string> {
    try {
      const tasks = await prisma.task.findMany({
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

      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(conversation.phoneNumber);
      
      const translations: Record<string, any> = {
        es: {
          title: '✅ Tus To-Dos:',
          none: 'No tienes to-dos.',
          item: (t: any) => {
            const statusMap: Record<string, string> = {
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
          item: (t: any) => {
            const statusMap: Record<string, string> = {
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
          item: (t: any) => {
            const statusMap: Record<string, string> = {
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
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei Todos:', error);
      return await this.getLanguageResponse(conversation.branchId, conversation.phoneNumber, 'error');
    }
  }

  /**
   * Startet Request-Erstellung
   */
  private static async startRequestCreation(
    phoneNumber: string,
    branchId: number,
    conversation: any
  ): Promise<string> {
    try {
      // Setze State auf "request_creation"
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          state: 'request_creation',
          context: { step: 'waiting_for_responsible' }
        }
      });

      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
      
      const translations: Record<string, string> = {
        es: 'Para quién es este request? (Escribe el nombre o ID del usuario)',
        de: 'Für wen ist dieser Request? (Schreibe den Namen oder die ID des Benutzers)',
        en: 'For whom is this request? (Write the name or ID of the user)'
      };

      return translations[language] || translations.es;
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler beim Starten der Request-Erstellung:', error);
      return await this.getLanguageResponse(branchId, phoneNumber, 'error');
    }
  }

  /**
   * Startet Task-Erstellung
   */
  private static async startTaskCreation(
    phoneNumber: string,
    branchId: number,
    conversation: any
  ): Promise<string> {
    try {
      // Setze State auf "task_creation"
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          state: 'task_creation',
          context: { step: 'waiting_for_responsible' }
        }
      });

      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
      
      const translations: Record<string, string> = {
        es: 'Para quién es este to-do? (Escribe el nombre o ID del usuario)',
        de: 'Für wen ist dieser To-Do? (Schreibe den Namen oder die ID des Benutzers)',
        en: 'For whom is this to-do? (Write the name or ID of the user)'
      };

      return translations[language] || translations.es;
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler beim Starten der Task-Erstellung:', error);
      return await this.getLanguageResponse(branchId, phoneNumber, 'error');
    }
  }

  /**
   * Setzt Conversation fort (für mehrstufige Interaktionen)
   */
  private static async continueConversation(
    phoneNumber: string,
    branchId: number,
    messageText: string,
    mediaUrl: string | undefined,
    conversation: any,
    user: any
  ): Promise<string> {
    try {
      const context = conversation.context as any || {};
      const step = context.step || '';

      // Request-Erstellung
      if (conversation.state === 'request_creation') {
        if (step === 'waiting_for_responsible') {
          // Suche User nach Name oder ID
          const responsibleUser = await this.findUserByNameOrId(messageText, branchId);
          
          if (!responsibleUser) {
            const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
            const translations: Record<string, string> = {
              es: 'Usuario no encontrado. Por favor, escribe el nombre completo o ID del usuario.',
              de: 'Benutzer nicht gefunden. Bitte schreibe den vollständigen Namen oder die ID des Benutzers.',
              en: 'User not found. Please write the full name or ID of the user.'
            };
            return translations[language] || translations.es;
          }

          // Update Context
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              context: {
                step: 'waiting_for_description',
                responsibleId: responsibleUser.id,
                responsibleName: `${responsibleUser.firstName} ${responsibleUser.lastName}`
              }
            }
          });

          const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
          const translations: Record<string, string> = {
            es: `Usuario encontrado: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\n¿Qué quieres solicitar? (Escribe la descripción o envía una imagen)`,
            de: `Benutzer gefunden: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWas möchtest du anfragen? (Schreibe die Beschreibung oder sende ein Bild)`,
            en: `User found: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWhat do you want to request? (Write the description or send an image)`
          };
          return translations[language] || translations.es;
        }

        if (step === 'waiting_for_description') {
          // Erstelle Request
          if (!user) {
            return await this.getLanguageResponse(branchId, phoneNumber, 'error');
          }

          const responsibleId = context.responsibleId;
          let description = messageText || 'Request via WhatsApp';

          // Hole Branch für organizationId
          const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { organizationId: true }
          });

          const request = await prisma.request.create({
            data: {
              title: `Request de ${user.firstName} ${user.lastName}`,
              description: description,
              status: 'approval',
              type: 'other',
              isPrivate: false,
              requesterId: user.id,
              responsibleId: responsibleId,
              branchId: branchId,
              organizationId: branch?.organizationId || null
            }
          });

          // Lade und speichere Media, falls vorhanden
          if (mediaUrl) {
            try {
              console.log(`[WhatsApp Message Handler] Lade Media ${mediaUrl} für Request ${request.id}...`);
              
              const whatsappService = await WhatsAppService.getServiceForBranch(branchId);
              const mediaData = await whatsappService.downloadMedia(mediaUrl);

              // Speichere Media als RequestAttachment
              const UPLOAD_DIR = path.join(__dirname, '../../uploads/request-attachments');
              if (!fs.existsSync(UPLOAD_DIR)) {
                fs.mkdirSync(UPLOAD_DIR, { recursive: true });
              }

              const uniqueFileName = `${uuidv4()}${path.extname(mediaData.fileName)}`;
              const filePath = path.join(UPLOAD_DIR, uniqueFileName);

              fs.writeFileSync(filePath, mediaData.buffer);

              const attachment = await prisma.requestAttachment.create({
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
              
              await prisma.request.update({
                where: { id: request.id },
                data: {
                  description: description + markdownImageLink
                }
              });
            } catch (error) {
              console.error(`[WhatsApp Message Handler] Fehler beim Herunterladen/Speichern von Media:`, error);
              // Weiter ohne Media - Request wurde bereits erstellt
            }
          }

          // Reset Conversation State
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              state: 'idle',
              context: null
            }
          });

          const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
          const translations: Record<string, string> = {
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
          const responsibleUser = await this.findUserByNameOrId(messageText, branchId);
          
          if (!responsibleUser) {
            const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
            const translations: Record<string, string> = {
              es: 'Usuario no encontrado. Por favor, escribe el nombre completo o ID del usuario.',
              de: 'Benutzer nicht gefunden. Bitte schreibe den vollständigen Namen oder die ID des Benutzers.',
              en: 'User not found. Please write the full name or ID of the user.'
            };
            return translations[language] || translations.es;
          }

          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              context: {
                step: 'waiting_for_description',
                responsibleId: responsibleUser.id,
                responsibleName: `${responsibleUser.firstName} ${responsibleUser.lastName}`
              }
            }
          });

          const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
          const translations: Record<string, string> = {
            es: `Usuario encontrado: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\n¿Qué to-do quieres crear? (Escribe la descripción)`,
            de: `Benutzer gefunden: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWelchen To-Do möchtest du erstellen? (Schreibe die Beschreibung)`,
            en: `User found: ${responsibleUser.firstName} ${responsibleUser.lastName}\n\nWhat to-do do you want to create? (Write the description)`
          };
          return translations[language] || translations.es;
        }

        if (step === 'waiting_for_description') {
          if (!user) {
            return await this.getLanguageResponse(branchId, phoneNumber, 'error');
          }

          const responsibleId = context.responsibleId;
          let description = messageText || 'Task via WhatsApp';

          // Hole Quality Control User (erster Admin oder Verantwortlicher)
          const qualityControlUser = await prisma.user.findFirst({
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
          }) || await prisma.user.findFirst({
            where: {
              branches: {
                some: { branchId: branchId }
              }
            }
          });

          if (!qualityControlUser) {
            return await this.getLanguageResponse(branchId, phoneNumber, 'error');
          }

          // Hole Branch für organizationId
          const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { organizationId: true }
          });

          const task = await prisma.task.create({
            data: {
              title: `To-Do de ${user.firstName} ${user.lastName}`,
              description: description,
              status: 'open',
              responsibleId: responsibleId,
              qualityControlId: qualityControlUser.id,
              branchId: branchId,
              organizationId: branch?.organizationId || null
            }
          });

          // Lade und speichere Media, falls vorhanden
          if (mediaUrl) {
            try {
              console.log(`[WhatsApp Message Handler] Lade Media ${mediaUrl} für Task ${task.id}...`);
              
              const whatsappService = await WhatsAppService.getServiceForBranch(branchId);
              const mediaData = await whatsappService.downloadMedia(mediaUrl);

              // Speichere Media als TaskAttachment
              const UPLOAD_DIR_TASK = path.join(__dirname, '../../uploads/task-attachments');
              if (!fs.existsSync(UPLOAD_DIR_TASK)) {
                fs.mkdirSync(UPLOAD_DIR_TASK, { recursive: true });
              }

              const uniqueFileName = `${uuidv4()}${path.extname(mediaData.fileName)}`;
              const filePath = path.join(UPLOAD_DIR_TASK, uniqueFileName);

              fs.writeFileSync(filePath, mediaData.buffer);

              const attachment = await prisma.taskAttachment.create({
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
              
              await prisma.task.update({
                where: { id: task.id },
                data: {
                  description: description + markdownImageLink
                }
              });
            } catch (error) {
              console.error(`[WhatsApp Message Handler] Fehler beim Herunterladen/Speichern von Media:`, error);
              // Weiter ohne Media - Task wurde bereits erstellt
            }
          }

          // Reset Conversation State
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              state: 'idle',
              context: null
            }
          });

          const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
          const translations: Record<string, string> = {
            es: `✅ To-Do creado exitosamente!\n\nID: ${task.id}\nTítulo: ${task.title}\nEstado: Abierto`,
            de: `✅ To-Do erfolgreich erstellt!\n\nID: ${task.id}\nTitel: ${task.title}\nStatus: Offen`,
            en: `✅ To-do created successfully!\n\nID: ${task.id}\nTitle: ${task.title}\nStatus: Open`
          };
          return translations[language] || translations.es;
        }
      }

      // Unbekannter State - reset
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: { state: 'idle', context: null }
      });

      return await this.getLanguageResponse(branchId, phoneNumber, 'unknown_state');
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei Conversation-Continuation:', error);
      // Reset State bei Fehler
      try {
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { state: 'idle', context: null }
        });
      } catch {}
      return await this.getLanguageResponse(branchId, phoneNumber, 'error');
    }
  }

  /**
   * Findet User nach Name oder ID
   */
  private static async findUserByNameOrId(searchTerm: string, branchId: number): Promise<any | null> {
    try {
      // Versuche zuerst als ID zu parsen
      const userId = parseInt(searchTerm, 10);
      if (!isNaN(userId)) {
        const user = await prisma.user.findFirst({
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
        if (user) return user;
      }

      // Suche nach Name
      const searchLower = searchTerm.toLowerCase();
      const users = await prisma.user.findMany({
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
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei User-Suche:', error);
      return null;
    }
  }

  /**
   * Holt sprachspezifische Antwort
   */
  private static async getLanguageResponse(
    branchId: number,
    phoneNumber: string,
    key: string
  ): Promise<string> {
    const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
    
    const responses: Record<string, Record<string, string>> = {
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

    return responses[key]?.[language] || responses[key]?.es || 'Error';
  }

  /**
   * Verarbeitet Gast-Code-Anfrage
   */
  private static async handleGuestCodeRequest(
    phoneNumber: string,
    branchId: number,
    conversation: any
  ): Promise<string> {
    try {
      // Versuche zuerst via Telefonnummer zu identifizieren
      const reservation = await WhatsAppGuestService.identifyGuestByPhone(phoneNumber, branchId);
      
      if (reservation) {
        // Gast gefunden via Telefonnummer - sende Code + Links
        const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
        return await WhatsAppGuestService.buildStatusMessage(reservation, language);
      }

      // Keine Telefonnummer vorhanden - starte mehrstufige Identifikation
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          state: 'guest_identification_name',
          context: {
            step: 'name',
            collectedData: {}
          }
        }
      });

      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);
      const translations: Record<string, string> = {
        es: 'No encontré tu reservación con tu número de teléfono. Por favor, proporciona los siguientes datos:\n\n¿Cuál es tu nombre?',
        de: 'Ich habe deine Reservierung mit deiner Telefonnummer nicht gefunden. Bitte gib die folgenden Daten an:\n\nWie lautet dein Vorname?',
        en: 'I could not find your reservation with your phone number. Please provide the following information:\n\nWhat is your first name?'
      };

      return translations[language] || translations.es;
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei Gast-Code-Anfrage:', error);
      return await this.getLanguageResponse(branchId, phoneNumber, 'error');
    }
  }

  /**
   * Setzt Gast-Identifikation fort
   */
  private static async continueGuestIdentification(
    phoneNumber: string,
    messageText: string,
    conversation: any,
    branchId: number
  ): Promise<string> {
    try {
      const context = conversation.context || {};
      const step = context.step || conversation.state;
      const collectedData = context.collectedData || {};
      const language = LanguageDetectionService.detectLanguageFromPhoneNumber(phoneNumber);

      // Schritt 1: Vorname
      if (step === 'guest_identification_name' || step === 'name') {
        const firstName = messageText.trim();
        if (!firstName || firstName.length < 2) {
          const translations: Record<string, string> = {
            es: 'Por favor, proporciona un nombre válido.',
            de: 'Bitte gib einen gültigen Namen an.',
            en: 'Please provide a valid name.'
          };
          return translations[language] || translations.es;
        }

        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            state: 'guest_identification_lastname',
            context: {
              step: 'lastname',
              collectedData: {
                ...collectedData,
                firstName: firstName
              }
            }
          }
        });

        const translations: Record<string, string> = {
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
          const translations: Record<string, string> = {
            es: 'Por favor, proporciona un apellido válido.',
            de: 'Bitte gib einen gültigen Nachnamen an.',
            en: 'Please provide a valid last name.'
          };
          return translations[language] || translations.es;
        }

        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            state: 'guest_identification_nationality',
            context: {
              step: 'nationality',
              collectedData: {
                ...collectedData,
                lastName: lastName
              }
            }
          }
        });

        const translations: Record<string, string> = {
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
          const translations: Record<string, string> = {
            es: 'Por favor, proporciona un país válido.',
            de: 'Bitte gib ein gültiges Land an.',
            en: 'Please provide a valid country.'
          };
          return translations[language] || translations.es;
        }

        // Suche Reservationen mit den bisherigen Daten
        const reservations = await WhatsAppGuestService.findReservationsByDetails(
          collectedData.firstName,
          collectedData.lastName,
          nationality,
          null, // Geburtsdatum optional
          branchId
        );

        if (reservations.length === 0) {
          // Keine Reservation gefunden
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              state: 'idle',
              context: null
            }
          });
          return await this.getLanguageResponse(branchId, phoneNumber, 'guest_not_found');
        }

        if (reservations.length === 1) {
          // Genau eine Reservation gefunden - sende Code + Links
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              state: 'idle',
              context: null
            }
          });
          return await WhatsAppGuestService.buildStatusMessage(reservations[0], language);
        }

        // Mehrere Reservationen gefunden - frage nach Geburtsdatum
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            state: 'guest_identification_birthdate',
            context: {
              step: 'birthdate',
              collectedData: {
                ...collectedData,
                nationality: nationality
              },
              candidateReservations: reservations.map((r: any) => ({
                id: r.id,
                checkInDate: r.checkInDate,
                checkOutDate: r.checkOutDate
              }))
            }
          }
        });

        const translations: Record<string, string> = {
          es: `Se encontraron varias reservaciones. Por favor, proporciona tu fecha de nacimiento (DD.MM.YYYY) o escribe "saltar" para ver todas.`,
          de: `Mehrere Reservierungen gefunden. Bitte gib dein Geburtsdatum an (TT.MM.JJJJ) oder schreibe "überspringen" um alle zu sehen.`,
          en: `Multiple reservations found. Please provide your birth date (DD.MM.YYYY) or type "skip" to see all.`
        };
        return translations[language] || translations.es;
      }

      // Schritt 4: Geburtsdatum (optional)
      if (step === 'guest_identification_birthdate' || step === 'birthdate') {
        let birthDate: Date | null = null;
        const messageLower = messageText.toLowerCase().trim();
        
        // Prüfe ob "skip" / "überspringen" / "saltar"
        if (messageLower === 'skip' || messageLower === 'überspringen' || messageLower === 'saltar') {
          // Zeige Liste aller Reservationen
          const candidateReservations = context.candidateReservations || [];
          let message = 'Se encontraron las siguientes reservaciones:\n\n';
          candidateReservations.forEach((res: any, index: number) => {
            const checkIn = new Date(res.checkInDate).toLocaleDateString('es-ES');
            const checkOut = new Date(res.checkOutDate).toLocaleDateString('es-ES');
            message += `${index + 1}. Check-in: ${checkIn}, Check-out: ${checkOut}\n`;
          });
          message += '\nPor favor, contacta con el personal para más información.';
          
          await prisma.whatsAppConversation.update({
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
        } catch (error) {
          // Ignoriere Parsing-Fehler
        }

        // Suche mit Geburtsdatum
        const reservations = await WhatsAppGuestService.findReservationsByDetails(
          collectedData.firstName,
          collectedData.lastName,
          collectedData.nationality,
          birthDate,
          branchId
        );

        if (reservations.length === 0) {
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              state: 'idle',
              context: null
            }
          });
          return await this.getLanguageResponse(branchId, phoneNumber, 'guest_not_found');
        }

        if (reservations.length === 1) {
          // Genau eine Reservation gefunden
          await prisma.whatsAppConversation.update({
            where: { id: conversation.id },
            data: {
              state: 'idle',
              context: null
            }
          });
          return await WhatsAppGuestService.buildStatusMessage(reservations[0], language);
        }

        // Immer noch mehrere - zeige Liste
        let message = 'Se encontraron varias reservaciones:\n\n';
        reservations.forEach((res: any, index: number) => {
          const checkIn = new Date(res.checkInDate).toLocaleDateString('es-ES');
          const checkOut = new Date(res.checkOutDate).toLocaleDateString('es-ES');
          message += `${index + 1}. Check-in: ${checkIn}, Check-out: ${checkOut}\n`;
        });
        message += '\nPor favor, contacta con el personal para más información.';
        
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            state: 'idle',
            context: null
          }
        });
        return message;
      }

      // Unbekannter Schritt - reset
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          state: 'idle',
          context: null
        }
      });

      return await this.getLanguageResponse(branchId, phoneNumber, 'unknown_state');
    } catch (error) {
      console.error('[WhatsApp Message Handler] Fehler bei Gast-Identifikation:', error);
      await prisma.whatsAppConversation.update({
        where: { id: conversation.id },
        data: {
          state: 'idle',
          context: null
        }
      });
      return await this.getLanguageResponse(branchId, phoneNumber, 'error');
    }
  }
}

