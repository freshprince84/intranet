import { Reservation, NotificationType } from '@prisma/client';
import { createNotificationIfEnabled } from '../controllers/notificationController';
import { getUserLanguage, getTaskNotificationText } from '../utils/translations';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * Service für automatische Task-Erstellung bei Lebenszyklus-Events
 */
export class TaskAutomationService {
  /**
   * Erstellt automatisch Onboarding-Tasks für Sozialversicherungen
   * Wird aufgerufen, wenn ein neuer Lebenszyklus erstellt wird (Onboarding-Start)
   */
  static async createOnboardingTasks(userId: number, organizationId: number) {
    try {
      // Hole User und Organization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          branches: {
            take: 1,
            include: {
              branch: true
            }
            }
        }
      });

      if (!user) {
        throw new Error('User nicht gefunden');
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (!organization) {
        throw new Error('Organisation nicht gefunden');
      }

      // Hole Rollen-Konfiguration
      const settings = organization.settings as any;
      const lifecycleRoles = settings?.lifecycleRoles;
      
      // Bestimme Legal-Rolle (für Sozialversicherungs-Tasks)
      let legalRoleId: number | null = null;
      
      if (lifecycleRoles?.legalRoleId) {
        legalRoleId = lifecycleRoles.legalRoleId;
      } else {
        // Fallback: Suche nach "Derecho"-Rolle
        const derechoRole = await prisma.role.findFirst({
          where: {
            organizationId,
            name: {
              contains: 'Derecho',
              mode: 'insensitive'
            }
          }
        });
        if (derechoRole) {
          legalRoleId = derechoRole.id;
        }
      }

      // Wenn keine Legal-Rolle gefunden, keine Tasks erstellen
      if (!legalRoleId) {
        logger.warn(`[createOnboardingTasks] Keine Legal-Rolle gefunden für Organisation ${organizationId}. Onboarding-Tasks werden nicht erstellt.`);
        logger.warn(`[createOnboardingTasks] LifecycleRoles config:`, JSON.stringify(lifecycleRoles, null, 2));
        
        // Debug: Zeige alle Rollen der Organisation
        const allRoles = await prisma.role.findMany({
          where: { organizationId },
          select: { id: true, name: true }
        });
        logger.warn(`[createOnboardingTasks] Verfügbare Rollen in Organisation ${organizationId}:`, allRoles);
        
        return [];
      }

      logger.log(`[createOnboardingTasks] Legal-Rolle gefunden: ID=${legalRoleId} für Organisation ${organizationId}`);

      // Bestimme Admin-User für Quality Control
      let adminUserId: number | null = null;
      if (lifecycleRoles?.adminRoleId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            roles: {
              some: {
                roleId: lifecycleRoles.adminRoleId,
                lastUsed: true
              }
            }
          }
        });
        if (adminUser) {
          adminUserId = adminUser.id;
        }
      }
      
      // Fallback: Suche nach Admin-Rolle und ersten Admin-User
      if (!adminUserId) {
        const adminRole = await prisma.role.findFirst({
          where: {
            organizationId,
            name: {
              contains: 'Admin',
              mode: 'insensitive'
            }
          }
        });
        if (adminRole) {
          const adminUser = await prisma.user.findFirst({
            where: {
              roles: {
                some: {
                  roleId: adminRole.id,
                  lastUsed: true
                }
              }
            }
          });
          if (adminUser) {
            adminUserId = adminUser.id;
          }
        }
      }

      // Hole erste Branch des Users (für Tasks)
      let userBranch = user.branches[0]?.branch;
      
      // Fallback: Wenn User keine Branch hat, verwende erste Branch der Organisation
      if (!userBranch) {
        logger.warn(`[createOnboardingTasks] User ${userId} hat keine Niederlassung zugewiesen. Verwende erste Branch der Organisation.`);
        const firstOrgBranch = await prisma.branch.findFirst({
          where: { organizationId },
          orderBy: { id: 'asc' }
        });
        
        if (!firstOrgBranch) {
          logger.error(`[createOnboardingTasks] Keine Branch in Organisation ${organizationId} gefunden. Tasks können nicht erstellt werden.`);
          throw new Error('Organisation hat keine Niederlassung. Bitte erstellen Sie zuerst eine Niederlassung.');
        }
        
        userBranch = firstOrgBranch;
        logger.log(`[createOnboardingTasks] Verwende Branch "${userBranch.name}" (ID: ${userBranch.id}) als Fallback.`);
      }

      // Definiere Tasks für Sozialversicherungen (Kolumbien)
      const socialSecurityTasks = [
        {
          title: 'Realizar afiliación ARL',
          description: `Realizar afiliación ARL para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
          type: 'arl' as const
        },
        {
          title: 'Revisar/realizar afiliación EPS',
          description: `Revisar afiliación EPS para ${user.firstName} ${user.lastName}. Si es necesario, realizar la afiliación.`,
          type: 'eps' as const
        },
        {
          title: 'Realizar afiliación Pensión',
          description: `Realizar afiliación Pensión para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
          type: 'pension' as const
        },
        {
          title: 'Realizar afiliación Caja',
          description: `Realizar afiliación Caja para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
          type: 'caja' as const
        }
      ];

      const createdTasks = [];

      // Erstelle Tasks
      for (const taskData of socialSecurityTasks) {
        try {
          const taskDataToCreate: any = {
            title: taskData.title,
            description: taskData.description,
            status: 'open',
            roleId: legalRoleId,
            branchId: userBranch.id,
            organizationId: organizationId || undefined,
            // Setze Fälligkeitsdatum auf 7 Tage in der Zukunft
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          };

          // Füge qualityControlId nur hinzu, wenn ein Admin-User gefunden wurde
          if (adminUserId) {
            taskDataToCreate.qualityControlId = adminUserId;
          }

          logger.log(`[createOnboardingTasks] Erstelle Task "${taskData.title}" mit Daten:`, {
            roleId: legalRoleId,
            qualityControlId: adminUserId,
            organizationId: organizationId,
            branchId: userBranch.id
          });

          const task = await prisma.task.create({
            data: taskDataToCreate,
            include: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });

          logger.log(`[createOnboardingTasks] Task erstellt: ID=${task.id}, Title="${task.title}", RoleId=${task.roleId}, OrganizationId=${task.organizationId}`);

          createdTasks.push(task);

          // Erstelle Lifecycle-Event
          const lifecycle = await prisma.employeeLifecycle.findUnique({
            where: { userId }
          });

          if (lifecycle) {
            await prisma.lifecycleEvent.create({
              data: {
                lifecycleId: lifecycle.id,
                eventType: `task_created_${taskData.type}`,
                eventData: {
                  taskId: task.id,
                  taskTitle: task.title,
                  taskType: taskData.type
                }
              }
            });
          }

          // Benachrichtigung für alle User mit Legal-Rolle
          const legalUsers = await prisma.user.findMany({
            where: {
              roles: {
                some: {
                  roleId: legalRoleId,
                  lastUsed: true
                }
              }
            }
          });

          for (const legalUser of legalUsers) {
            const userLang = await getUserLanguage(legalUser.id);
            const notificationText = getTaskNotificationText(userLang, 'new_onboarding_task', task.title);
            await createNotificationIfEnabled({
              userId: legalUser.id,
              title: notificationText.title,
              message: notificationText.message,
              type: NotificationType.task,
              relatedEntityId: task.id,
              relatedEntityType: 'create'
            });
          }
        } catch (error) {
          logger.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
          // Weiter mit nächstem Task
        }
      }

      return createdTasks;
    } catch (error) {
      logger.error('Fehler beim Erstellen der Onboarding-Tasks:', error);
      throw error;
    }
  }

  /**
   * Erstellt automatisch Offboarding-Tasks
   * Wird aufgerufen, wenn Offboarding gestartet wird
   */
  static async createOffboardingTasks(userId: number, organizationId: number) {
    try {
      // Hole User und Organization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          branches: {
            take: 1,
            include: {
              branch: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User nicht gefunden');
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (!organization) {
        throw new Error('Organisation nicht gefunden');
      }

      // Hole Rollen-Konfiguration
      const settings = organization.settings as any;
      const lifecycleRoles = settings?.lifecycleRoles;
      
      // Bestimme HR-Rolle (für Offboarding-Tasks)
      let hrRoleId: number | null = null;
      
      if (lifecycleRoles?.hrRoleId) {
        hrRoleId = lifecycleRoles.hrRoleId;
      } else if (lifecycleRoles?.adminRoleId) {
        // Fallback: Admin-Rolle
        hrRoleId = lifecycleRoles.adminRoleId;
      } else {
        // Fallback: Suche nach Admin-Rolle
        const adminRole = await prisma.role.findFirst({
          where: {
            organizationId,
            name: {
              contains: 'Admin',
              mode: 'insensitive'
            }
          }
        });
        if (adminRole) {
          hrRoleId = adminRole.id;
        }
      }

      if (!hrRoleId) {
        logger.warn(`Keine HR-Rolle gefunden für Organisation ${organizationId}. Offboarding-Tasks werden nicht erstellt.`);
        return [];
      }

      // Hole erste Branch des Users
      const userBranch = user.branches[0]?.branch;
      if (!userBranch) {
        throw new Error('User hat keine Niederlassung zugewiesen');
      }

      // Definiere Offboarding-Tasks
      const offboardingTasks = [
        {
          title: 'Crear certificado laboral',
          description: `Crear certificado laboral para ${user.firstName} ${user.lastName}.`,
          type: 'certificate' as const
        },
        {
          title: 'Realizar liquidación final',
          description: `Realizar liquidación final para ${user.firstName} ${user.lastName}.`,
          type: 'payroll' as const
        },
        {
          title: 'Desafiliar de seguridad social',
          description: `Desafiliar de seguridad social (ARL, EPS, Pensión, Caja) para ${user.firstName} ${user.lastName}.`,
          type: 'social_security' as const
        }
      ];

      const createdTasks = [];

      // Erstelle Tasks
      for (const taskData of offboardingTasks) {
        try {
          const task = await prisma.task.create({
            data: {
              title: taskData.title,
              description: taskData.description,
              status: 'open',
              roleId: hrRoleId,
              branchId: userBranch.id,
              organizationId: organizationId || undefined
            } as any,
            include: {
              role: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });

          createdTasks.push(task);

          // Erstelle Lifecycle-Event
          const lifecycle = await prisma.employeeLifecycle.findUnique({
            where: { userId }
          });

          if (lifecycle) {
            await prisma.lifecycleEvent.create({
              data: {
                lifecycleId: lifecycle.id,
                eventType: `task_created_${taskData.type}`,
                eventData: {
                  taskId: task.id,
                  taskTitle: task.title,
                  taskType: taskData.type
                }
              }
            });
          }

          // Benachrichtigung für alle User mit HR-Rolle
          const hrUsers = await prisma.user.findMany({
            where: {
              roles: {
                some: {
                  roleId: hrRoleId,
                  lastUsed: true
                }
              }
            }
          });

          for (const hrUser of hrUsers) {
            const userLang = await getUserLanguage(hrUser.id);
            const notificationText = getTaskNotificationText(userLang, 'new_offboarding_task', task.title);
            await createNotificationIfEnabled({
              userId: hrUser.id,
              title: notificationText.title,
              message: notificationText.message,
              type: NotificationType.task,
              relatedEntityId: task.id,
              relatedEntityType: 'create'
            });
          }
        } catch (error) {
          logger.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
          // Weiter mit nächstem Task
        }
      }

      return createdTasks;
    } catch (error) {
      logger.error('Fehler beim Erstellen der Offboarding-Tasks:', error);
      throw error;
    }
  }

  /**
   * Erstellt einen einzelnen Task für eine Sozialversicherung
   * Wird verwendet, wenn eine Sozialversicherung manuell als "pending" gesetzt wird
   */
  static async createSocialSecurityTask(
    userId: number,
    organizationId: number,
    type: 'arl' | 'eps' | 'pension' | 'caja'
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          branches: {
            take: 1,
            include: {
              branch: true
            }
          }
        }
      });

      if (!user) {
        throw new Error('User nicht gefunden');
      }

      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (!organization) {
        throw new Error('Organisation nicht gefunden');
      }

      // Hole Rollen-Konfiguration
      const settings = organization.settings as any;
      const lifecycleRoles = settings?.lifecycleRoles;
      
      // Bestimme Legal-Rolle
      let legalRoleId: number | null = null;
      
      if (lifecycleRoles?.legalRoleId) {
        legalRoleId = lifecycleRoles.legalRoleId;
      } else {
        const derechoRole = await prisma.role.findFirst({
          where: {
            organizationId,
            name: {
              contains: 'Derecho',
              mode: 'insensitive'
            }
          }
        });
        if (derechoRole) {
          legalRoleId = derechoRole.id;
        }
      }

      if (!legalRoleId) {
        throw new Error('Keine Legal-Rolle gefunden');
      }

      const userBranch = user.branches[0]?.branch;
      if (!userBranch) {
        throw new Error('User hat keine Niederlassung zugewiesen');
      }

      const taskTitles: Record<typeof type, string> = {
        arl: 'Realizar afiliación ARL',
        eps: 'Revisar/realizar afiliación EPS',
        pension: 'Realizar afiliación Pensión',
        caja: 'Realizar afiliación Caja'
      };

      const task = await prisma.task.create({
        data: {
          title: taskTitles[type],
          description: `${taskTitles[type]} para ${user.firstName} ${user.lastName}. Los datos requeridos se generarán automáticamente.`,
          status: 'open',
          roleId: legalRoleId,
          branchId: userBranch.id,
          organizationId: organizationId || undefined,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        } as any,
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Erstelle Lifecycle-Event
      const lifecycle = await prisma.employeeLifecycle.findUnique({
        where: { userId }
      });

      if (lifecycle) {
        await prisma.lifecycleEvent.create({
          data: {
            lifecycleId: lifecycle.id,
            eventType: `task_created_${type}`,
            eventData: {
              taskId: task.id,
              taskTitle: task.title,
              taskType: type
            }
          }
        });
      }

      // Benachrichtigung für Legal-User
      const legalUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              roleId: legalRoleId,
              lastUsed: true
            }
          }
        }
      });

      for (const legalUser of legalUsers) {
        const userLang = await getUserLanguage(legalUser.id);
        const notificationText = getTaskNotificationText(userLang, 'new_social_security_task', task.title);
        await createNotificationIfEnabled({
          userId: legalUser.id,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'create'
        });
      }

      return task;
    } catch (error) {
      logger.error(`Fehler beim Erstellen des Sozialversicherungs-Tasks (${type}):`, error);
      throw error;
    }
  }

  /**
   * Erstellt automatisch einen Task für eine Reservierung
   * Wird aufgerufen, wenn eine neue Reservierung synchronisiert wird
   * 
   * @param reservation - Reservierung
   * @param organizationId - ID der Organisation
   * @returns Erstellter Task
   */
  static async createReservationTask(reservation: Reservation, organizationId: number) {
    try {
      // Hole Organisation Settings
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      if (!organization) {
        throw new Error('Organisation nicht gefunden');
      }

      const settings = organization.settings as any;
      const lobbyPmsSettings = settings?.lobbyPms;

      // Prüfe ob automatische Task-Erstellung aktiviert ist
      if (!lobbyPmsSettings?.autoCreateTasks) {
        logger.log(`[TaskAutomation] Automatische Task-Erstellung ist für Organisation ${organizationId} deaktiviert`);
        return null;
      }

      // Bestimme zuständige Rolle (Cleaning)
      let cleaningRoleId: number | null = null;

      // Suche nach "Cleaning" oder ähnlicher Rolle
      const cleaningRole = await prisma.role.findFirst({
        where: {
          organizationId,
          name: {
            in: ['Cleaning', 'Limpieza', 'Reinigung'],
            mode: 'insensitive'
          }
        }
      });

      if (cleaningRole) {
        cleaningRoleId = cleaningRole.id;
      } else {
        // Fallback: Verwende erste verfügbare Rolle der Organisation
        const firstRole = await prisma.role.findFirst({
          where: { organizationId }
        });
        if (firstRole) {
          cleaningRoleId = firstRole.id;
        }
      }

      if (!cleaningRoleId) {
        logger.warn(`[TaskAutomation] Keine Cleaning-Rolle gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
        return null;
      }

      // Hole Branch der Reservation (falls vorhanden), sonst erste Branch der Organisation
      let branchId: number | null = null;
      
      if (reservation.branchId) {
        branchId = reservation.branchId;
        logger.log(`[TaskAutomation] Verwende Branch ${branchId} aus Reservation`);
      } else {
        // Fallback: Hole erste Branch der Organisation
      const branch = await prisma.branch.findFirst({
        where: { organizationId }
      });

      if (!branch) {
        logger.warn(`[TaskAutomation] Keine Branch gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
        return null;
        }
        branchId = branch.id;
        logger.log(`[TaskAutomation] Verwende erste Branch ${branchId} der Organisation (Reservation hat keine branchId)`);
      }

      // Prüfe ob bereits ein Task für diese Reservierung existiert
      const existingTask = await prisma.task.findUnique({
        where: { reservationId: reservation.id }
      });

      if (existingTask) {
        logger.log(`[TaskAutomation] Task für Reservierung ${reservation.id} existiert bereits`);
        return existingTask;
      }

      // Prüfe ob checkOutDate vorhanden ist
      if (!reservation.checkOutDate) {
        logger.error(`[TaskAutomation] Reservation ${reservation.id} hat kein checkOutDate. Task wird nicht erstellt.`);
        return null;
      }

      // Erstelle Task
      // Titel: Zimmername (bei Dorms: "Zimmername (Bettnummer)", bei Privates: "Zimmername")
      const isDorm = reservation.roomNumber !== null && reservation.roomNumber.trim() !== '';
      let taskTitle: string;
      if (isDorm) {
        // Dorm: "Zimmername (Bettnummer)"
        const roomName = reservation.roomDescription?.trim() || '';
        const bedNumber = reservation.roomNumber?.trim() || '';
        taskTitle = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || `Reservation ${reservation.id}`);
      } else {
        // Private: "Zimmername"
        taskTitle = reservation.roomDescription?.trim() || `Reservation ${reservation.id}`;
      }
      
      // Zimmer-Anzeige für Beschreibung
      let roomDisplay: string;
      if (isDorm) {
        const roomName = reservation.roomDescription?.trim() || '';
        const bedNumber = reservation.roomNumber?.trim() || '';
        roomDisplay = roomName && bedNumber ? `${roomName} (${bedNumber})` : (roomName || bedNumber || 'Noch nicht zugewiesen');
      } else {
        roomDisplay = reservation.roomDescription?.trim() || 'Noch nicht zugewiesen';
      }
      
      const taskDescription = `
Reservierungsdetails:
- Gast: ${reservation.guestName}
- E-Mail: ${reservation.guestEmail || 'N/A'}
- Telefon: ${reservation.guestPhone || 'N/A'}
- Check-in: ${reservation.checkInDate.toLocaleDateString('de-DE')}
- Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')}
- Zimmer: ${roomDisplay}
- Status: ${reservation.status}
- Zahlungsstatus: ${reservation.paymentStatus}
${reservation.arrivalTime ? `- Ankunftszeit: ${reservation.arrivalTime.toLocaleTimeString('de-DE')}` : ''}
      `.trim();

      const task = await prisma.task.create({
        data: {
          title: taskTitle,
          description: taskDescription,
          status: 'open',
          roleId: cleaningRoleId,
          branchId: branchId,
          organizationId: organizationId,
          reservationId: reservation.id,
          dueDate: reservation.checkOutDate,
          qualityControlId: 1 // TODO: Bestimme Quality Control User
        } as any,
        include: {
          role: {
            select: {
              id: true,
              name: true
            }
          },
          reservation: true
        }
      });

      logger.log(`[TaskAutomation] Cleaning-Task ${task.id} für Reservierung ${reservation.id} erstellt (Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')})`);

      // Benachrichtigung für alle User mit Cleaning-Rolle
      const cleaningUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              roleId: cleaningRoleId,
              lastUsed: true
            }
          }
        }
      });

      for (const cleaningUser of cleaningUsers) {
        const userLang = await getUserLanguage(cleaningUser.id);
        const notificationText = getTaskNotificationText(userLang, 'check_in_started', task.title, undefined, undefined, reservation.guestName);
        await createNotificationIfEnabled({
          userId: cleaningUser.id,
          title: notificationText.title,
          message: notificationText.message,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'create'
        });
      }

      return task;
    } catch (error) {
      logger.error(`[TaskAutomation] Fehler beim Erstellen des Reservierungs-Tasks:`, error);
      throw error;
    }
  }

  /**
   * Erstellt automatisch einen Admin-Onboarding-Task für Kolumbien
   * Wird aufgerufen, wenn ein User einer Organisation in Kolumbien beitritt und ein Dokument hochlädt
   * 
   * @param userId - ID des Users
   * @param organizationId - ID der Organisation
   * @returns Erstellter Task oder null
   */
  static async createAdminOnboardingTask(userId: number, organizationId: number) {
    try {
      // Prüfe: Organisation in Kolumbien?
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { country: true, settings: true }
      });
      
      if (organization?.country !== 'CO') {
        logger.log(`[createAdminOnboardingTask] Organisation ${organizationId} ist nicht in Kolumbien, überspringe Task-Erstellung`);
        return null; // Nur für Kolumbien
      }
      
      // Hole User-Daten
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          branches: {
            take: 1,
            include: { branch: true }
          }
        }
      });
      
      if (!user) {
        throw new Error('User nicht gefunden');
      }
      
      // Hole Admin-Rolle (nutze bestehende Logik aus createOnboardingTasks)
      const settings = organization.settings as any;
      const lifecycleRoles = settings?.lifecycleRoles;
      let adminRoleId: number | null = lifecycleRoles?.adminRoleId || null;
      
      // Fallback: Suche nach Admin-Rolle
      if (!adminRoleId) {
        const adminRole = await prisma.role.findFirst({
          where: {
            organizationId: organizationId,
            name: { contains: 'Admin', mode: 'insensitive' }
          }
        });
        if (adminRole) {
          adminRoleId = adminRole.id;
        }
      }
      
      if (!adminRoleId) {
        logger.warn(`[createAdminOnboardingTask] Keine Admin-Rolle gefunden für Organisation ${organizationId}`);
        return null;
      }
      
      // Hole Admin-User für QC (nutze bestehende Logik)
      let adminUserId: number | null = null;
      if (adminRoleId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            roles: {
              some: {
                roleId: adminRoleId,
                lastUsed: true
              }
            }
          }
        });
        if (adminUser) {
          adminUserId = adminUser.id;
        }
      }
      
      // Hole Branch (nutze bestehende Logik)
      let userBranch = user.branches[0]?.branch;
      if (!userBranch) {
        const firstOrgBranch = await prisma.branch.findFirst({
          where: { organizationId },
          orderBy: { id: 'asc' }
        });
        if (!firstOrgBranch) {
          throw new Error('Organisation hat keine Niederlassung');
        }
        userBranch = firstOrgBranch;
      }
      
      // Prüfe ob bereits ein Admin-Onboarding-Task existiert
      const existingTask = await prisma.task.findFirst({
        where: {
          organizationId: organizationId,
          title: {
            contains: `Profil vervollständigen: ${user.firstName || ''} ${user.lastName || ''}`.trim() || `Profil vervollständigen: User ${userId}`
          }
        }
      });
      
      if (existingTask) {
        logger.log(`[createAdminOnboardingTask] Admin-Onboarding-Task existiert bereits für User ${userId}`);
        return existingTask;
      }
      
      // Erstelle Task für Admin
      // WICHTIG: Task ist der Admin-Rolle zugewiesen (roleId), daher kann responsibleId NICHT gesetzt werden
      // Der Onboarding-User wird im Link in der description gespeichert: userId=XXX
      const task = await prisma.task.create({
        data: {
          title: `Profil vervollständigen: ${user.firstName || ''} ${user.lastName || ''}`.trim() || `Profil vervollständigen: User ${userId}`,
          description: `Bitte vervollständigen Sie das Profil für ${user.firstName || ''} ${user.lastName || ''}:\n- Contrato\n- Salario\n- Horas normales de trabajo\n\nLink: /organization?tab=users&userId=${userId}`,
          status: 'open',
          roleId: adminRoleId, // Zugewiesen an Admin-Rolle (entweder roleId ODER responsibleId, nicht beides!)
          qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
          branchId: userBranch.id,
          organizationId: organizationId
        }
      });
      
      // Notification an Admin (nutze bestehende Funktion)
      if (adminUserId) {
        await createNotificationIfEnabled({
          userId: adminUserId,
          title: 'Neues Onboarding-To-Do',
          message: `Profil vervollständigen für ${user.firstName || ''} ${user.lastName || ''}`,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'task'
        });
      }
      
      logger.log(`[createAdminOnboardingTask] Admin-Onboarding-Task erstellt: Task ID ${task.id} für User ${userId}`);
      return task;
    } catch (error) {
      logger.error('[createAdminOnboardingTask] Fehler:', error);
      // Logge Fehler, aber breche nicht ab
      return null;
    }
  }

  /**
   * Erstellt automatisch ein To-Do für User, um bankDetails einzugeben
   * Wird aufgerufen nach Organisation-Beitritt
   * User muss bankDetails eingeben, bevor Zeiterfassung möglich ist
   */
  static async createUserBankDetailsTask(userId: number, organizationId: number) {
    try {
      // Hole User-Daten
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          branches: {
            take: 1,
            include: { branch: true }
          }
        }
      });
      
      if (!user) {
        throw new Error('User nicht gefunden');
      }

      // Prüfe ob User bereits bankDetails hat
      if (user.bankDetails && user.bankDetails.trim() !== '') {
        logger.log(`[createUserBankDetailsTask] User ${userId} hat bereits bankDetails, überspringe Task-Erstellung`);
        return null;
      }

      // Hole Branch (nutze bestehende Logik)
      let userBranch = user.branches[0]?.branch;
      if (!userBranch) {
        const firstOrgBranch = await prisma.branch.findFirst({
          where: { organizationId },
          orderBy: { id: 'asc' }
        });
        if (!firstOrgBranch) {
          throw new Error('Organisation hat keine Niederlassung');
        }
        userBranch = firstOrgBranch;
      }

      // Hole Admin-User für QC (nutze bestehende Logik aus createAdminOnboardingTask)
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true }
      });

      const settings = organization?.settings as any;
      const lifecycleRoles = settings?.lifecycleRoles;
      let adminRoleId: number | null = lifecycleRoles?.adminRoleId || null;
      
      // Fallback: Suche nach Admin-Rolle
      if (!adminRoleId) {
        const adminRole = await prisma.role.findFirst({
          where: {
            organizationId: organizationId,
            name: { contains: 'Admin', mode: 'insensitive' }
          }
        });
        if (adminRole) {
          adminRoleId = adminRole.id;
        }
      }

      let adminUserId: number | null = null;
      if (adminRoleId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            roles: {
              some: {
                roleId: adminRoleId,
                lastUsed: true
              }
            }
          }
        });
        if (adminUser) {
          adminUserId = adminUser.id;
        }
      }

      // Prüfe ob bereits ein BankDetails-Task existiert (prüfe beide Varianten für Abwärtskompatibilität)
      const existingTask = await prisma.task.findFirst({
        where: {
          organizationId: organizationId,
          responsibleId: userId,
          OR: [
            { title: { contains: 'Ingresar datos bancarios' } },
            { title: { contains: 'Bankverbindung eingeben' } }
          ]
        }
      });
      
      if (existingTask) {
        logger.log(`[createUserBankDetailsTask] BankDetails-Task existiert bereits für User ${userId}`);
        return existingTask;
      }
      
      // Erstelle Task für User
      // WICHTIG: Task ist dem User zugewiesen (responsibleId), daher kann roleId NICHT gesetzt werden
      const task = await prisma.task.create({
        data: {
          title: 'Ingresar datos bancarios',
          description: `Por favor, ingrese sus datos bancarios en el perfil antes de poder utilizar el registro de tiempo.\n\nLink: /profile`,
          status: 'open',
          responsibleId: userId, // User ist verantwortlich für sein eigenes To-Do
          qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
          branchId: userBranch.id,
          organizationId: organizationId
        }
      });
      
      // Notification an User
      await createNotificationIfEnabled({
        userId: userId,
        title: 'Ingresar datos bancarios',
        message: 'Por favor, ingrese sus datos bancarios en el perfil antes de poder utilizar el registro de tiempo.',
        type: NotificationType.task,
        relatedEntityId: task.id,
        relatedEntityType: 'task'
      });
      
      logger.log(`[createUserBankDetailsTask] BankDetails-Task erstellt: Task ID ${task.id} für User ${userId}`);
      return task;
    } catch (error) {
      logger.error('[createUserBankDetailsTask] Fehler:', error);
      // Logge Fehler, aber breche nicht ab
      return null;
    }
  }

  /**
   * Erstellt automatisch ein To-Do für User, um Identitätsdokument hochzuladen
   * Wird aufgerufen nach Organisation-Beitritt (nur für Kolumbien)
   * User muss Identitätsdokument hochladen, damit Admin das Profil vervollständigen kann
   */
  static async createUserIdentificationDocumentTask(userId: number, organizationId: number) {
    try {
      // Prüfe: Organisation in Kolumbien?
      const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { country: true, settings: true }
      });
      
      if (organization?.country !== 'CO') {
        logger.log(`[createUserIdentificationDocumentTask] Organisation ${organizationId} ist nicht in Kolumbien, überspringe Task-Erstellung`);
        return null; // Nur für Kolumbien
      }

      // Hole User-Daten
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          branches: {
            take: 1,
            include: { branch: true }
          },
          identificationDocuments: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });
      
      if (!user) {
        throw new Error('User nicht gefunden');
      }

      // Prüfe ob User bereits ein Identitätsdokument hat
      if (user.identificationDocuments && user.identificationDocuments.length > 0) {
        logger.log(`[createUserIdentificationDocumentTask] User ${userId} hat bereits ein Identitätsdokument, überspringe Task-Erstellung`);
        return null;
      }

      // Hole Branch (nutze bestehende Logik)
      let userBranch = user.branches[0]?.branch;
      if (!userBranch) {
        const firstOrgBranch = await prisma.branch.findFirst({
          where: { organizationId },
          orderBy: { id: 'asc' }
        });
        if (!firstOrgBranch) {
          throw new Error('Organisation hat keine Niederlassung');
        }
        userBranch = firstOrgBranch;
      }

      // Hole Admin-User für QC (nutze bestehende Logik)
      const settings = organization.settings as any;
      const lifecycleRoles = settings?.lifecycleRoles;
      let adminRoleId: number | null = lifecycleRoles?.adminRoleId || null;
      
      // Fallback: Suche nach Admin-Rolle
      if (!adminRoleId) {
        const adminRole = await prisma.role.findFirst({
          where: {
            organizationId: organizationId,
            name: { contains: 'Admin', mode: 'insensitive' }
          }
        });
        if (adminRole) {
          adminRoleId = adminRole.id;
        }
      }

      let adminUserId: number | null = null;
      if (adminRoleId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            roles: {
              some: {
                roleId: adminRoleId,
                lastUsed: true
              }
            }
          }
        });
        if (adminUser) {
          adminUserId = adminUser.id;
        }
      }

      // Prüfe ob bereits ein Identitätsdokument-Task existiert
      const existingTask = await prisma.task.findFirst({
        where: {
          organizationId: organizationId,
          responsibleId: userId,
          OR: [
            { title: { contains: 'Subir documento de identidad' } },
            { title: { contains: 'Identitätsdokument hochladen' } }
          ]
        }
      });
      
      if (existingTask) {
        logger.log(`[createUserIdentificationDocumentTask] Identitätsdokument-Task existiert bereits für User ${userId}`);
        return existingTask;
      }
      
      // Erstelle Task für User
      // WICHTIG: Task ist dem User zugewiesen (responsibleId), daher kann roleId NICHT gesetzt werden
      const task = await prisma.task.create({
        data: {
          title: 'Subir documento de identidad',
          description: `Por favor, suba su documento de identidad (Cédula o Pasaporte) en el perfil. Los campos se completarán automáticamente.\n\nLink: /profile`,
          status: 'open',
          responsibleId: userId, // User ist verantwortlich für sein eigenes To-Do
          qualityControlId: adminUserId || userId, // QC = Admin (Fallback: User selbst)
          branchId: userBranch.id,
          organizationId: organizationId
        }
      });
      
      // Notification an User
      await createNotificationIfEnabled({
        userId: userId,
        title: 'Subir documento de identidad',
        message: 'Por favor, suba su documento de identidad (Cédula o Pasaporte) en el perfil. Los campos se completarán automáticamente.',
        type: NotificationType.task,
        relatedEntityId: task.id,
        relatedEntityType: 'task'
      });
      
      logger.log(`[createUserIdentificationDocumentTask] Identitätsdokument-Task erstellt: Task ID ${task.id} für User ${userId}`);
      return task;
    } catch (error) {
      logger.error('[createUserIdentificationDocumentTask] Fehler:', error);
      // Logge Fehler, aber breche nicht ab
      return null;
    }
  }
}

