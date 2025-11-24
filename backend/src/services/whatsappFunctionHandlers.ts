import { prisma } from '../utils/prisma';
import { checkUserPermission } from '../middleware/permissionMiddleware';

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
    roleId: number,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe Berechtigung
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
    roleId: number,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe Berechtigung
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
    roleId: number,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe Berechtigung
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
    roleId: number,
    branchId: number
  ): Promise<any> {
    try {
      // 1. Prüfe Berechtigung
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
    roleId: number,
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
}

