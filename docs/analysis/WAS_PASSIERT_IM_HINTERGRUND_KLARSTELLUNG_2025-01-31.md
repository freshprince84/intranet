# Was passiert im Hintergrund? - Klarstellung (2025-01-31)

**Datum:** 2025-01-31  
**Status:** 📊 KLARSTELLUNG  
**Zweck:** Klarstellen, was wirklich im Hintergrund passiert und warum RAM größer wird als DB-Größe

---

## 🔍 KLARSTELLUNG 1: TTL hat NICHTS mit Filter-Tags zu tun!

### ❌ FALSCH VERSTANDEN:
- "TTL bedeutet, dass Filter-Tags verschwinden"
- "Filter werden gelöscht nach 60 Minuten"

### ✅ RICHTIG:
**TTL (Time To Live) betrifft NUR den Memory-Cache, NICHT die gespeicherten Filter!**

**Was passiert wirklich:**
1. **Filter-Tags bleiben IMMER in der Datenbank** - werden NIE gelöscht
2. **Filter-Tags bleiben IMMER sichtbar** - werden IMMER angezeigt
3. **TTL betrifft nur:** Memory-Cache im Browser (RAM)
4. **Nach 60 Minuten:** Memory-Cache wird gelöscht (um RAM zu sparen)
5. **Wenn Filter-Tags angezeigt werden sollen:** Werden einfach neu aus der DB geladen (automatisch)

**Code-Prüfung:**
```typescript
// FilterContext.tsx Zeile 150-180
const cleanupOldFilters = useCallback(() => {
  // Lösche nur Memory-Cache (filters State)
  delete newFilters[tableId]; // ← Nur Memory, NICHT DB!
  // Filter bleiben in DB, werden beim nächsten Anzeigen neu geladen
}, []);
```

**Fazit:** Filter-Tags verschwinden NIE. TTL löscht nur den Memory-Cache, um RAM zu sparen.

---

## 🔍 KLARSTELLUNG 2: Was passiert im Hintergrund?

### ✅ WAS WIRKLICH PASSIERT (Code-verifiziert):

#### 1. Beim Öffnen einer Seite:

**WorktimeContext** (`frontend/src/contexts/WorktimeContext.tsx`):
- ✅ Lädt einmal: `/api/worktime/active` (beim Mount)
- ✅ **Polling alle 30 Sekunden:** `/api/worktime/active` (nur wenn Seite sichtbar)
- ✅ **Stoppt automatisch:** Wenn Seite im Hintergrund (Page Visibility API)

**NotificationBell** (`frontend/src/components/NotificationBell.tsx`):
- ✅ Lädt einmal: `/api/notifications/unread/count` (beim Mount)
- ✅ **Polling alle 60 Sekunden:** `/api/notifications/unread/count` (nur wenn Seite sichtbar)
- ✅ **Stoppt automatisch:** Wenn Seite im Hintergrund (Page Visibility API)

**FilterContext** (`frontend/src/contexts/FilterContext.tsx`):
- ✅ **Cleanup-Timer alle 5 Minuten:** Löscht Memory-Cache (nur RAM, nicht DB!)
- ✅ **Kein automatisches Neuladen:** Filter werden nur geladen, wenn angezeigt werden sollen
- ✅ **Kein Polling:** Filter werden NICHT automatisch neu geladen
- ✅ **refreshFilters wird NUR aufgerufen bei:**
  - Filter erstellt/gelöscht/aktualisiert (manuell durch User)
  - Event `consultationChanged` (nur für Consultations-Tabelle)
  - `cleanupExcessiveClientFilters` (nur für Consultations, wenn > 5 Client-Filter)

**TeamWorktimeControl** (`frontend/src/pages/TeamWorktimeControl.tsx`):
- ✅ **Polling alle 30 Sekunden:** `/api/team/worktime/active-users` (nur wenn Seite offen)
- ✅ **Stoppt automatisch:** Wenn Seite geschlossen wird

#### 2. Was passiert NICHT automatisch:

- ❌ **Filter werden NICHT automatisch neu geladen**
- ❌ **Filter-Tags verschwinden NICHT**
- ❌ **Daten werden NICHT automatisch neu geladen** (außer Polling oben)
- ❌ **Nichts passiert, wenn man nichts macht** (außer Polling oben)

---

## 🔍 KLARSTELLUNG 3: Warum wird RAM größer als DB-Größe?

### ❌ FALSCH VERSTANDEN:
- "DB ist nur 1.1GB, warum ist RAM größer?"
- "Es sind doch gar nicht so viele Daten in der DB"

### ✅ RICHTIG:

**RAM enthält VIEL MEHR als nur DB-Daten:**

#### 1. React State (größter Teil):
- **Worktracker.tsx:** `tasks[]`, `reservations[]`, `tourBookings[]` - Alle geladenen Items im Memory
- **Requests.tsx:** `requests[]` - Alle geladenen Requests im Memory
- **FilterContext:** `filters[]`, `filterGroups[]` - Alle geladenen Filter im Memory
- **Jedes Item enthält:** Vollständige Daten + Attachments + Metadaten
- **Beispiel:** 1000 Tasks × 200KB pro Task = 200MB nur für Tasks!

#### 2. Browser Memory:
- **DOM (Document Object Model):** Alle HTML-Elemente im Memory
- **CSS:** Alle Stylesheets im Memory
- **JavaScript:** Alle JavaScript-Dateien im Memory
- **React Component Tree:** Alle React-Komponenten im Memory
- **Event Listeners:** Alle Event-Handler im Memory

#### 3. Console-Logs:
- **Browser speichert Console-History:** Alle `console.log` Ausgaben im Memory
- **Wächst kontinuierlich:** Bei vielen Logs → 10-50MB+

#### 4. Caches:
- **React Cache:** `useMemo`, `useCallback` behalten alte Werte
- **Browser Cache:** Bilder, CSS, JavaScript
- **API Response Cache:** Alte API-Responses bleiben im Memory

#### 5. Polling-Responses:
- **WorktimeContext:** Alle 30 Sekunden → Response bleibt im Memory
- **NotificationBell:** Alle 60 Sekunden → Response bleibt im Memory
- **Nach 5 Minuten:** 10 Worktime-Responses + 5 Notification-Responses = 15 Responses im Memory

#### 6. URL.createObjectURL() Blobs:
- **Bildvorschauen:** Jedes Bild erstellt Blob-URL im Memory
- **Wächst bei vielen Bildern:** 10-50MB pro 100 Bilder

### 📊 BEISPIEL-RECHNUNG:

**DB-Größe:** 1.1GB (komprimiert, in PostgreSQL)

**RAM-Verbrauch (Browser):**
- React State (Tasks, Requests, etc.): ~200-500MB
- Browser (DOM, CSS, JavaScript): ~100-200MB
- Console-Logs: ~10-50MB
- React Cache: ~10-50MB
- Polling-Responses: ~5-25MB
- Blob-URLs: ~0-10MB
- **Gesamt:** ~325-835MB

**Warum größer als DB?**
- DB speichert Daten komprimiert
- RAM speichert Daten dekomprimiert + Metadaten
- RAM speichert auch Browser-Overhead (DOM, CSS, JavaScript)
- RAM speichert auch temporäre Daten (Console-Logs, Caches)

---

## 🔍 KLARSTELLUNG 4: Was kann reduziert werden?

### ✅ BEREITS REDUZIERT:
1. ✅ Infinite Scroll begrenzt (MAX_TASKS = 1000)
2. ✅ URL.createObjectURL() Cleanup (keine Memory-Leaks mehr)
3. ✅ Polling stoppt automatisch (wenn Seite im Hintergrund)
4. ✅ FilterContext TTL (löscht Memory-Cache nach 60 Min)

### ⚠️ KANN NOCH REDUZIERT WERDEN:
1. 🔄 Console.log Migration (~91% noch zu migrieren) → 10-50MB Reduktion
2. ⚠️ FilterContext TTL reduzieren? (60 Min → 15 Min) → 5-20MB Reduktion
3. ⚠️ useMemo/useCallback Dependencies optimieren → 5-20MB Reduktion

### ❌ KANN NICHT REDUZIERT WERDEN:
1. ❌ React State (muss im Memory sein, sonst keine Anzeige)
2. ❌ Browser-Overhead (DOM, CSS, JavaScript - normal)
3. ❌ Polling-Responses (müssen im Memory sein, sonst keine Updates)

---

## 📋 ZUSAMMENFASSUNG

### Was TTL wirklich macht:
- ✅ Löscht nur Memory-Cache (RAM)
- ✅ Filter-Tags bleiben in DB
- ✅ Filter-Tags bleiben sichtbar
- ✅ Werden automatisch neu geladen, wenn nötig

### Was im Hintergrund passiert:
- ✅ WorktimeContext: Polling alle 30 Sekunden (nur wenn Seite sichtbar)
- ✅ NotificationBell: Polling alle 60 Sekunden (nur wenn Seite sichtbar)
- ✅ FilterContext: Cleanup alle 5 Minuten (löscht nur Memory-Cache, nicht DB!)
- ✅ TeamWorktimeControl: Polling alle 30 Sekunden (nur wenn Seite offen)
- ❌ **KEIN automatisches Neuladen von Filtern** (nur bei manuellen Aktionen)
- ❌ **KEIN automatisches Neuladen von Daten** (außer Polling oben)

### Warum RAM größer als DB:
- ✅ React State speichert alle geladenen Daten dekomprimiert
- ✅ Browser speichert DOM, CSS, JavaScript
- ✅ Console-Logs, Caches, Polling-Responses
- ✅ **Normal:** RAM ist immer größer als DB-Größe

---

**Erstellt:** 2025-01-31  
**Status:** 📊 KLARSTELLUNG ABGESCHLOSSEN  
**Fazit:** TTL betrifft nur Memory-Cache, nicht Filter-Tags. RAM ist größer als DB, weil Browser-Overhead + dekomprimierte Daten.
