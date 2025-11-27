# CODE-STELLEN: Worktime Zeitzonen-Probleme mit Beweisen

**Datum:** 2025-01-29  
**Status:** Nur Analyse, keine Änderungen

## PROBLEM 1: Auto-Stop stoppt 5h zu früh

### Code-Stelle 1.1: Berechnung der aktuellen Sitzungsdauer

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 1212-1214

**Aktueller Code:**
```typescript
const startTimeUtcMs = worktime.startTime.getTime(); // UTC-Millisekunden
const nowUtcMs = now.getTime(); // UTC-Millisekunden
const currentSessionMs = nowUtcMs - startTimeUtcMs;
```

**Beweis, dass es falsch ist:**

1. **Was passiert beim Speichern:**
   - Zeile 52: `const now = new Date();` → Erstellt Date-Objekt mit aktueller lokaler Zeit (z.B. 11:07 lokal in Kolumbien)
   - Prisma speichert `DateTime` in PostgreSQL als UTC-Timestamp
   - **Problem:** `new Date()` in Kolumbien (UTC-5) erstellt 11:07 lokal, aber Prisma speichert es als 11:07 UTC (falsch!)

2. **Was passiert beim Abrufen:**
   - Prisma gibt `worktime.startTime` als Date-Objekt zurück
   - Das Date-Objekt repräsentiert 11:07 UTC (weil es so gespeichert wurde)
   - `worktime.startTime.getTime()` gibt UTC-Millisekunden für 11:07 UTC zurück

3. **Was passiert bei der Berechnung:**
   - `now.getTime()` = UTC-Millisekunden für aktuelle Zeit (z.B. 16:07 UTC = 11:07 lokal)
   - `startTimeUtcMs` = UTC-Millisekunden für 11:07 UTC (falsch, sollte 16:07 UTC sein)
   - Differenz: 16:07 UTC - 11:07 UTC = **5h zu groß!**

**Wie es geändert werden muss:**

```typescript
// KORREKT: Korrigiere startTime basierend auf timezone
if (worktime.timezone) {
  // worktime.startTime repräsentiert 11:07 UTC (falsch)
  // Tatsächlich sollte es sein: 11:07 lokal = 16:07 UTC
  // Lösung: Addiere Zeitzonen-Offset
  const timezoneOffset = getTimezoneOffsetMinutes(worktime.timezone); // z.B. -300 für UTC-5
  const startTimeUtcCorrected = new Date(worktime.startTime.getTime() - timezoneOffset * 60000);
  const startTimeUtcMs = startTimeUtcCorrected.getTime();
} else {
  // Fallback: Verwende direkte Differenz (kann falsch sein)
  const startTimeUtcMs = worktime.startTime.getTime();
}
const nowUtcMs = now.getTime();
const currentSessionMs = nowUtcMs - startTimeUtcMs;
```

**Hilfsfunktion benötigt:**
```typescript
function getTimezoneOffsetMinutes(timezone: string): number {
  // Gibt Offset in Minuten zurück (z.B. -300 für America/Bogota UTC-5)
  const now = new Date();
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return (localTime.getTime() - utcTime.getTime()) / 60000;
}
```

---

### Code-Stelle 1.2: Speichern der Endzeit beim Auto-Stop

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 1238

**Aktueller Code:**
```typescript
const endTimeNow = new Date();
```

**Beweis, dass es falsch ist:**

- `new Date()` erstellt Date-Objekt mit aktueller lokaler Zeit (z.B. 11:07 lokal)
- Prisma speichert es als UTC-Timestamp (11:07 UTC statt 11:07 lokal)
- Beim Abrufen wird es als 11:07 UTC interpretiert (falsch!)

**Wie es geändert werden muss:**

```typescript
// KORREKT: Speichere explizit als UTC, wenn timezone vorhanden
const endTimeNow = new Date();
// Prisma speichert bereits als UTC, daher ist das korrekt
// ABER: Beim Abrufen muss es korrigiert werden (siehe Problem 2)
```

**Hinweis:** Das Speichern ist eigentlich korrekt (Prisma konvertiert automatisch zu UTC). Das Problem ist beim Abrufen und Berechnen.

---

## PROBLEM 2: Diagramm zeigt 5h zu viel für aktive Zeitmessungen

### Code-Stelle 2.1: Berechnung für aktive Zeitmessungen in getWorktimeStats

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 641-675

**Aktueller Code:**
```typescript
if (entry.endTime === null) {
  if (entry.timezone) {
    const startTimeUtcCorrected = fromZonedTime(entry.startTime, entry.timezone);
    const nowUtcMs = Date.now();
    const startTimeUtcMs = startTimeUtcCorrected.getTime();
    const diffMs = nowUtcMs - startTimeUtcMs;
    hoursWorked = diffMs / (1000 * 60 * 60);
  }
}
```

**Beweis, dass es falsch ist:**

1. **Was `fromZonedTime` macht:**
   - `fromZonedTime(date, timezone)` interpretiert `date` als **lokale Zeit** in `timezone` und konvertiert es zu UTC
   - Beispiel: `fromZonedTime(11:07 UTC, "America/Bogota")` interpretiert 11:07 UTC als 11:07 lokal (Kolumbien) und konvertiert zu 16:07 UTC

2. **Was tatsächlich passiert:**
   - `entry.startTime` ist ein Date-Objekt, das 11:07 UTC repräsentiert (falsch, sollte 11:07 lokal sein)
   - `fromZonedTime(entry.startTime, entry.timezone)` interpretiert 11:07 UTC als 11:07 lokal und konvertiert zu 16:07 UTC
   - **Problem:** `entry.startTime` repräsentiert bereits 11:07 UTC (falsch interpretiert), nicht 11:07 lokal!

3. **Korrekte Logik:**
   - `entry.startTime` wurde als 11:07 lokal gespeichert
   - Prisma gibt es als 11:07 UTC zurück (falsch!)
   - Tatsächlich sollte es sein: 11:07 lokal = 16:07 UTC
   - Lösung: Addiere Zeitzonen-Offset zu `entry.startTime.getTime()`

**Wie es geändert werden muss:**

```typescript
if (entry.endTime === null) {
  if (entry.timezone) {
    // entry.startTime repräsentiert 11:07 UTC (falsch)
    // Tatsächlich sollte es sein: 11:07 lokal = 16:07 UTC
    // Lösung: Addiere Zeitzonen-Offset
    const timezoneOffset = getTimezoneOffsetMinutes(entry.timezone); // z.B. -300 für UTC-5
    const startTimeUtcCorrected = new Date(entry.startTime.getTime() - timezoneOffset * 60000);
    
    const nowUtcMs = Date.now();
    const startTimeUtcMs = startTimeUtcCorrected.getTime();
    const diffMs = nowUtcMs - startTimeUtcMs;
    hoursWorked = diffMs / (1000 * 60 * 60);
    
    actualStartTime = startTimeUtcCorrected;
    actualEndTime = effectiveEndTime;
  } else {
    // Fallback: Direkte Differenz (kann falsch sein)
    const startTimeUtcMs = entry.startTime.getTime();
    const nowUtcMs = Date.now();
    const diffMs = nowUtcMs - startTimeUtcMs;
    hoursWorked = diffMs / (1000 * 60 * 60);
    
    actualStartTime = entry.startTime;
    actualEndTime = effectiveEndTime;
  }
}
```

---

## PROBLEM 3: Frontend zeigt UTC-Zeit statt lokaler Zeit

### Code-Stelle 3.1: formatTime Funktion

**Datei:** `frontend/src/utils/dateUtils.ts`  
**Zeilen:** 46-62

**Aktueller Code:**
```typescript
export const formatTime = (dateString: string): string => {
    if (!dateString) return '-';
    
    try {
        const date = parseISO(dateString);
        
        // Verwende UTC-Stunden und -Minuten, um die DB-Zeit direkt zu zeigen
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        
        return `${hours}:${minutes}`;
    } catch (error) {
        console.error(`Fehler beim Formatieren der Zeit für ${dateString}:`, error);
        return '-';
    }
};
```

**Beweis, dass es falsch ist:**

1. **Was passiert:**
   - Backend sendet ISO-String mit 'Z' (z.B. `"2025-01-29T11:07:00.000Z"`)
   - `parseISO(dateString)` interpretiert es als 11:07 UTC
   - `getUTCHours()` gibt 11 zurück
   - Frontend zeigt 11:07 an

2. **Was tatsächlich sein sollte:**
   - Die Zeit wurde als 11:07 lokal gespeichert
   - Backend sendet 11:07 UTC (weil Prisma es so interpretiert)
   - Frontend sollte 11:07 lokal anzeigen, nicht 11:07 UTC

3. **Problem:**
   - Wenn Backend `"2025-01-29T11:07:00.000Z"` sendet, ist das 11:07 UTC
   - Aber tatsächlich wurde 11:07 lokal gespeichert
   - Frontend zeigt 11:07 UTC an, Benutzer erwartet 11:07 lokal

**Wie es geändert werden muss:**

**Option A: Backend sendet lokale Zeit (besser):**
```typescript
// Backend muss korrigieren, bevor es sendet
// In worktimeController.ts, bevor JSON-Response:
if (worktime.timezone) {
  const timezoneOffset = getTimezoneOffsetMinutes(worktime.timezone);
  const correctedTime = new Date(worktime.startTime.getTime() - timezoneOffset * 60000);
  worktime.startTime = correctedTime; // Für Response
}
```

**Option B: Frontend korrigiert Anzeige:**
```typescript
export const formatTime = (dateString: string, timezone?: string): string => {
    if (!dateString) return '-';
    
    try {
        const date = parseISO(dateString);
        
        // Wenn timezone vorhanden, konvertiere UTC zu lokaler Zeit
        if (timezone) {
            // date repräsentiert UTC-Zeit (z.B. 11:07 UTC)
            // Tatsächlich sollte es sein: 11:07 lokal = 16:07 UTC
            // Korrigiere: Subtrahiere Zeitzonen-Offset
            const timezoneOffset = getTimezoneOffsetMinutes(timezone);
            const correctedDate = new Date(date.getTime() - timezoneOffset * 60000);
            const hours = correctedDate.getUTCHours().toString().padStart(2, '0');
            const minutes = correctedDate.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        } else {
            // Fallback: Zeige UTC-Zeit
            const hours = date.getUTCHours().toString().padStart(2, '0');
            const minutes = date.getUTCMinutes().toString().padStart(2, '0');
            return `${hours}:${minutes}`;
        }
    } catch (error) {
        console.error(`Fehler beim Formatieren der Zeit für ${dateString}:`, error);
        return '-';
    }
};
```

**Hilfsfunktion für Frontend:**
```typescript
function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return (localTime.getTime() - utcTime.getTime()) / 60000;
}
```

---

## PROBLEM 4: Abgeschlossene Zeitmessungen werden falsch angezeigt

### Code-Stelle 4.1: Berechnung für abgeschlossene Zeitmessungen

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 1199-1200

**Aktueller Code:**
```typescript
const workTimeMs = wt.endTime.getTime() - wt.startTime.getTime();
```

**Beweis, dass Berechnung funktioniert, aber Anzeige falsch ist:**

1. **Berechnung:**
   - Beide Zeiten haben denselben Fehler (lokale Zeit als UTC interpretiert)
   - `wt.startTime.getTime()` = 08:57 UTC (falsch, sollte 08:57 lokal sein)
   - `wt.endTime.getTime()` = 11:07 UTC (falsch, sollte 11:07 lokal sein)
   - Differenz: 11:07 UTC - 08:57 UTC = 2h 10m (korrekt, weil Fehler sich aufhebt)

2. **Anzeige:**
   - Frontend zeigt 08:57 und 11:07 UTC an
   - Benutzer erwartet 08:57 und 11:07 lokal

**Wie es geändert werden muss:**

- Berechnung bleibt gleich (funktioniert)
- Anzeige muss korrigiert werden (siehe Problem 3)

---

## ZUSAMMENFASSUNG: Alle betroffenen Code-Stellen

### Backend

1. **`checkAndStopExceededWorktimes`** (Zeile 1212-1214)
   - Problem: `worktime.startTime.getTime()` interpretiert lokale Zeit als UTC
   - Lösung: Zeitzonen-Offset hinzufügen

2. **`getWorktimeStats`** (Zeile 654)
   - Problem: `fromZonedTime` wird falsch verwendet
   - Lösung: Zeitzonen-Offset direkt hinzufügen statt `fromZonedTime`

3. **`formatTime` Frontend** (Zeile 54-55)
   - Problem: `getUTCHours()` zeigt UTC-Zeit statt lokaler Zeit
   - Lösung: Zeitzonen-Offset anwenden oder Backend korrigieren

### Frontend

1. **`formatTime`** (`dateUtils.ts` Zeile 46-62)
   - Problem: Zeigt UTC-Zeit statt lokaler Zeit
   - Lösung: Zeitzonen-Offset anwenden

2. **`WorktimeModal.tsx`** (Zeile 228, 231)
   - Problem: Verwendet `formatTime()` ohne timezone-Parameter
   - Lösung: timezone-Parameter übergeben

---

## HILFSFUNKTION: getTimezoneOffsetMinutes

**Benötigt in beiden Backend und Frontend:**

**Methode 1: Mit Intl.DateTimeFormat (empfohlen):**
```typescript
function getTimezoneOffsetMinutes(timezone: string): number {
  // Gibt Offset in Minuten zurück (z.B. -300 für America/Bogota UTC-5)
  // Negativ = Zeit ist hinter UTC (z.B. Kolumbien UTC-5 = -300)
  const now = new Date();
  
  // Erstelle zwei Formatter: einen für UTC, einen für die Zeitzone
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const tzFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Parse die formatierten Strings zurück zu Date-Objekten
  const utcParts = utcFormatter.formatToParts(now);
  const tzParts = tzFormatter.formatToParts(now);
  
  const utcDate = new Date(
    parseInt(utcParts.find(p => p.type === 'year')!.value),
    parseInt(utcParts.find(p => p.type === 'month')!.value) - 1,
    parseInt(utcParts.find(p => p.type === 'day')!.value),
    parseInt(utcParts.find(p => p.type === 'hour')!.value),
    parseInt(utcParts.find(p => p.type === 'minute')!.value)
  );
  
  const tzDate = new Date(
    parseInt(tzParts.find(p => p.type === 'year')!.value),
    parseInt(tzParts.find(p => p.type === 'month')!.value) - 1,
    parseInt(tzParts.find(p => p.type === 'day')!.value),
    parseInt(tzParts.find(p => p.type === 'hour')!.value),
    parseInt(tzParts.find(p => p.type === 'minute')!.value)
  );
  
  // Berechne Differenz in Minuten
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}
```

**Methode 2: Einfacher mit toZonedTime (wenn date-fns-tz verfügbar):**
```typescript
import { toZonedTime } from 'date-fns-tz';

function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  const utcTime = now.getTime();
  const zonedTime = toZonedTime(now, timezone);
  
  // Berechne Differenz zwischen UTC und zoned time
  // toZonedTime gibt lokale Zeit zurück, aber als Date-Objekt
  // Wir müssen die UTC-Komponenten vergleichen
  const utcHours = now.getUTCHours();
  const zonedHours = zonedTime.getHours();
  
  // Einfacher: Verwende getTimezoneOffset des zonedTime-Objekts
  // ABER: Das funktioniert nicht direkt, da toZonedTime die Zeit nicht verschiebt
  
  // Besser: Berechne manuell
  const utcDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes()
  ));
  
  const zonedDate = new Date(Date.UTC(
    zonedTime.getFullYear(),
    zonedTime.getMonth(),
    zonedTime.getDate(),
    zonedTime.getHours(),
    zonedTime.getMinutes()
  ));
  
  return (zonedDate.getTime() - utcDate.getTime()) / 60000;
}
```

**Methode 3: Einfachste Lösung (empfohlen für Backend):**
```typescript
// Für eine gegebene Zeitzone: Berechne Offset für aktuelles Datum
function getTimezoneOffsetMinutes(timezone: string): number {
  const now = new Date();
  
  // Erstelle ein Date-Objekt in UTC
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  
  // Erstelle ein Date-Objekt in der Ziel-Zeitzone
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // Berechne Differenz
  return (tzDate.getTime() - utcDate.getTime()) / 60000;
}
```

**WICHTIG:** Methode 3 ist am einfachsten, aber kann bei DST (Daylight Saving Time) Probleme haben. Für Kolumbien (keine DST) funktioniert es.

---

## WICHTIG: Reihenfolge der Änderungen

1. **Zuerst:** Hilfsfunktion `getTimezoneOffsetMinutes` implementieren
2. **Dann:** Backend `checkAndStopExceededWorktimes` korrigieren
3. **Dann:** Backend `getWorktimeStats` korrigieren
4. **Dann:** Frontend `formatTime` korrigieren
5. **Dann:** Frontend `WorktimeModal` anpassen (timezone übergeben)

**NICHT alles auf einmal ändern! Schritt für Schritt testen!**

