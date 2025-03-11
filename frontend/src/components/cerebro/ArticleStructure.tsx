import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { cerebroApi, CerebroArticleStructure } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';

interface ArticleTreeProps {
  articles: CerebroArticleStructure[];
  currentSlug?: string;
  level?: number;
  expandedIds?: Set<string>;
  onToggleExpand?: (id: string) => void;
  onArticleClick?: (slug: string) => void;
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
              className={`flex items-center p-2 rounded hover:bg-gray-100 cursor-pointer ${
                isActive ? 'bg-blue-100 font-semibold text-blue-700' : ''
              }`}
              onClick={() => handleArticleClick(article.slug)}
            >
              {hasChildren ? (
                <button
                  onClick={(e) => handleExpandToggle(e, article.id)}
                  className="p-1 mr-1 rounded hover:bg-gray-200 focus:outline-none"
                >
                  <span className="inline-block w-4 h-4 text-center leading-4">
                    {isExpanded ? '▼' : '►'}
                  </span>
                </button>
              ) : (
                <span className="mr-2 text-gray-500 inline-block w-4 h-4 text-center leading-4">
                  📄
                </span>
              )}
              <span className="truncate">{article.title}</span>
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
const ArticleStructure: React.FC = () => {
  const navigate = useNavigate();
  const [structure, setStructure] = useState<CerebroArticleStructure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [canCreateArticle, setCanCreateArticle] = useState<boolean>(false);
  
  const { slug } = useParams<{ slug: string }>();
  const { hasPermission } = usePermissions();
  
  useEffect(() => {
    setCanCreateArticle(hasPermission('cerebro.article.create'));
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
  
  // Artikelstruktur laden
  useEffect(() => {
    const fetchStructure = async () => {
      try {
        setLoading(true);
        const data = await cerebroApi.articles.getArticlesStructure();
        setStructure(data);
        
        // Automatisch expandieren, um den aktuellen Artikel anzuzeigen
        if (slug) {
          const findAndExpandParents = (
            articles: CerebroArticleStructure[],
            targetSlug: string,
            parentIds: string[] = []
          ): string[] | null => {
            for (const article of articles) {
              if (article.slug === targetSlug) {
                return parentIds;
              }
              
              if (article.children && article.children.length > 0) {
                const found = findAndExpandParents(
                  article.children,
                  targetSlug,
                  [...parentIds, article.id]
                );
                
                if (found) {
                  return found;
                }
              }
            }
            
            return null;
          };
          
          const parentIds = findAndExpandParents(data, slug);
          if (parentIds) {
            setExpandedIds(new Set(parentIds));
          }
        }
        
        setError(null);
        setCanCreateArticle(true);
      } catch (err) {
        console.error('Fehler beim Laden der Artikelstruktur:', err);
        setError('Fehler beim Laden der Artikelstruktur. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStructure();
  }, [slug]);
  
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="min-h-screen">
      {/* Toggle-Button für Mobilgeräte - Nach oben links verschoben */}
      <div className="fixed z-20 top-4 left-4 md:hidden">
        <button
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-full shadow-md"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? "Seitenleiste schließen" : "Seitenleiste öffnen"}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>
      
      {/* Hauptcontainer */}
      <div className="flex flex-col md:flex-row">
        {/* Seitenleiste mit angepassten Breiten */}
        <div 
          className={`
            fixed top-0 bottom-0 z-20 transition-all duration-300 
            bg-white overflow-y-auto 
            ${sidebarOpen ? 'left-0 w-3/4 sm:w-3/5 md:w-1/3 lg:w-1/4' : '-left-full md:left-0 w-0 md:w-1/3 lg:w-1/4'}
            md:relative md:border-r-0 md:shadow-none md:p-0
          `}
        >
          {/* Schließen-Button innerhalb der Sidebar für Mobile */}
          {isMobile && sidebarOpen && (
            <button
              className="absolute top-2 right-2 bg-gray-200 hover:bg-gray-300 text-gray-800 p-1 rounded-full"
              onClick={toggleSidebar}
              aria-label="Seitenleiste schließen"
            >
              ✕
            </button>
          )}
          
          {/* Inhalt der Seitenleiste */}
          <div className="p-2 md:p-4">
            <h2 className="text-xl font-semibold mb-2">Cerebro Navigation</h2>
            {/* Suchfeld */}
            <div className="mb-2">
              <input
                type="text"
                placeholder="Artikel suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-1 border border-gray-300 rounded"
              />
            </div>
            
            {/* Button für neuen Artikel */}
            {canCreateArticle && (
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-2 rounded mb-2 flex items-center justify-center"
                onClick={() => navigate('/cerebro/create')}
              >
                <span className="mr-1">+</span> Neuer Artikel
              </button>
            )}
            
            {/* Artikelbaum mit Ladeanimation oder Fehlermeldung */}
            <div className="mt-1">
              {loading && (
                <div className="flex justify-center items-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-2 py-2 rounded text-sm">
                  {error}
                </div>
              )}
              
              {!loading && !error && structure.length === 0 && (
                <p className="text-gray-500 italic text-sm">Keine Artikel gefunden.</p>
              )}
              
              {!loading && !error && structure.length > 0 && (
                <ArticleTree 
                  articles={structure} 
                  currentSlug={slug} 
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  onArticleClick={(newSlug) => {
                    navigate(`/cerebro/${newSlug}`);
                    if (isMobile) setSidebarOpen(false);
                  }} 
                />
              )}
            </div>
          </div>
        </div>
        
        {/* Hauptinhalt */}
        <div className="flex-1 md:ml-0">
          <Outlet />
        </div>
        
        {/* Overlay für Mobile - Klicken schließt die Sidebar */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
            onClick={toggleSidebar}
          ></div>
        )}
      </div>
    </div>
  );
};

export default ArticleStructure; 