# Analyse: Seltsame Zeiterfassungseinträge auf Produktivserver

**Datum:** 2025-02-01  
**Problem:** User werden angezeigt, die keine Zeit gestoppt haben und sich nicht einmal eingeloggt haben, aber trotzdem als hätten sie Zeit erfasst angezeigt werden.

## Problembeschreibung

Auf dem Produktivserver werden Zeiterfassungseinträge angezeigt für User, die:
1. Keine Zeit gestoppt haben
2. Sich nicht einmal eingeloggt haben
3. Aber trotzdem als hätten sie Zeit erfasst angezeigt werden

Die automatische Stopp-Funktion (bei Erreichen der täglichen Arbeitszeit) funktioniert offenbar nicht korrekt.

## Code-Analyse

### 1. Automatisches Stoppen von Zeiterfassungen

**Datei:** `backend/src/app.ts` (Zeile 151-157)
```typescript
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 Minuten
let worktimeCheckInterval: NodeJS.Timeout | null = null;
worktimeCheckInterval = setInterval(async () => {
  logger.log('Starte automatische Überprüfung der Arbeitszeiten...');
  await checkAndStopExceededWorktimes();
}, CHECK_INTERVAL_MS);
```

Die Funktion `checkAndStopExceededWorktimes` wird alle 2 Minuten aufgerufen.

### 2. Funktion checkAndStopExceededWorktimes

**Datei:** `backend/src/controllers/worktimeController.ts` (Zeile 1129-1278)

**Aktuelle Logik:**
1. Findet alle aktiven WorkTime-Einträge mit `endTime: null` (Zeile 1137-1145)
2. Für jeden Eintrag:
   - Berechnet die gesamte Arbeitszeit für heute (inkl. laufender Sitzung)
   - Stoppt automatisch, wenn `totalWorkTimeHours >= user.normalWorkingHours` (Zeile 1239)

**Problem:** Die Funktion stoppt nur, wenn die tägliche Arbeitszeit erreicht ist. Sie stoppt NICHT:
- Einträge, die mehrere Tage alt sind
- Einträge von Usern, die sich nicht mehr eingeloggt haben
- Einträge, die aus anderen Gründen "hängen geblieben" sind

### 3. Anzeige aktiver Zeiterfassungen

**Datei:** `backend/src/controllers/teamWorktimeController.ts` (Zeile 12-66)

**Aktuelle Abfrage:**
```typescript
const activeWorktimes = await prisma.workTime.findMany({
  where: {
    ...worktimeFilter,
    endTime: null  // ← Nur Filter: endTime muss null sein
  },
  include: {
    user: { ... },
    branch: true
  }
});
```

**Problem:** Die Abfrage filtert nur nach `endTime: null`, aber prüft nicht:
- Ob die Zeiterfassung sehr alt ist (z.B. mehrere Tage)
- Ob der User sich jemals eingeloggt hat
- Ob die Zeiterfassung überhaupt noch relevant ist

### 4. Erstellung von Zeiterfassungseinträgen

**Datei:** `backend/src/controllers/worktimeController.ts` (Zeile 15-152)

**Erstellung erfolgt nur:**
- Wenn User authentifiziert ist (`req.userId` muss vorhanden sein)
- Wenn User keine aktive Zeiterfassung hat
- Wenn User `bankDetails` ausgefüllt hat
- Wenn tägliche Arbeitszeit noch nicht erreicht ist

**Fazit:** Einträge können nur durch expliziten API-Call erstellt werden (nicht automatisch).

## Root Cause Analyse

### Mögliche Ursachen:

1. **Alte "hängende" Einträge:**
   - Einträge mit `endTime: null`, die mehrere Tage alt sind
   - Wurden nicht automatisch gestoppt, weil die tägliche Arbeitszeit nicht erreicht wurde
   - Werden weiterhin als "aktiv" angezeigt

2. **Automatisches Stoppen funktioniert nicht korrekt:**
   - Die Funktion `checkAndStopExceededWorktimes` prüft nur, ob die tägliche Arbeitszeit erreicht ist
   - Sie stoppt NICHT alte Einträge, die mehrere Tage alt sind
   - Sie stoppt NICHT Einträge, die aus anderen Gründen "hängen geblieben" sind

3. **Keine Bereinigung alter Einträge:**
   - Es gibt keine Cleanup-Funktion für alte, hängende Einträge
   - Einträge bleiben in der Datenbank, auch wenn sie nicht mehr relevant sind

## Betroffene Stellen im Code

1. **`backend/src/controllers/worktimeController.ts`:**
   - `checkAndStopExceededWorktimes()` - Funktion zum automatischen Stoppen
   - Prüft nur tägliche Arbeitszeit, nicht Alter der Einträge

2. **`backend/src/controllers/teamWorktimeController.ts`:**
   - `getActiveTeamWorktimes()` - Anzeige aktiver Zeiterfassungen
   - Filtert nur nach `endTime: null`, nicht nach Alter oder Relevanz

3. **`backend/src/app.ts`:**
   - Timer für automatische Überprüfung (alle 2 Minuten)

## Lösungsansätze

### Lösung 1: Erweiterte Prüfung in checkAndStopExceededWorktimes

**Was:** Erweitere die Funktion `checkAndStopExceededWorktimes`, um auch alte Einträge zu stoppen.

**Kriterien für automatisches Stoppen:**
1. Tägliche Arbeitszeit erreicht (bestehend)
2. **NEU:** Eintrag ist älter als X Stunden (z.B. 24 Stunden)
3. **NEU:** Eintrag ist älter als 1 Tag (Startzeit ist nicht heute)

**Vorteile:**
- Bereinigt automatisch alte, hängende Einträge
- Keine manuelle Intervention nötig
- Funktioniert für alle zukünftigen Fälle

**Nachteile:**
- Könnte auch legitime, sehr lange Zeiterfassungen stoppen (z.B. bei Nachtarbeit)

### Lösung 2: Filter in getActiveTeamWorktimes

**Was:** Erweitere die Abfrage in `getActiveTeamWorktimes`, um nur relevante Einträge anzuzeigen.

**Kriterien für Anzeige:**
1. `endTime: null` (bestehend)
2. **NEU:** Startzeit ist nicht älter als X Stunden (z.B. 24 Stunden)
3. **NEU:** Startzeit ist heute oder gestern (nicht mehrere Tage alt)

**Vorteile:**
- Verhindert Anzeige alter, hängender Einträge
- Einfache Implementierung
- Keine Änderung an bestehenden Einträgen

**Nachteile:**
- Einträge bleiben in der Datenbank (nur nicht angezeigt)
- Problem wird nicht an der Wurzel gelöst

### Lösung 3: Kombination beider Lösungen (EMPFOHLEN)

**Was:** Kombiniere Lösung 1 und 2:
1. Erweitere `checkAndStopExceededWorktimes` um automatisches Stoppen alter Einträge
2. Erweitere `getActiveTeamWorktimes` um Filter für relevante Einträge

**Vorteile:**
- Behebt Problem an der Wurzel (automatisches Stoppen)
- Verhindert Anzeige alter Einträge (zusätzliche Sicherheit)
- Bereinigt bestehende Probleme automatisch

## Empfohlene Implementierung

### Schritt 1: Erweitere checkAndStopExceededWorktimes

**Zusätzliche Prüfung:**
- Wenn Eintrag älter als 24 Stunden ist → automatisch stoppen
- Wenn Startzeit nicht heute ist → automatisch stoppen

**Code-Änderung:**
```typescript
// In checkAndStopExceededWorktimes, nach Zeile 1147
for (const worktime of activeWorktimes) {
  const now = new Date();
  
  // NEU: Prüfe Alter des Eintrags
  const hoursSinceStart = (now.getTime() - worktime.startTime.getTime()) / (1000 * 60 * 60);
  const isOlderThan24Hours = hoursSinceStart > 24;
  
  // NEU: Prüfe ob Startzeit heute ist
  const startDate = new Date(worktime.startTime);
  const today = new Date();
  const isStartToday = startDate.getDate() === today.getDate() && 
                       startDate.getMonth() === today.getMonth() && 
                       startDate.getFullYear() === today.getFullYear();
  
  // Automatisch stoppen wenn:
  // 1. Älter als 24 Stunden ODER
  // 2. Nicht heute gestartet ODER
  // 3. Tägliche Arbeitszeit erreicht (bestehend)
  if (isOlderThan24Hours || !isStartToday) {
    // Stoppe automatisch
    // ... (wie bei täglicher Arbeitszeit)
  }
  
  // Bestehende Prüfung für tägliche Arbeitszeit
  // ...
}
```

### Schritt 2: Erweitere getActiveTeamWorktimes

**Zusätzlicher Filter:**
- Nur Einträge anzeigen, die heute oder gestern gestartet wurden
- Nur Einträge anzeigen, die nicht älter als 24 Stunden sind

**Code-Änderung:**
```typescript
// In getActiveTeamWorktimes, Zeile 25-28
let activeWorktimesQuery: Prisma.WorkTimeWhereInput = {
  ...worktimeFilter,
  endTime: null,
  // NEU: Nur Einträge der letzten 24 Stunden
  startTime: {
    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
};
```

## Test-Szenarien

1. **Alter Eintrag (mehrere Tage):**
   - Eintrag mit `startTime` vor 3 Tagen, `endTime: null`
   - Erwartet: Wird automatisch gestoppt bei nächster Prüfung
   - Erwartet: Wird nicht in `getActiveTeamWorktimes` angezeigt

2. **Eintrag älter als 24 Stunden:**
   - Eintrag mit `startTime` vor 25 Stunden, `endTime: null`
   - Erwartet: Wird automatisch gestoppt bei nächster Prüfung
   - Erwartet: Wird nicht in `getActiveTeamWorktimes` angezeigt

3. **Legitimer Eintrag (heute gestartet):**
   - Eintrag mit `startTime` heute, `endTime: null`
   - Erwartet: Wird normal angezeigt und verarbeitet

4. **Tägliche Arbeitszeit erreicht:**
   - Eintrag mit `startTime` heute, tägliche Arbeitszeit erreicht
   - Erwartet: Wird automatisch gestoppt (bestehend)

## Offene Fragen

1. **Wie alt dürfen Einträge maximal sein?**
   - Empfehlung: 24 Stunden (1 Tag)
   - Alternative: 48 Stunden (2 Tage)

2. **Sollen Einträge gelöscht oder nur gestoppt werden?**
   - Empfehlung: Nur stoppen (Daten bleiben erhalten)
   - Alternative: Löschen nach X Tagen

3. **Soll es eine manuelle Bereinigung geben?**
   - Empfehlung: Nein (automatisch durch erweiterte Prüfung)
   - Alternative: Script zum manuellen Bereinigen alter Einträge

## Nächste Schritte

1. ✅ Analyse abgeschlossen
2. ⏳ Implementierungsplan erstellen
3. ⏳ Code-Änderungen umsetzen
4. ⏳ Tests durchführen
5. ⏳ Auf Produktivserver deployen


