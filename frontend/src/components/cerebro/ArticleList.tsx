import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cerebroApi, CerebroArticle } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';

// Icons
import { FaPlus, FaSearch, FaSortAlphaDown, FaSortAlphaUp, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';

// Typen für die Props
interface ArticleListProps {
  limit?: number;
  searchQuery?: string;
}

// Artikellisten-Komponente
const ArticleList: React.FC<ArticleListProps> = ({ limit, searchQuery: initialSearchQuery }) => {
  const [articles, setArticles] = useState<CerebroArticle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery || '');
  const [sortBy, setSortBy] = useState<'title' | 'updatedAt'>('updatedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canCreateArticle = hasPermission('cerebro', 'write', 'cerebro');
  
  // Artikel laden
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        
        // Wenn ein Suchbegriff übergeben wurde, direkt danach suchen
        if (initialSearchQuery) {
          const data = await cerebroApi.articles.searchArticles(initialSearchQuery);
          setArticles(data);
        } else {
          // Ansonsten alle Artikel laden
          const data = await cerebroApi.articles.getAllArticles();
          setArticles(data);
        }
        
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Artikel:', err);
        setError('Fehler beim Laden der Artikel. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, [initialSearchQuery]);
  
  // Artikel suchen
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Bei leerem Suchbegriff alle Artikel abrufen
      try {
        setLoading(true);
        const data = await cerebroApi.articles.getAllArticles();
        setArticles(data);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Artikel:', err);
        setError('Fehler beim Laden der Artikel. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
      return;
    }
    
    try {
      setLoading(true);
      const data = await cerebroApi.articles.searchArticles(searchQuery);
      setArticles(data);
      setError(null);
    } catch (err) {
      console.error('Fehler bei der Suche:', err);
      setError('Fehler bei der Suche. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading(false);
    }
  };
  
  // Sortierung umschalten
  const toggleSort = (field: 'title' | 'updatedAt') => {
    if (sortBy === field) {
      // Sortierrichtung umschalten
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Sortierfeld ändern und Richtung zurücksetzen
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // Artikel sortieren
  const sortedArticles = [...articles].sort((a, b) => {
    if (sortBy === 'title') {
      return sortDirection === 'asc' 
        ? a.title.localeCompare(b.title) 
        : b.title.localeCompare(a.title);
    } else {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });
  
  // Zum Artikel navigieren
  const navigateToArticle = (slug: string) => {
    navigate(`/cerebro/${slug}`);
  };
  
  // Neuen Artikel erstellen
  const navigateToCreateArticle = () => {
    navigate('/cerebro/create');
  };
  
  // Formatierungsfunktion für Datum
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Hilfsfunktion für den Anzeigenamen des Erstellers
  const getCreatorName = (article: CerebroArticle) => {
    if (article.creatorFirstName && article.creatorLastName) {
      return `${article.creatorFirstName} ${article.creatorLastName}`;
    }
    return 'Unbekannt';
  };

  // Hilfsfunktion für den übergeordneten Artikel
  const getParentTitle = (article: CerebroArticle) => {
    // Die parentId ist vorhanden, aber nicht der Titel des übergeordneten Artikels
    // in der Standard-Artikelliste
    return article.parentId ? 'Vorhanden' : 'Keine';
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold dark:text-white">Cerebro</h1>
        {canCreateArticle && (
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
            onClick={navigateToCreateArticle}
          >
            <FaPlus className="mr-2" /> Neuer Artikel
          </button>
        )}
      </div>
      
      {/* Suchleiste */}
      <div className="mb-6">
        <div className="flex">
          <input
            type="text"
            className="w-full md:w-[300px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Artikel suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md flex items-center"
            onClick={handleSearch}
          >
            <FaSearch />
          </button>
        </div>
      </div>
      
      {/* Fehlermeldung */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Ladeindikator */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
        </div>
      ) : (
        <>
          {/* Artikeltabelle */}
          {articles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Keine Artikel gefunden, die Ihren Suchkriterien entsprechen.' : 'Noch keine Artikel vorhanden.'}
            </div>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => toggleSort('title')}
                    >
                      <div className="flex items-center">
                        Titel
                        {sortBy === 'title' && (
                          sortDirection === 'asc' ? <FaSortAlphaDown className="ml-1" /> : <FaSortAlphaUp className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Erstellt von
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                      onClick={() => toggleSort('updatedAt')}
                    >
                      <div className="flex items-center">
                        Zuletzt aktualisiert
                        {sortBy === 'updatedAt' && (
                          sortDirection === 'asc' ? <FaSortAmountDown className="ml-1" /> : <FaSortAmountUp className="ml-1" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Übergeordnet
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sortedArticles.map((article) => (
                    <tr
                      key={article.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => navigateToArticle(article.slug)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{article.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{getCreatorName(article)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{formatDate(article.updatedAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {getParentTitle(article)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArticleList; 