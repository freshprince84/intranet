# Zeitzonenbehandlung in der Arbeitszeiterfassung

## Frage
Wie sollte die Arbeitszeiterfassung mit Zeitzonen umgehen, um Zeitstempeldiskrepanzen zu vermeiden, und wie ändere ich den Code entsprechend?

## Antwort

### Grundprinzipien der Zeitzonenbehandlung

Bei der Arbeitszeiterfassung gilt das Prinzip:
1. **Speichern in UTC**: Alle Zeitstempel in der Datenbank werden in UTC gespeichert
2. **Anzeigen in lokaler Zeit**: Die Anzeige erfolgt in der lokalen Zeitzone des Benutzers
3. **Server-generierte Zeitstempel**: Der Server generiert die Zeitstempel, nicht das Frontend

### Problematischer Code

Hier ist ein Beispiel für problematischen Code, der Zeitzonenprobleme verursacht:

```typescript
// In Worktracker.tsx (FALSCH)
const startWorktime = async () => {
  try {
    // Lokale Zeit wird verwendet und an den Server gesendet
    const startTime = new Date(); 
    await startTracking(startTime);
  } catch (error) {
    // Fehlerbehandlung
  }
};

// In WorktimeContext.tsx (FALSCH)
const startTracking = async (startTime: Date) => {
  try {
    // Zeitstempel vom Client wird weitergegeben
    const session = await worktimeApi.startWorktime(user!.id, startTime, comment);
    // Rest des Codes
  } catch (error) {
    // Fehlerbehandlung
  }
};

// In worktimeApi.ts (FALSCH)
export const startWorktime = async (
  userId: string, 
  startTime: Date,
  comment?: string
): Promise<WorktimeSession> => {
  try {
    // Client-Zeitstempel wird an API gesendet
    const response = await apiClient.post('/worktime/start', {
      userId,
      startTime: startTime.toISOString(),
      comment
    });
    return response.data;
  } catch (error) {
    // Fehlerbehandlung
  }
};
```

### Korrekte Implementierung

Hier ist die korrekte Implementierung, die Zeitzonenprobleme vermeidet:

```typescript
// In Worktracker.tsx (RICHTIG)
const handleStartWorktime = async () => {
  try {
    // Kein Zeitstempel wird übergeben, nur der Kommentar
    await startTracking(comment || undefined);
    setComment('');
    toast.success('Arbeitszeiterfassung gestartet');
  } catch (error) {
    // Fehlerbehandlung
  }
};

// In WorktimeContext.tsx (RICHTIG)
const startTracking = async (comment?: string) => {
  try {
    setLoading(true);
    // Kein Zeitstempel wird übergeben, der Server generiert ihn
    const session = await worktimeApi.startWorktime(user!.id, comment);
    setCurrentSession(session);
    setIsTracking(true);
    setSessions(prev => [session, ...prev]);
    setLoading(false);
  } catch (error) {
    // Fehlerbehandlung
  }
};

// In worktimeApi.ts (RICHTIG)
export const startWorktime = async (
  userId: string, 
  comment?: string
): Promise<WorktimeSession> => {
  try {
    // Kein Zeitstempel in der Anfrage
    const response = await apiClient.post('/worktime/start', {
      userId,
      comment
    });
    return response.data;
  } catch (error) {
    // Fehlerbehandlung
  }
};
```

### Serverseitige Implementierung

Im Backend sollte der Zeitstempel generiert werden:

```typescript
// In worktimeController.ts (RICHTIG)
export const startWorktime = async (req: Request, res: Response) => {
  try {
    const { userId, comment } = req.body;
    
    // Server generiert UTC-Zeitstempel
    const startTime = new Date();
    
    const worktimeSession = await prisma.worktimeSession.create({
      data: {
        userId,
        startTime, // UTC-Zeitstempel
        startComment: comment || null,
        isActive: true
      }
    });
    
    res.status(201).json(worktimeSession);
  } catch (error) {
    // Fehlerbehandlung
  }
};
```

### Anzeige in lokaler Zeit

Für die Anzeige der Zeiten in der Benutzeroberfläche:

```typescript
// In Worktracker.tsx
// Hilfsfunktion zum Formatieren von UTC-Zeitstempeln in lokale Zeit
const formatLocalTime = (utcTimeString: string) => {
  const date = new Date(utcTimeString);
  return format(date, 'HH:mm:ss', { locale: de });
};

// Verwendung in der Komponente
<p>
  <span className="font-semibold">Start:</span> {formatLocalTime(session.startTime)}
  {session.startComment && ` - ${session.startComment}`}
</p>
```

### Berechnung von Zeitdifferenzen

Bei der Berechnung von Zeitdifferenzen sollten die ISO-Strings in Date-Objekte umgewandelt werden:

```typescript
// Berechnen der Dauer für eine Sitzung
const calculateDuration = (session: WorktimeSession) => {
  const start = new Date(session.startTime);
  const end = session.endTime ? new Date(session.endTime) : new Date();
  
  const durationMs = end.getTime() - start.getTime();
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
};
```

### Zusätzliche Aspekte

1. **Datumsbereiche**: Bei der Auswahl von Datumsbereichen die vollständigen Tage berücksichtigen:

```typescript
const handleDateChange = (date: Date) => {
  setSelectedDate(date);
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  fetchSessions(startOfDay, endOfDay);
};
```

2. **Konsistenz bei API-Anfragen**: ISO-Strings für Datumsparameter verwenden:

```typescript
const fetchSessions = async (startDate: Date, endDate: Date) => {
  try {
    setLoading(true);
    
    const fetchedSessions = await worktimeApi.getWorktimeSessions(
      user!.id, 
      startDate.toISOString(), 
      endDate.toISOString()
    );
    
    setSessions(fetchedSessions);
    setLoading(false);
  } catch (error) {
    // Fehlerbehandlung
  }
};
```

### Probleme und Lösungen im EditWorktimeModal

Bei der Implementierung des `EditWorktimeModal` zur Bearbeitung von Arbeitszeiten müssen besondere Vorsichtsmaßnahmen getroffen werden, um Zeitzonenprobleme zu vermeiden.

#### Häufige Probleme

1. **Problemursache: Verwendung von `new Date()`**
   
   Die Verwendung von `new Date()` für eingegebene oder empfangene Datumszeichenketten kann zu Zeitzonenverschiebungen führen:

   ```typescript
   // FALSCH: Erzeugt Zeitzonenverschiebungen
   const formattedStartTime = format(new Date(entry.startTime), 'HH:mm');
   const formattedEndTime = entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '';
   ```

2. **Problemursache: Vergleich von Date-Objekten für die Validierung**

   ```typescript
   // FALSCH: Durch Umwandlung in Date-Objekte können Zeitzonenprobleme entstehen
   const startTime = new Date(`${entry.date}T${entry.startTime}`);
   const endTime = new Date(`${entry.date}T${entry.endTime}`);
   ```

#### Korrekte Implementierung

1. **String-Manipulation statt Date-Objekte**

   ```typescript
   // RICHTIG: Direktes Arbeiten mit Strings vermeidet Zeitzonenprobleme
   const formattedStartTime = entry.startTime.substring(11, 16); // Extrahiert HH:mm aus ISO-String
   const formattedEndTime = entry.endTime ? entry.endTime.substring(11, 16) : '';
   ```

2. **Validierung von Zeiteinträgen mit String-Vergleichen**

   ```typescript
   // RICHTIG: Verwendung von String-Vergleichen vermeidet Zeitzonenverschiebungen
   const validateEntries = (entries: WorktimeEntryForm[]): ValidationError[] => {
     const errors: ValidationError[] = [];
     
     // Zeiten als Strings vergleichen (Format: "HH:mm")
     for (let i = 0; i < entries.length; i++) {
       const entry = entries[i];
       
       if (!entry.startTime || !entry.endTime) continue;
       
       if (entry.startTime >= entry.endTime) {
         errors.push({
           index: i,
           message: 'Die Startzeit muss vor der Endzeit liegen'
         });
       }
       
       // Überlappungsprüfung mit anderen Einträgen
       for (let j = 0; j < entries.length; j++) {
         if (i === j) continue;
         
         const otherEntry = entries[j];
         if (!otherEntry.startTime || !otherEntry.endTime) continue;
         
         // Überlappung nur prüfen, wenn beide Einträge am selben Datum sind
         if (entry.date === otherEntry.date) {
           if (!(entry.endTime <= otherEntry.startTime || entry.startTime >= otherEntry.endTime)) {
             errors.push({
               index: i,
               message: `Zeitüberlappung mit Eintrag #${j + 1}`
             });
           }
         }
       }
     }
     
     return errors;
   };
   ```

3. **Korrekte Formatierung beim Speichern**

   ```typescript
   // RICHTIG: ISO-String-Format ohne Date-Objekte erstellen
   const handleSave = () => {
     // Nur geänderte Einträge an das Backend senden
     const updatedEntries = entries
       .filter(entry => entry.isModified && !entry.markedForDeletion)
       .map(entry => ({
         id: entry.id,
         userId: entry.userId,
         // ISO-String direkt aus den Formularwerten konstruieren
         startTime: `${entry.date}T${entry.startTime}:00.000Z`,
         endTime: entry.endTime ? `${entry.date}T${entry.endTime}:00.000Z` : null,
         comment: entry.comment || null
       }));
     
     const deletedEntries = entries
       .filter(entry => entry.markedForDeletion && entry.id)
       .map(entry => entry.id);
     
     // Aktualisierte und gelöschte Einträge an das Backend senden
     onSave(updatedEntries, deletedEntries);
   };
   ```

### Zeitzonenbehandlung im Backend

Im Backend sollten die empfangenen ISO-Strings mit Vorsicht behandelt werden:

```typescript
// In worktimeController.ts
export const updateWorktimeEntry = async (req: Request, res: Response) => {
  try {
    const { id, startTime, endTime, comment } = req.body;
    
    // Direkte Verwendung der ISO-Strings
    const updatedEntry = await prisma.worktimeEntry.update({
      where: { id },
      data: {
        startTime,  // ISO-String wird direkt verwendet
        endTime,    // ISO-String wird direkt verwendet
        comment: comment || null
      }
    });
    
    res.status(200).json(updatedEntry);
  } catch (error) {
    // Fehlerbehandlung
  }
};
```

### Zusammenfassung der Best Practices für EditWorktimeModal

1. **Direkte String-Manipulation verwenden** statt Date-Objekte für Zeitwerte
2. **Vermeide die Verwendung von `new Date()`** für Zeitstring-Konvertierungen
3. **Direkte String-Vergleiche für Validierungen** durchführen
4. **ISO-Strings ohne Date-Objekte erstellen** beim Speichern
5. **Nur geänderte Einträge an das Backend senden** für effizientere Datenverarbeitung

### Zusammenfassung

Die korrekte Zeitzonenbehandlung in der Arbeitszeiterfassung beinhaltet:

1. Zeitstempel werden immer vom Server in UTC generiert
2. Das Frontend sendet keine Zeitstempel, nur IDs und optionale Kommentare
3. Für die Anzeige werden UTC-Zeitstempel in lokale Zeit konvertiert
4. Für Berechnungen werden die ursprünglichen Zeitstempel verwendet
5. Für Datumsbereiche werden vollständige Tage berücksichtigt (0:00:00 bis 23:59:59)

Diese Prinzipien gewährleisten eine konsistente und fehlerfreie Arbeitszeiterfassung unabhängig von der Zeitzone des Benutzers. 