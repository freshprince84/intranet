import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cerebroApi, CerebroArticleDetail } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import GitHubMarkdownViewer from './GitHubMarkdownViewer.tsx';
import MarkdownPreview from '../MarkdownPreview.tsx';
import { formatDateTimeForCerebro } from '../../utils/dateUtils.ts';
import { getCerebroMediaUrl } from '../../config/api.ts';

// Heroicons
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  UserCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  LinkIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

// Icon-Implementierung mit Heroicons
const Icon = {
  Image: () => <PhotoIcon className="h-6 w-6 text-blue-500" />,
  Video: () => <FilmIcon className="h-6 w-6 text-red-500" />,
  PDF: () => <DocumentTextIcon className="h-6 w-6 text-red-700" />,
  File: () => <DocumentIcon className="h-6 w-6 text-gray-500" />,
  Download: () => <ArrowDownTrayIcon className="h-5 w-5 mr-1" />,
  GitHub: () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-800" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>,
  ExternalLink: () => <ArrowTopRightOnSquareIcon className="h-5 w-5 text-green-600" />,
  Link: () => <LinkIcon className="h-5 w-5 mr-1" />,
  Spinner: () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>,
  ArrowLeft: () => <ArrowLeftIcon className="h-5 w-5 mr-2" />,
  Edit: () => <PencilIcon className="h-5 w-5 mr-1" />,
  Trash: () => <TrashIcon className="h-5 w-5 mr-1" />,
  User: () => <UserCircleIcon className="h-5 w-5 mr-1" />,
  Clock: () => <ClockIcon className="h-5 w-5 mr-1" />,
  Plus: () => <PlusIcon className="h-5 w-5 mr-1" />
};

// Hauptkomponente für die Artikelansicht
const ArticleView: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  const [article, setArticle] = useState<CerebroArticleDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Überprüfen der Berechtigungen an die richtigen Berechtigungen anpassen
  const hasCerebroButtonPermission = hasPermission('cerebro', 'both', 'button');
  const hasCerebroPagePermission = hasPermission('cerebro', 'both', 'page');
  
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) {
        console.log('[ArticleView] Kein Slug vorhanden');
        return;
      }
      
      console.log('[ArticleView] Lade Artikel mit Slug:', slug);
      
      try {
        setLoading(true);
        
        // Artikel und verknüpfte Daten laden
        const articleData = await cerebroApi.articles.getArticleBySlug(slug);
        console.log('[ArticleView] Artikel geladen:', {
          id: articleData.id,
          title: articleData.title,
          slug: articleData.slug,
          githubPath: articleData.githubPath
        });
        setArticle(articleData);
        setError(null);
      } catch (err: any) {
        console.error('[ArticleView] Fehler beim Laden des Artikels:', err);
        console.error('[ArticleView] Slug war:', slug);
        console.error('[ArticleView] Fehler-Details:', err?.response?.data || err?.message);
        setError(t('cerebro.messages.loadError'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [slug]);
  
  
  const handleDeleteArticle = async () => {
    if (!article || !window.confirm(t('cerebro.messages.deleteConfirm'))) {
      return;
    }
    
    try {
      await cerebroApi.articles.deleteArticle(article.id);
      navigate('/cerebro');
    } catch (err) {
      console.error('Fehler beim Löschen des Artikels:', err);
      alert(t('cerebro.messages.deleteError'));
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Icon.Spinner />
      </div>
    );
  }
  
  if (error || !article) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <h3 className="font-bold">{t('common.error')}</h3>
        <p>{error || t('cerebro.messages.articleNotFound')}</p>
        <button 
          onClick={() => navigate('/cerebro')}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          <Icon.ArrowLeft /> {t('cerebro.actions.back')}
        </button>
      </div>
    );
  }
  
  // Artikel-Komponente rendern
  const renderContent = () => {
    // EINFACHE REGEL: githubPath vorhanden → von GitHub laden, sonst → aus DB
    if (article.githubPath) {
      // Content von GitHub laden
      return (
        <GitHubMarkdownViewer
          owner="freshprince84"
          repo="intranet"
          path={article.githubPath}
          branch="main"
        />
      );
    }
    
    // Content aus Datenbank anzeigen
    const attachmentMetadata = article.media.map(media => ({
      id: parseInt(media.id, 10),
      fileName: media.filename,
      fileType: media.mimetype,
      url: getCerebroMediaUrl(parseInt(media.id, 10))
    }));
    
    return (
      <div>
        <MarkdownPreview 
          content={article.content || ''}
          showImagePreview={true}
          attachmentMetadata={attachmentMetadata}
        />
        
        {/* Zeige ALLE Medien immer separat an (wie bei Requests & Tasks) */}
        {article.media.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3 dark:text-white">Angehängte Dateien</h3>
            <div className="flex flex-col gap-3">
              {article.media.map(media => {
                const mediaUrl = getCerebroMediaUrl(parseInt(media.id, 10));
                const isImage = media.mimetype.startsWith('image/');
                const isPdf = media.mimetype === 'application/pdf';
                const isVideo = media.mimetype.startsWith('video/');
                
                return (
                  <div key={media.id} className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                    {isImage ? (
                      <div>
                        <img 
                          src={mediaUrl} 
                          alt={media.filename} 
                          className="w-full h-auto max-h-96 object-contain" 
                          style={{ display: 'block' }}
                        />
                      </div>
                    ) : isPdf ? (
                      <div className="p-3">
                        <div className="flex items-center mb-2">
                          <DocumentTextIcon className="h-4 w-4 mr-2 dark:text-gray-300" />
                          <span className="text-sm font-medium dark:text-gray-200">{media.filename}</span>
                          <a 
                            href={mediaUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            Öffnen
                          </a>
                        </div>
                        <iframe 
                          src={`${mediaUrl}#view=FitH`} 
                          className="w-full rounded border dark:border-gray-600"
                          style={{ height: '400px' }}
                          title={media.filename}
                        />
                      </div>
                    ) : isVideo ? (
                      <div className="p-3">
                        <div className="flex items-center mb-2">
                          <FilmIcon className="h-4 w-4 mr-2 dark:text-gray-300" />
                          <span className="text-sm font-medium dark:text-gray-200">{media.filename}</span>
                          <a 
                            href={mediaUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            Öffnen
                          </a>
                        </div>
                        <video 
                          controls 
                          className="w-full rounded"
                          style={{ maxHeight: '400px' }}
                        >
                          <source src={mediaUrl} type={media.mimetype} />
                          Ihr Browser unterstützt das Video-Tag nicht.
                        </video>
                      </div>
                    ) : (
                      <div className="p-3 flex items-center">
                        <DocumentIcon className="h-4 w-4 mr-2 dark:text-gray-300" />
                        <a 
                          href={mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {media.filename}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      {/* Aktionsbereich oben (Button-Leiste) */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => navigate('/cerebro')}
          className="p-2 rounded-full text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label={t('cerebro.back')}
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        
        <div className="flex space-x-2">
          {hasCerebroButtonPermission && (
            <>
              <button 
                onClick={() => navigate(`/cerebro/${slug}/edit`)}
                className="p-2 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900"
                aria-label="Bearbeiten"
              >
                <PencilIcon className="h-5 w-5" />
              </button>
              
              <button 
                onClick={handleDeleteArticle}
                className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                aria-label={t('cerebro.delete')}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Artikelkopf mit Titel und Metadaten */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold dark:text-white">{article.title}</h1>
        <div className="flex text-gray-600 dark:text-gray-400 text-sm mt-2">
          <div className="flex items-center mr-4">
            <Icon.User /> 
            <span>{t('cerebro.createdBy')} {article.creatorFirstName} {article.creatorLastName}</span>
          </div>
          <div className="flex items-center">
            <Icon.Clock /> 
            <span>{t('cerebro.updatedAt')} {formatDateTimeForCerebro(article.updatedAt)}</span>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        {/* Inhalt des Artikels */}
        <div className="prose dark:prose-invert max-w-full overflow-x-hidden">
          {renderContent()}
        </div>
      </div>
      
      {/* Aktions-Buttons für Medien und Links */}
      {hasCerebroButtonPermission && (
        <div className="mb-6 flex space-x-2">
          <Link 
            to={`/cerebro/${slug}/media/add`}
            className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900"
            aria-label={t('cerebro.addMedia')}
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
          <Link 
            to={`/cerebro/${slug}/link/add`}
            className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900"
            aria-label={t('cerebro.addLink')}
          >
            <PlusIcon className="h-5 w-5" />
          </Link>
          <Link 
            to={`/cerebro/${slug}/github/add`}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={t('cerebro.addGitHubMarkdown')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </Link>
        </div>
      )}
      
      {/* Verknüpfte Tasks und Requests */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-2 dark:text-white">Verknüpfte Tasks</h2>
          <p className="text-gray-500 dark:text-gray-400">Keine Tasks verknüpft.</p>
        </div>
        
        <div className="border rounded p-4 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-2 dark:text-white">Verknüpfte Requests</h2>
          <p className="text-gray-500 dark:text-gray-400">Keine Requests verknüpft.</p>
        </div>
      </div>
    </div>
  );
};

export default ArticleView; 