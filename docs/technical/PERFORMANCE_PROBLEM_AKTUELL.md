# Performance-Problem: Aktuell (2025-01-22)

**Status:** 🔴 KRITISCH - Performance ist schlechter als vorher  
**Datum:** 2025-01-22

---

## 🔴 PROBLEM

**User-Feedback:**
> "Die Seite lädt mindestens immer noch gleich langsam, wenn nicht langsamer.. überall wo etwas von der db kommen muss (requests, to do's, zeitmessung, etc. etc.) wird es gefühlt immer schlimmer"

**Gemessene Performance:**
- `/api/requests` Query: **4390ms** für 396 Requests
- `/api/requests?filterId=204` Query: **471ms** für 82 Requests

**Das ist viel zu langsam!**

---

## 🔍 IDENTIFIZIERTE PROBLEME

### 1. Attachments werden IMMER geladen

**Code:**
```typescript
include: {
    attachments: {
        orderBy: { uploadedAt: 'desc' }
    }
}
```

**Problem:**
- Attachments werden für ALLE Requests geladen
- Auch wenn sie nicht angezeigt werden
- Kann bei vielen Attachments sehr langsam sein

**Impact:**
- Zusätzliche JOINs
- Große Datenmengen
- Langsame Queries

### 2. Indizes möglicherweise nicht verwendet

**Status:**
- Indizes wurden erstellt
- Aber werden sie verwendet?
- EXPLAIN ANALYZE muss prüfen

### 3. Komplexe WHERE-Klauseln

**Problem:**
- Verschachtelte AND/OR-Bedingungen
- Viele JOINs (requester, responsible, branch, attachments)
- Könnte zu Full Table Scans führen

---

## 🔧 SOFORTMASSNAHMEN

### 1. Attachments optional machen

**Lösung:**
- Attachments nur laden wenn `?includeAttachments=true`
- Standard: Keine Attachments laden
- Frontend kann bei Bedarf nachladen

### 2. Query-Performance prüfen

**Prüfen:**
- EXPLAIN ANALYZE für die Query
- Werden Indizes verwendet?
- Gibt es Full Table Scans?

### 3. Pagination implementieren

**Lösung:**
- Standard: Nur 50 Requests laden
- Weitere bei Bedarf nachladen
- Reduziert Datenmenge drastisch

---

## 📊 VERGLEICH

### Vorher (ohne Optimierungen):
- Alle Requests laden: ~3-5 Sekunden
- Aber: Client-seitiges Filtering

### Nachher (mit Optimierungen):
- Query: 4.39 Sekunden für 396 Requests
- **Problem:** Langsamer als vorher!

### Erwartet:
- Query: 0.5-2 Sekunden
- **Tatsächlich:** 4.39 Sekunden

---

## ⚠️ ROOT CAUSE

**Mögliche Ursachen:**

1. **Attachments werden immer geladen**
   - Bei 396 Requests mit je 2-3 Attachments = 800-1200 zusätzliche Zeilen
   - JOINs verlangsamen Query

2. **Indizes werden nicht verwendet**
   - EXPLAIN ANALYZE muss prüfen
   - Möglicherweise falsche Index-Definition

3. **Komplexe WHERE-Klauseln**
   - Verschachtelte AND/OR
   - PostgreSQL kann nicht optimieren

4. **Zu viele Daten auf einmal**
   - 396 Requests mit allen Relations
   - Große JSON-Response

---

## 🔧 NÄCHSTE SCHRITTE

### 1. Attachments optional machen (SOFORT)

**Implementierung:**
```typescript
const includeAttachments = req.query.includeAttachments === 'true';
const include = {
    requester: { select: userSelect },
    responsible: { select: userSelect },
    branch: { select: branchSelect },
    ...(includeAttachments ? {
        attachments: { orderBy: { uploadedAt: 'desc' } }
    } : {})
};
```

### 2. Pagination implementieren

**Standard:**
- Limit: 50 Requests
- Weitere bei Bedarf nachladen

### 3. Query-Performance prüfen

**EXPLAIN ANALYZE:**
- Prüfe ob Indizes verwendet werden
- Identifiziere langsame Teile

---

**Erstellt:** 2025-01-22  
**Status:** 🔴 KRITISCH - Performance-Problem identifiziert, Lösungen in Arbeit

