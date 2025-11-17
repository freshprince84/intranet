import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cerebroApi, CerebroArticleStructure } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { 
  Bars3Icon, 
  XMarkIcon, 
  PlusIcon as HPlusIcon, 
  MinusIcon, 
  MagnifyingGlassIcon 
} from '@heroicons/react/24/outline';

// Icon-Komponenten
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const SearchIcon = () => (
  <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
);

interface ArticleTreeProps {
  articles: CerebroArticleStructure[];
  currentSlug?: string;
  level?: number;
  expandedIds?: Set<string>;
  onToggleExpand?: (id: string) => void;
  onArticleClick?: (slug: string) => void;
}

interface MarkdownFile {
  path: string;
  title: string;
}

interface ArticleStructureProps {
  mdFiles: MarkdownFile[];
}

// Rekursive Komponente für die Baumansicht
const ArticleTree: React.FC<ArticleTreeProps> = ({ 
  articles, 
  currentSlug, 
  level = 0, 
  expandedIds = new Set(), 
  onToggleExpand,
  onArticleClick
}) => {
  const navigate = useNavigate();
  
  const handleArticleClick = (slug: string) => {
    if (onArticleClick) {
      onArticleClick(slug);
    }
  };
  
  const handleExpandToggle = (
    e: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    e.stopPropagation();
    if (onToggleExpand) {
      onToggleExpand(id);
    }
  };
  
  return (
    <ul className={`pl-${level > 0 ? '4' : '0'}`}>
      {articles.map((article) => {
        const hasChildren = article.children && article.children.length > 0;
        const isExpanded = expandedIds.has(article.id);
        const isActive = article.slug === currentSlug;
        
        return (
          <li key={article.id} className="mb-1">
            <div 
              className={`flex items-center py-1 px-2 rounded cursor-pointer ${
                isActive 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => handleArticleClick(article.slug)}
            >
              {hasChildren && (
                <button
                  onClick={(e) => handleExpandToggle(e, article.id)}
                  className="mr-1 w-4 h-4 flex items-center justify-center text-gray-500"
                >
                  {isExpanded ? <MinusIcon className="h-4 w-4" /> : <HPlusIcon className="h-4 w-4" />}
                </button>
              )}
              
              <span className="flex-1 truncate">
                {article.title}
              </span>
            </div>
            
            {hasChildren && isExpanded && (
              <ArticleTree 
                articles={article.children} 
                currentSlug={currentSlug}
                level={level + 1}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onArticleClick={onArticleClick}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
};

// Hauptkomponente für die Artikelstruktur
const ArticleStructure: React.FC<ArticleStructureProps> = ({ mdFiles }) => {
  const navigate = useNavigate();
  const [structure, setStructure] = useState<CerebroArticleStructure[]>([]);
  const [databaseArticles, setDatabaseArticles] = useState<CerebroArticleStructure[]>([]);
  const [markdownFolder, setMarkdownFolder] = useState<CerebroArticleStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 720);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(window.innerWidth >= 720);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [canCreateArticle, setCanCreateArticle] = useState<boolean>(false);
  
  const { slug } = useParams<{ slug: string }>();
  const { hasPermission } = usePermissions();
  const { t } = useTranslation();
  
  // Berechtigungsprüfung für den Neuer Artikel-Button
  useEffect(() => {
    // Prüfe nur die vorhandenen Berechtigungen aus dem Bild
    const hasCerebroButtonPermission = hasPermission('cerebro', 'both', 'button');
    const hasCerebroPagePermission = hasPermission('cerebro', 'both', 'page');
    
    console.log('Berechtigungsprüfung:');
    console.log('cerebro.both.button:', hasCerebroButtonPermission);
    console.log('cerebro.both.page:', hasCerebroPagePermission);
    
    // Setze canCreateArticle auf true, wenn mindestens eine der Berechtigungen vorhanden ist
    setCanCreateArticle(hasCerebroButtonPermission || hasCerebroPagePermission);
  }, [hasPermission]);
  
  useEffect(() => {
    const handleResize = () => {
      const newIsMobile = window.innerWidth < 720;
      setIsMobile(newIsMobile);
      
      // Nur bei Größenänderungen die Sidebar anpassen
      // Auf Tablet-Größen und größer: automatisch öffnen
      // Auf mobilen Geräten: geschlossen lassen
      if (window.innerWidth >= 720) {
        setSidebarOpen(true);
      }
    };
    
    // Initial setzen
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Lade die Artikelstruktur aus der Datenbank
  const fetchArticlesStructure = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Hole die Artikelstruktur
      const structureData = await cerebroApi.articles.getArticlesStructure();
      
      // Prüfe, ob die Daten gültig sind
      if (!Array.isArray(structureData)) {
        console.error('Ungültige Antwort von der API:', structureData);
        setError('Ungültige Antwort vom Server. Bitte versuchen Sie es später erneut.');
        setLoading(false);
        return;
      }
      
      // Rekursive Funktion zur Normalisierung der IDs (Backend gibt manchmal numbers zurück)
      const normalizeArticle = (article: any): any => {
        const normalized: any = {
          ...article,
          id: String(article.id),
          parentId: article.parentId ? String(article.parentId) : null
        };
        
        if (article.children && Array.isArray(article.children)) {
          normalized.children = article.children.map((child: any) => normalizeArticle(child));
        }
        
        return normalized;
      };
      
      // Konvertiere IDs zu Strings, falls nötig
      const normalizedData = structureData.map(article => normalizeArticle(article));
      
      // Finde den Markdown-Ordner
      const markdownFolderItem = normalizedData.find(article => article.title === 'Markdown-Dateien');
      
      if (markdownFolderItem) {
        setMarkdownFolder(markdownFolderItem);
        
        // Expandiere den Markdown-Ordner standardmäßig, damit die Dateien sichtbar sind
        setExpandedIds(prev => {
          const newSet = new Set(prev);
          newSet.add(markdownFolderItem.id);
          return newSet;
        });
      } else {
        console.warn('Markdown-Ordner nicht gefunden!');
      }
      
      // Setze alle Artikel außer dem Markdown-Ordner in databaseArticles
      setDatabaseArticles(
        normalizedData.filter(article => article.title !== 'Markdown-Dateien')
      );
      
      setLoading(false);
    } catch (err: any) {
      console.error('Fehler beim Laden der Artikelstruktur:', err);
      
      // Detaillierte Fehlermeldung
      let errorMessage = 'Fehler beim Laden der Artikelstruktur. Bitte versuchen Sie es später erneut.';
      
      if (err?.response?.status === 401) {
        errorMessage = 'Sie sind nicht angemeldet. Bitte melden Sie sich an.';
      } else if (err?.response?.status === 403) {
        errorMessage = 'Sie haben keine Berechtigung, die Artikelstruktur anzuzeigen.';
      } else if (err?.response?.status >= 500) {
        errorMessage = 'Serverfehler. Bitte versuchen Sie es später erneut.';
      } else if (err?.message) {
        errorMessage = `Fehler: ${err.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchArticlesStructure();
    
    // Event-Listener für Artikel-Erstellung
    const handleArticleCreated = () => {
      fetchArticlesStructure();
    };
    
    window.addEventListener('cerebro-article-created', handleArticleCreated);
    
    return () => {
      window.removeEventListener('cerebro-article-created', handleArticleCreated);
    };
  }, [fetchArticlesStructure]);
  
  // Struktur auch bei Route-Änderungen aktualisieren (wenn Slug sich ändert)
  useEffect(() => {
    if (slug) {
      // Kurze Verzögerung, damit der Server Zeit hat, den neuen Artikel zu speichern
      const timeoutId = setTimeout(() => {
        fetchArticlesStructure();
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [slug, fetchArticlesStructure]);

  // Handling für die Suche
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/cerebro/search?q=${encodeURIComponent(searchTerm)}`);
      if (isMobile) {
        setSidebarOpen(false);
      }
    }
  };
  
  // Auf/Zuklappen von Kategorien
  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };
  
  // Sidebar Toggle für Mobile
  const toggleSidebar = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    
    // Sende Event an die übergeordnete Komponente
    const event = new CustomEvent('cerebro-sidebar-toggle', { 
      detail: { open: newState } 
    });
    window.dispatchEvent(event);
  };
  
  return (
    <nav className="h-full overflow-hidden flex flex-col">
      {/* Mobile Toggle-Button - nur für sehr kleine Geräte sichtbar */}
      {isMobile && (
        <button 
          className="fixed top-[85px] left-4 z-40 p-2 rounded-full text-gray-600 hover:bg-gray-100 md:hidden"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? t('cerebro.menuClose') : t('cerebro.menuOpen')}
        >
          {sidebarOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      )}
      
      {/* Sidebar mit Artikelstruktur */}
      <div 
        className={`
          bg-white dark:bg-gray-800 flex flex-col h-full
          ${isMobile 
            ? 'fixed top-[150px] left-0 z-20 transition-transform duration-300 ease-in-out w-60 max-h-[calc(100vh-228px)] border-r border-gray-200 dark:border-gray-700' 
            : 'w-full h-full border-r border-gray-200 dark:border-gray-700'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
        `}
      >
        <div className={`p-2 ${isMobile ? 'pt-4' : 'pt-6'} flex-grow flex flex-col overflow-hidden`}>
          {/* X-Button zum Schließen ENTFERNT */}
          
          {/* Suchformular mit Button daneben */}
          <div className="mb-3 flex items-center space-x-2">
            {/* Neuer Artikel Button links vom Suchfeld */}
            {canCreateArticle && (
              <div className="relative group">
                <button
                  className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900"
                  onClick={() => navigate('/cerebro/create')}
                  aria-label={t('cerebro.actions.createArticle')}
                >
                  <HPlusIcon className="h-5 w-5" />
                </button>
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                  {t('cerebro.actions.createArticle')}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSearch} className="flex-1">
              <div className="flex">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('common.searchPlaceholder', { defaultValue: 'Suchen...' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  data-onboarding="cerebro-search"
                />
                <button
                  type="submit"
                  className="p-2 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  aria-label="Suchen"
                >
                  <SearchIcon />
                </button>
              </div>
            </form>
          </div>
          
          {/* Artikelbaum mit Ladeanimation oder Fehlermeldung */}
          <div className="overflow-y-auto flex-grow">
            {/* Ladeanimation */}
            {loading && (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            {/* Fehlermeldung */}
            {error && (
              <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-2 py-2 rounded text-sm">
                {error}
              </div>
            )}
            
            {/* Normale Artikel aus der Datenbank */}
            {!loading && databaseArticles.length > 0 && (
              <div className="space-y-1 mb-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">{t('cerebro.article', { defaultValue: 'Artikel' })}</h3>
                <ArticleTree 
                  articles={databaseArticles} 
                  currentSlug={slug}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onArticleClick={(slug) => navigate(`/cerebro/${slug}`)}
                />
              </div>
            )}
            
            {/* Markdown-Dateien-Bereich */}
            {!loading && markdownFolder && (
              <div className="mt-4">
                <div className="flex items-center">
                  <button
                    onClick={() => handleToggleExpand(markdownFolder.id)}
                    className="mr-1 w-4 h-4 flex items-center justify-center text-gray-500 dark:text-gray-400"
                  >
                    {expandedIds.has(markdownFolder.id) ? <MinusIcon className="h-4 w-4" /> : <HPlusIcon className="h-4 w-4" />}
                  </button>
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">{markdownFolder.title}</h3>
                </div>
                
                {/* Wenn expandiert, zeige die Markdown-Dateien an */}
                {expandedIds.has(markdownFolder.id) && markdownFolder.children?.length > 0 && (
                  <div className="ml-4 mt-2 space-y-1">
                    {markdownFolder.children.map((mdFile) => (
                      <Link 
                        key={mdFile.id}
                        to={`/cerebro/${mdFile.slug}`}
                        className={`block truncate px-2 py-1 rounded-md ${
                          mdFile.slug === slug
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {mdFile.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Overlay für Mobile - Klicken schließt die Sidebar - ENTFERNT, damit der Artikel nicht ausgegraut wird */}
      {/* 
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      */}
    </nav>
  );
};

export default ArticleStructure; 