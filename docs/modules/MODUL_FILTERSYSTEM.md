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

### Filterlogik

Die Filterlogik ist in den folgenden Komponenten implementiert:
- `FilterPane.tsx`: Hauptkomponente für die Filterverwaltung
- `FilterRow.tsx`: Komponente für einzelne Filterbedingungen
- `FilterLogicalOperator.tsx`: Komponente für logische Operatoren (UND/ODER)

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

## Ergebnisbegrenzung und Pagination

Um die Performance zu verbessern und große Datensätze besser handhabbar zu machen, implementieren alle Tabellen eine Ergebnisbegrenzung:

1. **Initiale Anzeige**: Standardmäßig werden nur die ersten 10 Einträge angezeigt
2. **"Mehr anzeigen" Button**: Erscheint unter der Tabelle, wenn mehr als 10 Einträge verfügbar sind
3. **Inkrementelle Ladung**: Bei Klick werden jeweils 10 weitere Einträge geladen
4. **Verbleibende Anzeige**: Der Button zeigt an, wie viele Einträge noch verbleiben

Diese Funktion sorgt für schnellere Ladezeiten und eine bessere Benutzerfreundlichkeit bei großen Datensätzen. 