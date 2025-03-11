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
interface NotificationSettings {
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
  worktimeAutoStop: boolean;
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

## Box-Standards

### System-Boxen
Die folgenden Boxen sind offiziell im System definiert:

1. Dashboard/Arbeitszeitstatistik Box
   - Zeigt Wochenstatistiken der Arbeitszeit als interaktives Diagramm
   - Beim Klick auf einen Balken öffnet sich ein Modal mit den detaillierten Zeiteinträgen des Tages
   - Exportfunktion für Arbeitszeitdaten als Excel-Datei
   - Farbliche Unterscheidung zwischen Zeiten unter (blau) und über (rot) der Sollarbeitszeit
   - Statistikboxen (Gesamtstunden, Durchschnitt/Tag, Arbeitstage) haben zentrierte Titel und Werte
2. Dashboard/Requests Box
3. Worktracker/Zeiterfassung Box
4. Worktracker/To Do's
5. Settings Box
6. UserManagement Box
7. Login Box
8. Register Box
9. Profile Box
10. NotificationList Box

### Box-Header Standard
Jede Box muss einen standardisierten Header haben:
```jsx
<div className="flex items-center mb-6">
  <Icon className="h-6 w-6 text-gray-900 mr-2" />
  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Titel der Box</h2>
</div>
```

### Box-Breitentypen
Es gibt drei definierte Breitentypen für Boxen:

1. **Breit (Wide)**
   - Volle Container-Breite
   - Verwendet für:
     - Dashboard/Arbeitszeitstatistik Box
     - Dashboard/Requests Box
     - Worktracker/Zeiterfassung Box
     - Worktracker/To Do's Box
     - UserManagement Box

2. **Normal**
   - Standard-Breite für die meisten Boxen
   - Verwendet für:
     - Settings Box
     - Login Box
     - Register Box
     - Profile Box

3. **Klein (Small)**
   - Reduzierte Breite für kompakte Darstellung
   - Verwendet für:
     - NotificationList Box

### Box-Styling
Alle Boxen folgen diesem Basis-Styling:
```jsx
<div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800">
  {/* Box-Inhalt */}
</div>
```

Zusätzliche Klassen je nach Breitentyp:
- Breit: `w-full`
- Normal: `max-w-3xl`
- Klein: `max-w-xl`

### Tabellen in Boxen
Alle Tabellen in Boxen müssen folgende Funktionalitäten bieten:

1. **Sortierung**
   - Jede Tabellenspalte muss sortierbar sein (aufsteigend und absteigend)
   - Sortierungspfeile (↑/↓) zeigen die aktuelle Sortierrichtung an
   - Implementierung durch `handleSort`-Funktion und SortConfig-State
   - Beispiel für sortierbare Tabellenspalte:
   ```jsx
   <th 
     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
     onClick={() => handleSort('title')}
   >
     Titel {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
   </th>
   ```

2. **Filterung**
   - Alle Tabellen müssen Suchfunktion und Status-Filter bieten
   - Implementierung durch `searchTerm`- und `statusFilter`-States
   - Filter müssen sowohl als Einzelfilter als auch kombiniert funktionieren

3. **Responsive Design**
   - Tabellen müssen horizontales Scrollen auf kleinen Bildschirmen ermöglichen
   - Container mit `overflow-x-auto` und `overflow-y-hidden` umgeben
   - Minimalbreite mit `min-w-full` sicherstellen

## useAuth-Hook

Der `useAuth`-Hook stellt die Authentifizierungs- und Autorisierungsfunktionen bereit:

```javascript
import { createContext, useContext, useState } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState({});

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setPermissions(response.data.permissions);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPermissions({});
  };

  // Erweiterte Berechtigungsprüfung für Seiten und Tabellen
  const hasPermission = (entity, accessLevel, entityType = 'page') => {
    const permission = permissions.find(
      p => p.entity === entity && p.entityType === entityType
    );
    
    if (!permission) return false;
    
    if (permission.accessLevel === 'both') return true;
    return permission.accessLevel === accessLevel;
  };

  return { user, permissions, login, logout, hasPermission };
};

export const useAuth = () => useContext(AuthContext);
```

## Verwendung von Berechtigungen

### In UI-Komponenten

```jsx
import { useAuth } from '../hooks/useAuth';

const DashboardPage = () => {
  const { hasPermission } = useAuth();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {/* Seitenberechtigungen prüfen */}
      {hasPermission('tasks', 'read') && (
        <TaskList />
      )}
      
      {/* Tabellenberechtigungen prüfen */}
      {hasPermission('tasks', 'write', 'table') && (
        <button>Neue Aufgabe erstellen</button>
      )}
    </div>
  );
};
```

### In Routing-Guards

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ element, entity, requiredAccess = 'read', entityType = 'page' }) => {
  const { user, hasPermission } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!hasPermission(entity, requiredAccess, entityType)) {
    return <Navigate to="/unauthorized" />;
  }
  
  return element;
};

// Verwendung im Router
<Route 
  path="/tasks" 
  element={
    <ProtectedRoute 
      element={<TasksPage />} 
      entity="tasks" 
      requiredAccess="read" 
    />
  } 
/>
```

## Button-Standards

Die Anwendung verwendet konsistente Button-Stile für verschiedene Aktionstypen. Hier sind die standardisierten Button-Typen und ihre Verwendung:

### 1. Icon-Buttons

#### Primäre Aktion-Buttons (Neu erstellen)
- **Stil:** Rundes Icon mit weißem Hintergrund und blauem Symbol
- **Größe:** Immer einheitlich mit 30.19px x 30.19px 
- **Klassen:** `bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center`
- **Style:** `style={{ width: '30.19px', height: '30.19px' }}`
- **Icon-Größe:** `h-5 w-5` für den PlusIcon (bei größeren Listen), `h-4 w-4` für kleinere Listenansichten
- **Verwendung:** Konsistent in allen Listen- und Übersichtsansichten, wo neue Elemente erstellt werden können
- **Positionierung:** Immer links oben über der Liste oder im Filterbereich
- **Beispiel:**

```jsx
<button
  onClick={() => setIsCreateModalOpen(true)}
  className="bg-white text-blue-600 p-1.5 rounded-full hover:bg-blue-50 border border-blue-200 shadow-sm flex items-center justify-center"
  style={{ width: '30.19px', height: '30.19px' }}
  title="Neues Element erstellen"
  aria-label="Neues Element erstellen"
>
  <PlusIcon className="h-5 w-5" />
</button>
```

#### Bearbeitungs-Buttons
- **Stil:** Nur Icon ohne Hintergrund
- **Klassen:** `text-blue-600 hover:text-blue-900`
- **Verwendung:** Buttons zum Bearbeiten von Elementen
- **Beispiel:**
  ```jsx
  <button 
    onClick={handleEditAction} 
    className="text-blue-600 hover:text-blue-900"
  >
    <PencilIcon className="h-5 w-5" />
  </button>
  ```

#### Lösch-Buttons
- **Stil:** Runder Button mit rotem Hintergrund und weißem Icon
- **Klassen:** `p-1 bg-red-600 text-white rounded hover:bg-red-700`
- **Verwendung:** Buttons zum Löschen von Elementen
- **Beispiel:**
  ```jsx
  <button 
    onClick={handleDeleteAction}
    className="p-1 bg-red-600 text-white rounded hover:bg-red-700" 
    title="Löschen"
  >
    <TrashIcon className="h-5 w-5" />
  </button>
  ```

#### Status-Change-Buttons
- **Stil:** Gefüllt, abgerundet
- **Klassen:** `p-1 bg-[color]-600 text-white rounded hover:bg-[color]-700`
- **Verwendung:** Buttons zum Ändern des Status, Farbe basierend auf Aktion (grün=Bestätigen, rot=Abbrechen, etc.)
- **Beispiel:**
  ```jsx
  <button
    onClick={handleStatusChange}
    className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
    title="Status-Beschreibung"
  >
    <CheckIcon className="h-5 w-5" />
  </button>
  ```

### 2. Text-Buttons

#### Primäre Aktions-Buttons
- **Stil:** Gefüllt, abgerundet
- **Klassen:** `px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none`
- **Verwendung:** Hauptaktionen in Formularen (z.B. Speichern, Erstellen)
- **Beispiel:**
  ```jsx
  <button
    type="submit"
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none"
  >
    Speichern
  </button>
  ```

#### Sekundäre Aktions-Buttons
- **Stil:** Grau, abgerundet
- **Klassen:** `px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none`
- **Verwendung:** Sekundäre Aktionen (z.B. Abbrechen)
- **Beispiel:**
  ```jsx
  <button
    type="button"
    onClick={handleCancel}
    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
  >
    Abbrechen
  </button>
  ```

### Barrierefreiheit

Alle Buttons müssen die folgenden Barrierefreiheits-Attribute haben:
- `title` für Tooltips
- `aria-label` für Screenreader, wenn keine Beschriftung vorhanden ist
- `focus:outline-none focus:ring-2 focus:ring-[color]-500 focus:ring-offset-2` für sichtbaren Fokusindikator

### Größen und Abstände
- **Icon-Größe:** `h-4 w-4` für kleinere Icons, `h-5 w-5` für Standard-Icons
- **Padding:**
  - Icon-Buttons: `p-1` oder `p-1.5`
  - Text-Buttons: `px-4 py-2` für normale Größe

## 7. Responsive Navigation

Die Anwendung verwendet ein responsives Navigationskonzept, das sich an die Bildschirmgröße anpasst:

### 7.1. Desktop-Navigation

Auf Desktop-Geräten (Bildschirmbreite >= 768px) wird eine klassische Seitenleiste verwendet:

- Positioniert am linken Rand der Anwendung
- Kann ein- und ausgeklappt werden (über Button oder Benutzereinstellungen)
- Zeigt alle verfügbaren Menüpunkte je nach Benutzerberechtigungen an
- Einstellungen-Menüpunkt wird am unteren Rand der Sidebar angezeigt

### 7.2. Mobile-Navigation

Auf mobilen Geräten (Bildschirmbreite < 768px) wird die Seitenleiste zu einem Footer-Menü:

- Fixiert am unteren Bildschirmrand
- Zeigt Icon und Text für jeden Menüpunkt in einer horizontalen Anordnung
- Menüpunkte werden als Icons mit Text darunter angezeigt
- Aktive Menüpunkte werden farblich hervorgehoben (blau)

### 7.3. Implementierung

Die Umschaltung zwischen Desktop- und Mobile-Navigation erfolgt automatisch durch Media Queries und React-State:

```tsx
// Erkennung der Bildschirmgröße in der Sidebar-Komponente
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
}, []);
```

Das Layout passt automatisch den Inhaltsbereich an, um Platz für die jeweilige Navigationsart zu schaffen:

```tsx
// Anpassung des Layouts für Mobile-Navigation
<div className={`flex h-[calc(100vh-4rem)] ${isMobile ? 'pb-16' : ''}`}>
    <Sidebar />
    <main className="flex-1 overflow-auto p-6">
        <Outlet />
    </main>
</div>
```

## 8. Notification-System

Das System verwendet die zentrale Funktion `createNotificationIfEnabled` für alle Benachrichtigungen. Diese Funktion berücksichtigt die Benutzer- und Systemeinstellungen und sendet Benachrichtigungen nur, wenn sie aktiviert sind.

### 8.1 Implementierte Notification-Trigger

1. **Task-Trigger**:
   - `taskCreate`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein neuer Task erstellt wird
   - `taskUpdate`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein Task aktualisiert wird
   - `taskDelete`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein Task gelöscht wird
   - `taskStatusChange`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn sich der Status eines Tasks ändert

2. **Request-Trigger**:
   - `requestCreate`: Benachrichtigt den Verantwortlichen, wenn ein neuer Request erstellt wird
   - `requestUpdate`: Benachrichtigt den Verantwortlichen und den Ersteller, wenn ein Request aktualisiert wird
   - `requestDelete`: Benachrichtigt den Verantwortlichen und den Ersteller, wenn ein Request gelöscht wird
   - `requestStatusChange`: Benachrichtigt den Ersteller, wenn sich der Status eines Requests ändert, mit spezifischen Nachrichten für verschiedene Status (approved, denied, to_improve)

3. **User-Trigger**:
   - `userCreate`: Benachrichtigt Administratoren, wenn ein neuer Benutzer erstellt wird
   - `userUpdate`: Benachrichtigt den aktualisierten Benutzer und Administratoren, wenn ein Benutzer aktualisiert wird
   - `userDelete`: Benachrichtigt Administratoren, wenn ein Benutzer gelöscht wird
   - `userRoleUpdate`: Benachrichtigt den betroffenen Benutzer und Administratoren, wenn die Rollen eines Benutzers aktualisiert werden

4. **Role-Trigger**:
   - `roleCreate`: Benachrichtigt Administratoren, wenn eine neue Rolle erstellt wird
   - `roleUpdate`: Benachrichtigt Administratoren und Benutzer mit dieser Rolle, wenn eine Rolle aktualisiert wird
   - `roleDelete`: Benachrichtigt Administratoren und Benutzer mit dieser Rolle, wenn eine Rolle gelöscht wird

5. **Worktime-Trigger**:
   - `worktimeStart`: Benachrichtigt den Benutzer, wenn die Zeiterfassung gestartet wird
   - `worktimeStop`: Benachrichtigt den Benutzer, wenn die Zeiterfassung beendet wird
   - `worktimeAutoStop`: Benachrichtigt den Benutzer, wenn die Zeiterfassung automatisch beendet wird, weil die tägliche Arbeitszeit erreicht wurde

## 8.2. Zeitzonenbehandlung in der Zeiterfassung

Die Zeiterfassung berücksichtigt die lokale Systemzeit des Benutzers ohne Zeitzonenumrechnung:

### 8.2.1. Datenspeicherung und -anzeige

- **Speicherung**: Zeiten werden immer in der lokalen Systemzeit des Benutzers in der Datenbank gespeichert
- **Zeitzonenfeld**: Die aktuelle Zeitzone des Benutzers wird im `timezone`-Feld gespeichert (z.B. "America/Bogota")
- **Anzeige**: Datumsangaben werden ohne Zeitzonenumrechnung angezeigt

### 8.2.2. Frontend-Zeitzonenkorrektur

Bei der Erstellung neuer Zeiterfassungen wird die lokale Zeit korrekt an den Server gesendet:

```javascript
// Zeitzonenkorrektur beim Senden von Zeitstempeln
const correctedTime = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
```

### 8.2.3. Formatierung von Datumsangaben

Die Formatierung lokaler Zeiten:

```javascript
// Formatierung ohne UTC-Konvertierung
const formatLocalDate = (dateString) => {
  if (typeof dateString === 'string' && dateString.endsWith('Z')) {
    dateString = dateString.substring(0, dateString.length - 1);
  }
  
  const date = new Date(dateString);
  
  // Lokale Komponenten verwenden statt UTC
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}.${month}.${year}, ${hours}:${minutes}`;
};
```

## 8.3. Tabellenstandards

Alle Tabellen im Frontend müssen den folgenden Standards entsprechen, um eine einheitliche Benutzerfreundlichkeit und Konsistenz in der gesamten Anwendung zu gewährleisten:

### 8.2.1. Drag & Drop für Spaltenreihenfolge

Jede Tabelle muss Drag & Drop für die Neuanordnung von Spalten unterstützen:

- **Implementierung:** Die Spaltenüberschriften müssen das `draggable`-Attribut haben und die entsprechenden Event-Handler.
- **Speicherung:** Die Spaltenreihenfolge wird pro Benutzer und Tabelle in der Datenbank gespeichert.
- **Technische Umsetzung:** Verwendung des `useTableSettings`-Hooks, der die Spaltenreihenfolge verwaltet.

```jsx
// Beispiel für drag & drop in Spaltenüberschriften
<th 
  draggable
  onDragStart={() => handleDragStart(columnId)}
  onDragOver={(e) => handleDragOver(e, columnId)}
  onDrop={(e) => handleDrop(e, columnId)}
  onDragEnd={handleDragEnd}
  className="cursor-move"
>
  <div className="flex items-center">
    <ArrowsUpDownIcon className="h-3 w-3 mr-1 text-gray-400" />
    {column.label}
  </div>
</th>
```

### 8.2.2. Sortierbarkeit

Tabellen müssen das Sortieren nach allen relevanten Spalten unterstützen:

- **Implementierung:** Ein Klick auf eine sortierbare Spaltenüberschrift ändert die Sortierreihenfolge.
- **Visuelle Anzeige:** Pfeile (↑/↓) zeigen die aktuelle Sortierrichtung an.
- **Status:** Ein SortConfig-State speichert den Schlüssel und die Richtung der Sortierung.

```jsx
// Beispiel für Sortierlogik
const handleSort = (key) => {
  setSortConfig(current => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
  }));
};

// In der Spaltenüberschrift
<th onClick={() => handleSort('columnKey')}>
  {column.label} {sortConfig.key === 'columnKey' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
</th>
```

### 8.2.3. Konfigurierbare Spaltenanzeige

Jede Tabelle muss die Möglichkeit bieten, Spalten ein- und auszublenden:

- **Implementierung:** Ein Konfigurationsbutton öffnet ein Dropdown-Menü zur Spaltenauswahl.
- **Komponente:** Die `TableColumnConfig`-Komponente sollte verwendet werden.
- **Speicherung:** Sichtbare/versteckte Spalten werden pro Benutzer in der Datenbank gespeichert.

```jsx
// Beispiel für Spaltenauswahl
<TableColumnConfig
  columns={availableColumns}
  visibleColumns={visibleColumns}
  columnOrder={columnOrder}
  onToggleColumnVisibility={toggleColumnVisibility}
  onMoveColumn={handleMoveColumn}
/>
```

### 8.2.4. Responsive Darstellung

Tabellen müssen auf allen Geräten gut dargestellt werden:

- **Horizontaler Overflow:** `overflow-x-auto` für horizontales Scrollen auf kleineren Bildschirmen.
- **Vertikaler Overflow:** Bei Bedarf `max-height` und `overflow-y-auto` für vertikales Scrollen.
- **Mobil-Optimierung:** Wichtige Spalten sollten priorisiert werden.

### 8.2.5. Standardimplementierung

Für die Implementierung dieser Standards sollten folgende Komponenten und Hooks verwendet werden:

- **useTableSettings:** Hook zum Laden und Speichern der Benutzereinstellungen für Tabellen.
- **TableColumnConfig:** Komponente für die Spaltenauswahl.
- **HTML5 Drag & Drop API:** Für das Ziehen und Ablegen von Spalten.

Dieser Standard gilt für **alle** Tabellen im Frontend, einschließlich:
- Requests-Tabelle (Dashboard)
- Tasks-Tabelle (Worktracker)
- Roles-Tabelle (Usermanagement > Roles Tab)
- Alle neu erstellten Tabellen

## 9. Interaktive Frontend-Features

- Die Arbeitszeitstatistik auf dem Dashboard erlaubt das Anklicken der Tagesbalken, um ein Modal mit detaillierten Zeiteinträgen für den jeweiligen Tag zu öffnen
- Alle Tabellen unterstützen Sortierung durch Klick auf die Spaltenüberschriften
- Interaktive Filter für Requests und Tasks
- Die Frontend-Komponenten prüfen jetzt Berechtigungen mit `hasPermission('entity', 'accessLevel', 'entityType')`

### 9.1 Responsive Design
- Die Seitenleiste wird bei kleinen Bildschirmen (< 768px) automatisch zu einem Footer-Menü
- Auf Desktop-Geräten wird die klassische Seitenleiste am linken Rand angezeigt
- Die Umschaltung erfolgt automatisch basierend auf der Bildschirmgröße
- Der Hauptinhalt wird entsprechend angepasst, um Platz für die Navigation zu schaffen
- Alle UI-Komponenten sind vollständig responsive gestaltet
- Das Layout reagiert dynamisch auf Größenänderungen ohne Neuladen der Seite

## 10. Notification-System

Das System verwendet die zentrale Funktion `createNotificationIfEnabled` für alle Benachrichtigungen. Diese Funktion berücksichtigt die Benutzer- und Systemeinstellungen und sendet Benachrichtigungen nur, wenn sie aktiviert sind.

### 10.1 Implementierte Notification-Trigger

1. **Task-Trigger**:
   - `taskCreate`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein neuer Task erstellt wird
   - `taskUpdate`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein Task aktualisiert wird
   - `taskDelete`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn ein Task gelöscht wird
   - `taskStatusChange`: Benachrichtigt den Verantwortlichen und die Qualitätskontrolle, wenn sich der Status eines Tasks ändert

2. **Request-Trigger**:
   - `requestCreate`: Benachrichtigt den Verantwortlichen, wenn ein neuer Request erstellt wird
   - `requestUpdate`: Benachrichtigt den Verantwortlichen und den Ersteller, wenn ein Request aktualisiert wird
   - `requestDelete`: Benachrichtigt den Verantwortlichen und den Ersteller, wenn ein Request gelöscht wird
   - `requestStatusChange`: Benachrichtigt den Ersteller, wenn sich der Status eines Requests ändert, mit spezifischen Nachrichten für verschiedene Status (approved, denied, to_improve)

3. **User-Trigger**:
   - `userCreate`: Benachrichtigt Administratoren, wenn ein neuer Benutzer erstellt wird
   - `userUpdate`: Benachrichtigt den aktualisierten Benutzer und Administratoren, wenn ein Benutzer aktualisiert wird
   - `userDelete`: Benachrichtigt Administratoren, wenn ein Benutzer gelöscht wird
   - `userRoleUpdate`: Benachrichtigt den betroffenen Benutzer und Administratoren, wenn die Rollen eines Benutzers aktualisiert werden

4. **Role-Trigger**:
   - `roleCreate`: Benachrichtigt Administratoren, wenn eine neue Rolle erstellt wird
   - `roleUpdate`: Benachrichtigt Administratoren und Benutzer mit dieser Rolle, wenn eine Rolle aktualisiert wird
   - `roleDelete`: Benachrichtigt Administratoren und Benutzer mit dieser Rolle, wenn eine Rolle gelöscht wird

5. **Worktime-Trigger**:
   - `worktimeStart`: Benachrichtigt den Benutzer, wenn die Zeiterfassung gestartet wird
   - `worktimeStop`: Benachrichtigt den Benutzer, wenn die Zeiterfassung beendet wird
   - `worktimeAutoStop`: Benachrichtigt den Benutzer, wenn die Zeiterfassung automatisch beendet wird, weil die tägliche Arbeitszeit erreicht wurde

## 11. Zeitzonenhandling in der Arbeitszeiterfassung

### Verwendete Komponenten
- `WorktimeTracker.tsx`: Hauptkomponente für die Zeiterfassung im Frontend
- `WorktimeList.tsx`: Komponente zur Anzeige der Zeiterfassungseinträge

### Zeitzonenbehandlung
Das System verwendet durchgängig die lokale Systemzeit des Benutzers ohne UTC-Konvertierung:

1. **Datenspeicherung und -anzeige**:
   - Startzeiten und Endzeiten werden in der lokalen Systemzeit des Benutzers gespeichert
   - Die Anzeige erfolgt ohne Zeitzonenkonvertierung, um Verwirrung zu vermeiden
   - Im WorkTime-Modell wird die Zeitzone des Benutzers gespeichert, um die korrekte Anzeige zu gewährleisten

2. **Frontend-Zeitzonenkorrektur**:
   - Bei Senden neuer Zeiterfassungen wird die Zeit direkt als lokale Zeit gesendet
   - Die Variable `localNow` wird für konsistente Zeitberechnungen bei automatischen Prozessen verwendet
   - Keine manuelle Umrechnung zwischen UTC und lokaler Zeit im Frontend notwendig

3. **Formatierung**:
   - Lokale Zeiten werden ohne UTC-Konvertierung formatiert
   - Das Feld `timezone` wird verwendet, um dem Benutzer seine aktuelle Zeitzone anzuzeigen

### Best Practices
- Immer `new Date()` für die lokale Zeit verwenden
- Bei Zeitberechnungen mit `getTime()` konsistent gleiche Zeitstempel verwenden
- Keine manuelle UTC-Konvertierung implementieren
- Bei automatischen Prozessen (wie dem automatischen Stoppen) die lokale Systemzeit des Benutzers berücksichtigen

## 12. Table Column Configuration

Das Frontend verwendet ein System für benutzerdefinierte Tabellenkonfigurationen, das es Benutzern ermöglicht, die Anzeige von Tabellen nach ihren Präferenzen anzupassen.

### UserTableSettings

Im Backend werden die Benutzereinstellungen für Tabellen in der `UserTableSettings`-Tabelle gespeichert:

```
model UserTableSettings {
  id           Int      @id @default(autoincrement())
  userId       Int
  tableId      String   // Identifier für die Tabelle (z.B. "worktracker_tasks", "requests")
  columnOrder  String   // JSON-String mit der Reihenfolge der Spalten
  hiddenColumns String   // JSON-String mit versteckten Spalten
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id])

  @@unique([userId, tableId])
}
```

Die wichtigsten Felder sind:
- `tableId`: Ein eindeutiger Bezeichner für die Tabelle (z.B. "worktracker_tasks")
- `columnOrder`: Ein JSON-String, der die Reihenfolge der Spalten speichert
- `hiddenColumns`: Ein JSON-String, der die IDs der ausgeblendeten Spalten speichert

### TableColumnConfig Komponente

Die `TableColumnConfig`-Komponente ermöglicht es Benutzern, die Sichtbarkeit und Reihenfolge von Tabellenspalten zu konfigurieren:

```tsx
<TableColumnConfig
  columns={availableColumns}
  visibleColumns={visibleColumnIds}
  columnOrder={settings.columnOrder}
  onToggleColumnVisibility={handleToggleColumnVisibility}
  onMoveColumn={handleMoveColumn}
/>
```

### Integration mit useTableSettings Hook

Der `useTableSettings`-Hook verbindet die `TableColumnConfig`-Komponente mit dem Backend:

```tsx
const { 
  settings, 
  visibleColumnIds, 
  handleToggleColumnVisibility, 
  handleMoveColumn 
} = useTableSettings('worktracker_tasks', availableColumns.map(col => col.id));
```

### Wichtige Hinweise:

1. **tableId Format**: Die `tableId` sollte einen einheitlichen Benennungsstil haben, vorzugsweise `[page]_[entity]`, wie z.B. `worktracker_tasks`.

2. **Standard-Einstellungen**: Für jeden Benutzer werden automatisch Standard-Einstellungen erstellt, wenn keine vorhanden sind. Diese sollten in der Seed-Datei für den Admin-Benutzer definiert werden.

3. **Spaltenbezeichnungen**: Bei der Definition der `availableColumns` muss darauf geachtet werden, dass die Bezeichnungen (`id`) konsistent verwendet werden, da diese als Schlüssel für die Benutzereinstellungen dienen.

4. **Zusammengesetzte Spalten**: Wenn Spalten zusammengefasst werden (z.B. "Verantwortlich / Qualitätskontrolle"), sollte eine neue Spalten-ID erstellt werden (z.B. `responsibleAndQualityControl`) und die alten Spalten entfernt werden.

### Beispiel für Worktracker:

```tsx
// Definiere die verfügbaren Spalten für die Tabelle
const availableColumns = [
    { id: 'title', label: 'Titel' },
    { id: 'status', label: 'Status' },
    { id: 'responsibleAndQualityControl', label: 'Verantwortlich / Qualitätskontrolle' },
    { id: 'branch', label: 'Niederlassung' },
    { id: 'dueDate', label: 'Fälligkeitsdatum' },
    { id: 'actions', label: 'Aktionen' },
];
```