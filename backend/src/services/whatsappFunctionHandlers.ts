import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import { LobbyPmsService } from './lobbyPmsService';
import { BoldPaymentService } from './boldPaymentService';
import { ReservationStatus, PaymentStatus } from '@prisma/client';
import { ReservationNotificationService } from './reservationNotificationService';
import { generateLobbyPmsCheckInLink } from '../utils/checkInLinkUtils';
import { logger } from '../utils/logger';

/**
 * WhatsApp Function Handlers
 * 
 * Implementiert Funktionen für OpenAI Function Calling.
 * Jede Funktion prüft Berechtigungen und lädt Daten basierend auf User-Rolle.
 */
export class WhatsAppFunctionHandlers {
  /**
   * Findet Reservationen mit gleichem Kunden-Namen (Name, Telefonnummer oder Email)
   * UND Datum-Überlappung (checkInDate <= tourDate <= checkOutDate)
   */
  private static async findReservationByCustomerName(
    customerName: string,
    customerPhone: string | null,
    customerEmail: string | null,
    branchId: number,
    organizationId: number,
    tourDate: Date // Tour-Datum für Überlappungsprüfung
  ): Promise<any> {
    try {
      const normalizedName = customerName.trim().toLowerCase();
      
      // Suche nach Name, Telefonnummer oder Email
      // WICHTIG: Prüfe auch Datum-Überlappung (checkInDate <= tourDate <= checkOutDate)
      const where: any = {
        organizationId: organizationId,
        branchId: branchId,
        status: {
          in: [ReservationStatus.confirmed, ReservationStatus.notification_sent, ReservationStatus.checked_in]
        },
        // Datum-Überlappung prüfen: Tour-Datum muss zwischen checkInDate und checkOutDate liegen
        checkInDate: {
          lte: tourDate // checkInDate <= tourDate
        },
        checkOutDate: {
          gte: tourDate // checkOutDate >= tourDate
        },
        OR: []
      };
      
      // Suche nach Name
      where.OR.push({
        guestName: {
          contains: normalizedName,
          mode: 'insensitive'
        }
      });
      
      // Suche nach Telefonnummer (falls vorhanden)
      if (customerPhone) {
        const { LanguageDetectionService } = await import('./languageDetectionService');
        const normalizedPhone = LanguageDetectionService.normalizePhoneNumber(customerPhone);
        where.OR.push({
          guestPhone: normalizedPhone
        });
      }
      
      // Suche nach Email (falls vorhanden)
      if (customerEmail) {
        where.OR.push({
          guestEmail: {
            equals: customerEmail.trim().toLowerCase(),
            mode: 'insensitive'
          }
        });
      }
      
      const reservations = await prisma.reservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 1
      });
      
      return reservations.length > 0 ? reservations[0] : null;
    } catch (error) {
      logger.error('[findReservationByCustomerName] Fehler:', error);
      return null;
    }
  }

  /**
   * Parst ein Datum in verschiedenen Formaten
   * Unterstützt: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD/MM, DD.MM
   */
  private static parseDate(dateStr: string): Date {
    const trimmed = dateStr.trim();
    
    // Relative Daten (sollten bereits vorher behandelt werden, aber als Fallback)
    if (trimmed === 'today' || trimmed === 'heute' || trimmed === 'hoy') {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      return date;
    }
    if (trimmed === 'tomorrow' || trimmed === 'morgen' || trimmed === 'mañana') {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    if (trimmed === 'day after tomorrow' || trimmed === 'übermorgen' || trimmed === 'pasado mañana') {
      const date = new Date();
      date.setDate(date.getDate() + 2);
      date.setHours(0, 0, 0, 0);
      return date;
    }
    
    // Format: DD/MM/YYYY oder DD/MM (aktuelles Jahr)
    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (slashMatch) {
      const day = parseInt(slashMatch[1], 10);
      const month = parseInt(slashMatch[2], 10) - 1; // Monate sind 0-indexiert
      const yearStr = slashMatch[3];
      let year: number;
      if (yearStr) {
        year = parseInt(yearStr, 10);
        // Wenn Jahr 2-stellig, interpretiere als 20XX
        if (year < 100) {
          year = 2000 + year;
        }
      } else {
        // Kein Jahr angegeben → aktuelles Jahr
        year = new Date().getFullYear();
      }
      return new Date(year, month, day);
    }
    
    // Format: DD.MM.YYYY oder DD.MM (aktuelles Jahr)
    const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
    if (dotMatch) {
      const day = parseInt(dotMatch[1], 10);
      const month = parseInt(dotMatch[2], 10) - 1;
      const yearStr = dotMatch[3];
      let year: number;
      if (yearStr) {
        year = parseInt(yearStr, 10);
        if (year < 100) {
          year = 2000 + year;
        }
      } else {
        year = new Date().getFullYear();
      }
      return new Date(year, month, day);
    }
    
    // Format: DD-MM-YYYY oder DD-MM (aktuelles Jahr)
    const dashMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?$/);
    if (dashMatch) {
      const day = parseInt(dashMatch[1], 10);
      const month = parseInt(dashMatch[2], 10) - 1;
      const yearStr = dashMatch[3];
      let year: number;
      if (yearStr) {
        year = parseInt(yearStr, 10);
        if (year < 100) {
          year = 2000 + year;
        }
      } else {
        year = new Date().getFullYear();
      }
      return new Date(year, month, day);
    }
    
    // Format: YYYY-MM-DD (ISO)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10) - 1;
      const day = parseInt(isoMatch[3], 10);
      return new Date(year, month, day);
    }
    
    // Fallback: Standard Date-Parsing
    return new Date(trimmed);
  }
  /**
   * Holt Requests (Solicitudes) für einen User
   */
  static async get_requests(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob User identifiziert wurde
      if (!userId) {
        throw new Error('Du musst registriert sein, um Requests abzurufen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.');
      }
      
      // 2. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 3. Prüfe Berechtigung
      const hasPermission = await checkUserPermission(
        userId,
        roleId,
        'table_requests',
        'read',
        'table'
      );
      
      if (!hasPermission) {
        throw new Error('Keine Berechtigung für Requests');
      }
      
      // 4. Parse Arguments
      const status = args.status;
      const dueDate = args.dueDate === 'today' 
        ? new Date() 
        : args.dueDate ? new Date(args.dueDate) : undefined;
      const targetUserId = args.userId || userId;
      
      // 5. Baue Where-Clause
      const where: any = {
        branchId: branchId,
        OR: [
          { requesterId: targetUserId },
          { responsibleId: targetUserId }
        ]
      };
      
      if (status) {
        where.status = status;
      }
      
      if (dueDate) {
        // Für "today": Filtere nach Datum (ohne Zeit)
        if (args.dueDate === 'today') {
          const todayStart = new Date(dueDate);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(dueDate);
          todayEnd.setHours(23, 59, 59, 999);
          where.dueDate = {
            gte: todayStart,
            lte: todayEnd
          };
        } else {
          where.dueDate = dueDate;
        }
      }
      
      // 6. Lade Daten
      const requests = await prisma.request.findMany({
        where,
        include: {
          requester: { 
            select: { 
              id: true,
              firstName: true, 
              lastName: true 
            } 
          },
          responsible: { 
            select: { 
              id: true,
              firstName: true, 
              lastName: true 
            } 
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      
      // 7. Formatiere für KI
      return requests.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description || '',
        status: r.status,
        type: r.type,
        dueDate: r.dueDate?.toISOString().split('T')[0] || null,
        requester: `${r.requester.firstName} ${r.requester.lastName}`,
        responsible: r.responsible ? `${r.responsible.firstName} ${r.responsible.lastName}` : null,
        createdAt: r.createdAt.toISOString().split('T')[0]
      }));
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_requests Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt Todos/Tasks für einen User
   */
  static async get_todos(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob User identifiziert wurde
      if (!userId) {
        throw new Error('Du musst registriert sein, um Todos abzurufen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.');
      }
      
      // 2. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 3. Prüfe Berechtigung
      const hasPermission = await checkUserPermission(
        userId,
        roleId,
        'table_tasks',
        'read',
        'table'
      );
      
      if (!hasPermission) {
        throw new Error('Keine Berechtigung für Tasks');
      }
      
      // 4. Parse Arguments
      const status = args.status;
      const dueDate = args.dueDate === 'today' 
        ? new Date() 
        : args.dueDate ? new Date(args.dueDate) : undefined;
      const targetUserId = args.userId || userId;
      
      // 5. Baue Where-Clause
      const where: any = {
        branchId: branchId,
        OR: [
          { responsibleId: targetUserId },
          { qualityControlId: targetUserId }
        ]
      };
      
      if (status) {
        where.status = status;
      }
      
      if (dueDate) {
        if (args.dueDate === 'today') {
          const todayStart = new Date(dueDate);
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date(dueDate);
          todayEnd.setHours(23, 59, 59, 999);
          where.dueDate = {
            gte: todayStart,
            lte: todayEnd
          };
        } else {
          where.dueDate = dueDate;
        }
      }
      
      // 6. Lade Daten
      const tasks = await prisma.task.findMany({
        where,
        include: {
          responsible: { 
            select: { 
              id: true,
              firstName: true, 
              lastName: true 
            } 
          },
          qualityControl: { 
            select: { 
              id: true,
              firstName: true, 
              lastName: true 
            } 
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      
      // 7. Formatiere für KI
      return tasks.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || '',
        status: t.status,
        dueDate: t.dueDate?.toISOString().split('T')[0] || null,
        responsible: t.responsible ? `${t.responsible.firstName} ${t.responsible.lastName}` : null,
        qualityControl: `${t.qualityControl.firstName} ${t.qualityControl.lastName}`,
        createdAt: t.createdAt.toISOString().split('T')[0]
      }));
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_todos Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt Arbeitszeiten für einen User
   */
  static async get_worktime(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob User identifiziert wurde
      if (!userId) {
        throw new Error('Du musst registriert sein, um Arbeitszeiten abzurufen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.');
      }
      
      // 2. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 3. Prüfe Berechtigung
      const hasPermission = await checkUserPermission(
        userId,
        roleId,
        'page_worktracker',
        'read',
        'page'
      );
      
      if (!hasPermission) {
        throw new Error('Keine Berechtigung für Arbeitszeiten');
      }
      
      // 4. Parse Arguments
      const targetUserId = args.userId || userId;
      let date: Date | undefined;
      let startDate: Date | undefined;
      let endDate: Date | undefined;
      
      if (args.date === 'today') {
        date = new Date();
        date.setHours(0, 0, 0, 0);
      } else if (args.date) {
        date = new Date(args.date);
        date.setHours(0, 0, 0, 0);
      }
      
      if (args.startDate) {
        startDate = new Date(args.startDate);
        startDate.setHours(0, 0, 0, 0);
      }
      
      if (args.endDate) {
        endDate = new Date(args.endDate);
        endDate.setHours(23, 59, 59, 999);
      }
      
      // 3. Baue Where-Clause
      const where: any = {
        userId: targetUserId,
        branchId: branchId
      };
      
      if (date) {
        // Einzelnes Datum
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        where.startTime = {
          gte: dayStart,
          lte: dayEnd
        };
      } else if (startDate && endDate) {
        // Zeitraum
        where.startTime = {
          gte: startDate,
          lte: endDate
        };
      } else if (!date && !startDate && !endDate) {
        // Aktuelle Arbeitszeit (endTime ist null)
        where.endTime = null;
      }
      
      // 6. Lade Daten
      const worktimes = await prisma.workTime.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: 50
      });
      
      // 7. Berechne Gesamtzeit
      let totalMinutes = 0;
      worktimes.forEach(wt => {
        if (wt.endTime) {
          const diff = wt.endTime.getTime() - wt.startTime.getTime();
          totalMinutes += Math.floor(diff / 1000 / 60);
        } else {
          // Aktive Arbeitszeit
          const diff = Date.now() - wt.startTime.getTime();
          totalMinutes += Math.floor(diff / 1000 / 60);
        }
      });
      
      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;
      
      // 8. Formatiere für KI
      return {
        totalHours,
        totalMinutes: remainingMinutes,
        entries: worktimes.map(wt => ({
          id: wt.id,
          startTime: wt.startTime.toISOString(),
          endTime: wt.endTime?.toISOString() || null,
          isActive: !wt.endTime,
          duration: wt.endTime 
            ? Math.floor((wt.endTime.getTime() - wt.startTime.getTime()) / 1000 / 60)
            : Math.floor((Date.now() - wt.startTime.getTime()) / 1000 / 60)
        })),
        count: worktimes.length
      };
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_worktime Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt Cerebro-Artikel basierend auf Suchbegriffen
   */
  static async get_cerebro_articles(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob User identifiziert wurde
      if (!userId) {
        throw new Error('Du musst registriert sein, um Cerebro-Artikel abzurufen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.');
      }
      
      // 2. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 3. Prüfe Berechtigung
      const hasPermission = await checkUserPermission(
        userId,
        roleId,
        'cerebro',
        'read',
        'cerebro'
      );
      
      if (!hasPermission) {
        throw new Error('Keine Berechtigung für Cerebro-Artikel');
      }
      
      // 4. Parse Arguments
      const searchTerm = args.searchTerm;
      const tags = args.tags || [];
      const limit = args.limit || 10;
      
      // 3. Baue Where-Clause
      const where: any = {
        isPublished: true
      };
      
      if (searchTerm || tags.length > 0) {
        const orConditions: any[] = [];
        
        if (searchTerm) {
          orConditions.push(
            {
              title: {
                contains: searchTerm,
                mode: 'insensitive' as const
              }
            },
            {
              content: {
                contains: searchTerm,
                mode: 'insensitive' as const
              }
            }
          );
        }
        
        if (tags.length > 0) {
          orConditions.push({
            tags: {
              some: {
                name: {
                  in: tags,
                  mode: 'insensitive' as const
                }
              }
            }
          });
        }
        
        where.OR = orConditions;
      }
      
      // 6. Lade Daten
      const articles = await prisma.cerebroCarticle.findMany({
        where,
        include: {
          tags: {
            select: {
              name: true
            }
          },
          createdBy: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit
      });
      
      // 7. Formatiere für KI
      return articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        content: a.content ? a.content.substring(0, 500) : '', // Erste 500 Zeichen
        tags: a.tags.map(t => t.name),
        createdBy: `${a.createdBy.firstName} ${a.createdBy.lastName}`,
        createdAt: a.createdAt.toISOString().split('T')[0],
        updatedAt: a.updatedAt.toISOString().split('T')[0]
      }));
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_cerebro_articles Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt User-Informationen
   */
  static async get_user_info(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob User identifiziert wurde
      if (!userId) {
        throw new Error('Du musst registriert sein, um deine Informationen abzurufen. Bitte füge deine Telefonnummer zu deinem Profil hinzu.');
      }
      
      // 2. Parse Arguments
      const targetUserId = args.userId || userId;
      
      // 3. Prüfe ob User eigene Daten abruft oder andere
      if (targetUserId !== userId) {
        // TODO: Prüfe ob User Berechtigung hat, andere User-Daten zu sehen
        // Für jetzt: Nur eigene Daten erlauben
        throw new Error('Nur eigene User-Informationen können abgerufen werden');
      }
      
      // 4. Lade User-Daten
      const user = await prisma.user.findUnique({
        where: { id: targetUserId },
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
      
      if (!user) {
        throw new Error('User nicht gefunden');
      }
      
      // 5. Formatiere für KI
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        roles: user.roles.map(ur => ({
          id: ur.role.id,
          name: ur.role.name
        }))
      };
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_user_info Fehler:', error);
      throw error;
    }
  }

  /**
   * Prüft Zimmerverfügbarkeit für einen Zeitraum
   */
  static async check_room_availability(
    args: {
      startDate: string; // Format: YYYY-MM-DD oder "today"/"heute"
      endDate?: string; // Format: YYYY-MM-DD oder "today"/"heute" (optional, falls nicht angegeben: startDate + 1 Tag)
      roomType?: 'compartida' | 'privada'; // Optional: Filter nach Zimmerart
      branchId?: number; // Optional: Branch ID (verwendet branchId aus Context wenn nicht angegeben)
    },
    userId: number | null,
    roleId: number | null,
    branchId: number,
    conversationId?: number // Optional: Conversation ID für Context-Speicherung
  ): Promise<any> {
    try {
      // 1. Parse Datum (unterstützt "today"/"heute"/"hoy"/"morgen"/"tomorrow"/"mañana")
      let startDate: Date;
      const startDateStr = args.startDate.toLowerCase().trim();
      if (startDateStr === 'today' || startDateStr === 'heute' || startDateStr === 'hoy') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Setze auf Mitternacht
      } else if (startDateStr === 'tomorrow' || startDateStr === 'morgen' || startDateStr === 'mañana') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        startDate = new Date(args.startDate);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Ungültiges Startdatum: ${args.startDate}. Format: YYYY-MM-DD, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
        }
      }

      let endDate: Date;
      if (args.endDate) {
        const endDateStr = args.endDate.toLowerCase().trim();
        if (endDateStr === 'today' || endDateStr === 'heute' || endDateStr === 'hoy') {
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999); // Setze auf Ende des Tages
        } else if (endDateStr === 'tomorrow' || endDateStr === 'morgen' || endDateStr === 'mañana') {
          endDate = new Date();
          endDate.setDate(endDate.getDate() + 1);
          endDate.setHours(23, 59, 59, 999);
        } else {
          endDate = new Date(args.endDate);
          if (isNaN(endDate.getTime())) {
            throw new Error(`Ungültiges Enddatum: ${args.endDate}. Format: YYYY-MM-DD, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
          }
        }
      } else {
        // WICHTIG: Wenn User nur "heute" sagt, zeige nur heute (nicht heute + morgen)
        // Wenn User "morgen" sagt, zeige nur morgen
        // Nur wenn User ein konkretes Datum angibt, füge +1 Tag hinzu
        if (startDateStr === 'today' || startDateStr === 'heute' || startDateStr === 'hoy') {
          // User fragt nur nach "heute" → zeige nur heute
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
        } else if (startDateStr === 'tomorrow' || startDateStr === 'morgen' || startDateStr === 'mañana') {
          // User fragt nur nach "morgen" → zeige nur morgen
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
        } else {
          // User gibt konkretes Datum an → füge +1 Tag hinzu (für Check-out)
          endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
        }
      }

      // 2. Prüfe Datum-Logik
      // WICHTIG: Erlaube endDate = startDate (gleicher Tag, z.B. "heute")
      if (endDate < startDate) {
        throw new Error('Enddatum muss nach oder gleich Startdatum liegen');
      }

      // 3. Performance: Prüfe Zeitraum-Limit (max. 30 Tage)
      const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        throw new Error(`Zeitraum zu lang: ${daysDiff} Tage. Maximum: 30 Tage.`);
      }

      // 3. Verwende branchId aus args oder Context
      const targetBranchId = args.branchId || branchId;

      // 4. Erstelle LobbyPMS Service
      const service = await LobbyPmsService.createForBranch(targetBranchId);

      // 5. Rufe Verfügbarkeits-API auf
      const availability = await service.checkAvailability(startDate, endDate);

      // Debug: Logge alle gefundenen Kategorien
      const uniqueCategories = new Set(availability.map(item => `${item.categoryId}:${item.roomName}`));
      logger.log(`[WhatsApp Function Handlers] check_room_availability: ${availability.length} Einträge, ${uniqueCategories.size} eindeutige Kategorien`);
      for (const cat of uniqueCategories) {
        logger.log(`[WhatsApp Function Handlers]   - ${cat}`);
      }
      
      // Debug: Logge spezifisch "apartamento doble" und "primo deportista" falls vorhanden
      const apartamentoDoble = availability.filter(item => 
        item.roomName?.toLowerCase().includes('apartamento doble') || 
        item.roomName?.toLowerCase().includes('primo deportista')
      );
      if (apartamentoDoble.length > 0) {
        logger.log(`[WhatsApp Function Handlers] ⚠️ Apartamento doble / Primo deportista gefunden: ${apartamentoDoble.length} Einträge`);
        apartamentoDoble.forEach(item => {
          logger.log(`[WhatsApp Function Handlers]   - ${item.categoryId}: ${item.roomName}, roomType: ${item.roomType}, availableRooms: ${item.availableRooms}, date: ${item.date}`);
        });
      } else {
        logger.log(`[WhatsApp Function Handlers] ⚠️ Apartamento doble / Primo deportista NICHT in API-Response gefunden!`);
      }

      // 6. Filtere nach roomType falls angegeben
      let filteredAvailability = availability;
      if (args.roomType) {
        filteredAvailability = availability.filter(item => item.roomType === args.roomType);
      }

      // 7. Gruppiere nach Zimmer (über alle Daten hinweg)
      const roomMap = new Map<number, {
        categoryId: number;
        roomName: string;
        roomType: 'compartida' | 'privada';
        minAvailableRooms: number;
        maxAvailableRooms: number;
        pricePerNight: number;
        currency: string;
        prices: Array<{ people: number; value: number }>;
        dates: Array<{ date: string; availableRooms: number }>;
      }>();

      for (const item of filteredAvailability) {
        if (!roomMap.has(item.categoryId)) {
          roomMap.set(item.categoryId, {
            categoryId: item.categoryId,
            roomName: item.roomName,
            roomType: item.roomType,
            minAvailableRooms: item.availableRooms,
            maxAvailableRooms: item.availableRooms,
            pricePerNight: item.pricePerNight,
            currency: item.currency,
            prices: item.prices,
            dates: []
          });
        }

        const room = roomMap.get(item.categoryId)!;
        room.minAvailableRooms = Math.min(room.minAvailableRooms, item.availableRooms);
        room.maxAvailableRooms = Math.max(room.maxAvailableRooms, item.availableRooms);
        room.dates.push({
          date: item.date,
          availableRooms: item.availableRooms
        });
      }

      // 8. Formatiere für KI
      // Prüfe ob nur ein Tag abgefragt wird (gleicher Tag)
      const isSingleDay = startDate.toISOString().split('T')[0] === endDate.toISOString().split('T')[0];
      
      // WICHTIG: Zeige Zimmer auch wenn minAvailableRooms = 0, aber maxAvailableRooms > 0 (verfügbar an mindestens einem Tag)
      const rooms = Array.from(roomMap.values())
        .filter(room => room.maxAvailableRooms > 0) // Filtere nur wenn mindestens an einem Tag verfügbar
        .map(room => {
          // WICHTIG: Wenn nur ein Tag abgefragt wird, zeige die Verfügbarkeit für diesen Tag (nicht maxAvailableRooms)
          // Wenn mehrere Tage abgefragt werden, zeige minAvailableRooms (garantiert verfügbar) oder maxAvailableRooms (verfügbar an mindestens einem Tag)
          let availableRooms: number;
          if (isSingleDay) {
            // Nur ein Tag: Zeige die Verfügbarkeit für diesen Tag (sollte minAvailableRooms = maxAvailableRooms sein)
            availableRooms = room.minAvailableRooms;
          } else {
            // Mehrere Tage: Zeige minAvailableRooms wenn > 0, sonst maxAvailableRooms (verfügbar an mindestens einem Tag)
            availableRooms = room.minAvailableRooms > 0 ? room.minAvailableRooms : room.maxAvailableRooms;
          }
          
          return {
            categoryId: room.categoryId,
            name: room.roomName,
            type: room.roomType,
            availableRooms: availableRooms, // Zeige maxAvailableRooms wenn minAvailableRooms = 0
            minAvailableRooms: room.minAvailableRooms, // Für Info: Minimum über alle Daten
            maxAvailableRooms: room.maxAvailableRooms, // Für Info: Maximum über alle Daten
            pricePerNight: room.pricePerNight,
            currency: room.currency,
            // WICHTIG: Terminologie - compartida = Betten, privada = Zimmer
            unit: room.roomType === 'compartida' ? 'beds' : 'rooms', // Für KI: "beds" bei compartida, "rooms" bei privada
            prices: room.prices.map(p => ({
              people: p.people,
              price: p.value
            })),
            availability: room.dates.map(d => ({
              date: d.date,
              availableRooms: d.availableRooms
            }))
          };
        });

      // Debug: Logge alle formatierten Zimmer
      logger.log(`[WhatsApp Function Handlers] check_room_availability: ${rooms.length} Zimmer formatiert`);
      for (const room of rooms) {
        logger.log(`[WhatsApp Function Handlers]   - ${room.name} (${room.type}): ${room.availableRooms} verfügbar, ${room.pricePerNight.toLocaleString('de-CH')} COP`);
      }

      // Speichere Context in Conversation (falls conversationId vorhanden)
      if (conversationId) {
        try {
          const conversation = await prisma.whatsAppConversation.findUnique({
            where: { id: conversationId },
            select: { context: true }
          });
          
          if (conversation) {
            const context = (conversation.context as any) || {};
            const bookingContext = context.booking || {};
            
            // Aktualisiere Context mit Verfügbarkeitsprüfung
            const updatedContext = {
              ...bookingContext,
              checkInDate: args.startDate,
              checkOutDate: args.endDate || (startDateStr === 'tomorrow' || startDateStr === 'morgen' || startDateStr === 'mañana' 
                ? 'day after tomorrow' 
                : undefined),
              roomType: args.roomType || bookingContext.roomType,
              lastAvailabilityCheck: {
                startDate: args.startDate,
                endDate: endDate.toISOString().split('T')[0],
                rooms: rooms.map(room => ({
                  categoryId: room.categoryId,
                  name: room.name,
                  type: room.type,
                  availableRooms: room.availableRooms
                }))
              }
            };
            
            await prisma.whatsAppConversation.update({
              where: { id: conversationId },
              data: {
                context: {
                  ...context,
                  booking: updatedContext
                }
              }
            });
            
            logger.log('[check_room_availability] Context aktualisiert:', {
              checkInDate: updatedContext.checkInDate,
              checkOutDate: updatedContext.checkOutDate,
              roomType: updatedContext.roomType
            });
          }
        } catch (contextError) {
          logger.error('[check_room_availability] Fehler beim Speichern des Contexts:', contextError);
          // Nicht abbrechen, nur loggen
        }
      }

      return {
        startDate: args.startDate,
        endDate: endDate.toISOString().split('T')[0],
        roomType: args.roomType || 'all',
        totalRooms: rooms.length,
        rooms: rooms.map(room => {
          // WICHTIG: Verwende availableRooms (bereits korrigiert: maxAvailableRooms wenn minAvailableRooms = 0)
          const availableCount = room.availableRooms;
          return {
            ...room,
            // WICHTIG: Sprachneutral - keine deutschen Begriffe, nur roomType (compartida/privada)
            // Die KI muss die Begriffe selbst in die erkannte Sprache übersetzen
            description: `${room.name}: ${availableCount} available (type: ${room.type}, unit: ${room.unit})`
          };
        })
      };
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] check_room_availability Fehler:', error);
      throw error;
    }
  }

  /**
   * Holt verfügbare Touren
   */
  static async get_tours(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number,
    conversationId?: number // Optional: Conversation ID für Context-Speicherung
  ): Promise<any> {
    try {
      // Filter: isActive = true, availableFrom <= heute <= availableTo
      const where: any = {
        isActive: true,
        OR: [
          { branchId: branchId },
          { branchId: null } // Touren ohne Branch (für alle Branches)
        ]
      };
      
      // Datum-Filter (optional)
      const now = new Date();
      if (args.availableFrom) {
        where.availableFrom = { lte: new Date(args.availableFrom) };
      } else {
        // Standard: Nur Touren die bereits verfügbar sind
        where.OR = [
          { availableFrom: { lte: now } },
          { availableFrom: null }
        ];
      }
      
      if (args.availableTo) {
        where.availableTo = { gte: new Date(args.availableTo) };
      } else {
        // Standard: Nur Touren die noch verfügbar sind
        where.AND = [
          {
            OR: [
              { availableTo: { gte: now } },
              { availableTo: null }
            ]
          }
        ];
      }
      
      // Typ-Filter (optional)
      if (args.type) {
        where.type = args.type; // 'own' oder 'external'
      }
      
      const tours = await prisma.tour.findMany({
        where,
        include: {
          branch: {
            select: { id: true, name: true }
          },
          organization: {
            select: { id: true }
          }
        },
        orderBy: { title: 'asc' },
        take: args.limit || 20
      });
      
      const formattedTours = tours.map(t => {
        // Konvertiere relative imageUrl zu API-URL
        let imageUrl = t.imageUrl;
        if (imageUrl && imageUrl.startsWith('/uploads/tours/')) {
          // Konvertiere /uploads/tours/tour-1-main-xxx.png zu /api/tours/1/image
          imageUrl = `/api/tours/${t.id}/image`;
        } else if (!imageUrl) {
          imageUrl = null;
        }
        
        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          type: t.type,
          price: t.price ? Number(t.price) : null,
          currency: t.currency || 'COP',
          duration: t.duration,
          maxParticipants: t.maxParticipants,
          minParticipants: t.minParticipants,
          location: t.location,
          meetingPoint: t.meetingPoint,
          imageUrl: imageUrl, // API-URL statt relativer Pfad
          hasGallery: !!t.galleryUrls && Array.isArray(t.galleryUrls) && t.galleryUrls.length > 0
        };
      });

      // Speichere Context in Conversation (falls conversationId vorhanden)
      if (conversationId) {
        try {
          const conversation = await prisma.whatsAppConversation.findUnique({
            where: { id: conversationId },
            select: { context: true }
          });
          
          if (conversation) {
            const context = (conversation.context as any) || {};
            const tourContext = context.tour || {};
            
            // Aktualisiere Context mit Tour-Liste
            const updatedContext = {
              ...tourContext,
              lastToursList: formattedTours.map(t => ({
                id: t.id,
                title: t.title,
                price: t.price,
                location: t.location
              })),
              lastToursCheckAt: new Date().toISOString()
            };
            
            await prisma.whatsAppConversation.update({
              where: { id: conversationId },
              data: {
                context: {
                  ...context,
                  tour: updatedContext
                }
              }
            });
            
            logger.log('[get_tours] Context aktualisiert:', {
              toursCount: formattedTours.length
            });
          }
        } catch (contextError) {
          logger.error('[get_tours] Fehler beim Speichern des Contexts:', contextError);
          // Nicht abbrechen, nur loggen
        }
      }

      return formattedTours;
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_tours Fehler:', error);
      throw error;
    }
  }

  /**
   * Holt Details einer Tour (inkl. Bilder-URLs)
   */
  static async get_tour_details(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      if (!args.tourId) {
        throw new Error('tourId ist erforderlich');
      }
      
      const tour = await prisma.tour.findUnique({
        where: { id: parseInt(args.tourId, 10) },
        include: {
          branch: {
            select: { id: true, name: true }
          },
          externalProvider: {
            select: { id: true, name: true, phone: true }
          }
        }
      });
      
      if (!tour) {
        throw new Error('Tour nicht gefunden');
      }
      
      // Parse galleryUrls (JSON)
      let galleryUrls: string[] = [];
      if (tour.galleryUrls) {
        try {
          galleryUrls = typeof tour.galleryUrls === 'string' 
            ? JSON.parse(tour.galleryUrls) 
            : tour.galleryUrls;
        } catch (e) {
          logger.warn('[get_tour_details] Fehler beim Parsen von galleryUrls:', e);
        }
      }
      
      // Konvertiere relative imageUrl zu API-URL
      let imageUrl = tour.imageUrl;
      if (imageUrl && imageUrl.startsWith('/uploads/tours/')) {
        imageUrl = `/api/tours/${tour.id}/image`;
      } else if (!imageUrl) {
        imageUrl = null;
      }
      
      // Konvertiere galleryUrls zu API-URLs
      const galleryApiUrls = galleryUrls.map((url: string, index: number) => {
        if (url && url.startsWith('/uploads/tours/')) {
          return `/api/tours/${tour.id}/gallery/${index}`;
        }
        return url;
      });
      
      return {
        id: tour.id,
        title: tour.title,
        description: tour.description || '',
        type: tour.type,
        price: tour.price ? Number(tour.price) : null,
        currency: tour.currency || 'COP',
        duration: tour.duration,
        maxParticipants: tour.maxParticipants,
        minParticipants: tour.minParticipants,
        location: tour.location,
        meetingPoint: tour.meetingPoint,
        includes: tour.includes,
        excludes: tour.excludes,
        requirements: tour.requirements,
        imageUrl: imageUrl, // API-URL statt relativer Pfad
        galleryUrls: galleryApiUrls, // API-URLs statt relative Pfade
        availableFrom: tour.availableFrom?.toISOString() || null,
        availableTo: tour.availableTo?.toISOString() || null,
        branch: tour.branch ? { id: tour.branch.id, name: tour.branch.name } : null,
        externalProvider: tour.externalProvider ? {
          id: tour.externalProvider.id,
          name: tour.externalProvider.name,
          phone: tour.externalProvider.phone
        } : null
      };
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] get_tour_details Fehler:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine Tour-Reservation/Buchung
   */
  static async book_tour(
    args: any,
    userId: number | null,
    roleId: number | null,
    branchId: number,
    phoneNumber?: string // WhatsApp-Telefonnummer (wird automatisch aus Context übergeben)
  ): Promise<any> {
    try {
      // 1. Validierung: Alle erforderlichen Parameter
      if (!args.tourId) {
        throw new Error('tourId ist erforderlich. Bitte wählen Sie eine Tour aus der Liste.');
      }
      if (!args.tourDate) {
        throw new Error('Tour-Datum ist erforderlich. Bitte geben Sie das Datum der Tour an (z.B. "morgen" oder ein konkretes Datum).');
      }
      if (!args.numberOfParticipants || args.numberOfParticipants < 1) {
        throw new Error('Anzahl Teilnehmer ist erforderlich und muss mindestens 1 sein.');
      }
      if (!args.customerName || !args.customerName.trim()) {
        throw new Error('Name des Kunden ist erforderlich. Bitte geben Sie Ihren vollständigen Namen an.');
      }
      
      // 2. Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
      let tourDate: Date;
      const tourDateStr = args.tourDate.toLowerCase().trim();
      if (tourDateStr === 'today' || tourDateStr === 'heute' || tourDateStr === 'hoy') {
        tourDate = new Date();
        tourDate.setHours(0, 0, 0, 0);
      } else if (tourDateStr === 'tomorrow' || tourDateStr === 'morgen' || tourDateStr === 'mañana') {
        tourDate = new Date();
        tourDate.setDate(tourDate.getDate() + 1);
        tourDate.setHours(0, 0, 0, 0);
      } else if (tourDateStr === 'day after tomorrow' || tourDateStr === 'übermorgen' || tourDateStr === 'pasado mañana') {
        tourDate = new Date();
        tourDate.setDate(tourDate.getDate() + 2);
        tourDate.setHours(0, 0, 0, 0);
      } else {
        // Versuche verschiedene Datum-Formate zu parsen
        tourDate = this.parseDate(args.tourDate);
        if (isNaN(tourDate.getTime())) {
          throw new Error(`Ungültiges Tour-Datum: ${args.tourDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
        }
      }
      
      // Validierung: Tour-Datum muss in der Zukunft sein
      if (tourDate < new Date()) {
        throw new Error('Tour-Datum muss in der Zukunft sein');
      }
      
      // 3. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
      // WICHTIG: Nutze WhatsApp-Telefonnummer als Fallback, falls nicht angegeben
      let customerPhone = args.customerPhone?.trim() || null;
      let customerEmail = args.customerEmail?.trim() || null;
      
      // Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
      if (!customerPhone && phoneNumber) {
        const { LanguageDetectionService } = await import('./languageDetectionService');
        customerPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
        logger.log(`[book_tour] WhatsApp-Telefonnummer als Fallback verwendet: ${customerPhone}`);
      }
      
      if (!customerPhone && !customerEmail) {
        throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Tour-Buchung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
      }
      
      // Hole Branch für organizationId
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { organizationId: true }
      });
      
      if (!branch) {
        throw new Error('Branch nicht gefunden');
      }
      
      // Hole Tour
      const tour = await prisma.tour.findUnique({
        where: { id: parseInt(args.tourId, 10) },
        include: {
          externalProvider: true
        }
      });
      
      if (!tour) {
        throw new Error('Tour nicht gefunden');
      }
      
      if (!tour.isActive) {
        throw new Error('Tour ist nicht aktiv');
      }
      
      // Validierung: Anzahl Teilnehmer
      if (tour.minParticipants && args.numberOfParticipants < tour.minParticipants) {
        throw new Error(`Mindestens ${tour.minParticipants} Teilnehmer erforderlich`);
      }
      if (tour.maxParticipants && args.numberOfParticipants > tour.maxParticipants) {
        throw new Error(`Maximal ${tour.maxParticipants} Teilnehmer erlaubt`);
      }
      
      // Berechne Gesamtpreis
      const totalPrice = tour.price 
        ? Number(tour.price) * args.numberOfParticipants 
        : 0;
      
      // Erstelle Buchung
      const booking = await prisma.tourBooking.create({
        data: {
          tourId: tour.id,
          tourDate: tourDate,
          numberOfParticipants: args.numberOfParticipants,
          totalPrice: totalPrice,
          currency: tour.currency || 'COP',
          customerName: args.customerName.trim(),
          customerEmail: customerEmail,
          customerPhone: customerPhone,
          customerNotes: args.customerNotes?.trim() || null,
          bookedById: userId || null,
          organizationId: branch.organizationId,
          branchId: branchId,
          isExternal: tour.type === 'external',
          amountPending: totalPrice,
          // Automatische Stornierung
          paymentDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde
          autoCancelEnabled: true,
          reservedUntil: new Date(Date.now() + 60 * 60 * 1000) // 1 Stunde
        },
        include: {
          tour: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      // Prüfe ob Reservation mit gleichem Namen UND Datum-Überlappung existiert
      let matchingReservation = null;
      try {
        matchingReservation = await this.findReservationByCustomerName(
          args.customerName.trim(),
          customerPhone,
          customerEmail,
          branchId,
          branch.organizationId,
          tourDate // NEU: Tour-Datum für Überlappungsprüfung
        );
        
        if (matchingReservation) {
          logger.log(`[book_tour] ✅ Reservation ${matchingReservation.id} mit gleichem Namen und Datum-Überlappung gefunden, verknüpfe Tour-Buchung`);
          
          // Erstelle TourReservation Verknüpfung
          // WICHTIG: tourPrice = totalPrice, accommodationPrice = 0 (Tour ist zusätzlich zur Reservation)
          const tourReservation = await prisma.tourReservation.create({
            data: {
              tourId: tour.id,
              bookingId: booking.id,
              reservationId: matchingReservation.id,
              tourPrice: totalPrice,
              accommodationPrice: 0, // Tour ist zusätzlich, keine Reduzierung der Accommodation
              currency: tour.currency || 'COP',
              tourPricePending: totalPrice,
              accommodationPending: 0
            }
          });
          
          logger.log(`[book_tour] ✅ TourReservation Verknüpfung erstellt: ${tourReservation.id}`);
        }
      } catch (linkError) {
        logger.error('[book_tour] Fehler beim Verknüpfen mit Reservation:', linkError);
        // Nicht abbrechen, nur loggen
      }
      
      // Generiere Payment Link (analog zu tourBookingController)
      let paymentLink: string | null = null;
      if (totalPrice > 0 && (customerPhone || customerEmail)) {
        try {
          let reservationForPaymentLink;
          
          if (matchingReservation) {
            // WICHTIG: Verwende bestehende Reservation für Payment Link
            logger.log(`[book_tour] Verwende bestehende Reservation ${matchingReservation.id} für Payment Link`);
            reservationForPaymentLink = matchingReservation;
          } else {
            // Nur wenn KEINE passende Reservation gefunden wurde: Erstelle "Dummy"-Reservation
            logger.log(`[book_tour] Keine passende Reservation gefunden, erstelle "Dummy"-Reservation für Payment Link`);
            reservationForPaymentLink = await prisma.reservation.create({
              data: {
                guestName: args.customerName,
                guestPhone: customerPhone,
                guestEmail: customerEmail,
                checkInDate: tourDate,
                checkOutDate: new Date(tourDate.getTime() + 24 * 60 * 60 * 1000), // +1 Tag
                status: 'confirmed',
                paymentStatus: 'pending',
                amount: totalPrice,
                currency: tour.currency || 'COP',
                organizationId: branch.organizationId,
                branchId: branchId
              }
            });
          }
          
          const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
          paymentLink = await boldPaymentService.createPaymentLink(
            reservationForPaymentLink,
            totalPrice,
            tour.currency || 'COP',
            `Zahlung für Tour-Buchung: ${tour.title}`
          );
          
          // Aktualisiere Buchung mit Payment Link
          await prisma.tourBooking.update({
            where: { id: booking.id },
            data: { paymentLink }
          });
        } catch (paymentError) {
          logger.error('[book_tour] Fehler beim Erstellen des Payment-Links:', paymentError);
          // Nicht abbrechen, nur loggen
        }
      }
      
      // Berechne Kommission (falls bookedById vorhanden)
      if (userId) {
        try {
          const { calculateCommission } = await import('../services/commissionService');
          await calculateCommission(booking.id);
        } catch (commissionError) {
          logger.error('[book_tour] Fehler bei Kommissions-Berechnung:', commissionError);
        }
      }
      
      // Sende Buchungsbestätigung per WhatsApp (wenn Payment Link vorhanden)
      if (paymentLink && (customerPhone || customerEmail)) {
        try {
          const { TourWhatsAppService } = await import('../services/tourWhatsAppService');
          await TourWhatsAppService.sendBookingConfirmationToCustomer(
            booking.id,
            branch.organizationId,
            branchId,
            paymentLink,
            totalPrice,
            tour.currency || 'COP'
          );
          logger.log(`[book_tour] ✅ Buchungsbestätigung per WhatsApp gesendet`);
        } catch (whatsappError) {
          logger.error('[book_tour] Fehler beim Versenden der WhatsApp-Nachricht:', whatsappError);
          // Nicht abbrechen, nur loggen
        }
      }

      // Bei externer Tour: WhatsApp-Nachricht an Anbieter senden
      if (tour.type === 'external' && tour.externalProvider?.phone) {
        try {
          const { TourWhatsAppService } = await import('../services/tourWhatsAppService');
          await TourWhatsAppService.sendBookingRequestToProvider(
            booking.id,
            branch.organizationId,
            branchId
          );
        } catch (whatsappError) {
          logger.error('[book_tour] Fehler beim Senden der WhatsApp-Nachricht:', whatsappError);
        }
      }
      
      return {
        success: true,
        bookingId: booking.id,
        tourTitle: tour.title,
        tourDate: tourDate.toISOString(),
        numberOfParticipants: args.numberOfParticipants,
        totalPrice: totalPrice,
        currency: tour.currency || 'COP',
        paymentLink: paymentLink,
        paymentDeadline: booking.paymentDeadline?.toISOString() || null,
        message: `Tour-Buchung erstellt. Bitte zahlen Sie innerhalb von 1 Stunde, sonst wird die Buchung automatisch storniert.`
      };
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] book_tour Fehler:', error);
      throw error;
    }
  }

  /**
   * Erstellt eine Zimmer-Reservation für den aktuellen Branch
   * WICHTIG: Nur für ZIMMER, nicht für Touren!
   */
  /**
   * Erstellt eine potenzielle Reservierung (Status "potential")
   * Wird aufgerufen, wenn User erste Buchungsinformationen gibt, aber noch nicht bestätigt hat
   */
  static async create_potential_reservation(
    args: {
      checkInDate: string;
      checkOutDate: string;
      guestName?: string; // Optional, kann später ergänzt werden
      roomType: 'compartida' | 'privada';
      categoryId: number;
      roomName?: string;
      guestPhone?: string; // WhatsApp-Telefonnummer (automatisch)
      guestEmail?: string; // Optional
    },
    userId: number | null,
    roleId: number | null,
    branchId: number,
    phoneNumber?: string // WhatsApp-Telefonnummer
  ): Promise<any> {
    try {
      // 1. Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
      let checkInDate: Date;
      const checkInDateStr = args.checkInDate.toLowerCase().trim();
      if (checkInDateStr === 'today' || checkInDateStr === 'heute' || checkInDateStr === 'hoy') {
        checkInDate = new Date();
        checkInDate.setHours(0, 0, 0, 0);
      } else if (checkInDateStr === 'tomorrow' || checkInDateStr === 'morgen' || checkInDateStr === 'mañana') {
        checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + 1);
        checkInDate.setHours(0, 0, 0, 0);
      } else if (checkInDateStr === 'day after tomorrow' || checkInDateStr === 'übermorgen' || checkInDateStr === 'pasado mañana') {
        checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + 2);
        checkInDate.setHours(0, 0, 0, 0);
      } else {
        checkInDate = this.parseDate(args.checkInDate);
        if (isNaN(checkInDate.getTime())) {
          throw new Error(`Ungültiges Check-in Datum: ${args.checkInDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
        }
      }

      let checkOutDate: Date;
      const checkOutDateStr = args.checkOutDate.toLowerCase().trim();
      if (checkOutDateStr === 'today' || checkOutDateStr === 'heute' || checkOutDateStr === 'hoy') {
        checkOutDate = new Date();
        checkOutDate.setHours(11, 0, 0, 0); // Check-out um 11:00 Uhr
      } else if (checkOutDateStr === 'tomorrow' || checkOutDateStr === 'morgen' || checkOutDateStr === 'mañana') {
        checkOutDate = new Date();
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        checkOutDate.setHours(11, 0, 0, 0); // Check-out um 11:00 Uhr
      } else if (checkOutDateStr === 'day after tomorrow' || checkOutDateStr === 'übermorgen' || checkOutDateStr === 'pasado mañana') {
        checkOutDate = new Date();
        checkOutDate.setDate(checkOutDate.getDate() + 2);
        checkOutDate.setHours(11, 0, 0, 0); // Check-out um 11:00 Uhr
      } else {
        checkOutDate = this.parseDate(args.checkOutDate);
        if (isNaN(checkOutDate.getTime())) {
          throw new Error(`Ungültiges Check-out Datum: ${args.checkOutDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
        }
        // Setze Check-out-Zeit auf 11:00 Uhr (auch bei geparsten Daten)
        checkOutDate.setHours(11, 0, 0, 0);
      }

      // 2. Validierung: Check-out muss mindestens 1 Tag nach Check-in liegen
      const daysDiff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 1) {
        throw new Error('Check-out Datum muss mindestens 1 Tag nach Check-in Datum liegen.');
      }

      // 3. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
      let guestPhone = args.guestPhone?.trim() || null;
      let guestEmail = args.guestEmail?.trim() || null;
      
      // Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
      if (!guestPhone && phoneNumber) {
        const { LanguageDetectionService } = await import('./languageDetectionService');
        guestPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
        logger.log(`[create_potential_reservation] WhatsApp-Telefonnummer als Fallback verwendet: ${guestPhone}`);
      }
      
      if (!guestPhone && !guestEmail) {
        throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Reservierung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
      }

      // 4. Hole Branch für organizationId
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { 
          id: true,
          name: true,
          organizationId: true 
        }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      // 5. Berechne Betrag aus Verfügbarkeitsprüfung
      // WICHTIG: Berechne Nächte basierend auf Kalendertagen (nicht Stunden-Differenz)
      // Beispiel: Check-in 16.12. 00:00, Check-out 17.12. 11:00 = 1 Nacht (nicht 2)
      const checkInDay = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
      const checkOutDay = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
      const nights = Math.max(1, Math.floor((checkOutDay.getTime() - checkInDay.getTime()) / (1000 * 60 * 60 * 24)));
      let estimatedAmount: number;
      
      try {
        const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
        const availability = await lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
        
        // Finde Zimmer mit dieser categoryId
        const room = availability.find(item => item.categoryId === args.categoryId);
        
        if (room && room.pricePerNight > 0) {
          estimatedAmount = nights * room.pricePerNight;
          logger.log(`[create_potential_reservation] Preis aus Verfügbarkeit: ${room.pricePerNight} COP/Nacht × ${nights} Nächte = ${estimatedAmount} COP`);
        } else {
          logger.warn(`[create_potential_reservation] Zimmer mit categoryId ${args.categoryId} nicht in Verfügbarkeit gefunden, verwende Platzhalter`);
          estimatedAmount = nights * 50000; // Platzhalter
        }
      } catch (error) {
        logger.error('[create_potential_reservation] Fehler beim Abrufen des Preises, verwende Platzhalter:', error);
        estimatedAmount = nights * 50000; // Platzhalter
      }

      // 6. Prüfe ob bereits eine "potential" Reservation existiert (verhindert Duplikate)
      const existingPotentialReservation = await prisma.reservation.findFirst({
        where: {
          guestPhone: guestPhone,
          branchId: branchId,
          status: ReservationStatus.potential,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate
        },
        orderBy: { createdAt: 'desc' }
      });

      let reservation;
      if (existingPotentialReservation) {
        // Aktualisiere bestehende Reservation
        logger.log(`[create_potential_reservation] Aktualisiere bestehende "potential" Reservation ${existingPotentialReservation.id}`);
        reservation = await prisma.reservation.update({
          where: { id: existingPotentialReservation.id },
          data: {
            guestName: args.guestName?.trim() || existingPotentialReservation.guestName,
            guestPhone: guestPhone,
            guestEmail: guestEmail,
            amount: estimatedAmount,
            currency: 'COP'
          }
        });
      } else {
        // Erstelle neue "potential" Reservation
        // WICHTIG: KEINE LobbyPMS-Buchung (erst bei Bestätigung!)
        reservation = await prisma.reservation.create({
          data: {
            guestName: args.guestName?.trim() || 'Gast', // Fallback wenn kein Name
            guestPhone: guestPhone,
            guestEmail: guestEmail,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            status: ReservationStatus.potential, // WICHTIG: Status "potential"
            paymentStatus: PaymentStatus.pending,
            amount: estimatedAmount,
            currency: 'COP',
            organizationId: branch.organizationId,
            branchId: branchId,
            // WICHTIG: lobbyReservationId bleibt null (wird erst bei Bestätigung erstellt)
            // WICHTIG: paymentDeadline bleibt null (wird erst bei Bestätigung gesetzt)
            autoCancelEnabled: false // Keine automatische Stornierung für "potential"
          }
        });
        logger.log(`[create_potential_reservation] Neue "potential" Reservation erstellt: ${reservation.id}`);
      }

      // 7. Verknüpfe WhatsApp-Nachrichten mit reservationId (über conversationId)
      // WICHTIG: conversationId muss übergeben werden, aber wir haben es hier nicht direkt
      // Lösung: Suche über phoneNumber und branchId
      try {
        const { LanguageDetectionService } = await import('./languageDetectionService');
        const normalizedPhone = guestPhone ? LanguageDetectionService.normalizePhoneNumber(guestPhone) : null;
        
        if (normalizedPhone) {
          // Finde Conversation für diese Telefonnummer
          const conversation = await prisma.whatsAppConversation.findUnique({
            where: {
              phoneNumber_branchId: {
                phoneNumber: normalizedPhone,
                branchId: branchId
              }
            },
            select: { id: true }
          });

          if (conversation) {
            // Verknüpfe alle Nachrichten dieser Conversation mit reservationId
            await prisma.whatsAppMessage.updateMany({
              where: {
                conversationId: conversation.id,
                reservationId: null // Nur Nachrichten ohne Reservation
              },
              data: {
                reservationId: reservation.id
              }
            });
            logger.log(`[create_potential_reservation] WhatsApp-Nachrichten mit Reservation ${reservation.id} verknüpft`);
          }
        }
      } catch (error) {
        logger.error('[create_potential_reservation] Fehler beim Verknüpfen der WhatsApp-Nachrichten:', error);
        // Nicht abbrechen, nur loggen
      }

      return {
        success: true,
        reservationId: reservation.id,
        branchId: branchId,
        branchName: branch.name,
        guestName: reservation.guestName,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        status: reservation.status,
        message: `Potenzielle Reservierung erstellt. Bitte bestätigen Sie die Buchung.`
      };
    } catch (error: any) {
      logger.error('[create_potential_reservation] Fehler:', error);
      throw new Error(`Fehler beim Erstellen der potenziellen Reservierung: ${error.message}`);
    }
  }

  static async create_room_reservation(
    args: {
      checkInDate: string;
      checkOutDate: string;
      guestName: string; // ERFORDERLICH: Name des Gastes (vollständiger Name)
      roomType: 'compartida' | 'privada';
      categoryId?: number;
      roomName?: string; // Optional: Zimmer-Name (z.B. "el abuelo viajero", "la tia artista")
      guestPhone?: string;
      guestEmail?: string;
    },
    userId: number | null,
    roleId: number | null,
    branchId: number, // WICHTIG: Wird automatisch aus Context übergeben
    phoneNumber?: string // Optional: WhatsApp-Telefonnummer (wird automatisch aus Context übergeben)
  ): Promise<any> {
    try {
      // 1. Parse Datum (unterstützt "today"/"heute"/"hoy"/"tomorrow"/"morgen"/"mañana")
      let checkInDate: Date;
      const checkInDateStr = args.checkInDate.toLowerCase().trim();
      if (checkInDateStr === 'today' || checkInDateStr === 'heute' || checkInDateStr === 'hoy') {
        checkInDate = new Date();
        checkInDate.setHours(0, 0, 0, 0);
      } else if (checkInDateStr === 'tomorrow' || checkInDateStr === 'morgen' || checkInDateStr === 'mañana') {
        checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + 1);
        checkInDate.setHours(0, 0, 0, 0);
      } else if (checkInDateStr === 'day after tomorrow' || checkInDateStr === 'übermorgen' || checkInDateStr === 'pasado mañana') {
        checkInDate = new Date();
        checkInDate.setDate(checkInDate.getDate() + 2);
        checkInDate.setHours(0, 0, 0, 0);
      } else {
        // Versuche verschiedene Datum-Formate zu parsen
        checkInDate = this.parseDate(args.checkInDate);
        if (isNaN(checkInDate.getTime())) {
          throw new Error(`Ungültiges Check-in Datum: ${args.checkInDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
        }
      }

      let checkOutDate: Date;
      const checkOutDateStr = args.checkOutDate.toLowerCase().trim();
      if (checkOutDateStr === 'today' || checkOutDateStr === 'heute' || checkOutDateStr === 'hoy') {
        checkOutDate = new Date();
        checkOutDate.setHours(11, 0, 0, 0); // Check-out um 11:00 Uhr
      } else if (checkOutDateStr === 'tomorrow' || checkOutDateStr === 'morgen' || checkOutDateStr === 'mañana') {
        checkOutDate = new Date();
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        checkOutDate.setHours(11, 0, 0, 0); // Check-out um 11:00 Uhr
      } else if (checkOutDateStr === 'day after tomorrow' || checkOutDateStr === 'übermorgen' || checkOutDateStr === 'pasado mañana') {
        checkOutDate = new Date();
        checkOutDate.setDate(checkOutDate.getDate() + 2);
        checkOutDate.setHours(11, 0, 0, 0); // Check-out um 11:00 Uhr
      } else {
        // Versuche verschiedene Datum-Formate zu parsen
        checkOutDate = this.parseDate(args.checkOutDate);
        if (isNaN(checkOutDate.getTime())) {
          throw new Error(`Ungültiges Check-out Datum: ${args.checkOutDate}. Format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, "today"/"heute"/"hoy" oder "tomorrow"/"morgen"/"mañana"`);
        }
        // Setze Check-out-Zeit auf 11:00 Uhr (auch bei geparsten Daten)
        checkOutDate.setHours(11, 0, 0, 0);
      }

      // 2. Validierung: Check-out muss mindestens 1 Tag nach Check-in liegen
      // WICHTIG: "heute bis heute" gibt es nicht! Check-out muss mindestens 1 Tag später sein
      const daysDiff = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff < 1) {
        throw new Error('Check-out Datum muss mindestens 1 Tag nach Check-in Datum liegen. Bitte geben Sie ein Check-out-Datum an (z.B. "morgen" oder ein konkretes Datum).');
      }

      // 3. Validierung: categoryId ist erforderlich für LobbyPMS Buchung
      // Wenn categoryId fehlt, versuche sie aus Zimmer-Namen zu finden (falls roomType und Name bekannt)
      let categoryId = args.categoryId;
      if (!categoryId) {
        // Versuche categoryId aus Verfügbarkeitsprüfung zu finden
        try {
          const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
          const availability = await lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
          
          // Finde Zimmer mit passendem roomType
          let matchingRooms = availability.filter(item => item.roomType === args.roomType);
          
          // WICHTIG: Wenn roomName angegeben ist, suche nach ähnlichem Namen
          if (args.roomName && matchingRooms.length > 1) {
            const roomNameLower = args.roomName.toLowerCase().trim();
            // Suche nach exakter Übereinstimmung oder Teilübereinstimmung
            const nameMatch = matchingRooms.find(item => {
              const itemNameLower = item.roomName.toLowerCase();
              return itemNameLower === roomNameLower || 
                     itemNameLower.includes(roomNameLower) || 
                     roomNameLower.includes(itemNameLower);
            });
            
            if (nameMatch) {
              categoryId = nameMatch.categoryId;
              logger.log(`[create_room_reservation] categoryId aus Zimmer-Namen gefunden: ${categoryId} (${nameMatch.roomName})`);
            } else {
              // Keine exakte Übereinstimmung, aber mehrere Zimmer → Fehler mit Alternativen
              const availableRoomNames = matchingRooms.map(r => r.roomName).join(', ');
              throw new Error(`Das Zimmer "${args.roomName}" ist nicht verfügbar oder wurde nicht gefunden. Verfügbare ${args.roomType === 'compartida' ? 'Dorm-Zimmer' : 'private Zimmer'}: ${availableRoomNames}. Bitte wählen Sie eines dieser Zimmer aus.`);
            }
          } else if (matchingRooms.length === 1) {
            // Nur ein Zimmer dieser Art verfügbar → verwende es
            categoryId = matchingRooms[0].categoryId;
            logger.log(`[create_room_reservation] categoryId aus Verfügbarkeit gefunden: ${categoryId} (${matchingRooms[0].roomName})`);
          } else if (matchingRooms.length > 1) {
            // Mehrere Zimmer verfügbar → kann nicht automatisch bestimmt werden, zeige Alternativen
            const availableRoomNames = matchingRooms.map(r => r.roomName).join(', ');
            throw new Error(`Mehrere ${args.roomType === 'compartida' ? 'Dorm-Zimmer' : 'private Zimmer'} verfügbar: ${availableRoomNames}. Bitte wählen Sie ein spezifisches Zimmer aus.`);
          } else {
            // Kein Zimmer dieser Art verfügbar → prüfe ob andere Zimmerarten verfügbar sind
            const allAvailableRooms = availability.map(item => `${item.roomName} (${item.roomType === 'compartida' ? 'Dorm' : 'Privat'})`).join(', ');
            if (allAvailableRooms) {
              throw new Error(`Keine ${args.roomType === 'compartida' ? 'Dorm-Zimmer' : 'private Zimmer'} für diese Daten verfügbar. Verfügbare Zimmer: ${allAvailableRooms}. Bitte wählen Sie ein anderes Zimmer.`);
            } else {
              throw new Error(`Keine Zimmer für diese Daten verfügbar. Bitte versuchen Sie es mit anderen Daten.`);
            }
          }
        } catch (error: any) {
          // Wenn automatische Suche fehlschlägt, werfe Fehler
          if (error.message.includes('Mehrere') || error.message.includes('Keine')) {
            throw error;
          }
          throw new Error('categoryId ist erforderlich für die Reservierung. Bitte zuerst Verfügbarkeit prüfen und ein Zimmer auswählen.');
        }
      }

      // 4. Hole Branch für organizationId (WICHTIG: branchId aus Context verwenden!)
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { 
          id: true,
          name: true,
          organizationId: true 
        }
      });

      if (!branch) {
        throw new Error(`Branch ${branchId} nicht gefunden`);
      }

      // 4.5. Validierung: Mindestens eine Kontaktinformation (Telefon ODER Email) ist erforderlich
      // WICHTIG: Nutze WhatsApp-Telefonnummer als Fallback, falls nicht angegeben
      let guestPhone = args.guestPhone?.trim() || null;
      let guestEmail = args.guestEmail?.trim() || null;
      
      // Fallback: Nutze WhatsApp-Telefonnummer, falls vorhanden
      if (!guestPhone && phoneNumber) {
        const { LanguageDetectionService } = await import('./languageDetectionService');
        guestPhone = LanguageDetectionService.normalizePhoneNumber(phoneNumber);
        logger.log(`[create_room_reservation] WhatsApp-Telefonnummer als Fallback verwendet: ${guestPhone}`);
      }
      
      if (!guestPhone && !guestEmail) {
        throw new Error('Mindestens eine Kontaktinformation (Telefonnummer oder Email) ist erforderlich für die Reservierung. Bitte geben Sie Ihre Telefonnummer oder Email-Adresse an.');
      }

      // 4.6. Validierung: guestName ist ERFORDERLICH
      if (!args.guestName || !args.guestName.trim()) {
        throw new Error('Der Name des Gastes ist erforderlich für die Reservierung. Bitte geben Sie Ihren vollständigen Namen an.');
      }
      // Bereinige Name von führenden Wörtern wie "ist", "mit", "für", "para"
      let guestName = args.guestName.trim();
      guestName = guestName.replace(/^(ist|mit|für|para|a nombre de|name|nombre)\s+/i, '').trim();

      // 5. Prüfe ob bereits eine "potential" Reservation existiert
      // WICHTIG: Normalisiere Telefonnummer für Suche
      const { LanguageDetectionService } = await import('./languageDetectionService');
      const searchPhone = guestPhone || (phoneNumber ? LanguageDetectionService.normalizePhoneNumber(phoneNumber) : null);
      
      // 5.1. Prüfe auf bestehende confirmed Reservation (Duplikat-Prüfung)
      if (searchPhone) {
        const existingConfirmedReservation = await prisma.reservation.findFirst({
          where: {
            guestPhone: searchPhone,
            branchId: branchId,
            status: ReservationStatus.confirmed,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate
          },
          orderBy: { createdAt: 'desc' }
        });

        if (existingConfirmedReservation) {
          logger.warn(`[create_room_reservation] Bestehende confirmed Reservation gefunden: ${existingConfirmedReservation.id} für ${searchPhone}, ${checkInDate.toISOString()} - ${checkOutDate.toISOString()}`);
          throw new Error('Eine Reservierung mit diesen Daten existiert bereits.');
        }
      }
      
      const existingPotentialReservation = searchPhone ? await prisma.reservation.findFirst({
        where: {
          guestPhone: searchPhone,
          branchId: branchId,
          status: ReservationStatus.potential,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate
        },
        orderBy: { createdAt: 'desc' }
      }) : null;

      let reservation;
      let lobbyReservationId: string | null = null;
      // Definiere roomNumber und roomDescription außerhalb der if/else-Blöcke, damit sie überall verfügbar sind
      let roomNumber: string | null = null;
      let roomDescription: string | null = null;

      if (existingPotentialReservation) {
        // Bestätigung einer "potential" Reservation
        logger.log(`[create_room_reservation] Bestätige "potential" Reservation ${existingPotentialReservation.id}`);
        
        // 5.1. Erstelle LobbyPMS-Buchung (nur bei Bestätigung!)
        try {
          const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
          lobbyReservationId = await lobbyPmsService.createBooking(
            categoryId,
            checkInDate,
            checkOutDate,
            guestName,
            guestEmail || undefined,
            guestPhone || undefined,
            1
          );
          logger.log(`[create_room_reservation] LobbyPMS Reservierung erstellt: booking_id=${lobbyReservationId}`);
          
          // Hole Reservierungsdetails aus LobbyPMS für roomNumber und roomDescription
          
          try {
            const lobbyReservation = await lobbyPmsService.fetchReservationById(lobbyReservationId);
            const assignedRoom = lobbyReservation.assigned_room;
            const isDorm = assignedRoom?.type === 'compartida';
            
            if (isDorm) {
              // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
              const dormName = lobbyReservation.category?.name || null;
              const bedNumber = assignedRoom?.name || null;
              roomNumber = dormName && bedNumber 
                ? `${dormName} (${bedNumber})`  // z.B. "La tia artista (Cama 5)"
                : bedNumber || dormName || null;
              roomDescription = dormName;
            } else {
              // Für Privatzimmer: assigned_room.name = Zimmername
              roomNumber = null;
              roomDescription = assignedRoom?.name || lobbyReservation.room_number || null;
            }
            
            logger.log(`[create_room_reservation] roomNumber=${roomNumber}, roomDescription=${roomDescription} aus LobbyPMS geholt`);
          } catch (roomError: any) {
            logger.error('[create_room_reservation] Fehler beim Abrufen der Zimmer-Details:', roomError);
            // Fallback: Verwende roomName aus Args
            if (args.roomName) {
              roomDescription = args.roomName;
              roomNumber = args.roomType === 'compartida' ? args.roomName : null;
            }
          }
        } catch (lobbyError: any) {
          logger.error('[create_room_reservation] Fehler beim Erstellen der LobbyPMS Reservierung:', lobbyError);
          throw new Error(`Fehler beim Erstellen der Reservierung in LobbyPMS: ${lobbyError.message}`);
        }
      } else {
        // Neue Reservation (Rückwärtskompatibilität)
        logger.log(`[create_room_reservation] Erstelle neue Reservation (keine "potential" Reservation gefunden)`);
        
        // 5.1. Erstelle Reservierung in LobbyPMS (WICHTIG: ZUERST in LobbyPMS, dann lokal!)
        try {
          const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
          lobbyReservationId = await lobbyPmsService.createBooking(
            categoryId, // Verwende gefundene oder übergebene categoryId
            checkInDate,
            checkOutDate,
            guestName,
            guestEmail || undefined, // Verwende validierte Email
            guestPhone || undefined, // Verwende validierte Telefonnummer
            1 // Anzahl Personen (default: 1, kann später erweitert werden)
          );
          logger.log(`[create_room_reservation] LobbyPMS Reservierung erstellt: booking_id=${lobbyReservationId}`);
          
          // Hole Reservierungsdetails aus LobbyPMS für roomNumber und roomDescription
          try {
            const lobbyReservation = await lobbyPmsService.fetchReservationById(lobbyReservationId);
            const assignedRoom = lobbyReservation.assigned_room;
            const isDorm = assignedRoom?.type === 'compartida';
            
            if (isDorm) {
              // Für Dorms: category.name = Zimmername, assigned_room.name = Bettnummer
              const dormName = lobbyReservation.category?.name || null;
              const bedNumber = assignedRoom?.name || null;
              roomNumber = dormName && bedNumber 
                ? `${dormName} (${bedNumber})`  // z.B. "La tia artista (Cama 5)"
                : bedNumber || dormName || null;
              roomDescription = dormName;
            } else {
              // Für Privatzimmer: assigned_room.name = Zimmername
              roomNumber = null;
              roomDescription = assignedRoom?.name || lobbyReservation.room_number || null;
            }
            
            logger.log(`[create_room_reservation] roomNumber=${roomNumber}, roomDescription=${roomDescription} aus LobbyPMS geholt`);
          } catch (roomError: any) {
            logger.error('[create_room_reservation] Fehler beim Abrufen der Zimmer-Details:', roomError);
            // Fallback: Verwende roomName aus Args
            if (args.roomName) {
              roomDescription = args.roomName;
              roomNumber = args.roomType === 'compartida' ? args.roomName : null;
            }
          }
        } catch (lobbyError: any) {
          logger.error('[create_room_reservation] Fehler beim Erstellen der LobbyPMS Reservierung:', lobbyError);
          throw new Error(`Fehler beim Erstellen der Reservierung in LobbyPMS: ${lobbyError.message}`);
        }
      }

      // 6. Berechne Betrag aus Verfügbarkeitsprüfung (falls categoryId vorhanden)
      // WICHTIG: Berechne Nächte basierend auf Kalendertagen (nicht Stunden-Differenz)
      // Beispiel: Check-in 16.12. 00:00, Check-out 17.12. 11:00 = 1 Nacht (nicht 2)
      const checkInDay = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
      const checkOutDay = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate());
      const nights = Math.max(1, Math.floor((checkOutDay.getTime() - checkInDay.getTime()) / (1000 * 60 * 60 * 24)));
      logger.log(`[create_room_reservation] Nächte berechnet: ${nights} (checkIn: ${checkInDate.toISOString()}, checkOut: ${checkOutDate.toISOString()})`);
      let estimatedAmount: number;
      
      if (args.categoryId || categoryId) {
        try {
          // Hole Preis aus Verfügbarkeitsprüfung für diese categoryId
          const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
          const availability = await lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
          
          // Finde Zimmer mit dieser categoryId
          const room = availability.find(item => item.categoryId === (args.categoryId || categoryId));
          
          if (room && room.pricePerNight > 0) {
            // Verwende Preis aus Verfügbarkeitsprüfung
            // TODO: Verschiedene Personenanzahl berücksichtigen (aktuell: 1 Person)
            estimatedAmount = nights * room.pricePerNight;
            logger.log(`[create_room_reservation] Preis aus Verfügbarkeit: room.pricePerNight=${room.pricePerNight} COP/Nacht, nights=${nights}, estimatedAmount=${estimatedAmount} COP`);
          } else {
            // Fallback: Platzhalter wenn Zimmer nicht gefunden
            logger.warn(`[create_room_reservation] Zimmer mit categoryId ${args.categoryId || categoryId} nicht in Verfügbarkeit gefunden, verwende Platzhalter`);
            estimatedAmount = nights * 50000; // Platzhalter
          }
        } catch (error) {
          // Fallback: Platzhalter bei Fehler
          logger.error('[create_room_reservation] Fehler beim Abrufen des Preises, verwende Platzhalter:', error);
          estimatedAmount = nights * 50000; // Platzhalter
        }
      } else {
        // Fallback: Platzhalter wenn keine categoryId
        logger.warn('[create_room_reservation] Keine categoryId angegeben, verwende Platzhalter');
        estimatedAmount = nights * 50000; // Platzhalter
      }

      // 7. Setze Payment-Deadline (konfigurierbar, Standard: 1 Stunde)
      const paymentDeadlineHours = parseInt(process.env.RESERVATION_PAYMENT_DEADLINE_HOURS || '1', 10);
      const paymentDeadline = new Date();
      paymentDeadline.setHours(paymentDeadline.getHours() + paymentDeadlineHours);

      // 8. Erstelle oder aktualisiere Reservierung in DB
      if (existingPotentialReservation) {
        // Aktualisiere bestehende "potential" Reservation: Status "potential" → "confirmed"
        logger.log(`[create_room_reservation] Aktualisiere Reservation ${existingPotentialReservation.id} mit amount=${estimatedAmount} COP`);
        reservation = await prisma.reservation.update({
          where: { id: existingPotentialReservation.id },
          data: {
            status: ReservationStatus.confirmed,
            guestName: guestName,
            guestPhone: guestPhone,
            guestEmail: guestEmail,
            lobbyReservationId: lobbyReservationId, // WICHTIG: LobbyPMS Booking ID!
            amount: estimatedAmount,
            currency: 'COP',
            // Logge Preis vor DB-Speicherung
            paymentDeadline: paymentDeadline, // Frist für Zahlung (Standard: 1 Stunde)
            autoCancelEnabled: true, // Automatische Stornierung aktiviert
            roomNumber: roomNumber, // Zimmername/Bettnummer für Dorms
            roomDescription: roomDescription // Zimmername für Privates
          }
        });
        logger.log(`[create_room_reservation] Reservation ${reservation.id} von "potential" auf "confirmed" aktualisiert`);
      } else {
          // Erstelle neue Reservation (Rückwärtskompatibilität)
          logger.log(`[create_room_reservation] Erstelle neue Reservation mit amount=${estimatedAmount} COP`);
          reservation = await prisma.reservation.create({
            data: {
              guestName: guestName,
              guestPhone: guestPhone, // Verwende validierte Telefonnummer
              guestEmail: guestEmail, // Verwende validierte Email
              checkInDate: checkInDate,
              checkOutDate: checkOutDate,
              status: ReservationStatus.confirmed,
              paymentStatus: PaymentStatus.pending,
              amount: estimatedAmount,
              currency: 'COP',
              organizationId: branch.organizationId,
              branchId: branchId, // WICHTIG: Branch-spezifisch!
              lobbyReservationId: lobbyReservationId, // WICHTIG: LobbyPMS Booking ID!
              paymentDeadline: paymentDeadline, // Frist für Zahlung (Standard: 1 Stunde)
              autoCancelEnabled: true, // Automatische Stornierung aktiviert
              roomNumber: roomNumber, // Zimmername/Bettnummer für Dorms
              roomDescription: roomDescription // Zimmername für Privates
              // HINWEIS: roomType und categoryId werden NICHT in der DB gespeichert, da sie nicht im Schema existieren.
              // Diese Informationen sind in LobbyPMS über lobbyReservationId verfügbar.
            }
          });
      }

      // 9. Erstelle Payment Link (wenn Telefonnummer vorhanden)
      let paymentLink: string | null = null;
      if (args.guestPhone || reservation.guestPhone) {
        try {
          logger.log(`[create_room_reservation] Erstelle Payment-Link mit estimatedAmount=${estimatedAmount} COP`);
          const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
          paymentLink = await boldPaymentService.createPaymentLink(
            reservation,
            estimatedAmount,
            'COP',
            `Zahlung für Reservierung ${reservation.guestName}`
          );
          
          // Aktualisiere Reservierung mit Payment Link
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { paymentLink }
          });
        } catch (error) {
          logger.error('[create_room_reservation] Fehler beim Erstellen des Payment-Links:', error);
          // Nicht abbrechen, nur loggen
        }
      }

      // 10. Generiere Check-in Link (falls Email vorhanden)
      // WICHTIG: Check-in Link kann erst nach erfolgreicher LobbyPMS-Buchung erstellt werden!
      let checkInLink: string | null = null;
      if (reservation.guestEmail && reservation.lobbyReservationId) {
        try {
          checkInLink = generateLobbyPmsCheckInLink({
            id: reservation.id,
            lobbyReservationId: reservation.lobbyReservationId,
            guestEmail: reservation.guestEmail
          });
          
          // Check-in Link in DB speichern
          await prisma.reservation.update({
            where: { id: reservation.id },
            data: { checkInLink }
          });
          logger.log(`[create_room_reservation] Check-in Link in DB gespeichert: ${checkInLink}`);
        } catch (error) {
          logger.error('[create_room_reservation] Fehler beim Generieren des Check-in-Links:', error);
        }
      }

      // 11. Finde roomName aus Verfügbarkeit (falls nicht bereits vorhanden)
      let roomName = args.roomName;
      if (!roomName && categoryId) {
        try {
          const lobbyPmsService = await LobbyPmsService.createForBranch(branchId);
          const availability = await lobbyPmsService.checkAvailability(checkInDate, checkOutDate);
          const matchingRoom = availability.find(item => item.categoryId === categoryId);
          if (matchingRoom) {
            roomName = matchingRoom.roomName;
          }
        } catch (error) {
          logger.error('[create_room_reservation] Fehler beim Abrufen des Zimmer-Namens:', error);
          // Nicht kritisch, weiter ohne roomName
        }
      }

      // 12. Return Ergebnis
      // WICHTIG: Die AI generiert die Nachricht mit paymentLink und checkInLink
      // sendReservationInvitation wird NICHT aufgerufen - die AI sendet die Nachricht
      // WICHTIG: Alle Informationen müssen enthalten sein, damit die AI eine vollständige Nachricht generieren kann
      return {
        success: true,
        reservationId: reservation.id,
        lobbyReservationId: lobbyReservationId, // WICHTIG: LobbyPMS Booking ID
        branchId: branchId, // WICHTIG: Branch-ID zurückgeben
        branchName: branch.name,
        guestName: reservation.guestName,
        checkInDate: checkInDate.toISOString().split('T')[0],
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        roomType: args.roomType,
        roomName: roomName || undefined, // Zimmer-Name für vollständige Nachricht
        categoryId: categoryId, // Verwende gefundene oder übergebene categoryId
        amount: estimatedAmount,
        currency: 'COP',
        paymentLink: paymentLink,
        checkInLink: checkInLink, // Kann null sein, wenn keine Email vorhanden
        paymentDeadline: paymentDeadline.toISOString(),
        linksSent: false // WICHTIG: AI generiert die Nachricht, nicht sendReservationInvitation
        // Technische Message entfernt - KI generiert benutzerfreundliche Nachricht
      };
    } catch (error: any) {
      logger.error('[WhatsApp Function Handlers] create_room_reservation Fehler:', error);
      throw error;
    }
  }
}

