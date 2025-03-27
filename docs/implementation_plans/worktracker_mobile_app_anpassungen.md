# Implementationsplan: Anpassungen WorkTracker in der Mobile App

## Übersicht
Anpassung des Worktrackers in der mobilen App, um die Funktionalität mit dem Frontend zu harmonisieren. Die Anpassung umfasst die Position der Zeiterfassungsbox, Todo-Funktionalität und erweiterte Features wie Filter, Spalten, Suchen, Bearbeiten, Status-Änderungen per Swipe und Kopieren von Tasks.

## Technische Anforderungen
- Zeiterfassungsbox muss im mobilen Layout unten positioniert werden (wie im Frontend)
- Todo-Funktionalität über der Zeiterfassung mit On/Off-Schalter und Modal-Button
- Implementierung von gespeicherten Filtern, konfigurierbaren Spalten und Suchfunktion
- Bearbeiten und Erstellen von Tasks
- Statusänderungen durch Swipe-Gesten (TaskStatus: open, in_progress, improval, quality_control, done)
- Kopieren von Tasks
- Robuste Fehlerbehandlung für alle API-Operationen
- Optimierte Performance für mobile Geräte
- Konsistentes Sicherheitskonzept
- Zugriff auf dieselben API-Endpunkte wie das Frontend
- Einhaltung der in VIBES.md definierten Coding-Standards
- Offline-Unterstützung mit Synchronisierungsfunktionalität

## Architekturintegration
Die Mobile App wird als zusätzlicher Client für das bestehende Backend implementiert und folgt denselben Architekturprinzipien wie das Frontend-System. Dabei werden die gleichen API-Endpunkte und Datenmodelle verwendet, jedoch mit mobilspezifischen UI-Anpassungen.

## Schrittweise Implementierung

### Schritt 1: Zeiterfassungsbox nach unten verschieben
**Geschätzter Aufwand: 4 Stunden**

1. Änderung der Struktur von WorktimeScreen.tsx:
   - Umorganisation des Layouts nach dem Vorbild des Frontend-Designs
   - Positionierung der Zeiterfassungsbox am unteren Bildschirmrand
   - Anpassung der Styles

```typescript
// Anpassung in WorktimeScreen.tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Platz für die fixierte Zeiterfassungsbox
  },
  timeTrackerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  }
});
```

2. Anpassung der bestehenden Komponenten:
   - Card-Komponente anpassen
   - Scroll-Verhaltnis optimieren
   - Sicherstellen, dass die Zeiterfassungsbox immer sichtbar bleibt
   - Implementierung von ordnungsgemäßer Fehlerbehandlung (try/catch mit benutzerfreundlichen Meldungen)

3. Anpassung der API-Aufrufe für die Zeiterfassung:
   - Verwendung von denselben API-Endpunkten wie im Frontend:
     - GET `/api/worktime/active` - Prüfen aktiver Zeiten
     - POST `/api/worktime/start` - Starten der Zeiterfassung
     - POST `/api/worktime/stop` - Stoppen der Zeiterfassung
     - GET `/api/worktime?date=YYYY-MM-DD` - Laden von Zeiten nach Datum

4. Performance-Optimierungen:
   - Virtualisierung der Listen für bessere Scrolling-Performance
   - Vermeidung unnötiger Re-Renders
   - Optimierte Asset-Nutzung für mobile Geräte

### Schritt 2: Todo-Funktionalität implementieren
**Geschätzter Aufwand: 8 Stunden**

1. Neue TaskScreen-Komponente erstellen:
   - Implementierung einer Todo-Liste basierend auf dem TaskModel aus dem Prisma-Schema
   - Anzeige von Tasks mit Status und wichtigen Infos
   - Integration mit der API

```typescript
// Neue TaskScreen.tsx Komponente
import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { taskApi } from '../api/apiClient';
import { Task, TaskStatus } from '../types';
import TaskItem from '../components/TaskItem';
import TaskFilterModal from '../components/TaskFilterModal';
import { useNetInfo } from '@react-native-community/netinfo';

const TaskScreen = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const netInfo = useNetInfo();
  
  // Memoize wichtige Funktionen zur Performance-Verbesserung
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Prüfen der Netzwerkverbindung vor API-Aufruf
      if (!netInfo.isConnected) {
        setError('Keine Internetverbindung. Verwende zwischengespeicherte Daten.');
        // Hier ggf. lokale Daten laden
        setLoading(false);
        return;
      }
      
      // Verwenden des gleichen API-Endpunkts wie im Frontend
      const response = await taskApi.getAll(); // GET /api/tasks
      setTasks(response);
    } catch (error) {
      console.error('Fehler beim Laden der Tasks:', error);
      setError('Fehler beim Laden der Aufgaben. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  }, [netInfo.isConnected]);
  
  useEffect(() => {
    loadTasks();
    
    // Cleanup-Funktion zum Verhindern von Memory Leaks
    return () => {
      // Hier z.B. Abbruch ausstehender API-Anfragen
    };
  }, [loadTasks]);
  
  if (loading && tasks.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Lade Aufgaben...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>To-Dos</Text>
        <Button onPress={() => setShowFilterModal(true)} icon="filter">Filter</Button>
      </View>
      
      {error && (
        <Card style={styles.errorCard}>
          <Card.Content>
            <Text style={styles.errorText}>{error}</Text>
          </Card.Content>
        </Card>
      )}
      
      <FlatList
        data={tasks}
        renderItem={({ item }) => <TaskItem task={item} onStatusChange={loadTasks} />}
        keyExtractor={item => item.id.toString()}
        refreshing={loading}
        onRefresh={loadTasks}
        // Performance-Optimierungen
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={styles.emptyText}>Keine Aufgaben gefunden</Text>
          ) : null
        }
      />
      
      <TaskFilterModal
        visible={showFilterModal}
        onDismiss={() => setShowFilterModal(false)}
        onApply={loadTasks}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorCard: {
    margin: 16,
    backgroundColor: '#ffebee',
  },
  errorText: {
    color: '#c62828',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#757575',
  },
});

export default TaskScreen;
```

2. TaskItem-Komponente erstellen:
   - Implementierung basierend auf dem TaskStatus-Enum aus dem Prisma-Schema
   - Statusfarben und Icons entsprechend dem Frontend
   - Integrierte Swipe-Aktionen für Statusänderungen

```typescript
// TaskItem.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import { TaskStatus, Task } from '../types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Swipeable } from 'react-native-gesture-handler';

// Status-Mapping analog zum Frontend
const statusColors = {
  open: '#3B82F6', // Blau
  in_progress: '#EAB308', // Gelb
  improval: '#EF4444', // Rot
  quality_control: '#8B5CF6', // Lila
  done: '#10B981' // Grün
};

const statusIcons = {
  open: 'folder-open-outline',
  in_progress: 'progress-clock',
  improval: 'alert-circle-outline',
  quality_control: 'checkbox-marked-circle-outline',
  done: 'check-circle-outline'
};

// Status-Texte auf Deutsch
const statusLabels = {
  open: 'Offen',
  in_progress: 'In Bearbeitung',
  improval: 'Nachbesserung',
  quality_control: 'Qualitätskontrolle',
  done: 'Erledigt'
};

interface TaskItemProps {
  task: Task;
  onStatusChange: () => void;
  onPress?: (task: Task) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onStatusChange, onPress }) => {
  // Implementierung der Swipe-to-Status-Change Funktionalität
  // Analog zu der Funktionsweise im Frontend
};

export default TaskItem;
```

3. Erstellung der benötigten Komponenten:
   - TaskFilterModal für Filteroptionen mit gespeicherten Filtern
   - TaskDetailsModal zum Anzeigen/Bearbeiten von Details
   - Input-Validierung für alle Formularfelder
   - Sicherheitsmaßnahmen bei der Datenverarbeitung

4. Integration im WorktimeScreen:
   - Anzeige der Todo-Liste über der Zeiterfassungsbox
   - Toggle für On/Off Schaltung
   - Button zum Öffnen des Modals
   - Saubere Trennung von Zuständen (State Management)

5. Anpassung der API-Integration:
   - Task-API-Endpunkte:
     - GET `/api/tasks` - Alle Tasks abrufen
     - GET `/api/tasks/:id` - Einzelnen Task abrufen
     - POST `/api/tasks` - Neuen Task erstellen
     - PUT `/api/tasks/:id` - Task aktualisieren
     - PATCH `/api/tasks/:id` - Teilweise Task-Aktualisierung (z.B. nur Status)
     - DELETE `/api/tasks/:id` - Task löschen

### Schritt 3: Gespeicherte Filter, Spalten, Suchen
**Geschätzter Aufwand: 8 Stunden**

1. Filter-System:
   - Implementierung von gespeicherten Filtern analog zum `SavedFilter`-Modell im Prisma-Schema
   - Synchronisierung mit dem Backend
   - UI für Filter-Verwaltung
   - Cache-System für Offline-Nutzung

```typescript
// Beispiel für eine Filter-Komponente mit Fehlerbehandlung und Caching
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types entsprechend dem SavedFilter-Modell im Backend
interface FilterOption {
  id: string;
  name: string;
  conditions: FilterCondition[];
  operators: string[];
}

interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

const CACHE_KEY_FILTERS = 'cached_task_filters';

const TaskFilterModal = ({ visible, onDismiss, onApply }) => {
  const [savedFilters, setSavedFilters] = useState<FilterOption[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const netInfo = useNetInfo();
  
  useEffect(() => {
    loadSavedFilters();
  }, []);
  
  // Gespeicherte Filter laden mit Offline-Support
  const loadSavedFilters = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Versuche zunächst, zwischengespeicherte Filter zu laden
      const cachedFilters = await AsyncStorage.getItem(CACHE_KEY_FILTERS);
      
      if (cachedFilters) {
        setSavedFilters(JSON.parse(cachedFilters));
      }
      
      // Wenn online, lade vom Server und aktualisiere Cache
      if (netInfo.isConnected) {
        // API-Endpunkt identisch mit dem Frontend
        // GET /api/saved-filters/:tableId
        const filters = await taskApi.getSavedFilters('worktracker_todos');
        setSavedFilters(filters);
        
        // Im Cache speichern
        await AsyncStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify(filters));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Filter:', error);
      setError('Filter konnten nicht geladen werden');
      
      // Bei Netzwerkfehler bleiben wir bei zwischengespeicherten Daten
    } finally {
      setLoading(false);
    }
  };
  
  // Neuen Filter speichern mit Offline-Unterstützung
  const saveFilter = async (filter: Omit<FilterOption, 'id'>) => {
    try {
      if (!netInfo.isConnected) {
        throw new Error('Keine Internetverbindung');
      }
      
      // API-Endpunkt identisch mit dem Frontend
      // POST /api/saved-filters
      const savedFilter = await taskApi.saveFilter(filter);
      setSavedFilters(prev => [...prev, savedFilter]);
      
      // Cache aktualisieren
      await AsyncStorage.setItem(CACHE_KEY_FILTERS, JSON.stringify([...savedFilters, savedFilter]));
      
      return savedFilter;
    } catch (error) {
      console.error('Fehler beim Speichern des Filters:', error);
      throw error; // Weiterleiten für die UI-Behandlung
    }
  };
  
  // Weitere Implementierung...
};
```

2. Spalten-Konfiguration:
   - Einstellungen für sichtbare Spalten basierend auf `UserTableSettings` im Prisma-Schema
   - Speicherung der Benutzereinstellungen
   - Anpassung der Task-Darstellung
   - Erweiterte Fehlerbehandlung für alle API-Aufrufe
   - API-Endpunkte:
     - GET `/api/table-settings/:tableId` - Spalteneinstellungen abrufen
     - POST `/api/table-settings` - Spalteneinstellungen speichern

3. Suchfunktion:
   - Implementierung einer Suchleiste mit Debounce
   - Echtzeit-Suche in Tasks mit progressiver Ladeanzeige
   - Erweiterte Suchoptionen
   - Suchverlauf für häufige Suchanfragen

### Schritt 4: Task-Bearbeitung, Status-Swipe, Kopieren
**Geschätzter Aufwand: 10 Stunden**

1. Task-Bearbeitung:
   - Formular für Bearbeitung und Erstellung mit Validierung basierend auf dem Task-Modell im Prisma-Schema
   - Fehlerbehandlung gemäß VIBES.md
   - Speichern von Änderungen mit Offline-Support

```typescript
// Task-Bearbeitungsformular mit vollständiger Validierung
import * as Yup from 'yup';
import { Formik } from 'formik';

// Validierungsschema für Aufgaben basierend auf dem Task-Modell im Backend
const taskValidationSchema = Yup.object().shape({
  title: Yup.string()
    .required('Titel ist erforderlich')
    .min(3, 'Titel muss mindestens 3 Zeichen lang sein')
    .max(100, 'Titel darf maximal 100 Zeichen lang sein'),
  description: Yup.string()
    .nullable()
    .max(1000, 'Beschreibung darf maximal 1000 Zeichen lang sein'),
  status: Yup.string()
    .required('Status ist erforderlich')
    .oneOf(['open', 'in_progress', 'improval', 'quality_control', 'done'], 'Ungültiger Status'),
  dueDate: Yup.date()
    .nullable()
    .min(new Date(), 'Fälligkeitsdatum muss in der Zukunft liegen'),
});

const TaskEditForm = ({ task, onSave, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const netInfo = useNetInfo();
  
  const handleSave = async (values, { setSubmitting, setErrors }) => {
    setIsSubmitting(true);
    setServerError(null);
    
    try {
      // Verbindungsprüfung
      if (!netInfo.isConnected) {
        setServerError('Keine Internetverbindung. Änderungen werden gespeichert, sobald die Verbindung wiederhergestellt ist.');
        // Hier lokales Speichern für spätere Synchronisierung implementieren
        setIsSubmitting(false);
        return;
      }
      
      const updatedTask = {
        ...task,
        ...values
      };
      
      // API-Endpunkte identisch mit dem Frontend
      if (task?.id) {
        // PUT /api/tasks/:id
        await taskApi.update(task.id, updatedTask);
      } else {
        // POST /api/tasks
        await taskApi.create(updatedTask);
      }
      
      onSave();
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      
      // Detaillierte Fehlerbehandlung
      if (error.response) {
        // Backend-Validierungsfehler verarbeiten
        if (error.response.status === 400 && error.response.data.errors) {
          const backendErrors = error.response.data.errors;
          const formikErrors = {};
          
          // Mapping Backend-Fehler zu Formik-Fehlern
          Object.keys(backendErrors).forEach(key => {
            formikErrors[key] = backendErrors[key];
          });
          
          setErrors(formikErrors);
        } else {
          setServerError(`Server-Fehler: ${error.response.data.message || 'Unbekannter Fehler'}`);
        }
      } else {
        setServerError('Netzwerkfehler beim Speichern der Aufgabe');
      }
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };
  
  return (
    <Formik
      initialValues={{
        title: task?.title || '',
        description: task?.description || '',
        status: task?.status || 'open',
        dueDate: task?.dueDate || null,
        // Weitere Felder entsprechend dem Task-Modell
        branchId: task?.branchId || null,
        responsibleId: task?.responsibleId || null,
        qualityControlId: task?.qualityControlId || null,
        roleId: task?.roleId || null
      }}
      validationSchema={taskValidationSchema}
      onSubmit={handleSave}
    >
      {/* Formular-Implementierung mit Validierung */}
    </Formik>
  );
};
```

2. Status-Änderung per Swipe:
   - Implementierung von Swipe-Gesten mit haptischem Feedback
   - Visuelle Indikatoren für verschiedene Swipe-Richtungen
   - Verarbeitung der Statusänderungen mit optimistischer UI-Aktualisierung
   - Robuste Fehlerbehandlung und Rückgängigmachen bei Fehlern
   - Berücksichtigung aller TaskStatus-Enum-Werte (open, in_progress, improval, quality_control, done)
   - Verwendung von PATCH für Status-Updates (PATCH `/api/tasks/:id`)

3. Task-Kopieren:
   - Funktion zum Duplizieren von Tasks mit Überprüfung der Berechtigungen
   - Anpassung der Kopie (z.B. "-Kopie" anhängen)
   - Optimierte Benutzerführung mit Undo-Funktionalität
   - Verwendung des API-Endpunkts POST `/api/tasks` mit angepassten Daten

4. Attachment-Handling:
   - Anzeigen von Anhängen zu Tasks
   - Hoch- und Herunterladen von Anhängen
   - Sicherheits- und Berechtigungsprüfungen
   - Entsprechende API-Endpunkte:
     - GET `/api/tasks/:taskId/attachments` - Anhänge abrufen
     - POST `/api/tasks/:taskId/attachments` - Neuen Anhang hochladen
     - DELETE `/api/tasks/:taskId/attachments/:attachmentId` - Anhang löschen

### Schritt 5: Tests und Qualitätssicherung
**Geschätzter Aufwand: 6 Stunden**

1. Automatisierte Tests:
   - Unit-Tests für kritische Logik (API-Interaktionen, Validierungen)
   - Komponentenbasierte Tests (Snapshot-Tests, Verhaltenstests)
   - End-to-End-Tests für wichtige Benutzerszenarien

2. Performance-Tests:
   - Messungen der Renderzeit und Interaktionsverzögerungen
   - Speicherverbrauchsanalyse
   - Optimierungen identifizieren und umsetzen

3. Sicherheitsüberprüfungen:
   - Überprüfung auf anfällige Abhängigkeiten
   - Sicherheitskonzept der API-Kommunikation
   - Schutz sensibler Daten

## Test- und Qualitätssicherung
- Manuelle Tests auf verschiedenen Geräten
- Automatisierte Tests für kritische Funktionen
- Benutzer-Feedback und Anpassungen
- Systematische Fehlersuche für häufige Fehlerszenarien
- Barrierefreiheit und Benutzerfreundlichkeit

## Gesamtaufwand
- Zeiterfassungsbox nach unten verschieben: 4 Stunden
- Todo-Funktionalität implementieren: 8 Stunden
- Gespeicherte Filter, Spalten, Suchen: 8 Stunden
- Task-Bearbeitung, Status-Swipe, Kopieren: 10 Stunden
- Tests und Qualitätssicherung: 6 Stunden

**Gesamtaufwand:** 36 Stunden

## Abhängigkeiten und Risiken
- API-Kompatibilität zwischen Frontend und Mobile App
- Komplexität der Swipe-Gesten auf verschiedenen Geräten
- Speicherplatz und Performance auf älteren Geräten
- Offline-Funktionalität und Synchronisierung
- Sicherheitsrisiken bei der lokalen Datenspeicherung
- Konsistenz zwischen Frontend- und Mobile-App-Implementierungen

## Wartung und Dokumentation
- Inline-Dokumentation für alle Komponenten und komplexe Funktionen
- README-Updates mit Informationen zur neuen Funktionalität
- Wartungsleitfaden für häufige Probleme
- Performance-Monitoring-Strategie
- Integration in die bestehende Dokumentationshierarchie gemäß mdfiles.mdc

## Rollout-Plan
1. Schritt 1 umsetzen (Zeiterfassungsbox verschieben)
2. APK erstellen und testen:
   ```bash
   # Im IntranetMobileApp-Verzeichnis
   cd IntranetMobileApp
   npm install
   cd android
   ./gradlew assembleRelease
   ```
   - Die erstellte APK findet sich unter `IntranetMobileApp/android/app/build/outputs/apk/release/app-release.apk`
   - APK auf den Server hochladen:
   ```bash
   scp -i ~/.ssh/intranet_rsa IntranetMobileApp/android/app/build/outputs/apk/release/app-release.apk root@65.109.228.106:/var/www/intranet/backend/public/downloads/intranet-app.apk
   ```
   - Die APK ist dann verfügbar unter: https://65.109.228.106.nip.io/downloads/intranet-app.apk

3. Schritt 2 umsetzen (Todo-Funktionalität)
4. APK erstellen und testen (wie oben beschrieben)
5. Schritt 3 umsetzen (Filter, Spalten, Suchen)
6. APK erstellen und testen (wie oben beschrieben)
7. Schritt 4 umsetzen (Bearbeiten, Swipe, Kopieren)
8. APK erstellen und umfassend testen (wie oben beschrieben)

## Installation auf Android-Geräten zum Testen

1. **Voraussetzungen auf dem Android-Gerät:**
   - Android 6.0 oder höher
   - Installation von Apps aus unbekannten Quellen erlauben:
     - Einstellungen → Apps → Spezielle Berechtigungen → Apps aus unbekannten Quellen installieren
     - Browser (z.B. Chrome) aktivieren

2. **Download und Installation:**
   - Öffnen Sie https://65.109.228.106.nip.io/downloads/intranet-app.apk im Browser
   - Tippen Sie auf "Herunterladen" oder "Installieren"
   - Bestätigen Sie die Installation
   - Warten Sie, bis die Installation abgeschlossen ist

3. **Testen nach jedem Implementationsschritt:**
   - Fokus auf die jeweils umgesetzten Funktionen
   - Protokollierung von Fehlern und unerwarteten Verhaltensweisen
   - Validierung gegen die Anforderungen 