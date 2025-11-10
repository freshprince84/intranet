import React, { useState, useEffect } from 'react';
import { cerebroApi, CerebroExternalLink } from '../../api/cerebroApi.ts';

interface GitHubLinkManagerProps {
  articleSlug: string;
  articleId?: string;
  onLinkAdded?: (link: CerebroExternalLink) => void;
  onLinkRemoved?: (linkId: string) => void;
}

const GitHubLinkManager: React.FC<GitHubLinkManagerProps> = ({ 
  articleSlug, 
  articleId,
  onLinkAdded,
  onLinkRemoved
}) => {
  const [links, setLinks] = useState<CerebroExternalLink[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<{
    url: string;
    title: string;
    type: string;
  }>({
    url: '',
    title: '',
    type: 'github_markdown'
  });

  // GitHub-Links für den aktuellen Artikel laden
  useEffect(() => {
    if (!articleId) return;

    const fetchLinks = async () => {
      try {
        setLoading(true);
        const fetchedLinks = await cerebroApi.externalLinks.getLinksByArticle(articleId);
        // Filtere nur GitHub-Links
        setLinks(fetchedLinks.filter(link => 
          link.type === 'github_markdown' || 
          link.url.includes('github.com') || 
          link.url.includes('raw.githubusercontent.com')
        ));
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der GitHub-Links:', err);
        setError('Die GitHub-Links konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [articleId]);

  // Neuen GitHub-Link hinzufügen
  const addGitHubLink = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLink.url.trim()) {
      setError('Bitte geben Sie eine gültige GitHub-URL ein');
      return;
    }

    try {
      setLoading(true);
      
      // Wenn keine Titel angegeben wurde, extrahiere den Dateinamen aus der URL
      let title = newLink.title.trim();
      if (!title) {
        const urlParts = newLink.url.split('/');
        title = urlParts[urlParts.length - 1];
      }
      
      const linkData = {
        carticleSlug: articleSlug,
        url: newLink.url,
        title: `GitHub: ${title}`,
        type: 'github_markdown'
      };
      
      const createdLink = await cerebroApi.externalLinks.createExternalLink(linkData);
      
      setLinks(prev => [...prev, createdLink]);
      setNewLink({ url: '', title: '', type: 'github_markdown' });
      setError(null);
      
      if (onLinkAdded) {
        onLinkAdded(createdLink);
      }
    } catch (err) {
      console.error('Fehler beim Erstellen des GitHub-Links:', err);
      setError('Der GitHub-Link konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  // GitHub-Link entfernen
  const removeLink = async (linkId: string) => {
    try {
      setLoading(true);
      await cerebroApi.externalLinks.deleteLink(linkId);
      setLinks(prev => prev.filter(link => link.id !== linkId));
      
      if (onLinkRemoved) {
        onLinkRemoved(linkId);
      }
    } catch (err) {
      console.error('Fehler beim Löschen des GitHub-Links:', err);
      setError('Der GitHub-Link konnte nicht gelöscht werden.');
    } finally {
      setLoading(false);
    }
  };

  // URL-Format validieren (für GitHub-URLs)
  const isValidGitHubUrl = (url: string): boolean => {
    return (
      url.includes('github.com') || 
      url.includes('raw.githubusercontent.com')
    ) && url.trim().length > 0;
  };

  return (
    <div className="github-link-manager">
      <h3 className="text-lg font-medium mb-2 dark:text-white">GitHub Markdown-Dateien</h3>
      
      {/* Fehleranzeige */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Formular zum Hinzufügen eines neuen GitHub-Links */}
      <form onSubmit={addGitHubLink} className="mb-4">
        <div className="flex flex-col space-y-2">
          <div>
            <label htmlFor="github-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              GitHub URL
            </label>
            <input
              id="github-url"
              type="url"
              value={newLink.url}
              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
              placeholder="https://github.com/username/repo/blob/main/file.md"
              className={`w-full px-3 py-2 border rounded-md ${
                !isValidGitHubUrl(newLink.url) && newLink.url.length > 0
                  ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
              } dark:bg-gray-700 dark:text-white`}
              required
            />
            {!isValidGitHubUrl(newLink.url) && newLink.url.length > 0 && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                Bitte geben Sie eine gültige GitHub-URL ein.
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="github-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Titel (optional)
            </label>
            <input
              id="github-title"
              type="text"
              value={newLink.title}
              onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
              placeholder="z.B. Readme, Dokumentation, etc."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || !isValidGitHubUrl(newLink.url)}
            className={`mt-2 px-4 py-2 rounded-md text-white ${
              loading || !isValidGitHubUrl(newLink.url)
                ? 'bg-blue-400 dark:bg-blue-500/50 cursor-not-allowed'
                : 'bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600'
            }`}
          >
            {loading ? 'Wird hinzugefügt...' : 'GitHub-Link hinzufügen'}
          </button>
        </div>
      </form>
      
      {/* Liste der vorhandenen GitHub-Links */}
      <div className="space-y-3">
        <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">{t('cerebro.linkedMarkdownFiles')}</h4>
        
        {loading && links.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 italic">{t('cerebro.loadingGitHubLinks')}</div>
        ) : links.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400 italic">{t('cerebro.noGitHubLinks')}</div>
        ) : (
          links.map((link) => (
            <div key={link.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-md dark:bg-gray-800">
              <div className="truncate flex-1">
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {link.title || link.url}
                </a>
              </div>
              
              <button
                onClick={() => removeLink(link.id)}
                className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                title={t('cerebro.removeGitHubLink')}
                disabled={loading}
              >
                {t('cerebro.remove')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GitHubLinkManager; 