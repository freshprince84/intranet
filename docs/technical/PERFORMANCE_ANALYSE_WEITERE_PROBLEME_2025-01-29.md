# Performance-Analyse: Weitere Probleme (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - Nichts geändert  
**Zweck:** Suche nach ähnlichen Performance-Problemen wie dem 63 MB Settings-Problem

---

## 🔍 IDENTIFIZIERTE PROBLEME

### Problem 1: FilterTags dauern immer noch 2-3 Sekunden ⚠️🔴

**User-Bericht:**
> "bis jeweils die filtertags angezeigt werden, dauert teilweise 2-3 sekunden"

**Status:**
- ✅ FilterListCache wurde bereits implementiert (2025-01-26)
- ✅ Cache sollte Ladezeit von 3-6s auf 0.1-0.2s reduzieren
- ⚠️ **ABER:** User berichtet immer noch 2-3 Sekunden

**Mögliche Ursachen:**

1. **Cache funktioniert nicht richtig**
   - Cache wird nicht verwendet?
   - Cache ist abgelaufen (TTL: 5 Minuten)?
   - Cache-Invalidierung zu häufig?

2. **JSON-Parsing ist langsam**
   - `conditions`, `operators`, `sortDirections` werden bei jedem Request geparst
   - Bei vielen Filtern: Langsam
   - **Datei:** `backend/src/services/filterListCache.ts:95-110`

3. **Doppelte Requests (Frontend)**
   - `Worktracker.tsx` lädt Filter selbst
   - `SavedFilterTags` lädt Filter auch
   - **Beide Requests** gehen durch (auch wenn gecacht)

4. **DB-Query ist langsam trotz Cache**
   - Bei Cache-Miss: DB-Query dauert 1-2 Sekunden
   - JSON-Parsing dauert zusätzlich 0.5-1 Sekunde
   - **Gesamt:** 2-3 Sekunden

**Zu prüfen:**
- Werden Cache-Logs ausgegeben? (`[FilterListCache] ✅ Cache-Hit` oder `💾 Cache-Miss`)
- Wie viele Filter gibt es pro User/Table?
- Wie groß sind die `conditions`, `operators`, `sortDirections` JSON-Strings?

**Analysier-Befehle:**
```bash
# Prüfe Filter-Anzahl und Größe
sudo -u postgres psql -d intranet -c "
SELECT 
    userId,
    tableId,
    COUNT(*) as filter_count,
    AVG(length(conditions)) as avg_conditions_size,
    AVG(length(operators)) as avg_operators_size,
    AVG(length(sortDirections)) as avg_sortDirections_size,
    MAX(length(conditions)) as max_conditions_size
FROM \"SavedFilter\"
GROUP BY userId, tableId
ORDER BY filter_count DESC;
"

# Prüfe größte Filter
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    userId,
    tableId,
    name,
    pg_size_pretty(length(conditions)::bigint) as conditions_size,
    pg_size_pretty(length(operators)::bigint) as operators_size,
    pg_size_pretty(length(sortDirections)::bigint) as sortDirections_size
FROM \"SavedFilter\"
ORDER BY (length(conditions) + length(operators) + COALESCE(length(sortDirections), 0)) DESC
LIMIT 10;
"
```

---

### Problem 2: Branch Settings könnten ähnliche Probleme haben ⚠️🟡

**Gefundene JSON-Felder in Branch:**
- `whatsappSettings` (Json?)
- `lobbyPmsSettings` (Json?)
- `boldPaymentSettings` (Json?)
- `doorSystemSettings` (Json?)
- `emailSettings` (Json?)

**Mögliche Probleme:**
1. **Mehrfache Verschlüsselung** (wie bei Organization Settings)
   - `encryptBranchApiSettings` hat Checks (✅)
   - **ABER:** Prüfe ob alle Felder korrekt gehandhabt werden

2. **Große Settings-Strukturen**
   - Könnten ähnlich groß werden wie Organization Settings
   - Keine Validierung der Größe

**Zu prüfen:**
```bash
# Prüfe Branch Settings-Größe
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    pg_size_pretty(pg_column_size(whatsappSettings)::bigint) as whatsapp_size,
    pg_size_pretty(pg_column_size(lobbyPmsSettings)::bigint) as lobbypms_size,
    pg_size_pretty(pg_column_size(boldPaymentSettings)::bigint) as boldpayment_size,
    pg_size_pretty(pg_column_size(doorSystemSettings)::bigint) as doorsystem_size,
    pg_size_pretty(pg_column_size(emailSettings)::bigint) as email_size
FROM \"Branch\"
WHERE whatsappSettings IS NOT NULL 
   OR lobbyPmsSettings IS NOT NULL 
   OR boldPaymentSettings IS NOT NULL 
   OR doorSystemSettings IS NOT NULL 
   OR emailSettings IS NOT NULL
ORDER BY (
    COALESCE(pg_column_size(whatsappSettings), 0) +
    COALESCE(pg_column_size(lobbyPmsSettings), 0) +
    COALESCE(pg_column_size(boldPaymentSettings), 0) +
    COALESCE(pg_column_size(doorSystemSettings), 0) +
    COALESCE(pg_column_size(emailSettings), 0)
) DESC;
"
```

---

### Problem 3: SavedFilter JSON-Parsing könnte langsam sein ⚠️🟡

**Gefundene Felder:**
- `conditions` (String - JSON-String)
- `operators` (String - JSON-String)
- `sortDirections` (String? - JSON-String)

**Problem:**
- JSON-Strings werden bei jedem Request geparst
- Bei vielen/großen Filtern: Langsam
- **Datei:** `backend/src/services/filterListCache.ts:95-110`

**Aktuelle Implementierung:**
```typescript
// filterListCache.ts:95-110
const parsedFilters = filters.map(filter => ({
  ...filter,
  conditions: JSON.parse(filter.conditions),
  operators: JSON.parse(filter.operators),
  sortDirections: filter.sortDirections ? JSON.parse(filter.sortDirections) : undefined
}));
```

**Mögliche Optimierungen:**
1. **Caching der geparsten Filter** (bereits implementiert ✅)
2. **Lazy Parsing:** Nur parsen wenn benötigt
3. **Validierung:** Warnung wenn Filter zu groß (> 10 KB)

---

### Problem 4: Weitere große JSON-Felder ⚠️🟡

**Gefundene JSON-Felder im Schema:**

1. **User:**
   - `onboardingProgress` (Json?) - Fortschritt des Onboardings

2. **SavedFilter:**
   - `conditions` (String) - JSON-String
   - `operators` (String) - JSON-String
   - `sortDirections` (String?) - JSON-String

3. **Viele andere Modelle:**
   - `eventData` (Json?) - Event-Daten
   - `syncData` (Json?) - Sync-Daten
   - `context` (Json?) - Kontext-Daten
   - `galleryUrls` (Json?) - Galerie-URLs
   - `recurringSchedule` (Json?) - Wiederkehrender Zeitplan
   - `alternativeTours` (Json?) - Alternative Touren
   - `extractedData` (Json?) - Extrahierte Daten
   - `details` (Json?) - Zusätzliche Details

**Zu prüfen:**
- Welche dieser Felder werden häufig geladen?
- Wie groß sind sie?
- Könnten sie Performance-Probleme verursachen?

**Analysier-Befehl:**
```bash
# Prüfe alle großen JSON-Felder
sudo -u postgres psql -d intranet -c "
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    pg_size_pretty(avg(pg_column_size((attname)::text))::bigint) as avg_size,
    pg_size_pretty(max(pg_column_size((attname)::text))::bigint) as max_size
FROM pg_stats
WHERE schemaname = 'public' 
  AND attname LIKE '%Json%' OR attname LIKE '%json%' OR attname LIKE '%Jsonb%' OR attname LIKE '%jsonb%'
GROUP BY schemaname, tablename, attname
ORDER BY max(pg_column_size((attname)::text)) DESC
LIMIT 20;
"
```

---

### Problem 5: Verschlüsselung in anderen Stellen ⚠️🟡

**Gefundene Verschlüsselungs-Funktionen:**

1. **`encryptApiSettings`** (Organization Settings)
   - ✅ Checks implementiert (verhindert mehrfache Verschlüsselung)

2. **`encryptBranchApiSettings`** (Branch Settings)
   - ✅ Checks implementiert (verhindert mehrfache Verschlüsselung)

3. **`encryptSecret`** (Einzelne Secrets)
   - ⚠️ Keine Check ob bereits verschlüsselt
   - **ABER:** Wird nur von `encryptApiSettings` und `encryptBranchApiSettings` verwendet
   - **Sollte OK sein** (wird durch höhere Funktionen geschützt)

**Zu prüfen:**
- Werden `encryptSecret` direkt aufgerufen? (außerhalb von `encryptApiSettings`/`encryptBranchApiSettings`)
- Gibt es andere Stellen, wo Verschlüsselung mehrfach passieren könnte?

**Grep-Befehl:**
```bash
# Suche nach direkten encryptSecret-Aufrufen
grep -r "encryptSecret(" backend/src --exclude-dir=node_modules
```

---

## 📊 ZUSAMMENFASSUNG

### Kritische Probleme (🔴):
1. **FilterTags dauern 2-3 Sekunden** - Cache funktioniert möglicherweise nicht richtig

### Potenzielle Probleme (🟡):
2. **Branch Settings** - Könnten ähnliche Probleme wie Organization Settings haben
3. **SavedFilter JSON-Parsing** - Könnte bei vielen/großen Filtern langsam sein
4. **Weitere große JSON-Felder** - Könnten Performance-Probleme verursachen
5. **Verschlüsselung in anderen Stellen** - Prüfen ob mehrfache Verschlüsselung möglich ist

---

## 🔧 NÄCHSTE SCHRITTE

### SOFORT (🔴):
1. **FilterTags-Problem analysieren**
   - Cache-Logs prüfen (werden Cache-Hits/Misses geloggt?)
   - Filter-Anzahl und Größe prüfen
   - JSON-Parsing-Zeit messen

### KURZFRISTIG (🟡):
2. **Branch Settings prüfen**
   - Größe aller Branch Settings prüfen
   - Prüfen ob mehrfache Verschlüsselung möglich ist

3. **Weitere große JSON-Felder prüfen**
   - Größe aller JSON-Felder prüfen
   - Identifizieren welche häufig geladen werden

4. **Verschlüsselung prüfen**
   - Prüfen ob `encryptSecret` direkt aufgerufen wird
   - Prüfen ob mehrfache Verschlüsselung möglich ist

---

## 📝 ANALYSIER-BEFEHLE (Zusammenfassung)

```bash
# 1. FilterTags-Problem analysieren
sudo -u postgres psql -d intranet -c "
SELECT 
    userId,
    tableId,
    COUNT(*) as filter_count,
    AVG(length(conditions)) as avg_conditions_size,
    MAX(length(conditions)) as max_conditions_size
FROM \"SavedFilter\"
GROUP BY userId, tableId
ORDER BY filter_count DESC;
"

# 2. Branch Settings-Größe prüfen
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    pg_size_pretty((
        COALESCE(pg_column_size(whatsappSettings), 0) +
        COALESCE(pg_column_size(lobbyPmsSettings), 0) +
        COALESCE(pg_column_size(boldPaymentSettings), 0) +
        COALESCE(pg_column_size(doorSystemSettings), 0) +
        COALESCE(pg_column_size(emailSettings), 0)
    )::bigint) as total_settings_size
FROM \"Branch\"
WHERE whatsappSettings IS NOT NULL 
   OR lobbyPmsSettings IS NOT NULL 
   OR boldPaymentSettings IS NOT NULL 
   OR doorSystemSettings IS NOT NULL 
   OR emailSettings IS NOT NULL
ORDER BY (
    COALESCE(pg_column_size(whatsappSettings), 0) +
    COALESCE(pg_column_size(lobbyPmsSettings), 0) +
    COALESCE(pg_column_size(boldPaymentSettings), 0) +
    COALESCE(pg_column_size(doorSystemSettings), 0) +
    COALESCE(pg_column_size(emailSettings), 0)
) DESC;
"

# 3. Verschlüsselung prüfen
grep -r "encryptSecret(" backend/src --exclude-dir=node_modules | grep -v "encryptApiSettings\|encryptBranchApiSettings"
```

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 ANALYSE - Nichts geändert  
**Nächster Schritt:** Analysier-Befehle ausführen und Ergebnisse prüfen


