# Console-Logs für Worktime Auto-Stop Analyse

## Relevante Console-Logs im Code

### Scheduler-Start (app.ts, Zeile 131-133)
```typescript
setInterval(async () => {
  console.log('Starte automatische Überprüfung der Arbeitszeiten...');
  await checkAndStopExceededWorktimes();
}, CHECK_INTERVAL_MS);
```

### Prüfung für jeden aktiven Worktime (worktimeController.ts)

**Zeile 1148-1152:** Tagesgrenzen und aktuelle Zeit
```typescript
console.log(`Prüfung auf überschrittene Arbeitszeit für Datum: ${format(now, 'yyyy-MM-dd')}`);
console.log(`Aktuelle Zeit (UTC): ${now.toISOString()}`);
console.log(`Aktuelle Zeit (lokal): ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`);
console.log(`Tagesbeginn (kompensiert): ${todayStart.toISOString()}`);
console.log(`Tagesende (kompensiert): ${todayEnd.toISOString()}`);
```

**Zeile 1172:** Anzahl gefundener Zeiterfassungen
```typescript
console.log(`Gefundene abgeschlossene Zeiterfassungen für heute: ${todaysWorktimes.length}`);
```

**Zeile 1177:** Jede einzelne Zeiterfassung
```typescript
console.log(`Zeiterfassung ID ${wt.id}: ${wt.startTime.toISOString()} - ${wt.endTime.toISOString()} = ${workTimeHours.toFixed(2)}h`);
```

**Zeile 1192:** Aktuelle laufende Sitzung
```typescript
console.log(`Aktuelle laufende Sitzung: ${worktime.startTime.toISOString()} - jetzt (${localNowString}) = ${currentSessionHours.toFixed(2)}h`);
```

**Zeile 1200-1201:** Gesamtarbeitszeit
```typescript
console.log(`Normale Arbeitszeit des Benutzers: ${worktime.user.normalWorkingHours}h`);
console.log(`Gesamtarbeitszeit heute: ${totalWorkTimeHours.toFixed(2)}h`);
```

**Zeile 1205:** Auto-Stop wird ausgelöst
```typescript
console.log(`Schwellenwert erreicht oder überschritten. Stoppe Zeiterfassung automatisch.`);
```

**Zeile 1224-1225:** Zeiterfassung wurde gestoppt
```typescript
console.log(`Zeiterfassung ID ${stoppedWorktime.id} wurde beendet um: ${stoppedWorktime.endTime.toISOString()}`);
console.log(`Lokale Endzeit: ${stoppedWorktime.endTime.getFullYear()}-${String(stoppedWorktime.endTime.getMonth() + 1).padStart(2, '0')}-${String(stoppedWorktime.endTime.getDate()).padStart(2, '0')} ${String(stoppedWorktime.endTime.getHours()).padStart(2, '0')}:${String(stoppedWorktime.endTime.getMinutes()).padStart(2, '0')}:${String(stoppedWorktime.endTime.getSeconds()).padStart(2, '0')}`);
```

**Zeile 1239:** Bestätigung
```typescript
console.log(`Zeiterfassung für Benutzer ${worktime.userId} automatisch beendet.`);
```

**Zeile 1243:** Abschluss
```typescript
console.log('Prüfung auf überschrittene Arbeitszeiten abgeschlossen.');
```

## Wie Logs vom Produktivserver abrufen

### Option 1: PM2-Logs (wenn PM2 verwendet wird)
```bash
# Auf dem Server ausführen:
pm2 logs --lines 500 --nostream | grep -E "Arbeitszeit|Gesamtarbeitszeit|Schwellenwert|checkAndStop"
```

### Option 2: Log-Dateien (wenn vorhanden)
```bash
# Auf dem Server ausführen:
tail -n 1000 backend/logs/claude-console.log | grep -E "Arbeitszeit|Gesamtarbeitszeit|Schwellenwert|checkAndStop"
```

### Option 3: Systemd-Logs (wenn als Service läuft)
```bash
# Auf dem Server ausführen:
journalctl -u intranet-backend --since "2 hours ago" | grep -E "Arbeitszeit|Gesamtarbeitszeit|Schwellenwert|checkAndStop"
```

### Option 4: Direkte Server-Konsole
Wenn der Server direkt gestartet wurde, sind die Logs in der Konsole sichtbar.

## Was in den Logs zu sehen sein sollte (bei Fehler)

**Beispiel für falsche Berechnung:**
```
Starte automatische Überprüfung der Arbeitszeiten...
Prüfung auf überschrittene Arbeitszeit für Datum: 2025-11-24
Aktuelle Zeit (UTC): 2025-11-24T18:58:00.000Z
Aktuelle Zeit (lokal): 2025-11-24 13:58:00
Tagesbeginn (kompensiert): 2025-11-23T19:00:00.000Z  ← FALSCH! (sollte 2025-11-24T05:00:00.000Z sein)
Tagesende (kompensiert): 2025-11-24T04:59:59.999Z    ← FALSCH! (sollte 2025-11-25T04:59:59.999Z sein)
Gefundene abgeschlossene Zeiterfassungen für heute: 0  ← FALSCH! (sollte 1 oder mehr sein)
Aktuelle laufende Sitzung: 2025-11-24T18:58:00.000Z - jetzt (2025-11-24 13:58:00) = 0.00h
Normale Arbeitszeit des Benutzers: 16h
Gesamtarbeitszeit heute: 10.99h  ← FALSCH! (sollte 10.99h + aktuelle Sitzung sein)
Schwellenwert erreicht oder überschritten. Stoppe Zeiterfassung automatisch.  ← FALSCH! (zu früh)
```

**Das Problem:**
- `Tagesbeginn (kompensiert)` und `Tagesende (kompensiert)` sind um 5h verschoben
- Dadurch werden die falschen Zeiterfassungen gefunden (oder keine)
- Die Gesamtarbeitszeit wird falsch berechnet
- Die Prüfung schlägt zu früh an



