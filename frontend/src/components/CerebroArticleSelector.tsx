import React, { useState, useEffect } from 'react';
import axios from 'axios';
import axiosInstance from '../config/axios.ts';
import { API_ENDPOINTS } from '../config/api.ts';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';
import { XCircleIcon } from '@heroicons/react/24/solid';
import debounce from 'lodash/debounce';

interface CerebroArticle {
  id: number;
  title: string;
  slug: string;
  content?: string;
}

interface CerebroArticleSelectorProps {
  onArticleSelected: (article: CerebroArticle) => void;
  excludeArticleIds?: number[];
  selectedArticles?: CerebroArticle[];
  onArticleRemove?: (articleId: number) => void;
}

const CerebroArticleSelector: React.FC<CerebroArticleSelectorProps> = ({
  onArticleSelected,
  excludeArticleIds = [],
  selectedArticles,
  onArticleRemove
}) => {
  const [articles, setArticles] = useState<CerebroArticle[]>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(null);
  const [selectedArticlePreview, setSelectedArticlePreview] = useState<CerebroArticle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Alle Artikel beim Laden abrufen
  useEffect(() => {
    const fetchAllArticles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axiosInstance.get(API_ENDPOINTS.CEREBRO.ARTICLES.BASE);
        
        // Filtere bereits ausgewählte Artikel
        const filteredArticles = response.data.filter(
          (article: CerebroArticle) => !excludeArticleIds.includes(article.id)
        );
        
        setArticles(filteredArticles);
      } catch (err) {
        console.error('Fehler beim Abrufen der Artikel:', err);
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || err.message);
        } else {
          setError('Ein unerwarteter Fehler ist aufgetreten');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAllArticles();
  }, [excludeArticleIds]);

  // Artikeldetails abrufen, wenn ein Artikel ausgewählt wird
  const fetchArticleDetails = async (articleId: number) => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(API_ENDPOINTS.CEREBRO.ARTICLES.BY_ID(articleId));
      setSelectedArticlePreview(response.data);
    } catch (err) {
      console.error('Fehler beim Abrufen der Artikeldetails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const articleId = parseInt(e.target.value, 10);
    
    if (!isNaN(articleId)) {
      setSelectedArticleId(articleId);
      
      // Artikel aus der Liste finden
      const selectedArticle = articles.find(article => article.id === articleId);
      
      if (selectedArticle) {
        // Artikeldetails abrufen für die Vorschau
        fetchArticleDetails(articleId);
      }
    } else {
      setSelectedArticleId(null);
      setSelectedArticlePreview(null);
    }
  };

  const handleArticleConfirm = () => {
    if (selectedArticleId !== null) {
      const selectedArticle = articles.find(article => article.id === selectedArticleId);
      if (selectedArticle) {
        onArticleSelected(selectedArticle);
        setSelectedArticleId(null);
        setSelectedArticlePreview(null);
      }
    }
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Cerebro-Artikel verknüpfen
      </label>
      
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedArticleId || ''}
            onChange={handleArticleSelect}
          >
            <option value="">-- Artikel auswählen --</option>
            {articles.map((article) => (
              <option key={article.id} value={article.id}>
                {article.title}
              </option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={handleArticleConfirm}
            disabled={selectedArticleId === null}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verknüpfen
          </button>
        </div>

        {loading && (
          <div className="text-sm text-gray-500">
            Lade Artikel...
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}
        
        {selectedArticlePreview && (
          <div className="mt-2 p-4 border border-gray-300 rounded-md bg-gray-50">
            <h4 className="font-medium text-lg mb-2">{selectedArticlePreview.title}</h4>
            <div className="prose prose-sm max-w-none">
              {selectedArticlePreview.content ? (
                <div className="text-sm text-gray-700 max-h-40 overflow-y-auto">
                  {selectedArticlePreview.content.substring(0, 300)}
                  {selectedArticlePreview.content.length > 300 && '...'}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Kein Inhalt verfügbar</p>
              )}
            </div>
            <div className="mt-2">
              <a 
                href={`/cerebro/articles/${selectedArticlePreview.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                Artikel öffnen
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CerebroArticleSelector; 