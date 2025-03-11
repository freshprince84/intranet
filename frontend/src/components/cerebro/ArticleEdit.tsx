import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cerebroApi, CerebroArticleDetail } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

// Typen
interface FormData {
  title: string;
  parentId: string | null;
  content: string;
}

// Quill Editor Konfiguration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['link', 'image', 'video'],
    ['clean']
  ],
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'color', 'background',
  'align',
  'link', 'image', 'video'
];

// Funktion zum Extrahieren von Links aus dem Inhalt
const extractLinks = (content: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.match(urlRegex) || [];
};

// Funktion zum Extrahieren von Bild-URLs aus dem Inhalt
const extractImageUrls = (content: string): string[] => {
  const imgRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|webp))/gi;
  return content.match(imgRegex) || [];
};

// Funktion zum Extrahieren von Video-URLs aus dem Inhalt
const extractVideoUrls = (content: string): string[] => {
  const videoRegex = /(https?:\/\/.*\.(?:mp4|webm|ogg))/gi;
  const youtubeRegex = /(https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([^&]+))/gi;
  const vimeoRegex = /(https?:\/\/(?:www\.)?vimeo\.com\/([0-9]+))/gi;
  
  const directVideos = content.match(videoRegex) || [];
  const youtubeVideos = content.match(youtubeRegex) || [];
  const vimeoVideos = content.match(vimeoRegex) || [];
  
  return [...directVideos, ...youtubeVideos, ...vimeoVideos];
};

// Funktion zum Extrahieren von PDF-URLs aus dem Inhalt
const extractPdfUrls = (content: string): string[] => {
  const pdfRegex = /(https?:\/\/.*\.pdf)/gi;
  return content.match(pdfRegex) || [];
};

// Funktion zum Erkennen von GitHub-Markdown-URLs
const isGitHubMarkdownUrl = (url: string): boolean => {
  return url.includes('github.com') && (url.endsWith('.md') || url.includes('/blob/') || url.includes('/raw/'));
};

// Hauptkomponente
const ArticleEdit: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  // Zustand
  const [formData, setFormData] = useState<FormData>({
    title: '',
    parentId: null,
    content: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<{id: string, title: string}[]>([]);
  const [isNewArticle, setIsNewArticle] = useState<boolean>(true);
  const [articleId, setArticleId] = useState<string | null>(null);
  
  // Automatische Erkennung von Links und Medien beim Ändern des Inhalts
  const handleContentChange = useCallback((content: string) => {
    setFormData(prev => ({ ...prev, content }));
    
    // Links und Medien extrahieren
    const links = extractLinks(content);
    const imageUrls = extractImageUrls(content);
    const videoUrls = extractVideoUrls(content);
    const pdfUrls = extractPdfUrls(content);
    
    // Automatisch Links und Medien hinzufügen, wenn der Artikel gespeichert wird
    setAutoDetectedMedia([...imageUrls, ...videoUrls, ...pdfUrls]);
    setAutoDetectedLinks(links.filter(link => 
      !imageUrls.includes(link) && 
      !videoUrls.includes(link) && 
      !pdfUrls.includes(link)
    ));
  }, []);
  
  // Zustand für automatisch erkannte Medien und Links
  const [autoDetectedMedia, setAutoDetectedMedia] = useState<string[]>([]);
  const [autoDetectedLinks, setAutoDetectedLinks] = useState<string[]>([]);
  
  // Überprüfen der Berechtigungen
  const canEditArticles = hasPermission('cerebro', 'write', 'cerebro');
  
  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Alle Artikel für die Elternauswahl laden
        const articlesData = await cerebroApi.articles.getAllArticles();
        setArticles(articlesData.map(article => ({
          id: article.id,
          title: article.title
        })));
        
        // Wenn ein Slug vorhanden ist, handelt es sich um eine Bearbeitung
        if (slug) {
          const article = await cerebroApi.articles.getArticleBySlug(slug);
          setIsNewArticle(false);
          setArticleId(article.id);
          setFormData({
            title: article.title,
            parentId: article.parentId,
            content: article.content || '',
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        setError('Fehler beim Laden der Daten. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [slug]);
  
  // Keine Berechtigung
  if (!canEditArticles) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Sie haben keine Berechtigung, Artikel zu bearbeiten.
        </div>
        <button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          onClick={() => navigate('/cerebro')}
        >
          Zurück zur Übersicht
        </button>
      </div>
    );
  }
  
  // Input-Änderung
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };
  
  // Formular absenden mit automatischer Erkennung
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Bitte geben Sie einen Titel ein.');
      return;
    }
    
    try {
      setSaving(true);
      
      let savedArticle;
      
      if (isNewArticle) {
        // Neuen Artikel erstellen
        savedArticle = await cerebroApi.articles.createArticle({
          title: formData.title,
          parentId: formData.parentId,
          content: formData.content
        });
      } else if (articleId) {
        // Bestehenden Artikel aktualisieren
        savedArticle = await cerebroApi.articles.updateArticle(articleId, {
          title: formData.title,
          parentId: formData.parentId,
          content: formData.content
        });
      }
      
      // Automatisch erkannte Medien und Links verarbeiten
      if (savedArticle) {
        // Links und Medien extrahieren
        const links = extractLinks(formData.content);
        const imageUrls = extractImageUrls(formData.content);
        const videoUrls = extractVideoUrls(formData.content);
        const pdfUrls = extractPdfUrls(formData.content);
        
        // Medien hinzufügen
        const mediaUrls = [...imageUrls, ...videoUrls, ...pdfUrls];
        for (const mediaUrl of mediaUrls) {
          try {
            let mediaType = 'other';
            if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) mediaType = 'image';
            else if (mediaUrl.match(/\.(mp4|webm|ogg)$/i) || mediaUrl.includes('youtube.com') || mediaUrl.includes('vimeo.com')) mediaType = 'video';
            else if (mediaUrl.match(/\.pdf$/i)) mediaType = 'pdf';
            
            // Formular für den Upload erstellen
            const formData = new FormData();
            formData.append('carticleId', savedArticle.id);
            formData.append('url', mediaUrl);
            formData.append('type', mediaType);
            formData.append('title', `Automatisch erkannt: ${mediaUrl.split('/').pop() || mediaUrl}`);
            formData.append('description', 'Automatisch erkannt aus dem Artikelinhalt');
            
            // Media hochladen
            await cerebroApi.media.uploadMedia(formData);
          } catch (err) {
            console.error(`Fehler beim Hinzufügen des Mediums ${mediaUrl}:`, err);
          }
        }
        
        // Links hinzufügen (ohne Medien)
        const linkUrls = links.filter(link => 
          !imageUrls.includes(link) && 
          !videoUrls.includes(link) && 
          !pdfUrls.includes(link)
        );
        
        for (const linkUrl of linkUrls) {
          try {
            const isGitHubMarkdown = isGitHubMarkdownUrl(linkUrl);
            
            await cerebroApi.externalLinks.createExternalLink({
              carticleSlug: savedArticle.slug,
              url: linkUrl,
              title: `Automatisch erkannt: ${linkUrl.split('/').pop() || linkUrl}`,
              type: isGitHubMarkdown ? 'github' : 'external'
            });
          } catch (err) {
            console.error(`Fehler beim Hinzufügen des Links ${linkUrl}:`, err);
          }
        }
      }
      
      navigate(`/cerebro/${savedArticle.slug}`);
    } catch (err) {
      console.error('Fehler beim Speichern des Artikels:', err);
      setError('Fehler beim Speichern des Artikels. Bitte versuchen Sie es später erneut.');
      setSaving(false);
    }
  };
  
  // Abbrechen
  const handleCancel = () => {
    if (slug) {
      navigate(`/cerebro/${slug}`);
    } else {
      navigate('/cerebro');
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isNewArticle ? 'Neuen Artikel erstellen' : 'Artikel bearbeiten'}
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Daten werden geladen...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label htmlFor="title" className="block text-gray-700 font-medium mb-2">
              Titel *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="parentId" className="block text-gray-700 font-medium mb-2">
              Elternartikel
            </label>
            <select
              id="parentId"
              name="parentId"
              value={formData.parentId || ''}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Kein Elternartikel (Root)</option>
              {articles
                .filter(article => article.id !== articleId) // Sich selbst ausschließen
                .map(article => (
                  <option key={article.id} value={article.id}>
                    {article.title}
                  </option>
                ))}
            </select>
            <p className="text-sm text-gray-600 mt-1">
              Optional. Wählen Sie einen übergeordneten Artikel aus, um eine Hierarchie zu erstellen.
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Inhalt</label>
            <div className="border border-gray-300 rounded-md">
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={handleContentChange}
                modules={quillModules}
                formats={quillFormats}
                className="h-64 mb-12"
              />
            </div>
            
            {/* Vorschau der automatisch erkannten Medien und Links */}
            {(autoDetectedMedia.length > 0 || autoDetectedLinks.length > 0) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Automatisch erkannt:</h3>
                
                {autoDetectedMedia.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Medien:</h4>
                    <ul className="list-disc pl-5 text-sm">
                      {autoDetectedMedia.map((url, index) => (
                        <li key={index} className="text-blue-600 hover:underline">
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {autoDetectedLinks.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-1">Links:</h4>
                    <ul className="list-disc pl-5 text-sm">
                      {autoDetectedLinks.map((url, index) => (
                        <li key={index} className="text-blue-600 hover:underline">
                          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  Diese Medien und Links werden automatisch mit dem Artikel gespeichert.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              {saving ? (
                <>
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                  Speichern...
                </>
              ) : (
                'Speichern'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ArticleEdit; 