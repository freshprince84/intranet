import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cerebroApi } from '../../api/cerebroApi.ts';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface FormData {
  url: string;
  title: string;
}

/**
 * GitHubLinkManager Komponente erlaubt das Hinzufügen von GitHub Markdown-Links zu Cerebro-Artikeln
 */
const GitHubLinkManager: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<FormData>({
    url: '',
    title: '',
  });
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const parseGitHubUrl = (url: string): { owner: string; repo: string; path: string; branch: string; } | null => {
    try {
      // Unterstützt folgende URL-Formate:
      // https://github.com/username/repo/blob/branch/path/to/file.md
      // https://github.com/username/repo/raw/branch/path/to/file.md
      // https://raw.githubusercontent.com/username/repo/branch/path/to/file.md
      
      let owner = '';
      let repo = '';
      let path = '';
      let branch = '';
      
      if (url.includes('raw.githubusercontent.com')) {
        // Format: https://raw.githubusercontent.com/username/repo/branch/path/to/file.md
        const parts = url.replace('https://raw.githubusercontent.com/', '').split('/');
        owner = parts[0];
        repo = parts[1];
        branch = parts[2];
        path = parts.slice(3).join('/');
      } else if (url.includes('github.com')) {
        // Format: https://github.com/username/repo/blob/branch/path/to/file.md
        const parts = url.replace('https://github.com/', '').split('/');
        owner = parts[0];
        repo = parts[1];
        const typeIndex = parts.indexOf('blob') !== -1 ? parts.indexOf('blob') : parts.indexOf('raw');
        branch = parts[typeIndex + 1];
        path = parts.slice(typeIndex + 2).join('/');
      } else {
        return null;
      }
      
      // Sicherstellen, dass es sich um eine Markdown-Datei handelt
      if (!path.endsWith('.md') && !path.endsWith('.markdown')) {
        return null;
      }
      
      return { owner, repo, path, branch };
    } catch (err) {
      console.error('Fehler beim Parsen der GitHub-URL:', err);
      return null;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slug) {
      setError('Fehler: Kein Artikel-Slug angegeben.');
      return;
    }
    
    // GitHub URL parsen
    const githubInfo = parseGitHubUrl(formData.url);
    if (!githubInfo) {
      setError('Ungültige GitHub URL. Bitte geben Sie eine URL zu einer Markdown-Datei auf GitHub an.');
      return;
    }
    
    try {
      setSaving(true);
      
      // Externen Link erstellen
      await cerebroApi.externalLinks.createExternalLink({
        carticleSlug: slug,
        url: formData.url,
        title: formData.title || `GitHub: ${githubInfo.path}`,
        type: 'github_markdown'
      });
      
      toast.success('GitHub Markdown-Link erfolgreich hinzugefügt!');
      
      // Zurück zum Artikel navigieren
      navigate(`/cerebro/${slug}`);
    } catch (err) {
      console.error('Fehler beim Speichern des GitHub-Links:', err);
      setError('Fehler beim Speichern des GitHub-Links. Bitte versuchen Sie es später erneut.');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">GitHub Markdown-Link hinzufügen</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub URL <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="url"
              value={formData.url}
              onChange={handleChange}
              placeholder="https://github.com/username/repo/blob/main/README.md"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              URL zu einer Markdown-Datei auf GitHub (z.B. README.md)
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="GitHub Repository Dokumentation"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional: Ein beschreibender Titel für diesen Link
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => navigate(`/cerebro/${slug}`)}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            >
              {saving ? 'Wird gespeichert...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} />
    </>
  );
};

export default GitHubLinkManager; 