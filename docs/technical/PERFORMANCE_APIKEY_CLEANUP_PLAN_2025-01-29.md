# Performance-Fix: API-Key Cleanup (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔴 KRITISCH - apiKey ist 63 MB groß  
**Priorität:** 🔴🔴🔴 SOFORT

---

## 🔍 PROBLEM IDENTIFIZIERT

### apiKey-Größe:
- **apiKey:** 63 MB (66,060,224 bytes) 🔴🔴🔴
- **Normal:** ~100-500 bytes (verschlüsselt)

### Impact:
- Settings-Größe: 63 MB
- Query-Zeit: 5.5 Sekunden
- System extrem langsam

---

## 📊 ANALYSE-BEFEHLE

### 1. apiKey-Struktur prüfen (erste 200 Zeichen):
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    LEFT(settings->'lobbyPms'->>'apiKey', 200) as apiKey_preview,
    length(settings->'lobbyPms'->>'apiKey') as length
FROM \"Organization\"
WHERE id = 1;
"
```

### 2. Prüfen ob apiKey mehrfach verschlüsselt ist:
```bash
# Zähle wie oft ':' im apiKey vorkommt (Format: iv:authTag:encrypted)
sudo -u postgres psql -d intranet -c "
SELECT 
    (length(settings->'lobbyPms'->>'apiKey') - length(replace(settings->'lobbyPms'->>'apiKey', ':', ''))) / length(':') as colon_count
FROM \"Organization\"
WHERE id = 1;
"
```

**Erwartung:** Normalerweise 2 Doppelpunkte (iv:authTag:encrypted)
**Wenn mehr:** Mehrfach verschlüsselt!

### 3. Prüfen ob apiKey ein JSON-Objekt ist:
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    jsonb_typeof(settings->'lobbyPms'->'apiKey') as apiKey_type
FROM \"Organization\"
WHERE id = 1;
"
```

---

## 🔧 LÖSUNGEN

### Lösung 1: apiKey bereinigen (SOFORT)

**Problem:** apiKey ist 63 MB groß.

**Strategie:**
1. Backup erstellen
2. apiKey-Struktur analysieren
3. Wenn mehrfach verschlüsselt: Entschlüsseln und neu verschlüsseln
4. Wenn JSON-Objekt: Nur den eigentlichen Key extrahieren
5. Wenn korrupt: Löschen und neu setzen

---

### Lösung 2: Validierung hinzufügen (KURZFRISTIG)

**Problem:** Keine Validierung der apiKey-Größe beim Speichern.

**Lösung:**
- Maximal-Größe: 10,000 bytes (10 KB)
- Validierung in `updateCurrentOrganization`
- Warnung wenn apiKey > 1 KB

**Code-Stelle:** `backend/src/controllers/organizationController.ts:1248`

---

### Lösung 3: Verschlüsselungs-Bug beheben (KURZFRISTIG)

**Problem:** apiKey könnte mehrfach verschlüsselt werden.

**Prüfung:**
- Wird `encryptApiSettings` mehrfach aufgerufen?
- Wird apiKey vor dem Speichern bereits verschlüsselt?

**Code-Stellen:**
- `backend/src/controllers/organizationController.ts:1248`
- `backend/src/utils/encryption.ts:120`

---

## 🎯 SOFORT-MASSNAHMEN

### 1. apiKey-Struktur analysieren

**Befehl:**
```bash
sudo -u postgres psql -d intranet -c "
SELECT 
    LEFT(settings->'lobbyPms'->>'apiKey', 200) as apiKey_preview,
    length(settings->'lobbyPms'->>'apiKey') as length,
    (length(settings->'lobbyPms'->>'apiKey') - length(replace(settings->'lobbyPms'->>'apiKey', ':', ''))) / length(':') as colon_count
FROM \"Organization\"
WHERE id = 1;
"
```

**Ziel:** Verstehen was in den 63 MB ist

---

### 2. Cleanup-Script erstellen

**Ziel:** apiKey bereinigen

**Vorgehen:**
1. Backup erstellen
2. apiKey-Struktur analysieren
3. Bereinigen (abhängig von Struktur)
4. Performance testen

---

### 3. Validierung hinzufügen

**Code-Stelle:** `backend/src/controllers/organizationController.ts`

**Erweitern:**
- Maximal-Größe prüfen
- Warnung bei großen apiKeys

---

## 📈 ERWARTETE VERBESSERUNG

**Vorher:**
- apiKey: 63 MB
- Settings: 63 MB
- Query-Zeit: 5.5 Sekunden

**Nachher:**
- apiKey: ~500 bytes (verschlüsselt)
- Settings: ~10 KB
- Query-Zeit: 10-50ms

**Verbesserung: 99.98% schneller**

---

## ✅ TEST-PLAN

1. ✅ apiKey-Struktur analysieren
2. ✅ Backup erstellen
3. ✅ Cleanup-Script erstellen
4. ✅ Cleanup durchführen
5. ✅ Performance testen
6. ✅ Validierung hinzufügen

---

## 📝 NÄCHSTE SCHRITTE

1. **SOFORT:** apiKey-Struktur analysieren (was ist in den 63 MB?)
2. **SOFORT:** Cleanup-Script erstellen
3. **KURZFRISTIG:** Validierung hinzufügen
4. **KURZFRISTIG:** Verschlüsselungs-Bug beheben

