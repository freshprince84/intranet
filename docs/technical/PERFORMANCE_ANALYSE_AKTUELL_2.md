# Performance-Analyse: Aktuelle Situation (Stand: 2025-11-22 02:47 UTC)

## 🔴 KRITISCH: System immer noch unbrauchbar langsam

**Status:**
- CPU-Last: **166.7%** (Backend-Prozess)
- Load Average: 1.30-2.01 (hoch für 2-Core-System)
- System ist **praktisch unbrauchbar**

## ❌ Branch-Settings-Cache hilft NICHT

**Warum:**
- `/api/worktime/active` lädt Branch-Daten mit `include: { branch: true }`
- **ABER**: Es entschlüsselt KEINE Settings!
- Der Cache wird nur bei `/api/branches` verwendet, nicht bei `/api/worktime/active`

**Fazit:** Der Cache löst das Problem nicht, weil `/api/worktime/active` die Settings gar nicht entschlüsselt.

## 🔍 NEUE ERKENNTNISSE

### 1. Viele Notifications werden erstellt
- **162 Notifications** in den letzten 2000 Log-Zeilen
- Jede Notification-Erstellung macht DB-Queries
- Könnte CPU-Last verursachen

### 2. getUserLanguage wird sehr oft aufgerufen
- **93 Aufrufe** in den letzten 1000 Log-Zeilen
- Wird bei jeder Notification-Erstellung aufgerufen
- Macht DB-Query pro Aufruf

### 3. Prisma-Fehler in Logs
- `PrismaClientKnownRequestError` in Organization Middleware
- Könnte zu wiederholten Versuchen führen

## 🎯 MÖGLICHE URSACHEN

1. **Notification-Erstellung ist zu häufig**
   - 162 Notifications in kurzer Zeit
   - Jede macht mehrere DB-Queries
   - `getUserLanguage` wird bei jeder aufgerufen

2. **getUserLanguage nicht gecacht**
   - 93 Aufrufe in 1000 Log-Zeilen
   - Macht DB-Query pro Aufruf
   - Könnte gecacht werden

3. **Prisma-Fehler verursachen Retries**
   - Fehler in Organization Middleware
   - Könnte zu wiederholten Versuchen führen

4. **Viele gleichzeitige Requests**
   - Frontend pollt sehr häufig
   - Jeder Request macht DB-Queries

## 🔧 NÄCHSTE SCHRITTE

1. **getUserLanguage cachen**
   - User-Sprache ändert sich selten
   - Cache mit TTL: 5-10 Minuten

2. **Notification-Erstellung optimieren**
   - Batch-Processing für mehrere Notifications
   - Reduziere DB-Queries

3. **Prisma-Fehler beheben**
   - Prüfe warum Organization Middleware Fehler wirft
   - Behebe die Ursache

4. **Frontend-Polling reduzieren**
   - Erhöhe Polling-Intervall
   - Oder: WebSocket/SSE für Echtzeit-Updates

---

**Erstellt**: 2025-11-22 02:47 UTC  
**Status**: System immer noch sehr langsam, weitere Analyse erforderlich

