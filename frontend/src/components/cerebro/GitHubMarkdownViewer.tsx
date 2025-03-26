import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import 'github-markdown-css/github-markdown.css'; // GitHub-Styling importieren

interface GitHubMarkdownViewerProps {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
}

const GitHubMarkdownViewer: React.FC<GitHubMarkdownViewerProps> = ({ 
  owner, 
  repo, 
  path, 
  branch = 'main' 
}) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        setLoading(true);
        // Erstellt die URL zur Rohdatei (raw) auf GitHub
        const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP Fehler! Status: ${response.status}`);
        }
        
        const markdownContent = await response.text();
        setContent(markdownContent);
        setError(null);
      } catch (err) {
        console.error('Fehler beim Laden der Markdown-Datei:', err);
        setError(`Die Markdown-Datei konnte nicht geladen werden: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
        setContent('');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkdown();
  }, [owner, repo, path, branch]);

  // Vereinfachte Code-Komponenten ohne SyntaxHighlighter
  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <pre className={`language-${match[1]} dark:bg-gray-800 dark:border-gray-700`}>
          <code className={`${className} dark:text-gray-200`} {...props}>
            {String(children).replace(/\n$/, '')}
          </code>
        </pre>
      ) : (
        <code className={`${className || ''} dark:bg-gray-800 dark:text-gray-200`} {...props}>
          {children}
        </code>
      );
    },
    // Spezielle Handhabung für Überschriften, um konsistentes Styling zu gewährleisten
    h1: (props: any) => <h1 className="text-2xl font-bold mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 dark:text-white" {...props} />,
    h2: (props: any) => <h2 className="text-xl font-bold mt-6 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2 dark:text-white" {...props} />,
    h3: (props: any) => <h3 className="text-lg font-bold mt-5 mb-3 dark:text-white" {...props} />,
    // Spezielle Handhabung für Links
    a: (props: any) => <a className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    // Tabellen
    table: (props: any) => <table className="border-collapse border border-gray-300 dark:border-gray-700 my-4" {...props} />,
    th: (props: any) => <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 bg-gray-100 dark:bg-gray-800 dark:text-gray-200" {...props} />,
    td: (props: any) => <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 dark:text-gray-200" {...props} />,
    // Listen
    ul: (props: any) => <ul className="list-disc pl-5 mb-4 dark:text-gray-200" {...props} />,
    ol: (props: any) => <ol className="list-decimal pl-5 mb-4 dark:text-gray-200" {...props} />,
    li: (props: any) => <li className="mb-1 dark:text-gray-200" {...props} />,
    // Bilder
    img: (props: any) => <img className="max-w-full h-auto my-4" {...props} />,
    // Paragraph
    p: (props: any) => <p className="dark:text-gray-200 mb-4" {...props} />,
    // Blockquote
    blockquote: (props: any) => <blockquote className="border-l-4 border-gray-300 dark:border-gray-700 pl-4 py-2 italic text-gray-600 dark:text-gray-400" {...props} />
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded">
        <h3 className="font-bold">Fehler</h3>
        <p>{error}</p>
        <p className="mt-2">
          Prüfe, ob die Datei
          <a 
            href={`https://github.com/${owner}/${repo}/blob/${branch}/${path}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
          >
            {path}
          </a>
          {' '}im Repository existiert.
        </p>
      </div>
    );
  }

  return (
    <div className="github-markdown-content">
      <div className="bg-gray-100 dark:bg-gray-700 p-2 mb-4 rounded text-sm flex justify-between items-center">
        <span className="dark:text-gray-300">
          Datei: <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">{path}</code>
        </span>
        <a 
          href={`https://github.com/${owner}/${repo}/blob/${branch}/${path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          Auf GitHub anzeigen →
        </a>
      </div>
      
      {/* GitHub-spezifische CSS-Klasse anwenden */}
      <div className="markdown-body dark:bg-gray-800 dark:text-white">
        <ReactMarkdown 
          components={components}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default GitHubMarkdownViewer; 