# Plan: Filter-Standardisierung für alle Tabellen

## Übersicht

Alle Filter im System sollen die gleichen Standards wie die Requests-Tabelle verwenden. Dieser Plan beschreibt, welche Tabellen noch angepasst werden müssen.

## Aktueller Standard (Referenz: Requests.tsx)

✅ **Bereits implementiert:**
- Verwendet `applyFilters` mit `columnEvaluators`
- Verwendet `evaluateDateCondition` für Datumsfelder (unterstützt `__TODAY__`)
- Verwendet `evaluateUserRoleCondition` für Benutzer/Rollen-Felder
- Dropdowns für `type` und `branch`
- Spalten sortiert: title, type, requestedBy, responsible, dueDate, status, branch

## Zu standardisierende Tabellen

### 1. ConsultationList.tsx ⚠️ **PRIORITÄT HOCH**

**Aktueller Status:**
- ❌ Verwendet noch manuelle Filterlogik (nicht `applyFilters`)
- ❌ Hat `__TODAY__` Logik, aber nicht über `evaluateDateCondition`
- ❌ Branch-Filter verwendet Textvergleich (sollte Dropdown sein)
- ✅ Hat `startTime` als Datumsfeld (sollte `__TODAY__` über `evaluateDateCondition` unterstützen)

**Filterbare Spalten:**
- `client` - Textfeld (bleibt)
- `branch` - **MUSS Dropdown werden**
- `notes` - Textfeld (bleibt)
- `startTime` - Datumsfeld - **MUSS `evaluateDateCondition` verwenden**
- `duration` - Dauer-Feld (bleibt, spezielle Logik)
- `invoiceStatus` - Status-Feld (bleibt, spezielle Logik)

**Anpassungen erforderlich:**
1. Manuelle Filterlogik (Zeilen 650-768) durch `applyFilters` mit `columnEvaluators` ersetzen
2. `startTime` Filterlogik (Zeilen 667-699) durch `evaluateDateCondition` ersetzen
3. `branch` Filterlogik (Zeilen 661-663) durch Dropdown + `evaluateUserRoleCondition`-ähnliche Logik ersetzen
4. `__TODAY__` und `__WEEK_FROM_TODAY__` Logik entfernen (wird von `evaluateDateCondition` übernommen)

**Datei:** `frontend/src/components/ConsultationList.tsx`

---

### 2. ActiveUsersList.tsx ⚠️ **PRIORITÄT MITTEL**

**Aktueller Status:**
- ❌ Verwendet noch manuelle Filterlogik (nicht `applyFilters`)
- ❌ Branch-Filter verwendet Textvergleich (sollte Dropdown sein)
- ❌ Keine Datumsfelder, aber `duration`-Filter vorhanden

**Filterbare Spalten:**
- `name` - Textfeld (bleibt)
- `branch` - **MUSS Dropdown werden**
- `hasActiveWorktime` - Boolean-Feld (bleibt, spezielle Logik)
- `duration` - Dauer-Feld (bleibt, spezielle Logik)

**Anpassungen erforderlich:**
1. Manuelle Filterlogik (Zeilen 460-521) durch `applyFilters` mit `columnEvaluators` ersetzen
2. `branch` Filterlogik (Zeilen 479-487) durch Dropdown + Evaluator ersetzen
3. `duration` Filterlogik beibehalten (spezielle Logik für Stunden)

**Datei:** `frontend/src/components/teamWorktime/ActiveUsersList.tsx`

---

### 3. InvoiceManagementTab.tsx ✅ **BEREITS STANDARD**

**Aktueller Status:**
- ✅ Verwendet bereits `applyFilters` mit `columnEvaluators`
- ✅ Keine Datumsfelder in den Filtern (nur client, status, total)
- ✅ Keine type/branch Filter

**Filterbare Spalten:**
- `client` - Textfeld
- `status` - Status-Dropdown (bereits korrekt)
- `total` - Numerisches Feld

**Anpassungen erforderlich:**
- ✅ Keine Anpassungen erforderlich (bereits Standard-konform)

**Datei:** `frontend/src/components/InvoiceManagementTab.tsx`

---

### 4. Worktracker.tsx ✅ **BEREITS STANDARD**

**Aktueller Status:**
- ✅ Verwendet bereits `applyFilters` mit `columnEvaluators`
- ✅ Verwendet `evaluateDateCondition` für Datumsfelder
- ✅ Verwendet `evaluateUserRoleCondition` für Benutzer/Rollen-Felder

**Anpassungen erforderlich:**
- ✅ Keine Anpassungen erforderlich (bereits Standard-konform)

**Datei:** `frontend/src/pages/Worktracker.tsx`

---

## Implementierungsreihenfolge

### Phase 1: ConsultationList.tsx (Priorität: HOCH)
1. Import `applyFilters`, `evaluateDateCondition` hinzufügen
2. `columnEvaluators` für alle Spalten erstellen
3. `getFieldValue` Funktion erstellen
4. Manuelle Filterlogik durch `applyFilters` ersetzen
5. `branch` Filterlogik anpassen (Dropdown wird automatisch von FilterRow bereitgestellt)
6. `startTime` Filterlogik durch `evaluateDateCondition` ersetzen
7. `__TODAY__` und `__WEEK_FROM_TODAY__` manuelle Logik entfernen

**Geschätzter Aufwand:** 2-3 Stunden

### Phase 2: ActiveUsersList.tsx (Priorität: MITTEL)
1. Import `applyFilters` hinzufügen
2. `columnEvaluators` für alle Spalten erstellen
3. `getFieldValue` Funktion erstellen
4. Manuelle Filterlogik durch `applyFilters` ersetzen
5. `branch` Filterlogik anpassen (Dropdown wird automatisch von FilterRow bereitgestellt)
6. `duration` Filterlogik beibehalten (spezielle Logik)

**Geschätzter Aufwand:** 1-2 Stunden

## Technische Details

### Branch-Dropdown in FilterRow.tsx

Das Branch-Dropdown ist bereits in `FilterRow.tsx` implementiert (Zeilen 341-363). Es:
- Lädt Branches von API (`/branches`)
- Zeigt Branch-Namen als Optionen
- Speichert Branch-Namen als Wert

**Wichtig:** Die Filterlogik muss dann mit Branch-Namen (nicht IDs) arbeiten.

### evaluateDateCondition für __TODAY__

Die Funktion `evaluateDateCondition` in `filterLogic.ts` unterstützt bereits:
- `__TODAY__` als dynamischen Wert
- Normalisierung auf Mitternacht
- Operatoren: `equals`, `before`, `after`

**Wichtig:** `__WEEK_FROM_TODAY__` wird NICHT von `evaluateDateCondition` unterstützt. Falls benötigt, muss eine separate Funktion erstellt werden.

## Checkliste pro Tabelle

Für jede Tabelle prüfen:

- [ ] Verwendet `applyFilters` mit `columnEvaluators`
- [ ] Datumsfelder verwenden `evaluateDateCondition`
- [ ] Benutzer/Rollen-Felder verwenden `evaluateUserRoleCondition`
- [ ] Enum-Felder (type, status) haben Dropdowns
- [ ] Branch-Felder haben Dropdowns
- [ ] Spalten sind in logischer Reihenfolge sortiert
- [ ] Labels ohne unnötige Doppelpunkte
- [ ] FilterLogicalOperator verwendet i18n-Übersetzungen
- [ ] FilterRow verwendet feste Spaltenbreiten

## Referenz-Dokumentation

- **Standards:** `docs/modules/MODUL_FILTERSYSTEM_STANDARDS.md`
- **Referenz-Implementierung:** `frontend/src/components/Requests.tsx`
- **Filter-Logik:** `frontend/src/utils/filterLogic.ts`
- **Filter-Komponenten:** `frontend/src/components/FilterRow.tsx`, `FilterPane.tsx`, `FilterLogicalOperator.tsx`

