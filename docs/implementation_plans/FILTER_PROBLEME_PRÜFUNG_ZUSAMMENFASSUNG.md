# Prüfung: Filter-Probleme - Zusammenfassung

## ✅ GEPRÜFTE CODE-STELLEN

### Problem 1: "Todos" Filter nicht gelöscht

**Migration-Script:**
- Zeile 18-26: Case-sensitive Suche nach `['Alle', 'Todos', 'All', 'Alles']`
- Problem: Prisma `in` ist case-sensitive

**Seed:**
- KEIN "Todos" Filter für `requests-table` wird erstellt
- Filter wird nicht automatisch erstellt

**SavedFilterTags:**
- Zeile 69: Übersetzt "Todos" zu "Alle" beim Anzeigen
- Filter könnte als "Todos" gespeichert sein, wird aber als "Alle" angezeigt

**Mögliche Ursachen:**
1. Filter wurde manuell erstellt
2. Filter-Name ist anders (z.B. "todos" kleingeschrieben)
3. Filter wurde nach Migration durch Seed erneut erstellt

---

### Problem 2: User-Filter Requests ohne Status-Bedingungen

**Migration-Script:**
- Zeile 41-50: Findet nur Filter in "Users"/"Benutzer"/"Usuarios" Gruppen
- Zeile 59-61: Prüft ob Status-Bedingungen vorhanden sind
- Problem: Prüft nur ob EINE Bedingung vorhanden ist, nicht ob BEIDE fehlen
- Problem: Filter ohne `groupId` werden nicht gefunden

**FilterContext:**
- Zeile 75: Cache-TTL 60 Minuten
- Zeile 101-103: Wenn Filter im Cache, wird sofort zurückgegeben
- Zeile 144-145: Cache wird SOFORT gesetzt (vor State-Update)
- Problem: Nach Migration werden alte Filter aus Cache angezeigt

**Seed:**
- Zeile 2215-2223: Erstellt Filter mit Status-Bedingungen
- Problem: Wenn Seed nach Migration läuft, werden Filter zurückgesetzt

**Kritische Probleme:**
1. Cache zeigt alte Filter (60 Min TTL)
2. Prüfung findet Bedingungen nicht (falsche Logik)
3. Filter außerhalb Gruppen werden nicht gefunden

---

### Problem 3: ToDos User-Filter falsche Struktur

**Seed:**
- Zeile 2224-2231: Erstellt korrekt `[responsible, qualityControl, status]` mit `['OR', 'AND']`
- Bedeutung: `(responsible OR qualityControl) AND status != done` ✅

**filterLogic.ts:**
- Zeile 216-224: Interpretiert korrekt
- Ergebnis: `(responsible OR qualityControl) AND status != done` ✅

**FilterPane:**
- Zeile 251-256: Zeigt Operatoren korrekt zwischen Bedingungen
- Anzeige sollte korrekt sein ✅

**Screenshot zeigt:**
- Screenshot 1: 4 Bedingungen, 3 Operatoren (andere Struktur)
- Screenshot 2: 3 Bedingungen, 2 Operatoren (korrekte Struktur)

**Mögliche Ursachen:**
1. Filter wurde manuell erstellt (nicht durch Seed)
2. Filter wurde nach Migration falsch aktualisiert
3. FilterPane zeigt Filter falsch an (UI-Bug)

---

### Problem 4: Rollen-Filter fehlen Status-Bedingungen

**Seed:**
- Zeile 2165-2169: Erstellt nur `[responsible = role]` ohne Status-Bedingung
- Zeile 2150: Rollen-Filter nur für `worktracker-todos`, nicht für `requests-table`

**Migration-Script:**
- Zeile 97-162: Behandelt nur User-Filter
- Rollen-Filter werden NICHT behandelt

**Kritische Probleme:**
1. Rollen-Filter haben keine Status-Bedingungen
2. Migration aktualisiert sie nicht
3. Seed erstellt sie ohne Status-Bedingungen

---

### Problem 5: Tours zeigt falsche Filter

**Seed:**
- Zeile 1824-1849: Erstellt Filter für `worktracker-tours` mit Name "Aktuell"
- Zeile 1695-1722: Erstellt Filter für `worktracker-reservations` mit Name "Hoy"

**ToursTab:**
- Zeile 30: `TOURS_TABLE_ID = 'worktracker-tours'` ✅
- Zeile 671: `tableId={TOURS_TABLE_ID}` ✅

**SavedFilterTags:**
- Zeile 89: Lädt Filter über `filterContext.getFilters(tableId)`
- Zeile 208: `loadFilters(tableId)` wird aufgerufen

**FilterContext:**
- Zeile 127-130: Lädt Filter für `tableId` von API
- Zeile 101-103: Cache prüft `filtersRef.current[tableId]`

**Mögliche Ursachen:**
1. Filter für `worktracker-tours` existieren nicht in DB (Seed nicht ausgeführt?)
2. FilterContext lädt Filter für falsche `tableId` (Cache-Problem?)
3. Filter werden geladen, aber nicht angezeigt (UI-Bug)

---

## 🔍 KRITISCHE ERKENNTNISSE

### 1. FilterContext Cache-Problem
- **Cache-TTL:** 60 Minuten
- **Problem:** Nach Migration werden alte Filter aus Cache angezeigt
- **Lösung:** Cache nach Migration invalidieren oder Seite neu laden

### 2. Migration-Script Prüfung falsch
- **Problem:** Prüft nur ob EINE Status-Bedingung vorhanden ist
- **Sollte prüfen:** Ob BEIDE Status-Bedingungen fehlen
- **Lösung:** Prüfung verbessern - beide Bedingungen separat prüfen

### 3. Migration findet nicht alle Filter
- **Problem:** Findet nur Filter in "Users"-Gruppen
- **Fehlt:** Filter ohne `groupId`, Filter in anderen Gruppen
- **Lösung:** Alle User-Filter prüfen, nicht nur in Gruppen

### 4. "Todos" Filter Case-Sensitivity
- **Problem:** Prisma `in` ist case-sensitive
- **Lösung:** Case-insensitive Suche oder alle Varianten prüfen

### 5. Rollen-Filter werden nicht behandelt
- **Problem:** Migration behandelt nur User-Filter
- **Lösung:** Migration erweitern für Rollen-Filter

---

## 📋 PRÜFUNG NÖTIG (DB direkt)

1. **"Todos" Filter:**
   ```sql
   SELECT * FROM "SavedFilter" 
   WHERE "tableId" = 'requests-table' 
   AND (LOWER("name") LIKE '%todo%' OR LOWER("name") LIKE '%alle%');
   ```

2. **User-Filter Requests:**
   ```sql
   SELECT id, name, conditions, operators, "groupId"
   FROM "SavedFilter" 
   WHERE "tableId" = 'requests-table'
   AND ("groupId" IN (SELECT id FROM "FilterGroup" WHERE "tableId" = 'requests-table' AND "name" IN ('Users', 'Benutzer', 'Usuarios'))
        OR "groupId" IS NULL);
   ```

3. **ToDos User-Filter:**
   ```sql
   SELECT id, name, conditions, operators
   FROM "SavedFilter" 
   WHERE "tableId" = 'worktracker-todos'
   AND "groupId" IN (SELECT id FROM "FilterGroup" WHERE "tableId" = 'worktracker-todos' AND "name" IN ('Users', 'Benutzer', 'Usuarios'));
   ```

4. **Rollen-Filter:**
   ```sql
   SELECT id, name, conditions, operators
   FROM "SavedFilter" 
   WHERE "tableId" = 'worktracker-todos'
   AND "groupId" IN (SELECT id FROM "FilterGroup" WHERE "tableId" = 'worktracker-todos' AND "name" IN ('Roles', 'Rollen'));
   ```

5. **Tours Filter:**
   ```sql
   SELECT id, name, conditions, operators
   FROM "SavedFilter" 
   WHERE "tableId" = 'worktracker-tours';
   ```

---

## 📋 PRÜFUNG NÖTIG (Frontend)

1. **FilterContext Cache:**
   - Browser Console: `localStorage` prüfen
   - React DevTools: FilterContext State prüfen
   - Network Tab: API-Response prüfen

2. **SavedFilterTags:**
   - Console-Log: Welche Filter werden geladen?
   - React DevTools: Welche Filter werden angezeigt?

3. **FilterPane:**
   - Filter öffnen: Zeigt Filter korrekt an?
   - Bedingungen prüfen: Sind alle Bedingungen vorhanden?

---

## ✅ BESTÄTIGTE PROBLEME

1. ✅ **"Todos" Filter:** Case-sensitive Suche, Filter könnte anders heißen
2. ✅ **User-Filter Requests:** Cache-Problem ODER Prüfung falsch ODER Filter außerhalb Gruppen
3. ✅ **ToDos User-Filter:** Struktur könnte falsch sein (Screenshot zeigt andere Struktur)
4. ✅ **Rollen-Filter:** Haben keine Status-Bedingungen, Migration behandelt sie nicht
5. ✅ **Tours Filter:** Filter existieren im Seed, aber möglicherweise nicht in DB

---

## 🎯 NÄCHSTE SCHRITTE

1. **DB direkt prüfen** (SQL-Queries oben)
2. **Frontend prüfen** (Console, React DevTools)
3. **Migration-Script erweitern** (alle Probleme beheben)
4. **Seed erweitern** (Rollen-Filter, falls nötig)

