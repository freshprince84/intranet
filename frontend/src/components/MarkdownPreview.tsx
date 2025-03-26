import React from 'react';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  maxHeight?: string | number;
  temporaryAttachments?: Array<{
    fileName: string;
    fileType: string;
    fileSize: number;
    file?: File;
  }>;
  showImagePreview?: boolean;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ 
  content, 
  className = "", 
  maxHeight = "150px",
  temporaryAttachments = [],
  showImagePreview = false
}) => {
  // Extrahiere alle Anhänge aus dem Markdown
  const extractAttachments = () => {
    const imageMatches = Array.from(content.matchAll(/!\[(.*?)\]\((.*?)\)/g)).map(match => ({
      type: 'image',
      alt: match[1],
      url: match[2],
      isTemporary: match[2] === "wird nach dem Erstellen hochgeladen"
    }));
    
    const linkMatches = Array.from(content.matchAll(/\[(.*?)\]\((.*?)\)/g))
      .filter(match => !match[0].startsWith('!')) // Bilder ausschließen
      .map(match => ({
        type: 'link',
        alt: match[1],
        url: match[2],
        isTemporary: match[2] === "wird nach dem Erstellen hochgeladen"
      }));
    
    const allAttachments = [...imageMatches, ...linkMatches];
    
    // Duplikate entfernen - gruppieren nach alt (Dateiname) und nur eindeutige behalten
    const uniqueAttachments = allAttachments.reduce((acc, current) => {
      const key = `${current.type}-${current.alt}`;
      if (!acc.some(item => `${item.type}-${item.alt}` === key)) {
        acc.push(current);
      }
      return acc;
    }, [] as typeof allAttachments);
    
    return uniqueAttachments;
  };
  
  // Erstellt temporäre URLs für Dateien
  const getTemporaryFileUrl = (filename: string): string | null => {
    const attachment = temporaryAttachments.find(att => att.fileName === filename);
    if (attachment?.file) {
      return URL.createObjectURL(attachment.file);
    }
    return null;
  };
  
  // Rendere die Anhänge als Tags
  const renderAttachmentTags = () => {
    const attachments = extractAttachments();
    
    // Keine Anhänge gefunden
    if (attachments.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((attachment, index) => {
          // URL für temporäre Anhänge
          let url = attachment.url;
          if (attachment.isTemporary) {
            const tempUrl = getTemporaryFileUrl(attachment.alt);
            if (tempUrl) url = tempUrl;
          }
          
          return (
            <div key={index} className="group relative">
              {/* Tag */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm flex items-center dark:text-gray-200">
                <span className="mr-1">
                  {attachment.type === 'image' ? 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg> : 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  }
                </span>
                {attachment.alt}
              </div>
              
              {/* Vorschau beim Hover - nur anzeigen wenn URL verfügbar */}
              {url && url !== "wird nach dem Erstellen hochgeladen" && (
                <div className="hidden group-hover:block absolute z-10 bg-white dark:bg-gray-800 border dark:border-gray-700 shadow-lg p-2 rounded-md -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full max-w-xs">
                  {attachment.type === 'image' ? (
                    <img 
                      src={url} 
                      alt={attachment.alt} 
                      className="max-w-full border rounded dark:border-gray-700" 
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                  ) : url.match(/^(https?:\/\/|blob:)/) ? (
                    // Für Links mit http/https einen Preview anzeigen
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {attachment.alt}
                      </a>
                    </div>
                  ) : (
                    // Für andere Dateitypen (PDF, DOC, etc.)
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="dark:text-gray-200">{attachment.alt}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Für Worktracker-Tooltips den gesamten Inhalt rendern
  if (showImagePreview) {
    return (
      <div className={`markdown-preview ${className} dark:text-gray-200`} style={{ maxHeight: maxHeight !== "150px" ? maxHeight : "100%", overflowY: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
      </div>
    );
  }

  // Für Modals nur die Anhang-Tags rendern
  return (
    <div className={`markdown-preview ${className}`}>
      {renderAttachmentTags()}
    </div>
  );
};

export default MarkdownPreview; 