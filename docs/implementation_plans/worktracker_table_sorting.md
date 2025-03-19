# Implementation Plan: Worktracker Tabellensortierung

## Übersicht
Optimierung der Sortierungsfunktionalität in der Worktracker-Tabelle für eine bessere Benutzerfreundlichkeit und erweiterte Sortierungsmöglichkeiten.

## Technische Anforderungen
- Mehrfachsortierung (nach mehreren Spalten gleichzeitig)
- Speicherbare Sortierungseinstellungen
- Verbesserte visuelle Darstellung der Sortierung
- Performance-Optimierung bei großen Datensätzen
- Konsistentes Verhalten mit Filtern

## Komponenten-Änderungen

### 1. Erweiterte SortConfig-Definition
```typescript
interface SortConfig {
  // Mehrfachsortierung ermöglichen
  sortOrders: {
    key: keyof Task | 'responsible.firstName' | 'qualityControl.firstName' | 'branch.name';
    direction: 'asc' | 'desc';
    priority: number; // Priorität für Mehrfachsortierung
  }[];
  // Gespeicherte Sortierungseinstellungen
  savedSortings: {
    id: number;
    name: string;
    sortOrders: SortConfig['sortOrders'];
  }[];
}

// Erweiterte Spalten-Definition
interface ColumnConfig extends TableColumn {
  sortable: boolean;
  sortType: 'string' | 'number' | 'date' | 'status' | 'custom';
  customSort?: (a: any, b: any) => number;
  defaultSortDirection?: 'asc' | 'desc';
}
```

### 2. UI-Komponenten
- Verbesserte Sortierungsanzeige in Spaltenköpfen
- Dropdown für Mehrfachsortierung
- Dialog zum Speichern/Laden von Sortierungen
- Tooltips für Sortierungsoptionen

### 3. Performance-Optimierungen
- Virtualisierung für große Datensätze
- Memoization der Sortierungsfunktionen
- Lazy Loading für gespeicherte Sortierungen
- Optimierte Vergleichsfunktionen

## Implementierungsschritte

1. **Basis-Implementierung (3h)**
   - Erweiterung der SortConfig-Schnittstelle
   - Implementierung der Mehrfachsortierung
   - Anpassung der Sortierungslogik
   ```typescript
   const sortTasks = (tasks: Task[], sortOrders: SortConfig['sortOrders']) => {
     return tasks.sort((a, b) => {
       for (const sort of sortOrders) {
         const comparison = compareValues(a, b, sort);
         if (comparison !== 0) return comparison;
       }
       return 0;
     });
   };
   ```

2. **UI-Entwicklung (4h)**
   - Neue Komponenten für Sortierungssteuerung
   - Verbessertes visuelles Feedback
   - Drag & Drop für Sortierungspriorität
   - Responsive Anpassungen

3. **Persistenz & Settings (3h)**
   - Backend-API für Sortierungseinstellungen
   - LocalStorage Integration
   - User Preferences Handling
   - Migration bestehender Einstellungen

4. **Performance & Optimierung (2h)**
   - Implementierung der Virtualisierung
   - Caching-Strategien
   - Lazy Loading
   - Performance-Monitoring

## Geschätzter Aufwand
- Gesamtaufwand: 12 Stunden
  - Basis-Implementierung: 3h
  - UI-Entwicklung: 4h
  - Persistenz & Settings: 3h
  - Performance & Optimierung: 2h

## Risiken
- Komplexität der Mehrfachsortierung
- Performance bei großen Datensätzen
- Kompatibilität mit bestehenden Filtern
- Migration bestehender Einstellungen

## Nächste Schritte
1. Review des Implementationsplans
2. Prototyp der Mehrfachsortierung
3. UI-Komponenten Entwicklung
4. Backend-Integration
5. Performance-Testing 