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

## Korrekturen und Anpassungen

Nach der ersten Implementierung wurden folgende Probleme identifiziert, die korrigiert werden müssen:

### 1. Entfernung des Toggle-Schalters "Anzeigen" für Tasks

**Problem:**
- Ein ungewünschter Toggle "Anzeigen" wurde im WorktimeScreen zum Ein-/Ausblenden der Task-Liste implementiert, der nicht im ursprünglichen Plan war.

**Analyse möglicher Probleme:**
- Die Entfernung des Toggle könnte Auswirkungen auf andere Bereiche des Codes haben, die von `showTodoSection` abhängen
- Möglicherweise gibt es weitere Stellen im Code, die auf den AsyncStorage-Schlüssel `@IntranetApp:showTodoSection` zugreifen
- Es könnte Probleme mit dem Layout geben, nachdem der Toggle-Bereich entfernt wurde
- Die Task-Liste könnte zu groß sein und den Bildschirm überladen, wenn sie immer angezeigt wird

**Erweiterte Lösung:**
1. Identifizieren der betroffenen Komponente in WorktimeScreen.tsx:
   - In der Card für To-Do befindet sich ein `<View style={styles.todoToggle}>` mit dem nicht benötigten Toggle
   - Der zugehörige State `showTodoSection` und die `saveTodoSettings`-Funktion werden ebenfalls entfernt

2. Umfassende Umsetzungsschritte:
   - Entferne die `showTodoSection`-State-Variable
   - Entferne die `loadTodoSettings`-Funktion (ca. Zeile 95-109)
   - Entferne die `saveTodoSettings`-Funktion (ca. Zeile 112-118)
   - Entferne die bedingte Anzeige basierend auf `showTodoSection` in Zeile 841
   - Entferne die `todoToggle`-View und den Switch vollständig
   - Führe eine globale Suche im gesamten Codebase nach `@IntranetApp:showTodoSection` durch, um alle Referenzen zu entfernen
   - Führe einen grep nach `showTodoSection` aus, um sicherzustellen, dass alle Verwendungen berücksichtigt wurden

3. Anpassung des Layouts:
   - Passe den Card-Titel an (von "To-Dos (Ein/Aus)" zu einfach "To-Dos")
   - Erhöhe ggf. den `paddingBottom` im style.content, um genügend Platz für die fixierte Zeiterfassungsbox zu haben
   - Passe die maximale Höhe der TaskList an, damit sie nicht zu viel Platz einnimmt (z.B. mit maxHeight)
   - Prüfe, ob ScrollView korrekt implementiert ist, damit die Benutzer durch die Tasks scrollen können
   - Optimiere die Card-Darstellung für eine dauerhafte Anzeige

4. Manuelle Tests:
   - Teste die App nach der Änderung auf verschiedenen Bildschirmgrößen
   - Stelle sicher, dass der Inhalt korrekt scrollbar ist und die fixierte Zeiterfassungsbox nicht überdeckt wird

**Nach dieser Korrektur:**
1. APK erstellen:
   ```bash
   cd IntranetMobileApp
   cd android
   ./gradlew assembleRelease
   ```
2. APK ins Backend kopieren:
   ```bash
   cp android/app/build/outputs/apk/release/app-release.apk /var/www/intranet/backend/public/downloads/intranet-app.apk
   ```
3. WICHTIG: Halte den Prozess an, damit der Benutzer testen kann. Warte auf Feedback, bevor du mit dem nächsten Schritt fortfährst.

### 2. Optimierung der Screen-Aktualisierung für die Zeiterfassung

**Problem:**
- Der komplette WorktimeScreen wird durch Timer-Intervalle alle paar Sekunden neu geladen, was ein schlechtes Benutzererlebnis verursacht.

**Analyse möglicher Probleme:**
- Die komplette Entfernung des `fullRefreshInterval` könnte dazu führen, dass wichtige Daten nicht mehr aktualisiert werden
- Die Trennung von Timer-Status-Updates und vollständigen Screen-Updates könnte zu Inkonsistenzen in den angezeigten Daten führen
- Eine selbst implementierte `updateTimerDuration`-Funktion könnte Fehler enthalten oder nicht alle Fälle abdecken
- Die Verwendung von React-Memoization könnte komplex sein und unerwartete Nebenwirkungen haben
- Netzwerkwechsel könnten zu Fehlverhalten führen, wenn sie nicht korrekt behandelt werden

**Erweiterte Lösung:**
1. Detaillierte Analyse des aktuellen Update-Mechanismus:
   - `statusInterval` (Zeile 75) lädt alle 10 Sekunden nur den Timer-Status neu
   - `fullRefreshInterval` (Zeile 88) lädt alle 30 Sekunden den kompletten Screen mit `setupScreen()`
   - In `checkRunningTimer()` wird nur der Timer-Status abgefragt
   - `setupScreen()` lädt Branches, Arbeitszeiten und prüft den Timer-Status

2. Gezielte Optimierung der Aktualisierungsstrategie:
   - Behalte `statusInterval` für das regelmäßige Prüfen des Timer-Status unverändert
   - Ersetze `fullRefreshInterval` durch einen timerDurationInterval mit höherer Frequenz (z.B. alle 5 Sekunden)
   - Reduziere die Häufigkeit vollständiger Aktualisierungen auf ein Minimum (z.B. alle 5 Minuten)
   - Implementiere einen separaten NetInfo-Listener für Netzwerkänderungen

3. Konkrete Implementierungsschritte:
   ```typescript
   // Neue Funktion, die nur die Timer-Dauer aktualisiert
   const updateTimerDuration = () => {
     if (currentWorkTime && isTimerRunning) {
       // Löse einen Re-Render aus, ohne die Daten neu zu laden
       setCurrentWorkTime(prev => {
         if (!prev) return prev;
         return { ...prev };
       });
     }
   };
   
   // Anpassen der useEffect-Hook
   useEffect(() => {
     setupScreen(); // Initiale vollständige Aktualisierung
     loadTasks();
     
     // Häufiger Status-Check
     const statusInterval = setInterval(async () => {
       if (!isOffline) {
         try {
           await checkRunningTimer();
         } catch (error) {
           console.error('Fehler beim Aktualisieren des Timer-Status:', error);
         }
       }
     }, 10000);
     
     // Nur Timer-Dauer aktualisieren
     const timerDurationInterval = setInterval(updateTimerDuration, 5000);
     
     // Seltenere vollständige Aktualisierung
     const fullRefreshInterval = setInterval(setupScreen, 300000); // alle 5 Minuten
     
     // NetInfo-Listener für Netzwerkänderungen
     const unsubscribe = NetInfo.addEventListener(state => {
       const newOfflineState = !state.isConnected;
       if (isOffline !== newOfflineState) {
         setIsOffline(newOfflineState);
         if (!newOfflineState) {
           // Wenn wieder online, komplette Aktualisierung durchführen
           setupScreen();
         }
       }
     });
     
     return () => {
       clearInterval(statusInterval);
       clearInterval(timerDurationInterval);
       clearInterval(fullRefreshInterval);
       unsubscribe();
     };
   }, []);
   ```

4. Optimierung der `checkRunningTimer`-Funktion:
   - Trenne die Funktion klar von der vollständigen Bildschirmaktualisierung
   - Mache sie effizienter durch gezielte API-Abfragen nur für den Timer-Status
   - Implementiere eine optimistische Aktualisierung, die die UI sofort aktualisiert

5. Verwendung von Memoization für die Komponenten:
   - Setze `React.memo()` für untergeordnete Komponenten ein
   - Verwende `useCallback` für Event-Handler
   - Nutze `useMemo` für berechnete Werte
   - Implementiere eine PureComponent für die TimeTrackerBox

6. Debugging und Fehlerbehandlung:
   - Füge temporär Konsolenausgaben hinzu, um die Aktualisierungszyklen zu überwachen
   - Implementiere eine Fallback-Strategie für den Fall, dass die Aktualisierung fehlschlägt

**Nach dieser Korrektur:**
1. APK erstellen:
   ```bash
   cd IntranetMobileApp
   cd android
   ./gradlew assembleRelease
   ```
2. APK ins Backend kopieren:
   ```bash
   cp android/app/build/outputs/apk/release/app-release.apk /var/www/intranet/backend/public/downloads/intranet-app.apk
   ```
3. WICHTIG: Halte den Prozess an, damit der Benutzer testen kann. Warte auf Feedback, bevor du mit dem nächsten Schritt fortfährst.

### 3. Entfernung der "Erledigte Aufgaben anzeigen" Option

**Problem:**
- Die Option "Erledigte Aufgaben anzeigen" bei der Filter-Speicherung war nicht Teil der Anforderungen und soll entfernt werden.

**Analyse möglicher Probleme:**
- Das Entfernen der Option könnte gespeicherte Filter im AsyncStorage ungültig machen
- Die TaskFilterModal-Komponente könnte an mehreren Stellen in der App verwendet werden
- Die Änderung des FilterOptions-Interface könnte zu TypeScript-Fehlern führen
- Die Filterlogik in der TaskList-Komponente muss angepasst werden, um immer alle Tasks anzuzeigen

**Erweiterte Lösung:**
1. Genaue Identifizierung der betroffenen Komponenten:
   - In TaskFilterModal.tsx ist ein State `const [showCompleted, setShowCompleted] = useState(true)` definiert
   - Eine `<Switch>`-Komponente im switchSection-View steuert diesen Wert
   - In der TaskList-Komponente gibt es eine Filterlogik, die Tasks mit Status 'done' basierend auf `activeFilters.showCompleted` filtert
   - Das FilterOptions-Interface enthält ein `showCompleted`-Flag

2. Migrationsplan für bestehende Daten:
   - Implementiere ein einmaliges Migrationsskript, das bei App-Start ausgeführt wird:
   ```typescript
   // In App.tsx oder einem zentralen Initialisierungscode
   const migrateFilters = async () => {
     try {
       const filtersJson = await AsyncStorage.getItem(SAVED_FILTERS_KEY);
       if (filtersJson) {
         const filters = JSON.parse(filtersJson);
         // Entferne showCompleted aus allen gespeicherten Filtern
         const migratedFilters = filters.map(filter => {
           const { showCompleted, ...rest } = filter;
           return rest;
         });
         await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(migratedFilters));
         console.log('Filter migriert');
       }
     } catch (error) {
       console.error('Fehler bei der Migration der Filter:', error);
     }
   };
   ```

3. Detaillierte Umsetzungsschritte:
   - Entferne das `showCompleted`-Flag aus dem `FilterOptions`-Interface in allen Dateien
   - Entferne den State `showCompleted` aus TaskFilterModal.tsx
   - Entferne die `<View style={styles.switchSection}>` mit dem Switch für "Erledigte Aufgaben anzeigen"
   - Passe die `applyFilter`-Methode an, um das Flag nicht mehr zu setzen
   - Passe die `resetFilters`-Methode entsprechend an
   - Entferne die Filterlogik in TaskList.tsx, die Tasks basierend auf `activeFilters.showCompleted` filtert:
   ```typescript
   // Vor der Änderung
   if (!activeFilters.showCompleted) {
     filtered = filtered.filter(task => task.status !== 'done');
   }
   
   // Nach dem Entfernen dieser Zeilen werden alle Tasks unabhängig vom Status angezeigt
   ```

4. Anpassung der Filter-Speicherung:
   - Modifiziere die saveFilter-Funktion, um `showCompleted` nicht mehr zu speichern
   - Passe die Filteranwendung an, um dieses Flag zu ignorieren

5. Regression-Tests:
   - Teste das Laden und Speichern von Filtern nach der Änderung
   - Überprüfe, ob alle Tasks korrekt angezeigt werden
   - Stelle sicher, dass bestehende Filter weiterhin funktionieren
   - Prüfe, ob das UI korrekt dargestellt wird, nachdem der Switch entfernt wurde

**Nach dieser Korrektur:**
1. APK erstellen:
   ```bash
   cd IntranetMobileApp
   cd android
   ./gradlew assembleRelease
   ```
2. APK ins Backend kopieren:
   ```bash
   cp android/app/build/outputs/apk/release/app-release.apk /var/www/intranet/backend/public/downloads/intranet-app.apk
   ```
3. WICHTIG: Halte den Prozess an, damit der Benutzer testen kann. Warte auf Feedback, bevor du mit dem nächsten Schritt fortfährst.

### 4. Überprüfung des Spalten-Konfigurationsbuttons -> DIESE KORREKTUR VORRERST ÜBERSPRINGEN!!



-> HIER WEITERMACHEN
### 5. Korrektur des inkonsistenten Verhaltens des Task-Bearbeitungsmodals

#### Aktuelle Probleme (ANALYSE):

1. **Hauptprobleme:**
   - Modal öffnet sich ohne Task-Daten beim Klicken auf einen Task
   - Task-Bearbeitung funktioniert nicht mehr (war vorher funktional)
   - Neue Tasks können nicht erstellt werden (API-Aufruf schlägt fehl)

2. **Code-Analyse TaskDetailModal.tsx:**
   - `useEffect` für Task-Laden hat Fehler:
     ```typescript
     useEffect(() => {
       if (visible) {
         if (mode === ModalMode.CREATE) {
           initializeNewTask();
         } else if (taskId) {
           loadTask();
         }
         loadUsersAndBranches();
       }
     }, [visible, taskId, mode]);
     ```
     Problem: Abhängigkeitsarray enthält `mode`, was zu unerwünschten Re-Renders führt

   - `loadTask` Funktion:
     ```typescript
     const loadTask = async () => {
       if (!taskId) return;
       dispatch({ type: 'SET_LOADING', value: true });
       try {
         const taskData = await taskApi.getById(taskId);
         dispatch({ type: 'LOAD_TASK', task: taskData });
         setSelectedUser(taskData.responsible || null);
         setSelectedBranch(taskData.branch || null);
       } catch (error) {
         console.error('Fehler beim Laden der Aufgabe:', error);
         dispatch({ type: 'SET_ERROR', error: 'Die Aufgabe konnte nicht geladen werden.' });
       } finally {
         dispatch({ type: 'SET_LOADING', value: false });
       }
     };
     ```
     Problem: Keine Überprüfung ob taskData wirklich Daten enthält

   - `handleSave` Funktion:
     ```typescript
     const handleSave = async () => {
       if (!validateForm()) return;
       dispatch({ type: 'SET_UPDATING', value: true });
       try {
         const taskData = {
           title: formState.title.trim(),
           description: formState.description.trim(),
           status: formState.status,
           dueDate: formState.dueDate ? formState.dueDate.toISOString() : null,
           responsibleId: formState.responsibleId,
           branchId: formState.branchId,
         };
         if (mode === ModalMode.EDIT && taskId) {
           await taskApi.update(taskId, taskData);
           Alert.alert('Erfolg', 'Die Aufgabe wurde erfolgreich aktualisiert.');
         } else if (mode === ModalMode.CREATE) {
           await taskApi.create(taskData);
           Alert.alert('Erfolg', 'Die Aufgabe wurde erfolgreich erstellt.');
         }
         if (onTaskUpdated) {
           onTaskUpdated();
         }
         onDismiss();
       } catch (error) {
         console.error('Fehler beim Speichern der Aufgabe:', error);
         const axiosError = error as any;
         const errorMessage = axiosError.response?.data?.message || 
                          axiosError.message || 
                          'Die Aufgabe konnte nicht gespeichert werden.';
         dispatch({ type: 'SET_FORM_ERROR', error: errorMessage });
       } finally {
         dispatch({ type: 'SET_UPDATING', value: false });
       }
     };
     ```
     Problem: Keine Validierung der API-Response, keine Überprüfung der taskData-Struktur

3. **API-Integration Analyse:**
   - TaskApiService in apiClient.ts:
     ```typescript
     class TaskApiService extends BaseApiService<Task> {
       constructor() {
         super('/tasks');
       }
     }
     ```
     Problem: Keine spezifische Fehlerbehandlung für Task-spezifische Fehler

4. **State Management Analyse:**
   - Zu viele separate States:
     ```typescript
     const [mode, setMode] = React.useState(initialMode);
     const [formState, dispatch] = useReducer(taskFormReducer, initialFormState);
     const [showDatePicker, setShowDatePicker] = React.useState(false);
     const [showUserMenu, setShowUserMenu] = React.useState(false);
     const [showBranchMenu, setShowBranchMenu] = React.useState(false);
     const [showConfirmationDialog, setShowConfirmationDialog] = React.useState(false);
     const [users, setUsers] = React.useState<User[]>([]);
     const [branches, setBranches] = React.useState<Branch[]>([]);
     const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
     const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
     ```
     Problem: Inkonsistenzen durch zu viele unabhängige States

#### Korrekturplan:

1. **Task-Laden optimieren:**
   ```typescript
   // Neuer useEffect ohne mode als Dependency
   useEffect(() => {
     if (visible && taskId) {
       loadTask();
     }
   }, [visible, taskId]);

   // Separater useEffect für CREATE mode
   useEffect(() => {
     if (visible && mode === ModalMode.CREATE) {
       initializeNewTask();
     }
   }, [visible]);

   // Separater useEffect für Users & Branches
   useEffect(() => {
     if (visible) {
       loadUsersAndBranches();
     }
   }, [visible]);
   ```

2. **loadTask-Funktion verbessern:**
   ```typescript
   const loadTask = async () => {
     if (!taskId) return;
     
     dispatch({ type: 'SET_LOADING', value: true });
     dispatch({ type: 'SET_ERROR', error: null });
     
     try {
       const taskData = await taskApi.getById(taskId);
       
       // Validiere taskData
       if (!taskData || !taskData.id) {
         throw new Error('Ungültige Task-Daten vom Server');
       }
       
       // Setze alle States auf einmal
       dispatch({ type: 'LOAD_TASK', task: taskData });
       setSelectedUser(taskData.responsible || null);
       setSelectedBranch(taskData.branch || null);
       
     } catch (error) {
       console.error('Fehler beim Laden der Aufgabe:', error);
       dispatch({ type: 'SET_ERROR', error: 'Die Aufgabe konnte nicht geladen werden.' });
     } finally {
       dispatch({ type: 'SET_LOADING', value: false });
     }
   };
   ```

3. **handleSave-Funktion verbessern:**
   ```typescript
   const handleSave = async () => {
     if (!validateForm()) return;
     
     dispatch({ type: 'SET_UPDATING', value: true });
     dispatch({ type: 'SET_ERROR', error: null });
     
     try {
       const taskData = {
         title: formState.title.trim(),
         description: formState.description.trim(),
         status: formState.status,
         dueDate: formState.dueDate ? formState.dueDate.toISOString() : null,
         responsibleId: formState.responsibleId,
         branchId: formState.branchId,
       };
       
       // Validiere taskData
       if (!taskData.title || !taskData.branchId) {
         throw new Error('Pflichtfelder fehlen');
       }
       
       let savedTask;
       if (mode === ModalMode.EDIT && taskId) {
         savedTask = await taskApi.update(taskId, taskData);
       } else if (mode === ModalMode.CREATE) {
         savedTask = await taskApi.create(taskData);
       }
       
       // Validiere Response
       if (!savedTask || !savedTask.id) {
         throw new Error('Ungültige Antwort vom Server');
       }
       
       Alert.alert(
         'Erfolg',
         mode === ModalMode.CREATE ? 
           'Die Aufgabe wurde erfolgreich erstellt.' :
           'Die Aufgabe wurde erfolgreich aktualisiert.'
       );
       
       if (onTaskUpdated) {
         onTaskUpdated();
       }
       
       onDismiss();
       
     } catch (error) {
       console.error('Fehler beim Speichern der Aufgabe:', error);
       
       // Strukturierte Fehlerbehandlung
       const axiosError = error as any;
       let errorMessage = 'Die Aufgabe konnte nicht gespeichert werden.';
       
       if (axiosError.response?.data?.message) {
         errorMessage = axiosError.response.data.message;
       } else if (error instanceof Error) {
         errorMessage = error.message;
       }
       
       dispatch({ type: 'SET_FORM_ERROR', error: errorMessage });
     } finally {
       dispatch({ type: 'SET_UPDATING', value: false });
     }
   };
   ```

4. **State Management optimieren:**
   ```typescript
   // Reduziere separate States durch Erweiterung des taskFormReducer
   interface TaskFormState {
     // ... bisherige Felder ...
     ui: {
       showDatePicker: boolean;
       showUserMenu: boolean;
       showBranchMenu: boolean;
       showConfirmationDialog: boolean;
     };
     data: {
       users: User[];
       branches: Branch[];
       selectedUser: User | null;
       selectedBranch: Branch | null;
     };
   }
   ```

5. **TaskApiService erweitern:**
   ```typescript
   class TaskApiService extends BaseApiService<Task> {
     constructor() {
       super('/tasks');
     }
     
     // Überschreibe create für bessere Fehlerbehandlung
     async create(data: Partial<Task>): Promise<Task> {
       try {
         const response = await this.axiosInstance.post<Task>(
           this.endpoint,
           this.prepareTaskData(data)
         );
         return this.validateTaskResponse(response.data);
       } catch (error) {
         throw this.handleTaskError(error, 'Erstellen');
       }
     }
     
     // Überschreibe update für bessere Fehlerbehandlung
     async update(id: number, data: Partial<Task>): Promise<Task> {
       try {
         const response = await this.axiosInstance.put<Task>(
           `${this.endpoint}/${id}`,
           this.prepareTaskData(data)
         );
         return this.validateTaskResponse(response.data);
       } catch (error) {
         throw this.handleTaskError(error, 'Aktualisieren');
       }
     }
     
     private prepareTaskData(data: Partial<Task>): Partial<Task> {
       // Validiere und bereinige Daten vor dem Senden
       return {
         ...data,
         title: data.title?.trim(),
         description: data.description?.trim() || null,
         dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null
       };
     }
     
     private validateTaskResponse(data: any): Task {
       if (!data || !data.id || !data.title) {
         throw new Error('Ungültige Antwort vom Server');
       }
       return data;
     }
     
     private handleTaskError(error: any, operation: string): Error {
       console.error(`Fehler beim ${operation} der Aufgabe:`, error);
       
       if (error.response?.data?.message) {
         return new Error(error.response.data.message);
       }
       
       if (error instanceof Error) {
         return error;
       }
       
       return new Error(`Die Aufgabe konnte nicht ${operation.toLowerCase()} werden.`);
     }
   }
   ```

#### Umsetzungsreihenfolge:

1. TaskApiService-Erweiterungen implementieren
2. State Management optimieren (taskFormReducer erweitern)
3. Task-Laden-Logik verbessern (useEffect & loadTask)
4. handleSave-Funktion überarbeiten
5. Manuelle Tests durchführen:
   - Task öffnen & Daten prüfen
   - Task bearbeiten & speichern
   - Neuen Task erstellen
   - Fehlerszenarien testen

#### Erwartete Verbesserungen:

1. **Zuverlässigkeit:**
   - Konsistentes Laden von Task-Daten
   - Robuste Fehlerbehandlung
   - Validierte API-Aufrufe

2. **Benutzerfreundlichkeit:**
   - Klare Fehlermeldungen
   - Sofortiges Feedback
   - Keine unerwarteten Modal-Zustände

3. **Wartbarkeit:**
   - Zentralisierte Fehlerbehandlung
   - Reduzierte State-Komplexität
   - Bessere Testbarkeit

#### Risiken & Gegenmaßnahmen:

1. **Datenverlust während der Bearbeitung:**
   - Implementiere Auto-Save für Entwürfe
   - Bestätigungsdialog beim Schließen

2. **API-Fehler:**
   - Offline-Support mit Queuing
   - Retry-Mechanismus für fehlgeschlagene Requests

3. **State-Inkonsistenzen:**
   - Strikte Validierung aller State-Änderungen
   - Logging für Debug-Zwecke

// ... existing code ...

## APK-Erstellung nach jeder Korrektur

Nach jeder der oben genannten Korrekturen ist eine neue APK zu erstellen und im Backend zu deployen. Dabei sind folgende Aspekte zu beachten:

1. **Vorbereitung vor dem Build:**
   - Stelle sicher, dass alle notwendigen Abhängigkeiten installiert sind
   - Führe `npm install` aus, wenn neue Pakete hinzugefügt wurden
   - Lösche eventuell vorhandene Caches mit `cd android && ./gradlew clean`
   - Stelle sicher, dass genügend Arbeitsspeicher für den Build verfügbar ist

2. **APK erstellen:**
   ```bash
   cd IntranetMobileApp
   cd android
   ./gradlew assembleRelease
   ```

3. **Überprüfung des Builds:**
   - Prüfe, ob die APK erfolgreich erstellt wurde
   - Untersuche die Build-Logs auf mögliche Warnungen oder Fehler
   - Stelle sicher, dass die APK-Größe angemessen ist

4. **Deployment und Tests:**
   - Kopiere die APK ins Backend:
   ```bash
   scp -i ~/.ssh/intranet_rsa IntranetMobileApp/android/app/build/outputs/apk/release/app-release.apk root@65.109.228.106:/var/www/intranet/backend/public/downloads/intranet-app.apk
   ```
   - Versuche alternativ, wenn der direkte Zugriff nicht möglich ist:
   ```bash
   adb install -r android/app/build/outputs/apk/release/app-release.apk
   ```
   - Teste jede Korrektur gründlich auf einem echten Gerät
   - Dokumentiere Fehler und Verhaltensweisen für weitere Verbesserungen 