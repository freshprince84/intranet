# Filtersystem-Modul

Das Filtersystem-Modul bietet eine umfassende Lösung für das Filtern von Daten in verschiedenen Tabellen der Anwendung. Es unterstützt komplexe Filterbedingungen, benutzerdefinierte Filter und kontextbezogene Filteroptionen.

## Funktionsübersicht

- Speicherbare und wiederverwendbare Filter für alle Tabellen
- Unterstützung für komplexe Filterbedingungen (UND/ODER-Verknüpfungen)
- Vordefinierte Standardfilter je nach Tabellentyp
- Intelligente Dropdown-Filter für Benutzer- und Rollenfelder
- Kontextbezogene Status-Filteroptionen je nach Tabellentyp
- Speicherung von Filtereinstellungen pro Benutzer

## Implementierte Tabellen und ihre Filter

### Requests-Tabelle

- **Standardfilter**: "Aktuell" und "Archiv"
- **Status-Filteroptionen**: 
  - "Zur Genehmigung" (approval)
  - "Genehmigt" (approved)
  - "Zu verbessern" (to_improve)
  - "Abgelehnt" (denied)
- **Filterbare Spalten**:
  - Titel
  - Status
  - Erstellt von
  - Verantwortlich
  - Filiale
  - Fälligkeitsdatum

### To Do's (Tasks)-Tabelle

- **Standardfilter**: "Aktuell" und "Archiv"
- **Status-Filteroptionen**:
  - "Offen" (open)
  - "In Bearbeitung" (in_progress)
  - "Zu verbessern" (improval)
  - "Qualitätskontrolle" (quality_control)
  - "Erledigt" (done)
- **Benutzer- und Rollenfilter**:
  - **Verantwortlich**: Dropdown mit Benutzern UND Rollen
  - **Qualitätskontrolle**: Dropdown nur mit Benutzern
  - Getrennte Filterfelder für kombinierte Spalten
  - Optimierte Filterlogik für IDs im Format "user-ID" und "role-ID"

### Workcenter-Tabelle

- **Standardfilter**: "Aktive" und "Alle"
- **Filterbare Spalten**:
  - Benutzer
  - Datum
  - Status
  - Filiale
  - Aufgabenbereich

### Rollen-Tabelle

- **Standardfilter**: "Alle"
- **Filterbare Spalten**:
  - Name
  - Beschreibung
  - Berechtigungslevel

## Technische Details

### Filter-Standards

**WICHTIG:** Alle Filter müssen den aktuellen Standards entsprechen. Siehe:
- **Standards-Dokumentation:** `docs/modules/MODUL_FILTERSYSTEM_STANDARDS.md`
- **Standardisierungs-Plan:** `docs/implementation_plans/FILTER_STANDARDISIERUNG_PLAN.md`
- **Referenz-Implementierung:** `frontend/src/components/Requests.tsx`

### Filterlogik

Die Filterlogik ist in den folgenden Komponenten implementiert:
- `FilterPane.tsx`: Hauptkomponente für die Filterverwaltung
- `FilterRow.tsx`: Komponente für einzelne Filterbedingungen
- `FilterLogicalOperator.tsx`: Komponente für logische Operatoren (UND/ODER)
- `filterLogic.ts`: Zentrale Filter-Logik-Funktionen (`applyFilters`, `evaluateDateCondition`, `evaluateUserRoleCondition`)

### HTTP-Methoden und API-Integration

Das Backend unterstützt folgende HTTP-Methoden für die API-Aufrufe:
- `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`, `PATCH`

Die Status-Buttons im Worktracker verwenden die `PATCH`-Methode für Status-Updates, da nur das Status-Feld aktualisiert wird, während für vollständige Updates `PUT` verwendet wird.

### Kontextbezogene Status-Filter

Die Statusfilter werden automatisch an den Typ der Tabelle angepasst:

```typescript
// Überprüfen welche Tabelle wir filtern (über Columns-Array)
const isRequestTable = columns.some(col => col.id === 'requestedBy' || col.id === 'createTodo');
const isTaskTable = columns.some(col => col.id === 'responsible' || col.id === 'qualityControl');
      
if (isRequestTable) {
  // Request-Status-Optionen anzeigen
} else if (isTaskTable) {
  // Task-Status-Optionen anzeigen
}
```

### Benutzer- und Rollenfilter

Für die Filter "Verantwortlich" und "Qualitätskontrolle" wurde eine spezielle Filterlogik implementiert:

1. **Dropdown-Menüs**:
   - "Verantwortlich": Zeigt Benutzer UND Rollen an
   - "Qualitätskontrolle": Zeigt nur Benutzer an

2. **Format der Werte**:
   - Benutzer: `user-{ID}` (z.B. "user-1")
   - Rollen: `role-{ID}` (z.B. "role-2")

3. **Filterlogik**:
   - Extrahiert die ID aus dem Format
   - Vergleicht mit den IDs der Benutzer/Rollen im Datensatz
   - Unterstützt auch Fallback für manuelle Texteingaben

## Standardfilter

Alle Standardfilter sind nicht löschbar und werden automatisch für jeden Benutzer erstellt. Sie dienen als Ausgangspunkt für häufige Filteroperationen.

## Speichern und Laden von Filtern

Benutzer können ihre eigenen Filter erstellen und speichern:

1. Filter-Bedingungen definieren
2. Auf "Filter speichern" klicken
3. Namen für den Filter eingeben
4. Filter wird in der Datenbank gespeichert und dem Benutzer zugeordnet

Gespeicherte Filter können später über ein Dropdown-Menü wieder geladen werden.

## Zukünftige Erweiterungen

- **Globale Filter**: Administratoren können standardisierte Filter für alle Benutzer erstellen
- **Filter-Export/Import**: Möglichkeit, Filter zwischen Benutzern zu teilen
- **Erweiterte Filtervisualisierung**: Visuelle Darstellung komplexer Filterbedingungen

## Infinite Scroll (Anzeige) - KEINE Pagination beim Laden

**⚠️ WICHTIG:** Alle Tabellen verwenden Infinite Scroll für die Anzeige, aber KEINE Pagination beim Laden.

### Grundprinzipien

1. **KEINE Pagination beim Laden:**
   - ❌ **STRENG VERBOTEN:** `limit`/`offset` Parameter im Backend
   - ❌ **STRENG VERBOTEN:** Pagination beim Laden der Daten
   - ✅ **ERFORDERLICH:** Immer ALLE Ergebnisse laden (mit Filter wenn gesetzt)

2. **Infinite Scroll nur für Anzeige:**
   - ✅ **ERFORDERLICH:** Alle Daten werden geladen (Backend gibt alle zurück)
   - ✅ **ERFORDERLICH:** Infinite Scroll nur für die Anzeige (nicht für das Laden)
   - ✅ **ERFORDERLICH:** Initial: Nur erste 20 Items anzeigen
   - ✅ **ERFORDERLICH:** Beim Scrollen: Weitere 20 Items anzeigen
   - ✅ **ERFORDERLICH:** Automatisch beim Scrollen (kein "Mehr anzeigen" Button)

3. **Filter: ALLE Ergebnisse müssen geladen werden:**
   - ✅ **ERFORDERLICH:** Wenn Filter gesetzt: Backend filtert und gibt ALLE gefilterten Ergebnisse zurück
   - ❌ **STRENG VERBOTEN:** Nur 20 Ergebnisse laden, dann weitere 20 beim Scrollen
   - ❌ **STRENG VERBOTEN:** Client-seitige Filterung nach Pagination
   - ✅ **ERFORDERLICH:** Filter wird server-seitig angewendet, dann ALLE gefilterten Ergebnisse geladen

### Implementierung

**Backend:**
- Keine `limit`/`offset` Parameter
- Filter werden server-seitig angewendet
- Alle gefilterten Ergebnisse werden zurückgegeben

**Frontend:**
- Alle Daten werden geladen (kein `limit`/`offset`)
- `displayLimit` State für Anzeige (initial: 20)
- Infinite Scroll Handler erhöht `displayLimit` beim Scrollen
- Anzeige: `items.slice(0, displayLimit)`

### Betroffene Tabellen

- ✅ Requests
- ✅ ToDo's (Tasks)
- ✅ Reservations
- ✅ Tours (falls vorhanden)
- ✅ TourBookings (falls vorhanden)
- ✅ Alle anderen Tabellen

**Detaillierte Implementierung:** Siehe `docs/implementation_plans/INFINITE_SCROLL_VOLLSTAENDIGER_PLAN.md` 