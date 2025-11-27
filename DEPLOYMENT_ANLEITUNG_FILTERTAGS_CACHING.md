# Deployment-Anleitung: FilterTags Caching (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment  
**Änderung:** FilterTags Caching implementiert (FilterListCache)

---

## 📋 DEPLOYMENT-SCHRITTE

### Schritt 1: Git Pull auf Server

**SSH-Verbindung zum Server:**
```bash
ssh -i ~/.ssh/intranet_rsa root@65.109.228.106
```

**Im Server-Verzeichnis:**
```bash
cd /var/www/intranet
```

**⚠️ WICHTIG: Falls lokale Änderungen in dist/ vorhanden sind:**

```bash
# Option 1: Dist-Dateien zurücksetzen (empfohlen, da sie sowieso neu gebaut werden)
cd /var/www/intranet/backend
git checkout -- dist/
cd /var/www/intranet
git clean -fd backend/dist/

# Dann Pull
git pull
```

**Oder Option 2: Stash lokale Änderungen:**
```bash
cd /var/www/intranet
git stash
git pull
git stash pop  # Falls nötig (normalerweise nicht, da dist/ neu gebaut wird)
```

**Erwartetes Ergebnis:**
- Neuer Commit wird gepullt: "Performance: FilterTags Caching implementiert"
- Neue Datei `backend/src/services/filterListCache.ts` wurde erstellt
- Datei `backend/src/controllers/savedFilterController.ts` wurde geändert

---

### Schritt 2: Backend neu bauen

**Im Backend-Verzeichnis:**
```bash
cd /var/www/intranet/backend
npm run build
```

**Erwartetes Ergebnis:**
- TypeScript wird kompiliert
- Neue `dist/services/filterListCache.js` wird erstellt
- Neue `dist/controllers/savedFilterController.js` wird erstellt
- Keine Fehler

---

### Schritt 3: Server neu starten

**⚠️ WICHTIG: Du musst den Server neu starten! (Ich darf das nicht)**

**PM2 neu starten:**
```bash
pm2 restart intranet-backend
pm2 status
```

**Erwartetes Ergebnis:**
- `intranet-backend` wird neu gestartet
- Status sollte "online" sein
- Keine Fehler in den Logs

---

### Schritt 4: Verifikation

**Logs prüfen:**
```bash
pm2 logs intranet-backend --lines 50 --nostream
```

**Erwartetes Verhalten:**
- Keine Fehler beim Start
- System sollte normal funktionieren
- FilterTags sollten deutlich schneller sein

**Performance prüfen:**
- FilterTags sollten < 0.5 Sekunden laden (nach Cache-Warmup)
- Bei Cache-Miss: 1-2s (nur einmal pro 5 Minuten)
- System sollte wieder normal schnell sein

---

## 🔍 WAS WURDE GEÄNDERT?

### Neue Datei: `backend/src/services/filterListCache.ts`

**Features:**
- In-Memory Cache mit 5 Minuten TTL
- Cached: Filter-Listen und Filter-Gruppen
- Cache-Key: `userId:tableId`
- Verwendet `executeWithRetry` für DB-Queries

### Geänderte Datei: `backend/src/controllers/savedFilterController.ts`

**getUserSavedFilters:**
```typescript
// Vorher: Direkte DB-Query ohne Caching
const savedFilters = await prisma.savedFilter.findMany({...});

// Nachher: FilterListCache verwenden
const parsedFilters = await filterListCache.getFilters(userId, tableId);
```

**getFilterGroups:**
```typescript
// Vorher: Direkte DB-Query ohne Caching
const groups = await prisma.filterGroup.findMany({...});

// Nachher: FilterListCache verwenden
const parsedGroups = await filterListCache.getFilterGroups(userId, tableId);
```

**Cache-Invalidierung:**
- Bei allen Filter-Änderungen wird Cache invalidiert
- `filterListCache.invalidate(userId, tableId)` in:
  - `saveFilter`
  - `deleteFilter`
  - `createFilterGroup`
  - `updateFilterGroup`
  - `deleteFilterGroup`
  - `addFilterToGroup`
  - `removeFilterFromGroup`

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **FilterTags laden:** 3-6 Sekunden (2-3 DB-Queries)
- **Bei jedem Seitenaufruf:** 2-3 DB-Queries
- **Keine Caching:** Ja

### Nachher:
- **FilterTags laden:** 0.1-0.2 Sekunden (Cache-Hit) oder 1-2s (Cache-Miss, nur einmal)
- **Bei jedem Seitenaufruf:** 0 DB-Queries (nach Cache-Warmup)
- **Caching:** Ja (5 Minuten TTL)

**Reduktion:** **95-99% schneller**

---

## ⚠️ WICHTIG

**Server muss neu gestartet werden:**
- Änderungen werden erst nach Server-Neustart aktiv
- PM2 restart ist erforderlich

**Keine Breaking Changes:**
- Alle bestehenden Verwendungen funktionieren weiterhin
- Nur interne Logik wurde optimiert

**Cache-Invalidierung:**
- Wird automatisch bei Filter-Änderungen gemacht
- TTL: 5 Minuten (Filter-Listen ändern sich selten)

---

## 🆘 BEI PROBLEMEN

**Falls Git Pull fehlschlägt wegen lokaler Änderungen:**
```bash
# Dist-Dateien zurücksetzen (werden beim Build neu generiert)
cd /var/www/intranet/backend
git checkout -- dist/
cd /var/www/intranet
git clean -fd backend/dist/
git pull
```

**Falls Server nicht startet:**
```bash
pm2 logs intranet-backend --lines 100
```

**Falls Fehler auftreten:**
- Prüfe Logs auf Fehlermeldungen
- Prüfe ob `backend/dist/services/filterListCache.js` existiert
- Prüfe ob TypeScript-Kompilierung erfolgreich war

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Bereit zum Deployment



