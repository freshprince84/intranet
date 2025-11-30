# Performance: Settings-Analyse-Befehle (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - LobbyPMS Settings 63 MB

---

## 🔍 ANALYSE-BEFEHLE

### 1. Größe jedes LobbyPMS-Keys prüfen:
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    key,
    pg_size_pretty(length(value::text)::bigint) as size,
    length(value::text) as size_bytes
FROM (
    SELECT 
        jsonb_object_keys(settings->'lobbyPms') as key,
        settings->'lobbyPms'->jsonb_object_keys(settings->'lobbyPms') as value
    FROM \"Organization\"
    WHERE id = 1
) subquery
ORDER BY length(value::text) DESC;
"
```

### 2. Größter Key im Detail (erste 200 Zeichen):
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    key,
    pg_size_pretty(length(value::text)::bigint) as size,
    LEFT(value::text, 200) as preview
FROM (
    SELECT 
        jsonb_object_keys(settings->'lobbyPms') as key,
        settings->'lobbyPms'->jsonb_object_keys(settings->'lobbyPms') as value
    FROM \"Organization\"
    WHERE id = 1
) subquery
ORDER BY length(value::text) DESC
LIMIT 1;
"
```

### 3. Prüfen ob apiKey verschlüsselt ist (und wie groß):
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    'apiKey' as key,
    pg_size_pretty(length((settings->'lobbyPms'->>'apiKey')::text)::bigint) as size,
    LEFT(settings->'lobbyPms'->>'apiKey', 50) as preview
FROM \"Organization\"
WHERE id = 1;
"
```

### 4. Alle Settings-Keys mit Größe:
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    key,
    pg_size_pretty(length(value::text)::bigint) as size
FROM (
    SELECT 
        jsonb_object_keys(settings) as key,
        settings->jsonb_object_keys(settings) as value
    FROM \"Organization\"
    WHERE id = 1
) subquery
ORDER BY length(value::text) DESC;
"
```

---

## 🎯 ZIEL

**Finden:** Welcher Key ist 63 MB groß?

**Mögliche Ursachen:**
1. `apiKey` ist extrem lang (verschlüsselt?)
2. Ein anderer Key enthält große Daten
3. JSON-Struktur ist verschachtelt/nested

---

## 📝 NÄCHSTE SCHRITTE

1. **SOFORT:** Größe jedes Keys prüfen
2. **SOFORT:** Größten Key identifizieren
3. **KURZFRISTIG:** Cleanup-Script erstellen
4. **KURZFRISTIG:** Settings-Caching implementieren

