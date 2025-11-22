# Performance-Problem: Analyse (2025-01-22)

**Status:** 🔴 KRITISCH - Performance ist schlechter als vorher

---

## ❌ PROBLEM

Nach Deployment der Optimierungen ist die Performance **schlechter** als vorher:
- `/api/requests?filterId=204` gibt **500-Fehler** zurück
- Seite lädt langsamer

---

## 🔍 IDENTIFIZIERTE PROBLEME

### 1. 500-Fehler bei `/api/requests?filterId=204`

**Symptom:**
- Request schlägt fehl mit Status 500
- Keine detaillierten Fehler-Logs sichtbar

**Mögliche Ursachen:**
1. Filter-Cache gibt `null` zurück (Filter nicht gefunden)
2. `JSON.parse` Fehler bei `conditions`/`operators`
3. `convertFilterConditionsToPrismaWhere` Fehler
4. Prisma Query Fehler (z.B. durch Indizes)

**Fix implementiert:**
- Try-Catch um Filter-Laden hinzugefügt
- Detailliertes Error-Logging
- Fallback wenn Filter nicht gefunden

---

### 2. Datenbank-Verbindungsprobleme

**Symptom:**
- Logs zeigen: "Can't reach database server at `localhost:5432`"
- PostgreSQL läuft, aber Verbindungsprobleme

**Mögliche Ursachen:**
1. Connection Pool ausgeschöpft
2. Datenbank-Timeout
3. Netzwerk-Problem

---

## 🔧 IMPLEMENTIERTE FIXES

### 1. Error-Handling verbessert

**Datei:** `backend/src/controllers/requestController.ts`

**Änderungen:**
- Try-Catch um Filter-Cache-Laden
- Detailliertes Error-Logging
- Fallback wenn Filter nicht gefunden

**Code:**
```typescript
if (filterId) {
    try {
        const filterData = await filterCache.get(parseInt(filterId, 10));
        if (filterData) {
            const conditions = JSON.parse(filterData.conditions);
            const operators = JSON.parse(filterData.operators);
            filterWhereClause = convertFilterConditionsToPrismaWhere(
                conditions,
                operators,
                'request'
            );
        } else {
            console.warn(`[getAllRequests] Filter ${filterId} nicht gefunden`);
        }
    } catch (filterError) {
        console.error(`[getAllRequests] Fehler beim Laden von Filter ${filterId}:`, filterError);
        // Fallback: Versuche ohne Filter weiter
    }
}
```

---

## 📊 NÄCHSTE SCHRITTE

### 1. Server-Logs prüfen

Nach Deployment mit verbessertem Error-Handling:
```bash
pm2 logs intranet-backend --lines 100 | grep -i "getAllRequests\|FilterCache\|Error"
```

### 2. Filter ID 204 prüfen

Prüfe, ob Filter ID 204 existiert:
```sql
SELECT id, name, conditions, operators 
FROM "SavedFilter" 
WHERE id = 204;
```

### 3. Query-Performance prüfen

Prüfe, ob Indizes verwendet werden:
```sql
EXPLAIN ANALYZE 
SELECT * FROM "Request" 
WHERE ... -- Filter-Bedingungen
```

---

## ⚠️ MÖGLICHE ROOT CAUSES

1. **Filter-Cache Problem**
   - Filter wird nicht gefunden
   - JSON-Parse Fehler
   - Cache gibt falsche Daten zurück

2. **Indizes Problem**
   - Indizes wurden nicht richtig erstellt
   - PostgreSQL verwendet Indizes nicht
   - Indizes verlangsamen Query (selten, aber möglich)

3. **Query-Komplexität**
   - `convertFilterConditionsToPrismaWhere` erzeugt ineffiziente Queries
   - Verschachtelte AND/OR-Bedingungen zu komplex
   - Full Table Scan trotz Indizes

4. **Datenbank-Verbindung**
   - Connection Pool ausgeschöpft
   - Timeout-Probleme
   - Netzwerk-Latenz

---

**Erstellt:** 2025-01-22  
**Status:** 🔴 Problem identifiziert, Fixes implementiert, Verifizierung nötig

