import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useFilterContext } from '../contexts/FilterContext.tsx';
import { FilterCondition } from '../components/FilterRow.tsx';
import { applyFilters, GetFieldValue, ColumnEvaluator } from '../utils/filterLogic.ts';
import ReactMarkdown from 'react-markdown';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { logger } from '../utils/logger.ts';

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
  
  // Topbar-Ref und Höhe für dynamische Berechnung
  const topbarRef = useRef<HTMLDivElement>(null);
  const [topbarHeight, setTopbarHeight] = useState<number>(200); // Default: ~200px
  
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
  
  // Berechne Topbar-Höhe dynamisch
  useEffect(() => {
    const updateTopbarHeight = () => {
      if (topbarRef.current) {
        setTopbarHeight(topbarRef.current.clientHeight);
      }
    };
    
    // Initial berechnen
    updateTopbarHeight();
    
    // Bei FilterPane-Änderung neu berechnen (mit kleiner Verzögerung für DOM-Update)
    const timeoutId = setTimeout(updateTopbarHeight, 100);
    
    // Auch bei Resize neu berechnen
    window.addEventListener('resize', updateTopbarHeight);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateTopbarHeight);
    };
  }, [isFilterPaneOpen]);
  
  // Suche-Handler
  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/app/cerebro/search?q=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/app/cerebro/all');
    }
  };
  
  // Filter-Handler
  const applyFilterConditions = (
    conditions: FilterCondition[], 
    operators: ('AND' | 'OR')[]
  ) => {
    setFilterConditions(conditions);
    setFilterLogicalOperators(operators);
  };
  
  const resetFilterConditions = () => {
    setFilterConditions([]);
    setFilterLogicalOperators([]);
    setSortConfig({ key: 'title', direction: 'asc' });
    setActiveFilterName('');
    setSelectedFilterId(null);
  };
  
  const handleFilterChange = async (
    name: string, 
    id: number | null, 
    conditions: FilterCondition[], 
    operators: ('AND' | 'OR')[]
  ) => {
    setActiveFilterName(name);
    setSelectedFilterId(id);
    applyFilterConditions(conditions, operators);
  };
  
  // ✅ STANDARD: Filter-Laden und Default-Filter-Anwendung
  const filterContext = useFilterContext();
  const { loadFilters } = filterContext;
  
  useEffect(() => {
    const initialize = async () => {
      // 1. Filter laden (wartet auf State-Update)
      const filters = await loadFilters(CEREBRO_TABLE_ID);
      
      // 2. Default-Filter anwenden (IMMER vorhanden!)
      const defaultFilter = filters.find(f => f.name === 'Alle Artikel');
      if (defaultFilter) {
        await handleFilterChange(
          defaultFilter.name,
          defaultFilter.id,
          defaultFilter.conditions,
          defaultFilter.operators
        );
        return; // Filter wird angewendet
      }
      
      // 3. Fallback: Kein Filter (sollte nie passieren)
      // Cerebro filtert client-seitig, daher keine Daten-Lade-Funktion nötig
    };
    
    initialize();
  }, [loadFilters, handleFilterChange]);
  
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
        {/* Header-Bereich - FIXIERT mit sticky, nicht scrollbar */}
        <div 
          ref={topbarRef}
          className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
          data-cerebro-topbar
        >
          <div className={`max-w-7xl mx-auto ${isMobile ? '' : 'px-5'}`}>
            <CerebroHeader
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onSearchSubmit={handleSearch}
              canCreateArticle={canCreateArticle}
              onCreateArticle={() => navigate('/app/cerebro/create')}
              onFilterClick={() => setIsFilterPaneOpen(!isFilterPaneOpen)}
              onSortClick={handleSortClick}
              onSortChange={handleSortChange}
              activeFilterCount={filterConditions.length}
              sortConfig={sortConfig}
            />
        </div>
        
          {/* FilterPane (ausklappbar) - auch fixiert */}
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
        
          {/* SavedFilterTags - auch fixiert */}
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
        </div>
        
        {/* Sidebar + Main Flex-Layout - Topbar ist jetzt außerhalb, fixed-height-container entfernt */}
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

// Hauptkomponente als Router
const Cerebro: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CerebroLayout />}>
        <Route index element={<CerebroHome />} />
        <Route path="all" element={<CerebroAllArticles />} />
        <Route path="search" element={<CerebroSearch />} />
        <Route path="create" element={<ArticleEdit />} />
        <Route path=":slug/edit" element={<ArticleEdit />} />
        <Route path=":slug/media/add" element={<AddMedia />} />
        <Route path=":slug/link/add" element={<AddExternalLink />} />
        <Route path=":slug/github/add" element={<GitHubLinkManagerWrapper />} />
        <Route path=":slug" element={<ArticleView />} />
      </Route>
    </Routes>
  );
};

export default Cerebro; 