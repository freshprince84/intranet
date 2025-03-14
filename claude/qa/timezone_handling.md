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

### Zusammenfassung

Die korrekte Zeitzonenbehandlung in der Arbeitszeiterfassung beinhaltet:

1. Zeitstempel werden immer vom Server in UTC generiert
2. Das Frontend sendet keine Zeitstempel, nur IDs und optionale Kommentare
3. Für die Anzeige werden UTC-Zeitstempel in lokale Zeit konvertiert
4. Für Berechnungen werden die ursprünglichen Zeitstempel verwendet
5. Für Datumsbereiche werden vollständige Tage berücksichtigt (0:00:00 bis 23:59:59)

Diese Prinzipien gewährleisten eine konsistente und fehlerfreie Arbeitszeiterfassung unabhängig von der Zeitzone des Benutzers. 