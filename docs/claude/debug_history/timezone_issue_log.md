# Debugging-Protokoll: Zeitzonenproblem bei Arbeitszeiterfassung

**Datum:** 2023-06-15  
**Komponenten:** Worktracker, TeamWorktimeControl, WorktimeContext  
**Problem-ID:** timezone-offset-issue  
**Status:** Gelöst  

## Problembeschreibung

Benutzer melden, dass Arbeitszeiten in der Datenbank nicht mit den Zeiten übereinstimmen, die sie in der Benutzeroberfläche sehen. Es gibt eine Diskrepanz zwischen den angezeigten und gespeicherten Zeiten, was zu falschen Berechnungen der Arbeitszeit führt.

## Symptome

1. Falsche Zeitstempel in der Datenbank
2. Diskrepanz zwischen angezeigten und gespeicherten Zeiten
3. Fehlerhafte Berechnungen der Arbeitszeit
4. Benutzer in verschiedenen Zeitzonen berichten von unterschiedlichen Ergebnissen

## Analyse

### Erster Hinweis

Bei der Untersuchung wurde festgestellt, dass die Zeitstempel in der Datenbank UTC-Zeiten sind, während die Benutzeroberfläche lokale Zeiten anzeigt. Das Problem tritt auf, weil die Konvertierung zwischen UTC und lokaler Zeit nicht konsistent durchgeführt wird.

```typescript
// Problematischer Code in Worktracker.tsx
const startWorktime = async () => {
  try {
    // Hier wird die lokale Zeit verwendet, die je nach Zeitzone variiert
    const startTime = new Date(); 
    await startTracking(startTime);
  } catch (error) {
    console.error("Fehler beim Starten der Arbeitszeiterfassung:", error);
    toast.error("Fehler beim Starten der Arbeitszeiterfassung");
  }
};
```

### Reproduktion

Das Problem kann reproduziert werden, indem ein Benutzer die Arbeitszeiterfassung startet und dann die gespeicherte Zeit in der Datenbank mit der angezeigten Zeit in der Benutzeroberfläche vergleicht. Die Differenz entspricht genau dem Zeitzonenunterschied zwischen dem lokalen System und UTC.

### Hauptursache

Die Hauptursache des Problems ist, dass die Anwendung manchmal lokale Zeiten und manchmal UTC-Zeiten verwendet, ohne konsequent zwischen ihnen zu konvertieren. Insbesondere:

1. Beim Starten der Arbeitszeiterfassung wird die lokale Zeit verwendet.
2. Die API erwartet jedoch UTC-Zeiten.
3. Beim Laden von Daten aus der API werden UTC-Zeiten zurückgegeben.
4. Die Benutzeroberfläche zeigt lokale Zeiten an.

## Lösung

Die Lösung besteht darin, konsequent UTC-Zeiten für alle API-Operationen zu verwenden und lokale Zeiten nur für die Anzeige zu verwenden. Insbesondere:

1. Verwenden von `Date.now()` für konsistente UTC-Zeitstempel
2. Konvertieren in lokale Zeiten nur für die Anzeige
3. Überarbeitung der API-Aufrufe, um sicherzustellen, dass alle Zeitstempel in UTC gesendet werden

### Codeänderungen

```typescript
// Korrigierter Code in Worktracker.tsx
const startWorktime = async () => {
  try {
    // Verwenden von Date.now() für UTC-Zeit
    await startTracking();
  } catch (error) {
    console.error("Fehler beim Starten der Arbeitszeiterfassung:", error);
    toast.error("Fehler beim Starten der Arbeitszeiterfassung");
  }
};

// Korrigierter Code in WorktimeContext.tsx
const startTracking = async (comment?: string) => {
  try {
    setLoading(true);
    // Die API-Funktion kümmert sich um den UTC-Zeitstempel
    const session = await api.startWorktime(user!.id, comment);
    setCurrentSession(session);
    setIsTracking(true);
    setSessions(prev => [session, ...prev]);
    setLoading(false);
  } catch (error) {
    setError("Fehler beim Starten der Arbeitszeiterfassung");
    setLoading(false);
    throw error;
  }
};
```

### API-Änderungen

```typescript
// Korrigierter Code in worktimeApi.ts
export const startWorktime = async (userId: string, comment?: string): Promise<WorktimeSession> => {
  try {
    const response = await apiClient.post('/worktime/start', {
      userId,
      // UTC-Zeitstempel wird vom Server generiert
      comment
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};
```

### Backend-Änderungen

```typescript
// Korrigierter Code im Backend-Controller
export const startWorktime = async (req: Request, res: Response) => {
  try {
    const { userId, comment } = req.body;
    
    // UTC-Zeitstempel wird vom Server generiert
    const startTime = new Date();
    
    const worktimeSession = await prisma.worktimeSession.create({
      data: {
        userId,
        startTime,
        startComment: comment || null,
        isActive: true
      }
    });
    
    res.status(201).json(worktimeSession);
  } catch (error) {
    res.status(500).json({ error: "Fehler beim Starten der Arbeitszeiterfassung" });
  }
};
```

## Verifizierung

Nach der Implementierung der Änderungen wurden folgende Tests durchgeführt:

1. Starten und Stoppen der Arbeitszeiterfassung in verschiedenen Zeitzonen
2. Überprüfen der gespeicherten Werte in der Datenbank
3. Vergleichen der angezeigten Zeiten in der Benutzeroberfläche

Alle Tests waren erfolgreich, und die Zeiten werden nun korrekt gespeichert und angezeigt.

## Erkenntnisse

- Zeitzonen sind eine häufige Fehlerquelle in Webanwendungen
- Es ist wichtig, konsequent mit einer bestimmten Zeitrepräsentation (z.B. UTC) zu arbeiten
- Konvertierungen zwischen Zeitzonen sollten nur an der Benutzeroberfläche stattfinden
- Datenbank und API sollten immer UTC-Zeiten verwenden

## Präventive Maßnahmen

1. Erstellen von Hilfsfunktionen für die Zeitzonenkonvertierung
2. Hinzufügen von Dokumentation zur Zeitbehandlung
3. Hinzufügen von Tests für die Zeitzonenhandhabung
4. Code-Review mit Fokus auf Zeitzonenprobleme 