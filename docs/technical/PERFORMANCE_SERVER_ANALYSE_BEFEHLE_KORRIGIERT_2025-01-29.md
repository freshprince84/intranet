# Performance: Server-Analyse-Befehle KORRIGIERT (2025-01-29)

**Datum:** 2025-01-29  
**Status:** ✅ KORRIGIERT - PostgreSQL Case-Sensitivity behoben  
**Problem:** Spaltennamen müssen in Anführungszeichen oder korrekt referenziert werden

---

## ✅ ERSTE ERGEBNISSE (aus Cache-Logs)

**Cache funktioniert!** ✅
- Viele `✅ Cache-Hit` Einträge
- Nur wenige `💾 Cache-Miss` Einträge
- Cache-Invalidierung funktioniert (`🗑️ Cache invalidiert`)

**ABER:** FilterTags dauern trotzdem 2-3 Sekunden
- **Mögliche Ursachen:**
  1. JSON-Parsing ist langsam (bei Cache-Miss)
  2. DB-Query ist langsam (bei Cache-Miss)
  3. Frontend macht doppelte Requests

---

## 🔴 KORRIGIERTE BEFEHLE

### 1. Filter-Anzahl und Größe prüfen (KORRIGIERT)

```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    \"userId\",
    \"tableId\",
    COUNT(*) as filter_count,
    pg_size_pretty(AVG(length(\"conditions\"))::bigint) as avg_conditions_size,
    pg_size_pretty(MAX(length(\"conditions\"))::bigint) as max_conditions_size
FROM \"SavedFilter\"
GROUP BY \"userId\", \"tableId\"
ORDER BY filter_count DESC;
"
```

---

### 2. Größte Filter identifizieren (KORRIGIERT)

```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    \"userId\",
    \"tableId\",
    name,
    pg_size_pretty((length(\"conditions\") + length(\"operators\") + COALESCE(length(\"sortDirections\"), 0))::bigint) as total_size
FROM \"SavedFilter\"
ORDER BY (length(\"conditions\") + length(\"operators\") + COALESCE(length(\"sortDirections\"), 0)) DESC
LIMIT 20;
"
```

---

### 3. Branch Settings-Größe prüfen (KORRIGIERT)

```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    pg_size_pretty((
        COALESCE(pg_column_size(\"whatsappSettings\"), 0) +
        COALESCE(pg_column_size(\"lobbyPmsSettings\"), 0) +
        COALESCE(pg_column_size(\"boldPaymentSettings\"), 0) +
        COALESCE(pg_column_size(\"doorSystemSettings\"), 0) +
        COALESCE(pg_column_size(\"emailSettings\"), 0)
    )::bigint) as total_settings_size
FROM \"Branch\"
WHERE \"whatsappSettings\" IS NOT NULL 
   OR \"lobbyPmsSettings\" IS NOT NULL 
   OR \"boldPaymentSettings\" IS NOT NULL 
   OR \"doorSystemSettings\" IS NOT NULL 
   OR \"emailSettings\" IS NOT NULL
ORDER BY (
    COALESCE(pg_column_size(\"whatsappSettings\"), 0) +
    COALESCE(pg_column_size(\"lobbyPmsSettings\"), 0) +
    COALESCE(pg_column_size(\"boldPaymentSettings\"), 0) +
    COALESCE(pg_column_size(\"doorSystemSettings\"), 0) +
    COALESCE(pg_column_size(\"emailSettings\"), 0)
) DESC;
"
```

---

### 4. Branch Settings Verschlüsselung prüfen (KORRIGIERT)

```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    CASE 
        WHEN \"whatsappSettings\"->>'apiKey' IS NOT NULL THEN
            (length(\"whatsappSettings\"->>'apiKey') - length(replace(\"whatsappSettings\"->>'apiKey', ':', ''))) / length(':')
        ELSE NULL
    END as whatsapp_colon_count,
    CASE 
        WHEN \"lobbyPmsSettings\"->>'apiKey' IS NOT NULL THEN
            (length(\"lobbyPmsSettings\"->>'apiKey') - length(replace(\"lobbyPmsSettings\"->>'apiKey', ':', ''))) / length(':')
        ELSE NULL
    END as lobbypms_colon_count
FROM \"Branch\"
WHERE \"whatsappSettings\" IS NOT NULL OR \"lobbyPmsSettings\" IS NOT NULL;
"
```

---

### 5. User.onboardingProgress Größe (KORRIGIERT)

```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    email,
    pg_size_pretty(pg_column_size(\"onboardingProgress\")::bigint) as onboarding_size
FROM \"User\"
WHERE \"onboardingProgress\" IS NOT NULL
ORDER BY pg_column_size(\"onboardingProgress\") DESC
LIMIT 20;
"
```

---

## 📊 ANALYSE DER CACHE-LOGS

**Aus den Logs (Zeilen 963-1007):**

### Positive Erkenntnisse:
1. ✅ **Cache funktioniert:** Viele Cache-Hits
2. ✅ **Cache-Invalidierung funktioniert:** Wird korrekt invalidiert bei Änderungen
3. ✅ **Cache-Misses sind selten:** Nur bei erstem Laden oder nach Invalidierung

### Mögliche Probleme:
1. ⚠️ **Häufige Cache-Invalidierungen:** 
   - `consultations-table` wird 3x invalidiert (Zeilen 988, 991, 992, 993)
   - `worktracker-reservations` wird mehrfach invalidiert
   - **Fragestellung:** Warum wird so oft invalidiert? Jede Invalidierung = Cache-Miss beim nächsten Request

2. ⚠️ **Cache-Miss dauert lange:**
   - Bei Cache-Miss: DB-Query + JSON-Parsing
   - **Wenn DB-Query langsam ist:** 2-3 Sekunden sind möglich

3. ⚠️ **Doppelte Requests:**
   - Filter-Liste UND Filter-Gruppen werden beide geladen
   - **Wenn beide Cache-Miss:** 2x langsam

---

## 🔍 NÄCHSTE SCHRITTE

### 1. Filter-Größe prüfen (mit korrigierten Befehlen)
- Befehl 1 und 2 ausführen
- Prüfen ob Filter sehr groß sind (> 10 KB)

### 2. DB-Query-Zeit bei Cache-Miss messen
```bash
# Prüfe langsame Queries
cd /var/www/intranet
pm2 logs intranet-backend --lines 2000 --nostream | grep -E "Cache-Miss|Query abgeschlossen|getUserSavedFilters|getFilterGroups" | tail -100
```

### 3. Frontend-Requests prüfen
- Prüfen ob Frontend doppelte Requests macht
- Prüfen ob beide Endpoints parallel aufgerufen werden

---

**Erstellt:** 2025-01-29  
**Status:** ✅ KORRIGIERT  
**Nächster Schritt:** Korrigierte Befehle ausführen


