import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GitHubMarkdownViewerProps {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
  onError?: (error: string) => void;
}

const GitHubMarkdownViewer: React.FC<GitHubMarkdownViewerProps> = ({
  owner,
  repo,
  path,
  branch = 'main',
  onError
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        setLoading(true);
        // GitHub Raw URL für die Markdown-Datei
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`GitHub API Fehler: ${response.status}`);
        }
        
        const markdown = await response.text();
        setContent(markdown);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Markdown-Datei:', err);
        const errorMessage = 'Fehler beim Laden der Markdown-Datei von GitHub.';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchMarkdown();
  }, [owner, repo, path, branch, onError]);
  
  if (loading) {
    return <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
    </div>;
  }
  
  if (error) {
    return <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded">
      {error}
    </div>;
  }
  
  return (
    <div className="prose prose-sm md:prose lg:prose-lg max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" />
          ),
          pre: ({ node, ...props }) => (
            <pre {...props} className="bg-gray-100 p-2 rounded overflow-x-auto" />
          ),
          code: ({ node, inline, ...props }) => (
            inline 
              ? <code {...props} className="bg-gray-100 px-1 rounded text-sm" />
              : <code {...props} className="block" />
          ),
          img: ({ node, ...props }) => {
            let imgSrc = props.src || '';
            
            // Wenn es ein relativer Pfad ist, konvertiere zu vollständigem GitHub-Pfad
            if (imgSrc && !imgSrc.startsWith('http')) {
              // Bestimme den Basispfad aus dem Markdown-Pfad
              const basePath = path.substring(0, path.lastIndexOf('/') + 1);
              imgSrc = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${basePath}${imgSrc}`;
            }
            
            return <img {...props} src={imgSrc} className="max-w-full h-auto rounded" />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default GitHubMarkdownViewer; 