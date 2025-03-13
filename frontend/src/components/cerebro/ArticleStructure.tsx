import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet, Link } from 'react-router-dom';
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
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [canCreateArticle, setCanCreateArticle] = useState<boolean>(false);
  
  const { slug } = useParams<{ slug: string }>();
  const { hasPermission } = usePermissions();
  
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
      setIsMobile(window.innerWidth < 768);
      // Wenn nicht mehr mobil, Sidebar automatisch öffnen
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      }
    };
    
    // Initial setzen
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Seitenleiste bei initialer Darstellung auf Desktop-Geräten öffnen
  useEffect(() => {
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);
  
  // Lade die Artikelstruktur aus der Datenbank
  useEffect(() => {
    const fetchArticlesStructure = async () => {
      try {
        setLoading(true);
        // Hole die Artikelstruktur
        const structureData = await cerebroApi.articles.getArticlesStructure();
        
        // Finde den Markdown-Ordner
        const markdownFolderItem = structureData.find(article => article.title === 'Markdown-Dateien');
        
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
          structureData.filter(article => article.title !== 'Markdown-Dateien')
        );
        
        setLoading(false);
      } catch (err) {
        console.error('Fehler beim Laden der Artikelstruktur:', err);
        setError('Fehler beim Laden der Artikelstruktur. Bitte versuchen Sie es später erneut.');
        setLoading(false);
      }
    };
    
    fetchArticlesStructure();
  }, []);

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
          aria-label={sidebarOpen ? "Menü schließen" : "Menü öffnen"}
        >
          {sidebarOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
        </button>
      )}
      
      {/* Sidebar mit Artikelstruktur */}
      <div 
        className={`
          bg-white flex flex-col h-full
          ${isMobile 
            ? 'fixed top-[150px] left-0 z-20 transition-transform duration-300 ease-in-out w-60 max-h-[calc(100vh-228px)] border-r border-gray-200' 
            : 'w-full h-full border-r border-gray-200'}
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
                  className="p-2 rounded-full text-blue-600 hover:bg-blue-50"
                  onClick={() => navigate('/cerebro/create')}
                  aria-label="Neuen Artikel erstellen"
                >
                  <HPlusIcon className="h-5 w-5" />
                </button>
                {/* Tooltip */}
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  Neuen Artikel erstellen
                </div>
              </div>
            )}
            
            <form onSubmit={handleSearch} className="flex-1">
              <div className="flex">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Suchen..."
                  className="w-full px-3 py-1 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  type="submit"
                  className="p-2 rounded-r-md border border-l-0 border-gray-300 bg-white hover:bg-gray-50"
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
              <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-2 rounded text-sm">
                {error}
              </div>
            )}
            
            {/* Normale Artikel aus der Datenbank */}
            {!loading && databaseArticles.length > 0 && (
              <div className="space-y-1 mb-4">
                <h3 className="font-medium text-gray-700 mb-2">Artikel</h3>
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
                    className="mr-1 w-4 h-4 flex items-center justify-center text-gray-500"
                  >
                    {expandedIds.has(markdownFolder.id) ? <MinusIcon className="h-4 w-4" /> : <HPlusIcon className="h-4 w-4" />}
                  </button>
                  <h3 className="font-medium text-gray-700">{markdownFolder.title}</h3>
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
                            ? 'bg-blue-100 text-blue-800'
                            : 'hover:bg-gray-100'
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