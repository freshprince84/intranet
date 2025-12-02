import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, useNavigate, Outlet, useParams, useLocation } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions.ts';
import { cerebroApi, CerebroArticle } from '../api/cerebroApi.ts';
import ArticleList from '../components/cerebro/ArticleList.tsx';
import ArticleView from '../components/cerebro/ArticleView.tsx';
import ArticleEdit from '../components/cerebro/ArticleEdit.tsx';
import ArticleStructure from '../components/cerebro/ArticleStructure.tsx';
import AddMedia from '../components/cerebro/AddMedia.tsx';
import AddExternalLink from '../components/cerebro/AddExternalLink.tsx';
import GitHubLinkManagerWrapper from '../components/cerebro/GitHubLinkManagerWrapper.tsx';
import GitHubMarkdownViewer from '../components/cerebro/GitHubMarkdownViewer.tsx';
import CerebroHeader from '../components/cerebro/CerebroHeader.tsx';
import FilterPane from '../components/FilterPane.tsx';
import SavedFilterTags from '../components/SavedFilterTags.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { applyFilters, GetFieldValue, ColumnEvaluator } from '../utils/filterLogic.ts';
import ReactMarkdown from 'react-markdown';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// GitHub Repository-Informationen
const GITHUB_OWNER = 'freshprince84';
const GITHUB_REPO = 'intranet';
const GITHUB_BRANCH = 'main';

// Spalten-Definitionen für Cerebro-Artikel
const CEREBRO_TABLE_ID = 'CEREBRO_ARTICLES';

// Layout-Komponente, die die ArticleStructure enthält
const CerebroLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = usePermissions();
  
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [isTabletOrLarger, setIsTabletOrLarger] = useState<boolean>(window.innerWidth >= 768);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(window.innerWidth >= 768);
  
  // Filter und Sortierung State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filterLogicalOperators, setFilterLogicalOperators] = useState<('AND' | 'OR')[]>([]);
  const [isFilterPaneOpen, setIsFilterPaneOpen] = useState<boolean>(false);
  const [activeFilterName, setActiveFilterName] = useState<string>('');
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ 
    key: 'title', 
    direction: 'asc' 
  });
  
  // Berechtigungen
  const canCreateArticle = hasPermission('cerebro', 'both', 'button') || hasPermission('cerebro', 'both', 'page');
  
  // Spalten-Definitionen
  const cerebroColumns = useMemo(() => [
    { id: 'title', label: t('cerebro.filters.title', 'Titel') },
    { id: 'createdAt', label: t('cerebro.filters.createdAt', 'Erstellt am') },
    { id: 'updatedAt', label: t('cerebro.filters.updatedAt', 'Aktualisiert am') },
    { id: 'createdBy', label: t('cerebro.filters.createdBy', 'Erstellt von') },
    { id: 'parentId', label: t('cerebro.filters.category', 'Kategorie') },
    { id: 'githubPath', label: t('cerebro.filters.hasGithubPath', 'Hat GitHub-Pfad') },
    { id: 'isPublished', label: t('cerebro.filters.isPublished', 'Veröffentlicht') }
  ], [t]);
  
  // ✅ MEMORY: Cleanup - Filter States beim Unmount löschen
  useEffect(() => {
    return () => {
      setFilterConditions([]);
      setFilterLogicalOperators([]);
    };
  }, []); // Nur beim Unmount ausführen

  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 768;
      setIsMobile(newIsMobile);
      setIsTabletOrLarger(window.innerWidth >= 768);
      
      // Auf Tablet-Größen und größer immer öffnen
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Kommunikation mit der ArticleStructure-Komponente für die Sidebar-Steuerung
  useEffect(() => {
    // Event-Listener für Sidebar-Toggle-Nachrichten
    const handleSidebarToggle = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.open === 'boolean') {
        setSidebarOpen(event.detail.open);
      }
    };
    
    window.addEventListener('cerebro-sidebar-toggle' as any, handleSidebarToggle as any);
    return () => window.removeEventListener('cerebro-sidebar-toggle' as any, handleSidebarToggle as any);
  }, []);
  
  // Suche-Handler
  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/cerebro/search?q=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/cerebro/all');
    }
  };
  
  // Filter-Handler
  const applyFilterConditions = (
    conditions: FilterCondition[], 
    operators: ('AND' | 'OR')[],
    sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>
  ) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
    if (sortDirections && sortDirections.length > 0) {
      const firstSort = sortDirections[0];
      setSortConfig({ key: firstSort.column, direction: firstSort.direction });
    }
  };
  
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setSortConfig({ key: 'title', direction: 'asc' });
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  const handleFilterChange = (
    name: string, 
    id: number | null, 
    conditions: FilterCondition[], 
    operators: ('AND' | 'OR')[],
    sortDirections?: Array<{ column: string; direction: 'asc' | 'desc'; priority: number; conditionIndex: number }>
  ) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators, sortDirections);
  };
  
  // Sortier-Handler
  const handleSortClick = () => {
    // Wird in CerebroHeader gehandhabt
  };
  
  const handleSortChange = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  };
  
  return (
    <div className="min-h-screen dark:bg-gray-900">
      {/* Standard-Container-Pattern wie Worktracker/Consultations */}
      <div className="max-w-7xl mx-auto py-0 px-2 -mt-6 sm:-mt-3 lg:-mt-3 sm:px-4 lg:px-6">
        {/* Header-Bereich - EXAKT GLEICHE Padding-Werte wie aktuell */}
        <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className={`max-w-7xl mx-auto ${isMobile ? '' : 'px-5'}`}>
            <CerebroHeader
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSearchSubmit={handleSearch}
              canCreateArticle={canCreateArticle}
              onCreateArticle={() => navigate('/cerebro/create')}
              onFilterClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}
              onSortClick={handleSortClick}
              onSortChange={handleSortChange}
              activeFilterCount={filterConditions.length}
              sortConfig={sortConfig}
            />
          </div>
        </div>
        
        {/* FilterPane (ausklappbar) - EXAKT GLEICHE Padding-Werte wie aktuell */}
        {isFilterPaneOpen && (
          <div className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4' : 'px-5'} py-2`}>
              <FilterPane
                columns={cerebroColumns}
                onApply={applyFilterConditions}
                onReset={resetFilterConditions}
                savedConditions={filterConditions}
                savedOperators={filterLogicalOperators}
                tableId={CEREBRO_TABLE_ID}
              />
            </div>
          </div>
        )}
        
        {/* SavedFilterTags - EXAKT GLEICHE Padding-Werte wie aktuell */}
        <div className="w-full border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className={`max-w-7xl mx-auto ${isMobile ? 'px-4' : 'px-5'} py-2`}>
            <SavedFilterTags
              tableId={CEREBRO_TABLE_ID}
              onSelectFilter={applyFilterConditions}
              onReset={resetFilterConditions}
              activeFilterName={activeFilterName}
              selectedFilterId={selectedFilterId}
              onFilterChange={handleFilterChange}
              defaultFilterName="Alle Artikel" // ✅ FIX: Hardcodiert (konsistent mit DB)
            />
          </div>
        </div>
        
        {/* Sidebar + Main Flex-Layout - EXAKT GLEICHE Struktur wie aktuell */}
        <div className={`flex flex-1 overflow-hidden ${isTabletOrLarger ? 'fixed-height-container' : ''}`}>
          {/* Sidebar - EXAKT GLEICHE Breite und Position wie aktuell */}
          <div 
            className={`
              ${sidebarOpen ? 'w-60' : ''}
              ${isMobile && !sidebarOpen ? 'w-0' : ''} 
              transition-all duration-300 ease-in-out shrink-0
            `}
          >
            <ArticleStructure mdFiles={[]} />
          </div>
          
          {/* Main-Content - EXAKT GLEICHE Padding-Werte wie aktuell, aber <div> statt <main> */}
          <div className={`flex-grow ${isMobile ? 'overflow-y-container' : 'overflow-y-auto overflow-x-hidden'} ${
            isMobile 
              ? 'px-0 pt-2 pb-16' // Horizontales Padding auf 0, Bottom-Padding erhöht für den Footer
              : `pt-3 pb-4` // Padding wie aktuell, negatives Margin entfernt
          }`}>
            <div className={`${isMobile ? 'mobile-full-width' : 'max-w-7xl mx-auto px-5'}`}>
              <Outlet context={{ filterConditions, filterLogicalOperators, sortConfig, searchTerm }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inhalt für die Startseite - zeigt das README an
const CerebroHome: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{t('cerebro.home.title')}</h1>
      <GitHubMarkdownViewer 
        owner={GITHUB_OWNER}
        repo={GITHUB_REPO}
        path="docs/core/README.md"
        branch={GITHUB_BRANCH}
      />
    </div>
  );
};

// Markdown-Viewer für Dateien aus GitHub
const GitHubFileView: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [mdFile, setMdFile] = useState<{path: string, title: string} | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!slug) return;
    
    // Versuche den Artikel aus der Datenbank zu laden
    const loadArticle = async () => {
      try {
        setLoading(true);
        
        // Überprüfe, ob es einen Datenbankartikel mit diesem Slug gibt
        const article = await cerebroApi.articles.getArticleBySlug(slug);
        
        // Prüfen, ob es ein GitHub Markdown-Artikel ist
        // Dies wird in ArticleViewWithRouter bereits geprüft, aber wir prüfen es hier zur Sicherheit nochmal
        const markdownFolder = await cerebroApi.articles.getArticleBySlug('markdown-folder');
        if (markdownFolder && article.parentId === markdownFolder.id) {
          // Hat der Artikel einen githubPath?
          if (article.githubPath) {
            setMdFile({
              path: article.githubPath,
              title: article.title
            });
            setLoading(false);
            return;
          }
        }
        
        // Es handelt sich um einen normalen Artikel, also kein GitHub-Datei-Pfad notwendig
        // Der Rest der Verarbeitung wird in der ArticleView-Komponente fortgesetzt
        
        setLoading(false);
      } catch (err) {
        // Falls der Artikel nicht gefunden wurde, versuche es als Markdown aus GitHub zu laden
        console.log("Artikel nicht in der Datenbank gefunden, versuche als Markdown-Datei zu laden");
        
        // Fallback für den Fall, dass der Artikel nicht in der DB ist oder keinen githubPath hat
        // Lookup-Map für bekannte Markdown-Dateien und ihre richtigen Pfade
        const knownMdFiles: Record<string, {path: string, title: string}> = {
          'readme': { path: 'docs/core/README.md', title: 'Readme - Überblick' },
          'project-setup': { path: 'docs/core/ENTWICKLUNGSUMGEBUNG.md', title: 'Projekt-Einrichtung' },
          'dokumentationsstandards': { path: 'docs/core/DOKUMENTATIONSSTANDARDS.md', title: 'Dokumentationsstandards' },
          'design-standards': { path: 'docs/core/DESIGN_STANDARDS.md', title: 'Design-Standards' },
          'coding-standards': { path: 'docs/core/CODING_STANDARDS.md', title: 'Coding-Standards' },
          'modul-zeiterfassung': { path: 'docs/modules/MODUL_ZEITERFASSUNG.md', title: 'Modul: Zeiterfassung' },
          'cerebro-wiki': { path: 'docs/modules/MODUL_CEREBRO.md', title: 'Cerebro Wiki-System' },
          'modul-teamkontrolle': { path: 'docs/modules/MODUL_TEAMKONTROLLE.md', title: 'Modul: Teamkontrolle' },
          'modul-abrechnung': { path: 'docs/modules/MODUL_ABRECHNUNG.md', title: 'Modul: Abrechnung' },
          'db-schema': { path: 'docs/technical/DATENBANKSCHEMA.md', title: 'Datenbankschema' },
          'api-integration': { path: 'docs/technical/API_REFERENZ.md', title: 'API-Referenz' },
          'role-switch': { path: 'docs/modules/ROLE_SWITCH.md', title: 'Rollenwechsel-Funktionalität' },
          'changelog': { path: 'docs/core/CHANGELOG.md', title: 'Änderungshistorie' }
        };
        
        // HINWEIS: Diese Map dient nur als Fallback und sollte nach einem kompletten Datenbank-Update
        // mit githubPath-Werten für alle Artikel entfernt werden können
        
        // Für den Fall, dass es ein Custom-Artikel ist, mit korrektem Case im Namen
        if (knownMdFiles[slug]) {
          setMdFile(knownMdFiles[slug]);
        } else {
          // Fallback: Versuche den Dateinamen aus dem Slug abzuleiten
          setMdFile({
            path: `${slug}.md`,
            title: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
          });
        }
        
        setLoading(false);
      }
    };
    
    loadArticle();
  }, [slug]);
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!mdFile) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4 dark:text-white">{t('cerebro.fileView.fileNotFound')}</h1>
        <p className="dark:text-gray-300">{t('cerebro.fileView.fileNotFoundDescription')}</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">{mdFile.title}</h1>
      <GitHubMarkdownViewer 
        owner={GITHUB_OWNER}
        repo={GITHUB_REPO}
        path={mdFile.path}
        branch={GITHUB_BRANCH}
      />
    </div>
  );
};

// Komponente für alle Artikel
const CerebroAllArticles: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 dark:text-white">{t('cerebro.allArticles.title')}</h2>
      <ArticleList />
    </div>
  );
};

// Komponente für die Suche nach Artikeln
const CerebroSearch: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get('q') || '';

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold dark:text-white">{t('cerebro.search.title')} "{query}"</h2>
      </div>
      <ArticleList searchQuery={query} />
    </div>
  );
};

// Artikelansicht mit Weiche
const ArticleViewWithRouter: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [isMarkdownFile, setIsMarkdownFile] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [articleExists, setArticleExists] = useState<boolean>(false);
  
  useEffect(() => {
    const checkArticleType = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        
        // Prüfe, ob der Artikel in der Datenbank existiert
        const article = await cerebroApi.articles.getArticleBySlug(slug);
        setArticleExists(true);
        
        // Prüfe, ob der Artikel ein Markdown-Artikel ist
        try {
          const markdownFolder = await cerebroApi.articles.getArticleBySlug('markdown-folder');
          
          // Ein Artikel ist ein Markdown-Artikel, wenn:
          // 1. Er ein Kind des markdown-folders ist ODER
          // 2. Er einen githubPath hat
          if ((markdownFolder && article.parentId === markdownFolder.id) || article.githubPath) {
            setIsMarkdownFile(true);
          } else {
            setIsMarkdownFile(false);
          }
        } catch (err) {
          // Wenn der Markdown-Ordner nicht gefunden wird, prüfe nur auf githubPath
          console.warn('Markdown-Ordner nicht gefunden:', err);
          if (article.githubPath) {
            setIsMarkdownFile(true);
          } else {
            setIsMarkdownFile(false);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.log('Artikel nicht in der Datenbank gefunden, versuche als Markdown-Datei:', err);
        setArticleExists(false);
        setIsMarkdownFile(true);
        setLoading(false);
      }
    };
    
    checkArticleType();
  }, [slug]);
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Entscheide, was angezeigt wird basierend auf den ermittelten Informationen
  if (articleExists && !isMarkdownFile) {
    // Es ist ein normaler Artikel in der Datenbank
    return <ArticleView />;
  } else {
    // Es ist eine Markdown-Datei oder existiert nicht als Artikel in der Datenbank
    return <GitHubFileView />;
  }
};

// Hauptkomponente als Router
const Cerebro: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CerebroLayout />}>
        <Route index element={<CerebroHome />} />
        <Route path="all" element={<CerebroAllArticles />} />
        <Route path="search" element={<CerebroSearch />} />
        <Route path="create" element={<ArticleEdit />} />
        <Route path=":slug" element={<ArticleViewWithRouter />} />
        <Route path=":slug/edit" element={<ArticleEdit />} />
        <Route path=":slug/media/add" element={<AddMedia />} />
        <Route path=":slug/link/add" element={<AddExternalLink />} />
        <Route path=":slug/github/add" element={<GitHubLinkManagerWrapper />} />
      </Route>
    </Routes>
  );
};

export default Cerebro; 