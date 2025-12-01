# Performance: Server-Analyse-Befehle (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - Befehle zum Ausführen auf dem Server  
**Zweck:** Identifizierung weiterer Performance-Probleme

---

## 🔴 PRIORITÄT 1: FilterTags-Problem analysieren

### 1.1 Filter-Anzahl und Größe prüfen

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    userId,
    tableId,
    COUNT(*) as filter_count,
    pg_size_pretty(AVG(length(conditions))::bigint) as avg_conditions_size,
    pg_size_pretty(AVG(length(operators))::bigint) as avg_operators_size,
    pg_size_pretty(AVG(length(COALESCE(sortDirections, '')))::bigint) as avg_sortDirections_size,
    pg_size_pretty(MAX(length(conditions))::bigint) as max_conditions_size,
    pg_size_pretty(MAX(length(operators))::bigint) as max_operators_size
FROM \"SavedFilter\"
GROUP BY userId, tableId
ORDER BY filter_count DESC;
"
```

**Was prüft es:**
- Wie viele Filter gibt es pro User/Table?
- Wie groß sind die JSON-Strings durchschnittlich?
- Gibt es sehr große Filter (> 10 KB)?

**Erwartung:**
- Filter-Anzahl: < 50 pro User/Table
- Durchschnittliche Größe: < 1 KB
- **Wenn größer:** JSON-Parsing könnte langsam sein

---

### 1.2 Größte Filter identifizieren

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    userId,
    tableId,
    name,
    pg_size_pretty(length(conditions)::bigint) as conditions_size,
    pg_size_pretty(length(operators)::bigint) as operators_size,
    pg_size_pretty(length(COALESCE(sortDirections, ''))::bigint) as sortDirections_size,
    pg_size_pretty((length(conditions) + length(operators) + COALESCE(length(sortDirections), 0))::bigint) as total_size
FROM \"SavedFilter\"
ORDER BY (length(conditions) + length(operators) + COALESCE(length(sortDirections), 0)) DESC
LIMIT 20;
"
```

**Was prüft es:**
- Welche Filter sind am größten?
- Könnten einzelne Filter das Problem verursachen?

**Erwartung:**
- Total Size: < 10 KB pro Filter
- **Wenn größer:** Filter könnte Performance-Problem verursachen

---

### 1.3 Cache-Logs prüfen (Backend-Logs)

**Befehl:**
```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 500 --nostream | grep -i "FilterListCache"
```

**Was prüft es:**
- Werden Cache-Hits geloggt? (`✅ Cache-Hit`)
- Werden Cache-Misses geloggt? (`💾 Cache-Miss`)
- Wie oft wird Cache invalidiert? (`🗑️ Cache invalidiert`)

**Erwartung:**
- Nach ersten Request: `💾 Cache-Miss`
- Bei weiteren Requests: `✅ Cache-Hit`
- **Wenn immer Cache-Miss:** Cache funktioniert nicht richtig oder TTL zu kurz

---

### 1.4 FilterTags-Endpoint Performance prüfen

**Befehl:**
```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 1000 --nostream | grep -E "saved-filters|getUserSavedFilters|getFilterGroups" | tail -50
```

**Was prüft es:**
- Wie lange dauern FilterTags-Requests?
- Gibt es Fehler?
- Werden beide Endpoints aufgerufen? (`/saved-filters/{tableId}` und `/saved-filters/groups/{tableId}`)

**Erwartung:**
- Request-Zeit: < 100ms (Cache-Hit) oder < 2s (Cache-Miss)
- **Wenn > 2s:** Problem bestätigt

---

## 🟡 PRIORITÄT 2: Branch Settings prüfen

### 2.1 Branch Settings-Größe prüfen

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    pg_size_pretty(COALESCE(pg_column_size(whatsappSettings), 0)::bigint) as whatsapp_size,
    pg_size_pretty(COALESCE(pg_column_size(lobbyPmsSettings), 0)::bigint) as lobbypms_size,
    pg_size_pretty(COALESCE(pg_column_size(boldPaymentSettings), 0)::bigint) as boldpayment_size,
    pg_size_pretty(COALESCE(pg_column_size(doorSystemSettings), 0)::bigint) as doorsystem_size,
    pg_size_pretty(COALESCE(pg_column_size(emailSettings), 0)::bigint) as email_size,
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
```

**Was prüft es:**
- Wie groß sind Branch Settings?
- Könnten sie ähnliche Probleme wie Organization Settings haben?

**Erwartung:**
- Total Size: < 100 KB pro Branch
- **Wenn > 1 MB:** Potenzielles Problem (ähnlich wie Organization Settings)

---

### 2.2 Größte Branch Settings-Keys identifizieren

**Befehl (für jeden Branch mit großen Settings):**
```bash
# Ersetze {branch_id} mit der ID aus Befehl 2.1
sudo -u postgres psql -d intranet -c "
SELECT 
    key,
    pg_size_pretty(length(value::text)::bigint) as size,
    LEFT(value::text, 100) as preview
FROM (
    SELECT 
        jsonb_object_keys(whatsappSettings) as key,
        whatsappSettings->jsonb_object_keys(whatsappSettings) as value
    FROM \"Branch\"
    WHERE id = {branch_id} AND whatsappSettings IS NOT NULL
    UNION ALL
    SELECT 
        jsonb_object_keys(lobbyPmsSettings) as key,
        lobbyPmsSettings->jsonb_object_keys(lobbyPmsSettings) as value
    FROM \"Branch\"
    WHERE id = {branch_id} AND lobbyPmsSettings IS NOT NULL
    UNION ALL
    SELECT 
        jsonb_object_keys(boldPaymentSettings) as key,
        boldPaymentSettings->jsonb_object_keys(boldPaymentSettings) as value
    FROM \"Branch\"
    WHERE id = {branch_id} AND boldPaymentSettings IS NOT NULL
) subquery
ORDER BY length(value::text) DESC
LIMIT 20;
"
```

**Was prüft es:**
- Welche Keys sind am größten?
- Könnte es mehrfache Verschlüsselung geben? (Prüfe ob Keys `:` enthalten)

**Erwartung:**
- Key Size: < 1 KB
- **Wenn > 10 KB:** Potenzielles Problem

---

## 🟡 PRIORITÄT 3: Weitere große JSON-Felder prüfen

### 3.1 User.onboardingProgress Größe prüfen

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    email,
    pg_size_pretty(pg_column_size(onboardingProgress)::bigint) as onboarding_size
FROM \"User\"
WHERE onboardingProgress IS NOT NULL
ORDER BY pg_column_size(onboardingProgress) DESC
LIMIT 20;
"
```

**Was prüft es:**
- Wie groß ist onboardingProgress?
- Wird es häufig geladen?

**Erwartung:**
- Size: < 10 KB
- **Wenn größer:** Prüfen ob es häufig geladen wird

---

### 3.2 Alle großen JSON-Felder finden (PostgreSQL-Statistiken)

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    most_common_vals
FROM pg_stats
WHERE schemaname = 'public' 
  AND (attname LIKE '%Json%' OR attname LIKE '%json%' OR attname LIKE '%Jsonb%' OR attname LIKE '%jsonb%')
ORDER BY tablename, attname;
"
```

**Was prüft es:**
- Welche JSON-Felder gibt es?
- Welche werden häufig verwendet?

---

## 🟡 PRIORITÄT 4: Verschlüsselung prüfen

### 4.1 Direkte encryptSecret-Aufrufe finden (lokal)

**Befehl (auf lokalem System, nicht Server):**
```bash
cd /path/to/intranet
grep -r "encryptSecret(" backend/src --exclude-dir=node_modules | grep -v "encryptApiSettings\|encryptBranchApiSettings" | grep -v "//"
```

**Was prüft es:**
- Wird `encryptSecret` direkt aufgerufen (außerhalb von `encryptApiSettings`/`encryptBranchApiSettings`)?
- Könnte mehrfache Verschlüsselung passieren?

**Erwartung:**
- Keine direkten Aufrufe (außer in `encryption.ts`)
- **Wenn gefunden:** Potenzielles Problem

---

### 4.2 Prüfen ob Branch Settings mehrfach verschlüsselt sind

**Befehl:**
```bash
# Prüfe ob apiKey mehrfach verschlüsselt ist (zähle ':' im String)
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    CASE 
        WHEN whatsappSettings->>'apiKey' IS NOT NULL THEN
            (length(whatsappSettings->>'apiKey') - length(replace(whatsappSettings->>'apiKey', ':', ''))) / length(':') as whatsapp_colon_count
        ELSE NULL
    END as whatsapp_colon_count,
    CASE 
        WHEN lobbyPmsSettings->>'apiKey' IS NOT NULL THEN
            (length(lobbyPmsSettings->>'apiKey') - length(replace(lobbyPmsSettings->>'apiKey', ':', ''))) / length(':') as lobbypms_colon_count
        ELSE NULL
    END as lobbypms_colon_count
FROM \"Branch\"
WHERE whatsappSettings IS NOT NULL OR lobbyPmsSettings IS NOT NULL;
"
```

**Was prüft es:**
- Normal: 2 Doppelpunkte (Format: `iv:authTag:encrypted`)
- **Wenn > 2:** Mehrfach verschlüsselt! (Problem)

**Erwartung:**
- Colon Count: 2 (oder NULL wenn nicht verschlüsselt)
- **Wenn > 2:** Mehrfache Verschlüsselung bestätigt

---

## 📊 ZUSAMMENFASSUNG: Alle Befehle in Reihenfolge

### Schritt 1: FilterTags-Problem (🔴 KRITISCH)
```bash
# 1.1 Filter-Anzahl und Größe
sudo -u postgres psql -d intranet -c "SELECT userId, tableId, COUNT(*) as filter_count, pg_size_pretty(AVG(length(conditions))::bigint) as avg_conditions_size, pg_size_pretty(MAX(length(conditions))::bigint) as max_conditions_size FROM \"SavedFilter\" GROUP BY userId, tableId ORDER BY filter_count DESC;"

# 1.2 Größte Filter
sudo -u postgres psql -d intranet -c "SELECT id, userId, tableId, name, pg_size_pretty((length(conditions) + length(operators) + COALESCE(length(sortDirections), 0))::bigint) as total_size FROM \"SavedFilter\" ORDER BY (length(conditions) + length(operators) + COALESCE(length(sortDirections), 0)) DESC LIMIT 20;"

# 1.3 Cache-Logs
cd /var/www/intranet && pm2 logs intranet-backend --lines 500 --nostream | grep -i "FilterListCache"

# 1.4 FilterTags-Endpoint Performance
cd /var/www/intranet && pm2 logs intranet-backend --lines 1000 --nostream | grep -E "saved-filters|getUserSavedFilters|getFilterGroups" | tail -50
```

### Schritt 2: Branch Settings (🟡)
```bash
# 2.1 Branch Settings-Größe
sudo -u postgres psql -d intranet -c "SELECT id, name, pg_size_pretty((COALESCE(pg_column_size(whatsappSettings), 0) + COALESCE(pg_column_size(lobbyPmsSettings), 0) + COALESCE(pg_column_size(boldPaymentSettings), 0) + COALESCE(pg_column_size(doorSystemSettings), 0) + COALESCE(pg_column_size(emailSettings), 0))::bigint) as total_settings_size FROM \"Branch\" WHERE whatsappSettings IS NOT NULL OR lobbyPmsSettings IS NOT NULL OR boldPaymentSettings IS NOT NULL OR doorSystemSettings IS NOT NULL OR emailSettings IS NOT NULL ORDER BY (COALESCE(pg_column_size(whatsappSettings), 0) + COALESCE(pg_column_size(lobbyPmsSettings), 0) + COALESCE(pg_column_size(boldPaymentSettings), 0) + COALESCE(pg_column_size(doorSystemSettings), 0) + COALESCE(pg_column_size(emailSettings), 0)) DESC;"
```

### Schritt 3: Weitere JSON-Felder (🟡)
```bash
# 3.1 User.onboardingProgress
sudo -u postgres psql -d intranet -c "SELECT id, email, pg_size_pretty(pg_column_size(onboardingProgress)::bigint) as onboarding_size FROM \"User\" WHERE onboardingProgress IS NOT NULL ORDER BY pg_column_size(onboardingProgress) DESC LIMIT 20;"
```

### Schritt 4: Verschlüsselung (🟡)
```bash
# 4.2 Branch Settings Verschlüsselung prüfen
sudo -u postgres psql -d intranet -c "SELECT id, name, CASE WHEN whatsappSettings->>'apiKey' IS NOT NULL THEN (length(whatsappSettings->>'apiKey') - length(replace(whatsappSettings->>'apiKey', ':', ''))) / length(':') ELSE NULL END as whatsapp_colon_count FROM \"Branch\" WHERE whatsappSettings IS NOT NULL;"
```

---

## 📝 ERGEBNISSE DOKUMENTIEREN

**Nach Ausführung der Befehle:**
1. Ergebnisse in `docs/technical/PERFORMANCE_ANALYSE_ERGEBNISSE_2025-01-29.md` dokumentieren
2. Probleme identifizieren
3. Lösungsplan erstellen

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 BEFEHLE BEREIT  
**Nächster Schritt:** Befehle auf Server ausführen


