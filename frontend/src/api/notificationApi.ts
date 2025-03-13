import apiClient from './apiClient.ts';

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

// Typen für Benachrichtigungseinstellungen
export interface NotificationSettings {
  taskCreate: boolean;
  taskUpdate: boolean;
  taskDelete: boolean;
  taskStatusChange: boolean;
  requestCreate: boolean;
  requestUpdate: boolean;
  requestDelete: boolean;
  requestStatusChange: boolean;
  userCreate: boolean;
  userUpdate: boolean;
  userDelete: boolean;
  roleCreate: boolean;
  roleUpdate: boolean;
  roleDelete: boolean;
  worktimeStart: boolean;
  worktimeStop: boolean;
}

export interface NotificationResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API-Funktionen für Benachrichtigungen mit verbessertem Error-Handling
export const notificationApi = {
  // Benachrichtigungen abrufen
  getNotifications: async (page: number = 1, limit: number = 10): Promise<NotificationResponse> => {
    try {
      const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
      console.log('Notifications API Response:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
      throw error;
    }
  },
  
  // Ungelesene Benachrichtigungen zählen
  getUnreadCount: async (): Promise<number> => {
    try {
      const response = await apiClient.get(`/notifications/unread/count`);
      console.log('Unread Count API Response:', response.data);
      
      if (response.data && typeof response.data.count === 'number') {
        return response.data.count;
      }
      
      return 0;
    } catch (error) {
      console.error('Fehler beim Abrufen der ungelesenen Benachrichtigungen:', error);
      return 0;
    }
  },
  
  // Benachrichtigung als gelesen markieren
  markAsRead: async (id: number) => {
    try {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data;
    } catch (error) {
      console.error(`Fehler beim Markieren der Benachrichtigung ${id} als gelesen:`, error);
      throw error;
    }
  },
  
  // Alle Benachrichtigungen als gelesen markieren
  markAllAsRead: async () => {
    try {
      const response = await apiClient.patch(`/notifications/read-all`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Markieren aller Benachrichtigungen als gelesen:', error);
      throw error;
    }
  },
  
  // Benachrichtigung löschen
  deleteNotification: async (id: number) => {
    try {
      const response = await apiClient.delete(`/notifications/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Fehler beim Löschen der Benachrichtigung ${id}:`, error);
      throw error;
    }
  },
  
  // Alle Benachrichtigungen löschen
  deleteAllNotifications: async () => {
    try {
      const response = await apiClient.delete(`/notifications`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
      throw error;
    }
  }
};

// API-Funktionen für Benachrichtigungseinstellungen
export const notificationSettingsApi = {
  // System-weite Benachrichtigungseinstellungen abrufen
  getSystemSettings: async () => {
    try {
      console.log('Rufe System-Einstellungen ab...');
      const response = await apiClient.get(`/settings/notifications`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der System-Einstellungen:', error);
      throw error;
    }
  },
  
  // System-weite Benachrichtigungseinstellungen aktualisieren
  updateSystemSettings: async (settings: NotificationSettings) => {
    try {
      const response = await apiClient.put(`/settings/notifications`, settings);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der System-Einstellungen:', error);
      throw error;
    }
  },
  
  // Benutzer-spezifische Benachrichtigungseinstellungen abrufen
  getUserSettings: async () => {
    try {
      console.log('Rufe Benutzer-Einstellungen ab...');
      const response = await apiClient.get(`/settings/notifications/user`);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Abrufen der Benutzer-Einstellungen:', error);
      throw error;
    }
  },
  
  // Benutzer-spezifische Benachrichtigungseinstellungen aktualisieren
  updateUserSettings: async (settings: Partial<NotificationSettings>) => {
    try {
      const response = await apiClient.put(`/settings/notifications/user`, settings);
      return response.data;
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Benutzer-Einstellungen:', error);
      throw error;
    }
  }
}; 