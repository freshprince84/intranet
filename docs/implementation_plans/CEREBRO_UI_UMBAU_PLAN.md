# Cerebro UI-Umbau Plan: Filter, Sortierung und Standardisierung

## 📋 Übersicht

Die Cerebro-UI soll umgebaut werden, um:
1. **Suchleiste, "Neuer Artikel" Button, Filter- und Sortier-Buttons** oberhalb des Cerebro-Menus und der Artikel-Anzeige zu platzieren
2. **Filter- und Sortierfunktionen** hinzuzufügen (wie in anderen Modulen)
3. **Näher an den Standard** zu kommen (wie Requests, Tasks, etc.)

## 🔍 Aktuelle Situation

### Aktuelle Struktur
- **ArticleStructure.tsx** (Sidebar):
  - "Neuer Artikel" Button und Suchfeld sind **IN** der Sidebar
  - Keine Filter- oder Sortier-Buttons
  - Suchfeld navigiert zu `/cerebro/search?q=...`

- **Cerebro.tsx** (Layout):
  - `CerebroLayout` enthält Sidebar und Main-Content
  - Sidebar zeigt `ArticleStructure`
  - Main-Content zeigt `Outlet` (verschiedene Routen)

### Vergleich mit Standard (Requests.tsx)
- **Requests.tsx** hat:
  - Header-Bereich mit:
    - Titel (links)
    - Suchfeld, View-Toggle, Filter-Button, Sortier-Button, Spalten-Konfiguration (rechts)
  - FilterPane (ausklappbar)
  - SavedFilterTags (gespeicherte Filter)
  - Artikel-Liste mit Filterung/Sortierung

## 🎯 Ziel-Struktur

```
Cerebro Layout
├── Header-Bereich (NEU - oberhalb von Sidebar + Main)
│   ├── Links: Titel "Cerebro" mit Icon
│   └── Rechts: 
│       ├── Suchfeld
│       ├── "Neuer Artikel" Button
│       ├── Filter-Button (mit Badge bei aktiven Filtern)
│       └── Sortier-Button
│
├── FilterPane (NEU - ausklappbar, wie in Requests)
│   └── FilterRow-Komponenten für Artikel-Filterung
│
├── SavedFilterTags (NEU - wie in Requests)
│   └── Gespeicherte Filter für Cerebro-Artikel
│
├── Sidebar (ArticleStructure - ANGEPASST)
│   └── Nur noch Artikel-Baum (ohne Suchfeld/Button)
│
└── Main-Content (Outlet)
    └── Artikel-Ansicht, Liste, etc.
```

## 📝 Detaillierter Implementierungsplan

### Phase 1: Header-Komponente erstellen

**Datei:** `frontend/src/components/cerebro/CerebroHeader.tsx` (NEU)

**Funktionalität:**
- Titel "Cerebro" mit Icon (DocumentTextIcon)
- Suchfeld (wie in Requests)
- "Neuer Artikel" Button (mit Berechtigungsprüfung)
- Filter-Button (FunnelIcon, mit Badge bei aktiven Filtern)
- Sortier-Button (ArrowsUpDownIcon)

**Props:**
```typescript
interface CerebroHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  canCreateArticle: boolean;
  onCreateArticle: () => void;
  onFilterClick: () => void;
  onSortClick: () => void;
  activeFilterCount: number;
}
```

**Styling:**
- Gleiche Struktur wie Requests-Header
- `flex items-center justify-between`
- Rechte Seite: `flex items-center gap-1.5`

### Phase 2: Filter-Funktionalität implementieren

**Datei:** `frontend/src/components/cerebro/CerebroFilterPane.tsx` (NEU)

**Funktionalität:**
- Verwendet `FilterPane`-Komponente (wie in Requests)
- Verfügbare Spalten für Cerebro-Artikel:
  - `title` - Titel
  - `createdAt` - Erstellungsdatum
  - `updatedAt` - Aktualisierungsdatum
  - `createdBy` - Erstellt von
  - `parentId` - Kategorie/Ordner
  - `githubPath` - Hat GitHub-Pfad (boolean)
  - `isPublished` - Veröffentlicht (boolean)

**Table-ID:**
- `CEREBRO_ARTICLES` (für gespeicherte Filter)

**Integration:**
- Filter-Logik wie in Requests
- `applyFilters` aus `utils/filterLogic.ts` verwenden
- Filter-State in `Cerebro.tsx` oder neuer Container-Komponente

### Phase 3: Sortier-Funktionalität implementieren

**Datei:** `frontend/src/components/cerebro/CerebroSortMenu.tsx` (NEU)

**Funktionalität:**
- Dropdown-Menü für Sortierung
- Sortier-Optionen:
  - Titel (A-Z, Z-A)
  - Erstellungsdatum (Neueste zuerst, Älteste zuerst)
  - Aktualisierungsdatum (Neueste zuerst, Älteste zuerst)
  - Erstellt von (A-Z, Z-A)

**Integration:**
- Sortier-State in Hauptkomponente
- `useMemo` für gefilterte und sortierte Artikel-Liste

### Phase 4: ArticleStructure anpassen

**Datei:** `frontend/src/components/cerebro/ArticleStructure.tsx` (ANPASSEN)

**Änderungen:**
- ❌ Entfernen: Suchfeld und "Neuer Artikel" Button aus der Sidebar
- ✅ Behalten: Artikel-Baum-Struktur
- ✅ Behalten: Expand/Collapse-Funktionalität
- ✅ Behalten: Mobile Toggle-Button

**Props:**
- `mdFiles` bleibt
- Neue Props für Filterung (optional):
  - `filteredArticleIds?: string[]` - IDs der gefilterten Artikel (für Highlighting)

### Phase 5: Cerebro.tsx Layout anpassen

**Datei:** `frontend/src/pages/Cerebro.tsx` (ANPASSEN)

**Änderungen:**

1. **Neue State-Variablen:**
```typescript
const [searchTerm, setSearchTerm] = useState('');
const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'title', direction: 'asc' });
const [isFilterPaneOpen, setIsFilterPaneOpen] = useState(false);
const [activeFilterName, setActiveFilterName] = useState<string>('');
const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
```

2. **CerebroLayout anpassen:**
```typescript
const CerebroLayout: React.FC = () => {
  // ... bestehender Code ...
  
  return (
    <div className={`flex flex-col min-h-screen w-full ${isTabletOrLarger ? 'fixed-height-container' : ''}`}>
      {/* NEU: Header-Bereich */}
      <CerebroHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onSearchSubmit={handleSearch}
        canCreateArticle={canCreateArticle}
        onCreateArticle={() => navigate('/cerebro/create')}
        onFilterClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}
        onSortClick={handleSortClick}
        activeFilterCount={filterConditions.length}
      />
      
      {/* FilterPane (ausklappbar) */}
      {isFilterPaneOpen && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <FilterPane
            columns={cerebroColumns}
            onApply={applyFilterConditions}
            onReset={resetFilterConditions}
            savedConditions={filterConditions}
            savedOperators={filterLogicalOperators}
            tableId="CEREBRO_ARTICLES"
          />
        </div>
      )}
      
      {/* SavedFilterTags */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <SavedFilterTags
          tableId="CEREBRO_ARTICLES"
          onSelectFilter={applyFilterConditions}
          onReset={resetFilterConditions}
          activeFilterName={activeFilterName}
          selectedFilterId={selectedFilterId}
          onFilterChange={handleFilterChange}
          defaultFilterName={t('cerebro.filters.all')}
        />
      </div>
      
      {/* Bestehende Sidebar + Main-Struktur */}
      <div className="flex flex-1 overflow-hidden">
        <div className={/* Sidebar */}>
          <ArticleStructure mdFiles={[]} />
        </div>
        <main className={/* Main-Content */}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
```

3. **Filter-Logik implementieren:**
```typescript
// Lade alle Artikel
const [allArticles, setAllArticles] = useState<CerebroArticle[]>([]);

// Gefilterte und sortierte Artikel
const filteredAndSortedArticles = useMemo(() => {
  let filtered = allArticles;
  
  // Suche
  if (searchTerm) {
    filtered = filtered.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
  
  // Filter
  if (filterConditions.length > 0) {
    filtered = applyFilters(
      filtered,
      filterConditions,
      filterLogicalOperators,
      getFieldValue,
      columnEvaluators
    );
  }
  
  // Sortierung
  filtered.sort((a, b) => {
    // Sortier-Logik basierend auf sortConfig
  });
  
  return filtered;
}, [allArticles, searchTerm, filterConditions, filterLogicalOperators, sortConfig]);
```

### Phase 6: Artikel-Liste anpassen

**Datei:** `frontend/src/components/cerebro/ArticleList.tsx` (ANPASSEN)

**Änderungen:**
- Filterung/Sortierung von außen übergeben
- Props: `articles: CerebroArticle[]` (bereits gefiltert/sortiert)

### Phase 7: API-Erweiterungen (falls nötig)

**Datei:** `backend/src/controllers/cerebroController.ts` (OPTIONAL)

**Falls Server-seitige Filterung gewünscht:**
- Query-Parameter für Filter-Conditions
- Query-Parameter für Sortierung
- Ähnlich wie in `requestsController.ts`

**Aktuell:** Client-seitige Filterung ist ausreichend (wie in Requests bei komplexen Filtern)

## 📦 Benötigte Komponenten/Utils

### Bereits vorhanden:
- ✅ `FilterPane.tsx` - Wiederverwendbar
- ✅ `SavedFilterTags.tsx` - Wiederverwendbar
- ✅ `FilterRow.tsx` - Wiederverwendbar
- ✅ `filterLogic.ts` - Wiederverwendbar
- ✅ Icons: `FunnelIcon`, `ArrowsUpDownIcon`, `DocumentTextIcon`

### Neu zu erstellen:
- ❌ `CerebroHeader.tsx` - Header-Komponente
- ❌ `CerebroSortMenu.tsx` - Sortier-Menü (optional, kann auch in Header integriert werden)

## 🎨 Design-Standards

### Header-Bereich:
- Gleiche Struktur wie Requests-Header
- Hintergrund: `bg-white dark:bg-gray-800`
- Padding: `px-4 py-3`
- Border: `border-b border-gray-200 dark:border-gray-700`

### Buttons:
- Gleiche Styling wie in Requests
- Filter-Button: Badge bei aktiven Filtern
- Tooltips für alle Buttons

### FilterPane:
- Gleiche Positionierung wie in Requests
- Gleiche Styling wie in Requests

## 🔄 Abhängigkeiten

### State-Management:
- Filter-State muss zwischen Header, FilterPane und Artikel-Liste geteilt werden
- Lösung: State in `Cerebro.tsx` (Layout-Komponente)

### Navigation:
- Suche navigiert zu `/cerebro/search?q=...` (bestehend)
- Filter ändern nur die Anzeige (keine Navigation)

## ✅ Checkliste

### Phase 1: Header
- [ ] `CerebroHeader.tsx` erstellen
- [ ] Suchfeld implementieren
- [ ] "Neuer Artikel" Button implementieren
- [ ] Filter-Button implementieren
- [ ] Sortier-Button implementieren
- [ ] Tooltips hinzufügen

### Phase 2: Filter
- [ ] Filter-State in `Cerebro.tsx` hinzufügen
- [ ] `FilterPane` integrieren
- [ ] Spalten-Definitionen für Cerebro-Artikel
- [ ] Filter-Logik implementieren
- [ ] `SavedFilterTags` integrieren

### Phase 3: Sortierung
- [ ] Sortier-State hinzufügen
- [ ] Sortier-Logik implementieren
- [ ] Sortier-Menü/Dropdown erstellen

### Phase 4: ArticleStructure
- [ ] Suchfeld entfernen
- [ ] "Neuer Artikel" Button entfernen
- [ ] Artikel-Baum beibehalten

### Phase 5: Integration
- [ ] `CerebroLayout` anpassen
- [ ] Header einbinden
- [ ] FilterPane einbinden
- [ ] SavedFilterTags einbinden
- [ ] Filterung/Sortierung auf Artikel-Liste anwenden

### Phase 6: Testing
- [ ] Suche testen
- [ ] Filter testen
- [ ] Sortierung testen
- [ ] Mobile-Ansicht testen
- [ ] Dark Mode testen

## 📝 Übersetzungen

**Neue Übersetzungsschlüssel:**
```json
{
  "cerebro": {
    "header": {
      "title": "Cerebro",
      "searchPlaceholder": "Artikel suchen...",
      "createArticle": "Neuer Artikel",
      "filter": "Filter",
      "sort": "Sortieren"
    },
    "filters": {
      "all": "Alle Artikel",
      "title": "Titel",
      "createdAt": "Erstellt am",
      "updatedAt": "Aktualisiert am",
      "createdBy": "Erstellt von",
      "category": "Kategorie",
      "hasGithubPath": "Hat GitHub-Pfad",
      "isPublished": "Veröffentlicht"
    },
    "sort": {
      "titleAsc": "Titel (A-Z)",
      "titleDesc": "Titel (Z-A)",
      "createdAtDesc": "Neueste zuerst",
      "createdAtAsc": "Älteste zuerst",
      "updatedAtDesc": "Zuletzt aktualisiert",
      "updatedAtAsc": "Älteste Aktualisierung"
    }
  }
}
```

## 🚨 Wichtige Hinweise

1. **Keine Breaking Changes:**
   - Bestehende Routen müssen weiterhin funktionieren
   - Artikel-Ansicht muss unverändert bleiben

2. **Mobile-Responsive:**
   - Header muss auf Mobile funktionieren
   - FilterPane muss auf Mobile ausklappbar sein

3. **Performance:**
   - `useMemo` für gefilterte/sortierte Listen verwenden
   - Große Artikel-Listen sollten paginiert werden (später)

4. **Konsistenz:**
   - Gleiche Patterns wie in Requests/Tasks verwenden
   - Gleiche Styling-Klassen verwenden

## 📚 Referenzen

- `frontend/src/components/Requests.tsx` - Standard-Implementierung
- `frontend/src/components/FilterPane.tsx` - Filter-Komponente
- `frontend/src/components/SavedFilterTags.tsx` - Gespeicherte Filter
- `frontend/src/utils/filterLogic.ts` - Filter-Logik
- `docs/claude/docs/container-structures.md` - Container-Standards



