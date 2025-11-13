import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { de, es, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage.ts';

const NotificationList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { activeLanguage } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<number | null>(null);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const itemsPerPage = 10;
  const navigate = useNavigate();

  // Dynamisches Locale basierend auf aktueller Sprache
  const dateLocale = React.useMemo(() => {
    const lang = activeLanguage || i18n.language || 'de';
    switch (lang) {
      case 'es': return es;
      case 'en': return enUS;
      default: return de;
    }
  }, [activeLanguage, i18n.language]);

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
        locale: dateLocale
      });
    } catch (error) {
      return t('notifications.invalidDate', { defaultValue: 'Ungültiges Datum' });
    }
  };

  return (
    <div className="min-h-screen p-4 dark:bg-gray-900">
      <div className="container mx-auto">
        <div className="bg-white rounded-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <BellIcon className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('notifications.title', { defaultValue: 'Benachrichtigungen' })}</h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={notifications.every(n => n.read)}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                  ${notifications.every(n => n.read)
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-900/50'}`}
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                {t('notifications.markAllAsRead', { defaultValue: 'Alle gelesen' })}
              </button>
              <button
                onClick={handleDeleteAllClick}
                disabled={notifications.length === 0}
                className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium
                  ${notifications.length === 0
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900 dark:hover:bg-red-900/50'}`}
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {t('notifications.deleteAll', { defaultValue: 'Alle löschen' })}
              </button>
            </div>
          </div>

          {loading && notifications.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <CircularProgress className="dark:text-blue-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <BellIcon className="h-16 w-16 mb-4 dark:text-gray-500" />
              <p className="text-lg">{t('notifications.noNotifications', { defaultValue: 'Keine Benachrichtigungen vorhanden' })}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification, index) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 rounded-lg transition-colors cursor-pointer
                    ${notification.read 
                      ? 'bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700' 
                      : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50'}
                    ${index < notifications.length - 1 ? 'border-b dark:border-gray-700' : ''}`}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="flex items-center">
                        <h3 className={`text-base ${notification.read ? 'font-medium' : 'font-semibold'} text-gray-900 dark:text-white`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 rounded-full">
                            {t('notifications.new', { defaultValue: 'Neu' })}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex space-x-2">
                      {!notification.read && (
                        <Tooltip title={t('notifications.markAsRead', { defaultValue: 'Als gelesen markieren' })}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded-full hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        </Tooltip>
                      )}
                      <Tooltip title={t('notification.deleteTitle')}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(notification.id);
                          }}
                          className="text-red-600 hover:text-red-900 p-1.5 rounded-full hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30"
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
                        ? 'bg-blue-600 text-white dark:bg-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
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
          PaperProps={{
            className: 'dark:bg-gray-800 dark:text-white'
          }}
        >
          <DialogTitle className="dark:text-white">Benachrichtigung löschen</DialogTitle>
          <DialogContent>
            <DialogContentText className="dark:text-gray-300">
              Möchten Sie diese Benachrichtigung wirklich löschen?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} color="primary" className="dark:text-blue-400">
              Abbrechen
            </Button>
            <Button onClick={handleDeleteConfirm} color="error" className="dark:text-red-400">
              {t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteAllDialogOpen}
          onClose={() => setDeleteAllDialogOpen(false)}
          PaperProps={{
            className: 'dark:bg-gray-800 dark:text-white'
          }}
        >
          <DialogTitle className="dark:text-white">Alle Benachrichtigungen löschen</DialogTitle>
          <DialogContent>
            <DialogContentText className="dark:text-gray-300">
              Möchten Sie wirklich alle Benachrichtigungen löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteAllDialogOpen(false)} color="primary" className="dark:text-blue-400">
              Abbrechen
            </Button>
            <Button onClick={handleDeleteAllConfirm} color="error" className="dark:text-red-400">
              Alle löschen
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default NotificationList; 