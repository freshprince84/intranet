// Definiere das NotificationType-Enum manuell, da es Probleme mit dem Import gibt
export enum NotificationType {
  task = 'task',
  request = 'request',
  user = 'user',
  role = 'role',
  worktime = 'worktime',
  system = 'system',
  cerebro = 'cerebro',
  worktime_manager_stop = 'worktime_manager_stop'
}

// Interface für Benachrichtigungsdaten
export interface NotificationData {
  userId: number;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: number;
  relatedEntityType?: string;
  read?: boolean;
}

// Interface für Benachrichtigungseinstellungen
export interface NotificationSettingsData {
  taskCreate?: boolean;
  taskUpdate?: boolean;
  taskDelete?: boolean;
  taskStatusChange?: boolean;
  requestCreate?: boolean;
  requestUpdate?: boolean;
  requestDelete?: boolean;
  requestStatusChange?: boolean;
  userCreate?: boolean;
  userUpdate?: boolean;
  userDelete?: boolean;
  roleCreate?: boolean;
  roleUpdate?: boolean;
  roleDelete?: boolean;
  worktimeStart?: boolean;
  worktimeStop?: boolean;
  worktimeAutoStop?: boolean;
  worktimeManagerStop?: boolean;
  carticleCreate?: boolean;
  carticleUpdate?: boolean;
  carticleDelete?: boolean;
  carticleLink?: boolean;
  carticleMention?: boolean;
}

// Interface für Benutzer-Benachrichtigungseinstellungen
export interface UserNotificationSettingsData extends NotificationSettingsData {
  userId: number;
}

// Validierung für Benachrichtigungen
export const validateNotification = (data: any): string | null => {
  // Pflichtfelder prüfen
  if (!data.userId) return 'userId ist erforderlich';
  if (!data.title) return 'title ist erforderlich';
  if (!data.message) return 'message ist erforderlich';
  if (!data.type) return 'type ist erforderlich';

  // Typen prüfen
  if (typeof data.userId !== 'number') return 'userId muss eine Zahl sein';
  if (typeof data.title !== 'string') return 'title muss ein String sein';
  if (typeof data.message !== 'string') return 'message muss ein String sein';
  
  // Enum-Wert für NotificationType prüfen
  const validTypes = Object.values(NotificationType);
  if (!validTypes.includes(data.type)) {
    return `type muss einer der folgenden Werte sein: ${validTypes.join(', ')}`;
  }

  // Optionale Felder prüfen, wenn vorhanden
  if (data.relatedEntityId !== undefined && typeof data.relatedEntityId !== 'number') {
    return 'relatedEntityId muss eine Zahl sein';
  }
  
  if (data.relatedEntityType !== undefined && typeof data.relatedEntityType !== 'string') {
    return 'relatedEntityType muss ein String sein';
  }
  
  if (data.read !== undefined && typeof data.read !== 'boolean') {
    return 'read muss ein Boolean sein';
  }

  return null; // Keine Fehler
};

// Validierung für Benachrichtigungseinstellungen
export const validateNotificationSettings = (data: any): string | null => {
  // Alle Felder sind optional, aber wenn sie vorhanden sind, müssen sie Booleans sein
  const booleanFields = [
    'taskCreate', 'taskUpdate', 'taskDelete', 'taskStatusChange',
    'requestCreate', 'requestUpdate', 'requestDelete', 'requestStatusChange',
    'userCreate', 'userUpdate', 'userDelete',
    'roleCreate', 'roleUpdate', 'roleDelete',
    'worktimeStart', 'worktimeStop', 'worktimeAutoStop', 'worktimeManagerStop',
    'carticleCreate', 'carticleUpdate', 'carticleDelete', 'carticleLink', 'carticleMention'
  ];

  for (const field of booleanFields) {
    if (data[field] !== undefined && typeof data[field] !== 'boolean') {
      return `${field} muss ein Boolean sein`;
    }
  }

  return null; // Keine Fehler
};

// Validierung für Benutzer-Benachrichtigungseinstellungen
export const validateUserNotificationSettings = (data: any): string | null => {
  // userId ist Pflichtfeld
  if (!data.userId) return 'userId ist erforderlich';
  if (typeof data.userId !== 'number') return 'userId muss eine Zahl sein';

  // Restliche Felder mit validateNotificationSettings prüfen
  return validateNotificationSettings(data);
}; 