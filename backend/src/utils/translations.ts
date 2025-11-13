import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Ruft die aktive Sprache eines Users ab
 * Priorität: User.language > Organisation.language > 'de'
 */
export async function getUserLanguage(userId: number): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        language: true,
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

    if (!user) {
      return 'de'; // Fallback
    }

    // Priorität 1: User-Sprache
    if (user.language && user.language.trim() !== '') {
      return user.language;
    }

    // Priorität 2: Organisation-Sprache
    const userRole = user.roles[0];
    if (userRole?.role?.organization) {
      const orgSettings = userRole.role.organization.settings as any;
      if (orgSettings?.language) {
        return orgSettings.language;
      }
    }

    // Priorität 3: Fallback
    return 'de';
  } catch (error) {
    console.error('Fehler beim Abrufen der User-Sprache:', error);
    return 'de';
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


