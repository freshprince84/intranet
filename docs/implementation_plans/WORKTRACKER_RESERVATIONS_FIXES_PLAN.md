# Worktracker Reservations - Fixes Plan

## Analyse der Probleme

### 1. Suche funktioniert nur bei Desktop, nicht bei Mobile
**Problem:** Das Suchfeld hat eine feste Breite `w-[200px]`, die bei Mobile-Größe möglicherweise nicht sichtbar ist oder außerhalb des Viewports liegt.

**Lokalisierung:** `frontend/src/pages/Worktracker.tsx` Zeile 2428-2440

**Ursache:** 
- Feste Breite `w-[200px]` ohne responsive Anpassung
- Möglicherweise wird das Suchfeld bei Mobile-Größe ausgeblendet oder überlappt

### 2. Filter-Button macht nichts (bei Reservations)
**Problem:** Der Filter-Button öffnet nur das FilterPane für `todos`, nicht für `reservations`.

**Lokalisierung:** `frontend/src/pages/Worktracker.tsx` Zeile 1503

**Ursache:**
```tsx
{isFilterModalOpen && activeTab === 'todos' && (
```
Die Bedingung prüft nur auf `activeTab === 'todos'`, daher wird das FilterPane für Reservations nie angezeigt.

### 3. Anzeige-Modal zeigt alle Card-Infos als ausgeblendet an (falsch) & lässt sich nicht ändern
**Problem:** Das TableColumnConfig-Modal zeigt die Sichtbarkeit der Card-Metadaten falsch an.

**Lokalisierung:** `frontend/src/pages/Worktracker.tsx` Zeile 2512-2600

**Ursache:**
- `visibleCardMetadata` wird als `Set` übergeben, aber `TableColumnConfig` erwartet ein `string[]` Array
- Die Mapping-Logik zwischen Card-Metadaten und Tabellen-Spalten funktioniert möglicherweise nicht korrekt
- `onToggleColumnVisibility` verwendet `cardToTableMapping`, aber die Sichtbarkeit wird möglicherweise nicht korrekt synchronisiert

### 4. Sync-Button funktioniert nicht & fehlt bei Mobile-Größe
**Problem:** 
- Sync-Button funktioniert nicht (möglicherweise fehlt die Funktion oder es gibt einen Fehler)
- Sync-Button fehlt bei Mobile-Größe komplett

**Lokalisierung:** `frontend/src/pages/Worktracker.tsx` Zeile 2442-2471

**Ursache:**
- Der Button ist in einem `flex items-center gap-1.5` Container, der bei Mobile möglicherweise überläuft
- Keine responsive Klassen, die den Button bei Mobile verstecken/zeigen
- Möglicherweise wird der Button bei Mobile ausgeblendet durch CSS oder fehlt durch Overflow

### 5. Schriftgrößen der Tab-Beschriftungen sind bei Mobile unterschiedlich
**Problem:** "Tareas" Tab hat `text-xs sm:text-sm`, "Reservaciones" Tab hat nur `text-sm` (keine responsive Klassen).

**Lokalisierung:** `frontend/src/pages/Worktracker.tsx` Zeile 1477-1498

**Ursache:**
- Inkonsistente responsive Klassen:
  - "Tareas" Tab: `text-xs sm:text-sm` (Zeile 1479)
  - "Reservaciones" Tab: `text-sm` (Zeile 1490) - fehlt `text-xs` für Mobile

### 6. Check-in-Link ist in der Card falsch (zeigt Server-IP statt lobbypms-Domain)
**Problem:** Der Check-in-Link wird als `${window.location.origin}/check-in/${reservation.id}` generiert, sollte aber der LobbyPMS-Link sein.

**Lokalisierung:** 
- `frontend/src/pages/Worktracker.tsx` Zeile 1990 (Cards-Mode)
- `frontend/src/pages/Worktracker.tsx` Zeile 3125 (Table-Mode)

**Ursache:**
- Verwendet `window.location.origin` statt `generateLobbyPmsCheckInLink` Funktion
- Backend verwendet korrekt `generateLobbyPmsCheckInLink` (siehe `backend/src/utils/checkInLinkUtils.ts`)

**Hinweis:** Der Link wird beim Versenden korrekt generiert (siehe `backend/src/services/reservationNotificationService.ts`), aber in der Card-Anzeige wird der falsche Link verwendet.

### 7. Telefonnummer verschiebt sich in Mobile-Ansicht in die Mitte, muss unter Mail bleiben & vertikal bündig
**Problem:** In der Mobile-Ansicht wird die Telefonnummer in die Mitte verschoben statt unter der E-Mail zu bleiben.

**Lokalisierung:** `frontend/src/components/shared/DataCard.tsx` Zeile 656-672

**Ursache:**
- Bei Mobile (`grid-cols-1`) werden alle 3 Spalten untereinander angezeigt
- Die `section: 'left'` Metadaten (Email, Telefon) sollten bei Mobile vertikal untereinander bleiben
- Möglicherweise wird das Grid-Layout bei Mobile nicht korrekt angewendet oder die Items werden zentriert

### 8. Grundsätzlich stimmt die Mobile-Ansicht nicht
**Problem:** Die Mobile-Ansicht weicht von der Desktop-Ansicht ab (außer den bereits genannten Problemen).

**Zu prüfende Unterschiede:**
- Header-Layout (Buttons, Suchfeld, Filter)
- Tab-Navigation
- Card-Layout
- Spacing und Padding
- Button-Größen und -Positionen

## Implementierungsplan

### Fix 1: Suche bei Mobile funktionsfähig machen
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
1. Suchfeld responsive machen:
   - `w-[200px]` durch `w-full sm:w-[200px]` ersetzen
   - Sicherstellen, dass das Suchfeld bei Mobile sichtbar ist
   - Möglicherweise `hidden sm:block` entfernen, falls vorhanden

**Zeile:** 2428-2440

### Fix 2: Filter-Button für Reservations aktivieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Problem erkannt:**
- FilterPane wird nur für `activeTab === 'todos'` angezeigt (Zeile 1503)
- Für Reservations existieren bereits:
  - `reservationFilterConditions` (Zeile 222)
  - `applyReservationFilterConditions` (Zeile 767)
  - `resetReservationFilterConditions` (Zeile 776)
  - `reservationFilterLogicalOperators` (muss geprüft werden)
  - `availableReservationColumns` (Zeile 173)
  - `reservationFilterOnlyColumns` (Zeile 188)

**Änderungen:**
1. FilterPane auch für Reservations anzeigen:
   - Bedingung ändern von `activeTab === 'todos'` zu `activeTab === 'todos' || activeTab === 'reservations'`
   - FilterPane sollte die korrekten Spalten verwenden:
     - Für Todos: `[...availableColumns, ...filterOnlyColumns]`
     - Für Reservations: `[...availableReservationColumns, ...reservationFilterOnlyColumns]`
   - FilterPane sollte die korrekten Callbacks verwenden:
     - Für Todos: `applyFilterConditions`, `resetFilterConditions`
     - Für Reservations: `applyReservationFilterConditions`, `resetReservationFilterConditions`
   - FilterPane sollte die korrekten States verwenden:
     - Für Todos: `filterConditions`, `filterLogicalOperators`
     - Für Reservations: `reservationFilterConditions`, `reservationFilterLogicalOperators` (muss geprüft werden)

2. `getActiveFilterCount` für Reservations korrigieren:
   - **Problem erkannt:** `getActiveFilterCount` (Zeile 744) gibt nur `filterConditions.length` zurück (nur für Todos)
   - Funktion erweitern, um auch Reservations-Filter zu berücksichtigen:
     ```tsx
     const getActiveFilterCount = () => {
         if (activeTab === 'todos') {
             return filterConditions.length;
         } else {
             return reservationFilterConditions.length;
         }
     };
     ```

**Zeile:** 1503-1516

**Zusätzlich prüfen:**
- `reservationFilterLogicalOperators` Definition (muss gesucht werden)
- `getActiveFilterCount` Funktion (muss gesucht werden)

### Fix 3: Anzeige-Modal für Card-Infos korrigieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Problem erkannt:**
- `cardToTableMapping` ist nur für Tasks definiert (Zeile 112-120)
- Für Reservations gibt es kein entsprechendes Mapping
- Bei Reservations im Cards-Mode funktioniert die Toggle-Funktion nicht, weil `cardToTableMapping[columnId]` undefined ist
- `getCardMetadataFromColumnOrder` und `getHiddenCardMetadata` verwenden `tableToCardMapping`, das auch nur für Tasks definiert ist

**Änderungen:**
1. **Reservations-Mapping erstellen:**
   - `reservationCardToTableMapping` erstellen (analog zu `cardToTableMapping`)
   - `reservationTableToCardMapping` erstellen (analog zu `tableToCardMapping`)
   - Diese Mappings sollten 1:1 sein (jede Card-Metadaten-ID entspricht einer Tabellen-Spalten-ID)

2. **Mapping-Funktionen für Reservations erstellen:**
   - `getReservationCardMetadataFromColumnOrder` (analog zu `getCardMetadataFromColumnOrder`)
   - `getReservationHiddenCardMetadata` (analog zu `getHiddenCardMetadata`)

3. **TableColumnConfig für Reservations korrigieren:**
   - `onToggleColumnVisibility` sollte für Reservations das korrekte Mapping verwenden
   - `onMoveColumn` sollte für Reservations das korrekte Mapping verwenden
   - `visibleColumns` sollte korrekt berechnet werden (bereits vorhanden: `Array.from(visibleCardMetadata)`)

4. **Settings für Reservations prüfen:**
   - Sicherstellen, dass `useTableSettings` für Reservations mit korrektem `tableId` verwendet wird
   - Prüfen, ob `RESERVATIONS_TABLE_ID` korrekt definiert ist

**Zeile:** 
- Mapping-Definitionen: Nach Zeile 120 (nach `cardToTableMapping`)
- Mapping-Funktionen: Nach Zeile 146 (nach `getCardMetadataFromColumnOrder`)
- TableColumnConfig: 2512-2600

**Zusätzlich prüfen:**
- `RESERVATIONS_TABLE_ID` Definition
- `useTableSettings` für Reservations
- `settings` State für Reservations (separat von Tasks?)

### Fix 4: Sync-Button funktionsfähig machen & bei Mobile anzeigen
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
1. Sync-Button bei Mobile sichtbar machen:
   - Responsive Container-Klassen hinzufügen
   - Sicherstellen, dass der Button nicht durch Overflow versteckt wird
   - Möglicherweise `flex-wrap` hinzufügen oder Button-Größe anpassen

2. Sync-Funktion prüfen:
   - Prüfen, ob `handleSyncReservations` korrekt implementiert ist
   - Prüfen, ob API-Endpoint korrekt ist
   - Fehlerbehandlung verbessern

**Zeile:** 2426-2471

**Zusätzlich prüfen:**
- `API_ENDPOINTS.RESERVATIONS.SYNC` Definition
- `loadReservations` Funktion

### Fix 5: Tab-Beschriftungen Schriftgrößen angleichen
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
1. "Reservaciones" Tab responsive Klassen hinzufügen:
   - `text-sm` durch `text-xs sm:text-sm` ersetzen
   - `flex-shrink-0` hinzufügen (wie bei "Tareas" Tab)

**Zeile:** 1490

### Fix 6: Check-in-Link korrekt generieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Änderungen:**
1. Check-in-Link-Generierung korrigieren:
   - Funktion `generateLobbyPmsCheckInLink` importieren oder lokal implementieren
   - Statt `${window.location.origin}/check-in/${reservation.id}` verwenden:
     ```tsx
     const checkInLink = reservation.guestEmail 
       ? `https://app.lobbypms.com/checkinonline/confirmar?codigo=${reservation.id}&email=${encodeURIComponent(reservation.guestEmail)}&lg=GB`
       : null;
     ```
   - Oder Utility-Funktion aus Backend-Logik übernehmen

**Zeile:** 1990, 3125

**Hinweis:** Die Funktion `generateLobbyPmsCheckInLink` existiert im Backend (`backend/src/utils/checkInLinkUtils.ts`), sollte aber auch im Frontend verfügbar sein oder die Logik sollte dupliziert werden.

### Fix 7: Telefonnummer-Layout bei Mobile korrigieren
**Datei:** `frontend/src/components/shared/DataCard.tsx`

**Änderungen:**
1. Mobile-Layout für `section: 'left'` Metadaten korrigieren:
   - Bei Mobile (`grid-cols-1`) sollten Email und Telefon vertikal untereinander bleiben
   - `items-start` statt `items-center` verwenden
   - Sicherstellen, dass die Items linksbündig bleiben (nicht zentriert)

**Zeile:** 656-672

**Zusätzlich prüfen:**
- Grid-Layout bei Mobile: `grid-cols-1` sollte alle Spalten untereinander anzeigen
- `items-start` sollte Items oben ausrichten
- `justify-items-start` könnte notwendig sein

### Fix 8: Mobile-Ansicht allgemein korrigieren
**Datei:** `frontend/src/pages/Worktracker.tsx`

**Zu prüfende Bereiche:**

1. **Header-Layout:**
   - Buttons sollten bei Mobile sichtbar sein
   - Suchfeld sollte responsive sein
   - Filter-Button sollte funktionieren
   - Sync-Button sollte sichtbar sein

2. **Tab-Navigation:**
   - Schriftgrößen sollten konsistent sein
   - Tabs sollten bei Mobile scrollbar sein (bereits vorhanden: `overflow-x-auto`)

3. **Card-Layout:**
   - Metadaten sollten korrekt angezeigt werden
   - Telefonnummer sollte unter Email bleiben
   - Check-in-Link sollte korrekt sein

4. **Spacing und Padding:**
   - Konsistente Abstände bei Mobile
   - Padding sollte angepasst sein (`px-3 sm:px-4 md:px-6`)

5. **Button-Größen:**
   - Buttons sollten bei Mobile touch-freundlich sein
   - Icons sollten angemessen groß sein

## Reihenfolge der Implementierung

1. **Fix 5** (Tab-Beschriftungen) - Einfachste Änderung
2. **Fix 1** (Suche bei Mobile) - Wichtig für Funktionalität
3. **Fix 2** (Filter-Button) - Wichtig für Funktionalität
4. **Fix 4** (Sync-Button) - Wichtig für Funktionalität
5. **Fix 6** (Check-in-Link) - Wichtig für Korrektheit
6. **Fix 7** (Telefonnummer-Layout) - UI-Korrektur
7. **Fix 3** (Anzeige-Modal) - Komplex, benötigt sorgfältige Prüfung
8. **Fix 8** (Mobile-Ansicht allgemein) - Umfassende Prüfung und Korrekturen

## Zusätzliche Prüfungen

1. **Filter-System für Reservations:**
   - Prüfen, ob `reservationFilterConditions` existiert
   - Prüfen, ob `applyReservationFilterConditions` existiert
   - Prüfen, ob `resetReservationFilterConditions` existiert
   - Prüfen, ob `availableReservationColumns` für FilterPane korrekt sind

2. **Card-Metadaten-Mapping:**
   - Prüfen, ob `cardToTableMapping` korrekt definiert ist
   - Prüfen, ob `getCardMetadataFromColumnOrder` korrekt funktioniert
   - Prüfen, ob `getHiddenCardMetadata` korrekt funktioniert

3. **Responsive Design:**
   - Alle Breakpoints prüfen: `sm:`, `md:`, `lg:`, `xl:`
   - Touch-Ziele bei Mobile prüfen (mindestens 44x44px)
   - Overflow-Verhalten prüfen

4. **API-Endpoints:**
   - `API_ENDPOINTS.RESERVATIONS.SYNC` prüfen
   - Fehlerbehandlung prüfen

## Test-Szenarien

1. **Mobile-Ansicht (<640px):**
   - Suche funktioniert
   - Filter-Button öffnet FilterPane
   - Sync-Button ist sichtbar und funktioniert
   - Tab-Beschriftungen haben gleiche Schriftgröße
   - Telefonnummer bleibt unter Email
   - Check-in-Link zeigt LobbyPMS-Domain

2. **Desktop-Ansicht (>1024px):**
   - Alle Funktionen funktionieren wie bisher
   - Check-in-Link zeigt LobbyPMS-Domain

3. **TableColumnConfig-Modal:**
   - Zeigt korrekte Sichtbarkeit der Card-Metadaten
   - Toggle-Funktion funktioniert
   - Änderungen werden korrekt gespeichert

4. **Filter-System:**
   - Filter funktionieren für Reservations
   - Filter werden korrekt angewendet
   - Filter werden korrekt zurückgesetzt

## Zusammenfassung der Probleme und Lösungen

| Problem | Ursache | Lösung | Priorität |
|---------|---------|--------|-----------|
| Suche nur bei Desktop | Feste Breite `w-[200px]` | Responsive: `w-full sm:w-[200px]` | Hoch |
| Filter-Button macht nichts | FilterPane nur für Todos | FilterPane auch für Reservations anzeigen | Hoch |
| Anzeige-Modal zeigt falsche Sichtbarkeit | Kein Mapping für Reservations | Reservations-Mappings erstellen | Hoch |
| Sync-Button fehlt bei Mobile | Keine responsive Klassen | Responsive Container-Klassen hinzufügen | Hoch |
| Tab-Beschriftungen unterschiedlich | Inkonsistente responsive Klassen | `text-xs sm:text-sm` für beide | Niedrig |
| Check-in-Link falsch | `window.location.origin` statt LobbyPMS | LobbyPMS-Link generieren | Hoch |
| Telefonnummer in Mitte | Grid-Layout bei Mobile | Layout korrigieren | Mittel |
| Mobile-Ansicht allgemein | Verschiedene Probleme | Umfassende Prüfung und Korrekturen | Mittel |

## Wichtige Erkenntnisse

1. **Filter-System:** Alle notwendigen States und Funktionen existieren bereits für Reservations, müssen nur verwendet werden.

2. **Card-Metadaten-Mapping:** Für Reservations fehlt das Mapping komplett, muss neu erstellt werden (analog zu Tasks).

3. **Check-in-Link:** Backend generiert korrekt, Frontend zeigt falsch. Frontend muss Backend-Logik übernehmen oder API-Endpoint verwenden.

4. **Responsive Design:** Viele Probleme entstehen durch fehlende oder inkonsistente responsive Klassen.

5. **Tab-Abhängigkeit:** Viele Funktionen müssen `activeTab` berücksichtigen, um zwischen Todos und Reservations zu unterscheiden.

