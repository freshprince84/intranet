# Implementierungsplan: Bereinigung seltsamer Zeiterfassungseinträge

**Datum:** 2025-02-01  
**Status:** Geplant  
**Priorität:** Hoch

## Ziel

Bereinigung und Verhinderung von "hängenden" Zeiterfassungseinträgen, die User anzeigen, die keine Zeit gestoppt haben und sich nicht einmal eingeloggt haben.

## Problem

Auf dem Produktivserver werden Zeiterfassungseinträge angezeigt für User, die:
1. Keine Zeit gestoppt haben
2. Sich nicht einmal eingeloggt haben
3. Aber trotzdem als hätten sie Zeit erfasst angezeigt werden

Die automatische Stopp-Funktion (bei Erreichen der täglichen Arbeitszeit) funktioniert, stoppt aber nicht alte, hängende Einträge.

## Lösung

Kombinierte Lösung:
1. **Erweitere `checkAndStopExceededWorktimes`:** Stoppt automatisch alte Einträge (älter als 24 Stunden oder nicht heute gestartet)
2. **Erweitere `getActiveTeamWorktimes`:** Filtert nur relevante Einträge (nicht älter als 24 Stunden)

## Implementierungsschritte

### Schritt 1: Erweitere checkAndStopExceededWorktimes

**Datei:** `backend/src/controllers/worktimeController.ts`  
**Funktion:** `checkAndStopExceededWorktimes` (Zeile 1129-1278)

**Änderungen:**
1. Prüfe Alter des Eintrags (Stunden seit Start)
2. Prüfe ob Startzeit heute ist
3. Stoppe automatisch wenn:
   - Eintrag älter als 24 Stunden ODER
   - Startzeit ist nicht heute ODER
   - Tägliche Arbeitszeit erreicht (bestehend)

**Code-Änderung:**
```typescript
// Nach Zeile 1147, im for-Loop
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
  
  // Automatisch stoppen wenn alt oder nicht heute
  if (isOlderThan24Hours || !isStartToday) {
    logger.log(`Zeiterfassung ID ${worktime.id} ist zu alt (${hoursSinceStart.toFixed(2)}h) oder nicht heute gestartet. Stoppe automatisch.`);
    
    const endTimeNow = new Date();
    const stoppedWorktime = await prisma.workTime.update({
      where: { id: worktime.id },
      data: { 
        endTime: endTimeNow,
        ...(worktime.timezone ? {} : { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
      }
    });
    
    logger.log(`Zeiterfassung ID ${stoppedWorktime.id} wurde automatisch beendet um: ${formatLocalTime(stoppedWorktime.endTime)}`);
    
    // Benachrichtigung erstellen
    const userLang = await getUserLanguage(worktime.userId);
    const notificationText = getWorktimeNotificationText(userLang, 'auto_stop_old', undefined, undefined);
    await createNotificationIfEnabled({
      userId: worktime.userId,
      title: notificationText.title,
      message: notificationText.message,
      type: NotificationType.worktime,
      relatedEntityId: worktime.id,
      relatedEntityType: 'auto_stop_old'
    });
    
    logger.log(`Zeiterfassung für Benutzer ${worktime.userId} automatisch beendet (zu alt).`);
    continue; // Überspringe weitere Prüfungen für diesen Eintrag
  }
  
  // Bestehende Prüfung für tägliche Arbeitszeit (Zeile 1148-1271)
  // ...
}
```

**Hinweis:** Die bestehende Prüfung für tägliche Arbeitszeit bleibt unverändert und wird nur ausgeführt, wenn der Eintrag nicht bereits wegen Alter gestoppt wurde.

### Schritt 2: Erweitere getActiveTeamWorktimes

**Datei:** `backend/src/controllers/teamWorktimeController.ts`  
**Funktion:** `getActiveTeamWorktimes` (Zeile 12-66)

**Änderungen:**
1. Filtere nur Einträge der letzten 24 Stunden
2. Verhindert Anzeige alter, hängender Einträge

**Code-Änderung:**
```typescript
// Zeile 25-28 ersetzen
let activeWorktimesQuery: Prisma.WorkTimeWhereInput = {
  ...worktimeFilter,
  endTime: null,
  // NEU: Nur Einträge der letzten 24 Stunden
  startTime: {
    gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
};
```

### Schritt 3: Übersetzungen hinzufügen

**Datei:** `backend/src/utils/translations.ts`

**Neue Übersetzung für Benachrichtigung:**
```typescript
// In getWorktimeNotificationText, case 'auto_stop_old':
case 'auto_stop_old':
  if (lang === 'de') {
    return {
      title: 'Zeiterfassung automatisch beendet',
      message: 'Ihre Zeiterfassung wurde automatisch beendet, da sie älter als 24 Stunden ist.'
    };
  } else if (lang === 'en') {
    return {
      title: 'Time tracking automatically stopped',
      message: 'Your time tracking was automatically stopped because it is older than 24 hours.'
    };
  } else {
    return {
      title: 'Registro de tiempo detenido automáticamente',
      message: 'Su registro de tiempo se detuvo automáticamente porque tiene más de 24 horas.'
    };
  }
```

**Datei:** `frontend/src/i18n/locales/de.json`, `en.json`, `es.json`

**Hinweis:** Falls die Benachrichtigung im Frontend angezeigt wird, müssen auch dort Übersetzungen hinzugefügt werden.

## Test-Szenarien

### Test 1: Alter Eintrag (mehrere Tage)
**Setup:**
- Erstelle Test-Eintrag mit `startTime` vor 3 Tagen, `endTime: null`
- Warte auf nächste Prüfung (max. 2 Minuten)

**Erwartet:**
- Eintrag wird automatisch gestoppt bei nächster Prüfung
- `endTime` wird auf aktuelle Zeit gesetzt
- Benachrichtigung wird erstellt
- Eintrag wird nicht in `getActiveTeamWorktimes` angezeigt

### Test 2: Eintrag älter als 24 Stunden
**Setup:**
- Erstelle Test-Eintrag mit `startTime` vor 25 Stunden, `endTime: null`
- Warte auf nächste Prüfung (max. 2 Minuten)

**Erwartet:**
- Eintrag wird automatisch gestoppt bei nächster Prüfung
- `endTime` wird auf aktuelle Zeit gesetzt
- Benachrichtigung wird erstellt
- Eintrag wird nicht in `getActiveTeamWorktimes` angezeigt

### Test 3: Legitimer Eintrag (heute gestartet)
**Setup:**
- Erstelle Test-Eintrag mit `startTime` heute, `endTime: null`
- Warte auf nächste Prüfung (max. 2 Minuten)

**Erwartet:**
- Eintrag bleibt aktiv (nicht gestoppt)
- Eintrag wird in `getActiveTeamWorktimes` angezeigt
- Bestehende Prüfung für tägliche Arbeitszeit funktioniert weiterhin

### Test 4: Tägliche Arbeitszeit erreicht
**Setup:**
- Erstelle Test-Eintrag mit `startTime` heute, tägliche Arbeitszeit erreicht
- Warte auf nächste Prüfung (max. 2 Minuten)

**Erwartet:**
- Eintrag wird automatisch gestoppt (bestehend)
- Bestehende Funktionalität bleibt unverändert

### Test 5: getActiveTeamWorktimes Filter
**Setup:**
- Erstelle Test-Eintrag mit `startTime` vor 25 Stunden, `endTime: null`
- Rufe `getActiveTeamWorktimes` auf

**Erwartet:**
- Eintrag wird NICHT in der Antwort angezeigt (gefiltert)
- Nur Einträge der letzten 24 Stunden werden angezeigt

## Deployment

1. **Lokale Tests:**
   - Alle Test-Szenarien durchführen
   - Logs prüfen
   - Datenbank prüfen

2. **Produktivserver:**
   - Code deployen
   - Server neu starten (nach Absprache)
   - Logs überwachen
   - Prüfen ob alte Einträge automatisch gestoppt werden

3. **Monitoring:**
   - Prüfe Logs nach automatischen Stopps
   - Prüfe ob keine neuen hängenden Einträge entstehen
   - Prüfe ob Anzeige korrekt funktioniert

## Rollback-Plan

Falls Probleme auftreten:
1. Code-Änderungen rückgängig machen
2. Server neu starten
3. Bestehende Funktionalität bleibt unverändert

## Offene Fragen

1. **Wie alt dürfen Einträge maximal sein?**
   - Aktuell: 24 Stunden
   - Alternative: 48 Stunden (2 Tage)

2. **Sollen Einträge gelöscht oder nur gestoppt werden?**
   - Aktuell: Nur stoppen (Daten bleiben erhalten)
   - Alternative: Löschen nach X Tagen (nicht empfohlen)

3. **Soll es eine manuelle Bereinigung geben?**
   - Aktuell: Nein (automatisch durch erweiterte Prüfung)
   - Alternative: Script zum manuellen Bereinigen alter Einträge (falls nötig)

## Checkliste

- [ ] Code-Änderungen in `checkAndStopExceededWorktimes` implementieren
- [ ] Code-Änderungen in `getActiveTeamWorktimes` implementieren
- [ ] Übersetzungen hinzufügen
- [ ] Lokale Tests durchführen
- [ ] Logs prüfen
- [ ] Datenbank prüfen
- [ ] Auf Produktivserver deployen
- [ ] Monitoring einrichten
- [ ] Dokumentation aktualisieren

