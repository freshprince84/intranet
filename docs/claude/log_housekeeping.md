# Log-Housekeeping-System

Dokumentation für das automatische Log-Management-System für Claude Console Logs.

## Übersicht

Das Log-Housekeeping-System stellt sicher, dass die Claude Console Logs nicht unbegrenzt wachsen und die Server-Performance beeinträchtigen. Es umfasst automatische Rotation, Bereinigung und konfigurierbare Limits.

## Konfiguration

### Standard-Einstellungen

```typescript
private maxLogFileSize: number = 10 * 1024 * 1024; // 10MB pro Log-Datei
private maxLogFiles: number = 5; // Maximal 5 rotierte Dateien behalten
private cleanupInterval: 30 * 60 * 1000; // Housekeeping alle 30 Minuten
```

### Memory-Limits

- **Aktive Log-History**: Maximal 1000 Einträge im Speicher
- **Bei Überschreitung**: Reduzierung auf 500 Einträge (neueste werden behalten)
- **Alte Logs**: Einträge älter als 7 Tage werden aus dem Memory entfernt

## Automatische Prozesse

### 1. Log-Rotation (bei Dateigröße)

**Trigger**: Wenn `claude-console.log` die 10MB-Grenze erreicht

**Prozess**:
1. Aktuelle Log-Datei wird umbenannt zu `claude-console-YYYY-MM-DDTHH-MM-SS.log`
2. Neue leere `claude-console.log` wird erstellt
3. Automatische Bereinigung alter rotierter Dateien

**Beispiel**:
```
claude-console.log → claude-console-2025-01-21T14-30-45.log
```

### 2. Periodisches Housekeeping (alle 30 Minuten)

**Memory-Bereinigung**:
- Reduzierung der Log-History auf 500 Einträge wenn > 1000
- Entfernung von Logs älter als 7 Tage

**Datei-Bereinigung**:
- Behalten der neuesten 5 rotierten Log-Dateien
- Löschung älterer rotierter Dateien

### 3. Cleanup beim Server-Shutdown

**Graceful Shutdown**: Beim Herunterfahren wird einmaliges Housekeeping durchgeführt

## API-Endpunkte

### Manuelles Housekeeping

```http
POST /api/claude/console/cleanup
Authorization: Bearer claude-dev-token
```

**Response**:
```json
{
  "success": true,
  "message": "Log-Housekeeping erfolgreich durchgeführt",
  "timestamp": "2025-01-21T14:30:45.123Z"
}
```

### Log-Statistiken

```http
GET /api/claude/console/stats
Authorization: Bearer claude-dev-token
```

**Response**:
```json
{
  "total": 1250,
  "byLevel": {
    "log": 800,
    "error": 45,
    "warn": 150,
    "info": 255
  },
  "byUser": {
    "user123": 400,
    "user456": 850
  },
  "lastHour": 89
}
```

## Monitoring und Logs

### Console-Output beim Housekeeping

```
🧹 Claude console cleanup task started (every 30 minutes)
🧹 Performing Claude console maintenance...
📝 Memory log cleanup: 1250 -> 500 entries
📦 Claude console log rotated: claude-console-2025-01-21T14-30-45.log
🗑️ Deleted old Claude console log: claude-console-2025-01-20T10-15-30.log
🗑️ Removed 125 old memory logs (>7 days)
✅ Claude console maintenance completed
```

### Fehlermeldungen

```
Error rotating log file: ENOENT: no such file or directory
Error deleting old log file: EACCES: permission denied
Error reading logs directory: ENOTDIR: not a directory
```

## Datei-Struktur

```
backend/logs/
├── claude-console.log                    # Aktuelle Log-Datei
├── claude-console-2025-01-21T14-30-45.log  # Rotierte Datei 1
├── claude-console-2025-01-21T10-15-30.log  # Rotierte Datei 2
├── claude-console-2025-01-20T16-45-12.log  # Rotierte Datei 3
├── claude-console-2025-01-20T08-22-55.log  # Rotierte Datei 4
└── claude-console-2025-01-19T22-10-08.log  # Rotierte Datei 5
```

## Konfiguration anpassen

### Log-Größe ändern

```typescript
// In claudeConsoleService.ts
private maxLogFileSize: number = 50 * 1024 * 1024; // 50MB statt 10MB
```

### Anzahl rotierter Dateien ändern

```typescript
private maxLogFiles: number = 10; // 10 Dateien statt 5
```

### Cleanup-Intervall ändern

```typescript
// Cleanup alle 60 Minuten statt 30
this.cleanupInterval = setInterval(() => {
  this.performMaintenance();
}, 60 * 60 * 1000);
```

### Memory-Limits anpassen

```typescript
// In processLogEntry()
if (this.logHistory.length > 2000) { // 2000 statt 1000
  this.logHistory = this.logHistory.slice(-1000); // Auf 1000 reduzieren
}
```

## Performance-Auswirkungen

### Positive Effekte

- **Begrenzte Dateigrößen**: Verhindert riesige Log-Dateien
- **Kontrollierter Memory-Verbrauch**: Log-History bleibt in vernünftigen Grenzen
- **Automatische Bereinigung**: Keine manuellen Eingriffe nötig

### Mögliche Auswirkungen

- **Kurze Verzögerung bei Rotation**: Log-Writing kann kurz blockieren
- **Disk-I/O bei Cleanup**: Periodische Dateisystem-Zugriffe
- **Memory-Spike bei großer History**: Beim Slice-Vorgang

## Troubleshooting

### Problem: Log-Rotation funktioniert nicht

**Mögliche Ursachen**:
- Keine Schreibberechtigung im logs-Verzeichnis
- Datei ist gesperrt von anderem Prozess
- Unzureichender Speicherplatz

**Lösung**:
```bash
# Berechtigungen prüfen
ls -la backend/logs/
chmod 755 backend/logs/
chown nodejs:nodejs backend/logs/

# Speicherplatz prüfen
df -h
```

### Problem: Alte Dateien werden nicht gelöscht

**Mögliche Ursachen**:
- Dateien sind schreibgeschützt
- Unzureichende Berechtigungen
- Falsche Datei-Pattern-Erkennung

**Lösung**:
```bash
# Manuell alte Dateien entfernen
find backend/logs/ -name "claude-console-*.log" -mtime +7 -delete
```

### Problem: Memory-Verbrauch steigt weiter

**Diagnose**:
```typescript
// Log-History-Größe prüfen
console.log('Log history size:', this.logHistory.length);
console.log('Memory usage:', process.memoryUsage());
```

## Best Practices

1. **Monitoring einrichten**: Überwache Log-Dateigrößen und Memory-Verbrauch
2. **Backup-Strategy**: Wichtige Logs vor der automatischen Löschung sichern
3. **Alert-System**: Benachrichtigung bei Housekeeping-Fehlern
4. **Konfiguration dokumentieren**: Alle Anpassungen dokumentieren
5. **Testing**: Housekeeping in Entwicklungsumgebung testen

## Security-Überlegungen

- **File-Permissions**: Log-Dateien sollten nur für den Server-Prozess zugänglich sein
- **Log-Content**: Sensitive Daten werden bereits beim Logging bereinigt
- **API-Zugriff**: Cleanup-Endpunkt erfordert Claude-Authentifizierung
- **Rate-Limiting**: Verhindert Missbrauch des manuellen Cleanup-Endpunkts 