# Cerebro: GitHub-Tabs aus normalen Artikeln entfernen

## Problem-Analyse

### Aktuelles Verhalten

**In ArticleView.tsx:**
- Zeile 76: Filtert alle `github_markdown` Links aus `externalLinks`
- Zeile 361-391: Zeigt GitHub-Tabs an, wenn `githubLinks.length > 0`
- **Problem:** GitHub-Tabs werden für ALLE Artikel angezeigt, die GitHub-Links haben

### Gewünschtes Verhalten

- **Interne Dokumente** (aus GitHub): GitHub-Tabs anzeigen
- **Normale Artikel**: Keine GitHub-Tabs, nur Artikel-Inhalt direkt anzeigen

### Identifikation interner Dokumente

Ein Artikel ist ein **internes Dokument**, wenn:
1. `parentId === markdownFolder.id` (Kind des "Markdown-Dateien" / "Intranet - Überblick" Ordners)
2. ODER `githubPath !== null` (hat einen GitHub-Pfad)

**Quelle:** `Cerebro.tsx` Zeile 443-448:
```tsx
const markdownFolder = await cerebroApi.articles.getArticleBySlug('markdown-folder');
if ((markdownFolder && article.parentId === markdownFolder.id) || article.githubPath) {
  setIsMarkdownFile(true);
}
```

## Implementierungsplan

### Schritt 1: Prüfung ob Artikel internes Dokument ist

**Datei:** `frontend/src/components/cerebro/ArticleView.tsx`

**Änderungen:**
- State für `isInternalDocument` hinzufügen
- `useEffect` zum Laden des Markdown-Folders und Prüfung
- Prüfung: `parentId === markdownFolder.id` ODER `githubPath !== null`

**Code-Änderung:**
```tsx
const [isInternalDocument, setIsInternalDocument] = useState<boolean>(false);

useEffect(() => {
  const checkIfInternalDocument = async () => {
    if (!article) return;
    
    try {
      // Lade Markdown-Folder
      const markdownFolder = await cerebroApi.articles.getArticleBySlug('markdown-folder');
      
      // Prüfe, ob Artikel ein internes Dokument ist
      const isInternal = 
        (markdownFolder && article.parentId === markdownFolder.id) || 
        article.githubPath !== null;
      
      setIsInternalDocument(isInternal);
    } catch (err) {
      // Wenn Markdown-Folder nicht gefunden wird, prüfe nur auf githubPath
      console.warn('Markdown-Ordner nicht gefunden:', err);
      setIsInternalDocument(article.githubPath !== null);
    }
  };
  
  if (article) {
    checkIfInternalDocument();
  }
}, [article]);
```

### Schritt 2: GitHub-Tabs nur für interne Dokumente anzeigen

**Datei:** `frontend/src/components/cerebro/ArticleView.tsx`

**Änderungen:**
- Bedingung für GitHub-Tabs anpassen: `githubLinks.length > 0` → `githubLinks.length > 0 && isInternalDocument`
- Für normale Artikel: GitHub-Links ignorieren, nur Artikel-Inhalt anzeigen

**Code-Änderung:**
```tsx
{/* GitHub-Links als Tabs anzeigen, NUR für interne Dokumente */}
{githubLinks.length > 0 && isInternalDocument && (
  <div className="mb-4">
    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex">
        {githubLinks.map(link => (
          <button
            key={link.id}
            className={`py-2 px-4 font-medium text-sm ${
              selectedGithubLink?.id === link.id
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
            onClick={() => setSelectedGithubLink(link)}
          >
            {link.title || 'GitHub'}
          </button>
        ))}
        <button
          className={`py-2 px-4 font-medium text-sm ${
            !selectedGithubLink
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setSelectedGithubLink(null)}
        >
          {t('cerebro.article')}
        </button>
      </div>
    </div>
  </div>
)}
```

### Schritt 3: GitHub-Links für normale Artikel ignorieren

**Datei:** `frontend/src/components/cerebro/ArticleView.tsx`

**Änderungen:**
- `selectedGithubLink` nur setzen, wenn `isInternalDocument === true`
- `renderContent()` sollte für normale Artikel immer Artikel-Inhalt zeigen (nicht GitHub-Content)

**Code-Änderung:**
```tsx
useEffect(() => {
  const fetchArticle = async () => {
    if (!slug) return;
    
    try {
      setLoading(true);
      
      // Artikel und verknüpfte Daten laden
      const articleData = await cerebroApi.articles.getArticleBySlug(slug);
      setArticle(articleData);
      
      // Sortiere GitHub-Markdown Links
      const github = articleData.externalLinks.filter(link => link.type === 'github_markdown');
      
      setGithubLinks(github);
      
      // Nur für interne Dokumente: GitHub-Link auswählen
      // Für normale Artikel: selectedGithubLink bleibt null
      if (github.length > 0) {
        // Wird später in checkIfInternalDocument gesetzt
        // setSelectedGithubLink(github[0]); // ENTFERNEN
      }
      
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden des Artikels:', err);
      setError(t('cerebro.messages.loadError'));
    } finally {
      setLoading(false);
    }
  };
  
  fetchArticle();
}, [slug]);

// In checkIfInternalDocument:
useEffect(() => {
  const checkIfInternalDocument = async () => {
    if (!article) return;
    
    try {
      const markdownFolder = await cerebroApi.articles.getArticleBySlug('markdown-folder');
      
      const isInternal = 
        (markdownFolder && article.parentId === markdownFolder.id) || 
        article.githubPath !== null;
      
      setIsInternalDocument(isInternal);
      
      // Nur für interne Dokumente: GitHub-Link auswählen
      if (isInternal && githubLinks.length > 0) {
        setSelectedGithubLink(githubLinks[0]);
      } else {
        // Für normale Artikel: Kein GitHub-Link ausgewählt
        setSelectedGithubLink(null);
      }
    } catch (err) {
      console.warn('Markdown-Ordner nicht gefunden:', err);
      const isInternal = article.githubPath !== null;
      setIsInternalDocument(isInternal);
      
      if (isInternal && githubLinks.length > 0) {
        setSelectedGithubLink(githubLinks[0]);
      } else {
        setSelectedGithubLink(null);
      }
    }
  };
  
  if (article && githubLinks.length > 0) {
    checkIfInternalDocument();
  } else {
    // Keine GitHub-Links vorhanden = definitiv kein internes Dokument
    setIsInternalDocument(false);
    setSelectedGithubLink(null);
  }
}, [article, githubLinks]);
```

### Schritt 4: renderContent() anpassen

**Datei:** `frontend/src/components/cerebro/ArticleView.tsx`

**Änderungen:**
- `renderContent()` sollte für normale Artikel IMMER Artikel-Inhalt zeigen
- GitHub-Content nur anzeigen, wenn `isInternalDocument === true` UND `selectedGithubLink !== null`

**Code-Änderung:**
```tsx
const renderContent = () => {
  // Nur für interne Dokumente: GitHub-Markdown anzeigen, wenn ausgewählt
  if (isInternalDocument && selectedGithubLink) {
    // ... bestehender GitHub-Markdown-Code ...
  }
  
  // Für alle Artikel (inkl. interne Dokumente ohne ausgewählten GitHub-Link): Artikel-Inhalt anzeigen
  // ... bestehender Artikel-Inhalt-Code ...
};
```

## Zusammenfassung der Änderungen

1. ✅ State `isInternalDocument` hinzufügen
2. ✅ `useEffect` zum Prüfen ob Artikel internes Dokument ist
3. ✅ GitHub-Tabs nur anzeigen wenn `isInternalDocument === true`
4. ✅ `selectedGithubLink` nur setzen für interne Dokumente
5. ✅ `renderContent()` anpassen: GitHub-Content nur für interne Dokumente

## Erwartetes Verhalten nach Implementierung

### Interne Dokumente (z.B. README.md, MODUL_CEREBRO.md)
- ✅ GitHub-Tabs werden angezeigt
- ✅ Wechsel zwischen GitHub-Content und Artikel-Inhalt möglich
- ✅ Standard: Erster GitHub-Link ausgewählt

### Normale Artikel (z.B. "Test", "Online Check-in")
- ✅ Keine GitHub-Tabs
- ✅ Artikel-Inhalt wird direkt angezeigt
- ✅ GitHub-Links werden ignoriert (auch wenn vorhanden)

## Test-Checkliste

- [ ] Interne Dokumente: GitHub-Tabs werden angezeigt
- [ ] Interne Dokumente: Wechsel zwischen GitHub-Content und Artikel-Inhalt funktioniert
- [ ] Normale Artikel: Keine GitHub-Tabs
- [ ] Normale Artikel: Artikel-Inhalt wird direkt angezeigt
- [ ] Normale Artikel mit GitHub-Links: GitHub-Links werden ignoriert
- [ ] Browser-Console: Keine Fehler
- [ ] Verschiedene Artikel-Typen testen
