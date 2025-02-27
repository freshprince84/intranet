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
      // Stellen Sie sicher, dass response.data ein Array ist oder verwenden Sie ein leeres Array
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