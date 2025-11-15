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
  onlyAttachments?: boolean; // Nur Anhänge rendern, ohne Text
  attachmentMetadata?: Array<{
    id: number;
    fileName: string;
    fileType: string;
    url: string;
  }>; // Attachment-Metadaten für bessere Dateityp-Erkennung
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ 
  content, 
  className = "", 
  maxHeight = "150px",
  temporaryAttachments = [],
  showImagePreview = false,
  onlyAttachments = false,
  attachmentMetadata = []
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
    
    // Duplikate entfernen - gruppieren nach alt (Dateiname) und URL, nur eindeutige behalten
    const uniqueAttachments = allAttachments.reduce((acc, current) => {
      const key = `${current.type}-${current.alt}-${current.url}`;
      if (!acc.some(item => `${item.type}-${item.alt}-${item.url}` === key)) {
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

  // Finde Attachment-Metadaten für einen Dateinamen oder URL
  const getAttachmentMetadata = (fileName: string, url?: string) => {
    // Entferne Emojis und Whitespace vom Dateinamen für bessere Erkennung
    const cleanFileName = fileName.replace(/^[\u{1F300}-\u{1F9FF}\s]+/u, '').trim();
    
    // Versuche zuerst nach Dateiname zu suchen
    let metadata = attachmentMetadata.find(meta => meta.fileName === fileName);
    
    // Falls nicht gefunden, versuche mit bereinigtem Dateinamen
    if (!metadata && cleanFileName !== fileName) {
      metadata = attachmentMetadata.find(meta => meta.fileName === cleanFileName);
    }
    
    // Falls nicht gefunden, versuche auch nach Dateiname ohne Groß-/Kleinschreibung
    if (!metadata) {
      metadata = attachmentMetadata.find(meta => meta.fileName.toLowerCase() === fileName.toLowerCase());
    }
    
    // Falls immer noch nicht gefunden, versuche mit bereinigtem Dateinamen ohne Groß-/Kleinschreibung
    if (!metadata && cleanFileName !== fileName) {
      metadata = attachmentMetadata.find(meta => meta.fileName.toLowerCase() === cleanFileName.toLowerCase());
    }
    
    // Falls immer noch nicht gefunden und URL vorhanden, versuche die ID aus der URL zu extrahieren
    if (!metadata && url && attachmentMetadata.length > 0) {
      // Versuche Attachment-ID aus URL zu extrahieren
      // Format: /api/tasks/123/attachments/456 oder /api/requests/123/attachments/456
      let attachmentIdMatch = url.match(/\/(?:tasks|requests)\/\d+\/attachments\/(\d+)/);
      if (attachmentIdMatch) {
        const attachmentId = parseInt(attachmentIdMatch[1], 10);
        metadata = attachmentMetadata.find(meta => meta.id === attachmentId);
      }
      
      // Auch für Cerebro-Media-URLs: /api/cerebro/media/123/file
      if (!metadata) {
        attachmentIdMatch = url.match(/\/cerebro\/media\/(\d+)\/file/);
        if (attachmentIdMatch) {
          const mediaId = parseInt(attachmentIdMatch[1], 10);
          metadata = attachmentMetadata.find(meta => meta.id === mediaId);
        }
      }
    }
    
    return metadata;
  };
  
  // Rendere Anhänge direkt als Vorschau
  const renderInlineAttachments = () => {
    const attachments = extractAttachments();
    
    // DEBUG: Logging für Diagnose
    console.log('📦 renderInlineAttachments aufgerufen:', {
      contentLength: content.length,
      attachmentsFound: attachments.length,
      attachmentMetadataCount: attachmentMetadata.length,
      attachmentMetadata: attachmentMetadata
    });
    
    // Filtere ungültige Anhänge heraus
    const validAttachments = attachments.filter(attachment => {
      let url = attachment.url;
      if (attachment.isTemporary) {
        const tempUrl = getTemporaryFileUrl(attachment.alt);
        if (tempUrl) url = tempUrl;
      }
      return url && url !== "wird nach dem Erstellen hochgeladen";
    });
    
    if (validAttachments.length === 0) return null;
    
    // Rendere alle Anhänge und filtere null-Werte heraus
    const renderedAttachments = validAttachments
      .map((attachment, index) => {
        // Hole Metadaten für diesen Anhang (mit URL als Fallback)
        let metadata = getAttachmentMetadata(attachment.alt, attachment.url);
        
        // Falls Metadaten nicht per Dateiname gefunden wurden, versuche per URL-ID
        if (!metadata && attachment.url) {
          // Versuche Task/Request Attachment-ID
          let attachmentIdMatch = attachment.url.match(/\/attachments\/(\d+)/);
          if (attachmentIdMatch) {
            const attachmentId = parseInt(attachmentIdMatch[1]);
            metadata = attachmentMetadata.find(meta => meta.id === attachmentId);
          }
          
          // Falls nicht gefunden, versuche Cerebro-Media-ID
          if (!metadata) {
            attachmentIdMatch = attachment.url.match(/\/cerebro\/media\/(\d+)\/file/);
            if (attachmentIdMatch) {
              const mediaId = parseInt(attachmentIdMatch[1]);
              metadata = attachmentMetadata.find(meta => meta.id === mediaId);
            }
          }
        }
        
        // Bestimme URL: Priorität: Metadaten-URL > Markdown-URL > Temporäre URL
        let url: string = '';
        if (metadata?.url) {
          // Verwende URL aus Metadaten (falls verfügbar)
          url = metadata.url;
        } else {
          // Verwende URL aus Markdown
          url = attachment.url || '';
        }
        
        // Temporäre URLs haben Vorrang (für neue Uploads)
        if (attachment.isTemporary) {
          const tempUrl = getTemporaryFileUrl(attachment.alt);
          if (tempUrl) url = tempUrl;
        }
        
        // Sicherstellen, dass url definiert ist
        if (!url || url === "wird nach dem Erstellen hochgeladen") {
          return null;
        }
        
        // Prüfe Dateityp basierend auf Metadaten, URL und Dateiname
        const fileName = attachment.alt.toLowerCase();
        
        // Bestimme Dateityp: Priorität: Metadaten > Markdown-Type > URL/Dateiname
        let isImage = false;
        let isPdf = false;
        
        // DEBUG: Logging für Diagnose
        console.log('🔍 Attachment Debug:', {
          alt: attachment.alt,
          fileName: fileName,
          url: url,
          metadata: metadata,
          attachmentType: attachment.type
        });
        
        // 1. Prüfe Metadaten (höchste Priorität)
        if (metadata?.fileType) {
          isImage = metadata.fileType.startsWith('image/');
          isPdf = metadata.fileType === 'application/pdf';
          console.log('✅ Metadaten gefunden:', { fileType: metadata.fileType, isImage, isPdf });
        }
        
        // 2. Falls keine Metadaten, prüfe Markdown-Type
        if (!metadata && attachment.type === 'image') {
          isImage = true;
        }
        
        // 3. Falls immer noch nicht bestimmt, prüfe URL und Dateiname
        if (!metadata) {
          const urlEndsWithPdf = url && url.toLowerCase().endsWith('.pdf');
          const urlMatchesPdf = url && url.match(/\.pdf(\?|$)/i);
          const fileNameEndsWithPdf = fileName.endsWith('.pdf');
          const isApiAttachmentPdf = url && (url.includes('/api/requests/attachments/') || url.includes('/api/tasks/attachments/')) && fileNameEndsWithPdf;
          const isCerebroMediaPdf = url && url.includes('/cerebro/media/') && fileNameEndsWithPdf;
          
          isPdf = urlEndsWithPdf || urlMatchesPdf || fileNameEndsWithPdf || isApiAttachmentPdf || isCerebroMediaPdf;
          
          console.log('🔍 PDF-Erkennung (ohne Metadaten):', {
            urlEndsWithPdf,
            urlMatchesPdf,
            fileNameEndsWithPdf,
            isApiAttachmentPdf,
            isPdf
          });
        }
        
        console.log('📄 Finale Entscheidung:', { isImage, isPdf, isExternalLink: url && url.match(/^https?:\/\//) && !isImage && !isPdf });
        
        const isExternalLink = url && url.match(/^https?:\/\//) && !isImage && !isPdf;
        
        return (
          <div key={index} className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
            {isImage ? (
              // Bild-Vorschau - groß und prominent
              <div>
                <img 
                  src={url} 
                  alt={attachment.alt} 
                  className="w-full h-auto max-h-96 object-contain" 
                  style={{ display: 'block' }}
                />
              </div>
            ) : isPdf ? (
              // PDF-Vorschau
              <div className="p-3">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-medium dark:text-gray-200">{attachment.alt}</span>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-auto text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Öffnen
                  </a>
                </div>
                <iframe 
                  src={`${url}#view=FitH`} 
                  className="w-full rounded border dark:border-gray-600"
                  style={{ height: '400px' }}
                  title={attachment.alt}
                />
              </div>
            ) : isExternalLink ? (
              // Externer Link-Vorschau mit iframe
              <div className="p-3">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span className="text-sm font-medium dark:text-gray-200 flex-grow">{attachment.alt || url}</span>
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    Öffnen
                  </a>
                </div>
                <iframe 
                  src={url}
                  className="w-full rounded border dark:border-gray-600"
                  style={{ height: '400px' }}
                  title={attachment.alt || 'Web-Vorschau'}
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
              </div>
            ) : (
              // Andere Dateitypen
              <div className="p-3 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
            )}
          </div>
        );
      })
      .filter((item): item is React.ReactElement => item !== null);
    
    // Wenn nach dem Filtern keine Anhänge mehr vorhanden sind, null zurückgeben
    if (renderedAttachments.length === 0) return null;
    
    return (
      <div className="flex flex-col gap-3 mt-2">
        {renderedAttachments}
      </div>
    );
  };

  // Nur Anhänge rendern (ohne Text)
  if (onlyAttachments) {
    const attachments = renderInlineAttachments();
    if (!attachments) return <div className={className}></div>;
    return (
      <div className={className}>
        {attachments}
      </div>
    );
  }

  // Für Worktracker-Tooltips den gesamten Inhalt rendern mit Anhang-Vorschauen
  if (showImagePreview) {
    const style: React.CSSProperties = {};
    if (maxHeight === "none") {
      // Keine maxHeight und kein Overflow wenn maxHeight="none"
      style.overflowY = 'visible';
    } else {
      style.maxHeight = maxHeight !== "150px" ? maxHeight : "100%";
      style.overflowY = 'auto';
    }
    
    // Extrahiere Anhänge aus dem originalen content
    const attachments = extractAttachments();
    
    // Filtere Bilder heraus, die als große Vorschau gerendert werden sollen
    const imagesToRender = attachments.filter(attachment => {
      // Hole Metadaten für diesen Anhang (mit URL als Fallback)
      let metadata = getAttachmentMetadata(attachment.alt, attachment.url);
      
      // DEBUG: Logging für Diagnose
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Bild-Filterung:', {
          alt: attachment.alt,
          url: attachment.url,
          metadata: metadata,
          attachmentMetadataCount: attachmentMetadata.length,
          attachmentMetadata: attachmentMetadata
        });
      }
      
      // Bestimme URL
      let url: string = '';
      if (metadata?.url) {
        url = metadata.url;
      } else {
        url = attachment.url || '';
      }
      
      if (attachment.isTemporary) {
        const tempUrl = getTemporaryFileUrl(attachment.alt);
        if (tempUrl) url = tempUrl;
      }
      
      if (!url || url === "wird nach dem Erstellen hochgeladen") {
        return false;
      }
      
      // Prüfe ob es ein Bild ist (nicht PDF)
      let isImage = false;
      let isPdf = false;
      
      if (metadata?.fileType) {
        isImage = metadata.fileType.startsWith('image/');
        isPdf = metadata.fileType === 'application/pdf';
      } else if (attachment.type === 'image') {
        // Fallback: Wenn kein Metadata, aber type ist 'image', dann ist es ein Bild
        isImage = true;
      } else {
        // Fallback: Prüfe Dateiname oder URL auf Bild-Endungen
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i;
        isImage = imageExtensions.test(attachment.alt) || imageExtensions.test(url);
      }
      
      // Nur Bilder rendern, keine PDFs (PDFs werden separat behandelt)
      return isImage && !isPdf;
    });
    
    // Ersetze Markdown-Links und Bilder im Text durch Platzhalter
    let processedContent = content;
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    // Ersetze ALLE Bilder komplett aus dem Text (werden separat als große Vorschau gerendert)
    // WICHTIG: Muss GLOBAL sein, damit alle Bilder entfernt werden
    processedContent = processedContent.replace(imageRegex, () => {
      // Entferne ALLE Bilder komplett - sie werden durch renderFilteredAttachments() gerendert
      return '';
    });
    
    // Entferne auch alle Leerzeilen, die durch das Entfernen der Bilder entstehen könnten
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n').trim();
    
    // Ersetze Links durch Text mit Link-Referenz (aber nur wenn es kein Bild ist)
    processedContent = processedContent.replace(linkRegex, (match, alt, url) => {
      // Überspringe Links, die bereits als Bilder behandelt wurden
      if (match.startsWith('![')) {
        return match;
      }
      return `${alt} [Link]`;
    });
    
    // Rendere nur die Bilder aus imagesToRender als große Vorschau
    const renderFilteredAttachments = () => {
      if (imagesToRender.length === 0) return null;
      
      // Entferne Duplikate basierend auf Dateiname und URL
      const uniqueImages = imagesToRender.reduce((acc, current) => {
        const key = `${current.alt}-${current.url || ''}`;
        if (!acc.some(img => `${img.alt}-${img.url || ''}` === key)) {
          acc.push(current);
        }
        return acc;
      }, [] as typeof imagesToRender);
      
      return (
        <div className="flex flex-col gap-3 mt-2">
          {uniqueImages.map((attachment, index) => {
            // Hole Metadaten für diesen Anhang (mit URL als Fallback)
            let metadata = getAttachmentMetadata(attachment.alt, attachment.url);
            
            // Bestimme URL
            let url: string = '';
            if (metadata?.url) {
              url = metadata.url;
            } else {
              url = attachment.url || '';
            }
            
            if (attachment.isTemporary) {
              const tempUrl = getTemporaryFileUrl(attachment.alt);
              if (tempUrl) url = tempUrl;
            }
            
            if (!url || url === "wird nach dem Erstellen hochgeladen") {
              return null;
            }
            
            return (
              <div key={`img-${attachment.alt}-${url}-${index}`} className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50">
                <img 
                  src={url} 
                  alt={attachment.alt} 
                  className="w-full h-auto max-h-96 object-contain" 
                  style={{ display: 'block' }}
                />
              </div>
            );
          }).filter((item): item is React.ReactElement => item !== null)}
        </div>
      );
    };
    
    return (
      <div className={`markdown-preview ${className} dark:text-gray-200`} style={style}>
        {/* Text-Inhalt ohne Bilder */}
        {processedContent && (
          <div dangerouslySetInnerHTML={{ __html: processedContent.replace(/\n/g, '<br/>') }} />
        )}
        {/* Bilder als große Vorschau */}
        {renderFilteredAttachments()}
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