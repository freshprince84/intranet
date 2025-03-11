import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions.ts';
import { cerebroApi, CerebroArticle, CerebroArticleDetail } from '../api/cerebroApi.ts';
import ArticleList from '../components/cerebro/ArticleList.tsx';
import ArticleView from '../components/cerebro/ArticleView.tsx';
import ArticleEdit from '../components/cerebro/ArticleEdit.tsx';
import ArticleStructure from '../components/cerebro/ArticleStructure.tsx';
import AddMedia from '../components/cerebro/AddMedia.tsx';
import AddExternalLink from '../components/cerebro/AddExternalLink.tsx';
import GitHubLinkManager from '../components/cerebro/GitHubLinkManager.tsx';
import ReactMarkdown from 'react-markdown';

// Icon-Komponenten für Plus und Search hinzufügen nach dem Import-Bereich
const PlusIcon = () => <span className="mr-1">+</span>;
const SearchIcon = () => <span className="mr-1">🔍</span>;

// Layout-Komponente, die die ArticleStructure enthält
const CerebroLayout: React.FC = () => {
  return (
    <div>
      <ArticleStructure />
      <Outlet />
    </div>
  );
};

// Inhalt für die Startseite
const CerebroHome: React.FC = () => {
  const navigate = useNavigate();
  const [handbuchSlug, setHandbuchSlug] = useState<string | null>(null);
  const [handbuch, setHandbuch] = useState<CerebroArticle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Benutzerhandbuch laden
  useEffect(() => {
    const fetchHandbuch = async () => {
      try {
        const handbuch = await cerebroApi.articles.searchArticles('benutzerhandbuch') as CerebroArticle[];
        if (handbuch && handbuch.length > 0) {
          setHandbuchSlug(handbuch[0].slug);
          setHandbuch(handbuch[0]);
        }
      } catch (error) {
        console.error('Fehler beim Laden des Benutzerhandbuchs:', error);
        setError('Fehler beim Laden des Benutzerhandbuchs. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchHandbuch();
  }, []);

  return (
    <div className="w-full p-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Benutzerhandbuch</h2>
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        ) : handbuch ? (
          <div className="prose max-w-none">
            <ReactMarkdown>{handbuch.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-gray-500 italic">
            Das Benutzerhandbuch wurde nicht gefunden. Bitte kontaktieren Sie einen Administrator.
          </p>
        )}
      </div>
    </div>
  );
};

// Alle Artikel anzeigen
const CerebroAllArticles: React.FC = () => {
  return (
    <div className="w-full p-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Alle Artikel</h2>
        <ArticleList />
      </div>
    </div>
  );
};

// Suchergebnisse anzeigen
const CerebroSearch: React.FC = () => {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const query = searchParams.get('q') || '';

  return (
    <div className="w-full p-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center mb-6">
          <h2 className="text-xl font-semibold">Suchergebnisse für "{query}"</h2>
        </div>
        <ArticleList searchQuery={query} />
      </div>
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
        <Route path=":slug" element={<ArticleView />} />
        <Route path=":slug/edit" element={<ArticleEdit />} />
        <Route path=":slug/media/add" element={<AddMedia />} />
        <Route path=":slug/link/add" element={<AddExternalLink />} />
        <Route path=":slug/github/add" element={<GitHubLinkManager />} />
      </Route>
    </Routes>
  );
};

export default Cerebro; 