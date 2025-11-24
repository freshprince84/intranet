# Szenario-Analyse: Was passiert beim Einschalten der Zeiterfassung?

## Ausgangssituation

- **Aktuelle Zeit:** 13:58 lokal in Kolumbien (18:58 UTC)
- **Bereits gearbeitet heute:** 10h 59m
- **Maximal erlaubt:** 16h
- **Aktion:** Zeiterfassung wird eingeschaltet

## Was passiert aktuell (FALSCH)

### 1. Beim Starten der Zeiterfassung (Frontend → Backend)

**Frontend sendet (WorktimeTracker.tsx, Zeile 231):**
```typescript
startTime: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
```

**Berechnung:**
- `new Date().getTime()` = 18:58 UTC (13:58 lokal)
- `getTimezoneOffset()` = 300 (für UTC-5)
- `startTime` = 18:58 UTC - 5h = **13:58 UTC** (FALSCH!)

**Backend empfängt (worktimeController.ts, Zeile 52):**
```typescript
const now = startTime ? new Date(startTime) : new Date();
```

**Problem:**
- `startTime` vom Frontend ist bereits falsch (13:58 UTC statt 18:58 UTC)
- Backend speichert: `startTime: now` (Zeile 117)
- **Gespeichert in DB:** 13:58 UTC (FALSCH - sollte 18:58 UTC sein!)

### 2. In den nächsten 2 Minuten - Auto-Stop-Prüfung läuft

**`checkAndStopExceededWorktimes()` wird alle 2 Minuten aufgerufen:**

**Berechnung der aktuellen Sitzung (Zeile 1185-1186):**
```typescript
const now = new Date(); // 18:58 UTC (13:58 lokal)
const nowUTC = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
// now.getTime() = 18:58 UTC
// getTimezoneOffset() = 300
// nowUTC = 18:58 UTC - 5h = 13:58 UTC (FALSCH!)

const currentSessionMs = nowUTC.getTime() - worktime.startTime.getTime();
// nowUTC.getTime() = 13:58 UTC (falsch berechnet)
// worktime.startTime.getTime() = 13:58 UTC (falsch gespeichert)
// currentSessionMs = 13:58 UTC - 13:58 UTC = 0ms = 0h
```

**Gesamtarbeitszeit:**
- Abgeschlossene Zeiten: 10h 59m ✅ (korrekt)
- Aktuelle Sitzung: 0h (falsch - sollte ~0h sein, aber Startzeit ist falsch)
- **Gesamt:** 10h 59m + 0h = 10h 59m

**Prüfung (Zeile 1204):**
```typescript
if (totalWorkTimeHours >= worktime.user.normalWorkingHours) {
  // 10h 59m >= 16h? NEIN → läuft weiter
}
```

**Ergebnis:** Zeitmessung läuft weiter (scheint korrekt, aber Startzeit ist falsch!)

### 3. Frontend-Anzeige (WorktimeTracker.tsx)

**Berechnung von `elapsedTime` (Zeile 96-104):**
```typescript
const startISOString = data.startTime.endsWith('Z') 
    ? data.startTime.substring(0, data.startTime.length - 1)  // ❌ ENTFERNT 'Z'!
    : data.startTime;
const startTimeDate = new Date(startISOString);  // ❌ Interpretiert OHNE 'Z' als LOKAL!

const now = new Date();
const diff = now.getTime() - startTimeDate.getTime();
```

**Was passiert:**
- `data.startTime` vom Backend: `"2025-11-24T13:58:00.000Z"` (13:58 UTC, falsch gespeichert)
- Frontend entfernt 'Z': `"2025-11-24T13:58:00.000"`
- JavaScript interpretiert OHNE 'Z' als lokal: 13:58 **lokal** = 18:58 UTC
- `now.getTime()` = 18:58 UTC (13:58 lokal)
- `startTimeDate.getTime()` = 18:58 UTC (13:58 lokal interpretiert)
- `diff` = 18:58 UTC - 18:58 UTC = 0ms = 0h

**Anzeige:** `00:00:00` (scheint korrekt, aber Startzeit ist falsch!)

### 4. Nach 2 Minuten (14:00 lokal = 19:00 UTC)

**Auto-Stop-Prüfung läuft erneut:**

**Berechnung:**
- `now` = 19:00 UTC (14:00 lokal)
- `nowUTC` = 19:00 UTC - 5h = 14:00 UTC (FALSCH!)
- `worktime.startTime` = 13:58 UTC (falsch gespeichert)
- `currentSessionMs` = 14:00 UTC - 13:58 UTC = 2 Minuten = 0.033h

**Gesamtarbeitszeit:**
- Abgeschlossene Zeiten: 10h 59m
- Aktuelle Sitzung: 0.033h (falsch - sollte 0.033h sein, aber Startzeit ist falsch)
- **Gesamt:** 10h 59m + 0.033h = 11h 0m

**Prüfung:**
- 11h 0m >= 16h? NEIN → läuft weiter ✅

**Frontend-Anzeige:**
- `diff` = 19:00 UTC - 18:58 UTC (falsch interpretiert) = 2 Minuten
- Anzeige: `00:02:00` (scheint korrekt, aber Startzeit ist falsch!)

## Was sollte passieren (KORREKT)

### 1. Beim Starten der Zeiterfassung

**Frontend sendet:**
```typescript
startTime: new Date()  // Direkt, ohne Zeitzonenmanipulation
```

**Backend empfängt:**
```typescript
const now = startTime ? new Date(startTime) : new Date();
// now = 18:58 UTC (13:58 lokal)
```

**Gespeichert in DB:** 18:58 UTC ✅ (korrekt!)

### 2. Auto-Stop-Prüfung

**Berechnung der aktuellen Sitzung:**
```typescript
const now = new Date(); // 18:58 UTC (13:58 lokal)
const currentSessionMs = now.getTime() - worktime.startTime.getTime();
// now.getTime() = 18:58 UTC
// worktime.startTime.getTime() = 18:58 UTC
// currentSessionMs = 18:58 UTC - 18:58 UTC = 0ms = 0h ✅
```

**Gesamtarbeitszeit:**
- Abgeschlossene Zeiten: 10h 59m
- Aktuelle Sitzung: 0h
- **Gesamt:** 10h 59m ✅

**Prüfung:**
- 10h 59m >= 16h? NEIN → läuft weiter ✅

### 3. Frontend-Anzeige

**Berechnung:**
```typescript
const startTimeDate = new Date(activeWorktime.startTime); // MIT 'Z' = UTC
const now = new Date();
const diff = now.getTime() - startTimeDate.getTime();
// now.getTime() = 18:58 UTC
// startTimeDate.getTime() = 18:58 UTC
// diff = 0ms = 0h ✅
```

**Anzeige:** `00:00:00` ✅ (korrekt!)

### 4. Nach 2 Minuten

**Auto-Stop-Prüfung:**
- `now` = 19:00 UTC (14:00 lokal)
- `worktime.startTime` = 18:58 UTC (korrekt gespeichert)
- `currentSessionMs` = 19:00 UTC - 18:58 UTC = 2 Minuten = 0.033h ✅

**Gesamtarbeitszeit:**
- Abgeschlossene Zeiten: 10h 59m
- Aktuelle Sitzung: 0.033h
- **Gesamt:** 10h 59m + 0.033h = 11h 0m ✅

**Prüfung:**
- 11h 0m >= 16h? NEIN → läuft weiter ✅

**Frontend-Anzeige:**
- `diff` = 19:00 UTC - 18:58 UTC = 2 Minuten
- Anzeige: `00:02:00` ✅ (korrekt!)

## Zusammenfassung der Probleme

### ❌ Aktuell (FALSCH):

1. **Frontend sendet falsche Startzeit:**
   - Sendet 13:58 UTC statt 18:58 UTC
   - Verschiebt Zeit um 5h zurück

2. **Backend speichert falsche Startzeit:**
   - Speichert 13:58 UTC statt 18:58 UTC
   - Verwendet falsche Zeit vom Frontend

3. **Auto-Stop-Prüfung berechnet falsch:**
   - `nowUTC` wird falsch berechnet (13:58 UTC statt 18:58 UTC)
   - Aber: Da Startzeit auch falsch ist, gleicht es sich zufällig aus
   - **Problem:** Wenn Startzeit korrekt wäre, würde Prüfung 5h zu früh stoppen!

4. **Frontend-Anzeige:**
   - Entfernt 'Z' und interpretiert UTC als lokal
   - Aber: Da Startzeit falsch ist, gleicht es sich zufällig aus
   - **Problem:** Wenn Startzeit korrekt wäre, würde Anzeige falsch sein!

### ✅ Mit Lösung (KORREKT):

1. **Frontend sendet korrekte Startzeit:**
   - Sendet 18:58 UTC direkt
   - Keine Zeitzonenmanipulation

2. **Backend speichert korrekte Startzeit:**
   - Speichert 18:58 UTC
   - Verwendet korrekte Zeit

3. **Auto-Stop-Prüfung berechnet korrekt:**
   - `now.getTime()` direkt verwenden (beide UTC)
   - Keine falsche Zeitzonenmanipulation

4. **Frontend-Anzeige:**
   - Behält 'Z' und interpretiert als UTC
   - Korrekte Berechnung

## Das Hauptproblem

**Zwei Fehler gleichen sich zufällig aus:**
- Frontend sendet falsche Zeit (5h zu früh)
- Backend speichert falsche Zeit (5h zu früh)
- Auto-Stop-Prüfung berechnet falsch (5h zu früh)
- Frontend-Anzeige interpretiert falsch (5h Verschiebung)

**Aber:** Da alle Fehler in die gleiche Richtung gehen, gleichen sie sich aus!

**Das Problem wird sichtbar, wenn:**
- Eine Komponente korrekt ist, aber andere falsch
- Oder wenn die Berechnung komplexer wird
- Oder wenn die Zeitzone sich ändert

**Die Lösung:** Alle Komponenten korrekt machen, nicht auf zufällige Ausgleichung verlassen!

