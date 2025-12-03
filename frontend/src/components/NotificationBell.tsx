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
  CircularProgress,
  useTheme
} from '@mui/material';
import { BellIcon } from '@heroicons/react/24/outline';
import { Notification, notificationApi } from '../api/notificationApi.ts';
import { formatDistanceToNow } from 'date-fns';
import { de, es, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage.ts';

const NotificationBell: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { activeLanguage } = useLanguage();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Dynamisches Locale basierend auf aktueller Sprache
  const dateLocale = React.useMemo(() => {
    const lang = activeLanguage || i18n.language || 'de';
    switch (lang) {
      case 'es': return es;
      case 'en': return enUS;
      default: return de;
    }
  }, [activeLanguage, i18n.language]);
  
  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    try {
      if (process.env.NODE_ENV === 'development') {
      console.log('Versuche, ungelesene Benachrichtigungen zu zählen...');
      }
      const response = await notificationApi.getUnreadCount();
      if (process.env.NODE_ENV === 'development') {
      console.log('Antwort vom Server für ungelesene Benachrichtigungen:', response);
      }
      
      // Prüfe verschiedene mögliche Antwortformate
      let count = 0;
      if (typeof response === 'number') {
        count = response;
      } else if (response?.count && typeof response.count === 'number') {
        count = response.count;
      } else if (response?.data?.count && typeof response.data.count === 'number') {
        count = response.data.count;
      }
      
      if (process.env.NODE_ENV === 'development') {
      console.log('Setze ungelesene Benachrichtigungen auf:', count);
      }
      setUnreadCount(count);
      setError(null);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      console.error('Fehler beim Laden der ungelesenen Nachrichten:', error);
      }
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    if (!open) return;
    
    setLoading(true);
    try {
      const response = await notificationApi.getNotifications(1, 5);
      if (process.env.NODE_ENV === 'development') {
      console.log('Benachrichtigungen Response:', response);
      }
      
      // Prüfe verschiedene mögliche Antwortformate
      let notifications = [];
      if (Array.isArray(response)) {
        notifications = response;
      } else if (response?.data && Array.isArray(response.data)) {
        notifications = response.data;
      } else if (response?.notifications && Array.isArray(response.notifications)) {
        notifications = response.notifications;
      }
      
      if (process.env.NODE_ENV === 'development') {
      console.log('Verarbeitete Benachrichtigungen:', notifications);
      }
      setNotifications(notifications);
      setError(null);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
      console.error('Fehler beim Laden der Benachrichtigungen:', err);
      }
      setError(t('notifications.loadError'));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [open, t]);

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
      if (process.env.NODE_ENV === 'development') {
      console.error('Fehler beim Markieren als gelesen:', err);
      }
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
      if (process.env.NODE_ENV === 'development') {
      console.error('Fehler beim Markieren aller als gelesen:', err);
      }
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
    
    // ✅ MEMORY: Polling nur wenn Seite sichtbar ist (Page Visibility API)
    let interval: ReturnType<typeof setInterval> | null = null;
    
    const startPolling = () => {
      if (interval) return; // Bereits gestartet
      interval = setInterval(() => {
        // Prüfe nochmal, ob Seite sichtbar ist
        if (!document.hidden) {
          fetchUnreadCount();
        }
      }, 60000);
    };
    
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    
    // Starte Polling wenn Seite sichtbar ist
    if (!document.hidden) {
      startPolling();
    }
    
    // Event-Listener für Page Visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        // Seite ist wieder sichtbar - sofort prüfen und Polling starten
        fetchUnreadCount();
        startPolling();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (open) {
      fetchRecentNotifications();
    }
  }, [open, fetchRecentNotifications]);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: dateLocale
      });
    } catch (error) {
      return t('notifications.invalidDate');
    }
  };

  return (
    <>
      <IconButton 
        color="inherit" 
        aria-describedby={id}
        onClick={handleClick}
        aria-label={t('notifications.ariaLabel')}
        sx={{ mr: 1 }}
        className="dark:text-gray-200"
      >
        <Badge badgeContent={unreadCount} color="error">
          <BellIcon className="h-6 w-6" />
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
        <Box sx={{ width: 320, maxHeight: 400, overflow: 'auto', pt: 1 }} className="dark:bg-gray-800">
          <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="dark:bg-gray-800">
            <Typography variant="subtitle1" fontWeight="bold" className="dark:text-white">
              {t('notifications.title')}
            </Typography>
            
            {unreadCount > 0 && (
              <Button 
                size="small" 
                onClick={markAllAsRead}
                sx={{ fontSize: '0.9rem' }}
                className="dark:text-blue-400"
              >
                {t('notifications.markAllAsRead')}
              </Button>
            )}
          </Box>
          
          <Divider className="dark:border-gray-700" />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }} className="dark:bg-gray-800">
              <CircularProgress size={24} className="dark:text-blue-400" />
            </Box>
          ) : error ? (
            <Box sx={{ p: 2, textAlign: 'center' }} className="dark:bg-gray-800">
              <Typography color="error">{error}</Typography>
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 2, textAlign: 'center' }} className="dark:bg-gray-800">
              <Typography variant="body2" color="text.secondary" className="dark:text-gray-400">
                {t('notifications.noNotifications')}
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }} className="dark:bg-gray-800">
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
                    className={`dark:hover:bg-gray-700 ${notification.read ? 'dark:bg-gray-800' : 'dark:bg-gray-700'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <ListItemText
                      primary={<span className="dark:text-white">{notification.title}</span>}
                      secondary={
                        <React.Fragment>
                          <Typography variant="body2" component="span" className="dark:text-gray-300">
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" component="div" color="text.secondary" className="dark:text-gray-400">
                            {new Date(notification.createdAt).toLocaleString()}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  <Divider className="dark:border-gray-700" />
                </React.Fragment>
              ))}
            </List>
          )}
          
          <Box sx={{ p: 1, textAlign: 'center' }} className="dark:bg-gray-800">
            <Button 
              size="small" 
              onClick={() => {
                navigate('/notifications');
                handleClose();
              }}
              fullWidth
              className="dark:text-blue-400 dark:hover:bg-gray-700"
            >
              {t('notifications.showAll')}
            </Button>
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default NotificationBell; 