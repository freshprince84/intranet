import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cerebroApi, CerebroArticleDetail, CerebroMedia, CerebroExternalLink } from '../../api/cerebroApi.ts';
import { usePermissions } from '../../hooks/usePermissions.ts';
import ArticleStructure from './ArticleStructure.tsx';
import GitHubMarkdownViewer from './GitHubMarkdownViewer.tsx';
import CollapsibleCode from './CollapsibleCode.tsx';

// Icons
import { 
  FaEdit, 
  FaTrash, 
  FaArrowLeft, 
  FaDownload, 
  FaLink, 
  FaPlus,
  FaExternalLinkAlt,
  FaClock,
  FaUser,
  FaFileAlt,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaSpinner,
  FaFileImage,
  FaGithub
} from 'react-icons/fa';

// Typen für die Medienvorschau
type MediaType = 'image' | 'video' | 'pdf' | 'other';

// Medientyp basierend auf MIME-Typ bestimmen
const getMediaType = (mimetype: string): MediaType => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'other';
};

// vereinfachte Icon-Implementierung
const Icon = {
  Image: () => <span className="text-blue-500 text-2xl">📷</span>,
  Video: () => <span className="text-red-500 text-2xl">📹</span>,
  PDF: () => <span className="text-red-700 text-2xl">📄</span>,
  File: () => <span className="text-gray-500 text-2xl">📋</span>,
  Download: () => <span className="mr-1">⬇️</span>,
  GitHub: () => <span className="text-gray-800">📦</span>,
  ExternalLink: () => <span className="text-green-600">🔗</span>,
  Link: () => <span className="mr-1">🌐</span>,
  Spinner: () => <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>,
  ArrowLeft: () => <span className="mr-2">←</span>,
  Edit: () => <span className="mr-1">✏️</span>,
  Trash: () => <span className="mr-1">🗑️</span>,
  User: () => <span className="mr-1">👤</span>,
  Clock: () => <span className="mr-1">🕒</span>,
  Plus: () => <span className="mr-1">+</span>
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
          <Icon.Link /> Öffnen
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
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  
  const [article, setArticle] = useState<CerebroArticleDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const canEdit = hasPermission('cerebro', 'write', 'cerebro');
  const canAddMedia = hasPermission('cerebro_media', 'write', 'cerebro');
  const canAddLinks = hasPermission('cerebro_links', 'write', 'cerebro');
  
  // Artikel laden
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const data = await cerebroApi.articles.getArticleBySlug(slug);
        setArticle(data);
        setError(null);
      } catch (err) {
        console.error(`Fehler beim Laden des Artikels mit Slug ${slug}:`, err);
        setError('Fehler beim Laden des Artikels. Bitte versuchen Sie es später erneut.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticle();
  }, [slug]);
  
  // Artikel löschen
  const handleDelete = async () => {
    if (!article) return;
    
    const confirm = window.confirm(`Sind Sie sicher, dass Sie den Artikel "${article.title}" löschen möchten?`);
    if (!confirm) return;
    
    try {
      setLoading(true);
      await cerebroApi.articles.deleteArticle(article.id);
      navigate('/cerebro');
    } catch (err) {
      console.error(`Fehler beim Löschen des Artikels mit ID ${article.id}:`, err);
      setError('Fehler beim Löschen des Artikels. Bitte versuchen Sie es später erneut.');
      setLoading(false);
    }
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
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Icon.Spinner />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded flex items-center"
          onClick={() => navigate('/cerebro')}
        >
          <Icon.ArrowLeft /> Zurück zur Übersicht
        </button>
      </div>
    );
  }
  
  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Artikel nicht gefunden.
        </div>
        <button
          className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded flex items-center"
          onClick={() => navigate('/cerebro')}
        >
          <Icon.ArrowLeft /> Zurück zur Übersicht
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Linke Seitenleiste mit Navigation */}
        <div className="col-span-3">
          <ArticleStructure />
        </div>
        
        {/* Hauptinhalt */}
        <div className="col-span-9">
          {/* Aktionsbuttons */}
          <div className="flex justify-between items-center mb-6">
            <button
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded flex items-center"
              onClick={() => navigate('/cerebro')}
            >
              <Icon.ArrowLeft /> Zurück
            </button>
            
            <div className="flex space-x-2">
              {canEdit && (
                <>
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center"
                    onClick={() => navigate(`/cerebro/${slug}/edit`)}
                  >
                    <Icon.Edit /> Bearbeiten
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded flex items-center"
                    onClick={handleDelete}
                  >
                    <Icon.Trash /> Löschen
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Brotkrümelnavigation */}
          <nav className="text-sm mb-4">
            <ol className="list-none p-0 inline-flex">
              <li className="flex items-center">
                <Link to="/cerebro" className="text-blue-600 hover:text-blue-800">
                  Wiki
                </Link>
                <span className="mx-2">/</span>
              </li>
              {article.parentTitle && (
                <li className="flex items-center">
                  <Link to={`/cerebro/${article.parentSlug}`} className="text-blue-600 hover:text-blue-800">
                    {article.parentTitle}
                  </Link>
                  <span className="mx-2">/</span>
                </li>
              )}
              <li className="text-gray-700">{article.title}</li>
            </ol>
          </nav>
          
          {/* Artikelheader */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
            <div className="flex items-center text-sm text-gray-600 mb-4">
              <div className="flex items-center mr-4">
                <Icon.User />
                Erstellt von {article.creatorFirstName} {article.creatorLastName} ({formatDate(article.createdAt)})
              </div>
              {article.updatedById && (
                <div className="flex items-center">
                  <Icon.Clock />
                  Aktualisiert von {article.updaterFirstName} {article.updaterLastName} ({formatDate(article.updatedAt)})
                </div>
              )}
            </div>
          </div>
          
          {/* Artikelinhalt */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 prose prose-sm md:prose lg:prose-lg max-w-none">
            {article.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" />
                  ),
                  pre: ({ node, ...props }) => {
                    // Sprache aus dem Code-Block extrahieren, falls vorhanden
                    let language = '';
                    let filename = '';
                    
                    if (props.children && typeof props.children === 'object' && 'props' in props.children) {
                      const codeProps = props.children.props;
                      
                      // Sprache aus className (z.B. "language-javascript") extrahieren
                      if (codeProps.className && typeof codeProps.className === 'string') {
                        const match = codeProps.className.match(/language-(\w+)/);
                        if (match && match[1]) {
                          language = match[1];
                        }
                      }
                      
                      // Nach Dateinamen-Metadaten suchen (wenn als Kommentar im Code verwendet)
                      if (codeProps.children && typeof codeProps.children === 'string') {
                        const firstLine = codeProps.children.split('\n')[0];
                        // Prüfen, ob die erste Zeile einen Dateinamen enthält (z.B. "// filename: example.js")
                        const filenameMatch = firstLine.match(/(?:\/\/|#)\s*filename:\s*(.+)$/i);
                        if (filenameMatch && filenameMatch[1]) {
                          filename = filenameMatch[1].trim();
                          // Erste Zeile entfernen, wenn sie als Kommentar erkannt wurde
                          codeProps.children = codeProps.children.replace(firstLine + '\n', '');
                        }
                      }
                    }
                    
                    return (
                      <CollapsibleCode language={language} filename={filename}>
                        <pre {...props} className="bg-gray-100 p-2 rounded overflow-x-auto m-0" />
                      </CollapsibleCode>
                    );
                  },
                  code: ({ node, className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const isInline = !match;
                    return isInline ? (
                      <code {...props} className="bg-gray-100 px-1 rounded text-sm">
                        {children}
                      </code>
                    ) : (
                      <code {...props} className="block">
                        {children}
                      </code>
                    );
                  },
                  img: ({ node, ...props }) => (
                    <img {...props} className="max-w-full h-auto rounded" />
                  ),
                }}
              >
                {article.content}
              </ReactMarkdown>
            ) : (
              <p className="text-gray-500 italic">Dieser Artikel hat noch keinen Inhalt.</p>
            )}
          </div>
          
          {/* Medien */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Medien</h2>
              {canAddMedia && (
                <button
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded flex items-center text-sm"
                  onClick={() => navigate(`/cerebro/${slug}/media/add`)}
                >
                  <Icon.Plus /> Medien hinzufügen
                </button>
              )}
            </div>
            
            {article.media && article.media.length > 0 ? (
              <div>
                {article.media.map((media) => (
                  <MediaPreview key={media.id} media={media} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Keine Medien vorhanden.</p>
            )}
          </div>
          
          {/* Externe Links */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Externe Links</h2>
              <div className="flex space-x-2">
                {canAddLinks && (
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded flex items-center text-sm"
                    onClick={() => navigate(`/cerebro/${slug}/link/add`)}
                  >
                    <span className="mr-1">+</span> Link hinzufügen
                  </button>
                )}
                {canAddLinks && (
                  <button
                    className="bg-gray-700 hover:bg-gray-800 text-white font-medium py-1 px-3 rounded flex items-center text-sm"
                    onClick={() => navigate(`/cerebro/${slug}/github/add`)}
                  >
                    <span className="mr-1">+</span> GitHub MD
                  </button>
                )}
              </div>
            </div>
            
            {article.externalLinks && article.externalLinks.length > 0 ? (
              <div>
                {article.externalLinks.map((link) => (
                  <ExternalLinkPreview key={link.id} link={link} />
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">Keine externen Links vorhanden.</p>
            )}
          </div>
          
          {/* Verknüpfte Tasks und Requests */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Verknüpfte Tasks</h2>
              {article.tasks && article.tasks.length > 0 ? (
                <ul className="divide-y">
                  {article.tasks.map((task) => (
                    <li key={task.id} className="py-2">
                      <Link to={`/tasks/${task.id}`} className="text-blue-600 hover:text-blue-800">
                        {task.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Keine Tasks verknüpft.</p>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Verknüpfte Requests</h2>
              {article.requests && article.requests.length > 0 ? (
                <ul className="divide-y">
                  {article.requests.map((request) => (
                    <li key={request.id} className="py-2">
                      <Link to={`/requests/${request.id}`} className="text-blue-600 hover:text-blue-800">
                        {request.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 italic">Keine Requests verknüpft.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleView; 