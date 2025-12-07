# Sortierung Standard - Implementierungsrichtlinien

**Datum:** 2025-01-31  
**Status:** ✅ AKTIV  
**Zweck:** Standardisierte Sortierung für alle Tabellen (Table & Cards synchron, pro Benutzer gespeichert)

---

## 🎯 STANDARD: VEREINFACHTE SORTIERUNG

### Anforderungen (IMMER EINHALTEN):

1. **Hauptsortierung** ist für Table & Cards zuständig (synchron)
2. **Filterbasierte Sortierung** wurde abgeschafft (Phase 1) ✅
3. **"Anzeigen & Sortieren" Modal (TableColumnConfig)**:
   - Bei Card-Ansicht: Muss die Cards sortieren
   - Bei Table-Ansicht: Muss die Table sortieren
   - Die Sortierung muss zwischen Card- und Table-Ansicht synchron sein
4. **Table-Header-Sortierung**: Zusätzliche Sortierung direkt bei den Table-Headern (klickbar) - synchronisiert mit Hauptsortierung
5. **Persistierung**: Die Sortierung muss pro Benutzer gespeichert werden

---

## 📋 IMPLEMENTIERUNGS-CHECKLISTE

### ✅ Backend (einmalig erledigt):

- [x] `UserTableSettings` Schema erweitert (`sortConfig` Feld)
- [x] `tableSettingsController` erweitert (laden/speichern)
- [x] Migration erstellt

### ✅ Frontend - Basis (einmalig erledigt):

- [x] `TableSettings` Interface erweitert (`sortConfig` Feld)
- [x] `useTableSettings` Hook erweitert (`updateSortConfig` Funktion)
- [x] `TableColumnConfig` Props geändert (`mainSortConfig` statt `sortDirections`)

### ✅ Frontend - Pro Komponente (bei jeder neuen Tabelle):

1. **useTableSettings Hook erweitern:**
   ```typescript
   const {
     settings,
     // ... andere Props
     updateSortConfig  // ✅ HINZUFÜGEN
   } = useTableSettings('table_id', {
     // ... defaults
   });
   ```

2. **Hauptsortierung aus Settings laden:**
   ```typescript
   // ❌ NICHT MEHR: const [sortConfig, setSortConfig] = useState<SortConfig>({ ... });
   // ✅ STATTDESSEN:
   const sortConfig: SortConfig = settings.sortConfig || { key: 'defaultKey', direction: 'asc' };
   ```

3. **Hauptsortierung Handler:**
   ```typescript
   // ❌ NICHT MEHR: const [cardSortDirections, setCardSortDirections] = useState<...>(...);
   // ✅ STATTDESSEN:
   const handleMainSortChange = (key: string, direction: 'asc' | 'desc') => {
     updateSortConfig({ key: key as SortConfig['key'], direction });
   };
   ```

4. **Table-Header-Sortierung aktualisieren:**
   ```typescript
   // ❌ NICHT MEHR:
   // const handleSort = (key: SortConfig['key']) => {
   //   setSortConfig(current => ({ ... }));
   // };
   // ✅ STATTDESSEN:
   const handleSort = (key: SortConfig['key']) => {
     const newDirection = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
     updateSortConfig({ key, direction: newDirection });
   };
   ```

5. **TableColumnConfig Props aktualisieren:**
   ```typescript
   <TableColumnConfig
     // ... andere Props
     mainSortConfig={sortConfig}  // ✅ HINZUFÜGEN
     onMainSortChange={handleMainSortChange}  // ✅ HINZUFÜGEN
     showMainSort={true}  // ✅ HINZUFÜGEN
     // ❌ ENTFERNEN: sortDirections, onSortDirectionChange, showSortDirection
   />
   ```

6. **Sortierlogik aktualisieren:**
   ```typescript
   // ❌ ENTFERNEN: cardSortDirections aus useMemo Dependencies
   // ✅ VERWENDEN: sortConfig (aus Settings) für Table & Cards synchron
   const sortedItems = useMemo(() => {
     // ... Sortierlogik mit sortConfig
   }, [items, sortConfig, /* andere Dependencies */]);
   ```

7. **Default-Werte entfernen:**
   ```typescript
   // ❌ ENTFERNEN:
   // const defaultCardSortDirections: Record<string, 'asc' | 'desc'> = { ... };
   // ✅ STATTDESSEN: sortConfig wird aus Settings geladen (mit Fallback)
   ```

---

## ⚠️ VERBOTENE PATTERNS (NIEMALS MEHR VERWENDEN):

1. ❌ `cardSortDirections` State
2. ❌ `handleCardSortDirectionChange` Handler
3. ❌ `defaultCardSortDirections` Konstanten
4. ❌ `sortDirections` Prop an `TableColumnConfig`
5. ❌ `onSortDirectionChange` Prop an `TableColumnConfig`
6. ❌ `showSortDirection` Prop an `TableColumnConfig`
7. ❌ Lokaler `sortConfig` State (außer als Fallback beim Laden)
8. ❌ Separate Sortierung für Table und Cards

---

## ✅ ERLAUBTE PATTERNS (IMMER VERWENDEN):

1. ✅ `sortConfig` aus `settings.sortConfig` laden
2. ✅ `updateSortConfig` aus `useTableSettings` verwenden
3. ✅ `mainSortConfig` Prop an `TableColumnConfig`
4. ✅ `onMainSortChange` Prop an `TableColumnConfig`
5. ✅ `showMainSort={true}` Prop an `TableColumnConfig`
6. ✅ Synchronisierung: Table-Header-Sortierung aktualisiert Hauptsortierung
7. ✅ Eine Sortierung für Table & Cards (synchron)

---

## 📝 BEISPIEL-IMPLEMENTIERUNG

Siehe:
- `frontend/src/pages/Worktracker.tsx` (Todos & Reservations)
- `frontend/src/components/Requests.tsx`
- `frontend/src/components/MonthlyReportsTab.tsx`
- `frontend/src/components/InvoiceManagementTab.tsx`
- `frontend/src/components/tours/ToursTab.tsx`

---

## 🔄 MIGRATION VON ALTEM CODE

Wenn eine Komponente noch das alte Pattern verwendet:

1. `cardSortDirections` State entfernen
2. `handleCardSortDirectionChange` entfernen
3. `defaultCardSortDirections` entfernen
4. `updateSortConfig` aus `useTableSettings` holen
5. `sortConfig` aus `settings.sortConfig` laden
6. `handleMainSortChange` hinzufügen
7. `handleSort` aktualisieren (verwendet `updateSortConfig`)
8. `TableColumnConfig` Props aktualisieren
9. Sortierlogik aktualisieren (nur `sortConfig` verwenden)
10. `useMemo` Dependencies aktualisieren (`cardSortDirections` entfernen)

---

## ✅ QUALITÄTSSICHERUNG

Vor jedem Commit prüfen:

- [ ] Keine `cardSortDirections` mehr vorhanden
- [ ] Keine `defaultCardSortDirections` mehr vorhanden
- [ ] `sortConfig` wird aus `settings.sortConfig` geladen
- [ ] `updateSortConfig` wird verwendet
- [ ] `TableColumnConfig` verwendet `mainSortConfig`, `onMainSortChange`, `showMainSort`
- [ ] Table-Header-Sortierung synchronisiert mit Hauptsortierung
- [ ] Sortierung funktioniert für Table & Cards synchron
- [ ] Sortierung wird pro Benutzer gespeichert

---

**WICHTIG:** Dieser Standard muss bei JEDER neuen Tabelle oder Komponente eingehalten werden. Keine Ausnahmen!

