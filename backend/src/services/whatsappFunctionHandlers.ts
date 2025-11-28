import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';
import { LobbyPmsService } from './lobbyPmsService';
import { BoldPaymentService } from './boldPaymentService';

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
      startDate: string; // Format: YYYY-MM-DD oder "today"/"heute"
      endDate?: string; // Format: YYYY-MM-DD oder "today"/"heute" (optional, falls nicht angegeben: startDate + 1 Tag)
      roomType?: 'compartida' | 'privada'; // Optional: Filter nach Zimmerart
      branchId?: number; // Optional: Branch ID (verwendet branchId aus Context wenn nicht angegeben)
    },
    userId: number | null,
    roleId: number | null,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Parse Datum (unterstützt "today"/"heute")
      let startDate: Date;
      const startDateStr = args.startDate.toLowerCase().trim();
      if (startDateStr === 'today' || startDateStr === 'heute' || startDateStr === 'hoy') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Setze auf Mitternacht
      } else {
        startDate = new Date(args.startDate);
        if (isNaN(startDate.getTime())) {
          throw new Error(`Ungültiges Startdatum: ${args.startDate}. Format: YYYY-MM-DD oder "today"/"heute"`);
        }
      }

      let endDate: Date;
      if (args.endDate) {
        const endDateStr = args.endDate.toLowerCase().trim();
        if (endDateStr === 'today' || endDateStr === 'heute' || endDateStr === 'hoy') {
          endDate = new Date();
          endDate.setHours(23, 59, 59, 999); // Setze auf Ende des Tages
        } else {
          endDate = new Date(args.endDate);
          if (isNaN(endDate.getTime())) {
            throw new Error(`Ungültiges Enddatum: ${args.endDate}. Format: YYYY-MM-DD oder "today"/"heute"`);
          }
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
      console.log(`[WhatsApp Function Handlers] check_room_availability: ${availability.length} Einträge, ${uniqueCategories.size} eindeutige Kategorien`);
      for (const cat of uniqueCategories) {
        console.log(`[WhatsApp Function Handlers]   - ${cat}`);
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
      // WICHTIG: Zeige Zimmer auch wenn minAvailableRooms = 0, aber maxAvailableRooms > 0 (verfügbar an mindestens einem Tag)
      const rooms = Array.from(roomMap.values())
        .filter(room => room.maxAvailableRooms > 0) // Filtere nur wenn mindestens an einem Tag verfügbar
        .map(room => ({
          categoryId: room.categoryId,
          name: room.roomName,
          type: room.roomType,
          availableRooms: room.minAvailableRooms, // Minimum über alle Daten
          maxAvailableRooms: room.maxAvailableRooms, // Maximum über alle Daten (für Info)
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
        }));

      // Debug: Logge alle formatierten Zimmer
      console.log(`[WhatsApp Function Handlers] check_room_availability: ${rooms.length} Zimmer formatiert`);
      for (const room of rooms) {
        console.log(`[WhatsApp Function Handlers]   - ${room.name} (${room.type}): ${room.availableRooms} verfügbar, ${room.pricePerNight.toLocaleString('de-CH')} COP`);
      }

      return {
        startDate: args.startDate,
        endDate: endDate.toISOString().split('T')[0],
        roomType: args.roomType || 'all',
        totalRooms: rooms.length,
        rooms: rooms.map(room => ({
          ...room,
          // WICHTIG: Füge explizite Terminologie-Hinweise hinzu für KI
          description: room.type === 'compartida' 
            ? `${room.name}: ${room.availableRooms} ${room.availableRooms === 1 ? 'Bett' : 'Betten'} verfügbar (Dorm-Zimmer)`
            : `${room.name}: ${room.availableRooms} ${room.availableRooms === 1 ? 'Zimmer' : 'Zimmer'} verfügbar (privates Zimmer)`
        }))
      };
    } catch (error: any) {
      console.error('[WhatsApp Function Handlers] check_room_availability Fehler:', error);
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
    branchId: number
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
      
      return tours.map(t => ({
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
        imageUrl: t.imageUrl,
        hasGallery: !!t.galleryUrls && Array.isArray(t.galleryUrls) && t.galleryUrls.length > 0
      }));
    } catch (error: any) {
      console.error('[WhatsApp Function Handlers] get_tours Fehler:', error);
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
          console.warn('[get_tour_details] Fehler beim Parsen von galleryUrls:', e);
        }
      }
      
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
        imageUrl: tour.imageUrl,
        galleryUrls: galleryUrls,
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
      console.error('[WhatsApp Function Handlers] get_tour_details Fehler:', error);
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
    branchId: number
  ): Promise<any> {
    try {
      // Validierung
      if (!args.tourId || !args.tourDate || !args.numberOfParticipants || !args.customerName) {
        throw new Error('Fehlende erforderliche Parameter: tourId, tourDate, numberOfParticipants, customerName');
      }
      
      if (!args.customerPhone && !args.customerEmail) {
        throw new Error('Mindestens eine Kontaktinformation (customerPhone oder customerEmail) ist erforderlich');
      }
      
      // Parse Datum
      const tourDate = new Date(args.tourDate);
      if (tourDate < new Date()) {
        throw new Error('Tour-Datum muss in der Zukunft sein');
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
          customerEmail: args.customerEmail?.trim() || null,
          customerPhone: args.customerPhone?.trim() || null,
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
      
      // Generiere Payment Link (analog zu tourBookingController)
      let paymentLink: string | null = null;
      if (totalPrice > 0 && (args.customerPhone || args.customerEmail)) {
        try {
          // Erstelle "Dummy"-Reservation für Payment Link
          const dummyReservation = await prisma.reservation.create({
            data: {
              guestName: args.customerName,
              guestPhone: args.customerPhone || null,
              guestEmail: args.customerEmail || null,
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
          
          const boldPaymentService = await BoldPaymentService.createForBranch(branchId);
          paymentLink = await boldPaymentService.createPaymentLink(
            dummyReservation,
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
          console.error('[book_tour] Fehler beim Erstellen des Payment-Links:', paymentError);
          // Nicht abbrechen, nur loggen
        }
      }
      
      // Berechne Kommission (falls bookedById vorhanden)
      if (userId) {
        try {
          const { calculateCommission } = await import('../services/commissionService');
          await calculateCommission(booking.id);
        } catch (commissionError) {
          console.error('[book_tour] Fehler bei Kommissions-Berechnung:', commissionError);
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
          console.error('[book_tour] Fehler beim Senden der WhatsApp-Nachricht:', whatsappError);
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
      console.error('[WhatsApp Function Handlers] book_tour Fehler:', error);
      throw error;
    }
  }
}

