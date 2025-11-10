import { PrismaClient, Reservation } from '@prisma/client';
import { createNotificationIfEnabled } from '../controllers/notificationController';
import { NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

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
        console.warn(`[createOnboardingTasks] Keine Legal-Rolle gefunden für Organisation ${organizationId}. Onboarding-Tasks werden nicht erstellt.`);
        console.warn(`[createOnboardingTasks] LifecycleRoles config:`, JSON.stringify(lifecycleRoles, null, 2));
        
        // Debug: Zeige alle Rollen der Organisation
        const allRoles = await prisma.role.findMany({
          where: { organizationId },
          select: { id: true, name: true }
        });
        console.warn(`[createOnboardingTasks] Verfügbare Rollen in Organisation ${organizationId}:`, allRoles);
        
        return [];
      }

      console.log(`[createOnboardingTasks] Legal-Rolle gefunden: ID=${legalRoleId} für Organisation ${organizationId}`);

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
        console.warn(`[createOnboardingTasks] User ${userId} hat keine Niederlassung zugewiesen. Verwende erste Branch der Organisation.`);
        const firstOrgBranch = await prisma.branch.findFirst({
          where: { organizationId },
          orderBy: { id: 'asc' }
        });
        
        if (!firstOrgBranch) {
          console.error(`[createOnboardingTasks] Keine Branch in Organisation ${organizationId} gefunden. Tasks können nicht erstellt werden.`);
          throw new Error('Organisation hat keine Niederlassung. Bitte erstellen Sie zuerst eine Niederlassung.');
        }
        
        userBranch = firstOrgBranch;
        console.log(`[createOnboardingTasks] Verwende Branch "${userBranch.name}" (ID: ${userBranch.id}) als Fallback.`);
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

          console.log(`[createOnboardingTasks] Erstelle Task "${taskData.title}" mit Daten:`, {
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

          console.log(`[createOnboardingTasks] Task erstellt: ID=${task.id}, Title="${task.title}", RoleId=${task.roleId}, OrganizationId=${task.organizationId}`);

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
            await createNotificationIfEnabled({
              userId: legalUser.id,
              title: 'Neuer Onboarding-Task',
              message: `Ein neuer Task wurde zugewiesen: ${task.title}`,
              type: NotificationType.task,
              relatedEntityId: task.id,
              relatedEntityType: 'create'
            });
          }
        } catch (error) {
          console.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
          // Weiter mit nächstem Task
        }
      }

      return createdTasks;
    } catch (error) {
      console.error('Fehler beim Erstellen der Onboarding-Tasks:', error);
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
        console.warn(`Keine HR-Rolle gefunden für Organisation ${organizationId}. Offboarding-Tasks werden nicht erstellt.`);
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
            await createNotificationIfEnabled({
              userId: hrUser.id,
              title: 'Neuer Offboarding-Task',
              message: `Ein neuer Task wurde zugewiesen: ${task.title}`,
              type: NotificationType.task,
              relatedEntityId: task.id,
              relatedEntityType: 'create'
            });
          }
        } catch (error) {
          console.error(`Fehler beim Erstellen des Tasks "${taskData.title}":`, error);
          // Weiter mit nächstem Task
        }
      }

      return createdTasks;
    } catch (error) {
      console.error('Fehler beim Erstellen der Offboarding-Tasks:', error);
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
        await createNotificationIfEnabled({
          userId: legalUser.id,
          title: 'Neuer Sozialversicherungs-Task',
          message: `Ein neuer Task wurde zugewiesen: ${task.title}`,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'create'
        });
      }

      return task;
    } catch (error) {
      console.error(`Fehler beim Erstellen des Sozialversicherungs-Tasks (${type}):`, error);
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
        console.log(`[TaskAutomation] Automatische Task-Erstellung ist für Organisation ${organizationId} deaktiviert`);
        return null;
      }

      // Bestimme zuständige Rolle (z.B. "Rezeption")
      let receptionRoleId: number | null = null;

      // Suche nach "Rezeption" oder ähnlicher Rolle
      const receptionRole = await prisma.role.findFirst({
        where: {
          organizationId,
          name: {
            in: ['Rezeption', 'Reception', 'Front Desk', 'Recepcion'],
            mode: 'insensitive'
          }
        }
      });

      if (receptionRole) {
        receptionRoleId = receptionRole.id;
      } else {
        // Fallback: Verwende erste verfügbare Rolle der Organisation
        const firstRole = await prisma.role.findFirst({
          where: { organizationId }
        });
        if (firstRole) {
          receptionRoleId = firstRole.id;
        }
      }

      if (!receptionRoleId) {
        console.warn(`[TaskAutomation] Keine Rolle gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
        return null;
      }

      // Hole erste Branch der Organisation (für Task)
      const branch = await prisma.branch.findFirst({
        where: { organizationId }
      });

      if (!branch) {
        console.warn(`[TaskAutomation] Keine Branch gefunden für Organisation ${organizationId}. Task wird nicht erstellt.`);
        return null;
      }

      // Prüfe ob bereits ein Task für diese Reservierung existiert
      const existingTask = await prisma.task.findUnique({
        where: { reservationId: reservation.id }
      });

      if (existingTask) {
        console.log(`[TaskAutomation] Task für Reservierung ${reservation.id} existiert bereits`);
        return existingTask;
      }

      // Erstelle Task
      const taskTitle = `Check-in: ${reservation.guestName} - ${reservation.checkInDate.toLocaleDateString('de-DE')}`;
      const taskDescription = `
Reservierungsdetails:
- Gast: ${reservation.guestName}
- E-Mail: ${reservation.guestEmail || 'N/A'}
- Telefon: ${reservation.guestPhone || 'N/A'}
- Check-in: ${reservation.checkInDate.toLocaleDateString('de-DE')}
- Check-out: ${reservation.checkOutDate.toLocaleDateString('de-DE')}
- Zimmer: ${reservation.roomNumber || 'Noch nicht zugewiesen'}
- Status: ${reservation.status}
- Zahlungsstatus: ${reservation.paymentStatus}
${reservation.arrivalTime ? `- Ankunftszeit: ${reservation.arrivalTime.toLocaleTimeString('de-DE')}` : ''}
      `.trim();

      const task = await prisma.task.create({
        data: {
          title: taskTitle,
          description: taskDescription,
          status: 'open',
          roleId: receptionRoleId,
          branchId: branch.id,
          organizationId: organizationId,
          reservationId: reservation.id,
          dueDate: reservation.checkInDate,
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

      console.log(`[TaskAutomation] Task ${task.id} für Reservierung ${reservation.id} erstellt`);

      // Benachrichtigung für alle User mit Rezeption-Rolle
      const receptionUsers = await prisma.user.findMany({
        where: {
          roles: {
            some: {
              roleId: receptionRoleId,
              lastUsed: true
            }
          }
        }
      });

      for (const receptionUser of receptionUsers) {
        await createNotificationIfEnabled({
          userId: receptionUser.id,
          title: 'Neue Reservierung',
          message: `Neue Reservierung für Check-in: ${reservation.guestName}`,
          type: NotificationType.task,
          relatedEntityId: task.id,
          relatedEntityType: 'create'
        });
      }

      return task;
    } catch (error) {
      console.error(`[TaskAutomation] Fehler beim Erstellen des Reservierungs-Tasks:`, error);
      throw error;
    }
  }
}

