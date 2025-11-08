import { PrismaClient } from '@prisma/client';
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
        console.warn(`Keine Legal-Rolle gefunden für Organisation ${organizationId}. Onboarding-Tasks werden nicht erstellt.`);
        return [];
      }

      // Hole erste Branch des Users (für Tasks)
      const userBranch = user.branches[0]?.branch;
      if (!userBranch) {
        throw new Error('User hat keine Niederlassung zugewiesen');
      }

      // Definiere Tasks für Sozialversicherungen (Kolumbien)
      const socialSecurityTasks = [
        {
          title: 'ARL-Anmeldung durchführen',
          description: `ARL-Anmeldung für ${user.firstName} ${user.lastName} durchführen. Erforderliche Daten werden automatisch generiert.`,
          type: 'arl' as const
        },
        {
          title: 'EPS-Anmeldung prüfen/ durchführen',
          description: `EPS-Anmeldung für ${user.firstName} ${user.lastName} prüfen. Falls erforderlich, Anmeldung durchführen.`,
          type: 'eps' as const
        },
        {
          title: 'Pension-Anmeldung durchführen',
          description: `Pension-Anmeldung für ${user.firstName} ${user.lastName} durchführen. Erforderliche Daten werden automatisch generiert.`,
          type: 'pension' as const
        },
        {
          title: 'Caja-Anmeldung durchführen',
          description: `Caja-Anmeldung für ${user.firstName} ${user.lastName} durchführen. Erforderliche Daten werden automatisch generiert.`,
          type: 'caja' as const
        }
      ];

      const createdTasks = [];

      // Erstelle Tasks
      for (const taskData of socialSecurityTasks) {
        try {
          const task = await prisma.task.create({
            data: {
              title: taskData.title,
              description: taskData.description,
              status: 'open',
              roleId: legalRoleId,
              branchId: userBranch.id,
              organizationId: organizationId || undefined,
              // Setze Fälligkeitsdatum auf 7 Tage in der Zukunft
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
          title: 'Arbeitszeugnis erstellen',
          description: `Arbeitszeugnis für ${user.firstName} ${user.lastName} erstellen.`,
          type: 'certificate' as const
        },
        {
          title: 'Finale Abrechnung durchführen',
          description: `Finale Abrechnung für ${user.firstName} ${user.lastName} durchführen.`,
          type: 'payroll' as const
        },
        {
          title: 'Sozialversicherungen abmelden',
          description: `Sozialversicherungen (ARL, EPS, Pension, Caja) für ${user.firstName} ${user.lastName} abmelden.`,
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
        arl: 'ARL-Anmeldung durchführen',
        eps: 'EPS-Anmeldung prüfen/durchführen',
        pension: 'Pension-Anmeldung durchführen',
        caja: 'Caja-Anmeldung durchführen'
      };

      const task = await prisma.task.create({
        data: {
          title: taskTitles[type],
          description: `${taskTitles[type]} für ${user.firstName} ${user.lastName}. Erforderliche Daten werden automatisch generiert.`,
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
}

