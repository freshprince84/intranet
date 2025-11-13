import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { cerebroApi, CerebroArticleDetail, CerebroMedia, CerebroExternalLink } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import GitHubMarkdownViewer from './GitHubMarkdownViewer.tsx';
import CollapsibleCode from './CollapsibleCode.tsx';
import { formatDateTimeForCerebro } from '../../utils/dateUtils.ts';

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

// Typen für die Medienvorschau
type MediaType = 'image' | 'video' | 'pdf' | 'other';

// Medientyp basierend auf MIME-Typ bestimmen
const getMediaType = (mimetype: string): MediaType => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'other';
};

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

// Medienvorschau-Komponente
const MediaPreview: React.FC<{ media: CerebroMedia }> = ({ media }) => {
  const mediaType = getMediaType(media.mimetype);
  const mediaPath = `/uploads/cerebro/${media.path.split('/').pop()}`;
  
  // Icon basierend auf Medientyp
  const getMediaIcon = () => {
    switch(mediaType) {
      case 'image': return <Icon.Image />;
      case 'video': return <Icon.Video />;
      case 'pdf': return <Icon.PDF />;
      default: return <Icon.File />;
    }
  };
  
  return (
    <div className="border rounded p-3 mb-2 hover:bg-gray-50">
      <div className="flex items-center">
        {getMediaIcon()}
        <span className="ml-2 flex-grow">{media.filename}</span>
        <a 
          href={mediaPath} 
          download={media.filename}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <Icon.Download /> Download
        </a>
      </div>
      
      {mediaType === 'image' && (
        <div className="mt-2">
          <img 
            src={mediaPath} 
            alt={media.filename} 
            className="max-w-full h-auto rounded"
            style={{ maxHeight: '200px' }}
          />
        </div>
      )}
      
      {mediaType === 'video' && (
        <div className="mt-2">
          <video 
            controls 
            className="max-w-full rounded"
            style={{ maxHeight: '200px' }}
          >
            <source src={mediaPath} type={media.mimetype} />
            Ihr Browser unterstützt das Video-Tag nicht.
          </video>
        </div>
      )}
      
      {mediaType === 'pdf' && (
        <div className="mt-2">
          <iframe 
            src={`${mediaPath}#view=FitH`} 
            className="w-full rounded border"
            style={{ height: '200px' }}
            title={media.filename}
          ></iframe>
        </div>
      )}
    </div>
  );
};

// Externe Link Vorschau
const ExternalLinkPreview: React.FC<{ link: CerebroExternalLink }> = ({ link }) => {
  const isGoogleDrive = link.type === 'google_drive';
  const isYoutube = link.type === 'youtube';
  const isGitHubMarkdown = link.type === 'github_markdown';
  
  // GitHub URL parsen
  const parseGitHubUrl = (url: string): { owner: string; repo: string; path: string; branch: string; } | null => {
    try {
      let owner = '';
      let repo = '';
      let path = '';
      let branch = '';
      
      if (url.includes('raw.githubusercontent.com')) {
        const parts = url.replace('https://raw.githubusercontent.com/', '').split('/');
        owner = parts[0];
        repo = parts[1];
        branch = parts[2];
        path = parts.slice(3).join('/');
      } else if (url.includes('github.com')) {
        const parts = url.replace('https://github.com/', '').split('/');
        owner = parts[0];
        repo = parts[1];
        const typeIndex = parts.indexOf('blob') !== -1 ? parts.indexOf('blob') : parts.indexOf('raw');
        branch = parts[typeIndex + 1];
        path = parts.slice(typeIndex + 2).join('/');
      } else {
        return null;
      }
      
      return { owner, repo, path, branch };
    } catch (err) {
      console.error('Fehler beim Parsen der GitHub-URL:', err);
      return null;
    }
  };
  
  // Für GitHub Markdown-Links
  const githubInfo = isGitHubMarkdown ? parseGitHubUrl(link.url) : null;
  
  return (
    <div className="border rounded p-3 mb-2 hover:bg-gray-50">
      <div className="flex items-center">
        {isGitHubMarkdown ? (
          <Icon.GitHub />
        ) : (
          <Icon.ExternalLink />
        )}
        <span className="ml-2 flex-grow">{link.title || link.url}</span>
        <a 
          href={link.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
                <Icon.Link /> {t('cerebro.actions.open')}
        </a>
      </div>
      
      {isGoogleDrive && (
        <div className="mt-2">
          <iframe 
            src={`${link.url.replace('view', 'preview')}`} 
            className="w-full rounded border"
            style={{ height: '300px' }}
            title={link.title || 'Google Drive Dokument'}
            allow="autoplay"
          ></iframe>
        </div>
      )}
      
      {isYoutube && (
        <div className="mt-2">
          <iframe 
            src={link.url.replace('watch?v=', 'embed/')} 
            className="w-full rounded border"
            style={{ height: '300px' }}
            title={link.title || 'YouTube Video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      )}
      
      {isGitHubMarkdown && githubInfo && (
        <div className="mt-2">
          <div className="bg-gray-100 p-2 rounded mb-2 flex items-center text-xs">
            <span className="font-mono text-gray-600">{githubInfo.owner}/{githubInfo.repo}/{githubInfo.path}</span>
            <span className="ml-2 px-2 py-1 bg-gray-200 rounded">{githubInfo.branch}</span>
          </div>
          <GitHubMarkdownViewer
            owner={githubInfo.owner}
            repo={githubInfo.repo}
            path={githubInfo.path}
            branch={githubInfo.branch}
          />
        </div>
      )}
    </div>
  );
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
  const [githubLinks, setGithubLinks] = useState<CerebroExternalLink[]>([]);
  const [externalLinks, setExternalLinks] = useState<CerebroExternalLink[]>([]);
  const [mediaFiles, setMediaFiles] = useState<CerebroMedia[]>([]);
  const [selectedGithubLink, setSelectedGithubLink] = useState<CerebroExternalLink | null>(null);
  
  // Überprüfen der Berechtigungen an die richtigen Berechtigungen anpassen
  const hasCerebroButtonPermission = hasPermission('cerebro', 'both', 'button');
  const hasCerebroPagePermission = hasPermission('cerebro', 'both', 'page');
  
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        
        // Artikel und verknüpfte Daten laden
        const articleData = await cerebroApi.articles.getArticleBySlug(slug);
        setArticle(articleData);
        
        // Sortiere GitHub-Markdown Links und andere externe Links
        const github = articleData.externalLinks.filter(link => link.type === 'github_markdown');
        const other = articleData.externalLinks.filter(link => link.type !== 'github_markdown');
        
        setGithubLinks(github);
        setExternalLinks(other);
        setMediaFiles(articleData.media);
        
        if (github.length > 0) {
          setSelectedGithubLink(github[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden des Artikels:', err);
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
    // Prüfe, ob der Artikel mit GitHub-Markdown verknüpft ist und ein Link ausgewählt ist
    if (selectedGithubLink) {
      // GitHub-Markdown-Links parsen
      const parseGitHubUrl = (url: string): { owner: string; repo: string; path: string; branch: string; } | null => {
        try {
          let owner = '';
          let repo = '';
          let path = '';
          let branch = '';
          
          if (url.includes('raw.githubusercontent.com')) {
            const parts = url.replace('https://raw.githubusercontent.com/', '').split('/');
            owner = parts[0];
            repo = parts[1];
            branch = parts[2];
            path = parts.slice(3).join('/');
          } else if (url.includes('github.com')) {
            const parts = url.replace('https://github.com/', '').split('/');
            owner = parts[0];
            repo = parts[1];
            const typeIndex = parts.indexOf('blob') !== -1 ? parts.indexOf('blob') : parts.indexOf('raw');
            branch = parts[typeIndex + 1];
            path = parts.slice(typeIndex + 2).join('/');
          } else {
            return null;
          }
          
          return { owner, repo, path, branch };
        } catch (err) {
          console.error('Fehler beim Parsen der GitHub-URL:', err);
          return null;
        }
      };
      
      const githubInfo = parseGitHubUrl(selectedGithubLink.url);
      
      if (githubInfo) {
        return (
          <div>
            <div className="bg-gray-100 p-2 rounded mb-4 flex justify-between items-center text-xs">
              <div>
                <span className="font-mono text-gray-600">{githubInfo.owner}/{githubInfo.repo}/{githubInfo.path}</span>
                <span className="ml-2 px-2 py-1 bg-gray-200 rounded">{githubInfo.branch}</span>
              </div>
              <a 
                href={selectedGithubLink.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <Icon.Link /> {t('cerebro.actions.viewOnGitHub')}
              </a>
            </div>
            <GitHubMarkdownViewer
              owner={githubInfo.owner}
              repo={githubInfo.repo}
              path={githubInfo.path}
              branch={githubInfo.branch}
            />
          </div>
        );
      }
    }
    
    // Standard-Markdown-Rendering für den Artikelinhalt
    return (
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            if (!props.inline && match) {
              const language = match[1];
              const code = String(children).replace(/\n$/, '');
              
              if (code.length > 500) {
                return (
                  <CollapsibleCode language={language}>
                    <pre className={`language-${language} bg-gray-100 p-4 rounded overflow-auto`}>
                      <code className={className} {...props}>
                        {code}
                      </code>
                    </pre>
                  </CollapsibleCode>
                );
              }
              
              try {
                return (
                  <div className="bg-gray-800 p-4 rounded overflow-auto">
                    <pre className={className}>
                      <code {...props}>
                        {code}
                      </code>
                    </pre>
                  </div>
                );
              } catch (err) {
                console.error('Error rendering syntax highlighter:', err);
                return (
                  <pre className={`language-${language} bg-gray-100 p-4 rounded overflow-auto`}>
                    <code className={className} {...props}>
                      {code}
                    </code>
                  </pre>
                );
              }
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          // Custom-Komponente für Bilder mit Vorschau
          img: ({ node, src, alt, ...props }: any) => {
            if (!src) return null;
            const isPdf = src.toLowerCase().endsWith('.pdf') || src.match(/\.pdf(\?|$)/i);
            const isExternalLink = src.match(/^https?:\/\//);
            
            return (
              <div className="my-4 border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                <div className="flex items-center mb-2">
                  <Icon.Image />
                  <span className="ml-2 text-sm font-medium dark:text-gray-200">{alt || 'Bild'}</span>
                </div>
                {isPdf ? (
                  <iframe 
                    src={`${src}#view=FitH`} 
                    className="w-full rounded border dark:border-gray-600"
                    style={{ height: '400px' }}
                    title={alt || 'PDF Vorschau'}
                  />
                ) : (
                  <img 
                    src={src} 
                    alt={alt || ''} 
                    className="max-w-full border rounded dark:border-gray-600" 
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                    {...props}
                  />
                )}
              </div>
            );
          },
          // Custom-Komponente für Links mit Vorschau
          a: ({ node, href, children, ...props }: any) => {
            if (!href) return <a {...props}>{children}</a>;
            
            const isPdf = href.toLowerCase().endsWith('.pdf') || href.match(/\.pdf(\?|$)/i);
            const isImage = href.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
            const isExternalLink = href.match(/^https?:\/\//);
            
            // Wenn es ein Bild-Link ist, rendere als Bild-Vorschau
            if (isImage) {
              return (
                <div className="my-4 border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center mb-2">
                    <Icon.Image />
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {children || href}
                    </a>
                  </div>
                  <img 
                    src={href} 
                    alt={String(children) || 'Bild'} 
                    className="max-w-full border rounded dark:border-gray-600" 
                    style={{ maxHeight: '400px', objectFit: 'contain' }}
                  />
                </div>
              );
            }
            
            // Wenn es ein PDF-Link ist, rendere als PDF-Vorschau
            if (isPdf) {
              return (
                <div className="my-4 border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center mb-2">
                    <Icon.PDF />
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {children || href}
                    </a>
                  </div>
                  <iframe 
                    src={`${href}#view=FitH`} 
                    className="w-full rounded border dark:border-gray-600"
                    style={{ height: '400px' }}
                    title={String(children) || 'PDF Vorschau'}
                  />
                </div>
              );
            }
            
            // Für externe Links eine Vorschau-Box
            if (isExternalLink) {
              return (
                <div className="my-3 border rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 inline-block">
                  <div className="flex items-center">
                    <Icon.ExternalLink />
                    <a 
                      href={href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 dark:text-blue-400 hover:underline break-all"
                      {...props}
                    >
                      {children || href}
                    </a>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 break-all">
                    {href}
                  </div>
                </div>
              );
            }
            
            // Standard-Link-Rendering für interne Links
            return (
              <a 
                href={href} 
                className="text-blue-600 dark:text-blue-400 hover:underline"
                {...props}
              >
                {children}
              </a>
            );
          }
        }}
      >
        {article.content}
      </ReactMarkdown>
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
        {/* GitHub-Links als Tabs anzeigen, falls vorhanden */}
        {githubLinks.length > 0 && (
          <div className="mb-4">
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <div className="flex">
                {githubLinks.map(link => (
                  <button
                    key={link.id}
                    className={`py-2 px-4 font-medium text-sm ${
                      selectedGithubLink?.id === link.id
                        ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    onClick={() => setSelectedGithubLink(link)}
                  >
                    {link.title || 'GitHub'}
                  </button>
                ))}
                <button
                  className={`py-2 px-4 font-medium text-sm ${
                    !selectedGithubLink
                      ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                  onClick={() => setSelectedGithubLink(null)}
                >
                  {t('cerebro.article')}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Inhalt des Artikels oder ausgewählter GitHub-Markdown */}
        <div className="prose dark:prose-invert max-w-none">
          {renderContent()}
        </div>
      </div>
      
      {/* Medien-Bereich */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold mb-2 dark:text-white">{t('cerebro.media')}</h2>
          {hasCerebroButtonPermission && (
            <Link 
              to={`/cerebro/${slug}/media/add`}
              className="p-2 rounded-full text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900"
              aria-label={t('cerebro.addMedia')}
            >
              <PlusIcon className="h-5 w-5" />
            </Link>
          )}
        </div>
        
        {mediaFiles.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('cerebro.noMedia')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {mediaFiles.map(media => (
              <MediaPreview key={media.id} media={media} />
            ))}
          </div>
        )}
      </div>
      
      {/* Externe Links Bereich */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold mb-2 dark:text-white">{t('cerebro.externalLinks')}</h2>
          {hasCerebroButtonPermission && (
            <div className="flex space-x-2">
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
        </div>
        
        {externalLinks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">{t('cerebro.noLinks')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {externalLinks.map(link => (
              <ExternalLinkPreview key={link.id} link={link} />
            ))}
          </div>
        )}
      </div>
      
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