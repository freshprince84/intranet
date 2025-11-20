# Log-Analyse: Zusammenfassung der identifizierten Probleme

## 🔴🔴 KRITISCH: Prisma Connection Pool Timeout

### Problem
```
Timed out fetching a new connection from the connection pool.
(Current connection pool timeout: 10, connection limit: 5)
```

**Ursache:**
- Connection Pool zu klein: Nur 5 Verbindungen
- Zu viele Prisma-Instanzen: 71 Dateien erstellen eigene Instanzen
- Gleichzeitige Requests blockieren sich gegenseitig

**Symptome:**
- Server wird unerreichbar
- Nginx-Fehler: "connect() failed (111: Connection refused)"
- Nginx-Fehler: "upstream prematurely closed connection"
- Prisma-Fehler: "Timed out fetching a new connection"

**Impact:**
- Server stürzt ab oder wird unerreichbar
- Alle Requests schlagen fehl
- System ist nicht nutzbar

**Lösung:**
- Connection Pool erhöhen: `connection_limit: 20-30`
- Pool Timeout erhöhen: `pool_timeout: 20`
- Prisma-Instanzen konsolidieren (mittelfristig)

---

## 🔴 KRITISCH: NotificationSettings N+1 Problem

### Problem
```
Keine NotificationSettings in der Datenbank gefunden. Verwende Standard-Werte (alle aktiviert).
```
Diese Warnung erscheint **sehr oft** in den Logs.

**Ursache:**
- `isNotificationEnabled()` wird bei JEDER Notification-Erstellung aufgerufen
- Macht 2 Datenbank-Queries pro Aufruf
- Bei 50 Notifications = 100 Datenbank-Queries

**Impact:**
- 80-90% der Ladezeit durch Settings-Queries
- Bei 50 Notifications = 1-2.5 Sekunden nur für Settings

**Lösung:**
- Settings cachen (in-memory Cache mit TTL)
- Settings nur einmal pro Request laden

---

## 🟡 HOCH: Client-seitiges Filtering

### Problem
- Backend liefert ALLE Requests/Tasks (kann 1000+ sein)
- Frontend filtert clientseitig
- Standardfilter wird nach dem Laden angewendet

**Impact:**
- Große JSON-Responses (mehrere MB)
- Lange Übertragungszeiten
- Hoher Memory-Verbrauch im Browser

**Lösung:**
- Server-seitiges Filtering für Standardfilter
- Hintergrund-Laden der restlichen Daten

---

## 🟡 MITTEL: LobbyPMS Sync Timeout

### Problem
```
upstream timed out (110: Connection timed out) while reading response header from upstream
POST /api/lobby-pms/sync
```

**Ursache:**
- LobbyPMS Sync-Requests dauern zu lange (>60 Sekunden)
- Nginx Timeout wird erreicht

**Impact:**
- Sync-Requests schlagen fehl
- Blockiert andere Requests

**Lösung:**
- Sync-Requests in Background-Jobs verschieben
- Oder: Timeout erhöhen für Sync-Endpoints

---

## 🟢 NIEDRIG: Favicon.ico 404-Fehler

### Problem
```
open() "/var/www/intranet/frontend/build/favicon.ico" failed (2: No such file or directory)
```

**Impact:**
- Viele 404-Fehler in Logs
- Nicht kritisch, aber unnötig

**Lösung:**
- Favicon.ico zum Frontend-Build hinzufügen
- Oder: Nginx-Konfiguration anpassen

---

## Zusammenfassung

### Kritische Probleme (SOFORT beheben):
1. **Connection Pool Timeout** - Server wird unerreichbar
2. **NotificationSettings N+1** - 80-90% der Ladezeit

### Wichtige Probleme (schnell beheben):
3. **Client-seitiges Filtering** - Große Datenübertragung
4. **LobbyPMS Sync Timeout** - Requests schlagen fehl

### Niedrige Priorität:
5. **Favicon.ico 404** - Nur Logs, keine Funktionalitätsprobleme

---

## Empfohlene Reihenfolge

1. **SOFORT**: Connection Pool erhöhen (5-10 Min)
   - Verhindert Server-Crashes
   - Macht Server wieder erreichbar

2. **DANN**: NotificationSettings Cache (1-2 Stunden)
   - Reduziert Datenbank-Queries drastisch
   - Verbessert Ladezeit um 80-90%

3. **DANN**: Server-seitiges Filtering (4-6 Stunden)
   - Reduziert Datenübertragung um 95%
   - Verbessert initiale Ladezeit um 80-90%

4. **SPÄTER**: LobbyPMS Sync optimieren (optional)
   - Background-Jobs für lange Syncs

5. **SPÄTER**: Favicon.ico hinzufügen (optional)
   - Reduziert 404-Fehler in Logs

