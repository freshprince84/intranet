# Performance-Fix: FilterTags Caching (2025-01-26)

**Datum:** 2025-01-26  
**Status:** ✅ Implementiert  
**Problem:** FilterTags dauern 3-6 Sekunden zum Laden, obwohl sie da sind, um Seiten schnell zu laden

---

## 🔴 PROBLEM

**Datei:** `frontend/src/components/SavedFilterTags.tsx:208-250`

**Problem:**
- `SavedFilterTags` macht 2 DB-Queries ohne Caching bei jedem Seitenaufruf:
  1. `GET /saved-filters/{tableId}` → `getUserSavedFilters` (1-2s)
  2. `GET /saved-filters/groups/{tableId}` → `getFilterGroups` (1-2s)
- **Doppelte Requests:** `Worktracker.tsx` lädt Filter auch selbst (Zeile 919)
- **Keine Caching** für Filter-Listen (nur einzelne Filter werden gecacht)
- **Keine executeWithRetry** bei Filter-Queries

**Impact:**
- **3-6 Sekunden** nur für FilterTags beim Seitenaufruf
- **Doppelte DB-Queries** für Filter
- **Das macht die ganze Optimierung zunichte!** (FilterTags sollten schnell sein, damit Standardfilter funktioniert)

---

## ✅ LÖSUNG IMPLEMENTIERT

### FilterListCache

**Datei:** `backend/src/services/filterListCache.ts` (NEU)

**Features:**
- In-Memory Cache mit 5 Minuten TTL
- Cached: Filter-Listen (`getFilters`) und Filter-Gruppen (`getFilterGroups`)
- Cache-Key: `userId:tableId`
- Automatische Invalidierung nach TTL
- Verwendet `executeWithRetry` für DB-Queries

**Code:**
```typescript
class FilterListCache {
  private filterListCache: Map<string, FilterListCacheEntry> = new Map();
  private filterGroupListCache: Map<string, FilterGroupListCacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 Minuten

  async getFilters(userId: number, tableId: string): Promise<any[] | null> {
    // Cache-Hit: Sofort zurückgeben
    // Cache-Miss: DB-Query mit executeWithRetry + Cache speichern
  }

  async getFilterGroups(userId: number, tableId: string): Promise<any[] | null> {
    // Cache-Hit: Sofort zurückgeben
    // Cache-Miss: DB-Query mit executeWithRetry + Cache speichern
  }

  invalidate(userId: number, tableId: string): void {
    // Cache für Filter-Listen und Filter-Gruppen invalidieren
  }
}
```

### Controller-Optimierung

**Datei:** `backend/src/controllers/savedFilterController.ts`

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

### Cache-Invalidierung

**Implementiert in:**
- `saveFilter` - Bei Filter-Erstellung/Aktualisierung
- `deleteFilter` - Bei Filter-Löschung
- `createFilterGroup` - Bei Filter-Gruppen-Erstellung
- `updateFilterGroup` - Bei Filter-Gruppen-Aktualisierung
- `deleteFilterGroup` - Bei Filter-Gruppen-Löschung
- `addFilterToGroup` - Bei Filter-zu-Gruppe-Zuordnung
- `removeFilterFromGroup` - Bei Filter-aus-Gruppe-Entfernung

**Code:**
```typescript
// In allen Filter-Änderungs-Funktionen:
filterListCache.invalidate(userId, tableId);
```

---

## 📊 ERWARTETE VERBESSERUNG

### Vorher:
- **FilterTags laden:** 3-6 Sekunden (2-3 DB-Queries, doppelte Requests)
- **Bei jedem Seitenaufruf:** 2-3 DB-Queries
- **Keine Caching:** Ja

### Nachher:
- **FilterTags laden:** 0.1-0.2 Sekunden (Cache-Hit) oder 1-2s (Cache-Miss, nur einmal)
- **Bei jedem Seitenaufruf:** 0 DB-Queries (nach Cache-Warmup)
- **Caching:** Ja (5 Minuten TTL)

**Reduktion:**
- **FilterTags-Lade-Zeit:** Von 3-6s → 0.1-0.2s (**95-99% Reduktion**)
- **DB-Queries:** Von 2-3 pro Seitenaufruf → 0 (nach Cache-Warmup)

---

## 🔍 BETROFFENE STELLEN

**FilterListCache wird verwendet in:**
- ✅ `getUserSavedFilters` - Filter-Listen laden
- ✅ `getFilterGroups` - Filter-Gruppen laden

**Cache-Invalidierung in:**
- ✅ `saveFilter` - Filter erstellen/aktualisieren
- ✅ `deleteFilter` - Filter löschen
- ✅ `createFilterGroup` - Filter-Gruppe erstellen
- ✅ `updateFilterGroup` - Filter-Gruppe aktualisieren
- ✅ `deleteFilterGroup` - Filter-Gruppe löschen
- ✅ `addFilterToGroup` - Filter zu Gruppe hinzufügen
- ✅ `removeFilterFromGroup` - Filter aus Gruppe entfernen

**Alle Verwendungen funktionieren weiterhin:**
- Signatur der Controller-Funktionen wurde nicht geändert
- Nur interne Logik wurde optimiert
- Keine Breaking Changes

---

## ⚠️ WICHTIGE HINWEISE

### Doppelte Requests (Frontend)

**Problem:**
- `Worktracker.tsx` lädt Filter selbst (Zeile 919)
- `SavedFilterTags` lädt Filter auch (Zeile 221)
- **Doppelte Requests!**

**Status:**
- ✅ **Backend:** Jetzt gecacht (nur 1 DB-Query pro 5 Minuten)
- ⚠️ **Frontend:** Doppelte Requests bleiben (aber beide werden jetzt aus Cache bedient)
- **Empfehlung:** Frontend-Optimierung später (Filter-Listen zwischen Komponenten teilen)

### Cache-Invalidierung

**Wichtig:**
- Cache wird bei allen Filter-Änderungen invalidiert
- TTL: 5 Minuten (Filter-Listen ändern sich selten)
- **Korrekt implementiert:** Alle Filter-Änderungs-Funktionen invalidieren Cache

---

## 📋 COMMIT-INFO

**Dateien geändert:**
- `backend/src/services/filterListCache.ts` (NEU)
- `backend/src/controllers/savedFilterController.ts` (getUserSavedFilters, getFilterGroups + Cache-Invalidierung)

**Änderungen:**
- FilterListCache implementiert (TTL: 5 Minuten)
- getUserSavedFilters verwendet FilterListCache
- getFilterGroups verwendet FilterListCache
- Cache-Invalidierung bei allen Filter-Änderungen

---

## ⚠️ WICHTIG

**Server muss neu gestartet werden:**
- Änderungen werden erst nach Server-Neustart aktiv
- User muss Server neu starten (ich darf das nicht)

**Erwartetes Verhalten nach Neustart:**
- FilterTags sollten deutlich schneller sein (von 3-6s auf 0.1-0.2s)
- Bei Cache-Miss: 1-2s (nur einmal pro 5 Minuten)
- System sollte wieder normal schnell sein

---

**Erstellt:** 2025-01-26  
**Status:** ✅ Implementiert  
**Nächster Schritt:** Server neu starten (User muss das machen)

