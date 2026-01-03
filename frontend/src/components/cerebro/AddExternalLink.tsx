import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cerebroApi } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import { XMarkIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface LinkPreview {
  url: string;
  title: string;
  thumbnail: string | null;
  type: string | null;
}

const AddExternalLink: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  // Zustand
  const [url, setUrl] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  
  // ✅ BUTTON-BERECHTIGUNGEN: Korrekte Button-Entität verwenden
  const canAddLinks = hasPermission('cerebro_link_add', 'write', 'button');
  
  // URL-Änderung mit Debounce
  useEffect(() => {
    if (!url || url.trim() === '') {
      setPreview(null);
      return;
    }
    
    const timer = setTimeout(() => {
      getPreview(url);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [url]);
  
  // Vorschau abrufen
  const getPreview = async (urlToPreview: string) => {
    try {
      setPreviewLoading(true);
      
      if (!isValidUrl(urlToPreview)) {
        setError(t('cerebroLink.invalidUrl'));
        setPreviewLoading(false);
        return;
      }
      
      const previewData = await cerebroApi.externalLinks.getLinkPreview(urlToPreview);
      setPreview(previewData);
      
      // Titel automatisch übernehmen, wenn vorhanden
      if (previewData.title && !title) {
        setTitle(previewData.title);
      }
      
      setError(null);
    } catch (err) {
      console.error('Fehler beim Abrufen der Vorschau:', err);
      setError(t('cerebroLink.previewError'));
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // URL-Validierung
  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };
  
  // Formular absenden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim() || !isValidUrl(url)) {
      setError(t('cerebroLink.invalidUrl'));
      return;
    }
    
    if (!slug) {
      setError(t('cerebroLink.articleIdMissing'));
      return;
    }
    
    try {
      setLoading(true);
      
      await cerebroApi.externalLinks.createExternalLink({
        url: url.trim(),
        title: title.trim() || undefined,
        carticleSlug: slug
      });
      
      // Zurück zum Artikel navigieren
      navigate(`/cerebro/${slug}`);
    } catch (err) {
      console.error('Fehler beim Speichern des Links:', err);
      setError(t('cerebroLink.saveError'));
      setLoading(false);
    }
  };
  
  // Keine Berechtigung
  if (!canAddLinks) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {t('cerebroLink.noPermission')}
        </div>
        <button
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
          onClick={() => navigate(`/cerebro/${slug}`)}
        >
          {t('cerebroLink.backToArticle')}
        </button>
      </div>
    );
  }
  
  // Link-Typ anzeigen
  const getLinkTypeDisplay = (type: string | null) => {
    if (!type) return 'Standard-Link';
    
    switch (type) {
      case 'google_drive':
        return 'Google Drive Dokument';
      case 'youtube':
        return 'YouTube Video';
      default:
        return 'Externer Link';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('cerebroLink.title')}</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="url" className="block text-gray-700 font-medium mb-2">
              URL *
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://"
              required
            />
            <p className="text-sm text-gray-600 mt-1">
              {t('cerebroLink.enterFullUrl')}
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="title" className="block text-gray-700 font-medium mb-2">
              {t('common.description')}
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('cerebroLink.titleAutoFill')}
            />
            <p className="text-sm text-gray-600 mt-1">
              {t('cerebroLink.titleOptional')}
            </p>
          </div>
          
          {/* Link-Vorschau */}
          {previewLoading ? (
            <div className="mb-6 p-4 border rounded bg-gray-50">
              <div className="flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-2"></div>
                {t('cerebroLink.previewLoading')}
              </div>
            </div>
          ) : preview ? (
            <div className="mb-6 p-4 border rounded bg-gray-50">
              <h3 className="font-semibold mb-2">{t('cerebroLink.preview')}</h3>
              <div className="flex items-start">
                {preview.thumbnail && (
                  <img 
                    src={preview.thumbnail} 
                    alt={preview.title || 'Vorschau'} 
                    className="w-16 h-16 object-cover mr-3"
                  />
                )}
                <div>
                  <p className="font-medium">{preview.title || url}</p>
                  <p className="text-sm text-gray-600 mt-1">{getLinkTypeDisplay(preview.type)}</p>
                  <p className="text-sm text-gray-500 mt-1 break-all">{url}</p>
                </div>
              </div>
            </div>
          ) : null}
          
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/cerebro/${slug}`)}
              className="p-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              title={t('common.cancel')}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
            <button
              type="submit"
              className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              title={loading ? t('cerebroLink.saving') : t('cerebroLink.addLink')}
            >
              {loading ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : (
                <PlusIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddExternalLink; 