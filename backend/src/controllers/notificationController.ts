import { Request, Response } from 'express';
import { PrismaClient, Prisma, NotificationType } from '@prisma/client';
import {
  NotificationCreateInput,
  NotificationUpdateInput,
  NotificationFilter
} from '../types/notification';
import { validateNotification } from '../validation/notificationValidation';

const prisma = new PrismaClient();

// Hilfsfunktion zum Prüfen, ob Benachrichtigung für einen Typ aktiviert ist
async function isNotificationEnabled(
  userId: number,
  type: NotificationType,
  relatedEntityType?: string
): Promise<boolean> {
  console.log('[Notification] Prüfe Benachrichtigungseinstellungen für:', {
    userId,
    type,
    relatedEntityType
  });

  // Benutzereinstellungen abrufen
  const userSettings = await prisma.userNotificationSettings.findFirst({
    where: { userId }
  });
  console.log('[Notification] Gefundene Benutzereinstellungen:', userSettings);

  // Systemeinstellungen abrufen
  const systemSettings = await prisma.notificationSettings.findFirst();
  console.log('[Notification] Gefundene Systemeinstellungen:', systemSettings);

  let enabled = true;

  switch (type) {
    case NotificationType.task:
      enabled = (userSettings?.taskCreate ?? systemSettings.taskCreate) ||
                (userSettings?.taskUpdate ?? systemSettings.taskUpdate) ||
                (userSettings?.taskDelete ?? systemSettings.taskDelete) ||
                (userSettings?.taskStatusChange ?? systemSettings.taskStatusChange);
      break;
    case NotificationType.request:
      enabled = (userSettings?.requestCreate ?? systemSettings.requestCreate) ||
                (userSettings?.requestUpdate ?? systemSettings.requestUpdate) ||
                (userSettings?.requestDelete ?? systemSettings.requestDelete) ||
                (userSettings?.requestStatusChange ?? systemSettings.requestStatusChange);
      break;
    case NotificationType.user:
      enabled = (userSettings?.userCreate ?? systemSettings.userCreate) ||
                (userSettings?.userUpdate ?? systemSettings.userUpdate) ||
                (userSettings?.userDelete ?? systemSettings.userDelete);
      break;
    case NotificationType.role:
      enabled = (userSettings?.roleCreate ?? systemSettings.roleCreate) ||
                (userSettings?.roleUpdate ?? systemSettings.roleUpdate) ||
                (userSettings?.roleDelete ?? systemSettings.roleDelete);
      break;
    case NotificationType.worktime:
      if (relatedEntityType === 'start') {
        enabled = userSettings?.worktimeStart ?? true;
        console.log('[Notification] Worktime Start Einstellung:', enabled);
      } else if (relatedEntityType === 'stop') {
        enabled = userSettings?.worktimeStop ?? true;
        console.log('[Notification] Worktime Stop Einstellung:', enabled);
      }
      break;
    case NotificationType.system:
      enabled = true; // System-Benachrichtigungen sind immer aktiviert
      break;
  }

  console.log('[Notification] Benachrichtigungen sind:', enabled ? 'aktiviert' : 'deaktiviert', 
    'für Typ:', type, 
    'und Entity-Typ:', relatedEntityType);
  return enabled;
}

// Hilfsfunktion zum Erstellen einer Benachrichtigung nur wenn sie aktiviert ist
export async function createNotificationIfEnabled(
  data: NotificationCreateInput
): Promise<boolean> {
  try {
    console.log('[Notification] Versuche Benachrichtigung zu erstellen:', {
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      relatedEntityType: data.relatedEntityType,
      relatedEntityId: data.relatedEntityId
    });

    const enabled = await isNotificationEnabled(data.userId, data.type, data.relatedEntityType);
    console.log('[Notification] Benachrichtigungen aktiviert:', enabled);

    if (!enabled) {
      console.log('[Notification] Benachrichtigungen sind deaktiviert');
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

    console.log('[Notification] Benachrichtigung erfolgreich erstellt:', {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title
    });
    return true;
  } catch (error) {
    console.error('[Notification] Fehler beim Erstellen der Benachrichtigung:', error);
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
    console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
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
    console.error('Fehler beim Abrufen der Benachrichtigung:', error);
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
    console.error('Fehler beim Erstellen der Benachrichtigung:', error);
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
    console.error('Fehler beim Aktualisieren der Benachrichtigung:', error);
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
    console.error('Fehler beim Löschen der Benachrichtigung:', error);
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
    console.error('Fehler beim Markieren aller Benachrichtigungen als gelesen:', error);
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
    console.error('Fehler beim Abrufen der Benachrichtigungseinstellungen:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Alle Benachrichtigungen eines Benutzers abrufen
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
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
    console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Ungelesene Benachrichtigungen zählen
export const countUnreadNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
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
    console.error('Fehler beim Zählen der ungelesenen Benachrichtigungen:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
};

// Benachrichtigung als gelesen markieren
export const markNotificationAsRead = async (req: Request, res: Response) => {
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

    // Als gelesen markieren
    const updatedNotification = await prisma.notification.update({
      where: { id: parseInt(id) },
      data: { read: true }
    });

    res.json(updatedNotification);
  } catch (error) {
    console.error('Fehler beim Markieren der Benachrichtigung als gelesen:', error);
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
    console.error('Fehler beim Markieren aller Benachrichtigungen als gelesen:', error);
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
    console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
    res.status(500).json({ message: 'Interner Server-Fehler' });
  }
}; 