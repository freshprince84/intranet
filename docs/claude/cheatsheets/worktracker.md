# Worktracker-Komponente Cheat Sheet

## Überblick

Die `Worktracker`-Komponente ermöglicht Benutzern die Erfassung ihrer Arbeitszeiten durch Starten und Stoppen von Zeiterfassungssitzungen. Sie ist das Hauptinterface für die Arbeitszeiterfassung im Intranet.

## Dateipfad
`frontend/src/pages/Worktracker.tsx`

## Abhängigkeiten

- **Hooks**:
  - `useWorktime` (aus `WorktimeContext`)
  - `useAuth` (für Benutzeridentifikation)
  
- **Bibliotheken**:
  - `date-fns` (für Datums- und Zeitmanipulation)
  - `react-toastify` (für Benachrichtigungen)

## Hauptfunktionen

| Funktion | Beschreibung | Parameter | Rückgabewert |
|----------|--------------|-----------|--------------|
| `handleStartWorktime` | Startet eine neue Arbeitszeiterfassungssitzung | - | `Promise<void>` |
| `handleStopWorktime` | Beendet die aktive Arbeitszeiterfassungssitzung | - | `Promise<void>` |
| `handleDateChange` | Lädt Arbeitszeiten für das angegebene Datum | `date: Date` | `void` |
| `formatLocalTime` | Formatiert UTC-Zeitstempel in lokale Zeit | `utcTimeString: string` | `string` |
| `calculateDuration` | Berechnet die Dauer einer Sitzung | `session: WorktimeSession` | `string` |

## Zustandsverwaltung

| Zustand | Typ | Beschreibung |
|---------|-----|--------------|
| `comment` | `string` | Aktueller Kommentar für Start oder Ende |
| `selectedDate` | `Date` | Ausgewähltes Datum für die Anzeige von Sitzungen |

## Kontext-Eigenschaften (aus useWorktime)

| Eigenschaft | Typ | Beschreibung |
|-------------|-----|--------------|
| `currentSession` | `WorktimeSession \| null` | Aktuelle Arbeitszeiterfassungssitzung |
| `sessions` | `WorktimeSession[]` | Liste der Arbeitszeiterfassungssitzungen |
| `isTracking` | `boolean` | Gibt an, ob die Zeiterfassung aktiv ist |
| `loading` | `boolean` | Gibt an, ob Daten geladen werden |
| `startTracking` | `function` | Funktion zum Starten der Zeiterfassung |
| `stopTracking` | `function` | Funktion zum Beenden der Zeiterfassung |
| `fetchSessions` | `function` | Funktion zum Abrufen von Sitzungen |

## Typische Verwendungsbeispiele

### 1. Starten der Arbeitszeiterfassung

```typescript
const handleStartWorktime = async () => {
  try {
    await startTracking(comment || undefined);
    setComment('');
    toast.success('Arbeitszeiterfassung gestartet');
  } catch (error) {
    // Fehler wird bereits im Kontext behandelt
  }
};
```

### 2. Stoppen der Arbeitszeiterfassung

```typescript
const handleStopWorktime = async () => {
  try {
    await stopTracking(comment || undefined);
    setComment('');
    toast.success('Arbeitszeiterfassung gestoppt');
  } catch (error) {
    // Fehler wird bereits im Kontext behandelt
  }
};
```

### 3. Laden von Sitzungen für ein bestimmtes Datum

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

## Wichtige Überlegungen zu Zeitzonen

- Die Komponente zeigt Zeiten in der lokalen Zeitzone des Benutzers an
- Alle Zeitstempel werden in UTC im Backend gespeichert
- Die Formatierung in lokale Zeit erfolgt nur für die Anzeige
- Zeitdifferenzberechnungen verwenden direkt die ISO-Zeitstempel

## Häufige Fehler und Behebung

| Problem | Mögliche Ursache | Lösung |
|---------|------------------|--------|
| Falsche Zeiten werden angezeigt | Zeitzonenprobleme | Sicherstellen, dass `formatLocalTime` korrekt verwendet wird |
| Sitzung kann nicht gestartet werden | Bereits aktive Sitzung existiert | Prüfen, ob `isTracking` bereits `true` ist |
| Fehlende Sitzungen | Falscher Datumbereich | `startOfDay` und `endOfDay` korrekt setzen |
| Dauer falsch berechnet | Zeitzonenverschiebung | Direkt mit den ISO-Zeitstempeln rechnen, nicht mit formatierten Strings |

## Component Markup-Struktur

```jsx
<div className="p-4">
  <h1>Arbeitszeiterfassung</h1>
  
  {/* Eingabebereich */}
  <div className="mb-8 p-4 border rounded-lg shadow-sm">
    <h2>{isTracking ? 'Aktive Zeiterfassung' : 'Neue Zeiterfassung starten'}</h2>
    <textarea value={comment} onChange={...} />
    {isTracking ? (
      <button onClick={handleStopWorktime}>Zeiterfassung stoppen</button>
    ) : (
      <button onClick={handleStartWorktime}>Zeiterfassung starten</button>
    )}
  </div>
  
  {/* Sitzungsanzeige */}
  <div>
    <h2>Heutige Einträge</h2>
    <input type="date" value={...} onChange={handleDateChange} />
    {sessions.map(session => (
      <div key={session.id}>
        <p>Start: {formatLocalTime(session.startTime)}</p>
        <p>Ende: {session.endTime ? formatLocalTime(session.endTime) : 'Aktiv'}</p>
        <p>Dauer: {calculateDuration(session)}</p>
      </div>
    ))}
  </div>
</div>
```

## Memory Anchor

/* CLAUDE-ANCHOR: 8c721a3e-3f18-4d1b-b2ed-3c6a5e9b5c8f - WORKTRACKER_COMPONENT */

## Verwandte Komponenten

- **TeamWorktimeControl**: Zeigt Arbeitszeitdaten für ein ganzes Team an
- **WorktimeContext**: Verwaltet den Zustand der Arbeitszeiterfassung
- **Payroll**: Verwendet Arbeitszeitdaten für Abrechnungen

## Bekannte Einschränkungen

1. Keine Offline-Unterstützung - erfordert aktive Internetverbindung
2. Keine nachträgliche Bearbeitung von Sitzungen
3. Keine Bulk-Aktionen für mehrere Sitzungen 