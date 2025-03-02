import React, { useState, useEffect } from 'react';
import { 
  Tooltip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button
} from '@mui/material';
import {
  BellIcon,
  CheckIcon,
  TrashIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
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
      setNotifications(response.notifications);
      setTotalPages(response.pagination.totalPages);
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
        return <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />;
      case 'user':
        return <UserIcon className="h-6 w-6 text-blue-600" />;
      case 'worktime':
        return <ClockIcon className="h-6 w-6 text-blue-600" />;
      case 'request':
        return <DocumentTextIcon className="h-6 w-6 text-blue-600" />;
      case 'role':
        return <UserGroupIcon className="h-6 w-6 text-blue-600" />;
      case 'info':
        return <InformationCircleIcon className="h-6 w-6 text-blue-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'error':
        return <ExclamationCircleIcon className="h-6 w-6 text-red-600" />;
      default:
        return <BellIcon className="h-6 w-6 text-blue-600" />;
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

  return (
    <div className="min-h-screen p-4">
      <div className="container mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-gray-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800">Benachrichtigungen</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={notifications.every(n => n.read)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                  ${notifications.every(n => n.read)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200'}`}
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Alle gelesen
              </button>
              <button
                onClick={handleDeleteAllClick}
                disabled={notifications.length === 0}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                  ${notifications.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Alle löschen
              </button>
            </div>
          </div>

          {loading && notifications.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <BellIcon className="h-16 w-16 mb-4" />
              <p className="text-lg">Keine Benachrichtigungen vorhanden</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-lg transition-colors cursor-pointer
                    ${notification.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'}
                    ${index < notifications.length - 1 ? 'border-b' : ''}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="flex items-center">
                        <h3 className={`text-base ${notification.read ? 'font-medium' : 'font-semibold'} text-gray-900`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            Neu
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      {!notification.read && (
                        <Tooltip title="Als gelesen markieren">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip title="Löschen">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(notification.id);
                          }}
                          className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="flex items-center space-x-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded-md text-sm font-medium
                      ${page === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {pageNum}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </div>

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
      </div>
    </div>
  );
};

export default NotificationList; 