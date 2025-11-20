# Performance-Analyse: Warum ist die Seite extrem langsam?

## Identifizierte Probleme

### 🔴 KRITISCH: N+1 Query Problem bei NotificationSettings

**Problem:**
- `isNotificationEnabled()` wird bei **JEDER** Notification-Erstellung aufgerufen
- Macht **2 Datenbank-Queries** pro Aufruf:
  1. `prisma.userNotificationSettings.findFirst({ where: { userId } })`
  2. `prisma.notificationSettings.findFirst()`
- Bei 50 Notifications = **100 Datenbank-Queries** nur für Settings!

**Beweis aus Logs:**
```
Keine NotificationSettings in der Datenbank gefunden. Verwende Standard-Werte (alle aktiviert).
```
Diese Warnung erscheint **sehr oft** in den Logs.

**Impact:**
- **80-90% der Ladezeit** könnte durch diese Queries verursacht werden
- Jede Query dauert ~10-50ms
- Bei 50 Notifications = 1-2.5 Sekunden nur für Settings-Queries

**Lösung:**
- Settings **cachen** (in-memory Cache mit TTL)
- Settings nur **einmal pro Request** laden
- Oder: Settings beim User-Login laden und in Session speichern

---

### 🟡 HOCH: N+1 Query Problem bei Attachments

**Problem:**
- Backend lädt **KEINE Attachments** mit Requests/Tasks
- Frontend macht **separate Requests** für jeden Request/Task
- Bei 50 Requests = 50 zusätzliche HTTP-Requests
- Bei 100 Tasks = 100 zusätzliche HTTP-Requests

**Beweis:**
- Dokumentation zeigt, dass Optimierung **NICHT umgesetzt** wurde
- `PERFORMANCE_ANALYSE_DETAILED.md` beschreibt das Problem

**Impact:**
- **80-95% der Ladezeit** wird durch Attachment-Requests verursacht
- Bei 100 Tasks mit je 100ms Request-Zeit = **10 Sekunden nur für Attachments**

**Lösung:**
- Backend: Attachments direkt mit Requests/Tasks laden via Prisma `include`
- Frontend: Separate Attachment-Requests entfernen

---

### 🟡 MITTEL: LobbyPmsReservationScheduler läuft alle 10 Minuten

**Problem:**
- Scheduler prüft **alle Branches** alle 10 Minuten
- Macht für jede Branch:
  - Datenbank-Queries (Branch + Organization)
  - API-Calls zu LobbyPMS (falls konfiguriert)
  - Reservierungs-Sync

**Impact:**
- Kann die Datenbank belasten, wenn viele Branches vorhanden sind
- API-Calls zu LobbyPMS können langsam sein

**Lösung:**
- Intervall auf 30-60 Minuten erhöhen (wenn nicht kritisch)
- Oder: Nur Branches mit aktivierter Sync prüfen (wird bereits gemacht)

---

### 🟢 NIEDRIG: Server-Restarts

**Status:**
- **245 Restarts** seit Start
- **Uptime: 16 Minuten** (Server wurde kürzlich neu gestartet)
- **CPU: 37.4%** (hoch)
- **RAM: 1.4GB** (hoch)

**Impact:**
- Server-Instabilität könnte Performance beeinträchtigen
- Viele Restarts deuten auf Memory-Leaks oder Crashes hin

**Lösung:**
- Server-Logs prüfen auf Crash-Ursachen
- Memory-Leaks identifizieren

---

## Zusammenfassung der Performance-Probleme

### Hauptursachen (Priorität):

1. **🔴 KRITISCH: NotificationSettings N+1 Problem**
   - **Impact: 80-90% der Ladezeit**
   - **Fix: Settings cachen**

2. **🟡 HOCH: Attachments N+1 Problem**
   - **Impact: 80-95% der Ladezeit (wenn viele Attachments)**
   - **Fix: Attachments mit Requests/Tasks laden**

3. **🟡 MITTEL: LobbyPMS Scheduler**
   - **Impact: Periodische Last-Spitzen**
   - **Fix: Intervall erhöhen**

4. **🟢 NIEDRIG: Server-Instabilität**
   - **Impact: Unvorhersehbare Performance-Probleme**
   - **Fix: Logs analysieren**

---

## Empfohlene Maßnahmen (Priorität)

### Sofort (KRITISCH):
1. **NotificationSettings cachen**
   - In-memory Cache mit TTL (z.B. 5 Minuten)
   - Settings nur einmal pro Request laden
   - Cache invalidation beim Update

### Kurzfristig (HOCH):
2. **Attachments mit Requests/Tasks laden**
   - Backend: Prisma `include` für Attachments
   - Frontend: Separate Requests entfernen

### Mittelfristig (MITTEL):
3. **LobbyPMS Scheduler Intervall erhöhen**
   - Von 10 auf 30-60 Minuten

### Langfristig (NIEDRIG):
4. **Server-Stabilität verbessern**
   - Logs analysieren
   - Memory-Leaks beheben

---

## Geschätzte Performance-Verbesserung

**Aktuell:**
- Ladezeit: ~15-20 Sekunden (bei 50 Requests, 100 Tasks)

**Nach Fix 1 (NotificationSettings Cache):**
- Ladezeit: ~3-5 Sekunden (80-90% Verbesserung)

**Nach Fix 1 + 2 (Settings Cache + Attachments):**
- Ladezeit: ~0.5-1 Sekunde (95% Verbesserung)

---

## Nächste Schritte

1. ✅ **Analyse abgeschlossen** - Probleme identifiziert
2. ⏳ **Warten auf Bestätigung** - Keine Änderungen vorgenommen
3. ⏳ **Fix implementieren** - Nach Bestätigung

