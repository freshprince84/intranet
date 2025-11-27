# KOMPLETTE ANALYSE: Worktime Zeitzonen-Probleme

**Datum:** 2025-01-29  
**Status:** Analyse abgeschlossen, keine Änderungen vorgenommen

## Problembeschreibung

1. **Auto-Stop stoppt 5h zu früh**: Benutzer wird um 11:07 lokal gestoppt, obwohl er noch nicht die maximale Arbeitszeit erreicht hat
2. **Diagramm zeigt 5h zu viel**: Dashboard-Diagramm zeigt für aktive Zeitmessungen 5h zu viel an
3. **Frontend zeigt UTC-Zeit statt lokaler Zeit**: Im Modal wird 17:07 angezeigt, obwohl es lokal 11:07 ist (17:07 UTC)

## Grundlegendes Problem

**Dokumentation sagt:**
- Datenbank speichert **lokale Systemzeit** (ohne UTC-Konvertierung)
- Siehe `docs/modules/MODUL_ZEITERFASSUNG.md`: "Arbeitszeiten werden IMMER in lokaler Systemzeit gespeichert"
- Siehe `docs/technical/DATENBANKSCHEMA.md`: "startTime DateTime // Enthält die lokale Systemzeit des Benutzers ohne UTC-Konvertierung"

**Tatsächliches Verhalten:**
- Prisma/PostgreSQL speichert `DateTime` als UTC-Timestamp
- Wenn Backend `new Date()` erstellt (z.B. 11:07 lokal in Kolumbien), wird es als UTC-Timestamp gespeichert
- Beim Abrufen interpretiert Prisma den UTC-Timestamp und gibt ein Date-Objekt zurück, das die UTC-Zeit repräsentiert
- **Problem**: Die lokale Zeit (11:07) wird als UTC-Timestamp gespeichert, aber beim Abrufen wird sie als UTC interpretiert (11:07 UTC statt 11:07 lokal)

## Gefundene Probleme

### 1. Auto-Stop Funktion (`checkAndStopExceededWorktimes`)

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 1212-1214, 1238

**Problem:**
```typescript
// Zeile 1212-1214
const startTimeUtcMs = worktime.startTime.getTime(); // FALSCH: Interpretiert lokale Zeit als UTC
const nowUtcMs = now.getTime(); // KORREKT: UTC-Millisekunden
const currentSessionMs = nowUtcMs - startTimeUtcMs; // Differenz ist 5h zu groß!
```

**Erklärung:**
- `worktime.startTime` wurde als lokale Zeit gespeichert (z.B. 11:07 lokal)
- Prisma gibt es als Date-Objekt zurück, das 11:07 UTC repräsentiert (falsch!)
- `getTime()` gibt UTC-Millisekunden zurück: 11:07 UTC = falsche UTC-Millisekunden
- `Date.now()` gibt korrekte UTC-Millisekunden zurück: 16:07 UTC (korrekt)
- Differenz: 16:07 UTC - 11:07 UTC = 5h (falsch, sollte 0h sein, da beide 11:07 lokal sind)

**Weiteres Problem (Zeile 1238):**
```typescript
const endTimeNow = new Date(); // Wird als lokale Zeit gespeichert
// Aber Prisma interpretiert es als UTC beim Speichern
```

### 2. Diagramm-Berechnung (`getWorktimeStats`)

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 641-675

**Problem:**
```typescript
// Zeile 654
const startTimeUtcCorrected = fromZonedTime(entry.startTime, entry.timezone);
```

**Erklärung:**
- `fromZonedTime` erwartet ein Date-Objekt, das als **lokale Zeit** in der angegebenen Zeitzone interpretiert werden soll
- Aber `entry.startTime` ist bereits ein Date-Objekt, das Prisma als **UTC** interpretiert hat
- `fromZonedTime(entry.startTime, entry.timezone)` interpretiert 11:07 UTC als 11:07 lokal (Kolumbien) und konvertiert es zu 16:07 UTC
- Das ist falsch! `entry.startTime` repräsentiert bereits 11:07 UTC (falsch interpretiert), nicht 11:07 lokal

**Korrekte Logik wäre:**
- `entry.startTime` repräsentiert 11:07 UTC (falsch, sollte 11:07 lokal sein)
- Tatsächlich sollte es sein: 11:07 lokal = 16:07 UTC
- Aber Prisma hat 11:07 lokal als 11:07 UTC gespeichert
- Lösung: Wir müssen `entry.startTime` korrigieren, indem wir den Zeitzonen-Offset hinzufügen

### 3. Frontend Zeit-Anzeige (`formatTime`)

**Datei:** `frontend/src/utils/dateUtils.ts`  
**Zeilen:** 46-62

**Problem:**
```typescript
// Zeile 54-55
const hours = date.getUTCHours().toString().padStart(2, '0');
const minutes = date.getUTCMinutes().toString().padStart(2, '0');
```

**Erklärung:**
- `formatTime` verwendet `getUTCHours()` und `getUTCMinutes()`
- Wenn die DB 11:07 lokal speichert, aber Prisma es als 11:07 UTC zurückgibt, zeigt `formatTime` 11:07 an (UTC)
- Aber der Benutzer erwartet 11:07 lokal zu sehen
- Im Modal wird 17:07 angezeigt (UTC), obwohl es lokal 11:07 ist

**Weiteres Problem:**
- `formatTime` verwendet `parseISO(dateString)`, was den ISO-String als UTC interpretiert, wenn 'Z' vorhanden ist
- Backend sendet wahrscheinlich ISO-Strings mit 'Z' (z.B. "2025-01-29T11:07:00.000Z")
- `parseISO` interpretiert das als 11:07 UTC
- `getUTCHours()` gibt dann 11 zurück
- Aber tatsächlich sollte es 11:07 lokal sein, was 16:07 UTC entspricht

### 4. Abgeschlossene Zeitmessungen

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Zeilen:** 1199-1200

**Problem:**
```typescript
// Zeile 1199-1200
const workTimeMs = wt.endTime.getTime() - wt.startTime.getTime();
```

**Erklärung:**
- Beide Zeiten haben denselben Fehler (lokale Zeit als UTC interpretiert)
- Der Fehler hebt sich auf: (11:07 UTC - 08:57 UTC) = (11:07 lokal - 08:57 lokal) = korrekt
- **ABER**: Die Zeiten werden falsch angezeigt (UTC statt lokal)

## Betroffene Stellen

### Backend

1. **`checkAndStopExceededWorktimes`** (Zeile 1142-1268)
   - Zeile 1212-1214: Berechnung der aktuellen Sitzungsdauer
   - Zeile 1238: Speichern der Endzeit

2. **`getWorktimeStats`** (Zeile 442-913)
   - Zeile 641-675: Berechnung für aktive Zeitmessungen
   - Zeile 1199-1200: Berechnung für abgeschlossene Zeitmessungen (funktioniert, aber zeigt falsche Zeiten)

3. **`startWorktime`** (Zeile 14-151)
   - Zeile 52: `const now = startTime ? new Date(startTime) : new Date();`
   - Speichert lokale Zeit, aber Prisma interpretiert es als UTC

4. **`stopWorktime`** (Zeile 153-214)
   - Zeile 175: `const now = endTime ? new Date(endTime) : new Date();`
   - Speichert lokale Zeit, aber Prisma interpretiert es als UTC

### Frontend

1. **`formatTime`** (`frontend/src/utils/dateUtils.ts`, Zeile 46-62)
   - Verwendet `getUTCHours()` statt lokaler Stunden
   - Zeigt UTC-Zeit statt lokaler Zeit

2. **`WorktimeModal.tsx`**
   - Zeile 228, 231: Verwendet `formatTime()` für Anzeige
   - Zeigt UTC-Zeit statt lokaler Zeit

3. **`WorktimeTracker.tsx`**
   - Zeile 96-98: Entfernt 'Z' aus ISO-String
   - Zeile 100: Erstellt Date-Objekt
   - Berechnung könnte falsch sein, wenn 'Z' entfernt wird

## Lösungsansätze

### Option 1: Backend korrigiert Zeitzone beim Speichern

**Problem:** Wenn Backend `new Date()` erstellt (11:07 lokal), muss es explizit als UTC speichern (16:07 UTC).

**Lösung:**
```typescript
// Beim Speichern: Konvertiere lokale Zeit zu UTC
const now = new Date();
const utcTime = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
// Speichere utcTime statt now
```

**Nachteil:** Ändert das Speicherformat, könnte bestehende Daten beeinflussen.

### Option 2: Backend korrigiert Zeitzone beim Abrufen

**Problem:** Beim Abrufen muss die falsch interpretierte UTC-Zeit korrigiert werden.

**Lösung:**
```typescript
// Beim Abrufen: Korrigiere falsch interpretierte UTC-Zeit
if (entry.timezone) {
  // entry.startTime repräsentiert 11:07 UTC (falsch)
  // Tatsächlich sollte es sein: 11:07 lokal = 16:07 UTC
  // Korrigiere: Addiere Zeitzonen-Offset
  const correctedTime = new Date(entry.startTime.getTime() + getTimezoneOffset(entry.timezone) * 60000);
}
```

**Nachteil:** Komplex, muss überall angewendet werden.

### Option 3: Frontend korrigiert Anzeige

**Problem:** Frontend zeigt UTC-Zeit statt lokaler Zeit.

**Lösung:**
```typescript
// formatTime: Konvertiere UTC zu lokaler Zeit
const date = parseISO(dateString);
// Wenn dateString 'Z' hat, ist es UTC, konvertiere zu lokal
const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
const hours = localDate.getHours();
const minutes = localDate.getMinutes();
```

**Nachteil:** Nur kosmetisch, löst nicht das Auto-Stop Problem.

## Empfohlene Lösung

**Kombination aus Option 2 und 3:**

1. **Backend:** Korrigiere Zeitzone beim Abrufen für Berechnungen
   - In `checkAndStopExceededWorktimes`: Korrigiere `worktime.startTime` basierend auf `worktime.timezone`
   - In `getWorktimeStats`: Korrigiere `entry.startTime` basierend auf `entry.timezone`

2. **Frontend:** Korrigiere Anzeige
   - In `formatTime`: Zeige lokale Zeit statt UTC-Zeit
   - Berücksichtige, dass Backend UTC-Zeit sendet, aber es sollte lokale Zeit sein

## Wichtige Erkenntnisse

1. **Prisma/PostgreSQL speichert immer UTC**, auch wenn die Dokumentation sagt "lokale Zeit"
2. **Backend muss explizit UTC konvertieren** beim Speichern oder Abrufen
3. **Frontend muss lokale Zeit anzeigen**, nicht UTC-Zeit
4. **Zeitzone muss gespeichert werden** (`entry.timezone`), um korrekte Konvertierung zu ermöglichen

## Nächste Schritte

1. Prüfe, ob `entry.timezone` immer gespeichert wird
2. Implementiere Zeitzonen-Korrektur in `checkAndStopExceededWorktimes`
3. Implementiere Zeitzonen-Korrektur in `getWorktimeStats`
4. Korrigiere `formatTime` im Frontend
5. Teste mit verschiedenen Zeitzonen

