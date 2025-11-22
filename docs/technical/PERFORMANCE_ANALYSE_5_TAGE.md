# Performance-Analyse: Letzte 5 Tage - Detaillierte Analyse

## Datum der Analyse
2025-11-22 - Analyse aller Änderungen der letzten 5 Tage

## Zusammenfassung der Änderungen

### Anzahl der Commits
- **Letzte 5 Tage**: ~30+ Commits
- **Hauptänderungen**: LobbyPMS Integration, Performance-Optimierungen, Branch-Settings

---

## 🔴 KRITISCHE ÄNDERUNGEN (Performance-relevant)

### 1. LobbyPMS Reservation Scheduler (d2feba3 - 20.11.2025)

**Was wurde geändert:**
- Neuer Scheduler `LobbyPmsReservationScheduler` erstellt
- Läuft **alle 10 Minuten** automatisch
- Synchronisiert Reservierungen von LobbyPMS API für alle Branches mit aktivierter Sync

**Code-Änderungen:**
- `backend/src/services/lobbyPmsReservationScheduler.ts` (NEU)
- `backend/src/services/lobbyPmsReservationSyncService.ts` (NEU)
- `backend/src/app.ts` - Scheduler wird beim Start gestartet

**Problem:**
- **Scheduler läuft für ALLE Branches** (ursprünglich)
- **Jetzt korrigiert**: Läuft nur für Branch 3 (Manila) und Branch 4 (Parque Poblado)
- **Aber**: Server läuft möglicherweise noch mit altem Code

**Impact auf Performance:**
- **Hoch**: Scheduler läuft alle 10 Minuten
- **Bei Fehlern**: Wiederholte Versuche, hohe CPU-Last
- **API-Calls**: Externe LobbyPMS API-Aufrufe können langsam sein

**Aktueller Status:**
- Code wurde angepasst (nur Branch 3 und 4)
- **ABER**: Server-Logs zeigen noch Fehler für Branch 17 und 18
- **Vermutung**: Server läuft noch mit altem Code

---

### 2. Server-seitiges Filtering (8f60399 - 20.11.2025)

**Was wurde geändert:**
- Filter-Logik vom Frontend ins Backend verschoben
- Neue Funktion `convertFilterConditionsToPrismaWhere` erstellt
- Frontend sendet Filter-Parameter, Backend filtert in Datenbank

**Code-Änderungen:**
- `backend/src/utils/filterToPrisma.ts` (NEU - 252 Zeilen)
- `backend/src/controllers/requestController.ts` - Filter-Parameter hinzugefügt
- `backend/src/controllers/taskController.ts` - Filter-Parameter hinzugefügt

**Erwartete Verbesserung:**
- **80-90% schneller** (von 3-5 Sekunden auf 0.5-1 Sekunde)
- **95% weniger Datenübertragung** (von ~5MB auf ~250KB)

**Mögliche Probleme:**
- **Komplexe Filter-Logik**: Könnte bei vielen Bedingungen langsam sein
- **Prisma Where-Klauseln**: Könnten ineffizient sein bei komplexen Filtern

**Status:**
- ✅ Implementiert
- ⚠️ Nicht getestet ob Performance-Verbesserung erreicht wurde

---

### 3. NotificationSettings Cache (0e87a7e - 20.11.2025)

**Was wurde geändert:**
- In-Memory Cache für Notification Settings erstellt
- TTL: 5 Minuten
- Reduziert DB-Queries von 100 auf 2-4 (95-98% Reduktion)

**Code-Änderungen:**
- `backend/src/services/notificationSettingsCache.ts` (NEU - 118 Zeilen)
- `backend/src/controllers/notificationController.ts` - Verwendet Cache
- `backend/src/controllers/settingsController.ts` - Cache-Invalidierung

**Erwartete Verbesserung:**
- **80-90% Verbesserung** bei Notification-Queries

**Status:**
- ✅ Implementiert
- ⚠️ Nicht getestet ob Performance-Verbesserung erreicht wurde

---

### 4. Branch Settings Migration (edf6e13 - 20.11.2025)

**Was wurde geändert:**
- **MASSIVE Änderung**: Alle Services, Controller, Queues, Utils, etc. auf Branch-Settings umgestellt
- **71+ Dateien geändert** (laut Commit-Message)
- Branch-Settings werden jetzt überall verwendet

**Code-Änderungen:**
- Praktisch alle Backend-Dateien betroffen
- Neue Branch-Settings-Struktur
- Encryption/Decryption für Branch-Settings

**Mögliche Probleme:**
- **Viele Dateien geändert**: Höheres Fehlerrisiko
- **Encryption/Decryption**: Könnte Performance-Impact haben
- **Settings-Laden**: Wird bei jedem Request gemacht?

**Status:**
- ✅ Implementiert
- ⚠️ Performance-Impact nicht gemessen

---

## 🔴 AKTUELLE PROBLEME (aus Logs)

### 1. LobbyPMS Scheduler läuft noch für Branch 17 und 18

**Problem:**
- Server-Logs zeigen Fehler für Branch 17 und 18
- Code wurde angepasst (nur Branch 3 und 4)
- **Vermutung**: Server läuft noch mit altem Code

**Logs zeigen:**
```
[LobbyPmsSync] Fehler beim Synchronisieren für Branch 17: Error: Unbekannter Fehler beim Abrufen der Reservierungen
[LobbyPmsReservationScheduler] Fehler bei Branch 17: Error: Unbekannter Fehler beim Abrufen der Reservierungen
[LobbyPmsSync] Fehler beim Synchronisieren für Branch 18: Error: Unbekannter Fehler beim Abrufen der Reservierungen
[LobbyPmsReservationScheduler] Fehler bei Branch 18: Error: Unbekannter Fehler beim Abrufen der Reservierungen
```

**Ursache:**
- Scheduler versucht noch, Branch 17 und 18 zu synchronisieren
- Diese Branches haben keine korrekten LobbyPMS Settings
- API-Calls schlagen fehl → wiederholte Versuche → hohe CPU-Last

---

### 2. Hohe CPU-Last (125-155%)

**Aktueller Status:**
- Backend läuft mit 125-155% CPU
- Load Average: 2.0-2.4 (hoch für 2-Core-System)
- System ist langsam/unbrauchbar

**Mögliche Ursachen:**
1. **LobbyPMS Scheduler**: Läuft alle 10 Minuten, versucht fehlgeschlagene Syncs
2. **Viele gleichzeitige Requests**: Aber Logs zeigen keine hohe Anzahl
3. **Ineffiziente Datenbankabfragen**: Könnte durch Filter-Logik verursacht werden
4. **Encryption/Decryption**: Branch-Settings werden bei jedem Request entschlüsselt?

---

### 3. Prisma Connection Pool

**Aus vorheriger Analyse (PERFORMANCE_ANALYSE_AKTUELL.md):**
- Connection Pool fehlt möglicherweise in DATABASE_URL
- Standard: `connection_limit: 5` (nur 5 Verbindungen!)
- Bei mehr als 5 gleichzeitigen Requests → Timeouts

**Status:**
- ⚠️ Muss geprüft werden ob DATABASE_URL `?connection_limit=20&pool_timeout=20` enthält

---

## 📋 ÄNDERUNGEN CHRONOLOGISCH

### 20.11.2025 (vor 2 Tagen)

1. **d2feba3** - LobbyPMS API Import ersetzt Email-Import
   - Scheduler erstellt (läuft alle 10 Minuten)
   - **KRITISCH**: Startet automatisch beim Backend-Start

2. **0e87a7e** - NotificationSettings Cache
   - Sollte Performance verbessern

3. **8f60399** - Server-seitiges Filtering
   - Sollte Performance verbessern

4. **edf6e13** - Branch Settings Migration
   - **MASSIVE Änderung**: 71+ Dateien

### 21.11.2025 (gestern)

5. **f1a1f36** - Reservierungen ohne Branch-Zuordnung beheben
   - Filter-Logik erweitert

### 22.11.2025 (heute)

6. **7aba681** - Scheduler angepasst (nur Branch 3 und 4)
   - **ABER**: Server läuft möglicherweise noch mit altem Code

---

## 🔍 ROOT CAUSE ANALYSIS

### ⚠️ WICHTIG: LobbyPMS Scheduler ist NICHT die Ursache

**Status**: Mehrfach geprüft - Scheduler ist NICHT das Problem
- Scheduler läuft nur alle 10 Minuten
- Code wurde angepasst (nur Branch 3 und 4)
- CPU-Last bleibt auch zwischen Scheduler-Läufen hoch
- **FAZIT**: Scheduler ist ausgeschlossen als Hauptursache

### Sekundäre Probleme

1. **Prisma Connection Pool**
   - Möglicherweise zu klein (nur 5 Verbindungen)
   - Kann bei gleichzeitigen Requests zu Timeouts führen

2. **Encryption/Decryption Overhead**
   - Branch-Settings werden bei jedem Request entschlüsselt?
   - Könnte Performance-Impact haben

3. **Komplexe Filter-Logik**
   - Neue Filter-Funktion könnte ineffizient sein
   - Prisma Where-Klauseln könnten optimiert werden müssen

---

## ✅ LÖSUNGEN (bereits implementiert, aber nicht aktiv)

### 1. Scheduler-Code angepasst
- **Status**: ✅ Code angepasst (nur Branch 3 und 4)
- **Problem**: Server läuft noch mit altem Code
- **Lösung**: Server muss neu gestartet werden mit neuem Code

### 2. Queue-System aktiviert
- **Status**: ✅ Redis installiert, Queue-System aktiviert
- **Problem**: Könnte helfen, aber löst nicht das Hauptproblem

### 3. Performance-Optimierungen
- **Status**: ✅ NotificationSettings Cache, Server-seitiges Filtering
- **Problem**: Verbesserungen greifen möglicherweise nicht, wenn System durch Scheduler blockiert ist

---

## 🎯 EMPFOHLENE NÄCHSTE SCHRITTE

### 1. Server mit neuem Code neu starten (KRITISCH)
- Code wurde angepasst (nur Branch 3 und 4)
- Server muss neu gestartet werden, damit neuer Code aktiv wird

### 2. Prisma Connection Pool prüfen
- DATABASE_URL muss `?connection_limit=20&pool_timeout=20` enthalten
- Falls nicht vorhanden: Hinzufügen und Server neu starten

### 3. Scheduler-Logs überwachen
- Nach Neustart: Prüfen ob Scheduler nur noch Branch 3 und 4 synchronisiert
- Prüfen ob CPU-Last sinkt

### 4. Performance-Messung
- Vorher/Nachher-Vergleich nach Neustart
- Prüfen ob Performance-Verbesserungen (Cache, Filtering) greifen

---

## 📊 ZUSAMMENFASSUNG

**Hauptursache der Performance-Probleme:**
1. **LobbyPMS Scheduler** läuft für alle Branches (ursprünglich)
2. **Fehlgeschlagene API-Calls** für Branch 17 und 18
3. **Server läuft mit altem Code** (Scheduler-Code wurde angepasst, aber nicht aktiv)

**Sekundäre Probleme:**
- Prisma Connection Pool möglicherweise zu klein
- Encryption/Decryption Overhead
- Komplexe Filter-Logik

**Lösung:**
- Server mit neuem Code neu starten
- Prisma Connection Pool prüfen/erweitern
- Scheduler-Logs überwachen

---

---

## 🔍 AKTUELLE SITUATION (Stand: 2025-11-22 02:05 UTC)

### System-Status
- **Backend CPU**: 115% (sehr hoch)
- **PostgreSQL CPU**: 63.6% (hoch)
- **Load Average**: 1.93 (hoch für 2-Core-System)
- **Memory**: 1.3GB verwendet von 3.7GB (OK)

### Code-Status
- ✅ **Neuer Scheduler-Code ist aktiv** (nur Branch 3 und 4)
- ✅ **DATABASE_URL hat Connection Pool** (`connection_limit=20&pool_timeout=20`)
- ✅ **Zentrale Prisma-Instanz existiert**
- ✅ **Queue-System läuft** (Redis verbunden)

### Problem: CPU-Last bleibt hoch

**Trotz aller Fixes:**
- Backend läuft mit 115% CPU
- PostgreSQL läuft mit 63.6% CPU
- System ist langsam

**Mögliche Ursachen:**
1. **Scheduler läuft gerade** (alle 10 Minuten) - könnte temporär sein
2. **Viele gleichzeitige Requests** - aber keine aktiven PostgreSQL-Queries
3. **Ineffiziente Datenbankabfragen** - könnten durch Filter-Logik verursacht werden
4. **Encryption/Decryption Overhead** - Branch-Settings werden bei jedem Request entschlüsselt
5. **Komplexe Filter-Logik** - `filterToPrisma.ts` könnte ineffizient sein

### Nächste Schritte zur Diagnose

1. **Warten auf nächsten Scheduler-Lauf** (in ~10 Minuten)
   - Prüfen ob CPU-Last nach Scheduler-Lauf sinkt
   - Prüfen ob nur Branch 3 und 4 synchronisiert werden

2. **Performance-Profiling**
   - Node.js Profiler aktivieren
   - Prüfen welche Funktionen die meiste CPU verbrauchen

3. **Datenbankabfragen analysieren**
   - Prisma Query Logging aktivieren
   - Prüfen ob langsame Queries vorhanden sind

4. **Encryption/Decryption prüfen**
   - Prüfen ob Branch-Settings bei jedem Request entschlüsselt werden
   - Cache für entschlüsselte Settings implementieren

---

**Erstellt**: 2025-11-22  
**Status**: Analyse abgeschlossen - Keine Änderungen vorgenommen (nur Analyse)  
**Aktueller Stand**: System läuft mit hoher CPU-Last, trotz aller Fixes. Weitere Diagnose erforderlich.

