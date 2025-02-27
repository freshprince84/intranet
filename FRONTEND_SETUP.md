# Frontend-Setup

## 1. Erstelle `src/components/Sidebar.js`:
```jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth'; // Hypothetischer Hook für Auth

const Sidebar = () => {
    const { user, permissions } = useAuth();

    const menuItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Worktracker', path: '/worktracker' },
        { name: 'Reports', path: '/reports' },
        { name: 'Settings', path: '/settings' }
    ].filter(item => 
        permissions[item.name.toLowerCase()] !== 'none'
    );

    return (
        <div className="w-64 h-screen bg-gray-800 text-white">
            <ul>
                {menuItems.map(item => (
                    <li key={item.name}><a href={item.path}>{item.name}</a></li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;
```

## 2. Erstelle src/pages/Dashboard.js:
```jsx
import React from 'react';

const Dashboard = () => {
    const tasks = [
        { id: 1, title: 'Beispiel Task', status: 'open', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-02' },
        { id: 2, title: 'Testaufgabe', status: 'in_progress', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-03' }
    ];

    const requests = [
        { id: 1, title: 'Beispiel Request', status: 'approval', requestedBy: 'Pat', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-02' },
        { id: 2, title: 'Testanfrage', status: 'approved', requestedBy: 'Pat', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-03' }
    ];

    return (
        <div className="p-4">
            <h1 className="text-2xl mb-4">Dashboard</h1>
            
            <h2 className="text-xl mb-2">Tasks</h2>
            <table className="w-full border-collapse mb-8">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border p-2">Titel</th>
                        <th className="border p-2">Status</th>
                        <th className="border p-2">Verantwortlicher</th>
                        <th className="border p-2">Niederlassung</th>
                        <th className="border p-2">Fälligkeit</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => (
                        <tr key={task.id}>
                            <td className="border p-2">{task.title}</td>
                            <td className="border p-2">{task.status}</td>
                            <td className="border p-2">{task.responsible}</td>
                            <td className="border p-2">{task.branch}</td>
                            <td className="border p-2">{task.dueDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h2 className="text-xl mb-2">Requests</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border p-2">Titel</th>
                        <th className="border p-2">Status</th>
                        <th className="border p-2">Angefragt von</th>
                        <th className="border p-2">Verantwortlicher</th>
                        <th className="border p-2">Niederlassung</th>
                        <th className="border p-2">Fälligkeit</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(request => (
                        <tr key={request.id}>
                            <td className="border p-2">{request.title}</td>
                            <td className="border p-2">{request.status}</td>
                            <td className="border p-2">{request.requestedBy}</td>
                            <td className="border p-2">{request.responsible}</td>
                            <td className="border p-2">{request.branch}</td>
                            <td className="border p-2">{request.dueDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Dashboard;
```

## 3. Passe src/App.js an:
```jsx
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

function App() {
    return (
        <Router>
            <div className="flex">
                <Sidebar />
                <div className="flex-1 p-4">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
```

## 4. Erstelle src/hooks/useAuth.js (hypothetisch):
```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({});

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get('/api/auth/user');
                setUser(response.data.user);
                setPermissions(response.data.permissions);
            } catch (error) {
                console.error('Auth-Fehler:', error);
            }
        };
        fetchUser();
    }, []);

    return { user, permissions };
};
```

## 5. Benachrichtigungssystem im Frontend

Das Benachrichtigungssystem ist eine wichtige Komponente, die verschiedene Teile der Anwendung miteinander verbindet. Hier ist die Implementierung:

### 5.1. API-Integration

Erstelle `src/api/notificationApi.ts`:

```typescript
import apiClient from './apiClient.ts';

// Typen für Benachrichtigungen
export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'task' | 'request' | 'user' | 'role' | 'worktime' | 'system';
  read: boolean;
  relatedEntityId?: number;
  relatedEntityType?: string;
  createdAt: string;
  updatedAt: string;
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

// API-Funktionen für Benachrichtigungen
export const notificationApi = {
  // Benachrichtigungen abrufen mit robuster Fehlerbehandlung
  getNotifications: async (page = 1, limit = 10) => {
    try {
      const response = await apiClient.get(`/notifications?page=${page}&limit=${limit}`);
      
      // Robuste Datenverarbeitung - stellen Sie sicher, dass ein Array zurückgegeben wird
      return {
        data: Array.isArray(response.data) ? response.data : 
              (response.data?.notifications || []),
        total: response.data?.pagination?.total || 0,
        page: response.data?.pagination?.page || page,
        limit: response.data?.pagination?.limit || limit,
        pages: response.data?.pagination?.pages || 1
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
      // Immer sicherstellen, dass ein konsistentes Datenformat zurückgegeben wird
      return { data: [], total: 0, page, limit, pages: 1 };
    }
  },
  
  // Ungelesene Benachrichtigungen zählen
  getUnreadCount: async () => {
    try {
      const response = await apiClient.get('/notifications/unread/count');
      return { count: response.data?.count || 0 };
    } catch (error) {
      console.error('Fehler beim Abrufen der ungelesenen Benachrichtigungen:', error);
      return { count: 0 };
    }
  },
  
  // Als gelesen markieren
  markAsRead: async (id: number) => {
    try {
      await apiClient.put(`/notifications/${id}/read`);
      return { success: true };
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen:', error);
      return { success: false };
    }
  },
  
  // Alle als gelesen markieren
  markAllAsRead: async () => {
    try {
      await apiClient.put('/notifications/read-all');
      return { success: true };
    } catch (error) {
      console.error('Fehler beim Markieren aller als gelesen:', error);
      return { success: false };
    }
  }
  
  // Weitere API-Methoden...
};
```

### 5.2. Notification-Komponenten

Die wichtigsten Komponenten für Benachrichtigungen sind:

#### NotificationSettings

Diese Komponente ermöglicht die Verwaltung der Benachrichtigungseinstellungen mit folgenden Funktionen:

- **Globale Steuerung**:
  - Ein Hauptschalter zum Ein-/Ausschalten aller Benachrichtigungen
  - Sofortige Speicherung bei Änderungen
  - Optimistische Updates mit Fehlerbehandlung

- **Kategorien**:
  - Aufgaben
  - Anfragen
  - Benutzerverwaltung
  - Rollen
  - Arbeitszeit

- **Pro Kategorie**:
  - Ein "Alle" Toggle zum Ein-/Ausschalten aller Einstellungen der Kategorie
  - Einzelne Toggles für spezifische Ereignisse (erstellen, aktualisieren, löschen, etc.)
  - Automatische Aktualisierung des Kategorie-Toggles basierend auf Untereinstellungen

- **Benutzerfreundlichkeit**:
  - Direkte Speicherung ohne separaten Speichern-Button
  - Deaktivierung der Schalter während des Speichervorgangs
  - Fehlerrückmeldung bei fehlgeschlagenen Aktualisierungen
  - Automatischer Rollback bei Fehlern

```typescript
// Beispiel für die Verwendung der NotificationSettings-Komponente
import NotificationSettings from '@/components/NotificationSettings';

const SettingsPage = () => {
  return (
    <div>
      <NotificationSettings />
    </div>
  );
};
```

#### NotificationBell

Diese Komponente zeigt einen Glocken-Button in der Navigationsleiste mit der Anzahl ungelesener Benachrichtigungen.

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Badge, 
  IconButton, 
  Popover, 
  List, 
  ListItem, 
  ListItemText, 
  Typography, 
  Box, 
  Button, 
  Divider, 
  CircularProgress
} from '@mui/material';
import { 
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { Notification, notificationApi } from '../api/notificationApi.ts';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  
  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Versuche, ungelesene Benachrichtigungen zu zählen...');
      const response = await notificationApi.getUnreadCount();
      console.log('Antwort vom Server:', response);
      setUnreadCount(response.count);
      setError(null);
    } catch (error) {
      console.error('Fehler beim Laden der ungelesenen Nachrichten:', error);
      // Bei Fehler setzen wir die Anzahl auf 0, zeigen aber keinen sichtbaren Fehler an
      setUnreadCount(0);
      // Kein setError hier, da wir keinen sichtbaren Fehler anzeigen wollen
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const response = await notificationApi.getNotifications(1, 5);
      // Sicherstellen, dass immer ein Array verwendet wird
      setNotifications(Array.isArray(response.data) ? response.data : 
                      (response.data?.notifications || []));
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden der Benachrichtigungen:', err);
      setError('Fehler beim Laden der Benachrichtigungen');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [open]);

  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
      fetchUnreadCount();
    } catch (err) {
      console.error('Fehler beim Markieren als gelesen:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Fehler beim Markieren aller als gelesen:', err);
    }
  };

  const getRouteForNotificationType = (notification: Notification) => {
    switch (notification.type) {
      case 'task':
        return '/tasks';
      case 'request':
        return '/requests';
      case 'user':
        return '/users';
      case 'role':
        return '/roles';
      case 'worktime':
        return '/worktime';
      default:
        return '/';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    const route = getRouteForNotificationType(notification);
    navigate(route);
    
    setAnchorEl(null);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 60000);
    
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchRecentNotifications();
    }
  }, [open, fetchRecentNotifications]);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: de
      });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  return (
    <>
      <IconButton 
        color="inherit" 
        aria-describedby={id}
        onClick={handleClick}
        aria-label="notifications"
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ mt: 1 }}
      >
        <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto', pt: 1 }}>
          <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Benachrichtigungen
            </Typography>
            
            {unreadCount > 0 && (
              <Button 
                size="small" 
                onClick={markAllAsRead}
                sx={{ fontSize: '0.75rem' }}
              >
                Alle als gelesen markieren
              </Button>
            )}
          </Box>
          
          <Divider />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Keine Benachrichtigungen vorhanden
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((notification) => (
                <React.Fragment key={notification.id}>
                  <ListItem
                    sx={{ 
                      px: 2, 
                      py: 1,
                      bgcolor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: notification.read ? 'rgba(0, 0, 0, 0.04)' : 'rgba(25, 118, 210, 0.12)',
                      }
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemText
                      primary={notification.title}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" component="div" color="text.secondary">
                            {new Date(notification.createdAt).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Box sx={{ p: 1, textAlign: 'center' }}>
            <Button 
              size="small" 
              onClick={() => {
                navigate('/notifications');
                handleClose();
              }}
              fullWidth
            >
              Alle Benachrichtigungen anzeigen
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell;
```

### 5.3. Wichtige Best Practices

1. **Defensive Programmierung bei API-Antworten**:
   - Immer prüfen, ob Daten existieren, bevor auf sie zugegriffen wird
   - Fallback-Werte für alle Eigenschaften bereitstellen
   - Array-Prüfungen durchführen, bevor auf `.length` oder andere Array-Methoden zugegriffen wird

2. **Konsistente Feldnamen**:
   - Frontend-Interfaces müssen mit Backend-Modellen übereinstimmen
   - Bei Änderungen im Prisma-Schema müssen alle betroffenen Frontend-Interfaces aktualisiert werden

3. **Fehlerbehandlung**:
   - API-Funktionen sollten niemals undefinierte oder null-Werte zurückgeben
   - Bei Fehlern immer leere, aber gültige Datenstrukturen zurückgeben (leeres Array statt null)

4. **Typsicherheit**:
   - TypeScript-Interfaces für alle Backend-Datenstrukturen definieren
   - Union-Types für Enumerationen verwenden, die mit Backend-Enumerationen übereinstimmen
