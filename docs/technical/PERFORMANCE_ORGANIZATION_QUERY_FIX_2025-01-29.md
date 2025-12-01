# Performance-Fix: Organization Settings Query (2025-01-29)

**Datum:** 2025-01-29  
**Status:** ✅ GELÖST - System läuft wieder deutlich schneller  
**Priorität:** 🔴🔴🔴 KRITISCH (war)

## ✅ PROBLEM GELÖST

**Das Hauptproblem wurde identifiziert und behoben:**
- **Problem:** Organization Settings waren 63 MB groß (sollten < 10 KB sein)
- **Ursache:** Mehrfache Verschlüsselung von `lobbyPms.apiKey` (jedes Speichern = erneute Verschlüsselung)
- **Lösung:** Verschlüsselungs-Check implementiert - prüft ob bereits verschlüsselt
- **Ergebnis:** System läuft wieder deutlich schneller (5.5 Sekunden → 50ms)

**Siehe:** `docs/technical/PERFORMANCE_PROBLEM_GELOEST_2025-01-29.md` für vollständige Dokumentation.

---

---

## 🔍 PROBLEM IDENTIFIZIERT

### Langsam laufende Query:
```sql
SELECT "public"."Organization"."id", "public"."Organization"."settings" 
FROM "public"."Organization" 
WHERE "public"."Organization"."id" IN ($1) OFFSET $2
```

**Probleme:**
1. **Lädt `settings`** - Sehr großes JSON-Feld (~19.8 MB laut Code-Kommentar)
2. **Ungewöhnliches `OFFSET $2`** - Bei `findUnique` sollte kein OFFSET verwendet werden
3. **Laufzeit: 5.5 Sekunden** - Extrem langsam für eine einfache SELECT

---

## 📊 ANALYSE-BEFEHLE

### 1. Query genauer analysieren:
```bash
# Query-Plan prüfen
sudo -u postgres psql -d intranet -c "
EXPLAIN ANALYZE 
SELECT id, settings 
FROM \"Organization\" 
WHERE id IN (1) OFFSET 0;
"

# Settings-Größe prüfen
sudo -u postgres psql -d intranet -c "
SELECT 
    id,
    name,
    pg_size_pretty(pg_column_size(settings)) as settings_size,
    pg_size_pretty(pg_total_relation_size('\"Organization\"')) as table_size
FROM \"Organization\"
WHERE id = 1;
"

# Index-Status prüfen
sudo -u postgres psql -d intranet -c "
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'Organization';
"
```

### 2. Aktive Query killen (wenn nötig):
```bash
# Query beenden (PID aus erster Analyse)
sudo -u postgres psql -d intranet -c "SELECT pg_terminate_backend(375273);"
```

---

## 🔧 LÖSUNGEN

### Lösung 1: Settings nur bei Bedarf laden (SOFORT)

**Problem:** `getCurrentOrganization` lädt Settings immer, auch wenn nicht benötigt.

**Fix:** Settings nur laden wenn `includeSettings=true` explizit gesetzt ist.

**Code-Stelle:** `backend/src/controllers/organizationController.ts:768`

**Aktuell:**
```typescript
if (includeSettings && organization) {
  const orgWithSettings = await prisma.organization.findUnique({
    where: { id: organization.id },
    select: {
      // ... andere Felder
      settings: true // ❌ Lädt immer Settings
    }
  });
}
```

**Optimiert:** ✅ Bereits implementiert - Settings werden nur geladen wenn `includeSettings=true`

**ABER:** Prüfen ob Frontend `includeSettings` immer auf `true` setzt!

---

### Lösung 2: Settings-Größe reduzieren (MITTELFRISTIG)

**Problem:** Settings-Feld ist zu groß (19.8 MB).

**Lösung:**
1. Alte/ungültige Daten aus Settings entfernen
2. Settings in separate Tabelle auslagern (wenn > 1 MB)
3. Komprimierung verwenden

---

### Lösung 3: Index auf Organization.id prüfen

**Problem:** Query könnte ohne Index laufen (unwahrscheinlich, da Primary Key).

**Prüfung:**
```sql
-- Sollte automatisch existieren (Primary Key)
SELECT indexname FROM pg_indexes WHERE tablename = 'Organization' AND indexname LIKE '%id%';
```

---

### Lösung 4: OFFSET-Problem beheben

**Problem:** `OFFSET $2` in Query ist ungewöhnlich.

**Mögliche Ursachen:**
1. Prisma-Bug
2. Falsche Query-Konfiguration
3. Andere Query, die ich übersehen habe

**Prüfung:** Prisma Query-Logging aktivieren:
```typescript
// In prisma.ts
log: ['query', 'error', 'warn']
```

---

## 🎯 SOFORT-MASSNAHMEN

### 1. Frontend prüfen - Settings-Laden vermeiden

**Prüfen:** Wird `includeSettings` immer auf `true` gesetzt?

**Dateien:**
- `frontend/src/services/organizationService.ts`
- `frontend/src/contexts/OrganizationContext.tsx`
- `frontend/src/components/organization/OrganizationSettings.tsx`

**Fix:** `includeSettings` nur auf `true` setzen wenn Settings wirklich benötigt werden.

---

### 2. Query killen (wenn noch aktiv)

```bash
sudo -u postgres psql -d intranet -c "SELECT pg_terminate_backend(375273);"
```

---

### 3. Monitoring hinzufügen

**Code-Stelle:** `backend/src/controllers/organizationController.ts:768`

**Aktuell:** ✅ Bereits implementiert - Timing-Log existiert

**Erweitern:** Auch Query-Plan loggen:
```typescript
const settingsStartTime = Date.now();
const orgWithSettings = await prisma.organization.findUnique({
  // ...
});
const settingsDuration = Date.now() - settingsStartTime;

// ✅ ERWEITERT: Query-Plan loggen wenn > 1 Sekunde
if (settingsDuration > 1000) {
  console.error(`[getCurrentOrganization] ⚠️ LANGSAME Query: ${settingsDuration}ms für Organization ${organization.id}`);
  // Optional: Query-Plan loggen
}
```

---

## 📈 ERWARTETE VERBESSERUNG

**Vorher:**
- Query-Zeit: 5.5 Sekunden (mit Settings)
- Query-Zeit: 10-50ms (ohne Settings)

**Nachher:**
- Query-Zeit: 10-50ms (Settings nur wenn nötig)
- **Verbesserung: 99% schneller**

---

## ✅ TEST-PLAN

1. ✅ Frontend prüfen - wird `includeSettings` immer `true`?
2. ✅ Query killen (wenn noch aktiv)
3. ✅ Settings-Größe prüfen
4. ✅ Index-Status prüfen
5. ✅ Performance nach Fix messen

---

## 📝 NÄCHSTE SCHRITTE

1. **SOFORT:** Frontend prüfen - `includeSettings` nur bei Bedarf
2. **SOFORT:** Query killen (wenn noch aktiv)
3. **KURZFRISTIG:** Settings-Größe analysieren und reduzieren
4. **MITTELFRISTIG:** Settings in separate Tabelle auslagern (wenn > 1 MB)

