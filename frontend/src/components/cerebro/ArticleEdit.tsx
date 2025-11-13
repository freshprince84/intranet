import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { cerebroApi, CerebroArticleDetail } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { useUnifiedEditor } from '../../hooks/useUnifiedEditor.ts';
import MarkdownPreview from '../MarkdownPreview.tsx';
import { XMarkIcon, CheckIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

// Typen
interface FormData {
  title: string;
  parentId: string | null;
  content: string;
}

// Hauptkomponente
const ArticleEdit: React.FC = () => {
  const { t } = useTranslation();
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
  const [articleSlug, setArticleSlug] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [temporaryMedia, setTemporaryMedia] = useState<Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    file: File;
    url: string;
  }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Überprüfen der Berechtigungen - an die richtigen Berechtigungen anpassen
  const hasCerebroButtonPermission = hasPermission('cerebro', 'both', 'button');
  const hasCerebroPagePermission = hasPermission('cerebro', 'both', 'page');
  const canEditArticles = hasCerebroButtonPermission || hasCerebroPagePermission;
  
  // Upload-Funktion für unified Editor
  const handleUpload = async (file: File): Promise<{ url: string; fileName: string }> => {
    // Für neue Artikel: Speichere temporär, wird nach dem Speichern hochgeladen
    if (isNewArticle && !articleSlug) {
      const tempUrl = URL.createObjectURL(file);
      const tempMedia = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        file: file,
        url: tempUrl
      };
      setTemporaryMedia(prev => [...prev, tempMedia]);
      
      // Temporären Platzhalter-URL zurückgeben
      return {
        url: 'wird nach dem Erstellen hochgeladen',
        fileName: file.name
      };
    }
    
    // Für bestehende Artikel: Direkt hochladen
    const formData = new FormData();
    formData.append('file', file);
    
    if (articleSlug) {
      formData.append('carticleSlug', articleSlug);
    } else {
      throw new Error('Artikel-Slug nicht gefunden.');
    }
    
    const media = await cerebroApi.media.uploadMedia(formData);
    
    // URL für das hochgeladene Medium generieren
    const mediaUrl = media.path.startsWith('http') 
      ? media.path 
      : `${window.location.origin}/api/cerebro/media/${media.id}/file`;
    
    return {
      url: mediaUrl,
      fileName: media.filename
    };
  };
  
  // Unified Editor Hook verwenden
  const { handlePaste, handleDrop, handleDragOver } = useUnifiedEditor({
    textareaRef,
    content: formData.content,
    setContent: (content) => setFormData(prev => ({ ...prev, content })),
    onUpload: handleUpload,
    setUploading,
    setError
  });
  
  // File Upload Handler für Button
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    await handleUpload(file);
    
    // Zurücksetzen des Datei-Inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
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
          setArticleSlug(article.slug);
          setFormData({
            title: article.title,
            parentId: article.parentId,
            content: article.content || '',
          });
        }
        
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err);
        setError(t('cerebro.articleEdit.loadError'));
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
          {t('cerebro.messages.noPermission')}
        </div>
        <button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          onClick={() => navigate('/cerebro')}
        >
          {t('cerebro.actions.backToOverview')}
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
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError(t('cerebro.articleEdit.titleRequired', { defaultValue: 'Titel ist erforderlich' }));
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
        // Slug aktualisieren für Upload-Funktion
        setArticleSlug(savedArticle.slug);
        
        // Temporäre Medien hochladen
        if (temporaryMedia.length > 0) {
          for (const tempMedia of temporaryMedia) {
            try {
              const uploadFormData = new FormData();
              uploadFormData.append('file', tempMedia.file);
              uploadFormData.append('carticleSlug', savedArticle.slug);
              
              await cerebroApi.media.uploadMedia(uploadFormData);
              
              // Temporäre URL aufräumen
              URL.revokeObjectURL(tempMedia.url);
            } catch (err) {
              console.error(`Fehler beim Hochladen des temporären Mediums ${tempMedia.fileName}:`, err);
            }
          }
          setTemporaryMedia([]);
        }
      } else if (articleId) {
        // Bestehenden Artikel aktualisieren
        savedArticle = await cerebroApi.articles.updateArticle(articleId, {
          title: formData.title,
          parentId: formData.parentId,
          content: formData.content
        });
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
            <label htmlFor="content" className="block text-gray-700 font-medium mb-2">
              Inhalt
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                id="content"
                rows={10}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                placeholder="Schreiben Sie hier Ihren Artikel in Markdown..."
              />
              {/* Heftklammer-Icon zum Hinzufügen von Dateien */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 left-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                title={t('cerebro.addFile')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800 bg-opacity-70 dark:bg-opacity-70">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Wird hochgeladen...</span>
                </div>
              )}
            </div>
            
            {/* Markdown-Vorschau - nur Tags, nicht den gesamten Inhalt */}
            {formData.content && (
              <div className="mt-3">
                <MarkdownPreview 
                  content={formData.content} 
                  temporaryAttachments={temporaryMedia.map(tm => ({
                    fileName: tm.fileName,
                    fileType: tm.fileType,
                    fileSize: tm.fileSize,
                    file: tm.file
                  }))}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
              title="Abbrechen"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
              title={saving ? 'Speichern...' : 'Speichern'}
            >
              {saving ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <CheckIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ArticleEdit; 