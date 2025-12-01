# Performance: FilterTags Network-Analyse (2025-01-29)

**Datum:** 2025-01-29  
**Status:** 🔍 ANALYSE - Network-Tab zeigt keine saved-filters Requests  
**Problem:** Filter `/saved-filters` zeigt 0 Requests, obwohl FilterTags geladen werden sollten

---

## 🔍 BEOBACHTUNGEN AUS SCREENSHOT

### Network-Tab:
- ✅ Browser ist **Online** (nicht Offline)
- ⚠️ Filter `/saved-filters` ist aktiv
- ⚠️ **0 Requests** werden angezeigt (trotz Filter)
- **Gesamt:** 339 Requests wurden gemacht, aber keine passen zum Filter

### Console-Tab:
- ✅ Viele API-Calls zu `/api/tasks` (200 OK)
- ⚠️ **Keine Logs zu `/api/saved-filters`** sichtbar
- ⚠️ **13 Issues:** 4 Fehler, 1 Warnung, 8 Info

---

## 🔍 MÖGLICHE URSACHEN

### 1. FilterTags-Requests werden nicht gemacht ⚠️

**Mögliche Ursachen:**
- FilterTags-Komponente wird nicht gerendert
- FilterTags-Requests werden blockiert
- FilterTags-Requests schlagen fehl (vor Network-Tab)

**Zu prüfen:**
- Console auf Fehler prüfen
- React DevTools: Wird SavedFilterTags gerendert?
- Network-Tab: Filter entfernen und alle Requests prüfen

---

### 2. Requests haben anderen Pfad ⚠️

**Mögliche Pfade:**
- `/api/saved-filters/{tableId}` (erwartet)
- `/api/saved-filters/worktracker-todos` (konkret)
- `/api/saved-filters/groups/{tableId}` (Filter-Gruppen)

**Zu prüfen:**
- Filter entfernen oder anpassen
- Nach "saved" oder "filter" suchen
- Alle Requests durchsuchen

---

### 3. Requests wurden bereits gemacht (vor Log-Clear) ⚠️

**Mögliche Ursache:**
- Requests wurden gemacht, bevor Network-Log geleert wurde
- "Preserve log" ist aktiviert, aber Requests sind nicht mehr sichtbar

**Zu prüfen:**
- Network-Log leeren
- Seite neu laden
- FilterTags öffnen/anzeigen

---

### 4. Console-Fehler blockieren Requests ⚠️🔴

**Beobachtung:**
- **13 Issues:** 4 Fehler, 1 Warnung
- **Mögliche Ursache:** JavaScript-Fehler blockieren FilterTags-Requests

**Zu prüfen:**
- Console-Tab öffnen
- Fehler anzeigen (4 Fehler)
- Prüfen ob Fehler FilterTags-Requests blockieren

---

## 🔧 NÄCHSTE SCHRITTE

### 1. Filter entfernen und alle Requests prüfen

**Schritte:**
1. Network-Tab → Filter `/saved-filters` entfernen
2. Network-Log leeren (🗑️ Icon)
3. Seite neu laden
4. Nach "saved" oder "filter" suchen
5. Prüfen:
   - Werden saved-filters Requests gemacht?
   - Wie lange dauern sie?
   - Welche Pfade werden verwendet?

---

### 2. Console-Fehler prüfen

**Schritte:**
1. Console-Tab öffnen
2. Fehler anzeigen (4 Fehler)
3. Prüfen:
   - Welche Fehler gibt es?
   - Blockieren sie FilterTags-Requests?
   - Gibt es Fehler zu saved-filters?

---

### 3. React DevTools prüfen

**Schritte:**
1. React DevTools öffnen
2. Components-Tab
3. Nach "SavedFilterTags" suchen
4. Prüfen:
   - Wird SavedFilterTags gerendert?
   - Werden useEffect-Hooks ausgeführt?
   - Gibt es Fehler beim Rendering?

---

### 4. Network-Tab: Alle Requests prüfen

**Schritte:**
1. Filter entfernen
2. Nach "saved" suchen (ohne Slash)
3. Prüfen:
   - Werden Requests zu saved-filters gemacht?
   - Welche Endpoints werden aufgerufen?
   - Wie lange dauern sie?

---

## 📊 ALTERNATIVE: Backend-Logs prüfen

**Falls Frontend-Analyse nicht möglich:**

```bash
cd /var/www/intranet
pm2 logs intranet-backend --lines 5000 --nostream | grep -E "saved-filters|getUserSavedFilters|getFilterGroups" | tail -100
```

**Was prüft es:**
- Werden saved-filters Requests am Backend empfangen?
- Wie lange dauern sie?
- Gibt es Fehler?

---

## 🎯 HYPOTHESE

**Wahrscheinlichste Ursache:**
1. **Console-Fehler blockieren Requests** (4 Fehler sichtbar)
2. **Requests werden nicht gemacht** (FilterTags-Komponente wird nicht gerendert?)
3. **Requests haben anderen Pfad** (nicht `/saved-filters`)

**Nächster Schritt:**
- Console-Fehler prüfen (4 Fehler)
- Filter entfernen und alle Requests prüfen
- React DevTools prüfen

---

**Erstellt:** 2025-01-29  
**Status:** 🔍 ANALYSE - Network-Tab zeigt keine saved-filters Requests  
**Nächster Schritt:** Console-Fehler prüfen und Filter entfernen


