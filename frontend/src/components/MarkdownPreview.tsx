import React, { useState, useEffect } from 'react';
import api from '../api/apiClient.ts';

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

// Komponente für externe Link-Vorschau (wie X.com)
interface ExternalLinkPreviewProps {
  url: string;
  alt: string;
}

const ExternalLinkPreview: React.FC<ExternalLinkPreviewProps> = ({ url, alt }) => {
  const [preview, setPreview] = useState<{ title: string; thumbnail: string | null; type: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);
        // Verwende Backend-API für Link-Preview
        const response = await api.get(`/cerebro/links/preview?url=${encodeURIComponent(url)}`);
        setPreview(response.data);
      } catch (err) {
        console.error('Fehler beim Abrufen der Link-Vorschau:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    
    if (url && url.match(/^https?:\/\//)) {
      fetchPreview();
    } else {
      setLoading(false);
    }
  }, [url]);
  
  // Domain extrahieren für Fallback
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  const displayTitle = preview?.title || alt || getDomain(url);
  const displayThumbnail = preview?.thumbnail;
  
  return (
    <div 
      onClick={handleClick}
      className="border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-all hover:shadow-md"
    >
      {/* Thumbnail-Bild (wenn verfügbar) */}
      {displayThumbnail ? (
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 overflow-hidden relative">
          <img 
            src={displayThumbnail} 
            alt={displayTitle}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback bei Bildfehler: Zeige Platzhalter
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center">
                    <div class="text-white text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <p class="text-sm font-medium">${getDomain(url)}</p>
                    </div>
                  </div>
                `;
              }
            }}
          />
        </div>
      ) : (
        // Fallback: Farbiger Platzhalter mit Domain
        <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center">
          <div className="text-white text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-sm font-medium">{getDomain(url)}</p>
          </div>
        </div>
      )}
      
      {/* Titel und URL */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Lade Vorschau...</span>
          </div>
        ) : (
          <>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
              {displayTitle}
            </h4>
            <div className="flex items-center mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {getDomain(url)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

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
    
    // Markdown-Links: [Text](URL)
    const markdownLinkMatches = Array.from(content.matchAll(/\[(.*?)\]\((.*?)\)/g))
      .filter(match => !match[0].startsWith('!')) // Bilder ausschließen
      .map(match => ({
        type: 'link',
        alt: match[1],
        url: match[2],
        isTemporary: match[2] === "wird nach dem Erstellen hochgeladen"
      }));
    
    // Reine URLs (ohne Markdown-Format): 
    // 1. Mit Protokoll: http:// oder https://
    // 2. Ohne Protokoll: www.example.com oder example.com
    // WICHTIG: Nur URLs die nicht bereits in Markdown-Links enthalten sind
    const rawUrlMatches: Array<{ type: string; alt: string; url: string; isTemporary: boolean }> = [];
    const allMarkdownUrls = new Set([...imageMatches, ...markdownLinkMatches].map(m => m.url));
    
    // Regex für URLs mit Protokoll: https?://...
    const urlWithProtocolRegex = /(?:^|[\s\n])(https?:\/\/[^\s\n\)\]\>]+)/g;
    let urlMatch;
    while ((urlMatch = urlWithProtocolRegex.exec(content)) !== null) {
      const url = urlMatch[1].trim();
      // Überspringe URLs, die bereits in Markdown-Links enthalten sind
      if (!allMarkdownUrls.has(url)) {
        rawUrlMatches.push({
          type: 'link',
          alt: url,
          url: url,
          isTemporary: false
        });
      }
    }
    
    // Regex für URLs ohne Protokoll: www.example.com oder example.com
    // Pattern: (www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+
    // Mindestens 2 Teile (Domain + TLD), z.B. "example.com" oder "www.example.com"
    // Stoppt bei Whitespace, Zeilenende, oder schließenden Klammern
    const urlWithoutProtocolRegex = /(?:^|[\s\n])((?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?:\/[^\s\n\)\]\>]*)?)(?=[\s\n\)\]\>]|$)/g;
    let urlMatchNoProtocol;
    while ((urlMatchNoProtocol = urlWithoutProtocolRegex.exec(content)) !== null) {
      const url = urlMatchNoProtocol[1].trim();
      
      // Überspringe, wenn bereits in Markdown-Links enthalten
      if (allMarkdownUrls.has(url) || allMarkdownUrls.has(`https://${url}`) || allMarkdownUrls.has(`http://${url}`)) {
        continue;
      }
      
      // Überspringe, wenn bereits als URL mit Protokoll erkannt
      if (rawUrlMatches.some(m => m.url === url || m.url === `https://${url}` || m.url === `http://${url}`)) {
        continue;
      }
      
      // Prüfe, ob es wirklich eine URL ist (nicht nur ein Wort)
      // Mindestens ein Punkt muss vorhanden sein (für TLD)
      if (url.includes('.')) {
        // Füge https:// hinzu, wenn kein Protokoll vorhanden ist
        const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
        rawUrlMatches.push({
          type: 'link',
          alt: url,
          url: fullUrl, // Speichere mit Protokoll für iframe
          isTemporary: false
        });
      }
    }
    
    
    const allAttachments = [...imageMatches, ...markdownLinkMatches, ...rawUrlMatches];
    
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
        
        // WICHTIG: Wenn es ein Cerebro-Media ist, zeige es NICHT als Vorschau an,
        // sondern nur als einfachen Link, da es bereits separat angezeigt wird
        // (wie bei Requests & Tasks - siehe IMAGE_PREVIEW_IMPLEMENTATION.md)
        const isCerebroMedia = attachment.url?.includes('/cerebro/media/');
        
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
        
        // WICHTIG: Cerebro-Media-Links werden NICHT als Vorschau angezeigt,
        // sondern nur als einfacher Link, da sie bereits separat angezeigt werden
        if (isCerebroMedia) {
          return (
            <div key={index} className="p-3 flex items-center border rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
          );
        }
        
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
      // WICHTIG: Cerebro-Media-Links werden NICHT als Vorschau gerendert,
      // da sie bereits separat angezeigt werden (wie bei Requests & Tasks)
      const isCerebroMedia = attachment.url?.includes('/cerebro/media/');
      if (isCerebroMedia) {
        return false; // Cerebro-Media ausschließen
      }
      
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
    
    // Filtere externe Links heraus, die als Web-Vorschau gerendert werden sollen
    const externalLinksToRender = attachments.filter(attachment => {
      // WICHTIG: Cerebro-Media-Links werden NICHT als Web-Vorschau gerendert
      const isCerebroMedia = attachment.url?.includes('/cerebro/media/');
      if (isCerebroMedia) {
        return false;
      }
      
      // Bestimme URL
      let url: string = '';
      let metadata = getAttachmentMetadata(attachment.alt, attachment.url);
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
      
      // Prüfe ob es ein externer Link ist (http://, https://, oder www./Domain ohne Protokoll)
      // URLs ohne Protokoll werden bereits mit https:// gespeichert (siehe extractAttachments)
      const isExternalLink = url.match(/^https?:\/\//);
      if (!isExternalLink) {
        return false;
      }
      
      // Prüfe ob es ein Bild ist (sollte nicht als externer Link behandelt werden)
      let isImage = false;
      let isPdf = false;
      
      if (metadata?.fileType) {
        isImage = metadata.fileType.startsWith('image/');
        isPdf = metadata.fileType === 'application/pdf';
      } else if (attachment.type === 'image') {
        isImage = true;
      } else {
        // Prüfe URL auf Bild-Endungen
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i;
        isImage = imageExtensions.test(url);
        // Prüfe URL auf PDF
        const pdfExtensions = /\.pdf(\?|$)/i;
        isPdf = pdfExtensions.test(url);
      }
      
      // Prüfe ob es eine Attachment-URL ist (Tasks/Requests)
      const isAttachmentUrl = url.includes('/api/requests/attachments/') || 
                             url.includes('/api/tasks/attachments/');
      
      // Nur echte externe Links rendern (keine Bilder, PDFs, Attachments)
      return isExternalLink && !isImage && !isPdf && !isAttachmentUrl;
    });
    
    // Ersetze externe Links aus dem Text (werden separat als Vorschau gerendert)
    // 1. Markdown-Links: [Text](URL)
    processedContent = processedContent.replace(linkRegex, (match, alt, url) => {
      // Überspringe Links, die bereits als Bilder behandelt wurden
      if (match.startsWith('![')) {
        return match;
      }
      
      // Prüfe ob es ein externer Link ist, der als Vorschau gerendert wird
      const isExternalLink = url.match(/^https?:\/\//);
      const isCerebroMedia = url.includes('/cerebro/media/');
      const isAttachmentUrl = url.includes('/api/requests/attachments/') || 
                             url.includes('/api/tasks/attachments/');
      
      // Prüfe ob es ein Bild oder PDF ist
      const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i;
      const pdfExtensions = /\.pdf(\?|$)/i;
      const isImage = imageExtensions.test(url);
      const isPdf = pdfExtensions.test(url);
      
      // Prüfe ob dieser Link in externalLinksToRender enthalten ist
      const isInExternalLinks = externalLinksToRender.some(link => link.url === url);
      
      // Entferne externe Links komplett (werden als Vorschau gerendert)
      if (isExternalLink && !isCerebroMedia && !isAttachmentUrl && !isImage && !isPdf && isInExternalLinks) {
        return '';
      }
      
      // Andere Links als Text mit Link-Referenz
      return `${alt} [Link]`;
    });
    
    // 2. Reine URLs (ohne Markdown-Format): http://, https://, oder www.example.com
    // Entferne URLs, die in externalLinksToRender enthalten sind
    externalLinksToRender.forEach(link => {
      // link.url enthält bereits https:// (wenn ursprünglich ohne Protokoll)
      // link.alt enthält die ursprüngliche URL (mit oder ohne Protokoll)
      const originalUrl = link.alt; // Ursprüngliche URL wie im Text
      const fullUrl = link.url; // URL mit Protokoll für iframe
      
      // Erstelle Regex, die die ursprüngliche URL findet (am Zeilenanfang, nach Whitespace, oder am Zeilenende)
      const urlEscaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Finde URL mit optionalem Whitespace davor und danach
      const urlRegex = new RegExp(`(?:^|[\\s\\n])(${urlEscaped})(?:[\\s\\n]|$)`, 'g');
      processedContent = processedContent.replace(urlRegex, (match, urlMatch) => {
        // Entferne die URL komplett (wird als Vorschau gerendert)
        // Behalte nur Whitespace, wenn vorhanden
        const before = match.substring(0, match.indexOf(urlMatch));
        const after = match.substring(match.indexOf(urlMatch) + urlMatch.length);
        return (before.trim() + ' ' + after.trim()).trim() || '';
      });
    });
    
    // Entferne auch alle Leerzeilen, die durch das Entfernen der Links entstehen könnten
    processedContent = processedContent.replace(/\n{3,}/g, '\n\n').trim();
    
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
    
    // Rendere externe Links als statische Bildvorschau (wie X.com)
    const renderExternalLinks = () => {
      if (externalLinksToRender.length === 0) {
        return null;
      }
      
      // Entferne Duplikate basierend auf URL
      const uniqueLinks = externalLinksToRender.reduce((acc, current) => {
        const url = current.url || '';
        if (!acc.some(link => (link.url || '') === url)) {
          acc.push(current);
        }
        return acc;
      }, [] as typeof externalLinksToRender);
      
      return (
        <div className="flex flex-col gap-3 mt-2">
          {uniqueLinks.map((attachment, index) => {
            return (
              <ExternalLinkPreview 
                key={`link-${attachment.alt}-${attachment.url}-${index}`}
                url={attachment.url || ''}
                alt={attachment.alt || attachment.url || ''}
              />
            );
          })}
        </div>
      );
    };
    
    return (
      <div className={`markdown-preview ${className} dark:text-gray-200`} style={style}>
        {/* Text-Inhalt ohne Bilder und externe Links */}
        {processedContent && (
          <div dangerouslySetInnerHTML={{ __html: processedContent.replace(/\n/g, '<br/>') }} />
        )}
        {/* Bilder als große Vorschau */}
        {renderFilteredAttachments()}
        {/* Externe Links als Web-Vorschau */}
        {renderExternalLinks()}
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