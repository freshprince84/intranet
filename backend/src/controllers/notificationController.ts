import { Request, Response } from 'express';
import { Prisma, NotificationType } from '@prisma/client';
import { prisma, executeWithRetry } from '../utils/prisma';
import {
  NotificationCreateInput,
  NotificationUpdateInput,
  NotificationFilter,
  OrganizationNotificationInput
} from '../types/notification';
import { validateNotification } from '../validation/notificationValidation';
import { notificationSettingsCache } from '../services/notificationSettingsCache';

// Hilfsfunktion zum Prüfen, ob Benachrichtigung für einen Typ aktiviert ist
async function isNotificationEnabled(
  userId: number,
  type: NotificationType,
  relatedEntityType?: string
): Promise<boolean> {
  // Benutzereinstellungen aus Cache abrufen (statt direkt von DB)
  const userSettings = await notificationSettingsCache.getUserSettings(userId);

  // Systemeinstellungen aus Cache abrufen (statt direkt von DB)
  const systemSettings = await notificationSettingsCache.getSystemSettings();

  // Wenn keine Systemeinstellungen vorhanden sind, erstelle Standard-Werte
  if (!systemSettings) {
    console.warn('Keine NotificationSettings in der Datenbank gefunden. Verwende Standard-Werte (alle aktiviert).');
  }

  let enabled = true;

  switch (type) {
    case NotificationType.task:
      if (relatedEntityType === 'create') {
        enabled = userSettings?.taskCreate ?? systemSettings?.taskCreate ?? true;
      } else if (relatedEntityType === 'update') {
        enabled = userSettings?.taskUpdate ?? systemSettings?.taskUpdate ?? true;
      } else if (relatedEntityType === 'delete') {
        enabled = userSettings?.taskDelete ?? systemSettings?.taskDelete ?? true;
      } else if (relatedEntityType === 'status') {
        enabled = userSettings?.taskStatusChange ?? systemSettings?.taskStatusChange ?? true;
      } else {
        // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Task-Notification aktiviert ist
        enabled = (userSettings?.taskCreate ?? systemSettings?.taskCreate ?? true) ||
                  (userSettings?.taskUpdate ?? systemSettings?.taskUpdate ?? true) ||
                  (userSettings?.taskDelete ?? systemSettings?.taskDelete ?? true) ||
                  (userSettings?.taskStatusChange ?? systemSettings?.taskStatusChange ?? true);
      }
      break;
    case NotificationType.request:
      if (relatedEntityType === 'create') {
        enabled = userSettings?.requestCreate ?? systemSettings?.requestCreate ?? true;
      } else if (relatedEntityType === 'update') {
        enabled = userSettings?.requestUpdate ?? systemSettings?.requestUpdate ?? true;
      } else if (relatedEntityType === 'delete') {
        enabled = userSettings?.requestDelete ?? systemSettings?.requestDelete ?? true;
      } else if (relatedEntityType === 'status') {
        enabled = userSettings?.requestStatusChange ?? systemSettings?.requestStatusChange ?? true;
      } else {
        // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Request-Notification aktiviert ist
        enabled = (userSettings?.requestCreate ?? systemSettings?.requestCreate ?? true) ||
                  (userSettings?.requestUpdate ?? systemSettings?.requestUpdate ?? true) ||
                  (userSettings?.requestDelete ?? systemSettings?.requestDelete ?? true) ||
                  (userSettings?.requestStatusChange ?? systemSettings?.requestStatusChange ?? true);
      }
      break;
    case NotificationType.user:
      if (relatedEntityType === 'create') {
        enabled = userSettings?.userCreate ?? systemSettings?.userCreate ?? true;
      } else if (relatedEntityType === 'update') {
        enabled = userSettings?.userUpdate ?? systemSettings?.userUpdate ?? true;
      } else if (relatedEntityType === 'delete') {
        enabled = userSettings?.userDelete ?? systemSettings?.userDelete ?? true;
      } else {
        // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE User-Notification aktiviert ist
        enabled = (userSettings?.userCreate ?? systemSettings?.userCreate ?? true) ||
                  (userSettings?.userUpdate ?? systemSettings?.userUpdate ?? true) ||
                  (userSettings?.userDelete ?? systemSettings?.userDelete ?? true);
      }
      break;
    case NotificationType.role:
      if (relatedEntityType === 'create') {
        enabled = userSettings?.roleCreate ?? systemSettings?.roleCreate ?? true;
      } else if (relatedEntityType === 'update') {
        enabled = userSettings?.roleUpdate ?? systemSettings?.roleUpdate ?? true;
      } else if (relatedEntityType === 'delete') {
        enabled = userSettings?.roleDelete ?? systemSettings?.roleDelete ?? true;
      } else {
        // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Role-Notification aktiviert ist
        enabled = (userSettings?.roleCreate ?? systemSettings?.roleCreate ?? true) ||
                  (userSettings?.roleUpdate ?? systemSettings?.roleUpdate ?? true) ||
                  (userSettings?.roleDelete ?? systemSettings?.roleDelete ?? true);
      }
      break;
    case NotificationType.worktime:
      if (relatedEntityType === 'start') {
        enabled = userSettings?.worktimeStart ?? systemSettings?.worktimeStart ?? true;
      } else if (relatedEntityType === 'stop') {
        enabled = userSettings?.worktimeStop ?? systemSettings?.worktimeStop ?? true;
      } else if (relatedEntityType === 'auto_stop') {
        enabled = userSettings?.worktimeAutoStop ?? systemSettings?.worktimeAutoStop ?? true;
      } else {
        // Fallback: wenn kein relatedEntityType angegeben, prüfe ob IRGENDEINE Worktime-Notification aktiviert ist
        enabled = (userSettings?.worktimeStart ?? systemSettings?.worktimeStart ?? true) ||
                  (userSettings?.worktimeStop ?? systemSettings?.worktimeStop ?? true) ||
                  (userSettings?.worktimeAutoStop ?? systemSettings?.worktimeAutoStop ?? true);
      }
      break;
    case NotificationType.worktime_manager_stop:
      enabled = userSettings?.worktimeManagerStop ?? systemSettings?.worktimeManagerStop ?? true;
      break;
    // Neue Organisation-spezifische Benachrichtigungen
    case NotificationType.joinRequest:
      enabled = userSettings?.joinRequestReceived ?? true; // Default: aktiviert
      break;
    case NotificationType.joinApproved:
      enabled = userSettings?.joinRequestApproved ?? true; // Default: aktiviert
      break;
    case NotificationType.joinRejected:
      enabled = userSettings?.joinRequestRejected ?? true; // Default: aktiviert
      break;
    case NotificationType.organizationInvitation:
      enabled = userSettings?.organizationInvitationReceived ?? true; // Default: aktiviert
      break;
    case NotificationType.system:
      enabled = true; // System-Benachrichtigungen sind immer aktiviert
      break;
  }

  return enabled;
}

// Hilfsfunktion zum Erstellen einer Benachrichtigung nur wenn sie aktiviert ist
export async function createNotificationIfEnabled(
  data: NotificationCreateInput
): Promise<boolean> {
  try {
    const enabled = await isNotificationEnabled(data.userId, data.type, data.relatedEntityType);

    if (!enabled) {
      console.log(`Notification nicht erstellt: Typ ${data.type}, EntityType ${data.relatedEntityType} für User ${data.userId} ist deaktiviert`);
      return false;
    }

    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedEntityId: data.relatedEntityId,
        relatedEntityType: data.relatedEntityType
      }
    });

    console.log(`Notification erstellt: ID ${notification.id}, Typ ${data.type}, EntityType ${data.relatedEntityType} für User ${data.userId}`);
    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen der Notification:', error);
    console.error('Notification-Daten:', {
      userId: data.userId,
      type: data.type,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId,
      title: data.title
    });
    return false;
  }
}

// Alle Benachrichtigungen abrufen
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Nicht autorisiert' });
    }

    const filter: NotificationFilter = {
      userId
    };

    // Optionale Filter
    if (req.query.read !== undefined) {
      filter.read = req.query.read === 'true';
    }
    
    if (req.query.type) {
      filter.type = req.query.type as NotificationType;
    }

    const notifications = await prisma.notification.findMany({
      where: filter as any,
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Einzelne Benachrichtigung abrufen
export const getNotificationById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht autorisiert' });
    }
    
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    }
    
    // Sicherstellen, dass der Benutzer nur seine eigenen Benachrichtigungen sehen kann
    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Neue Benachrichtigung erstellen
export const createNotification = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Validierung
    const validationError = validateNotification(data);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Benutzer-Einstellungen prüfen
    const userSettings = await prisma.userNotificationSettings.findFirst({
      where: { userId: data.userId }
    });

    // System-Einstellungen abrufen
    const systemSettings = await prisma.notificationSettings.findFirst();

    // Prüfen, ob Benachrichtigungen für diesen Typ aktiviert sind
    let isEnabled = true;
    
    if (userSettings) {
      // Benutzer-spezifische Einstellungen prüfen
      switch (data.type) {
        case NotificationType.task:
          if (data.relatedEntityType === 'create' && userSettings.taskCreate === false) isEnabled = false;
          if (data.relatedEntityType === 'update' && userSettings.taskUpdate === false) isEnabled = false;
          if (data.relatedEntityType === 'delete' && userSettings.taskDelete === false) isEnabled = false;
          if (data.relatedEntityType === 'status' && userSettings.taskStatusChange === false) isEnabled = false;
          break;
        case NotificationType.request:
          if (data.relatedEntityType === 'create' && userSettings.requestCreate === false) isEnabled = false;
          if (data.relatedEntityType === 'update' && userSettings.requestUpdate === false) isEnabled = false;
          if (data.relatedEntityType === 'delete' && userSettings.requestDelete === false) isEnabled = false;
          if (data.relatedEntityType === 'status' && userSettings.requestStatusChange === false) isEnabled = false;
          break;
        case NotificationType.user:
          if (data.relatedEntityType === 'create' && userSettings.userCreate === false) isEnabled = false;
          if (data.relatedEntityType === 'update' && userSettings.userUpdate === false) isEnabled = false;
          if (data.relatedEntityType === 'delete' && userSettings.userDelete === false) isEnabled = false;
          break;
        case NotificationType.role:
          if (data.relatedEntityType === 'create' && userSettings.roleCreate === false) isEnabled = false;
          if (data.relatedEntityType === 'update' && userSettings.roleUpdate === false) isEnabled = false;
          if (data.relatedEntityType === 'delete' && userSettings.roleDelete === false) isEnabled = false;
          break;
        case NotificationType.worktime:
          if (data.relatedEntityType === 'start' && userSettings.worktimeStart === false) isEnabled = false;
          if (data.relatedEntityType === 'stop' && userSettings.worktimeStop === false) isEnabled = false;
          break;
      }
    } else if (systemSettings) {
      // System-Einstellungen prüfen, wenn keine Benutzer-Einstellungen vorhanden sind
      switch (data.type) {
        case NotificationType.task:
          if (data.relatedEntityType === 'create' && !systemSettings.taskCreate) isEnabled = false;
          if (data.relatedEntityType === 'update' && !systemSettings.taskUpdate) isEnabled = false;
          if (data.relatedEntityType === 'delete' && !systemSettings.taskDelete) isEnabled = false;
          if (data.relatedEntityType === 'status' && !systemSettings.taskStatusChange) isEnabled = false;
          break;
        case NotificationType.request:
          if (data.relatedEntityType === 'create' && !systemSettings.requestCreate) isEnabled = false;
          if (data.relatedEntityType === 'update' && !systemSettings.requestUpdate) isEnabled = false;
          if (data.relatedEntityType === 'delete' && !systemSettings.requestDelete) isEnabled = false;
          if (data.relatedEntityType === 'status' && !systemSettings.requestStatusChange) isEnabled = false;
          break;
        case NotificationType.user:
          if (data.relatedEntityType === 'create' && !systemSettings.userCreate) isEnabled = false;
          if (data.relatedEntityType === 'update' && !systemSettings.userUpdate) isEnabled = false;
          if (data.relatedEntityType === 'delete' && !systemSettings.userDelete) isEnabled = false;
          break;
        case NotificationType.role:
          if (data.relatedEntityType === 'create' && !systemSettings.roleCreate) isEnabled = false;
          if (data.relatedEntityType === 'update' && !systemSettings.roleUpdate) isEnabled = false;
          if (data.relatedEntityType === 'delete' && !systemSettings.roleDelete) isEnabled = false;
          break;
        case NotificationType.worktime:
          if (data.relatedEntityType === 'start' && !systemSettings.worktimeStart) isEnabled = false;
          if (data.relatedEntityType === 'stop' && !systemSettings.worktimeStop) isEnabled = false;
          break;
      }
    }

    // Wenn Benachrichtigungen deaktiviert sind, trotzdem Erfolg zurückgeben
    if (!isEnabled) {
      return res.status(200).json({ 
        message: 'Benachrichtigung wurde nicht erstellt, da dieser Typ deaktiviert ist',
        created: false
      });
    }

    // Benachrichtigung erstellen
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        relatedEntityId: data.relatedEntityId,
        relatedEntityType: data.relatedEntityType
      }
    });

    res.status(201).json({ 
      notification,
      created: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Benachrichtigung aktualisieren (in der Regel nur das 'read'-Flag)
export const updateNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body as NotificationUpdateInput;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht autorisiert' });
    }
    
    // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    }
    
    if (notification.userId !== userId) {
      return res.status(403).json({ message: 'Zugriff verweigert' });
    }
    
    // Aktualisieren der Benachrichtigung
    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    res.json(updatedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Benachrichtigung löschen
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }
    
    // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId
      }
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    }

    // Benachrichtigung löschen
    await prisma.notification.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Benachrichtigung wurde gelöscht' });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Alle ungelesenen Benachrichtigungen markieren als gelesen
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht autorisiert' });
    }
    
    // Alle ungelesenen Benachrichtigungen des Benutzers als gelesen markieren
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: {
        read: true
      }
    });
    
    res.status(200).json({ message: 'Alle Benachrichtigungen als gelesen markiert' });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Benachrichtigungseinstellungen abrufen
export const getNotificationSettings = async (req: Request, res: Response) => {
  try {
    // Systemweite Einstellungen abrufen
    const systemSettings = await prisma.notificationSettings.findFirst();
    
    // Benutzereinstellungen abrufen
    const userId = req.user?.id;
    let userSettings = null;
    
    if (userId) {
      userSettings = await prisma.userNotificationSettings.findFirst({
        where: { userId }
      });
    }
    
    res.json({
      systemSettings: systemSettings || {
        taskEnabled: true,
        requestEnabled: true,
        userEnabled: true,
        roleEnabled: true,
        worktimeEnabled: true,
        systemEnabled: true
      },
      userSettings
    });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Alle Benachrichtigungen eines Benutzers abrufen
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    // Unterstütze sowohl req.user?.id als auch req.userId für Kompatibilität
    const userId = req.user?.id || (req.userId ? parseInt(req.userId.toString(), 10) : null);
    if (!userId) {
      return res.status(401).json({ message: 'Nicht autorisiert' });
    }

    // Paginierung
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Filter
    const where: any = { userId };
    if (req.query.read !== undefined) {
      where.read = req.query.read === 'true';
    }
    if (req.query.type) {
      where.type = req.query.type;
    }

    // Abfragen
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.notification.count({ where })
    ]);

    // Response-Format
    res.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Ungelesene Benachrichtigungen zählen
export const countUnreadNotifications = async (req: Request, res: Response) => {
  try {
    // Unterstütze sowohl req.user?.id als auch req.userId für Kompatibilität
    const userId = req.user?.id || (req.userId ? parseInt(req.userId.toString(), 10) : null);
    if (!userId) {
      return res.status(401).json({ message: 'Nicht autorisiert' });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Benachrichtigung als gelesen markieren
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Unterstütze sowohl req.user?.id als auch req.userId für Kompatibilität
    const userId = req.user?.id || (req.userId ? parseInt(req.userId.toString(), 10) : null);
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Prüfen, ob die Benachrichtigung existiert und dem Benutzer gehört
    const notification = await prisma.notification.findFirst({
      where: {
        id: parseInt(id),
        userId
      }
    });

    if (!notification) {
      return res.status(404).json({ message: 'Benachrichtigung nicht gefunden' });
    }

    // Als gelesen markieren
    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { read: true }
    });

    res.json(updatedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Alle Benachrichtigungen eines Benutzers als gelesen markieren
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Alle Benachrichtigungen des Benutzers als gelesen markieren
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false
      },
      data: { read: true }
    });

    res.json({ message: 'Alle Benachrichtigungen wurden als gelesen markiert' });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Alle Benachrichtigungen eines Benutzers löschen
export const deleteAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'Nicht authentifiziert' });
    }

    // Alle Benachrichtigungen des Benutzers löschen
    await prisma.notification.deleteMany({
      where: { userId }
    });

    res.json({ message: 'Alle Benachrichtigungen wurden gelöscht' });
  } catch (error) {
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Neue Funktion: Organisation-spezifische Benachrichtigung erstellen
export async function createOrganizationNotification(
  data: OrganizationNotificationInput
): Promise<boolean> {
  try {
    let title = '';
    let message = data.message || '';

    // Title und Message basierend auf Typ setzen
    switch (data.type) {
      case 'joinRequest':
        title = 'Neue Beitrittsanfrage';
        message = message || 'Eine neue Beitrittsanfrage ist eingegangen.';
        break;
      case 'joinApproved':
        title = 'Beitrittsanfrage genehmigt';
        message = message || 'Ihre Beitrittsanfrage wurde genehmigt.';
        break;
      case 'joinRejected':
        title = 'Beitrittsanfrage abgelehnt';
        message = message || 'Ihre Beitrittsanfrage wurde abgelehnt.';
        break;
      case 'organizationInvitation':
        title = 'Organisations-Einladung';
        message = message || 'Sie wurden zu einer Organisation eingeladen.';
        break;
      default:
        return false;
    }

    // Prüfe ob Benachrichtigungen für diesen Typ aktiviert sind
    const enabled = await isNotificationEnabled(data.userId, data.type as NotificationType);
    if (!enabled) {
      return false;
    }

    // Erstelle die Benachrichtigung
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title,
        message,
        type: data.type as NotificationType,
        relatedEntityId: data.relatedEntityId,
        relatedEntityType: 'organization'
      }
    });

    return true;
  } catch (error) {
    console.error('Fehler beim Erstellen der Organisation-Benachrichtigung:', error);
    return false;
  }
}

// Neue Funktion: Beitrittsanfrage-Benachrichtigung an Admin senden
export async function notifyOrganizationAdmins(
  organizationId: number,
  joinRequestId: number,
  requesterEmail: string
): Promise<void> {
  try {
    // Finde alle Admins der Organisation
    const { getUserOrganizationFilter } = await import('../middleware/organization');
    // Erstelle ein Request-Objekt für den Filter (benötigt req.organizationId)
    const mockReq = { organizationId } as any;
    const userFilter = getUserOrganizationFilter(mockReq);
    
    const orgAdmins = await prisma.user.findMany({
      where: {
        ...userFilter,
        roles: {
          some: {
            role: {
              organizationId,
              name: {
                in: ['admin', 'organization_admin']
              }
            }
          }
        }
      }
    });

    // Sende Benachrichtigung an alle Admins
    for (const admin of orgAdmins) {
      await createOrganizationNotification({
        organizationId,
        userId: admin.id,
        type: 'joinRequest',
        relatedEntityId: joinRequestId,
        message: `Neue Beitrittsanfrage von ${requesterEmail}`
      });
    }
  } catch (error) {
    console.error('Fehler beim Benachrichtigen der Organisation-Admins:', error);
  }
}

// Neue Funktion: Benachrichtigung über Beitrittsanfrage-Status
export async function notifyJoinRequestStatus(
  userId: number,
  organizationName: string,
  status: 'approved' | 'rejected',
  joinRequestId: number
): Promise<void> {
  try {
    const type = status === 'approved' ? 'joinApproved' : 'joinRejected';
    const message = status === 'approved' 
      ? `Ihre Beitrittsanfrage für ${organizationName} wurde genehmigt.`
      : `Ihre Beitrittsanfrage für ${organizationName} wurde abgelehnt.`;

    await createOrganizationNotification({
      organizationId: 0, // Wird für diese Benachrichtigung nicht benötigt
      userId,
      type,
      relatedEntityId: joinRequestId,
      message
    });
  } catch (error) {
    console.error('Fehler beim Benachrichtigen über Beitrittsanfrage-Status:', error);
  }
} 