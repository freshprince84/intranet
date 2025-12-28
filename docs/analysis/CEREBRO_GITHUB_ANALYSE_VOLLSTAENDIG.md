# Cerebro GitHub-Integration: Vollständige Analyse

## Ziel
Artikel sollen auf GitHub gespeichert werden & von dort abgerufen werden, statt direkt auf dem Prod-Server.

---

## Aktueller Stand

### Datenmodell
- **Schema:** `CerebroCarticle` hat zwei Felder:
  - `content: String?` - Inhalt in der Datenbank
  - `githubPath: String?` - Pfad zur GitHub-Datei (z.B. "docs/core/README.md")

### Import-Scripts
1. **`importAllDocsToCerebro.ts`** (Zeilen 214-224, 228-238):
   - Liest Markdown-Dateien vom lokalen Dateisystem
   - Speichert `content` in der Datenbank (Zeile 219, 231)
   - Speichert `githubPath` in der Datenbank (Zeile 221, 236)
   - **Problem:** Doppelte Speicherung - Content wird in DB UND githubPath gespeichert

2. **`importUserRelevantDocs.ts`** (Zeilen 268-277, 281-291):
   - Gleiche Logik wie `importAllDocsToCerebro.ts`
   - Speichert auch `content` UND `githubPath`

### Frontend-Logik

#### 1. `Cerebro.tsx` - ArticleViewWithRouter (Zeilen 415-485)
**Aktuelle Logik:**
- Lädt Artikel aus DB
- Prüft, ob `githubPath` vorhanden
- Wenn `githubPath` vorhanden → rendert `GitHubFileView`
- Wenn `githubPath` null → rendert `ArticleView`
- **Problem:** Doppeltes Laden - Artikel wird einmal geladen, dann nochmal in GitHubFileView

#### 2. `Cerebro.tsx` - GitHubFileView (Zeilen 316-398)
**Aktuelle Logik:**
- Erhält optional `article` als Prop
- Wenn `article` vorhanden → verwendet `article.githubPath`
- Wenn nicht → lädt Artikel erneut aus DB
- **Problem:** Fallback-Mechanismus mit `knownMdFiles` Map (entfernt, aber war da)
- **Problem:** Fehlerbehandlung zeigt Fehlermeldung statt Fallback

#### 3. `ArticleView.tsx` (Zeilen 48-469)
**Aktuelle Logik:**
- Lädt Artikel aus DB
- Prüft `githubPath` (Zeile 103)
- Wenn `githubPath` vorhanden → zeigt GitHub-Links als Tabs
- Rendert `content` aus DB mit `MarkdownPreview` (Zeile 244)
- **Problem:** Zeigt `content` aus DB, obwohl `githubPath` vorhanden ist

---

## Probleme

### Problem 1: Doppelte Speicherung
**Was passiert:**
- Import-Scripts speichern `content` in DB
- Import-Scripts speichern `githubPath` in DB
- Artikel haben beide Werte gesetzt

**Warum problematisch:**
- Content in DB kann veraltet sein
- Content in DB wird nicht aktualisiert, wenn GitHub-Datei geändert wird
- Verwirrung: Welche Quelle ist die "Wahrheit"?

### Problem 2: Inkonsistente Anzeige
**Was passiert:**
- `ArticleView` zeigt `content` aus DB an (Zeile 244)
- `GitHubFileView` lädt von GitHub
- Wenn Artikel `githubPath` hat, wird manchmal DB-Content, manchmal GitHub-Content angezeigt

**Warum problematisch:**
- Benutzer sieht veralteten Content
- Inkonsistenz zwischen Artikeln

### Problem 3: Komplizierte Weiche
**Was passiert:**
- `ArticleViewWithRouter` entscheidet zwischen `ArticleView` und `GitHubFileView`
- `GitHubFileView` lädt Artikel erneut
- Mehrfache API-Calls für denselben Artikel

**Warum problematisch:**
- Unnötige Komplexität
- Performance-Problem (doppelte API-Calls)
- Fehleranfällig

### Problem 4: Navigation funktioniert nicht
**Was passiert:**
- Klick auf Artikel → `ArticleViewWithRouter` lädt Artikel
- Wenn Artikel nicht gefunden → `GitHubFileView` wird gerendert
- `GitHubFileView` lädt Artikel erneut → Fehler
- Fallback zeigt immer "Readme"

**Warum problematisch:**
- Benutzer sieht immer denselben Artikel (Readme)
- Navigation funktioniert nicht

### Problem 5: Content-Feld wird nicht benötigt
**Was passiert:**
- Für Artikel mit `githubPath` wird `content` in DB gespeichert
- `content` wird aber nie verwendet (sollte von GitHub geladen werden)

**Warum problematisch:**
- Verschwendeter Speicherplatz
- Verwirrung über Datenquelle

---

## Einfache Lösung (Ziel)

### Regel 1: githubPath entscheidet
- **Wenn `githubPath` vorhanden:** Content IMMER von GitHub laden
- **Wenn `githubPath` null:** Content aus DB anzeigen

### Regel 2: Keine doppelte Speicherung
- **Für Artikel mit `githubPath`:** `content` in DB auf `null` setzen oder leer lassen
- **Für Artikel ohne `githubPath`:** `content` in DB speichern

### Regel 3: Einfache Anzeige-Logik
- **Eine Komponente:** `ArticleView`
- **Prüfung:** Hat Artikel `githubPath`?
  - **Ja:** `GitHubMarkdownViewer` mit `article.githubPath`
  - **Nein:** `MarkdownPreview` mit `article.content`

### Regel 4: Keine Weiche, keine Fallbacks
- Kein `ArticleViewWithRouter`
- Kein `GitHubFileView` als separate Komponente
- Alles in `ArticleView`

---

## Implementierungsplan

### Schritt 1: Import-Scripts anpassen
**Datei:** `backend/scripts/importAllDocsToCerebro.ts`
- Zeile 219: `content` entfernen oder auf `null` setzen
- Zeile 231: `content` entfernen oder auf `null` setzen
- Nur `githubPath` speichern

**Datei:** `backend/scripts/importUserRelevantDocs.ts`
- Zeile 272: `content` entfernen oder auf `null` setzen
- Zeile 284: `content` entfernen oder auf `null` setzen
- Nur `githubPath` speichern

### Schritt 2: ArticleView vereinfachen
**Datei:** `frontend/src/components/cerebro/ArticleView.tsx`
- Entfernen: GitHub-Links-Logik (Zeilen 57-123)
- Entfernen: `isInternalDocument` State
- Entfernen: `selectedGithubLink` State
- Entfernen: `checkIfInternalDocument` useEffect
- Ändern: `renderContent()` Funktion
  - Wenn `article.githubPath` vorhanden → `GitHubMarkdownViewer` mit `article.githubPath`
  - Wenn `article.githubPath` null → `MarkdownPreview` mit `article.content`

### Schritt 3: Cerebro.tsx vereinfachen
**Datei:** `frontend/src/pages/Cerebro.tsx`
- Entfernen: `ArticleViewWithRouter` Komponente (Zeilen 415-485)
- Entfernen: `GitHubFileView` Komponente (Zeilen 316-398)
- Ändern: Route `:slug` direkt auf `ArticleView` zeigen

### Schritt 4: Datenbank bereinigen
**Script erstellen:** `backend/scripts/cleanCerebroContent.ts`
- Für alle Artikel mit `githubPath`:
  - Setze `content` auf `null`
- Für alle Artikel ohne `githubPath`:
  - Behalte `content` wie es ist

---

## Code-Änderungen (Detailliert)

### 1. ArticleView.tsx - Vereinfachung

**Entfernen:**
- Zeilen 57-58: `githubLinks`, `selectedGithubLink` State
- Zeilen 59: `isInternalDocument` State
- Zeilen 76-79: GitHub-Links-Filterung
- Zeilen 97-123: `checkIfInternalDocument` useEffect
- Zeilen 163-226: Komplizierte `renderContent()` Logik mit GitHub-Links-Parsing

**Hinzufügen:**
```typescript
const renderContent = () => {
  // Einfache Regel: githubPath vorhanden → von GitHub laden
  if (article.githubPath) {
    return (
      <GitHubMarkdownViewer
        owner="freshprince84"
        repo="intranet"
        path={article.githubPath}
        branch="main"
      />
    );
  }
  
  // Kein githubPath → Content aus DB anzeigen
  const attachmentMetadata = article.media.map(media => ({
    id: parseInt(media.id, 10),
    fileName: media.filename,
    fileType: media.mimetype,
    url: getCerebroMediaUrl(parseInt(media.id, 10))
  }));
  
  return (
    <MarkdownPreview 
      content={article.content || ''}
      showImagePreview={true}
      attachmentMetadata={attachmentMetadata}
    />
  );
};
```

### 2. Cerebro.tsx - Route vereinfachen

**Entfernen:**
- Zeilen 311-398: `GitHubFileView` Komponente
- Zeilen 415-485: `ArticleViewWithRouter` Komponente

**Ändern:**
- Zeile 515: `<Route path=":slug" element={<ArticleView />} />`
- Direkt `ArticleView` rendern, keine Weiche

### 3. Import-Scripts - Content entfernen

**importAllDocsToCerebro.ts:**
- Zeile 219: `content,` entfernen
- Zeile 231: `content,` entfernen
- Oder: `content: null,` setzen

**importUserRelevantDocs.ts:**
- Zeile 272: `content,` entfernen
- Zeile 284: `content,` entfernen
- Oder: `content: null,` setzen

---

## Zusammenfassung

### Aktuelles Chaos
1. Doppelte Speicherung (Content in DB + githubPath)
2. Komplizierte Weiche (ArticleViewWithRouter)
3. Doppeltes Laden (Artikel wird 2x geladen)
4. Inkonsistente Anzeige (manchmal DB, manchmal GitHub)
5. Navigation funktioniert nicht (immer Readme)

### Einfache Lösung
1. **Eine Regel:** `githubPath` vorhanden → von GitHub, sonst → aus DB
2. **Eine Komponente:** `ArticleView` macht alles
3. **Keine Weiche:** Direkte Route zu `ArticleView`
4. **Keine doppelte Speicherung:** Content nur für Artikel ohne `githubPath`
5. **Keine Fallbacks:** Klare Fehlermeldung wenn Artikel nicht gefunden

### Vorteile
- **Einfach:** Eine Regel, eine Komponente
- **Klar:** Benutzer sieht immer aktuellen Content von GitHub
- **Performant:** Kein doppeltes Laden
- **Wartbar:** Weniger Code, weniger Komplexität

