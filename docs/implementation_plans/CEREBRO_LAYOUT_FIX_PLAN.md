# Cerebro Layout Fix Plan

## Problem-Analyse

### Identifizierte Probleme

1. **Artikelinhalt geht über Bildschirmrand rechts**
   - Ursache: `prose max-w-none` in ArticleView.tsx erlaubt unbegrenzte Breite
   - Zusätzlich: Container-Struktur erlaubt horizontalen Overflow

2. **Artikelinhalt scrollt nicht, dafür Topbar**
   - Ursache: Topbar ist innerhalb des scrollbaren Bereichs
   - Falsche Container-Hierarchie: `fixed-height-container` wird auf falschen Container angewendet
   - Topbar sollte fixiert sein, Artikelinhalt sollte scrollen

### Aktuelle (falsche) Struktur

```
<div className="min-h-screen">                    // Äußerer Container
  <div className="max-w-7xl mx-auto">            // Content-Container
    <div className="w-full">                      // Topbar-Container (scrollt mit!)
      <CerebroHeader />
    </div>
    <div className="w-full">                      // FilterPane (scrollt mit!)
      <FilterPane />
    </div>
    <div className="w-full">                      // SavedFilterTags (scrollt mit!)
      <SavedFilterTags />
    </div>
    <div className="flex fixed-height-container"> // Flex-Container (FALSCH: fixed-height-container hier!)
      <div className="w-60">                      // Sidebar
        <ArticleStructure />
      </div>
      <div className="flex-grow overflow-y-auto"> // Main-Content (scrollt, aber Topbar ist außerhalb)
        <div className="max-w-7xl mx-auto">
          <Outlet />                              // ArticleView mit prose max-w-none
        </div>
      </div>
    </div>
  </div>
</div>
```

### Korrekte Struktur (Ziel)

```
<div className="min-h-screen">                    // Äußerer Container
  <div className="max-w-7xl mx-auto">            // Content-Container
    <div className="sticky top-0 z-10">          // Topbar FIXIERT (nicht scrollbar)
      <div className="w-full bg-white">
        <CerebroHeader />
      </div>
      <div className="w-full">                    // FilterPane (auch fixiert)
        <FilterPane />
      </div>
      <div className="w-full">                    // SavedFilterTags (auch fixiert)
        <SavedFilterTags />
      </div>
    </div>
    <div className="flex h-[calc(100vh-XXXpx)]"> // Flex-Container mit fester Höhe
      <div className="w-60 overflow-y-auto">      // Sidebar (scrollbar)
        <ArticleStructure />
      </div>
      <div className="flex-grow overflow-y-auto overflow-x-hidden"> // Main-Content (scrollbar)
        <div className="max-w-7xl mx-auto px-5">
          <Outlet />                              // ArticleView mit korrekter Breitenbegrenzung
        </div>
      </div>
    </div>
  </div>
</div>
```

## Fix-Plan

### ⚠️ KRITISCH: fixed-height-container falsch verwendet

**Aktuell (FALSCH):**
- Zeile 206: `fixed-height-container` wird auf Flex-Container angewendet
- CSS macht Container `position: fixed`, was falsch ist

**Korrektur:**
- `fixed-height-container` ENTFERNEN (wird nicht benötigt mit sticky-Topbar)
- Oder: `fixed-height-container` auf äußeren Container (wie Layout.tsx), aber dann größere Struktur-Änderung

### Schritt 1: Topbar fixieren (nicht scrollbar) mit useRef für Höhenberechnung

**Datei:** `frontend/src/pages/Cerebro.tsx`

**Änderungen:**
- Topbar-Container (Zeile 157) mit `sticky top-0 z-10` versehen
- FilterPane und SavedFilterTags ebenfalls in den sticky-Bereich einbinden
- Background und Border beibehalten für visuelle Trennung
- **WICHTIG:** `useRef` für Topbar-Container, um Höhe dynamisch zu berechnen

**Code-Änderung:**
```tsx
// State für Topbar-Höhe
const topbarRef = useRef<HTMLDivElement>(null);
const [topbarHeight, setTopbarHeight] = useState<number>(200); // Default: ~200px

// Berechne Topbar-Höhe dynamisch
useEffect(() => {
  const updateTopbarHeight = () => {
    if (topbarRef.current) {
      setTopbarHeight(topbarRef.current.clientHeight);
    }
  };
  
  // Initial berechnen
  updateTopbarHeight();
  
  // Bei FilterPane-Änderung neu berechnen
  const timeoutId = setTimeout(updateTopbarHeight, 100); // Kleine Verzögerung für DOM-Update
  
  return () => clearTimeout(timeoutId);
}, [isFilterPaneOpen]);

// Im JSX:
{/* Header-Bereich - FIXIERT, nicht scrollbar */}
<div 
  ref={topbarRef}
  className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
  data-cerebro-topbar
>
  <div className={`max-w-7xl mx-auto ${isMobile ? '' : 'px-5'}`}>
    <CerebroHeader ... />
  </div>
  
  {/* FilterPane (ausklappbar) - auch fixiert */}
  {isFilterPaneOpen && (
    <div className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4' : 'px-5'} py-2`}>
        <FilterPane ... />
      </div>
    </div>
  )}
  
  {/* SavedFilterTags - auch fixiert */}
  <div className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4' : 'px-5'} py-2`}>
      <SavedFilterTags ... />
    </div>
  </div>
</div>
```

### Schritt 2: Flex-Container korrigieren

**Datei:** `frontend/src/pages/Cerebro.tsx`

**Änderungen:**
- **KRITISCH:** `fixed-height-container` ENTFERNEN (Zeile 206) - wird falsch verwendet
- Feste Höhe für Flex-Container berechnen: `h-[calc(100vh-${topbarHeight}px)]` mit dynamischer Topbar-Höhe
- Sidebar scrollbar machen: `overflow-y-auto`
- Main-Content scrollbar machen: `overflow-y-auto overflow-x-hidden`

**Code-Änderung:**
```tsx
{/* Sidebar + Main Flex-Layout - Topbar ist jetzt außerhalb */}
<div className={`flex ${isTabletOrLarger ? `h-[calc(100vh-${topbarHeight}px)]` : 'min-h-[calc(100vh-200px)]'}`}>
  {/* Sidebar - scrollbar */}
  <div 
    className={`
      ${sidebarOpen ? 'w-60' : ''}
      ${isMobile && !sidebarOpen ? 'w-0' : ''} 
      transition-all duration-300 ease-in-out shrink-0
      ${isTabletOrLarger ? 'overflow-y-auto' : ''}
    `}
  >
    <ArticleStructure mdFiles={[]} />
  </div>
  
  {/* Main-Content - scrollbar, horizontales Overflow verhindern */}
  <div className={`flex-grow ${isMobile ? 'overflow-y-container' : 'overflow-y-auto overflow-x-hidden'} ${
    isMobile 
      ? 'px-0 pt-2 pb-16'
      : `pt-3 pb-4`
  }`}>
    <div className={`${isMobile ? 'mobile-full-width' : 'max-w-7xl mx-auto px-5'}`}>
      <Outlet context={{ filterConditions, filterLogicalOperators, sortConfig, searchTerm }} />
    </div>
  </div>
</div>
```

### Schritt 3: Artikelinhalt-Breite begrenzen

**Datei:** `frontend/src/components/cerebro/ArticleView.tsx`

**Änderungen:**
- `prose max-w-none` entfernen oder durch `prose max-w-full` ersetzen
- Sicherstellen, dass der Container die Breite respektiert

**Code-Änderung:**
```tsx
{/* Inhalt des Artikels oder ausgewählter GitHub-Markdown */}
<div className="prose dark:prose-invert max-w-full">
  {renderContent()}
</div>
```

**Alternative:** Wenn `max-w-none` für bestimmte Inhalte benötigt wird, dann:
```tsx
<div className="prose dark:prose-invert max-w-full overflow-x-hidden">
  {renderContent()}
</div>
```

### Schritt 4: Mobile-Anpassungen

**Datei:** `frontend/src/pages/Cerebro.tsx`

**Hinweis:**
- Topbar-Höhe-Berechnung ist bereits in Schritt 1 implementiert (mit `useRef`)
- Auf Mobile: `sticky` könnte anders funktionieren - muss getestet werden
- Footer-Overlay muss berücksichtigt werden (bereits vorhanden: `pb-16`)

**Zusätzliche Mobile-Checks:**
- `sticky` auf Mobile-Browsern testen
- Topbar-Höhe auf Mobile könnte anders sein
- Sicherstellen, dass kein horizontaler Overflow auf Mobile auftritt

### Schritt 5: CSS-Anpassungen (falls nötig)

**Datei:** `frontend/src/index.css`

**Prüfen:**
- Ob `overflow-x-hidden` auf allen relevanten Containern angewendet wird
- Ob `prose`-Klasse korrekte Breitenbegrenzung hat

**Falls nötig, hinzufügen:**
```css
/* Cerebro-spezifische Fixes */
.cerebro-content-container {
  overflow-x: hidden;
  max-width: 100%;
}

.cerebro-content-container .prose {
  max-width: 100%;
  overflow-x: hidden;
}
```

## ⚠️ WICHTIG: Offene Fragen / Vermutungen

**Diese Punkte müssen während/nach der Implementierung getestet werden:**

1. ❓ **Funktioniert `sticky` innerhalb `max-w-7xl mx-auto` Container?**
   - `sticky` benötigt einen scrollbaren Parent-Container
   - Muss getestet werden

2. ❓ **Funktioniert Topbar-Höhe-Berechnung zuverlässig?**
   - `useRef` und `clientHeight` könnte Timing-Probleme haben
   - FilterPane-Öffnen/Schließen könnte Race-Conditions verursachen
   - Muss getestet werden

3. ❓ **Verhindert `overflow-x-hidden` alle horizontalen Overflow-Probleme?**
   - `prose`-Klasse könnte eigene CSS-Regeln haben
   - Muss getestet werden

4. ❓ **Funktioniert `sticky` auf Mobile-Browsern korrekt?**
   - Mobile-Browser haben unterschiedliche `sticky`-Implementierungen
   - Muss getestet werden

**Falls Probleme auftreten:**
- Alternative: Layout.tsx-Pattern verwenden (Topbar außerhalb des `max-w-7xl` Containers)
- Siehe: `docs/analysis/CEREBRO_LAYOUT_ANALYSE_VOLLSTAENDIG.md` - Option 2

## Implementierungsreihenfolge

1. ✅ Schritt 1: Topbar fixieren (sticky) mit useRef für Höhenberechnung
2. ✅ Schritt 2: Flex-Container korrigieren (`fixed-height-container` ENTFERNEN)
3. ✅ Schritt 3: Artikelinhalt-Breite begrenzen (`prose max-w-none` → `max-w-full overflow-x-hidden`)
4. ✅ Schritt 4: Mobile-Anpassungen prüfen
5. ✅ Schritt 5: CSS-Anpassungen (falls nötig)
6. ✅ **TESTEN:** Desktop, Tablet, Mobile
7. ✅ **TESTEN:** Browser-Console prüfen auf Fehler
8. ✅ **TESTEN:** Visuell prüfen: Topbar fixiert, Content scrollbar, kein horizontaler Overflow
9. ✅ **TESTEN:** FilterPane öffnen/schließen - Topbar-Höhe passt sich an
10. ✅ **FALLS PROBLEME:** Alternative Option 2 (Layout.tsx-Pattern) implementieren

## Erwartete Ergebnisse

Nach der Implementierung:

1. ✅ **Topbar ist fixiert** - scrollt nicht mit, bleibt oben sichtbar
2. ✅ **Artikelinhalt scrollt korrekt** - vertikal scrollbar, horizontal begrenzt
3. ✅ **Kein horizontaler Overflow** - Inhalt geht nicht über Bildschirmrand hinaus
4. ✅ **Sidebar scrollt korrekt** - wenn Inhalt zu lang ist
5. ✅ **Mobile funktioniert** - alle Anpassungen berücksichtigt

## Test-Checkliste

### Desktop
- [ ] Topbar bleibt beim Scrollen oben fixiert (`sticky` funktioniert)
- [ ] Artikelinhalt scrollt vertikal
- [ ] Kein horizontaler Scrollbar sichtbar
- [ ] Inhalt geht nicht über rechten Bildschirmrand hinaus
- [ ] Sidebar scrollt korrekt (wenn Inhalt zu lang)
- [ ] Verschiedene Artikel-Längen testen (kurz, lang, sehr lang)

### Tablet
- [ ] Gleiche Funktionalität wie Desktop
- [ ] `sticky` funktioniert korrekt

### Mobile
- [ ] Topbar fixiert (wenn möglich - `sticky` auf Mobile testen)
- [ ] Artikelinhalt scrollt korrekt
- [ ] Kein horizontaler Overflow
- [ ] Footer-Overlay funktioniert korrekt

### Dynamische Tests
- [ ] FilterPane öffnen: Topbar-Höhe passt sich an
- [ ] FilterPane schließen: Topbar-Höhe passt sich an
- [ ] Topbar-Höhe-Berechnung funktioniert zuverlässig (keine Race-Conditions)

### Technische Tests
- [ ] Browser-Console: Keine Fehler
- [ ] `fixed-height-container` wurde entfernt (nicht mehr vorhanden)
- [ ] `prose max-w-none` wurde geändert zu `max-w-full overflow-x-hidden`
- [ ] `overflow-x-hidden` verhindert alle horizontalen Overflow-Probleme

## Dokumentation

**Vollständige Analyse:** Siehe `docs/analysis/CEREBRO_LAYOUT_ANALYSE_VOLLSTAENDIG.md`
