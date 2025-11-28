import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import { LobbyPmsService } from './lobbyPmsService';

/**
 * WhatsApp Function Handlers
 * 
 * Implementiert Funktionen für OpenAI Function Calling.
 * Jede Funktion prüft Berechtigungen und lädt Daten basierend auf User-Rolle.
 */
export class WhatsAppFunctionHandlers {
  /**
   * Holt Requests (Solicitudes) für einen User
   */
  static async get_requests(
    args: any,
    userId: number,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 2. Prüfe Berechtigung
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
      
      // 2. Parse Arguments
      const status = args.status;
      const dueDate = args.dueDate === 'today' 
        ? new Date() 
        : args.dueDate ? new Date(args.dueDate) : undefined;
      const targetUserId = args.userId || userId;
      
      // 3. Baue Where-Clause
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
      
      // 4. Lade Daten
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
      
      // 5. Formatiere für KI
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
      console.error('[WhatsApp Function Handlers] get_requests Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt Todos/Tasks für einen User
   */
  static async get_todos(
    args: any,
    userId: number,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 2. Prüfe Berechtigung
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
      
      // 2. Parse Arguments
      const status = args.status;
      const dueDate = args.dueDate === 'today' 
        ? new Date() 
        : args.dueDate ? new Date(args.dueDate) : undefined;
      const targetUserId = args.userId || userId;
      
      // 3. Baue Where-Clause
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
      
      // 4. Lade Daten
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
      
      // 5. Formatiere für KI
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
      console.error('[WhatsApp Function Handlers] get_todos Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt Arbeitszeiten für einen User
   */
  static async get_worktime(
    args: any,
    userId: number,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 2. Prüfe Berechtigung
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
      
      // 2. Parse Arguments
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
      
      // 4. Lade Daten
      const worktimes = await prisma.workTime.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: 50
      });
      
      // 5. Berechne Gesamtzeit
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
      
      // 6. Formatiere für KI
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
      console.error('[WhatsApp Function Handlers] get_worktime Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt Cerebro-Artikel basierend auf Suchbegriffen
   */
  static async get_cerebro_articles(
    args: any,
    userId: number,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe ob roleId vorhanden ist
      if (!roleId) {
        throw new Error('Keine Rolle gefunden. Bitte wende dich an einen Administrator.');
      }
      
      // 2. Prüfe Berechtigung
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
      
      // 2. Parse Arguments
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
      
      // 4. Lade Daten
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
      
      // 5. Formatiere für KI
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
      console.error('[WhatsApp Function Handlers] get_cerebro_articles Fehler:', error);
      throw error;
    }
  }
  
  /**
   * Holt User-Informationen
   */
  static async get_user_info(
    args: any,
    userId: number,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Parse Arguments
      const targetUserId = args.userId || userId;
      
      // 2. Prüfe ob User eigene Daten abruft oder andere
      if (targetUserId !== userId) {
        // TODO: Prüfe ob User Berechtigung hat, andere User-Daten zu sehen
        // Für jetzt: Nur eigene Daten erlauben
        throw new Error('Nur eigene User-Informationen können abgerufen werden');
      }
      
      // 3. Lade User-Daten
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
      
      // 4. Formatiere für KI
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
      console.error('[WhatsApp Function Handlers] get_user_info Fehler:', error);
      throw error;
    }
  }

  /**
   * Prüft Zimmerverfügbarkeit für einen Zeitraum
   */
  static async check_room_availability(
    args: {
      startDate: string; // Format: YYYY-MM-DD
      endDate?: string; // Format: YYYY-MM-DD (optional, falls nicht angegeben: startDate + 1 Tag)
      roomType?: 'compartida' | 'privada'; // Optional: Filter nach Zimmerart
      branchId?: number; // Optional: Branch ID (verwendet branchId aus Context wenn nicht angegeben)
    },
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Parse Datum
      const startDate = new Date(args.startDate);
      if (isNaN(startDate.getTime())) {
        throw new Error(`Ungültiges Startdatum: ${args.startDate}. Format: YYYY-MM-DD`);
      }

      let endDate: Date;
      if (args.endDate) {
        endDate = new Date(args.endDate);
        if (isNaN(endDate.getTime())) {
          throw new Error(`Ungültiges Enddatum: ${args.endDate}. Format: YYYY-MM-DD`);
        }
      } else {
        // Falls nicht angegeben: startDate + 1 Tag
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
      }

      // 2. Prüfe Datum-Logik
      if (endDate <= startDate) {
        throw new Error('Enddatum muss nach Startdatum liegen');
      }

      // 3. Verwende branchId aus args oder Context
      const targetBranchId = args.branchId || branchId;

      // 4. Erstelle LobbyPMS Service
      const service = await LobbyPmsService.createForBranch(targetBranchId);

      // 5. Rufe Verfügbarkeits-API auf
      const availability = await service.checkAvailability(startDate, endDate);

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
      const rooms = Array.from(roomMap.values()).map(room => ({
        categoryId: room.categoryId,
        name: room.roomName,
        type: room.roomType,
        availableRooms: room.minAvailableRooms, // Minimum über alle Daten
        pricePerNight: room.pricePerNight,
        currency: room.currency,
        prices: room.prices.map(p => ({
          people: p.people,
          price: p.value
        })),
        availability: room.dates.map(d => ({
          date: d.date,
          availableRooms: d.availableRooms
        }))
      }));

      return {
        startDate: args.startDate,
        endDate: endDate.toISOString().split('T')[0],
        roomType: args.roomType || 'all',
        totalRooms: rooms.length,
        rooms: rooms
      };
    } catch (error: any) {
      console.error('[WhatsApp Function Handlers] check_room_availability Fehler:', error);
      throw error;
    }
  }
}

