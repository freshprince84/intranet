# Filter-Funktionalität - Aktueller Stand Analyse

## Datum
2025-01-15

## Übersicht
Dieses Dokument enthält die Analyse des aktuellen Stands der Filter-Funktionalität im Intranet-Projekt. Alle Inkonsistenzen und Probleme werden hier dokumentiert, bevor Änderungen vorgenommen werden.

## FilterPane Interface Definition

### Korrekte Props:
```typescript
interface FilterPaneProps {
  columns: TableColumn[];
  onApply: (conditions: FilterCondition[], logicalOperators: ('AND' | 'OR')[]) => void;
  onReset: () => void;
  savedConditions?: FilterCondition[];
  savedOperators?: ('AND' | 'OR')[];
  tableId: string;
}
```

### NICHT erlaubte Props:
- `isOpen` ❌
- `onClose` ❌
- `availableColumns` ❌ (sollte `columns` sein)
- `initialConditions` ❌ (sollte `savedConditions` sein)
- `initialOperators` ❌ (sollte `savedOperators` sein)

---

## Seite 1: DASHBOARD

### 1.1 RoleManagementTab ✅
**Datei**: `frontend/src/components/RoleManagementTab.tsx`

**Status**: FilterPane korrekt implementiert
- Verwendet korrekte Props: `columns`, `onApply`, `onReset`, `savedConditions`, `savedOperators`, `tableId`
- Spalten definiert: `name`, `description`
- Operatoren: `equals`, `contains`, `startsWith`, `endsWith`
- Standardfilter: Nicht definiert (sollte "Alle Rollen" sein)
- ❌ **FEHLEND**: Standardfilter im Backend
- ❌ **FEHLEND**: Standardfilter standardmäßig aktiv

### 1.2 ActiveUsersList ✅
**Datei**: `frontend/src/components/teamWorktime/ActiveUsersList.tsx`

**Status**: FilterPane korrekt implementiert
- Verwendet korrekte Props: `columns`, `onApply`, `onReset`, `savedConditions`, `savedOperators`, `tableId`
- Spalten definiert: `name`, `branch`, `hasActiveWorktime`, `duration`
- Operatoren: `equals`, `contains`, `startsWith`, `endsWith`, `greater_than`, `less_than`
- Standardfilter: Nicht definiert (sollte "Aktive Benutzer" sein)
- ❌ **FEHLEND**: Standardfilter im Backend
- ❌ **FEHLEND**: Standardfilter standardmäßig aktiv

---

## Seite 2: WORKTRACKER

### 2.1 WorktimeTracker Haupttabelle ❌
**Datei**: `frontend/src/components/WorktimeTracker.tsx`

**Status**: FilterPane NICHT implementiert
- ❌ **FEHLEND**: FilterPane-Integration
- ❌ **FEHLEND**: Spalten-Definition
- ❌ **FEHLEND**: Standardfilter
- ✅ SavedFilterTags vorhanden

---

## Seite 3: BERATUNGEN

### 3.1 ConsultationList ✅
**Datei**: `frontend/src/components/ConsultationList.tsx`

**Status**: FilterPane korrekt implementiert
- Verwendet korrekte Props: `columns`, `onApply`, `onReset`, `savedConditions`, `savedOperators`, `tableId`
- Spalten definiert: `client`, `branch`, `notes`, `startTime`, `duration`, `invoiceStatus`
- Operatoren: `equals`, `contains`, `startsWith`, `endsWith`, `after`, `before`, `between`
- Standardfilter: ✅ "Heute", "Woche", "Archiv" definiert
- ✅ Standardfilter wird beim Laden aktiviert
- ✅ Filter-Tags korrekt sortiert
- ✅ Recent Client Filter funktionieren

---

## Seite 4: REQUESTS

### 4.1 Requests-Tabelle ✅
**Datei**: `frontend/src/components/Requests.tsx`

**Status**: FilterPane korrekt implementiert
- Verwendet korrekte Props: `columns`, `onApply`, `onReset`, `savedConditions`, `savedOperators`, `tableId`
- Spalten definiert: `title`, `status`, `requestedBy`, `responsible`, `branch`, `dueDate`
- Operatoren: `equals`, `contains`, `startsWith`, `endsWith`, `after`, `before`
- Standardfilter: ✅ "Aktuell", "Archiv" definiert
- ✅ Standardfilter wird beim Laden erstellt (wenn nicht vorhanden)
- ✅ Filter-Tags korrekt sortiert

---

## Seite 5: LOHNABRECHNUNG

### 5.1 InvoiceManagementTab ✅
**Datei**: `frontend/src/components/InvoiceManagementTab.tsx`

**Status**: ✅ **KORRIGIERT** - FilterPane Props wurden korrigiert
- **VORHER**: Falsche Props `isOpen`, `onClose`, `availableColumns`, `initialConditions`, `initialOperators`
- **NACHHER**: Korrekte Props `columns`, `onApply`, `onReset`, `savedConditions`, `savedOperators`, `tableId`
- Spalten definiert: `client`, `status`, `total`
- Operatoren: `equals`, `contains`, `startsWith`, `endsWith`
- Standardfilter: Nicht definiert (sollte "Offene Rechnungen" sein)
- ❌ **FEHLEND**: Standardfilter im Backend
- ❌ **FEHLEND**: Standardfilter standardmäßig aktiv

---

## Seite 6: BENUTZERVERWALTUNG

### 6.1 UserManagementTab ❌
**Datei**: `frontend/src/components/UserManagementTab.tsx`

**Status**: FilterPane NICHT implementiert
- ❌ **FEHLEND**: FilterPane-Integration
- ❌ **FEHLEND**: Spalten-Definition
- ❌ **FEHLEND**: Standardfilter

### 6.2 UserWorktimeTable ❌
**Datei**: `frontend/src/components/teamWorktime/UserWorktimeTable.tsx`

**Status**: FilterPane NICHT implementiert
- ❌ **FEHLEND**: FilterPane-Integration
- ❌ **FEHLEND**: Spalten-Definition
- ❌ **FEHLEND**: Standardfilter

---

## Zusammenfassung der Probleme

### ✅ Gut implementiert:
1. **ConsultationList** - Vollständig implementiert mit Standardfiltern
2. **Requests** - Vollständig implementiert mit Standardfiltern
3. **RoleManagementTab** - FilterPane korrekt, aber keine Standardfilter
4. **ActiveUsersList** - FilterPane korrekt, aber keine Standardfilter
5. **InvoiceManagementTab** - ✅ Props korrigiert, aber keine Standardfilter

### ❌ Fehlende Implementierung:
1. **WorktimeTracker Haupttabelle** - Kein FilterPane
2. **UserManagementTab** - Kein FilterPane
3. **UserWorktimeTable** - Kein FilterPane

### ❌ Fehlende Standardfilter (Backend):
1. RoleManagementTab - "Alle Rollen"
2. ActiveUsersList - "Aktive Benutzer"
3. InvoiceManagementTab - "Offene Rechnungen"

---

## Notwendige Änderungen

### 1. InvoiceManagementTab Props-Korrektur ✅
**Status**: Abgeschlossen
- Falsche Props `availableColumns`, `initialConditions`, `initialOperators`, `isOpen`, `onClose` entfernt
- Korrekte Props `columns`, `savedConditions`, `savedOperators` verwendet

### 2. FilterPane-Integration fehlender Komponenten
- [ ] WorktimeTracker Haupttabelle
- [ ] UserManagementTab
- [ ] UserWorktimeTable

### 3. Standardfilter-Backend-Seeding
- [ ] RoleManagementTab Standardfilter
- [ ] ActiveUsersList Standardfilter
- [ ] InvoiceManagementTab Standardfilter

### 4. FilterPane-Anzeige (Sichtbarkeit)
- FilterPane wird in allen Komponenten manuell mit `isFilterModalOpen` / `isFilterPanelOpen` gesteuert
- Nicht als Modal/Sidepane, sondern inline angezeigt

---

## Nächste Schritte

1. ✅ InvoiceManagementTab Props korrigiert
2. ⏳ Analysiere fehlende Filter-Implementierungen
3. ⏳ Implementiere fehlende FilterPane-Integrationen
4. ⏳ Implementiere Standardfilter-Seeding
5. ⏳ Teste alle Filterfunktionen

