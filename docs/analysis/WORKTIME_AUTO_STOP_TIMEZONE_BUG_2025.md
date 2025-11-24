# Problem: Arbeitszeit wird 5 Stunden zu früh automatisch gestoppt

## Problem-Beschreibung

Die automatische Stopp-Funktion für überschrittene Arbeitszeiten stoppt die Zeitmessung **5 Stunden zu früh**. Der Versatz entspricht genau dem Unterschied zwischen Systemzeit (Kolumbien, UTC-5) und UTC.

**Symptom:**
- Benutzer hat z.B. 8h normale Arbeitszeit im Profil
- Nach 3h tatsächlicher Arbeitszeit wird die Zeitmessung bereits automatisch gestoppt
- Die Zeitmessung kann nicht mehr gestartet werden, obwohl noch 5h erlaubt wären

## Root Cause

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Funktion:** `checkAndStopExceededWorktimes()`  
**Problemzeile:** Zeile 1185

### Fehlerhafte Berechnung der aktuellen Sitzung

```1182:1187:backend/src/controllers/worktimeController.ts
      // Füge die aktuelle laufende Sitzung hinzu
      // Konvertiere now nach UTC für konsistenten Vergleich mit worktime.startTime (aus DB)
      // getTimezoneOffset() gibt negative Werte für östliche Zeitzonen zurück, daher subtrahieren
      const nowUTC = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      const currentSessionMs = nowUTC.getTime() - worktime.startTime.getTime();
      const currentSessionHours = currentSessionMs / (1000 * 60 * 60);
```

**Das Problem:**

1. `now.getTime()` gibt bereits **UTC-Millisekunden** zurück
2. `now.getTimezoneOffset()` gibt den Offset in Minuten zurück:
   - Für Kolumbien (UTC-5): `getTimezoneOffset()` = `300` (positive Zahl)
3. Die Formel `now.getTime() - 300 * 60000` verschiebt die Zeit um **5 Stunden ZURÜCK**
4. Beispiel:
   - Aktuelle Zeit: `2025-01-22T10:00:00.000Z` (10:00 UTC)
   - `nowUTC` wird berechnet als: `2025-01-22T05:00:00.000Z` (05:00 UTC)
   - Die aktuelle Sitzung wird um **5 Stunden zu kurz** berechnet
   - Die Gesamtarbeitszeit wird um **5 Stunden zu niedrig** berechnet
   - Die Prüfung `if (totalWorkTimeHours >= worktime.user.normalWorkingHours)` schlägt **5 Stunden zu früh** an

### Warum ist das falsch?

- `now.getTime()` gibt bereits UTC-Millisekunden zurück
- `worktime.startTime.getTime()` gibt auch UTC-Millisekunden zurück (aus der Datenbank)
- Beide Werte sind bereits in UTC, daher ist die Differenz direkt korrekt
- **KEINE zusätzliche Zeitzonenumrechnung erforderlich!**

## Korrekte Lösung

Die Zeile 1185 sollte einfach sein:

```typescript
// KORREKT: Beide Werte sind bereits UTC-Millisekunden
const currentSessionMs = now.getTime() - worktime.startTime.getTime();
const currentSessionHours = currentSessionMs / (1000 * 60 * 60);
```

**Keine `nowUTC`-Berechnung erforderlich!**

## Betroffene Dateien

- `backend/src/controllers/worktimeController.ts` - Zeile 1185-1186
- `backend/dist/controllers/worktimeController.js` - Kompilierte Version (wird automatisch aktualisiert)

## Ausführung

Die Funktion `checkAndStopExceededWorktimes()` wird automatisch alle 2 Minuten aufgerufen:
- **Datei:** `backend/src/index.ts` (laut Dokumentation wird `index.ts` verwendet, nicht `app.ts`)
- **Zeile:** ~126-129 (Timer mit `setInterval`)

## Test-Szenario

1. **Benutzer:** Pat (Kolumbien, UTC-5)
2. **Normale Arbeitszeit:** 8h
3. **Tatsächliche Arbeitszeit:** 3h
4. **Erwartetes Verhalten:** Zeitmessung läuft weiter, kann noch 5h arbeiten
5. **Aktuelles Verhalten:** Zeitmessung wird nach 3h automatisch gestoppt (5h zu früh)

## Vergleich mit korrekter Implementierung

In `getWorktimeStats` (Zeile 639-641) wird die aktive Sitzung **korrekt** berechnet:

```639:641:backend/src/controllers/worktimeController.ts
        const startTimeUtcMs = entry.startTime.getTime(); // UTC-Millisekunden
        const nowUtcMs = Date.now(); // UTC-Millisekunden
        const diffMs = nowUtcMs - startTimeUtcMs;
```

**Diese Implementierung ist korrekt** und sollte als Vorlage für die Fix verwendet werden.

## Zusätzliche Probleme

Die Kommentare in Zeile 1183-1184 sind **irreführend**:
- Kommentar sagt: "getTimezoneOffset() gibt negative Werte für östliche Zeitzonen zurück"
- **FALSCH:** `getTimezoneOffset()` gibt **positive** Werte für östliche Zeitzonen zurück (UTC-5 = +300)
- Der Kommentar führt zu falscher Logik

## Zusammenfassung

**Problem:** Zeile 1185 berechnet `nowUTC` falsch durch Subtraktion des Zeitzonenoffsets, obwohl `now.getTime()` bereits UTC-Millisekunden zurückgibt.

**Lösung:** Zeile 1185 entfernen und direkt `now.getTime() - worktime.startTime.getTime()` verwenden.

**Impact:** Hoch - betrifft alle Benutzer in Zeitzonen außerhalb UTC, besonders UTC-5 (Kolumbien).

