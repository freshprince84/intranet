import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator as RNActivityIndicator, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ActivityIndicator, useTheme, Divider } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { requestApi, worktimeApi } from '../api/apiClient';
import { Request, WorkTimeStatistics } from '../types';

/**
 * Dashboard Screen
 * 
 * Zeigt wichtige Informationen wie Arbeitszeit-Statistiken, offene Anfragen
 * und App-Download-Möglichkeiten an.
 */
const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { user } = useAuth();
  
  // Stats-Bereich
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkTimeStatistics>({
    totalHours: 0,
    daysWorked: 0,
    averageHoursPerDay: 0,
    weeklyData: []
  });
  
  // Requests-Bereich
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Beim Fokussieren des Screens Daten neu laden
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );
  
  // Alle Daten laden
  const loadData = async () => {
    fetchWorktimeStats();
    fetchRequests();
  };
  
  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  /**
   * Arbeitszeit-Statistiken laden
   */
  const fetchWorktimeStats = async () => {
    setStatsLoading(true);
    try {
      // Aktuelles Datum und Wochenstart berechnen
      const today = new Date();
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      
      const response = await worktimeApi.getStats(weekStart);
      
      // Statistiken sind jetzt direkt in der Antwort ohne data-Wrapper
      setStats(response || {
        totalHours: 0,
        daysWorked: 0,
        averageHoursPerDay: 0,
        weeklyData: []
      });
      setStatsError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Arbeitszeit-Statistiken:', error);
      
      // Zeige Beispieldaten im Fehlerfall
      setStats({
        totalHours: 38.5,
        daysWorked: 5,
        averageHoursPerDay: 7.7,
        weeklyData: []
      });
      
      setStatsError('Statistiken konnten nicht geladen werden');
    } finally {
      setStatsLoading(false);
    }
  };
  
  /**
   * Anfragen laden
   */
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      // Anfragen-Übersicht vom Server laden
      const response = await requestApi.getAll({ limit: 5, status: 'pending' });
      
      // Direkt die Antwort verwenden, kein data-Wrapper mehr
      setRequests(response ? response.slice(0, 5) : []); // Begrenze auf 5 Einträge
      setRequestsError(null);
    } catch (error) {
      console.error('Fehler beim Laden der Anfragen:', error);
      setRequestsError('Anfragen konnten nicht geladen werden');
      
      // Im Fehlerfall leeren
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };
  
  /**
   * Statusfarbe für Anfragen bestimmen
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return { backgroundColor: '#FEF9C3', textColor: '#A16207' }; // Gelb
      case 'approved':
        return { backgroundColor: '#DCFCE7', textColor: '#166534' }; // Grün
      case 'denied':
        return { backgroundColor: '#FEE2E2', textColor: '#B91C1C' }; // Rot
      case 'cancelled':
        return { backgroundColor: '#E5E7EB', textColor: '#4B5563' }; // Grau
      default:
        return { backgroundColor: '#F3F4F6', textColor: '#1F2937' }; // Standard
    }
  };
  
  /**
   * Navigiere zum Worktracker
   */
  const navigateToWorktracker = () => {
    navigation.navigate('Worktime');
  };
  
  /**
   * Klick auf die App-Download-Box
   */
  const handleAppDownloadPress = () => {
    // Wenn eine spezielle Mobile-App-Landing-Page existiert, könnte man hier öffnen
    // Alternativ könnte man die Info anzeigen, dass man bereits die Mobile-App verwendet
    Alert.alert('Info', 'Du verwendest bereits die mobile App!');
  };
  
  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Arbeitszeit-Statistiken */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="chart-bar" size={24} color={theme.colors.primary} />
            <Title style={styles.cardTitle}>Arbeitszeit-Statistik</Title>
            {statsLoading && <ActivityIndicator size={16} style={{ marginLeft: 8 }} />}
          </View>
          
          {statsError ? (
            <Text style={styles.errorText}>{statsError}</Text>
          ) : (
            <>
              <View style={styles.statsContainer}>
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={navigateToWorktracker}
                >
                  <MaterialCommunityIcons 
                    name="clock-outline" 
                    size={32} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.statValue}>{stats.totalHours.toFixed(1)} Std.</Text>
                  <Text style={styles.statLabel}>Gesamt</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={navigateToWorktracker}
                >
                  <MaterialCommunityIcons 
                    name="calendar-check" 
                    size={32} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.statValue}>{stats.daysWorked}</Text>
                  <Text style={styles.statLabel}>Arbeitstage</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.statItem} 
                  onPress={navigateToWorktracker}
                >
                  <MaterialCommunityIcons 
                    name="calculator" 
                    size={32} 
                    color={theme.colors.primary} 
                  />
                  <Text style={styles.statValue}>{stats.averageHoursPerDay.toFixed(1)} Std.</Text>
                  <Text style={styles.statLabel}>Ø pro Tag</Text>
                </TouchableOpacity>
              </View>
              
              <Button 
                mode="outlined"
                onPress={navigateToWorktracker}
                style={styles.viewMoreButton}
              >
                Zur Zeiterfassung
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Anfragen */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="text-box-outline" size={24} color={theme.colors.primary} />
            <Title style={styles.cardTitle}>Anfragen</Title>
            {requestsLoading && <ActivityIndicator size={16} style={{ marginLeft: 8 }} />}
          </View>
          
          {requestsError ? (
            <Text style={styles.errorText}>{requestsError}</Text>
          ) : requests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="text-box-check-outline" 
                size={40} 
                color="#9CA3AF" 
              />
              <Text style={styles.emptyText}>Keine offenen Anfragen</Text>
            </View>
          ) : (
            <>
              {requests.map((request) => (
                <TouchableOpacity
                  key={request.id}
                  style={styles.requestItem}
                >
                  <MaterialCommunityIcons 
                    name={request.type === 'vacation' ? 'beach' : 'text-box-outline'} 
                    size={24} 
                    color={theme.colors.primary} 
                  />
                  <View style={styles.requestContent}>
                    <Text style={styles.requestTitle} numberOfLines={1}>{request.title}</Text>
                    <Text style={styles.requestDate}>
                      {format(new Date(request.createdAt), 'dd.MM.yyyy', { locale: de })}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(request.status).backgroundColor }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(request.status).textColor }
                      ]}
                    >
                      {request.status === 'pending' ? 'Offen' : 
                       request.status === 'approved' ? 'Genehmigt' : 
                       request.status === 'denied' ? 'Abgelehnt' : 'Storniert'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Mobile-App-Box (bereits installiert) */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.appDownloadContainer}>
            <MaterialCommunityIcons 
              name="cellphone" 
              size={40} 
              color={theme.colors.primary} 
            />
            <View style={styles.appDownloadContent}>
              <Title style={styles.appDownloadTitle}>Mobile App</Title>
              <Text>Du verwendest bereits die Intranet Mobile App!</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginVertical: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    width: '30%',
    padding: 8,
    borderRadius: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  requestContent: {
    flex: 1,
    marginLeft: 12,
  },
  requestTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  requestDate: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  viewMoreButton: {
    marginTop: 12,
    borderColor: '#3B82F6',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    color: '#6B7280',
    marginTop: 8,
  },
  appDownloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  appDownloadContent: {
    marginLeft: 16,
    flex: 1,
  },
  appDownloadTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
});

export default DashboardScreen; 