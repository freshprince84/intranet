# Filter-Spaltennamen-Mapping: Vollständiger Analyse- und Lösungsplan

**Datum:** 2025-01-31  
**Status:** 📋 ANALYSE & PLANUNG - Keine Änderungen, nur Analyse  
**Priorität:** 🔴🔴🔴 KRITISCH  
**Lösung:** Lösung 3 - Frontend sendet technische Spalten-IDs statt übersetzter Labels

---

## 🎯 PROBLEM-ZUSAMMENFASSUNG

### DAS EIGENTLICHE PROBLEM (Beantwortung der Eingangsfrage)

**Symptom aus dem Bild:**
- Filter zeigt: "De" = "Alexis Hurtado", "Estado" ≠ "Denegado", "Estado" ≠ "Aprobado"
- Angezeigt wird: Request von "Patrick Ammann" mit Status "Aprobación"
- **Der Filter funktioniert NICHT - es werden falsche Daten angezeigt**

**ROOT CAUSE - Die tatsächliche Ursache:**

1. **FilterRow.tsx ist KORREKT implementiert:**
   - Zeile 541-554: Verwendet `column.id` als `value` im select
   - Zeile 551: `<option key={column.id} value={column.id}>` - ID wird korrekt verwendet
   - **ABER:** Das Label wird nur zur Anzeige verwendet: `{column.label}`

2. **Das Problem liegt woanders:**
   - **MÖGLICHKEIT 1:** Gespeicherte Filter in der Datenbank enthalten übersetzte Labels statt IDs
     - Wenn Filter vor einer Code-Korrektur erstellt wurden
     - Wenn es einen Bug beim Speichern gab
   - **MÖGLICHKEIT 2:** Filter werden beim Laden nicht normalisiert
     - SavedFilterTags.tsx lädt Filter direkt aus DB (Zeile 344)
     - Keine Validierung/Normalisierung der Spaltennamen
   - **MÖGLICHKEIT 3:** Backend ignoriert unbekannte Spaltennamen
     - `filterToPrisma.ts` Zeile 317-319: `default: return {}`
     - Unbekannte Spaltennamen werden stillschweigend ignoriert

3. **Konkrete Fehlerkette:**
   ```
   Filter in DB: { column: "De", operator: "equals", value: "Alexis Hurtado" }
   ↓
   SavedFilterTags lädt Filter → sendet direkt weiter
   ↓
   Backend filterToPrisma.ts: switch(column) → case "De" existiert nicht
   ↓
   default: return {} → Filter wird IGNORIERT
   ↓
   Ergebnis: Alle Requests werden angezeigt (keine Filterung)
   ```

**Lösung 3:** Sicherstellen, dass Frontend IMMER technische Spalten-IDs sendet, auch bei gespeicherten Filtern.

---

## 📊 VOLLSTÄNDIGE KOMPONENTEN-ANALYSE

### ✅ Komponenten mit Filter-Implementierung

#### 1. **Requests.tsx**
- **Pfad:** `frontend/src/components/Requests.tsx`
- **Spaltendefinition:** Zeile 233-241
  ```typescript
  const availableColumns = useMemo(() => [
    { id: 'title', label: t('requests.columns.title') },
    { id: 'status', label: t('requests.columns.status') },
    { id: 'type', label: t('requests.columns.type') },
    { id: 'requestedByResponsible', label: t('requests.columns.requestedByResponsible') },
    { id: 'branch', label: t('requests.columns.branch') },
    { id: 'dueDate', label: t('requests.columns.dueDate') },
    { id: 'actions', label: t('requests.columns.actions') }
  ], [t]);
  ```
- **Filter-Spalten für FilterPane:** Zeile 1088-1092 (Cards) - verwendet `requestedBy` und `responsible` separat
- **Filter-Übergabe:** Zeile 386-391 - sendet `filterConditions` direkt
- **Status:** ✅ Spalten-IDs korrekt definiert
- **Problem-Risiko:** ⚠️ MITTEL - `requestedByResponsible` ist kombinierte Spalte, Filter verwendet `requestedBy` separat

#### 2. **Worktracker.tsx (Tasks & Reservations)**
- **Pfad:** `frontend/src/pages/Worktracker.tsx`
- **Tasks-Spalten:** Zeile 274-281
  ```typescript
  const availableColumns = useMemo(() => [
    { id: 'title', label: t('tasks.columns.title') },
    { id: 'status', label: t('tasks.columns.status') },
    { id: 'responsibleAndQualityControl', label: t('tasks.columns.responsibleAndQualityControl') },
    { id: 'branch', label: t('tasks.columns.branch') },
    { id: 'dueDate', label: t('tasks.columns.dueDate') },
    { id: 'actions', label: t('tasks.columns.actions') }
  ], [t]);
  ```
- **Filter-Only-Spalten:** Zeile 284-287
  ```typescript
  const filterOnlyColumns = useMemo(() => [
    { id: 'responsible', label: t('tasks.columns.responsible') },
    { id: 'qualityControl', label: t('tasks.columns.qualityControl') }
  ], [t]);
  ```
- **Reservations-Spalten:** Zeile 2302-2308 (inline definiert)
  ```typescript
  columns={[
    { id: 'checkInDate', label: t('reservations.columns.checkInDate', 'Check-in') },
    { id: 'checkOutDate', label: t('reservations.columns.checkOutDate', 'Check-out') },
    { id: 'roomNumber', label: t('reservations.columns.roomNumber', 'Zimmer') },
    { id: 'status', label: t('reservations.columns.status', 'Status') },
    { id: 'paymentStatus', label: t('reservations.columns.paymentStatus', 'Zahlungsstatus') },
    { id: 'branch', label: t('reservations.columns.branch', 'Niederlassung') }
  ]}
  ```
- **Filter-Übergabe:** Zeile 2291-2314 (Tasks), Zeile 3618-3642 (Reservations)
- **Status:** ✅ Spalten-IDs korrekt definiert
- **Problem-Risiko:** ⚠️ MITTEL - Kombinierte Spalten (`responsibleAndQualityControl`) vs. separate Filter-Spalten

#### 3. **ConsultationList.tsx**
- **Pfad:** `frontend/src/components/ConsultationList.tsx`
- **Spaltendefinition:** Zeile 964-971
  ```typescript
  columns={[
    { id: 'client', label: t('consultations.columns.client') },
    { id: 'branch', label: t('consultations.columns.branch') },
    { id: 'notes', label: t('consultations.columns.notes') },
    { id: 'startTime', label: t('consultations.columns.date') },
    { id: 'duration', label: t('consultations.columns.durationHours') },
    { id: 'invoiceStatus', label: t('consultations.columns.invoiceStatus') }
  ]}
  ```
- **Filter-Übergabe:** Zeile 972-976
- **Status:** ✅ Spalten-IDs korrekt definiert
- **Problem-Risiko:** ✅ NIEDRIG

#### 4. **ToursTab.tsx**
- **Pfad:** `frontend/src/components/tours/ToursTab.tsx`
- **Spaltendefinition:** Zeile 119-129
  ```typescript
  const availableTourColumns = useMemo(() => [
    { id: 'title', label: t('tours.columns.title', 'Titel') },
    { id: 'type', label: t('tours.columns.type', 'Typ') },
    { id: 'price', label: t('tours.columns.price', 'Preis') },
    { id: 'location', label: t('tours.columns.location', 'Ort') },
    { id: 'duration', label: t('tours.columns.duration', 'Dauer') },
    { id: 'branch', label: t('tours.columns.branch', 'Niederlassung') },
    { id: 'createdBy', label: t('tours.columns.createdBy', 'Erstellt von') },
    { id: 'isActive', label: t('tours.columns.status', 'Status') },
    { id: 'actions', label: t('tours.columns.actions', 'Aktionen') }
  ], [t]);
  ```
- **Filter-Only-Spalten:** Zeile 131-135
- **Filter-Übergabe:** Zeile 168-173
- **Status:** ✅ Spalten-IDs korrekt definiert
- **Problem-Risiko:** ✅ NIEDRIG

#### 5. **InvoiceManagementTab.tsx**
- **Pfad:** `frontend/src/components/InvoiceManagementTab.tsx`
- **Spaltendefinition:** Zeile 207-216
  ```typescript
  const availableColumns = useMemo(() => [
    { id: 'expand', label: '', shortLabel: '' },
    { id: 'invoiceNumber', label: t('invoices.columns.invoiceNumber') },
    { id: 'client', label: t('invoices.columns.client') },
    { id: 'issueDate', label: t('invoices.columns.issueDate') },
    { id: 'dueDate', label: t('invoices.columns.dueDate') },
    { id: 'total', label: t('invoices.columns.total') },
    { id: 'status', label: t('invoices.columns.status') },
    { id: 'actions', label: t('common.actions') }
  ], [t]);
  ```
- **Filter-Spalten:** Zeile 1278-1282 (reduzierte Liste)
  ```typescript
  columns={[
    { id: 'client', label: t('invoices.columns.client') },
    { id: 'status', label: t('invoices.columns.status') },
    { id: 'total', label: `${t('invoices.columns.total')} (CHF)` }
  ]}
  ```
- **Filter-Übergabe:** Zeile 1283-1287
- **Status:** ✅ Spalten-IDs korrekt definiert
- **Problem-Risiko:** ✅ NIEDRIG

#### 6. **PasswordManagerTab.tsx**
- **Pfad:** `frontend/src/components/PasswordManagerTab.tsx`
- **Spaltendefinition:** Zeile 52-60
  ```typescript
  const availableColumns = useMemo(() => [
    { id: 'title', label: t('passwordManager.entryTitle') },
    { id: 'url', label: t('passwordManager.entryUrl') },
    { id: 'username', label: t('passwordManager.entryUsername') },
    { id: 'notes', label: t('passwordManager.entryNotes') },
    { id: 'createdAt', label: t('passwordManager.sortByCreated') },
    { id: 'updatedAt', label: t('passwordManager.sortByUpdated') },
    { id: 'createdBy', label: t('common.createdBy') }
  ], [t]);
  ```
- **Filter-Übergabe:** Zeile 392-398
- **Status:** ✅ Spalten-IDs korrekt definiert
- **Problem-Risiko:** ✅ NIEDRIG

#### 7. **RequestAnalyticsTab.tsx**
- **Pfad:** `frontend/src/components/teamWorktime/RequestAnalyticsTab.tsx`
- **Spaltendefinition:** Zeile 100-110 (vermutlich, nicht vollständig gelesen)
- **Status:** ⚠️ MUSS GEPRÜFT WERDEN
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 8. **TodoAnalyticsTab.tsx**
- **Pfad:** `frontend/src/components/teamWorktime/TodoAnalyticsTab.tsx`
- **Spaltendefinition:** Zeile 100+ (vermutlich, nicht vollständig gelesen)
- **Status:** ⚠️ MUSS GEPRÜFT WERDEN
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 9. **BranchManagementTab.tsx**
- **Pfad:** `frontend/src/components/BranchManagementTab.tsx`
- **Spaltendefinition:** ⚠️ NICHT GEFUNDEN in gelesenem Abschnitt
- **Status:** ⚠️ MUSS GEPRÜFT WERDEN
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 10. **RoleManagementTab.tsx**
- **Pfad:** `frontend/src/components/RoleManagementTab.tsx`
- **Spaltendefinition:** ⚠️ NICHT GEFUNDEN in gelesenem Abschnitt
- **Status:** ⚠️ MUSS GEPRÜFT WERDEN
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 11. **ActiveUsersList.tsx**
- **Pfad:** `frontend/src/components/teamWorktime/ActiveUsersList.tsx`
- **Status:** ⚠️ NICHT ANALYSIERT
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 12. **MyJoinRequestsList.tsx**
- **Pfad:** `frontend/src/components/organization/MyJoinRequestsList.tsx`
- **Status:** ⚠️ NICHT ANALYSIERT
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 13. **JoinRequestsList.tsx**
- **Pfad:** `frontend/src/components/organization/JoinRequestsList.tsx`
- **Status:** ⚠️ NICHT ANALYSIERT
- **Problem-Risiko:** ⚠️ UNBEKANNT

#### 14. **ShiftPlannerTab.tsx**
- **Pfad:** `frontend/src/components/teamWorktime/ShiftPlannerTab.tsx`
- **Status:** ⚠️ NICHT ANALYSIERT
- **Problem-Risiko:** ⚠️ UNBEKANNT

---

## 🔍 KERN-KOMPONENTEN ANALYSE

### FilterRow.tsx
- **Pfad:** `frontend/src/components/FilterRow.tsx`
- **Kritische Stelle:** Zeile 541-554
  ```typescript
  <select
    value={condition.column}
    onChange={(e) => onChange({ 
      ...condition, 
      column: e.target.value,  // ✅ Verwendet column.id (aus option value)
      operator: operators[0]?.value || 'equals',
      value: null
    })}
  >
    <option value="">{t('filter.row.selectColumn')}</option>
    {columns.map((column) => (
      <option key={column.id} value={column.id}>  {/* ✅ ID wird als value verwendet */}
        {column.label}  {/* Label nur für Anzeige */}
      </option>
    ))}
  </select>
  ```
- **Status:** ✅ KORREKT - Verwendet `column.id` als value, nicht `column.label`
- **Fazit:** FilterRow sendet bereits technische IDs

### FilterPane.tsx
- **Pfad:** `frontend/src/components/FilterPane.tsx`
- **Kritische Stelle:** Zeile 158-162
  ```typescript
  const handleApplyFilters = () => {
    const validConditions = conditions.filter(c => c.column !== '');
    onApply(validConditions, logicalOperators);  // ✅ Sendet conditions direkt weiter
  };
  ```
- **Status:** ✅ KORREKT - Sendet conditions unverändert weiter

### SavedFilterTags.tsx
- **Pfad:** `frontend/src/components/SavedFilterTags.tsx`
- **Status:** ⚠️ MUSS GEPRÜFT WERDEN - Lädt gespeicherte Filter aus DB

### Backend: filterToPrisma.ts
- **Pfad:** `backend/src/utils/filterToPrisma.ts`
- **Kritische Stelle:** Zeile 125-320 (switch-case für column)
  ```typescript
  switch (column) {
    case 'status':  // ✅ Erwartet technische ID
    case 'requestedBy':  // ✅ Erwartet technische ID
    case 'responsible':  // ✅ Erwartet technische ID
    // ...
    default:
      return {};  // ⚠️ Unbekannte Spalten werden ignoriert
  }
  ```
- **Status:** ✅ KORREKT - Erwartet technische IDs
- **Problem:** Wenn `column` ein übersetztes Label ist (z.B. "De", "Estado"), wird es im `default`-Case ignoriert

---

## 🎯 PROBLEM-IDENTIFIZIERUNG

### Mögliche Problemstellen:

1. **Gespeicherte Filter in Datenbank:**
   - Alte Filter könnten übersetzte Labels enthalten
   - Beim Laden werden diese direkt verwendet
   - Backend erkennt sie nicht

2. **Filter-Erstellung mit altem System:**
   - Falls früher Labels statt IDs gespeichert wurden
   - Bestehende Filter in DB müssen migriert werden

3. **Direkte Filter-Erstellung:**
   - FilterRow verwendet korrekt IDs
   - ABER: Wenn Filter manuell erstellt werden (z.B. in Code), könnten Labels verwendet werden

---

## 📋 LÖSUNGSPLAN (Lösung 3)

### Phase 1: Vollständige Analyse aller Komponenten

#### 1.1 Alle Filter-Komponenten identifizieren
- [ ] RequestAnalyticsTab.tsx - Spaltendefinitionen prüfen
- [ ] TodoAnalyticsTab.tsx - Spaltendefinitionen prüfen
- [ ] BranchManagementTab.tsx - Filter-Implementierung prüfen
- [ ] RoleManagementTab.tsx - Filter-Implementierung prüfen
- [ ] ActiveUsersList.tsx - Filter-Implementierung prüfen
- [ ] MyJoinRequestsList.tsx - Filter-Implementierung prüfen
- [ ] JoinRequestsList.tsx - Filter-Implementierung prüfen
- [ ] ShiftPlannerTab.tsx - Filter-Implementierung prüfen

#### 1.2 SavedFilterTags.tsx analysieren
- [ ] Wie werden gespeicherte Filter geladen?
- [ ] Werden Filter-Bedingungen validiert/normalisiert?
- [ ] Gibt es bereits ein Mapping?

#### 1.3 Datenbank-Analyse
- [ ] Prüfen, welche Spaltennamen in gespeicherten Filtern verwendet werden
- [ ] SQL-Query: `SELECT conditions FROM SavedFilter WHERE conditions LIKE '%"column":"De"%' OR conditions LIKE '%"column":"Estado"%'`
- [ ] Alle abweichenden Spaltennamen identifizieren

#### 1.4 Backend-Validierung prüfen
- [ ] Gibt es bereits Validierung in `filterToPrisma.ts`?
- [ ] Werden unbekannte Spalten geloggt?
- [ ] Gibt es Fehlerbehandlung?

### Phase 2: Mapping-Implementierung

#### 2.1 Mapping-Funktion erstellen
- **Datei:** `frontend/src/utils/filterColumnMapping.ts` (NEU)
- **Funktion:** `normalizeFilterConditions(conditions: FilterCondition[], columns: TableColumn[]): FilterCondition[]`
- **Zweck:** Konvertiert Labels zu IDs, falls nötig

#### 2.2 Mapping-Logik
```typescript
// Beispiel-Mapping für Requests
const columnLabelToIdMap: Record<string, Record<string, string>> = {
  'requests-table': {
    'De:': 'requestedBy',
    'Para:': 'responsible',
    'Estado': 'status',
    'Tipo': 'type',
    'Sucursal': 'branch',
    'Fecha de vencimiento': 'dueDate'
  },
  // ... weitere Tabellen
};
```

#### 2.3 Integration in FilterPane
- Filter-Bedingungen vor dem Senden normalisieren
- Vor dem Speichern normalisieren

#### 2.4 Integration in SavedFilterTags
- Beim Laden von Filtern normalisieren
- Alte Filter automatisch korrigieren

### Phase 3: Validierung & Migration

#### 3.1 Frontend-Validierung
- Warnung, wenn unbekannte Spaltennamen gefunden werden
- Automatische Korrektur mit Mapping

#### 3.2 Backend-Validierung
- Logging von unbekannten Spaltennamen
- Fehler-Rückmeldung an Frontend

#### 3.3 Datenbank-Migration (optional)
- Script zum Korrigieren alter Filter
- Einmalige Ausführung

### Phase 4: Testing

#### 4.1 Unit-Tests
- Mapping-Funktion testen
- Alle Tabellen-Typen testen

#### 4.2 Integration-Tests
- Filter-Erstellung testen
- Filter-Laden testen
- Filter-Anwendung testen

#### 4.3 Manuelle Tests
- Alle Komponenten mit Filtern testen
- Verschiedene Sprachen testen (de, en, es)
- Gespeicherte Filter testen

---

## 🔧 IMPLEMENTIERUNGS-DETAILS

### 1. Mapping-Datei erstellen

**Datei:** `frontend/src/utils/filterColumnMapping.ts`

```typescript
import { FilterCondition } from '../components/FilterRow.tsx';
import { TableColumn } from '../components/FilterPane.tsx';

/**
 * Mapping von übersetzten Spaltennamen zu technischen IDs
 * Wird verwendet, um alte Filter zu normalisieren
 */
const COLUMN_LABEL_TO_ID_MAP: Record<string, Record<string, string>> = {
  'requests-table': {
    // Spanisch
    'De:': 'requestedBy',
    'Para:': 'responsible',
    'Estado': 'status',
    'Tipo': 'type',
    'Sucursal': 'branch',
    'Fecha de vencimiento': 'dueDate',
    // Deutsch
    'Von:': 'requestedBy',
    'An:': 'responsible',
    'Status': 'status',
    'Typ': 'type',
    'Niederlassung': 'branch',
    'Fälligkeitsdatum': 'dueDate',
    // Englisch
    'From:': 'requestedBy',
    'To:': 'responsible',
    'Status': 'status',
    'Type': 'type',
    'Branch': 'branch',
    'Due Date': 'dueDate'
  },
  // ... weitere Tabellen
};

/**
 * Normalisiert Filter-Bedingungen: Konvertiert Labels zu IDs
 */
export function normalizeFilterConditions(
  conditions: FilterCondition[],
  tableId: string,
  columns: TableColumn[]
): FilterCondition[] {
  const mapping = COLUMN_LABEL_TO_ID_MAP[tableId] || {};
  
  return conditions.map(condition => {
    // Prüfe, ob column ein Label ist (nicht in columns.id vorhanden)
    const isLabel = !columns.some(col => col.id === condition.column);
    
    if (isLabel) {
      // Versuche Mapping
      const mappedId = mapping[condition.column];
      if (mappedId) {
        console.warn(`[FilterMapping] Konvertiere Label "${condition.column}" zu ID "${mappedId}"`);
        return { ...condition, column: mappedId };
      } else {
        // Versuche, ID aus columns zu finden (case-insensitive)
        const foundColumn = columns.find(
          col => col.label.toLowerCase() === condition.column.toLowerCase()
        );
        if (foundColumn) {
          console.warn(`[FilterMapping] Konvertiere Label "${condition.column}" zu ID "${foundColumn.id}" (via label match)`);
          return { ...condition, column: foundColumn.id };
        } else {
          console.error(`[FilterMapping] Unbekannter Spaltenname: "${condition.column}" in Tabelle "${tableId}"`);
          return condition; // Behalte original, wird im Backend ignoriert
        }
      }
    }
    
    return condition; // Bereits ID, keine Änderung nötig
  });
}
```

### 2. Integration in FilterPane

**Datei:** `frontend/src/components/FilterPane.tsx`

```typescript
import { normalizeFilterConditions } from '../utils/filterColumnMapping.ts';

const handleApplyFilters = () => {
  const validConditions = conditions.filter(c => c.column !== '');
  
  // ✅ NEU: Normalisiere Filter-Bedingungen
  const normalizedConditions = normalizeFilterConditions(
    validConditions,
    tableId,
    columns
  );
  
  onApply(normalizedConditions, logicalOperators);
};
```

### 3. Integration in SavedFilterTags

**Datei:** `frontend/src/components/SavedFilterTags.tsx`

```typescript
import { normalizeFilterConditions } from '../utils/filterColumnMapping.ts';

// Beim Laden von Filtern
const handleSelectFilter = (filter: SavedFilter) => {
  // ✅ NEU: Normalisiere Filter-Bedingungen
  const normalizedConditions = normalizeFilterConditions(
    filter.conditions,
    tableId,
    columns  // Muss von außen übergeben werden
  );
  
  onSelectFilter(normalizedConditions, filter.operators);
};
```

---

## 📊 BETROFFENE DATEIEN

### Frontend
1. `frontend/src/utils/filterColumnMapping.ts` - **NEU**
2. `frontend/src/components/FilterPane.tsx` - **ÄNDERN**
3. `frontend/src/components/SavedFilterTags.tsx` - **ÄNDERN**
4. `frontend/src/components/FilterRow.tsx` - **PRÜFEN** (sollte bereits korrekt sein)

### Backend
1. `backend/src/utils/filterToPrisma.ts` - **PRÜFEN** (Logging verbessern)
2. `backend/src/controllers/requestController.ts` - **PRÜFEN**
3. `backend/src/controllers/taskController.ts` - **PRÜFEN**
4. `backend/src/controllers/reservationController.ts` - **PRÜFEN**

### Datenbank
1. Migration-Script (optional) - **NEU**

---

## ⚠️ RISIKEN & HINWEISE

1. **Bestehende Filter:** Alte Filter müssen möglicherweise migriert werden
2. **Performance:** Mapping sollte nur bei Bedarf ausgeführt werden (nicht bei jedem Render)
3. **Logging:** Ausführliches Logging für Debugging
4. **Rückwärtskompatibilität:** Alte Filter sollten weiterhin funktionieren

---

## ✅ CHECKLISTE

### Vor Implementierung
- [ ] Alle Komponenten analysiert
- [ ] Datenbank-Analyse durchgeführt
- [ ] Mapping-Tabelle vollständig erstellt
- [ ] Plan vom Benutzer genehmigt

### Während Implementierung
- [ ] Mapping-Datei erstellt
- [ ] FilterPane angepasst
- [ ] SavedFilterTags angepasst
- [ ] Backend-Logging verbessert
- [ ] Unit-Tests geschrieben

### Nach Implementierung
- [ ] Alle Komponenten manuell getestet
- [ ] Verschiedene Sprachen getestet
- [ ] Gespeicherte Filter getestet
- [ ] Dokumentation aktualisiert

---

## 📝 NÄCHSTE SCHRITTE

1. **Vollständige Analyse abschließen:**
   - Alle noch nicht analysierten Komponenten prüfen
   - Datenbank-Analyse durchführen
   - Mapping-Tabelle vollständig erstellen

2. **Plan finalisieren:**
   - Mapping-Tabelle für alle Tabellen erstellen
   - Implementierungsreihenfolge festlegen
   - Test-Plan erstellen

3. **Implementierung:**
   - Nach Genehmigung durch Benutzer
   - Schritt für Schritt umsetzen
   - Jeden Schritt testen

---

**Ende des Plans - Keine Änderungen vorgenommen, nur Analyse und Planung**










