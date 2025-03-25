/**
 * NotificationsScreen
 * 
 * Zeigt alle Benachrichtigungen an und ermöglicht deren Verwaltung.
 * Funktionen: Als gelesen markieren, löschen, alle löschen, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { notificationApi } from '../api/apiClient';
import { Notification, NotificationType, PaginatedResponse } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const NotificationsScreen: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const itemsPerPage = 20;
  const navigation = useNavigation<StackNavigationProp<any>>();

  // Lade Benachrichtigungen wenn der Screen fokussiert wird
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(1, true);
    }, [])
  );

  // Benachrichtigungen laden
  const fetchNotifications = async (pageNumber: number = page, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      }
      
      const response: PaginatedResponse<Notification> = await notificationApi.getNotifications(pageNumber, itemsPerPage);
      
      if (reset) {
        setNotifications(response.data);
      } else {
        setNotifications(prev => [...prev, ...response.data]);
      }
      
      setPage(pageNumber);
      setTotalPages(response.totalPages);
      setHasMore(pageNumber < response.totalPages);
    } catch (error) {
      console.error('Fehler beim Laden der Benachrichtigungen:', error);
      Alert.alert(
        'Fehler',
        'Benachrichtigungen konnten nicht geladen werden. Bitte versuche es später erneut.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh Control (Pull-to-refresh)
  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(1, true);
  };

  // Lade mehr Benachrichtigungen beim Scrolling
  const loadMore = () => {
    if (hasMore && !loading && !refreshing) {
      fetchNotifications(page + 1);
    }
  };

  // Markiere eine Benachrichtigung als gelesen
  const handleMarkAsRead = async (notification: Notification) => {
    try {
      await notificationApi.markAsRead(notification.id);
      setNotifications(prevNotifications => 
        prevNotifications.map(item => 
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
    } catch (error) {
      console.error('Fehler beim Markieren als gelesen:', error);
      Alert.alert('Fehler', 'Benachrichtigung konnte nicht als gelesen markiert werden.');
    }
  };

  // Markiere alle Benachrichtigungen als gelesen
  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Fehler beim Markieren aller als gelesen:', error);
      Alert.alert('Fehler', 'Benachrichtigungen konnten nicht als gelesen markiert werden.');
    }
  };

  // Lösche eine Benachrichtigung
  const handleDeleteNotification = async (id: number) => {
    Alert.alert(
      'Benachrichtigung löschen',
      'Möchtest du diese Benachrichtigung wirklich löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationApi.deleteNotification(id);
              setNotifications(prevNotifications => 
                prevNotifications.filter(notification => notification.id !== id)
              );
            } catch (error) {
              console.error('Fehler beim Löschen der Benachrichtigung:', error);
              Alert.alert('Fehler', 'Benachrichtigung konnte nicht gelöscht werden.');
            }
          }
        }
      ]
    );
  };

  // Lösche alle Benachrichtigungen
  const handleDeleteAllNotifications = () => {
    if (notifications.length === 0) return;
    
    Alert.alert(
      'Alle Benachrichtigungen löschen',
      'Möchtest du wirklich alle Benachrichtigungen löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Alle löschen',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationApi.deleteAllNotifications();
              setNotifications([]);
            } catch (error) {
              console.error('Fehler beim Löschen aller Benachrichtigungen:', error);
              Alert.alert('Fehler', 'Benachrichtigungen konnten nicht gelöscht werden.');
            }
          }
        }
      ]
    );
  };

  // Navigiere zur entsprechenden Seite, wenn auf eine Benachrichtigung geklickt wird
  const handleNotificationPress = (notification: Notification) => {
    // Markiere als gelesen, falls noch nicht gelesen
    if (!notification.read) {
      handleMarkAsRead(notification);
    }
    
    // Navigiere zum verwandten Element, falls vorhanden
    if (notification.relatedEntityId && notification.relatedEntityType) {
      switch (notification.relatedEntityType.toLowerCase()) {
        case 'task':
          navigation.navigate('Tasks', { 
            screen: 'TaskDetail', 
            params: { id: notification.relatedEntityId } 
          });
          break;
        case 'request':
          navigation.navigate('Requests', { 
            screen: 'RequestDetail', 
            params: { id: notification.relatedEntityId } 
          });
          break;
        case 'user':
          // Füge hier die Navigation zu Benutzerprofilen hinzu, falls implementiert
          break;
        case 'worktime':
          navigation.navigate('Worktime');
          break;
        default:
          break;
      }
    }
  };

  // Formatiere das Datum relativ (z.B. "vor 2 Stunden")
  const formatDate = (dateString: string | Date) => {
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return formatDistanceToNow(date, { 
        addSuffix: true,
        locale: de 
      });
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  // Wähle das passende Icon je nach Benachrichtigungstyp
  const getNotificationIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case NotificationType.task:
        return <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#3B82F6" />;
      case NotificationType.user:
        return <MaterialCommunityIcons name="account" size={24} color="#3B82F6" />;
      case NotificationType.worktime:
        return <MaterialCommunityIcons name="clock-outline" size={24} color="#3B82F6" />;
      case NotificationType.request:
        return <MaterialCommunityIcons name="file-document-outline" size={24} color="#3B82F6" />;
      case NotificationType.role:
        return <MaterialCommunityIcons name="account-group" size={24} color="#3B82F6" />;
      case NotificationType.worktime_manager_stop:
        return <MaterialCommunityIcons name="clock-alert-outline" size={24} color="#FEA953" />;
      case NotificationType.system:
        return <MaterialCommunityIcons name="information-outline" size={24} color="#3B82F6" />;
      default:
        return <MaterialCommunityIcons name="bell-outline" size={24} color="#3B82F6" />;
    }
  };

  // Render Footer für die FlatList (Lade-Indikator beim Laden weiterer Benachrichtigungen)
  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    );
  };

  // Render einzelne Benachrichtigung
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.iconContainer}>
          {getNotificationIcon(item.type)}
        </View>
        <View style={styles.notificationTextContainer}>
          <View style={styles.notificationHeader}>
            <Text style={[
              styles.notificationTitle, 
              !item.read && styles.unreadNotificationText
            ]}>
              {item.title}
            </Text>
            {!item.read && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>Neu</Text>
              </View>
            )}
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item.id)}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render Header-Aktionen (Alle lesen/löschen)
  const renderHeader = () => (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.readAllButton,
          notifications.every(n => n.read) && styles.disabledButton
        ]}
        onPress={handleMarkAllAsRead}
        disabled={notifications.every(n => n.read)}
      >
        <MaterialCommunityIcons name="check-all" size={18} color="#3B82F6" />
        <Text style={styles.actionButtonText}>Alle gelesen</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.actionButton, 
          styles.deleteAllButton,
          notifications.length === 0 && styles.disabledButton
        ]}
        onPress={handleDeleteAllNotifications}
        disabled={notifications.length === 0}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#EF4444" />
        <Text style={[styles.actionButtonText, styles.deleteAllText]}>Alle löschen</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <MaterialCommunityIcons name="bell-outline" size={22} color="#4B5563" />
        <Text style={styles.headerTitle}>Benachrichtigungen</Text>
      </View>

      {renderHeader()}

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-off-outline" size={60} color="#9CA3AF" />
          <Text style={styles.emptyText}>Keine Benachrichtigungen vorhanden</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#3B82F6']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          initialNumToRender={10}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  readAllButton: {
    backgroundColor: '#EBF5FF',
    borderColor: '#BFDBFE',
  },
  deleteAllButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  deleteAllText: {
    color: '#EF4444',
  },
  disabledButton: {
    opacity: 0.5,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  unreadNotificationText: {
    fontWeight: '700',
    color: '#1F2937',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  newBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  deleteButton: {
    padding: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  footerLoader: {
    padding: 16,
    alignItems: 'center',
  },
});

export default NotificationsScreen; 