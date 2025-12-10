# Filter-Standard Rollout – Gesamtplan (Stand: letzte 24h)

## Ziel
Alle Filter-/Sortier-/Spalten-Implementierungen systemweit auf den dokumentierten Standard bringen (kein Fallback, Default-Filter immer vorhanden) und in der Dokumentation verbindlich verankern – für bestehende Komponenten und Neuimplementierungen.

## Referenzen (gelesen, maßgeblich)
- FILTER_STANDARD_DEFINITION.md  
- FILTER_LADEN_STANDARD_VEREINFACHUNG_FINAL.md  
- FILTER_LADEN_ANALYSE_FAKTEN.md  
- FILTER_PERFORMANCE_ANALYSE.md  
- FILTER_ANWENDUNG_FIX_PLAN_FINAL.md  
- FILTER_ANWENDUNG_PROBLEM_ANALYSE.md  
- FILTER_ANWENDUNG_RISIKOANALYSE.md  
- STANDARDFILTER_SEED_MIGRATION_ANALYSE.md  
- STANDARDFILTER_SEED_MIGRATION_PLAN.md  
- SORTIERUNG_STANDARDISIERUNG_PLAN_2025-01-31.md  
- MODUL_FILTERSYSTEM.md  
- ORG_TAB_PERFORMANCE_FIX_PLAN/RISIKOANALYSE.md

## Verbindlicher Standard (aus den Referenzen)
1) Default-Filter sind IMMER vorhanden (Seed). Kein Fallback-Load mehr.  
2) Pattern je Komponente:
   - `useEffect(() => { const init = async () => { const filters = await loadFilters(TABLE_ID); const def = filters.find(f => f.name === DEFAULT_NAME); if (def) await handleFilterChange(...); }; init(); }, []);`
   - Leerer Dependency-Array. Handler per `useCallback` stabilisieren. Bei Bedarf Handler-Ref, nicht in Dependencies.  
   - `handleFilterChange`/`applyFilterConditions` setzen State (`activeFilterName`, `selectedFilterId`, `conditions/operators`) und laden genau einmal Daten.  
   - SavedFilterTags sind UI; Komponenten laden/anwenden selbst.
3) Sortierung/Spalten:
   - `mainSortConfig`/`onMainSortChange` und `hiddenColumns`/`toggleColumnVisibility` aus `useTableSettings`.  
   - Daten-Sortierung nutzt dasselbe `sortConfig` (Table & Cards synchron).  
4) Keine Timeouts/Workarounds/Mehrfach-Fallbacks.  

## Audit-Checkliste (für jede Tabelle/Komponente)
- Fallback vorhanden? → entfernen (Default-Filter immer vorhanden).  
- useEffect Dependencies korrekt `[]`? Handler stabil?  
- `handleFilterChange`/`applyFilterConditions` mit `useCallback`? State-Set vor Load? Einmaliger Load?  
- SavedFilterTags nur UI? `activeFilterName/selectedFilterId` werden gesetzt?  
- Sort: `mainSortConfig` + `onMainSortChange` aus `useTableSettings`? Wird `sortConfig` in der Daten-Sortierung verwendet (Table & Cards)?  
- Spalten: `hiddenColumns` + `toggleColumnVisibility`/`updateHiddenColumns` aus `useTableSettings`?  
- Card/Table-Ansicht: gleiche Sortierung/Spaltensicht?  

## Betroffene Bereiche (zu prüfen/anzupassen)
- Worktracker: ToDos, Reservations (aktuell noch Fallbacks, Sort-Klick ohne Wirkung).  
- Weitere Filter-Tabellen: ActiveUsersList, RequestAnalyticsTab, BranchManagementTab, PasswordManagerTab, JoinRequests/MyJoinRequests, RoleManagementTab, TodoAnalyticsTab, RequestAnalyticsTab, ggf. andere, die SavedFilterTags + serverseitige Filter verwenden.  
- Dokumentation: MODUL_FILTERSYSTEM.md, Sortier-Standard-Dokumente, neue Implementierungspläne → Standard klar als einzig zulässiges Muster.  

## Arbeitsschritte
1) Audit durchführen (Checkliste oben) – alle genannten Komponenten.  
2) Standard-Pattern anwenden:
   - useEffect mit leerer Dependency-Liste, kein Fallback.  
   - Handler mit useCallback; ggf. Handler-Refs statt Dependencies.  
   - State-Set (`activeFilterName/selectedFilterId/conditions/operators`) vor dem Daten-Load.  
3) Sort/Spalten-Sync herstellen:
   - TableColumnConfig: `mainSortConfig/onMainSortChange/showMainSort` + `visibleColumns/hiddenColumns/toggleColumnVisibility`.  
   - Daten-Sortierung liest `sortConfig` aus `useTableSettings`.  
4) Filteranzeige:
   - FilterPane `savedConditions/savedOperators` aus aktuellem State.  
   - SavedFilterTags Controlled Mode: `activeFilterName/selectedFilterId` werden bei jedem Filterwechsel gesetzt.  
5) Dokumentation aktualisieren:
   - In allen genannten Filter-Dokumenten den Standard „Default-Filter immer, kein Fallback“ klar und exklusiv hervorheben.  
   - Kurze Checkliste für neue Komponenten beilegen (siehe Standard).  
6) Tests (kurz):
   - Requests (bereits ok), Worktracker ToDos/Reservations: Filtertag-Klick, Filterpane Apply, Sort-Header-Klick, Spalten ein/aus (Table & Cards).  
   - Spot-Check weitere Tabellen mit Filtern.  

## Offene Punkte/Fundierte Lücken
- Worktracker: Fallback-Äste noch vorhanden; Sortierung reagiert nicht sichtbar; Filter-Tag-Markierung/Pane-Anzeige inkonsistent.  
- Weitere Tabellen: Standard-/Sort-Sync nicht verifiziert → muss auditiert werden.  
- Dokumentation: Standard muss überall als allein gültig ergänzt werden.  

## Erwartetes Ergebnis
- Einheitliches Verhalten: Filter werden exakt einmal geladen/anwenden, keine Fallbacks.  
- Sortierung/Spalten in allen Ansichten synchron über `useTableSettings`.  
- Aktive Filter werden im FilterPane angezeigt und Tags korrekt markiert.  
- Dokumentation eindeutig: Nur dieses Standard-Pattern ist zulässig, auch für Neuimplementierungen.  

