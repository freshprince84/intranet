# Standard für Sortierung & Infinite Scroll

Dieses Dokument definiert den System-Standard für die Implementierung von Sortierung, Filterung und Infinite Scroll, um Konsistenz, Performance und Datenintegrität sicherzustellen.

## 1. Backend-Standard (Controller)

Jeder Endpunkt, der paginierte Listen zurückgibt, muss folgende Kriterien erfüllen:

### A. Query-Parameter
- `sortBy`: Feldname (z.B. `dueDate`, `status`).
- `sortOrder`: `asc` oder `desc`.
- `limit`: Anzahl der Items pro Seite (Standard: 20).
- `offset`: Anzahl der zu überspringenden Items.

### B. Feld-Mapping
Frontend-Feldnamen müssen im Backend auf die entsprechenden Prisma-Felder oder Relationen gemappt werden:
```typescript
let prismaSortBy = sortBy;
if (sortBy === 'requestedBy') {
    prismaSortBy = 'requester.firstName';
} else if (sortBy === 'branch') {
    prismaSortBy = 'branch.name';
}
```

### C. Stabile Sortierung (Kritisch für Infinite Scroll)
Um zu verhindern, dass Datensätze beim Nachladen zwischen den Seiten "springen" oder doppelt erscheinen, muss **immer** ein eindeutiges Fallback-Kriterium (ID) vorhanden sein:
```typescript
orderBy: prismaSortBy ? [
    { [prismaSortBy]: sortOrder },
    { id: 'asc' } // Stabiler Fallback
] : [
    { createdAt: 'desc' },
    { id: 'desc' }
]
```

---

## 2. Frontend-Standard (Komponenten)

### A. Persistenz
Nutzung des Hooks `useTableSettings` zur Speicherung von:
- `sortConfig` (Key & Direction)
- `hiddenColumns`
- `columnOrder`
- `viewMode` (Table/Cards)

### B. Daten-Deduplizierung
Beim Infinite Scroll (`append = true`) müssen neue Daten anhand ihrer ID dedupliziert werden, bevor sie in den State übernommen werden:
```typescript
setItems(prev => {
    const existingIds = new Set(prev.map(item => item.id));
    const uniqueNewItems = newData.filter(item => !existingIds.has(item.id));
    return [...prev, ...uniqueNewItems];
});
```

### C. Reaktivität bei Sortierung
Bei Änderung der Sortierung muss die Liste komplett neu geladen werden (kein `append`). Dies geschieht über einen `useEffect`, der erst feuert, wenn der initiale Load abgeschlossen ist:
```typescript
useEffect(() => {
    if (!isLoadingSettings && initialLoadAttempted.current) {
        fetchData(selectedFilterId); // Lädt Daten mit neuer Sortierung, offset = 0
    }
}, [sortConfig.key, sortConfig.direction]);
```

### D. Infinite Scroll Trigger
Nutzung des `IntersectionObserver` am Ende der Liste. Der Trigger darf nur feuern, wenn:
1. `hasMore` wahr ist.
2. `loadingMore` falsch ist.
3. `loading` falsch ist.

---

## 3. Implementierte Module
Dieser Standard ist aktuell in folgenden Modulen vollständig umgesetzt:
- **Worktracker** (To-Do's & Reservations)
- **Dashboard** (Requests)

Zuletzt aktualisiert: 2025-01-31
