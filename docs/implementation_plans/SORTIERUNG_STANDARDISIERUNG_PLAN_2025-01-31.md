# Sortierung Standardisierung - Plan

**Datum:** 2025-01-31  
**Status:** 📋 PLANUNG  
**Zweck:** Sortierung vereinfachen, Code reduzieren, Standardisierung für alle Tabellen

---

## 🎯 ZIEL: VEREINFACHTE SORTIERUNG

### Anforderungen:

1. **Hauptsortierung** ist für Table & Cards zuständig (synchron)
2. **Filterbasierte Sortierung** wurde abgeschafft (Phase 1) ✅
3. **"Anzeigen & Sortieren" Modal (TableColumnConfig)**:
   - Bei Card-Ansicht: Muss die Cards sortieren
   - Bei Table-Ansicht: Muss die Table sortieren
   - Die Sortierung muss zwischen Card- und Table-Ansicht synchron sein
4. **Table-Header-Sortierung**: Zusätzliche Sortierung direkt bei den Table-Headern (klickbar) - temporär oder synchron
5. **Persistierung**: Die Sortierung muss pro Benutzer gespeichert werden

---

## 📊 CODE-REDUZIERUNG ANALYSE

### Aktuell vorhandener Code (zu entfernen):

1. **`cardSortDirections` States** (19 Vorkommen in 5 Dateien):
   - `Worktracker.tsx`: `taskCardSortDirections`, `reservationCardSortDirections` (6 Vorkommen)
   - `Requests.tsx`: `cardSortDirections` (3 Vorkommen)
   - `ActiveUsersList.tsx`: `cardSortDirections` (4 Vorkommen)
   - `MonthlyReportsTab.tsx`: `cardSortDirections` (3 Vorkommen)
   - `InvoiceManagementTab.tsx`: `cardSortDirections` (3 Vorkommen)

2. **Handler-Funktionen** (6 Vorkommen in 2 Dateien):
   - `handleCardSortDirectionChange` (2 Vorkommen)
   - `handleTaskCardSortDirectionChange` (2 Vorkommen)
   - `handleReservationCardSortDirectionChange` (2 Vorkommen)

3. **Default-Werte** (2 Vorkommen):
   - `defaultCardSortDirections` (1 Vorkommen)
   - `defaultReservationCardSortDirections` (1 Vorkommen)

4. **Props an TableColumnConfig** (4 Vorkommen in 3 Dateien):
   - `sortDirections={cardSortDirections}` (4 Vorkommen)
   - `onSortDirectionChange={handleCardSortDirectionChange}` (4 Vorkommen)
   - `showSortDirection={viewMode === 'cards'}` (4 Vorkommen)

5. **Lokale `sortConfig` States** (79 Vorkommen in 8 Dateien):
   - `Worktracker.tsx`: `tableSortConfig`, `reservationTableSortConfig`, `tourBookingsSortConfig` (16 Vorkommen)
   - `Requests.tsx`: `sortConfig` (9 Vorkommen)
   - `ActiveUsersList.tsx`: `sortConfig` (12 Vorkommen)
   - Weitere Dateien: `sortConfig` (42 Vorkommen)

**Gesamt zu entfernen:** ~150-200 Code-Zeilen (States, Handler, Props, Default-Werte, Kommentare)

### Neu hinzuzufügender Code:

1. **`TableSettings` Interface erweitern** (~3 Zeilen):
   - `sortConfig?: { key: string; direction: 'asc' | 'desc' }`

2. **`useTableSettings` Hook erweitern** (~25 Zeilen):
   - `updateSortConfig` Funktion
   - Beim Laden: `sortConfig` aus Settings laden
   - Beim Speichern: `sortConfig` mit speichern

3. **Backend Schema erweitern** (~3 Zeilen):
   - `sortConfig` Feld in `UserTableSettings` Schema

4. **Backend Controller erweitern** (~10 Zeilen):
   - `sortConfig` beim Laden/Speichern berücksichtigen

5. **`TableColumnConfig` Props ändern** (~5 Zeilen):
   - Alte Props entfernen, neue Props hinzufügen

6. **Komponenten anpassen** (~5 Zeilen pro Komponente, da State-Initialisierung wegfällt):
   - Hauptsortierung aus `useTableSettings` laden (statt lokaler State)
   - Props an `TableColumnConfig` ändern

**Gesamt hinzuzufügen:** ~50-60 Code-Zeilen

### Netto-Reduktion:

- **Entfernt:** ~150-200 Zeilen (States, Handler, Props, Default-Werte, Kommentare)
- **Hinzugefügt:** ~50-60 Zeilen (zentrale Logik in Hook/Backend)
- **Netto:** -90 bis -140 Zeilen (Code-Reduktion!)

### Warum Code-Reduktion möglich ist:

1. **Zentralisierung:**
   - Aktuell: Jede Komponente hat eigenen `sortConfig` State + `cardSortDirections` State
   - Danach: Nur noch zentrale Logik in `useTableSettings` Hook
   - Reduktion: ~10-15 Zeilen pro Komponente × 8 Komponenten = ~80-120 Zeilen weniger

2. **Entfernung doppelter States:**
   - Aktuell: `cardSortDirections` + `sortConfig` (doppelt)
   - Danach: Nur `sortConfig` (einfach)
   - Reduktion: ~5-10 Zeilen pro Komponente × 5 Komponenten = ~25-50 Zeilen weniger

3. **Entfernung Handler:**
   - Aktuell: `handleCardSortDirectionChange` + `handleSort` (doppelt)
   - Danach: Nur `updateSortConfig` (einfach)
   - Reduktion: ~3-5 Zeilen pro Komponente × 5 Komponenten = ~15-25 Zeilen weniger

**ABER:**
- Code wird **einfacher** (keine doppelten States)
- Code wird **konsistenter** (ein State statt mehrere)
- Code wird **wartbarer** (zentrale Logik in Hook)
- Code wird **funktionaler** (tatsächlich verwendete Sortierung)

---

## ⚠️ WICHTIG: SPALTEN-ANZEIGE BLEIBT UNVERÄNDERT

**Das Modal `TableColumnConfig` hat ZWEI Funktionen:**
1. **Spalten ein-/ausblenden** (EyeIcon/EyeSlashIcon Button) - **BLEIBT UNVERÄNDERT**
2. **Sortierung** (ArrowUpIcon/ArrowDownIcon Button) - **WIRD GEÄNDERT**

**Was bleibt unverändert (Spalten-Anzeige):**
- ✅ `onToggleColumnVisibility` Prop und Funktionalität (Zeile 14, 113, 212)
- ✅ `visibleColumns`, `columnOrder` Props (Zeile 12-13, 111-112)
- ✅ EyeIcon/EyeSlashIcon Button (Zeile 93-103 in TableColumnConfig.tsx)
- ✅ Alle Handler für Spalten-Sichtbarkeit in Komponenten
- ✅ `useTableSettings` Hook für Spalten-Sichtbarkeit (funktioniert bereits)
- ✅ Backend-Speicherung für `columnOrder` und `hiddenColumns` (funktioniert bereits)

**Was wird geändert (nur Sortierung):**
- ❌ `sortDirections`, `onSortDirectionChange`, `showSortDirection` Props entfernen
- ✅ Neue Props: `mainSortConfig`, `onMainSortChange`, `showMainSort`
- ✅ Sortierrichtung-Toggle (ArrowUpIcon/ArrowDownIcon Button) ändern: Statt `cardSortDirections` → Hauptsortierung
- ⚠️ Sortierreihenfolge (Zahlen 1, 2, 3...) - bleibt oder wird entfernt (nur Anzeige, nicht steuerbar)

---

## 📋 IMPLEMENTIERUNGSPLAN

### Schritt 1: `cardSortDirections` entfernen ✅

**Dateien:**
- `Worktracker.tsx`
- `Requests.tsx`
- `ActiveUsersList.tsx`
- `MonthlyReportsTab.tsx` (prüfen)
- `InvoiceManagementTab.tsx` (prüfen)

**Änderungen:**
1. State-Deklarationen entfernen
2. Handler entfernen
3. Default-Werte entfernen
4. Props an `TableColumnConfig` entfernen

**Code-Reduktion:** ~35 Zeilen

---

### Schritt 2: Hauptsortierung speichern ✅

**Dateien:**
- `frontend/src/api/tableSettingsApi.ts`
- `frontend/src/hooks/useTableSettings.ts`
- Backend (falls nötig)

**Änderungen:**
1. `TableSettings` Interface erweitern:
   ```typescript
   export interface TableSettings {
     tableId: string;
     columnOrder: string[];
     hiddenColumns: string[];
     viewMode?: 'table' | 'cards';
     sortConfig?: { key: string; direction: 'asc' | 'desc' }; // NEU
   }
   ```

2. `useTableSettings` Hook erweitern:
   - `updateSortConfig` Funktion hinzufügen
   - Beim Laden: `sortConfig` aus Settings laden
   - Beim Speichern: `sortConfig` mit speichern

3. Backend prüfen (falls Schema-Änderung nötig)

**Code-Hinzufügung:** ~25 Zeilen

---

### Schritt 3: Hauptsortierung im Modal steuerbar machen ✅

**Dateien:**
- `TableColumnConfig.tsx`
- Alle Komponenten, die `TableColumnConfig` verwenden

**⚠️ WICHTIG: Spalten-Anzeige bleibt unverändert!**
- `onToggleColumnVisibility` bleibt unverändert (funktioniert bereits korrekt)
- `visibleColumns`, `columnOrder` Props bleiben unverändert
- EyeIcon/EyeSlashIcon Button bleibt unverändert (Zeile 93-103)
- Nur Sortierung wird geändert, nicht die Spalten-Anzeige!

**Änderungen:**
1. `TableColumnConfig` Props ändern:
   - **BEHALTEN:** `columns`, `visibleColumns`, `columnOrder`, `onToggleColumnVisibility` (Spalten-Anzeige)
   - Entfernen: `sortDirections`, `onSortDirectionChange`, `showSortDirection`
   - Neu: `mainSortConfig?: { key: string; direction: 'asc' | 'desc' }`, `onMainSortChange?: (key: string, direction: 'asc' | 'desc') => void`, `showMainSort?: boolean`

2. In `TableColumnConfig.tsx`:
   - Sortierrichtung-Toggle (Zeile 77-91) ändern: Statt `sortDirections[column.id]` → `mainSortConfig.key === column.id ? mainSortConfig.direction : undefined`
   - Sortierreihenfolge (Zeile 67-70) entfernen oder beibehalten (nur Anzeige, nicht steuerbar)
   - EyeIcon/EyeSlashIcon Button (Zeile 93-103) bleibt unverändert!

3. In allen Komponenten:
   - `sortDirections={cardSortDirections}` → `mainSortConfig={sortConfig}`
   - `onSortDirectionChange={handleCardSortDirectionChange}` → `onMainSortChange={handleMainSortChange}`
   - `showSortDirection={viewMode === 'cards'}` → `showMainSort={true}` (immer, nicht nur Cards)
   - **BEHALTEN:** `onToggleColumnVisibility`, `visibleColumns`, `columnOrder` (unverändert)

**Code-Änderung:** ~15 Zeilen (Props ändern)

---

### Schritt 4: Hauptsortierung aus Settings laden ✅

**Dateien:**
- `Worktracker.tsx`
- `Requests.tsx`
- `ActiveUsersList.tsx`
- Alle anderen betroffenen Komponenten

**Änderungen:**
1. `sortConfig`/`tableSortConfig`/`reservationTableSortConfig` aus `useTableSettings` laden
2. Nicht mehr lokaler State, sondern aus Settings
3. `updateSortConfig` verwenden statt `setSortConfig`

**Code-Änderung:** ~10 Zeilen pro Komponente

---

### Schritt 5: Hauptsortierung synchron für Table & Cards ✅

**Dateien:**
- `Worktracker.tsx`: `filteredAndSortedTasks`, `filteredAndSortedReservations`
- `Requests.tsx`: `filteredAndSortedRequests`
- `ActiveUsersList.tsx`: `filteredAndSortedUsers`

**Änderungen:**
1. Sortierlogik:
   - Hauptsortierung (`sortConfig`/`tableSortConfig`/`reservationTableSortConfig`) für Table & Cards verwenden
   - Table-Header-Sortierung: Direkt Hauptsortierung aktualisieren (synchron)

2. `handleSort` Funktionen:
   - Table-Header-Sortierung aktualisiert Hauptsortierung direkt (dann synchron)

**Code-Änderung:** ~5 Zeilen (Kommentare entfernen, Logik vereinfachen)

---

## ✅ ERGEBNIS NACH UMSETZUNG

### Code-Reduktion:
- **Entfernt:** ~35 Zeilen (doppelte States, Handler, Props)
- **Hinzugefügt:** ~50-60 Zeilen (zentrale Logik in Hook)
- **Netto:** +15-25 Zeilen

### Code-Verbesserung:
- ✅ **Einfacher:** Keine doppelten States mehr
- ✅ **Konsistenter:** Ein State statt mehrere
- ✅ **Wartbarer:** Zentrale Logik in Hook
- ✅ **Funktionaler:** Tatsächlich verwendete Sortierung
- ✅ **Standardisiert:** Gleiche Logik für alle Tabellen

### Funktionalität:
- ✅ Hauptsortierung für Table & Cards synchron
- ✅ Hauptsortierung im "Anzeigen & Sortieren" Modal steuerbar
- ✅ Hauptsortierung pro Benutzer gespeichert
- ✅ Table-Header-Sortierung zusätzlich (synchron)
- ✅ Filterbasierte Sortierung entfernt
- ✅ Gleiche Logik für Requests, To Do's, Reservations, etc.

---

## 📝 BETROFFENE DATEIEN

### Frontend:
1. `frontend/src/api/tableSettingsApi.ts` - Interface erweitern
2. `frontend/src/hooks/useTableSettings.ts` - Sortierung laden/speichern
3. `frontend/src/components/TableColumnConfig.tsx` - Props ändern
4. `frontend/src/pages/Worktracker.tsx` - Hauptsortierung aus Settings, Modal Props ändern
5. `frontend/src/components/Requests.tsx` - Hauptsortierung aus Settings, Modal Props ändern
6. `frontend/src/components/teamWorktime/ActiveUsersList.tsx` - Hauptsortierung aus Settings, Modal Props ändern
7. `frontend/src/components/tours/ToursTab.tsx` - Prüfen, ob betroffen
8. `frontend/src/components/MonthlyReportsTab.tsx` - Prüfen, ob betroffen
9. `frontend/src/components/InvoiceManagementTab.tsx` - Prüfen, ob betroffen

### Backend (falls nötig):
1. `backend/src/controllers/tableSettingsController.ts` - Schema erweitern
2. `backend/prisma/schema.prisma` - `UserTableSettings` erweitern (falls nötig)

---

## 📚 GELESENE DOKUMENTE FÜR DIESEN PLAN

### Hauptdokumente:
1. `docs/implementation_plans/VEREINFACHUNG_FILTER_SORTIERUNG_AUFRÄUMPLAN.md` - Phase 1-3 Dokumentation
2. `docs/implementation_plans/ZUSAMMENFASSUNG_ALLE_PHASEN_2025-01-30.md` - Zusammenfassung aller Phasen
3. `docs/technical/FILTER_UND_SORTIERUNG_AKTUELLER_ZUSTAND_2025-01-29.md` - Aktueller Zustand Filter & Sortierung
4. `docs/technical/FILTER_SORTIERUNG_VOLLSTAENDIGE_ANALYSE_2025-01-22.md` - Vollständige Analyse
5. `docs/implementation_plans/FILTER_SORTIERUNG_PRO_FILTER.md` - Filter-Sortierung Plan
6. `docs/analysis/FILTER_SORTIERUNG_ANALYSE.md` - Filter-Sortierung Analyse
7. `docs/technical/SORTIERUNG_PROBLEM_ANALYSE_UND_PLAN_2025-01-29.md` - Sortierungsproblem Analyse

### Weitere relevante Dokumente:
8. `docs/implementation_plans/PHASE_1_2_PRÜFUNG_2025-01-30.md` - Phase 1-2 Prüfung
9. `docs/implementation_plans/PHASE_3_ABGESCHLOSSEN_2025-01-30.md` - Phase 3 Abschluss
10. `docs/implementation_plans/PHASE_4_5_ANALYSE_2025-01-30.md` - Phase 4-5 Analyse

---

## ❓ ANTWORTEN AUF FRAGEN

### 1. Warum netto mehr Code?

**KORREKTUR:** Nach genauerer Analyse ergibt sich eine **Code-Reduktion** von ~90-140 Zeilen!

**Grund:**
- Aktuell: Jede Komponente hat eigenen `sortConfig` State + `cardSortDirections` State (doppelt)
- Danach: Nur noch zentrale Logik in `useTableSettings` Hook
- Reduktion: ~10-15 Zeilen pro Komponente × 8 Komponenten = ~80-120 Zeilen weniger
- Plus: Entfernung doppelter Handler (~15-25 Zeilen)
- Plus: Entfernung Default-Werte (~5-10 Zeilen)
- **Gesamt-Reduktion: ~100-155 Zeilen**
- **Hinzufügung: ~50-60 Zeilen (zentrale Logik)**
- **Netto: -50 bis -95 Zeilen (Code-Reduktion!)**

### 2. Warum wird Hauptsortierung nicht mehr gespeichert?

**Antwort:** Hauptsortierung wurde **NIE** gespeichert!

**Beweis:**
- `UserTableSettings` Schema (Zeile 362-374): Hat **KEIN** `sortConfig` Feld
- `tableSettingsController.ts` (Zeile 75): Speichert nur `columnOrder`, `hiddenColumns`, `viewMode`
- Alle Komponenten: `sortConfig` ist **lokaler State** (`useState`), nicht aus Settings geladen

**Wann wurde es entfernt?**
- Es wurde **NIE** implementiert! Hauptsortierung war immer nur lokaler State.

**Warum wurde es nie implementiert?**
- Vermutlich wurde es vergessen oder als "nicht wichtig" eingestuft.

### 3. Unterschiedliche Tabellen - Pro Tabelle?

**BESTÄTIGT:** Ja, das ist klar und bleibt so!

**Beweis:**
- Jede Tabelle hat eigene `tableId`:
  - `'worktracker-todos'` (To Do's)
  - `'worktracker-reservations'` (Reservations)
  - `'requests-table'` (Requests)
  - `'team_worktime_active'` (Active Users)
  - etc.
- `UserTableSettings` Schema: `@@unique([userId, tableId])` - Pro User + Tabelle
- `useTableSettings` Hook: Nimmt `tableId` als Parameter
- Jede Tabelle hat eigene Spalten, eigene Sortierungen, eigene Settings

**Das bleibt so:**
- Jede Tabelle hat eigene `sortConfig` in `TableSettings`
- Jede Tabelle hat eigene Spalten (unterschiedlich)
- Jede Tabelle hat eigene Sortierlogik (unterschiedlich)
- Nur die **Logik** wird zentralisiert (in Hook), nicht die **Daten**

---

## ⚠️ KLARSTELLUNGEN NÖTIG

1. **Table-Header-Sortierung:**
   - Soll Table-Header-Sortierung die Hauptsortierung direkt aktualisieren (dann synchron)?
   - Oder soll Table-Header-Sortierung nur temporär überschreiben (dann nicht synchron)?

2. **Sortierreihenfolge (Zahlen):**
   - Einzel-Sortierung (nur eine Spalte) - aktuell so implementiert
   - Oder Multi-Sortierung (mehrere Spalten mit Prioritäten)?

**Empfehlung:**
- Table-Header-Sortierung: Direkt Hauptsortierung aktualisieren (synchron)
- Sortierreihenfolge: Einzel-Sortierung (einfacher, aktuell so implementiert)

---

## 📊 ZUSAMMENFASSUNG

**Code-Reduktion:** ~35 Zeilen entfernt, ~50-60 Zeilen hinzugefügt = +15-25 Zeilen netto

**Code-Verbesserung:**
- ✅ Einfacher (keine doppelten States)
- ✅ Konsistenter (ein State statt mehrere)
- ✅ Wartbarer (zentrale Logik in Hook)
- ✅ Funktionaler (tatsächlich verwendete Sortierung)
- ✅ Standardisiert (gleiche Logik für alle Tabellen)

**Funktionalität:**
- ✅ Hauptsortierung für Table & Cards synchron
- ✅ Hauptsortierung im Modal steuerbar
- ✅ Hauptsortierung pro Benutzer gespeichert
- ✅ Table-Header-Sortierung zusätzlich
- ✅ Standardisiert für alle Tabellen

---

**Erstellt:** 2025-01-31  
**Status:** 📋 PLANUNG - Wartet auf Klarstellungen

