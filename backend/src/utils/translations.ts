import { prisma } from './prisma';
import { userLanguageCache } from '../services/userLanguageCache';
import { logger } from './logger';

/**
 * Ruft die aktive Sprache eines Users ab
 * Priorität: User.language > Organisation.language > 'de'
 * 
 * OPTIMIERT: Zuerst nur User.language prüfen (schnell!), nur bei Bedarf komplexe Query
 * CACHED: User-Sprache wird 10 Minuten gecacht
 */
export async function getUserLanguage(userId: number): Promise<string> {
  try {
    // 1. Prüfe Cache (schnell!)
    const cached = userLanguageCache.get(userId);
    if (cached !== null) {
      return cached;
    }

    // 2. OPTIMIERUNG: Zuerst nur User.language prüfen (einfache Query: ~0.165ms)
    // In 99.8% der Fälle ist User.language bereits gesetzt, komplexe Query ist unnötig
    // READ-Operation: executeWithRetry NICHT nötig (kann gecacht werden, nicht kritisch)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true }
    });

    if (!user) {
      logger.log(`[getUserLanguage] User ${userId} nicht gefunden, Fallback: de`);
      const fallback = 'de';
      userLanguageCache.set(userId, fallback);
      return fallback;
    }

    // Priorität 1: User-Sprache (99.8% der Fälle)
    if (user.language && user.language.trim() !== '') {
      // Speichere im Cache
      userLanguageCache.set(userId, user.language);
      return user.language;
    }

    // Priorität 2: Organisation-Sprache (nur wenn User.language leer - selten!)
    // Jetzt erst die komplexe Query mit Joins
    // READ-Operation: executeWithRetry NICHT nötig (kann gecacht werden, nicht kritisch)
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        roles: {
          where: {
            lastUsed: true
          },
          include: {
            role: {
              include: {
                organization: {
                  select: {
                    settings: true
                  }
                }
              }
            }
          },
          take: 1
        }
      }
    });

    const userRole = userWithRoles?.roles[0];
    if (userRole?.role?.organization) {
      const orgSettings = userRole.role.organization.settings as any;
      if (orgSettings?.language) {
        logger.log(`[getUserLanguage] User ${userId} Sprache: ${orgSettings.language} (aus Organisation)`);
        // Speichere im Cache
        userLanguageCache.set(userId, orgSettings.language);
        return orgSettings.language;
      }
    }

    // Priorität 3: Fallback
    logger.log(`[getUserLanguage] User ${userId} Sprache: de (Fallback)`);
    const fallback = 'de';
    userLanguageCache.set(userId, fallback);
    return fallback;
  } catch (error) {
    logger.error('Fehler beim Abrufen der User-Sprache:', error);
    const fallback = 'de';
    // Cache auch bei Fehler, um wiederholte Fehler zu vermeiden
    userLanguageCache.set(userId, fallback);
    return fallback;
  }
}

/**
 * Typ für Worktime-Notification-Übersetzungen
 */
type WorktimeNotificationTranslations = {
  startTitle: string;
  startMessage: (branchName: string) => string;
  stopTitle: string;
  stopMessage: (branchName: string) => string;
  autoStopTitle: string;
  autoStopMessage: (hours: number) => string;
};

/**
 * Übersetzungen für Worktime-Notifications
 */
const worktimeNotifications: Record<string, WorktimeNotificationTranslations> = {
  de: {
    startTitle: 'Zeiterfassung gestartet',
    startMessage: (branchName: string) => `Zeiterfassung für ${branchName} wurde gestartet.`,
    stopTitle: 'Zeiterfassung beendet',
    stopMessage: (branchName: string) => `Zeiterfassung für ${branchName} wurde beendet.`,
    autoStopTitle: 'Zeiterfassung automatisch beendet',
    autoStopMessage: (hours: number) => `Deine Zeiterfassung wurde automatisch beendet, da die tägliche Arbeitszeit von ${hours}h erreicht wurde.`
  },
  es: {
    startTitle: 'Registro de tiempo iniciado',
    startMessage: (branchName: string) => `El registro de tiempo para ${branchName} ha sido iniciado.`,
    stopTitle: 'Registro de tiempo detenido',
    stopMessage: (branchName: string) => `El registro de tiempo para ${branchName} ha sido detenido.`,
    autoStopTitle: 'Registro de tiempo detenido automáticamente',
    autoStopMessage: (hours: number) => `Tu registro de tiempo ha sido detenido automáticamente, ya que se alcanzó el tiempo de trabajo diario de ${hours}h.`
  },
  en: {
    startTitle: 'Time tracking started',
    startMessage: (branchName: string) => `Time tracking for ${branchName} has been started.`,
    stopTitle: 'Time tracking stopped',
    stopMessage: (branchName: string) => `Time tracking for ${branchName} has been stopped.`,
    autoStopTitle: 'Time tracking automatically stopped',
    autoStopMessage: (hours: number) => `Your time tracking has been automatically stopped, as the daily working time of ${hours}h has been reached.`
  }
};

/**
 * Typ für Tour-Notification-Übersetzungen
 */
type TourNotificationTranslations = {
  bookedTitle: string;
  bookedMessage: (bookedByName: string, tourTitle: string) => string;
  requestedTitle: string;
  requestedMessage: (bookedByName: string, tourTitle: string) => string;
  paidTitle: string;
  paidMessage: (tourTitle: string) => string;
  cancelledByCustomerTitle: string;
  cancelledByCustomerMessage: (tourTitle: string, bookedByName: string) => string;
  cancelledByProviderTitle: string;
  cancelledByProviderMessage: (tourTitle: string, providerName: string) => string;
};

/**
 * Übersetzungen für Tour-Notifications
 */
const tourNotifications: Record<string, TourNotificationTranslations> = {
  de: {
    bookedTitle: 'Tour gebucht',
    bookedMessage: (bookedByName: string, tourTitle: string) => `${bookedByName} hat die Tour "${tourTitle}" gebucht.`,
    requestedTitle: 'Externe Tour angefragt',
    requestedMessage: (bookedByName: string, tourTitle: string) => `${bookedByName} hat eine Anfrage für die externe Tour "${tourTitle}" gestellt.`,
    paidTitle: 'Tour bezahlt',
    paidMessage: (tourTitle: string) => `Die Tour "${tourTitle}" wurde erfolgreich bezahlt.`,
    cancelledByCustomerTitle: 'Tour storniert',
    cancelledByCustomerMessage: (tourTitle: string, bookedByName: string) => `Die Tour "${tourTitle}" wurde von ${bookedByName} storniert.`,
    cancelledByProviderTitle: 'Tour storniert',
    cancelledByProviderMessage: (tourTitle: string, providerName: string) => `Die Tour "${tourTitle}" wurde vom Anbieter "${providerName}" storniert.`
  },
  es: {
    bookedTitle: 'Tour reservado',
    bookedMessage: (bookedByName: string, tourTitle: string) => `${bookedByName} ha reservado el tour "${tourTitle}".`,
    requestedTitle: 'Tour externo solicitado',
    requestedMessage: (bookedByName: string, tourTitle: string) => `${bookedByName} ha solicitado el tour externo "${tourTitle}".`,
    paidTitle: 'Tour pagado',
    paidMessage: (tourTitle: string) => `El tour "${tourTitle}" ha sido pagado exitosamente.`,
    cancelledByCustomerTitle: 'Tour cancelado',
    cancelledByCustomerMessage: (tourTitle: string, bookedByName: string) => `El tour "${tourTitle}" fue cancelado por ${bookedByName}.`,
    cancelledByProviderTitle: 'Tour cancelado',
    cancelledByProviderMessage: (tourTitle: string, providerName: string) => `El tour "${tourTitle}" fue cancelado por el proveedor "${providerName}".`
  },
  en: {
    bookedTitle: 'Tour booked',
    bookedMessage: (bookedByName: string, tourTitle: string) => `${bookedByName} has booked the tour "${tourTitle}".`,
    requestedTitle: 'External tour requested',
    requestedMessage: (bookedByName: string, tourTitle: string) => `${bookedByName} has requested the external tour "${tourTitle}".`,
    paidTitle: 'Tour paid',
    paidMessage: (tourTitle: string) => `The tour "${tourTitle}" has been successfully paid.`,
    cancelledByCustomerTitle: 'Tour cancelled',
    cancelledByCustomerMessage: (tourTitle: string, bookedByName: string) => `The tour "${tourTitle}" was cancelled by ${bookedByName}.`,
    cancelledByProviderTitle: 'Tour cancelled',
    cancelledByProviderMessage: (tourTitle: string, providerName: string) => `The tour "${tourTitle}" was cancelled by the provider "${providerName}".`
  }
};

/**
 * Gibt die übersetzte Notification-Nachricht für Tour-Events zurück
 */
export function getTourNotificationText(
  language: string,
  type: 'booked' | 'requested' | 'paid' | 'cancelled_by_customer' | 'cancelled_by_provider',
  bookedByName?: string,
  tourTitle?: string,
  providerName?: string
): { title: string; message: string } {
  // Fallback auf Deutsch wenn Sprache nicht unterstützt
  const lang = language in tourNotifications ? language : 'de';
  const translations = tourNotifications[lang];

  switch (type) {
    case 'booked':
      return {
        title: translations.bookedTitle,
        message: translations.bookedMessage(bookedByName || 'Unbekannt', tourTitle || 'Tour')
      };
    case 'requested':
      return {
        title: translations.requestedTitle,
        message: translations.requestedMessage(bookedByName || 'Unbekannt', tourTitle || 'Tour')
      };
    case 'paid':
      return {
        title: translations.paidTitle,
        message: translations.paidMessage(tourTitle || 'Tour')
      };
    case 'cancelled_by_customer':
      return {
        title: translations.cancelledByCustomerTitle,
        message: translations.cancelledByCustomerMessage(tourTitle || 'Tour', bookedByName || 'Unbekannt')
      };
    case 'cancelled_by_provider':
      return {
        title: translations.cancelledByProviderTitle,
        message: translations.cancelledByProviderMessage(tourTitle || 'Tour', providerName || 'Anbieter')
      };
    default:
      return {
        title: 'Tour Notification',
        message: 'Tour-Event'
      };
  }
}

/**
 * Gibt die übersetzte Notification-Nachricht für Worktime-Events zurück
 */
export function getWorktimeNotificationText(
  language: string,
  type: 'start' | 'stop' | 'auto_stop',
  branchName?: string,
  hours?: number
): { title: string; message: string } {
  // Fallback auf Deutsch wenn Sprache nicht unterstützt
  const lang = language in worktimeNotifications ? language : 'de';
  const translations = worktimeNotifications[lang];

  switch (type) {
    case 'start':
      return {
        title: translations.startTitle,
        message: translations.startMessage(branchName || '')
      };
    case 'stop':
      return {
        title: translations.stopTitle,
        message: translations.stopMessage(branchName || '')
      };
    case 'auto_stop':
      return {
        title: translations.autoStopTitle,
        message: translations.autoStopMessage(hours || 8)
      };
    default:
      return {
        title: translations.stopTitle,
        message: translations.stopMessage(branchName || '')
      };
  }
}

/**
 * Typ für Task-Notification-Übersetzungen
 */
type TaskNotificationTranslations = {
  assigned: (taskTitle: string) => { title: string; message: string };
  qualityControlAssigned: (taskTitle: string) => { title: string; message: string };
  statusChanged: (taskTitle: string, oldStatus: string, newStatus: string) => { title: string; message: string };
  updated: (taskTitle: string) => { title: string; message: string };
  deleted: (taskTitle: string) => { title: string; message: string };
  onboardingCompleted: () => { title: string; message: string };
  newOnboardingTask: (taskTitle: string) => { title: string; message: string };
  newOffboardingTask: (taskTitle: string) => { title: string; message: string };
  newSocialSecurityTask: (taskTitle: string) => { title: string; message: string };
  checkInStarted: (guestName: string) => { title: string; message: string };
  checkInCompleted: (guestName: string) => { title: string; message: string };
};

/**
 * Typ für Request-Notification-Übersetzungen
 */
type RequestNotificationTranslations = {
  created: (requestTitle: string, isRequester: boolean) => { title: string; message: string };
  statusChanged: (requestTitle: string, status: string) => { title: string; message: string };
  responsibilityChanged: (requestTitle: string, isOld: boolean) => { title: string; message: string };
  assigned: (requestTitle: string) => { title: string; message: string };
  deleted: (requestTitle: string) => { title: string; message: string };
  newTaskFromRequest: (taskTitle: string) => { title: string; message: string };
};

/**
 * Typ für User-Notification-Übersetzungen
 */
type UserNotificationTranslations = {
  rolesUpdated: (isSelf: boolean, userName?: string) => { title: string; message: string };
  branchesUpdated: (isSelf: boolean, userName?: string) => { title: string; message: string };
  created: (userName: string) => { title: string; message: string };
  updated: (isSelf: boolean, userName?: string) => { title: string; message: string };
  deleted: (userName: string) => { title: string; message: string };
};

/**
 * Typ für Role-Notification-Übersetzungen
 */
type RoleNotificationTranslations = {
  created: (roleName: string) => { title: string; message: string };
  updated: (roleName: string, isSelf: boolean) => { title: string; message: string };
  deleted: (roleName: string, isSelf: boolean) => { title: string; message: string };
};

/**
 * Typ für System-Notification-Übersetzungen
 */
type SystemNotificationTranslations = {
  monthlyReportCreated: (periodStart: string, periodEnd: string) => { title: string; message: string };
  monthlyReportError: () => { title: string; message: string };
  worktimeManagerStop: (branchName: string) => { title: string; message: string };
  worktimeUpdated: (branchName: string) => { title: string; message: string };
  overtimeUpdated: (hours: number) => { title: string; message: string };
};

/**
 * Übersetzungen für Task-Notifications
 */
const taskNotifications: Record<string, TaskNotificationTranslations> = {
  de: {
    assigned: (taskTitle: string) => ({
      title: 'Neuer Task zugewiesen',
      message: `Dir wurde ein neuer Task zugewiesen: ${taskTitle}`
    }),
    qualityControlAssigned: (taskTitle: string) => ({
      title: 'Neue Qualitätskontrolle zugewiesen',
      message: `Du wurdest als Qualitätskontrolle für einen neuen Task zugewiesen: ${taskTitle}`
    }),
    statusChanged: (taskTitle: string, oldStatus: string, newStatus: string) => ({
      title: 'Task-Status geändert',
      message: `Der Status des Tasks "${taskTitle}" wurde von "${oldStatus}" zu "${newStatus}" geändert.`
    }),
    updated: (taskTitle: string) => ({
      title: 'Task aktualisiert',
      message: `Der Task "${taskTitle}" wurde aktualisiert.`
    }),
    deleted: (taskTitle: string) => ({
      title: 'Task gelöscht',
      message: `Der Task "${taskTitle}" wurde gelöscht.`
    }),
    onboardingCompleted: () => ({
      title: 'Onboarding abgeschlossen',
      message: 'Ihr Onboarding wurde abgeschlossen. Sie können nun alle Funktionen nutzen.'
    }),
    newOnboardingTask: (taskTitle: string) => ({
      title: 'Neuer Onboarding-Task',
      message: `Ein neuer Task wurde zugewiesen: ${taskTitle}`
    }),
    newOffboardingTask: (taskTitle: string) => ({
      title: 'Neuer Offboarding-Task',
      message: `Ein neuer Task wurde zugewiesen: ${taskTitle}`
    }),
    newSocialSecurityTask: (taskTitle: string) => ({
      title: 'Neuer Sozialversicherungs-Task',
      message: `Ein neuer Task wurde zugewiesen: ${taskTitle}`
    }),
    checkInStarted: (guestName: string) => ({
      title: 'Check-in gestartet',
      message: `Check-in für ${guestName} wurde gestartet`
    }),
    checkInCompleted: (guestName: string) => ({
      title: 'Check-in abgeschlossen',
      message: `Check-in für ${guestName} wurde abgeschlossen`
    })
  },
  es: {
    assigned: (taskTitle: string) => ({
      title: 'Nueva tarea asignada',
      message: `Se te ha asignado una nueva tarea: ${taskTitle}`
    }),
    qualityControlAssigned: (taskTitle: string) => ({
      title: 'Nuevo control de calidad asignado',
      message: `Has sido asignado como control de calidad para una nueva tarea: ${taskTitle}`
    }),
    statusChanged: (taskTitle: string, oldStatus: string, newStatus: string) => ({
      title: 'Estado de tarea cambiado',
      message: `El estado de la tarea "${taskTitle}" ha sido cambiado de "${oldStatus}" a "${newStatus}".`
    }),
    updated: (taskTitle: string) => ({
      title: 'Tarea actualizada',
      message: `La tarea "${taskTitle}" ha sido actualizada.`
    }),
    deleted: (taskTitle: string) => ({
      title: 'Tarea eliminada',
      message: `La tarea "${taskTitle}" ha sido eliminada.`
    }),
    onboardingCompleted: () => ({
      title: 'Onboarding completado',
      message: 'Tu onboarding ha sido completado. Ahora puedes usar todas las funciones.'
    }),
    newOnboardingTask: (taskTitle: string) => ({
      title: 'Nueva tarea de onboarding',
      message: `Se ha asignado una nueva tarea: ${taskTitle}`
    }),
    newOffboardingTask: (taskTitle: string) => ({
      title: 'Nueva tarea de offboarding',
      message: `Se ha asignado una nueva tarea: ${taskTitle}`
    }),
    newSocialSecurityTask: (taskTitle: string) => ({
      title: 'Nueva tarea de seguridad social',
      message: `Se ha asignado una nueva tarea: ${taskTitle}`
    }),
    checkInStarted: (guestName: string) => ({
      title: 'Check-in iniciado',
      message: `El check-in para ${guestName} ha sido iniciado`
    }),
    checkInCompleted: (guestName: string) => ({
      title: 'Check-in completado',
      message: `El check-in para ${guestName} ha sido completado`
    })
  },
  en: {
    assigned: (taskTitle: string) => ({
      title: 'New task assigned',
      message: `A new task has been assigned to you: ${taskTitle}`
    }),
    qualityControlAssigned: (taskTitle: string) => ({
      title: 'New quality control assigned',
      message: `You have been assigned as quality control for a new task: ${taskTitle}`
    }),
    statusChanged: (taskTitle: string, oldStatus: string, newStatus: string) => ({
      title: 'Task status changed',
      message: `The status of task "${taskTitle}" has been changed from "${oldStatus}" to "${newStatus}".`
    }),
    updated: (taskTitle: string) => ({
      title: 'Task updated',
      message: `The task "${taskTitle}" has been updated.`
    }),
    deleted: (taskTitle: string) => ({
      title: 'Task deleted',
      message: `The task "${taskTitle}" has been deleted.`
    }),
    onboardingCompleted: () => ({
      title: 'Onboarding completed',
      message: 'Your onboarding has been completed. You can now use all functions.'
    }),
    newOnboardingTask: (taskTitle: string) => ({
      title: 'New onboarding task',
      message: `A new task has been assigned: ${taskTitle}`
    }),
    newOffboardingTask: (taskTitle: string) => ({
      title: 'New offboarding task',
      message: `A new task has been assigned: ${taskTitle}`
    }),
    newSocialSecurityTask: (taskTitle: string) => ({
      title: 'New social security task',
      message: `A new task has been assigned: ${taskTitle}`
    }),
    checkInStarted: (guestName: string) => ({
      title: 'Check-in started',
      message: `Check-in for ${guestName} has been started`
    }),
    checkInCompleted: (guestName: string) => ({
      title: 'Check-in completed',
      message: `Check-in for ${guestName} has been completed`
    })
  }
};

/**
 * Übersetzungen für Request-Notifications
 */
const requestNotifications: Record<string, RequestNotificationTranslations> = {
  de: {
    created: (requestTitle: string, isRequester: boolean) => ({
      title: `Neuer Request: ${requestTitle}`,
      message: isRequester 
        ? `Du hast einen neuen Request erstellt: ${requestTitle}`
        : `Dir wurde ein neuer Request zugewiesen: ${requestTitle}`
    }),
    statusChanged: (requestTitle: string, status: string) => ({
      title: `Statusänderung: ${requestTitle}`,
      message: `Der Status deines Requests "${requestTitle}" wurde zu "${status}" geändert.`
    }),
    responsibilityChanged: (requestTitle: string, isOld: boolean) => ({
      title: `Verantwortlichkeit geändert: ${requestTitle}`,
      message: isOld
        ? `Die Verantwortlichkeit für den Request "${requestTitle}" wurde geändert.`
        : `Dir wurde ein Request zugewiesen: ${requestTitle}`
    }),
    assigned: (requestTitle: string) => ({
      title: `Neuer Request: ${requestTitle}`,
      message: `Dir wurde ein Request zugewiesen: ${requestTitle}`
    }),
    deleted: (requestTitle: string) => ({
      title: `Request gelöscht: ${requestTitle}`,
      message: `Dein Request "${requestTitle}" wurde gelöscht.`
    }),
    newTaskFromRequest: (taskTitle: string) => ({
      title: `Neuer Task: ${taskTitle}`,
      message: `Dir wurde ein neuer Task zugewiesen: ${taskTitle}`
    })
  },
  es: {
    created: (requestTitle: string, isRequester: boolean) => ({
      title: `Nueva solicitud: ${requestTitle}`,
      message: isRequester
        ? `Has creado una nueva solicitud: ${requestTitle}`
        : `Se te ha asignado una nueva solicitud: ${requestTitle}`
    }),
    statusChanged: (requestTitle: string, status: string) => ({
      title: `Cambio de estado: ${requestTitle}`,
      message: `El estado de tu solicitud "${requestTitle}" ha sido cambiado a "${status}".`
    }),
    responsibilityChanged: (requestTitle: string, isOld: boolean) => ({
      title: `Responsabilidad cambiada: ${requestTitle}`,
      message: isOld
        ? `La responsabilidad de la solicitud "${requestTitle}" ha sido cambiada.`
        : `Se te ha asignado una solicitud: ${requestTitle}`
    }),
    assigned: (requestTitle: string) => ({
      title: `Nueva solicitud: ${requestTitle}`,
      message: `Se te ha asignado una solicitud: ${requestTitle}`
    }),
    deleted: (requestTitle: string) => ({
      title: `Solicitud eliminada: ${requestTitle}`,
      message: `Tu solicitud "${requestTitle}" ha sido eliminada.`
    }),
    newTaskFromRequest: (taskTitle: string) => ({
      title: `Nueva tarea: ${taskTitle}`,
      message: `Se te ha asignado una nueva tarea: ${taskTitle}`
    })
  },
  en: {
    created: (requestTitle: string, isRequester: boolean) => ({
      title: `New request: ${requestTitle}`,
      message: isRequester
        ? `You have created a new request: ${requestTitle}`
        : `A new request has been assigned to you: ${requestTitle}`
    }),
    statusChanged: (requestTitle: string, status: string) => ({
      title: `Status change: ${requestTitle}`,
      message: `The status of your request "${requestTitle}" has been changed to "${status}".`
    }),
    responsibilityChanged: (requestTitle: string, isOld: boolean) => ({
      title: `Responsibility changed: ${requestTitle}`,
      message: isOld
        ? `The responsibility for request "${requestTitle}" has been changed.`
        : `A request has been assigned to you: ${requestTitle}`
    }),
    assigned: (requestTitle: string) => ({
      title: `New request: ${requestTitle}`,
      message: `A request has been assigned to you: ${requestTitle}`
    }),
    deleted: (requestTitle: string) => ({
      title: `Request deleted: ${requestTitle}`,
      message: `Your request "${requestTitle}" has been deleted.`
    }),
    newTaskFromRequest: (taskTitle: string) => ({
      title: `New task: ${taskTitle}`,
      message: `A new task has been assigned to you: ${taskTitle}`
    })
  }
};

/**
 * Übersetzungen für User-Notifications
 */
const userNotifications: Record<string, UserNotificationTranslations> = {
  de: {
    rolesUpdated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Deine Rollen wurden aktualisiert' : 'Benutzerrollen aktualisiert',
      message: isSelf
        ? 'Deine Benutzerrollen wurden aktualisiert. Melde dich bei Fragen an einen Administrator.'
        : `Die Rollen für "${userName}" wurden aktualisiert.`
    }),
    branchesUpdated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Deine Niederlassungen wurden aktualisiert' : 'Benutzer-Niederlassungen aktualisiert',
      message: isSelf
        ? 'Deine zugewiesenen Niederlassungen wurden aktualisiert. Melde dich bei Fragen an einen Administrator.'
        : `Die Niederlassungen für "${userName}" wurden aktualisiert.`
    }),
    created: (userName: string) => ({
      title: 'Neuer Benutzer erstellt',
      message: `Ein neuer Benutzer "${userName}" wurde erstellt.`
    }),
    updated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Dein Profil wurde aktualisiert' : 'Benutzerprofil aktualisiert',
      message: isSelf
        ? 'Dein Profil wurde aktualisiert.'
        : `Das Profil für "${userName}" wurde aktualisiert.`
    }),
    deleted: (userName: string) => ({
      title: 'Benutzer gelöscht',
      message: `Der Benutzer "${userName}" wurde gelöscht.`
    })
  },
  es: {
    rolesUpdated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Tus roles han sido actualizados' : 'Roles de usuario actualizados',
      message: isSelf
        ? 'Tus roles de usuario han sido actualizados. Contacta a un administrador si tienes preguntas.'
        : `Los roles para "${userName}" han sido actualizados.`
    }),
    branchesUpdated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Tus sucursales han sido actualizadas' : 'Sucursales de usuario actualizadas',
      message: isSelf
        ? 'Tus sucursales asignadas han sido actualizadas. Contacta a un administrador si tienes preguntas.'
        : `Las sucursales para "${userName}" han sido actualizadas.`
    }),
    created: (userName: string) => ({
      title: 'Nuevo usuario creado',
      message: `Se ha creado un nuevo usuario "${userName}".`
    }),
    updated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Tu perfil ha sido actualizado' : 'Perfil de usuario actualizado',
      message: isSelf
        ? 'Tu perfil ha sido actualizado.'
        : `El perfil para "${userName}" ha sido actualizado.`
    }),
    deleted: (userName: string) => ({
      title: 'Usuario eliminado',
      message: `El usuario "${userName}" ha sido eliminado.`
    })
  },
  en: {
    rolesUpdated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Your roles have been updated' : 'User roles updated',
      message: isSelf
        ? 'Your user roles have been updated. Contact an administrator if you have questions.'
        : `The roles for "${userName}" have been updated.`
    }),
    branchesUpdated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Your branches have been updated' : 'User branches updated',
      message: isSelf
        ? 'Your assigned branches have been updated. Contact an administrator if you have questions.'
        : `The branches for "${userName}" have been updated.`
    }),
    created: (userName: string) => ({
      title: 'New user created',
      message: `A new user "${userName}" has been created.`
    }),
    updated: (isSelf: boolean, userName?: string) => ({
      title: isSelf ? 'Your profile has been updated' : 'User profile updated',
      message: isSelf
        ? 'Your profile has been updated.'
        : `The profile for "${userName}" has been updated.`
    }),
    deleted: (userName: string) => ({
      title: 'User deleted',
      message: `The user "${userName}" has been deleted.`
    })
  }
};

/**
 * Übersetzungen für Role-Notifications
 */
const roleNotifications: Record<string, RoleNotificationTranslations> = {
  de: {
    created: (roleName: string) => ({
      title: 'Neue Rolle erstellt',
      message: `Eine neue Rolle "${roleName}" wurde erstellt.`
    }),
    updated: (roleName: string, isSelf: boolean) => ({
      title: isSelf ? 'Deine Rolle wurde aktualisiert' : 'Rolle aktualisiert',
      message: isSelf
        ? `Die Rolle "${roleName}", die dir zugewiesen ist, wurde aktualisiert.`
        : `Die Rolle "${roleName}" wurde aktualisiert.`
    }),
    deleted: (roleName: string, isSelf: boolean) => ({
      title: isSelf ? 'Rolle entfernt' : 'Rolle gelöscht',
      message: isSelf
        ? `Die Rolle "${roleName}", die dir zugewiesen war, wurde gelöscht.`
        : `Die Rolle "${roleName}" wurde gelöscht.`
    })
  },
  es: {
    created: (roleName: string) => ({
      title: 'Nuevo rol creado',
      message: `Se ha creado un nuevo rol "${roleName}".`
    }),
    updated: (roleName: string, isSelf: boolean) => ({
      title: isSelf ? 'Tu rol ha sido actualizado' : 'Rol actualizado',
      message: isSelf
        ? `El rol "${roleName}" que te fue asignado ha sido actualizado.`
        : `El rol "${roleName}" ha sido actualizado.`
    }),
    deleted: (roleName: string, isSelf: boolean) => ({
      title: isSelf ? 'Rol eliminado' : 'Rol eliminado',
      message: isSelf
        ? `El rol "${roleName}" que te fue asignado ha sido eliminado.`
        : `El rol "${roleName}" ha sido eliminado.`
    })
  },
  en: {
    created: (roleName: string) => ({
      title: 'New role created',
      message: `A new role "${roleName}" has been created.`
    }),
    updated: (roleName: string, isSelf: boolean) => ({
      title: isSelf ? 'Your role has been updated' : 'Role updated',
      message: isSelf
        ? `The role "${roleName}" assigned to you has been updated.`
        : `The role "${roleName}" has been updated.`
    }),
    deleted: (roleName: string, isSelf: boolean) => ({
      title: isSelf ? 'Role removed' : 'Role deleted',
      message: isSelf
        ? `The role "${roleName}" assigned to you has been deleted.`
        : `The role "${roleName}" has been deleted.`
    })
  }
};

/**
 * Übersetzungen für System-Notifications
 */
const systemNotifications: Record<string, SystemNotificationTranslations> = {
  de: {
    monthlyReportCreated: (periodStart: string, periodEnd: string) => ({
      title: 'Monatsabrechnung erstellt',
      message: `Ihre automatische Monatsabrechnung für den Zeitraum ${periodStart} - ${periodEnd} wurde erfolgreich erstellt.`
    }),
    monthlyReportError: () => ({
      title: 'Fehler bei Monatsabrechnung',
      message: 'Bei der automatischen Erstellung Ihrer Monatsabrechnung ist ein Fehler aufgetreten. Bitte erstellen Sie diese manuell.'
    }),
    worktimeManagerStop: (branchName: string) => ({
      title: 'Zeiterfassung durch Vorgesetzten beendet',
      message: `Ihre Zeiterfassung für ${branchName} wurde von einem Vorgesetzten beendet.`
    }),
    worktimeUpdated: (branchName: string) => ({
      title: 'Zeiterfassung aktualisiert',
      message: `Ihre Zeiterfassung für ${branchName} wurde von einem Vorgesetzten aktualisiert.`
    }),
    overtimeUpdated: (hours: number) => ({
      title: 'Bewilligte Überstunden aktualisiert',
      message: `Ihre bewilligten Überstunden wurden auf ${hours} Stunden aktualisiert.`
    })
  },
  es: {
    monthlyReportCreated: (periodStart: string, periodEnd: string) => ({
      title: 'Informe mensual creado',
      message: `Su informe mensual automático para el período ${periodStart} - ${periodEnd} ha sido creado exitosamente.`
    }),
    monthlyReportError: () => ({
      title: 'Error en informe mensual',
      message: 'Ocurrió un error al crear automáticamente su informe mensual. Por favor, créelo manualmente.'
    }),
    worktimeManagerStop: (branchName: string) => ({
      title: 'Registro de tiempo detenido por supervisor',
      message: `Su registro de tiempo para ${branchName} ha sido detenido por un supervisor.`
    }),
    worktimeUpdated: (branchName: string) => ({
      title: 'Registro de tiempo actualizado',
      message: `Su registro de tiempo para ${branchName} ha sido actualizado por un supervisor.`
    }),
    overtimeUpdated: (hours: number) => ({
      title: 'Horas extras aprobadas actualizadas',
      message: `Sus horas extras aprobadas han sido actualizadas a ${hours} horas.`
    })
  },
  en: {
    monthlyReportCreated: (periodStart: string, periodEnd: string) => ({
      title: 'Monthly report created',
      message: `Your automatic monthly report for the period ${periodStart} - ${periodEnd} has been successfully created.`
    }),
    monthlyReportError: () => ({
      title: 'Monthly report error',
      message: 'An error occurred while automatically creating your monthly report. Please create it manually.'
    }),
    worktimeManagerStop: (branchName: string) => ({
      title: 'Time tracking stopped by manager',
      message: `Your time tracking for ${branchName} has been stopped by a manager.`
    }),
    worktimeUpdated: (branchName: string) => ({
      title: 'Time tracking updated',
      message: `Your time tracking for ${branchName} has been updated by a manager.`
    }),
    overtimeUpdated: (hours: number) => ({
      title: 'Approved overtime updated',
      message: `Your approved overtime has been updated to ${hours} hours.`
    })
  }
};

/**
 * Gibt die übersetzte Notification-Nachricht für Task-Events zurück
 */
export function getTaskNotificationText(
  language: string,
  type: 'assigned' | 'quality_control_assigned' | 'status_changed' | 'updated' | 'deleted' | 'onboarding_completed' | 'new_onboarding_task' | 'new_offboarding_task' | 'new_social_security_task' | 'check_in_started' | 'check_in_completed',
  taskTitle: string,
  oldStatus?: string,
  newStatus?: string,
  guestName?: string
): { title: string; message: string } {
  const lang = language in taskNotifications ? language : 'de';
  const translations = taskNotifications[lang];

  switch (type) {
    case 'assigned':
      return translations.assigned(taskTitle);
    case 'quality_control_assigned':
      return translations.qualityControlAssigned(taskTitle);
    case 'status_changed':
      return translations.statusChanged(taskTitle, oldStatus || '', newStatus || '');
    case 'updated':
      return translations.updated(taskTitle);
    case 'deleted':
      return translations.deleted(taskTitle);
    case 'onboarding_completed':
      return translations.onboardingCompleted();
    case 'new_onboarding_task':
      return translations.newOnboardingTask(taskTitle);
    case 'new_offboarding_task':
      return translations.newOffboardingTask(taskTitle);
    case 'new_social_security_task':
      return translations.newSocialSecurityTask(taskTitle);
    case 'check_in_started':
      return translations.checkInStarted(guestName || 'Gast');
    case 'check_in_completed':
      return translations.checkInCompleted(guestName || 'Gast');
    default:
      return translations.updated(taskTitle);
  }
}

/**
 * Gibt die übersetzte Notification-Nachricht für Request-Events zurück
 */
export function getRequestNotificationText(
  language: string,
  type: 'created' | 'status_changed' | 'responsibility_changed' | 'assigned' | 'deleted' | 'new_task_from_request',
  requestTitle: string,
  isRequester?: boolean,
  status?: string,
  isOld?: boolean,
  taskTitle?: string
): { title: string; message: string } {
  const lang = language in requestNotifications ? language : 'de';
  const translations = requestNotifications[lang];

  switch (type) {
    case 'created':
      return translations.created(requestTitle, isRequester || false);
    case 'status_changed':
      return translations.statusChanged(requestTitle, status || '');
    case 'responsibility_changed':
      return translations.responsibilityChanged(requestTitle, isOld || false);
    case 'assigned':
      return translations.assigned(requestTitle);
    case 'deleted':
      return translations.deleted(requestTitle);
    case 'new_task_from_request':
      return translations.newTaskFromRequest(taskTitle || requestTitle);
    default:
      return translations.created(requestTitle, false);
  }
}

/**
 * Gibt die übersetzte Notification-Nachricht für User-Events zurück
 */
export function getUserNotificationText(
  language: string,
  type: 'roles_updated' | 'branches_updated' | 'created' | 'updated' | 'deleted',
  isSelf: boolean,
  userName?: string
): { title: string; message: string } {
  const lang = language in userNotifications ? language : 'de';
  const translations = userNotifications[lang];

  switch (type) {
    case 'roles_updated':
      return translations.rolesUpdated(isSelf, userName);
    case 'branches_updated':
      return translations.branchesUpdated(isSelf, userName);
    case 'created':
      return translations.created(userName || '');
    case 'updated':
      return translations.updated(isSelf, userName);
    case 'deleted':
      return translations.deleted(userName || '');
    default:
      return translations.updated(isSelf, userName);
  }
}

/**
 * Gibt die übersetzte Notification-Nachricht für Role-Events zurück
 */
export function getRoleNotificationText(
  language: string,
  type: 'created' | 'updated' | 'deleted',
  roleName: string,
  isSelf: boolean
): { title: string; message: string } {
  const lang = language in roleNotifications ? language : 'de';
  const translations = roleNotifications[lang];

  switch (type) {
    case 'created':
      return translations.created(roleName);
    case 'updated':
      return translations.updated(roleName, isSelf);
    case 'deleted':
      return translations.deleted(roleName, isSelf);
    default:
      return translations.updated(roleName, isSelf);
  }
}

/**
 * Gibt die übersetzte Notification-Nachricht für System-Events zurück
 */
export function getSystemNotificationText(
  language: string,
  type: 'monthly_report_created' | 'monthly_report_error' | 'worktime_manager_stop' | 'worktime_updated' | 'overtime_updated',
  periodStart?: string,
  periodEnd?: string,
  branchName?: string,
  hours?: number
): { title: string; message: string } {
  const lang = language in systemNotifications ? language : 'de';
  const translations = systemNotifications[lang];

  switch (type) {
    case 'monthly_report_created':
      return translations.monthlyReportCreated(periodStart || '', periodEnd || '');
    case 'monthly_report_error':
      return translations.monthlyReportError();
    case 'worktime_manager_stop':
      return translations.worktimeManagerStop(branchName || '');
    case 'worktime_updated':
      return translations.worktimeUpdated(branchName || '');
    case 'overtime_updated':
      return translations.overtimeUpdated(hours || 0);
    default:
      return translations.monthlyReportError();
  }
}

/**
 * Typ für Payroll-PDF-Übersetzungen
 */
type PayrollPDFTranslations = {
  title: string;
  employee: string;
  period: string;
  country: string;
  contractType: string;
  workingHours: string;
  regularHours: string;
  overtimeHours: string;
  nightHours: string;
  holidaySundayHours: string;
  overtimeNightHours: string;
  overtimeSundayHolidayHours: string;
  overtimeNightSundayHolidayHours: string;
  calculation: string;
  hourlyRate: string;
  grossPay: string;
  socialSecurity: string;
  taxes: string;
  netPay: string;
  createdOn: string;
  countries: {
    CH: string;
    CO: string;
  };
  contractTypes: {
    tiempo_completo: string;
    tiempo_parcial_7: string;
    tiempo_parcial_14: string;
    tiempo_parcial_21: string;
    servicios_externos: string;
  };
};

/**
 * Übersetzungen für Payroll-PDF
 */
const payrollPDFTranslations: Record<string, PayrollPDFTranslations> = {
  de: {
    title: 'Lohnabrechnung',
    employee: 'Mitarbeiter',
    period: 'Abrechnungszeitraum',
    country: 'Land',
    contractType: 'Vertragsart',
    workingHours: 'Arbeitsstunden',
    regularHours: 'Reguläre Stunden',
    overtimeHours: 'Überstunden',
    nightHours: 'Nachtstunden',
    holidaySundayHours: 'Feiertags-/Sonntagsstunden',
    overtimeNightHours: 'Nachtüberstunden',
    overtimeSundayHolidayHours: 'Feiertags-/Sonntagsüberstunden',
    overtimeNightSundayHolidayHours: 'Nacht-Feiertags-/Sonntagsüberstunden',
    calculation: 'Abrechnung',
    hourlyRate: 'Stundensatz',
    grossPay: 'Bruttolohn',
    socialSecurity: 'Sozialversicherungsbeiträge',
    taxes: 'Steuern',
    netPay: 'Nettolohn',
    createdOn: 'Erstellt am',
    countries: {
      CH: 'Schweiz',
      CO: 'Kolumbien'
    },
    contractTypes: {
      tiempo_completo: 'Tiempo Completo (>21 Tage/Monat)',
      tiempo_parcial_7: 'Tiempo Parcial (≤7 Tage/Monat)',
      tiempo_parcial_14: 'Tiempo Parcial (≤14 Tage/Monat)',
      tiempo_parcial_21: 'Tiempo Parcial (≤21 Tage/Monat)',
      servicios_externos: 'Servicios Externos (Stundenbasiert)'
    }
  },
  es: {
    title: 'Nómina',
    employee: 'Empleado',
    period: 'Período de liquidación',
    country: 'País',
    contractType: 'Tipo de contrato',
    workingHours: 'Horas de trabajo',
    regularHours: 'Horas regulares',
    overtimeHours: 'Horas extras',
    nightHours: 'Horas nocturnas',
    holidaySundayHours: 'Horas festivas/dominicales',
    overtimeNightHours: 'Horas extras nocturnas',
    overtimeSundayHolidayHours: 'Horas extras dominicales/festivas',
    overtimeNightSundayHolidayHours: 'Horas extras nocturnas dominicales/festivas',
    calculation: 'Liquidación',
    hourlyRate: 'Tarifa por hora',
    grossPay: 'Salario bruto',
    socialSecurity: 'Aportes de seguridad social',
    taxes: 'Impuestos',
    netPay: 'Salario neto',
    createdOn: 'Creado el',
    countries: {
      CH: 'Suiza',
      CO: 'Colombia'
    },
    contractTypes: {
      tiempo_completo: 'Tiempo Completo (>21 días/mes)',
      tiempo_parcial_7: 'Tiempo Parcial (≤7 días/mes)',
      tiempo_parcial_14: 'Tiempo Parcial (≤14 días/mes)',
      tiempo_parcial_21: 'Tiempo Parcial (≤21 días/mes)',
      servicios_externos: 'Servicios Externos (Basado en horas)'
    }
  },
  en: {
    title: 'Payroll',
    employee: 'Employee',
    period: 'Payroll Period',
    country: 'Country',
    contractType: 'Contract Type',
    workingHours: 'Working Hours',
    regularHours: 'Regular hours',
    overtimeHours: 'Overtime hours',
    nightHours: 'Night hours',
    holidaySundayHours: 'Holiday/Sunday hours',
    overtimeNightHours: 'Overtime night hours',
    overtimeSundayHolidayHours: 'Overtime Sunday/holiday hours',
    overtimeNightSundayHolidayHours: 'Overtime night Sunday/holiday hours',
    calculation: 'Calculation',
    hourlyRate: 'Hourly Rate',
    grossPay: 'Gross Pay',
    socialSecurity: 'Social Security Contributions',
    taxes: 'Taxes',
    netPay: 'Net Pay',
    createdOn: 'Created on',
    countries: {
      CH: 'Switzerland',
      CO: 'Colombia'
    },
    contractTypes: {
      tiempo_completo: 'Full Time (>21 days/month)',
      tiempo_parcial_7: 'Part Time (≤7 days/month)',
      tiempo_parcial_14: 'Part Time (≤14 days/month)',
      tiempo_parcial_21: 'Part Time (≤21 days/month)',
      servicios_externos: 'External Services (Hourly based)'
    }
  }
};

/**
 * Ruft die Payroll-PDF-Übersetzungen für eine Sprache ab
 */
export function getPayrollPDFTranslations(language: string): PayrollPDFTranslations {
  const lang = language || 'de';
  const translations = payrollPDFTranslations[lang];
  return translations || payrollPDFTranslations['de']; // Fallback zu Deutsch
}

// ============================================
// PRICE ANALYSIS NOTIFICATIONS
// ============================================

type PriceAnalysisNotificationTranslations = {
  recommendationCreated: (categoryName: string, date: string) => { title: string; message: string };
  recommendationApplied: (categoryName: string, date: string) => { title: string; message: string };
  ruleCreated: (ruleName: string) => { title: string; message: string };
  ruleUpdated: (ruleName: string) => { title: string; message: string };
  ruleDeleted: (ruleName: string) => { title: string; message: string };
  rateShoppingCompleted: (platform: string) => { title: string; message: string };
  rateShoppingFailed: (platform: string, error: string) => { title: string; message: string };
  analysisCompleted: (analysisCount: number) => { title: string; message: string };
  recommendationsGenerated: (recommendationCount: number) => { title: string; message: string };
};

const priceAnalysisNotifications: Record<string, PriceAnalysisNotificationTranslations> = {
  de: {
    recommendationCreated: (categoryName: string, date: string) => ({
      title: 'Neuer Preisvorschlag erstellt',
      message: `Für ${categoryName} am ${date} wurde ein neuer Preisvorschlag erstellt.`
    }),
    recommendationApplied: (categoryName: string, date: string) => ({
      title: 'Preisvorschlag angewendet',
      message: `Der Preisvorschlag für ${categoryName} am ${date} wurde erfolgreich angewendet.`
    }),
    ruleCreated: (ruleName: string) => ({
      title: 'Preisregel erstellt',
      message: `Die Preisregel "${ruleName}" wurde erfolgreich erstellt.`
    }),
    ruleUpdated: (ruleName: string) => ({
      title: 'Preisregel aktualisiert',
      message: `Die Preisregel "${ruleName}" wurde aktualisiert.`
    }),
    ruleDeleted: (ruleName: string) => ({
      title: 'Preisregel gelöscht',
      message: `Die Preisregel "${ruleName}" wurde gelöscht.`
    }),
    rateShoppingCompleted: (platform: string) => ({
      title: 'Rate Shopping abgeschlossen',
      message: `Rate Shopping für ${platform} wurde erfolgreich abgeschlossen.`
    }),
    rateShoppingFailed: (platform: string, error: string) => ({
      title: 'Rate Shopping fehlgeschlagen',
      message: `Rate Shopping für ${platform} ist fehlgeschlagen: ${error}`
    }),
    analysisCompleted: (analysisCount: number) => ({
      title: 'Preisanalyse abgeschlossen',
      message: `Preisanalyse für ${analysisCount} Kategorien abgeschlossen.`
    }),
    recommendationsGenerated: (recommendationCount: number) => ({
      title: 'Preisvorschläge generiert',
      message: `${recommendationCount} Preisvorschläge wurden generiert.`
    })
  },
  es: {
    recommendationCreated: (categoryName: string, date: string) => ({
      title: 'Nueva recomendación de precio creada',
      message: `Se ha creado una nueva recomendación de precio para ${categoryName} el ${date}.`
    }),
    recommendationApplied: (categoryName: string, date: string) => ({
      title: 'Recomendación de precio aplicada',
      message: `La recomendación de precio para ${categoryName} el ${date} se ha aplicado exitosamente.`
    }),
    ruleCreated: (ruleName: string) => ({
      title: 'Regla de precios creada',
      message: `La regla de precios "${ruleName}" se ha creado exitosamente.`
    }),
    ruleUpdated: (ruleName: string) => ({
      title: 'Regla de precios actualizada',
      message: `La regla de precios "${ruleName}" ha sido actualizada.`
    }),
    ruleDeleted: (ruleName: string) => ({
      title: 'Regla de precios eliminada',
      message: `La regla de precios "${ruleName}" ha sido eliminada.`
    }),
    rateShoppingCompleted: (platform: string) => ({
      title: 'Comparación de precios completada',
      message: `La comparación de precios para ${platform} se ha completado exitosamente.`
    }),
    rateShoppingFailed: (platform: string, error: string) => ({
      title: 'Comparación de precios fallida',
      message: `La comparación de precios para ${platform} ha fallado: ${error}`
    }),
    analysisCompleted: (analysisCount: number) => ({
      title: 'Análisis de precios completado',
      message: `Análisis de precios para ${analysisCount} categorías completado.`
    }),
    recommendationsGenerated: (recommendationCount: number) => ({
      title: 'Recomendaciones de precio generadas',
      message: `Se generaron ${recommendationCount} recomendaciones de precio.`
    })
  },
  en: {
    recommendationCreated: (categoryName: string, date: string) => ({
      title: 'New price recommendation created',
      message: `A new price recommendation for ${categoryName} on ${date} has been created.`
    }),
    recommendationApplied: (categoryName: string, date: string) => ({
      title: 'Price recommendation applied',
      message: `The price recommendation for ${categoryName} on ${date} has been successfully applied.`
    }),
    ruleCreated: (ruleName: string) => ({
      title: 'Pricing rule created',
      message: `The pricing rule "${ruleName}" has been successfully created.`
    }),
    ruleUpdated: (ruleName: string) => ({
      title: 'Pricing rule updated',
      message: `The pricing rule "${ruleName}" has been updated.`
    }),
    ruleDeleted: (ruleName: string) => ({
      title: 'Pricing rule deleted',
      message: `The pricing rule "${ruleName}" has been deleted.`
    }),
    rateShoppingCompleted: (platform: string) => ({
      title: 'Rate shopping completed',
      message: `Rate shopping for ${platform} has been successfully completed.`
    }),
    rateShoppingFailed: (platform: string, error: string) => ({
      title: 'Rate shopping failed',
      message: `Rate shopping for ${platform} has failed: ${error}`
    }),
    analysisCompleted: (analysisCount: number) => ({
      title: 'Price analysis completed',
      message: `Price analysis for ${analysisCount} categories completed.`
    }),
    recommendationsGenerated: (recommendationCount: number) => ({
      title: 'Price recommendations generated',
      message: `${recommendationCount} price recommendations were generated.`
    })
  }
};

export function getPriceAnalysisNotificationText(
  language: string,
  type: 'recommendationCreated' | 'recommendationApplied' | 'ruleCreated' | 'ruleUpdated' | 'ruleDeleted' | 'rateShoppingCompleted' | 'rateShoppingFailed' | 'analysisCompleted' | 'recommendationsGenerated',
  ...args: any[]
): { title: string; message: string } {
  const lang = language in priceAnalysisNotifications ? language : 'de';
  const translations = priceAnalysisNotifications[lang];
  
  switch (type) {
    case 'recommendationCreated':
      return translations.recommendationCreated(args[0], args[1]);
    case 'recommendationApplied':
      return translations.recommendationApplied(args[0], args[1]);
    case 'ruleCreated':
      return translations.ruleCreated(args[0]);
    case 'ruleUpdated':
      return translations.ruleUpdated(args[0]);
    case 'ruleDeleted':
      return translations.ruleDeleted(args[0]);
    case 'rateShoppingCompleted':
      return translations.rateShoppingCompleted(args[0]);
    case 'rateShoppingFailed':
      return translations.rateShoppingFailed(args[0], args[1]);
    case 'analysisCompleted':
      return translations.analysisCompleted(args[0]);
    case 'recommendationsGenerated':
      return translations.recommendationsGenerated(args[0]);
    default:
      return translations.recommendationCreated(args[0], args[1]);
  }
}

// ============================================
// Price Analysis Error Texts
// ============================================

type PriceAnalysisErrorTranslations = {
  branchIdRequired: string;
  invalidRecommendationId: string;
  invalidRuleId: string;
  invalidAnalysisId: string;
  notAuthenticated: string;
  recommendationNotFound: string;
  ruleNotFound: string;
  requiredFieldsMissing: string;
  requiredAnalysisFieldsMissing: string;
  errorFetchingRecommendations: string;
  errorApplyingRecommendation: string;
  errorApprovingRecommendation: string;
  errorRejectingRecommendation: string;
  errorFetchingRules: string;
  errorFetchingRule: string;
  errorCreatingRule: string;
  errorUpdatingRule: string;
  errorDeletingRule: string;
  errorAnalyzing: string;
  errorFetchingAnalyses: string;
  errorFetchingAnalysis: string;
  errorGeneratingRecommendations: string;
  recommendationApplied: string;
  recommendationApproved: string;
  recommendationRejected: string;
  ruleCreated: string;
  ruleUpdated: string;
  ruleDeleted: string;
};

const priceAnalysisErrorTexts: Record<string, PriceAnalysisErrorTranslations> = {
  de: {
    branchIdRequired: 'branchId ist erforderlich',
    invalidRecommendationId: 'Ungültige Empfehlungs-ID',
    invalidRuleId: 'Ungültige Regel-ID',
    invalidAnalysisId: 'Ungültige Analyse-ID',
    notAuthenticated: 'Nicht authentifiziert',
    recommendationNotFound: 'Preisempfehlung nicht gefunden',
    ruleNotFound: 'Preisregel nicht gefunden',
    requiredFieldsMissing: 'branchId, name, conditions und action sind erforderlich',
    requiredAnalysisFieldsMissing: 'branchId, startDate und endDate sind erforderlich',
    errorFetchingRecommendations: 'Fehler beim Abrufen der Preisempfehlungen',
    errorApplyingRecommendation: 'Fehler beim Anwenden der Preisempfehlung',
    errorApprovingRecommendation: 'Fehler beim Genehmigen der Preisempfehlung',
    errorRejectingRecommendation: 'Fehler beim Ablehnen der Preisempfehlung',
    errorFetchingRules: 'Fehler beim Abrufen der Preisregeln',
    errorFetchingRule: 'Fehler beim Abrufen der Preisregel',
    errorCreatingRule: 'Fehler beim Erstellen der Preisregel',
    errorUpdatingRule: 'Fehler beim Aktualisieren der Preisregel',
    errorDeletingRule: 'Fehler beim Löschen der Preisregel',
    errorAnalyzing: 'Fehler bei der Preisanalyse',
    errorFetchingAnalyses: 'Fehler beim Abrufen der Preisanalysen',
    errorFetchingAnalysis: 'Fehler beim Abrufen der Preisanalyse',
    errorGeneratingRecommendations: 'Fehler bei der Generierung von Preisempfehlungen',
    recommendationApplied: 'Preisempfehlung wurde angewendet',
    recommendationApproved: 'Preisempfehlung wurde genehmigt',
    recommendationRejected: 'Preisempfehlung wurde abgelehnt',
    ruleCreated: 'Preisregel wurde erstellt',
    ruleUpdated: 'Preisregel wurde aktualisiert',
    ruleDeleted: 'Preisregel wurde gelöscht'
  },
  es: {
    branchIdRequired: 'branchId es requerido',
    invalidRecommendationId: 'ID de recomendación inválida',
    invalidRuleId: 'ID de regla inválida',
    invalidAnalysisId: 'ID de análisis inválida',
    notAuthenticated: 'No autenticado',
    recommendationNotFound: 'Recomendación de precio no encontrada',
    ruleNotFound: 'Regla de precios no encontrada',
    requiredFieldsMissing: 'branchId, name, conditions y action son requeridos',
    requiredAnalysisFieldsMissing: 'branchId, startDate y endDate son requeridos',
    errorFetchingRecommendations: 'Error al obtener las recomendaciones de precio',
    errorApplyingRecommendation: 'Error al aplicar la recomendación de precio',
    errorApprovingRecommendation: 'Error al aprobar la recomendación de precio',
    errorRejectingRecommendation: 'Error al rechazar la recomendación de precio',
    errorFetchingRules: 'Error al obtener las reglas de precio',
    errorFetchingRule: 'Error al obtener la regla de precio',
    errorCreatingRule: 'Error al crear la regla de precio',
    errorUpdatingRule: 'Error al actualizar la regla de precio',
    errorDeletingRule: 'Error al eliminar la regla de precio',
    errorAnalyzing: 'Error en el análisis de precios',
    errorFetchingAnalyses: 'Error al obtener los análisis de precio',
    errorFetchingAnalysis: 'Error al obtener el análisis de precio',
    errorGeneratingRecommendations: 'Error al generar recomendaciones de precio',
    recommendationApplied: 'Recomendación de precio aplicada',
    recommendationApproved: 'Recomendación de precio aprobada',
    recommendationRejected: 'Recomendación de precio rechazada',
    ruleCreated: 'Regla de precios creada',
    ruleUpdated: 'Regla de precios actualizada',
    ruleDeleted: 'Regla de precios eliminada'
  },
  en: {
    branchIdRequired: 'branchId is required',
    invalidRecommendationId: 'Invalid recommendation ID',
    invalidRuleId: 'Invalid rule ID',
    invalidAnalysisId: 'Invalid analysis ID',
    notAuthenticated: 'Not authenticated',
    recommendationNotFound: 'Price recommendation not found',
    ruleNotFound: 'Pricing rule not found',
    requiredFieldsMissing: 'branchId, name, conditions and action are required',
    requiredAnalysisFieldsMissing: 'branchId, startDate and endDate are required',
    errorFetchingRecommendations: 'Error fetching price recommendations',
    errorApplyingRecommendation: 'Error applying price recommendation',
    errorApprovingRecommendation: 'Error approving price recommendation',
    errorRejectingRecommendation: 'Error rejecting price recommendation',
    errorFetchingRules: 'Error fetching pricing rules',
    errorFetchingRule: 'Error fetching pricing rule',
    errorCreatingRule: 'Error creating pricing rule',
    errorUpdatingRule: 'Error updating pricing rule',
    errorDeletingRule: 'Error deleting pricing rule',
    errorAnalyzing: 'Error analyzing prices',
    errorFetchingAnalyses: 'Error fetching price analyses',
    errorFetchingAnalysis: 'Error fetching price analysis',
    errorGeneratingRecommendations: 'Error generating price recommendations',
    recommendationApplied: 'Price recommendation applied',
    recommendationApproved: 'Price recommendation approved',
    recommendationRejected: 'Price recommendation rejected',
    ruleCreated: 'Pricing rule created',
    ruleUpdated: 'Pricing rule updated',
    ruleDeleted: 'Pricing rule deleted'
  }
};

export function getPriceAnalysisErrorText(
  language: string,
  errorType: keyof PriceAnalysisErrorTranslations
): string {
  const lang = language in priceAnalysisErrorTexts ? language : 'de';
  return priceAnalysisErrorTexts[lang][errorType];
}

/**
 * Typ für Tour-Fehlermeldungen
 */
type TourErrorTranslations = {
  tourNotFound: string;
  invalidTourId: string;
  loadError: string;
  loadTourError: string;
  noPermissionCreate: string;
  noPermissionEdit: string;
  titleMinLength: string;
  organizationRequired: string;
  maxParticipantsMin: string;
  availableFromTo: string;
  externalProviderRequired: string;
  createError: string;
  noFileUploaded: string;
  imageUploadError: string;
  galleryUploadError: string;
  imageNotFound: string;
  imageFileNotFound: string;
  loadImageError: string;
  invalidTourIdOrImageIndex: string;
  galleryNotFound: string;
  imageIndexOutOfRange: string;
  loadGalleryImageError: string;
  invalidParameters: string;
  onlyImageFilesAllowed: string;
  imageGenerationStarted: string;
  jobNotFound: string;
};

/**
 * Übersetzungen für Tour-Fehlermeldungen
 */
const tourErrorTexts: Record<string, TourErrorTranslations> = {
  de: {
    tourNotFound: 'Tour nicht gefunden',
    invalidTourId: 'Ungültige Tour-ID',
    loadError: 'Fehler beim Laden der Touren',
    loadTourError: 'Fehler beim Laden der Tour',
    noPermissionCreate: 'Keine Berechtigung zum Erstellen von Touren',
    noPermissionEdit: 'Keine Berechtigung zum Bearbeiten von Touren',
    titleMinLength: 'Titel muss mindestens 3 Zeichen lang sein',
    organizationRequired: 'Organisation ist erforderlich',
    maxParticipantsMin: 'Maximale Teilnehmeranzahl muss >= minimale Teilnehmeranzahl sein',
    availableFromTo: 'Verfügbar ab muss <= verfügbar bis sein',
    externalProviderRequired: 'Externer Anbieter ist bei externen Touren erforderlich',
    createError: 'Fehler beim Erstellen der Tour',
    noFileUploaded: 'Keine Datei hochgeladen',
    imageUploadError: 'Fehler beim Hochladen des Bildes',
    galleryUploadError: 'Fehler beim Hochladen des Galerie-Bildes',
    imageNotFound: 'Bild nicht gefunden',
    imageFileNotFound: 'Bilddatei nicht gefunden',
    loadImageError: 'Fehler beim Laden des Bildes',
    invalidTourIdOrImageIndex: 'Ungültige Tour-ID oder Bild-Index',
    galleryNotFound: 'Galerie nicht gefunden',
    imageIndexOutOfRange: 'Bild-Index außerhalb des gültigen Bereichs',
    loadGalleryImageError: 'Fehler beim Laden des Galerie-Bildes',
    invalidParameters: 'Ungültige Parameter',
    onlyImageFilesAllowed: 'Nur Bilddateien (JPEG, PNG, GIF, WEBP) sind erlaubt',
    imageGenerationStarted: 'Bildgenerierung gestartet',
    jobNotFound: 'Job nicht gefunden'
  },
  en: {
    tourNotFound: 'Tour not found',
    invalidTourId: 'Invalid tour ID',
    loadError: 'Error loading tours',
    loadTourError: 'Error loading tour',
    noPermissionCreate: 'No permission to create tours',
    noPermissionEdit: 'No permission to edit tours',
    titleMinLength: 'Title must be at least 3 characters long',
    organizationRequired: 'Organization is required',
    maxParticipantsMin: 'Maximum participants must be >= minimum participants',
    availableFromTo: 'Available from must be <= available to',
    externalProviderRequired: 'External provider is required for external tours',
    createError: 'Error creating tour',
    noFileUploaded: 'No file uploaded',
    imageUploadError: 'Error uploading image',
    galleryUploadError: 'Error uploading gallery image',
    imageNotFound: 'Image not found',
    imageFileNotFound: 'Image file not found',
    loadImageError: 'Error loading image',
    invalidTourIdOrImageIndex: 'Invalid tour ID or image index',
    galleryNotFound: 'Gallery not found',
    imageIndexOutOfRange: 'Image index out of range',
    loadGalleryImageError: 'Error loading gallery image',
    invalidParameters: 'Invalid parameters',
    onlyImageFilesAllowed: 'Only image files (JPEG, PNG, GIF, WEBP) are allowed',
    imageGenerationStarted: 'Image generation started',
    jobNotFound: 'Job not found'
  },
  es: {
    tourNotFound: 'Tour no encontrado',
    invalidTourId: 'ID de tour inválido',
    loadError: 'Error al cargar tours',
    loadTourError: 'Error al cargar tour',
    noPermissionCreate: 'Sin permiso para crear tours',
    noPermissionEdit: 'Sin permiso para editar tours',
    titleMinLength: 'El título debe tener al menos 3 caracteres',
    organizationRequired: 'La organización es requerida',
    maxParticipantsMin: 'El máximo de participantes debe ser >= mínimo de participantes',
    availableFromTo: 'Disponible desde debe ser <= disponible hasta',
    externalProviderRequired: 'El proveedor externo es requerido para tours externos',
    createError: 'Error al crear tour',
    noFileUploaded: 'No se subió ningún archivo',
    imageUploadError: 'Error al subir imagen',
    galleryUploadError: 'Error al subir imagen de galería',
    imageNotFound: 'Imagen no encontrada',
    imageFileNotFound: 'Archivo de imagen no encontrado',
    loadImageError: 'Error al cargar imagen',
    invalidTourIdOrImageIndex: 'ID de tour o índice de imagen inválido',
    galleryNotFound: 'Galería no encontrada',
    imageIndexOutOfRange: 'Índice de imagen fuera de rango',
    loadGalleryImageError: 'Error al cargar imagen de galería',
    invalidParameters: 'Parámetros inválidos',
    onlyImageFilesAllowed: 'Solo se permiten archivos de imagen (JPEG, PNG, GIF, WEBP)',
    imageGenerationStarted: 'Generación de imagen iniciada',
    jobNotFound: 'Trabajo no encontrado'
  }
};

/**
 * Gibt die übersetzte Fehlermeldung für Tour-Fehler zurück
 */
export function getTourErrorText(
  language: string,
  errorType: keyof TourErrorTranslations
): string {
  const lang = language in tourErrorTexts ? language : 'de';
  return tourErrorTexts[lang][errorType];
}

/**
 * Typ für Tour-Provider-Fehlermeldungen
 */
type TourProviderErrorTranslations = {
  providerNotFound: string;
  invalidProviderId: string;
  loadError: string;
  loadProviderError: string;
  noPermissionCreate: string;
  noPermissionEdit: string;
  noPermissionDelete: string;
  nameMinLength: string;
  organizationRequired: string;
  createError: string;
  updateError: string;
  deleteError: string;
  providerDeleted: string;
};

/**
 * Übersetzungen für Tour-Provider-Fehlermeldungen
 */
const tourProviderErrorTexts: Record<string, TourProviderErrorTranslations> = {
  de: {
    providerNotFound: 'Anbieter nicht gefunden',
    invalidProviderId: 'Ungültige Anbieter-ID',
    loadError: 'Fehler beim Laden der Anbieter',
    loadProviderError: 'Fehler beim Laden des Anbieters',
    noPermissionCreate: 'Keine Berechtigung zum Erstellen von Anbietern',
    noPermissionEdit: 'Keine Berechtigung zum Bearbeiten von Anbietern',
    noPermissionDelete: 'Keine Berechtigung zum Löschen von Anbietern',
    nameMinLength: 'Name muss mindestens 2 Zeichen lang sein',
    organizationRequired: 'Organisation ist erforderlich',
    createError: 'Fehler beim Erstellen des Anbieters',
    updateError: 'Fehler beim Aktualisieren des Anbieters',
    deleteError: 'Fehler beim Löschen des Anbieters',
    providerDeleted: 'Anbieter gelöscht'
  },
  en: {
    providerNotFound: 'Provider not found',
    invalidProviderId: 'Invalid provider ID',
    loadError: 'Error loading providers',
    loadProviderError: 'Error loading provider',
    noPermissionCreate: 'No permission to create providers',
    noPermissionEdit: 'No permission to edit providers',
    noPermissionDelete: 'No permission to delete providers',
    nameMinLength: 'Name must be at least 2 characters long',
    organizationRequired: 'Organization is required',
    createError: 'Error creating provider',
    updateError: 'Error updating provider',
    deleteError: 'Error deleting provider',
    providerDeleted: 'Provider deleted'
  },
  es: {
    providerNotFound: 'Proveedor no encontrado',
    invalidProviderId: 'ID de proveedor inválido',
    loadError: 'Error al cargar proveedores',
    loadProviderError: 'Error al cargar proveedor',
    noPermissionCreate: 'Sin permiso para crear proveedores',
    noPermissionEdit: 'Sin permiso para editar proveedores',
    noPermissionDelete: 'Sin permiso para eliminar proveedores',
    nameMinLength: 'El nombre debe tener al menos 2 caracteres',
    organizationRequired: 'La organización es requerida',
    createError: 'Error al crear proveedor',
    updateError: 'Error al actualizar proveedor',
    deleteError: 'Error al eliminar proveedor',
    providerDeleted: 'Proveedor eliminado'
  }
};

/**
 * Gibt die übersetzte Fehlermeldung für Tour-Provider-Fehler zurück
 */
export function getTourProviderErrorText(
  language: string,
  errorType: keyof TourProviderErrorTranslations
): string {
  const lang = language in tourProviderErrorTexts ? language : 'de';
  return tourProviderErrorTexts[lang][errorType];
}

/**
 * Typ für Tour-Booking-Fehlermeldungen
 */
type TourBookingErrorTranslations = {
  bookingNotFound: string;
  invalidBookingId: string;
  loadError: string;
  loadBookingError: string;
  noPermissionCreate: string;
  noPermissionEdit: string;
  tourIdRequired: string;
  tourDateRequired: string;
  tourDateFuture: string;
  participantsMin: string;
  customerNameMinLength: string;
  contactRequired: string;
  tourNotFound: string;
  tourNotActive: string;
  createError: string;
  updateError: string;
};

/**
 * Übersetzungen für Tour-Booking-Fehlermeldungen
 */
const tourBookingErrorTexts: Record<string, TourBookingErrorTranslations> = {
  de: {
    bookingNotFound: 'Buchung nicht gefunden',
    invalidBookingId: 'Ungültige Buchungs-ID',
    loadError: 'Fehler beim Laden der Buchungen',
    loadBookingError: 'Fehler beim Laden der Buchung',
    noPermissionCreate: 'Keine Berechtigung zum Erstellen von Buchungen',
    noPermissionEdit: 'Keine Berechtigung zum Bearbeiten von Buchungen',
    tourIdRequired: 'Tour-ID ist erforderlich',
    tourDateRequired: 'Tour-Datum ist erforderlich',
    tourDateFuture: 'Tour-Datum muss in der Zukunft sein',
    participantsMin: 'Anzahl Teilnehmer muss >= 1 sein',
    customerNameMinLength: 'Kundenname muss mindestens 2 Zeichen lang sein',
    contactRequired: 'Mindestens eine Kontaktinformation (Telefon oder E-Mail) ist erforderlich',
    tourNotFound: 'Tour nicht gefunden',
    tourNotActive: 'Tour ist nicht aktiv',
    createError: 'Fehler beim Erstellen der Buchung',
    updateError: 'Fehler beim Aktualisieren der Buchung'
  },
  en: {
    bookingNotFound: 'Booking not found',
    invalidBookingId: 'Invalid booking ID',
    loadError: 'Error loading bookings',
    loadBookingError: 'Error loading booking',
    noPermissionCreate: 'No permission to create bookings',
    noPermissionEdit: 'No permission to edit bookings',
    tourIdRequired: 'Tour ID is required',
    tourDateRequired: 'Tour date is required',
    tourDateFuture: 'Tour date must be in the future',
    participantsMin: 'Number of participants must be >= 1',
    customerNameMinLength: 'Customer name must be at least 2 characters long',
    contactRequired: 'At least one contact information (phone or email) is required',
    tourNotFound: 'Tour not found',
    tourNotActive: 'Tour is not active',
    createError: 'Error creating booking',
    updateError: 'Error updating booking'
  },
  es: {
    bookingNotFound: 'Reserva no encontrada',
    invalidBookingId: 'ID de reserva inválido',
    loadError: 'Error al cargar reservas',
    loadBookingError: 'Error al cargar reserva',
    noPermissionCreate: 'Sin permiso para crear reservas',
    noPermissionEdit: 'Sin permiso para editar reservas',
    tourIdRequired: 'ID de tour es requerido',
    tourDateRequired: 'Fecha de tour es requerida',
    tourDateFuture: 'La fecha de tour debe ser en el futuro',
    participantsMin: 'El número de participantes debe ser >= 1',
    customerNameMinLength: 'El nombre del cliente debe tener al menos 2 caracteres',
    contactRequired: 'Se requiere al menos una información de contacto (teléfono o correo electrónico)',
    tourNotFound: 'Tour no encontrado',
    tourNotActive: 'El tour no está activo',
    createError: 'Error al crear reserva',
    updateError: 'Error al actualizar reserva'
  }
};

/**
 * Gibt die übersetzte Fehlermeldung für Tour-Booking-Fehler zurück
 */
export function getTourBookingErrorText(
  language: string,
  errorType: keyof TourBookingErrorTranslations
): string {
  const lang = language in tourBookingErrorTexts ? language : 'de';
  return tourBookingErrorTexts[lang][errorType];
}
