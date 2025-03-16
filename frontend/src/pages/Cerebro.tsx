import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Outlet, useParams, useLocation } from 'react-router-dom';
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
import ReactMarkdown from 'react-markdown';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Icon-Komponenten für Plus und Search hinzufügen nach dem Import-Bereich
const PlusIcon = () => <span className="mr-1">+</span>;
const SearchIcon = () => <span className="mr-1">🔍</span>;

// GitHub Repository-Informationen
const GITHUB_OWNER = 'freshprince84';
const GITHUB_REPO = 'intranet';
const GITHUB_BRANCH = 'main';

// Layout-Komponente, die die ArticleStructure enthält
const CerebroLayout: React.FC = () => {
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);
  const [isTabletOrLarger, setIsTabletOrLarger] = useState<boolean>(window.innerWidth >= 768);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(window.innerWidth >= 768);
  
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
  
  return (
    <div className={`flex min-h-screen w-full ${isTabletOrLarger ? 'fixed-height-container' : ''}`}>
      {/* Sidebar mit fester Breite auf Desktop, auf Mobile schiebt sie den Inhalt */}
      <div 
        className={`
          ${sidebarOpen ? 'w-60' : ''}
          ${isMobile && !sidebarOpen ? 'w-0' : ''} 
          transition-all duration-300 ease-in-out shrink-0
        `}
      >
        <ArticleStructure mdFiles={[]} />
      </div>
      
      {/* Der Hauptinhalt nimmt den restlichen Platz ein */}
      <main className={`flex-grow ${isMobile ? 'overflow-y-container' : 'overflow-y-auto'} ${
        isMobile 
          ? 'px-0 pt-2 pb-16' // Horizontales Padding auf 0, Bottom-Padding erhöht für den Footer
          : `pl-4 pt-3 pb-4 ${
              isTabletOrLarger && sidebarOpen 
                ? 'pr-10 md:pr-16 lg:pr-20' 
                : 'pr-4'
            }`
      }`}>
        <div className={isMobile ? 'mobile-full-width' : ''}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

// Inhalt für die Startseite - zeigt das README an
const CerebroHome: React.FC = () => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Readme - Überblick</h1>
      <GitHubMarkdownViewer 
        owner={GITHUB_OWNER}
        repo={GITHUB_REPO}
        path="README.md"
        branch={GITHUB_BRANCH}
      />
    </div>
  );
};

// Markdown-Viewer für Dateien aus GitHub
const GitHubFileView: React.FC = () => {
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
          'readme': { path: 'README.md', title: 'Readme - Überblick' },
          'project-setup': { path: 'PROJECT_SETUP.md', title: 'Projekt-Einrichtung' },
          'dokumentationsstandards': { path: 'DOKUMENTATIONSSTANDARDS.md', title: 'Dokumentationsstandards' },
          'design-standards': { path: 'DESIGN_STANDARDS.md', title: 'Design-Standards' },
          'coding-standards': { path: 'CODING_STANDARDS.md', title: 'Coding-Standards' },
          'modul-zeiterfassung': { path: 'MODUL_ZEITERFASSUNG.md', title: 'Modul: Zeiterfassung' },
          'cerebro-wiki': { path: 'MODUL_CEREBRO.md', title: 'Cerebro Wiki-System' },
          'modul-teamkontrolle': { path: 'MODUL_TEAMKONTROLLE.md', title: 'Modul: Teamkontrolle' },
          'modul-abrechnung': { path: 'MODUL_ABRECHNUNG.md', title: 'Modul: Abrechnung' },
          'db-schema': { path: 'DB_SCHEMA.md', title: 'Datenbankschema' },
          'api-integration': { path: 'API_INTEGRATION.md', title: 'API-Integration' },
          'role-switch': { path: 'ROLE_SWITCH.md', title: 'Rollenwechsel-Funktionalität' },
          'changelog': { path: 'CHANGELOG.md', title: 'Änderungshistorie' }
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
      <div className="bg-white p-6 rounded-lg shadow flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!mdFile) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-xl font-semibold mb-4">Datei nicht gefunden</h1>
        <p>Die angeforderte Markdown-Datei konnte nicht gefunden werden.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">{mdFile.title}</h1>
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
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Alle Artikel</h2>
      <ArticleList />
    </div>
  );
};

// Komponente für die Suche nach Artikeln
const CerebroSearch: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const query = queryParams.get('q') || '';

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center mb-6">
        <h2 className="text-xl font-semibold">Suchergebnisse für "{query}"</h2>
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
      <div className="bg-white p-6 rounded-lg shadow flex justify-center">
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