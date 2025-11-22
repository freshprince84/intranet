# Performance-Analyse: Aktuelle Ursache (Letzte 2-3 Tage)

**Datum:** 2025-01-21  
**Status:** 🔴 KRITISCH - Root Cause Analysis  
**Wichtig:** Diese Analyse fokussiert auf ÄNDERUNGEN der letzten 2-3 Tage

---

## ⚠️ WICHTIG: Vorherige Analyse war falsch!

**Meine erste Analyse war falsch:**
- Pagination, Polling, etc. waren schon vorher da
- Diese sind NICHT die Ursache der aktuellen Langsamkeit
- **Das Problem muss mit Änderungen der letzten 2-3 Tage zusammenhängen!**

---

## 📅 CHRONOLOGIE DER LETZTEN ÄNDERUNGEN

### 20.11.2025 (vor 2 Tagen) - KRITISCH

#### 1. 🔴 Server-seitiges Filtering (8f60399)

**Was wurde geändert:**
- Filter-Logik vom Frontend ins Backend verschoben
- Neue Funktion `convertFilterConditionsToPrismaWhere` erstellt
- Frontend sendet Filter-Parameter, Backend filtert in Datenbank

**Code-Änderungen:**
- `backend/src/utils/filterToPrisma.ts` (NEU - 252 Zeilen)
- `backend/src/controllers/requestController.ts` - Filter-Parameter hinzugefügt
- `backend/src/controllers/taskController.ts` - Filter-Parameter hinzugefügt

**Mögliches Problem:**
- **Komplexe Filter-Logik** könnte bei vielen Bedingungen langsam sein
- **Prisma Where-Klauseln** könnten ineffizient sein bei komplexen Filtern
- **Verschachtelte AND/OR-Bedingungen** (Zeile 50-80 in filterToPrisma.ts)
- **Keine Indizes** auf gefilterten Feldern könnten Full Table Scans verursachen

**Status:** ⚠️ **VERDACHTIG** - Implementiert am 20.11., könnte Performance-Problem verursachen

---

#### 2. 🔴 Branch Settings Migration (edf6e13)

**Was wurde geändert:**
- **MASSIVE Änderung**: Alle Services, Controller, Queues, Utils, etc. auf Branch-Settings umgestellt
- **71+ Dateien geändert** (laut Commit-Message)
- Branch-Settings werden jetzt überall verwendet

**Mögliches Problem:**
- **Encryption/Decryption bei jedem Request**: Branch-Settings werden bei jedem Request entschlüsselt
- **AES-256-GCM Verschlüsselung ist CPU-intensiv**: Jede Entschlüsselung kostet CPU-Zyklen
- **Bei 214 Requests für `/api/worktime/active`**: 214 Entschlüsselungen pro Minute

**ABER:** Dokumentation sagt, dass `/api/worktime/active` KEINE Settings entschlüsselt (PERFORMANCE_ANALYSE_AKTUELL_2.md, Zeile 13-15)

**Status:** ⚠️ **TEILWEISE AUSGESCHLOSSEN** - Aber könnte bei anderen Endpoints problematisch sein

---

#### 3. NotificationSettings Cache (0e87a7e)

**Was wurde geändert:**
- In-Memory Cache für Notification Settings erstellt
- TTL: 5 Minuten
- Sollte Performance verbessern

**Status:** ✅ **SOLLTE HELFEN** - Nicht die Ursache

---

### 21.11.2025 (gestern)

#### 4. Reservierungen ohne Branch-Zuordnung beheben (f1a1f36)

**Was wurde geändert:**
- Filter-Logik erweitert
- Reservierungs-Handling verbessert

**Status:** ⚠️ **MÖGLICH** - Könnte Filter-Logik beeinflussen

---

### 22.11.2025 (heute)

#### 5. getUserLanguage Optimierung

**Was wurde geändert:**
- getUserLanguage wurde optimiert
- CPU-Last ist von 172.7% auf 0% gesunken (PERFORMANCE_ANALYSE_NACH_OPTIMIERUNG.md)

**Status:** ✅ **BEREITS OPTIMIERT** - Nicht mehr das Problem

---

## 🎯 ROOT CAUSE ANALYSIS

### Hauptverdacht: Server-seitiges Filtering (20.11.2025)

**Warum:**
1. **Timing passt:** Implementiert am 20.11., Performance-Probleme begannen danach
2. **Komplexe Logik:** Verschachtelte AND/OR-Bedingungen (filterToPrisma.ts, Zeile 50-80)
3. **Ineffiziente Queries:** Könnte Full Table Scans verursachen ohne Indizes
4. **Wird bei JEDEM Request verwendet:** `/api/requests` und `/api/tasks` verwenden es

**Mögliche Probleme:**

1. **Komplexe Filter-Konvertierung** (filterToPrisma.ts, Zeile 27-81)
   - Verschachtelte Schleifen
   - Komplexe AND/OR-Gruppierung
   - Könnte bei vielen Bedingungen langsam sein

2. **Ineffiziente Prisma Where-Klauseln**
   - `contains` mit `mode: 'insensitive'` (Zeile 105) = Full Table Scan ohne Index
   - `startsWith` mit `mode: 'insensitive'` (Zeile 107) = Full Table Scan ohne Index
   - `endsWith` mit `mode: 'insensitive'` (Zeile 109) = Full Table Scan ohne Index
   - Branch-Filter mit `name: { contains: value, mode: 'insensitive' }` (Zeile 247) = Full Table Scan

3. **Keine Indizes auf gefilterten Feldern**
   - `title` (contains, startsWith, endsWith) - kein Index
   - `branch.name` (contains) - kein Index
   - `status`, `type` - möglicherweise kein Index

---

## 🔍 ZU PRÜFENDE STELLEN

### 1. `/api/requests` Endpoint mit Filter

**Datei:** `backend/src/controllers/requestController.ts`

**Zeile 78-100:** Filter-Logik
```typescript
if (filterId) {
    const savedFilter = await prisma.savedFilter.findUnique({
        where: { id: parseInt(filterId, 10) }
    });
    if (savedFilter) {
        const conditions = JSON.parse(savedFilter.conditions);
        const operators = JSON.parse(savedFilter.operators);
        filterWhereClause = convertFilterConditionsToPrismaWhere(
            conditions,
            operators,
            'request'
        );
    }
}
```

**Problem:** 
- `convertFilterConditionsToPrismaWhere` könnte langsame Queries erzeugen
- Besonders bei `contains`, `startsWith`, `endsWith` ohne Indizes

---

### 2. Filter-Komplexität prüfen

**Zu prüfen:**
- Welche Filter werden tatsächlich verwendet?
- Wie viele Bedingungen haben die Filter?
- Verwenden sie `contains`, `startsWith`, `endsWith`?

**Mögliche Lösung:**
- Indizes auf `title`, `branch.name` erstellen
- Oder: Filter-Logik optimieren (z.B. nur `equals` für schnelle Queries)

---

### 3. Prisma Query Performance

**Zu prüfen:**
- EXPLAIN ANALYZE für `/api/requests` Query mit Filter
- Welche Indizes werden verwendet?
- Gibt es Full Table Scans?

---

## 💡 SOFORTMASSNAHMEN

### 1. Filter-Logik prüfen

**Was zu tun:**
- Prüfe, welche Filter tatsächlich verwendet werden
- Prüfe Query-Performance mit EXPLAIN ANALYZE
- Identifiziere langsame Filter-Bedingungen

### 2. Indizes erstellen (falls nötig)

**Mögliche Indizes:**
```sql
-- Für title-Filter
CREATE INDEX IF NOT EXISTS "idx_request_title" ON "Request"("title");

-- Für branch.name-Filter
CREATE INDEX IF NOT EXISTS "idx_branch_name" ON "Branch"("name");

-- Composite Index für häufig gefilterte Felder
CREATE INDEX IF NOT EXISTS "idx_request_status_type" ON "Request"("status", "type");
```

### 3. Filter-Logik optimieren

**Falls `contains`, `startsWith`, `endsWith` problematisch sind:**
- Nur `equals` verwenden (schneller)
- Oder: Full-Text-Search implementieren (PostgreSQL tsvector)

---

## 📊 NÄCHSTE SCHRITTE

1. **Prüfe tatsächlich verwendete Filter**
   - Welche Filter werden auf `/api/requests` verwendet?
   - Welche Bedingungen haben sie?

2. **Prüfe Query-Performance**
   - EXPLAIN ANALYZE für `/api/requests` mit Filter
   - Identifiziere langsame Teile

3. **Prüfe Indizes**
   - Welche Indizes existieren bereits?
   - Welche fehlen?

4. **Optimierung implementieren**
   - Indizes erstellen
   - Oder: Filter-Logik optimieren

---

**Erstellt:** 2025-01-21  
**Status:** 🔍 Root Cause Analysis - Server-seitiges Filtering ist Hauptverdacht

