import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Divider, 
  Paper, 
  Button,
  Pagination,
  Chip,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { 
  Delete as DeleteIcon,
  Notifications as NotificationsIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Task as TaskIcon,
  Person as PersonIcon,
  WorkOutline as WorkOutlineIcon,
  Assignment as AssignmentIcon,
  SupervisorAccount as SupervisorAccountIcon
} from '@mui/icons-material';
import { Notification, notificationApi } from '../api/notificationApi.ts';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const NotificationList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<number | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationApi.getNotifications(page, itemsPerPage);
      setNotifications(response.data.notifications || []);
      setTotalPages(Math.ceil((response.data.total || 0) / itemsPerPage));
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === id ? { ...notification, read: true } : notification
        )
      );
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Fehler beim Markieren aller als gelesen:', error);
    }
  };

  const handleDeleteClick = (id: number) => {
    setSelectedNotification(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedNotification !== null) {
      try {
        await notificationApi.deleteNotification(selectedNotification);
        setNotifications(prevNotifications => 
          prevNotifications.filter(notification => notification.id !== selectedNotification)
        );
      } catch (error) {
        console.error('Fehler beim Löschen der Benachrichtigung:', error);
      }
    }
    setDeleteDialogOpen(false);
    setSelectedNotification(null);
  };

  const handleDeleteAllClick = () => {
    setDeleteAllDialogOpen(true);
  };

  const handleDeleteAllConfirm = async () => {
    try {
      await notificationApi.deleteAllNotifications();
      setNotifications([]);
    } catch (error) {
      console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
    }
    setDeleteAllDialogOpen(false);
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'task':
        return <TaskIcon color="primary" />;
      case 'user':
        return <PersonIcon color="primary" />;
      case 'worktime':
        return <WorkOutlineIcon color="primary" />;
      case 'request':
        return <AssignmentIcon color="primary" />;
      case 'role':
        return <SupervisorAccountIcon color="primary" />;
      case 'info':
        return <InfoIcon color="info" />;
      case 'warning':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigiere zum verwandten Element, falls vorhanden
    if (notification.relatedEntityId && notification.relatedEntityType) {
      switch (notification.relatedEntityType.toLowerCase()) {
        case 'task':
          navigate(`/tasks/${notification.relatedEntityId}`);
          break;
        case 'request':
          navigate(`/requests/${notification.relatedEntityId}`);
          break;
        case 'user':
          navigate(`/users/${notification.relatedEntityId}`);
          break;
        case 'role':
          navigate(`/roles/${notification.relatedEntityId}`);
          break;
        case 'worktime':
          navigate(`/worktime/${notification.relatedEntityId}`);
          break;
        default:
          break;
      }
    }
  };

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

  if (loading && notifications.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 2, maxWidth: 800, mx: 'auto', mt: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">
          Benachrichtigungen
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleMarkAllAsRead}
            startIcon={<CheckIcon />}
            size="small"
            sx={{ mr: 1 }}
            disabled={notifications.every(n => n.read)}
          >
            Alle als gelesen markieren
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleDeleteAllClick}
            startIcon={<DeleteIcon />}
            size="small"
            disabled={notifications.length === 0}
          >
            Alle löschen
          </Button>
        </Box>
      </Box>
      
      {notifications.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="textSecondary">
            Keine Benachrichtigungen vorhanden
          </Typography>
        </Box>
      ) : (
        <>
          <List>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification.id}>
                <ListItem 
                  alignItems="flex-start" 
                  onClick={() => handleNotificationClick(notification)}
                  sx={{ 
                    bgcolor: notification.read ? 'inherit' : 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    cursor: 'pointer'
                  }}
                >
                  <Box sx={{ mr: 2, display: 'flex', alignItems: 'flex-start', pt: 1 }}>
                    {getNotificationIcon(notification.type)}
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                          variant="subtitle1"
                          component="span"
                          sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                        >
                          {notification.title}
                        </Typography>
                        
                        {!notification.read && (
                          <Chip 
                            label="Neu" 
                            color="primary" 
                            size="small" 
                            sx={{ ml: 1, height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {notification.message}
                        </Typography>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          display="block"
                          sx={{ mt: 1 }}
                        >
                          {formatDate(notification.createdAt)}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex' }}>
                      {!notification.read && (
                        <Tooltip title="Als gelesen markieren">
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            size="small"
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Löschen">
                        <IconButton
                          edge="end"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(notification.id);
                          }}
                          size="small"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < notifications.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
            />
          </Box>
        </>
      )}
      
      {/* Lösch-Dialog für einzelne Benachrichtigung */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Benachrichtigung löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie diese Benachrichtigung wirklich löschen?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="primary">
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Lösch-Dialog für alle Benachrichtigungen */}
      <Dialog
        open={deleteAllDialogOpen}
        onClose={() => setDeleteAllDialogOpen(false)}
      >
        <DialogTitle>Alle Benachrichtigungen löschen</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Möchten Sie wirklich alle Benachrichtigungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAllDialogOpen(false)} color="primary">
            Abbrechen
          </Button>
          <Button onClick={handleDeleteAllConfirm} color="error">
            Alle löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default NotificationList; 