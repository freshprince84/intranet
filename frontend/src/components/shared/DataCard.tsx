import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import MarkdownPreview from '../MarkdownPreview.tsx';

export interface MetadataItem {
  icon?: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
  descriptionContent?: string; // Für expandierbare Beschreibung
  attachmentMetadata?: Array<{
    id: number;
    fileName: string;
    fileType: string;
    url: string;
  }>; // Attachment-Metadaten für Vorschau
  section?: 'left' | 'main' | 'main-second' | 'main-third' | 'right' | 'right-inline' | 'center' | 'full'; // Position im Layout
}

export interface DataCardProps {
  title: string | React.ReactNode;
  subtitle?: string;
  status?: {
    label: string;
    color: string;
    className?: string;
    onPreviousClick?: () => void;
    onNextClick?: () => void;
  };
  metadata: MetadataItem[];
  actions?: React.ReactNode;
  expandable?: {
    isExpanded: boolean;
    content: React.ReactNode;
    onToggle: () => void;
  };
  onClick?: () => void;
  className?: string;
  headerClassName?: string;
  highlightBorder?: boolean;
  highlightColor?: string;
  children?: React.ReactNode;
}

// Komponente für expandierbare Beschreibung
const DescriptionMetadataItem: React.FC<{ item: MetadataItem }> = ({ item }) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const firstLineRef = useRef<HTMLParagraphElement>(null);
  
  // Beschreibung als Plain Text (ohne Markdown) für die Vorschau extrahieren
  const getPlainTextPreview = (markdown: string | React.ReactNode): string => {
    // Wenn es kein String ist, versuche es zu konvertieren oder gib leeren String zurück
    if (typeof markdown !== 'string') {
      if (markdown === null || markdown === undefined) {
        return '';
      }
      // Wenn es ein React-Element ist, können wir den Text nicht extrahieren
      // In diesem Fall geben wir einen leeren String zurück oder versuchen toString()
      return String(markdown);
    }
    
    // Entferne Markdown-Syntax für Vorschau
    let plain = markdown
      .replace(/^#+\s+/gm, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Bilder komplett entfernen
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '') // Links komplett entfernen (nicht nur alt-Text)
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/^\s*[-*+]\s+/gm, '') // List items
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered list
      // Entferne verbleibende Dateinamen, die wie Attachment-Dateinamen aussehen
      .replace(/\b\d{4}-\d{2}-\d{2}_\d{2}h\d{2}_\d{2}\.\w+\b/g, '')
      .replace(/\s+/g, ' ') // Mehrfache Leerzeichen zu einem
      .trim();
    
    return plain;
  };
  
  const fullText = getPlainTextPreview(item.descriptionContent || '');
  
  // Erste Zeile extrahieren (ungefähr die ersten 150 Zeichen oder bis zum ersten Zeilenumbruch)
  // Versucht nach einem Wortende zu schneiden, nicht mitten im Wort
  const getFirstLine = (text: string): string => {
    const firstNewline = text.indexOf('\n');
    if (firstNewline > 0 && firstNewline < 150) {
      return text.substring(0, firstNewline);
    }
    if (text.length > 150) {
      // Suche nach einem guten Schnittpunkt (nach einem Leerzeichen oder Satzzeichen)
      let cutPoint = 150;
      for (let i = 150; i > 100; i--) {
        if (text[i] === ' ' || text[i] === '.' || text[i] === ',' || text[i] === '!' || text[i] === '?') {
          cutPoint = i + 1;
          break;
        }
      }
      return text.substring(0, cutPoint);
    }
    return text;
  };
  
  const firstLine = getFirstLine(fullText);
  // Prüfe ob mehr Content vorhanden ist (Text länger als erste Zeile ODER Zeilenumbruch vorhanden)
  const hasMoreContent = fullText.length > firstLine.length || fullText.includes('\n');
  
  // Rest-Text extrahieren (alles nach der ersten Zeile)
  const getRemainingText = (text: string, firstLineText: string): string => {
    if (!text || !firstLineText) return '';
    
    const firstLineIndex = text.indexOf(firstLineText);
    if (firstLineIndex === -1) {
      // Fallback: Versuche Zeilenumbruch zu finden
      const firstNewline = text.indexOf('\n');
      if (firstNewline > 0) {
        return text.substring(firstNewline + 1).trim();
      }
      // Wenn kein Zeilenumbruch, nimm Rest nach der ersten Zeile
      return text.length > firstLineText.length ? text.substring(firstLineText.length).trim() : '';
    }
    
    // Wenn Zeilenumbruch vorhanden, nimm alles danach
    const firstNewline = text.indexOf('\n', firstLineIndex);
    if (firstNewline > 0) {
      return text.substring(firstNewline + 1).trim();
    }
    
    // Wenn keine Zeilenumbruch, nimm Rest nach der ersten Zeile
    const remainingStart = firstLineIndex + firstLineText.length;
    return text.length > remainingStart 
      ? text.substring(remainingStart).trim() 
      : '';
  };
  
  const remainingPlainText = hasMoreContent ? getRemainingText(fullText, firstLine) : '';
  
  // Debug: Aktivieren für Troubleshooting (NACH remainingPlainText Initialisierung)
  // console.log('DescriptionMetadataItem:', {
  //   firstLine,
  //   fullText,
  //   hasMoreContent,
  //   fullTextLength: fullText.length,
  //   firstLineLength: firstLine.length,
  //   hasNewline: fullText.includes('\n'),
  //   remainingPlainText,
  //   remainingMarkdown,
  //   descriptionContent: item.descriptionContent
  // });
  
  // Prüfe ob Text mehr als eine Zeile benötigt (nach dem ersten Render)
  useEffect(() => {
    if (firstLineRef.current && fullText) {
      // Erstelle temporäres Element zum Messen der Textbreite
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.visibility = 'hidden';
      tempDiv.style.width = firstLineRef.current.offsetWidth + 'px';
      tempDiv.style.whiteSpace = 'nowrap';
      tempDiv.style.fontSize = window.getComputedStyle(firstLineRef.current).fontSize;
      tempDiv.style.fontFamily = window.getComputedStyle(firstLineRef.current).fontFamily;
      tempDiv.textContent = fullText;
      document.body.appendChild(tempDiv);
      
      const fullTextWidth = tempDiv.scrollWidth;
      const firstLineWidth = firstLineRef.current.scrollWidth;
      const isOverflowing = fullTextWidth > firstLineWidth || hasMoreContent;
      
      setNeedsExpansion(isOverflowing && hasMoreContent);
      document.body.removeChild(tempDiv);
    }
  }, [fullText, hasMoreContent]);
  
  // Rest-Markdown extrahieren (für die Anzeige beim Aufklappen)
  const getRemainingMarkdown = (markdown: string, firstLinePlain: string): string => {
    if (!markdown) return '';
    
    // Versuche zuerst nach Zeilenumbruch zu schneiden
    const firstNewline = markdown.indexOf('\n');
    if (firstNewline > 0) {
      return markdown.substring(firstNewline + 1).trim();
    }
    
    // Wenn kein Zeilenumbruch, finde die Position der ersten Zeile im Plain Text
    const plainText = getPlainTextPreview(markdown);
    const firstLineIndex = plainText.indexOf(firstLinePlain);
    
    if (firstLineIndex >= 0 && plainText.length > firstLineIndex + firstLinePlain.length) {
      // Berechne wie viele Zeichen im Markdown der ersten Zeile entsprechen
      // Vereinfachter Ansatz: Wenn Plain Text länger ist, schneide Markdown entsprechend
      const remainingPlainLength = plainText.length - (firstLineIndex + firstLinePlain.length);
      if (remainingPlainLength > 0 && markdown.length > firstLinePlain.length) {
        // Suche nach einem guten Schnittpunkt im Markdown (nach der ersten Zeile)
        // Versuche nach ~150 Zeichen oder nach der ersten Zeile zu schneiden
        let cutPoint = Math.min(150, markdown.length);
        
        // Suche rückwärts nach einem Wortende
        for (let i = cutPoint; i > 100 && i < markdown.length; i--) {
          if (markdown[i] === ' ' || markdown[i] === '.' || markdown[i] === ',' || markdown[i] === '\n') {
            cutPoint = i + 1;
            break;
          }
        }
        
        // Wenn die erste Zeile länger ist als der Schnittpunkt, verwende die Länge der ersten Zeile
        if (firstLinePlain.length > cutPoint) {
          cutPoint = firstLinePlain.length;
          // Suche nach einem Wortende nach der ersten Zeile
          for (let i = cutPoint; i < markdown.length && i < cutPoint + 50; i++) {
            if (markdown[i] === ' ' || markdown[i] === '.' || markdown[i] === ',' || markdown[i] === '\n') {
              cutPoint = i + 1;
              break;
            }
          }
        }
        
        if (markdown.length > cutPoint) {
          return markdown.substring(cutPoint).trim();
        }
      }
    }
    
    return '';
  };
  
  // Berechne remainingMarkdown immer (nicht nur wenn expanded), damit wir es für die Bedingung verwenden können
  const remainingMarkdown = hasMoreContent ? getRemainingMarkdown(item.descriptionContent || '', firstLine) : '';
  
  // Extrahiere Anhänge aus dem gesamten descriptionContent (nicht nur aus remainingMarkdown)
  const fullDescriptionContent = item.descriptionContent || '';
  
  // Debug: Aktivieren für Troubleshooting (NACH allen Initialisierungen)
  // console.log('DescriptionMetadataItem:', {
  //   firstLine,
  //   fullText,
  //   hasMoreContent,
  //   fullTextLength: fullText.length,
  //   firstLineLength: firstLine.length,
  //   hasNewline: fullText.includes('\n'),
  //   remainingPlainText,
  //   remainingMarkdown,
  //   descriptionContent: item.descriptionContent
  // });
  
  // Prüfe, ob Bilder im gesamten Text vorhanden sind (unabhängig von remainingMarkdown)
  const hasImages = /!\[([^\]]*)\]\([^)]+\)/.test(fullDescriptionContent);
  
  // Pfeil soll NUR erscheinen, wenn mehr Text vorhanden ist (nicht nur wegen Bilder)
  const shouldShowExpandButton = hasMoreContent && needsExpansion;
  
  return (
    <div className={`text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400 ${item.className || ''}`}>
      {/* Hauptzeile: Text, Pfeil rechts (ohne Label) */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Text - kann umbrechen, keine line-clamp mehr */}
        <span 
          ref={firstLineRef}
          className="text-gray-900 dark:text-white flex-1 min-w-0 break-words whitespace-pre-wrap"
        >
          {firstLine}
        </span>
        {/* Pfeil rechts, nach dem Text - erscheint wenn mehr Text ODER Bilder vorhanden */}
        {shouldShowExpandButton && !isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors ml-0.5 sm:ml-1 mr-2 sm:mr-3"
            title={t('dataCard.expandDescription')}
          >
            <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8" />
          </button>
        )}
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors ml-0.5 sm:ml-1 mr-2 sm:mr-3"
            title={t('dataCard.collapseDescription')}
          >
            <ChevronDownIcon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 xl:h-8 xl:w-8" />
          </button>
        )}
      </div>
      {/* Bilder IMMER anzeigen (auch wenn nicht expanded) */}
      {hasImages && (
        <div className={firstLine.trim() === '' ? 'mt-0' : 'mt-2'}>
          <MarkdownPreview 
            content={fullDescriptionContent} 
            showImagePreview={true}
            attachmentMetadata={item.attachmentMetadata || []}
          />
        </div>
      )}
      {/* REST-TEXT NUR wenn expanded UND es gibt mehr Text (Bilder werden bereits oben angezeigt) */}
      {isExpanded && hasMoreContent && (() => {
        // Vereinfachte Logik: Zeige einfach den REST-Text nach der ersten Zeile
        let restContent = '';
        
        // Versuche zuerst remainingPlainText (einfachste Methode)
        if (remainingPlainText && remainingPlainText.trim() !== '') {
          restContent = remainingPlainText;
        }
        // Fallback: Schneide einfach nach firstLine.length im Plain Text
        else if (fullText.length > firstLine.length) {
          restContent = fullText.substring(firstLine.length).trim();
        }
        
        // Zeige REST-Text wenn vorhanden
        if (restContent && restContent.trim() !== '') {
          return (
            <div className="mt-1">
              <div className="dark:text-gray-200 break-words text-gray-900 dark:text-white whitespace-pre-wrap">
                {restContent.trim()}
              </div>
            </div>
          );
        }
        
        return null;
      })()}
    </div>
  );
};

const DataCard: React.FC<DataCardProps> = ({
  title,
  subtitle,
  status,
  metadata,
  actions,
  expandable,
  onClick,
  className = '',
  headerClassName = '',
  highlightBorder = false,
  highlightColor = 'green',
  children
}) => {
  const { t } = useTranslation();
  const borderClass = highlightBorder
    ? `border-2 border-${highlightColor}-500 dark:border-${highlightColor}-600`
    : 'border border-gray-300 dark:border-gray-700';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg ${borderClass} p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} w-full overflow-hidden ${className}`}
      onClick={onClick}
    >
      {/* Mobile Layout (sm und kleiner) */}
      <div className="block sm:hidden">
        {/* Zeile 1: Resp/QC links, Datum rechts (50:50) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Links: Resp und QC nebeneinander */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Resp (main) */}
            {metadata.filter(item => item.section === 'main' || (!item.section && (item.label === 'Angefragt von' || item.label === 'Verantwortlicher'))).map((item, index) => {
              if (item.descriptionContent) return null;
              return (
                <div key={index} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label && <span className="font-medium whitespace-nowrap">{item.label}:</span>}
                  <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                    {typeof item.value === 'string' ? item.value : item.value}
                  </span>
                </div>
              );
            })}
            {/* QC (main-second) */}
            {metadata.filter(item => item.section === 'main-second' || (!item.section && item.label === 'Qualitätskontrolle')).map((item, index) => {
              if (item.descriptionContent) return null;
              return (
                <div key={index} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label && <span className="font-medium whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                  <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                    {typeof item.value === 'string' ? item.value : item.value}
                  </span>
                </div>
              );
            })}
            {/* main-third (Para/Responsible) */}
            {metadata.filter(item => item.section === 'main-third' || (!item.section && item.label === 'Verantwortlicher')).map((item, index) => {
              if (item.descriptionContent) return null;
              return (
                <div key={index} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0">
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label && <span className="font-medium whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                  <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                    {typeof item.value === 'string' ? item.value : item.value}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Rechts: Datum (50%) */}
          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 flex-shrink-0" style={{ width: '50%', justifyContent: 'flex-end' }}>
            {metadata.filter(item => item.section === 'right-inline').map((item, index) => (
              <React.Fragment key={index}>
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                  {typeof item.value === 'string' ? item.value : item.value}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Zeile 2: Titel (60-70%) | Status (30-40%) */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Titel links (60-70%) */}
          <div className="flex-1 min-w-0" style={{ flex: '0 0 65%' }}>
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-gray-900 dark:text-white break-words text-sm" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                {subtitle}
              </p>
            )}
          </div>
          {/* Status rechts (30-40%) */}
          {status && (
            <div className="flex items-center gap-0.5 flex-shrink-0" style={{ flex: '0 0 35%', justifyContent: 'flex-end' }}>
              {/* Status-Shift-Button (links) */}
              {status.onPreviousClick ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    status.onPreviousClick?.();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors flex-shrink-0"
                  title={t('dataCard.previousStatus')}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
              ) : null}
              <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${status.color} ${status.className || ''} whitespace-nowrap flex-shrink-0`}>
                {status.label}
              </span>
              {/* Status-Shift-Button (rechts) */}
              {status.onNextClick ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    status.onNextClick?.();
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors flex-shrink-0"
                  title={t('dataCard.nextStatus')}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          )}
        </div>
        
        {/* Right-Metadaten für Mobile - unter Status, NUR wenn KEIN 3-Spalten-Layout aktiv ist */}
        {metadata.filter(item => item.section === 'right').length > 0 && metadata.filter(item => item.section === 'center').length === 0 && (
          <div className="flex flex-col items-end gap-1 mb-2">
            {metadata.filter(item => item.section === 'right').map((item, index) => {
              return (
                <div
                  key={index}
                  className="flex items-center gap-1 justify-end text-xs text-gray-600 dark:text-gray-400"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  {item.label && <span className="font-medium mr-1 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                  <span className={`${item.className || 'text-gray-900 dark:text-white'} break-words`}>
                    {typeof item.value === 'string' ? item.value : item.value}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Desktop Layout (sm und größer) */}
      <div className="hidden sm:block">
        {/* Container für Titel links und alle Metadaten rechts - Grid-Layout mit 2 Spalten */}
        <div className="grid items-center gap-4 mb-2" style={{ gridTemplateColumns: '1fr auto' }}>
          {/* Titel links - flexibel, nimmt nur benötigten Platz, kann umbrechen */}
          <div className="min-w-0 pr-2">
            {typeof title === 'string' ? (
              <h3 className="font-semibold text-gray-900 dark:text-white break-words" style={{ fontSize: 'clamp(0.9375rem, 1.2vw + 0.5rem, 1.25rem)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-500 dark:text-gray-400 mt-1 break-words">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Rechts: Alle Metadaten zusammen (Typ, Solicitado por, Responsable, Datum, Status) - rechtsbündig ausgerichtet, flexibel für Responsive */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 md:gap-3 flex-nowrap overflow-visible">
            {/* Typ (erste Zeile, auf gleicher Höhe wie Titel) - main mit und ohne Label */}
            {metadata.filter(item => item.section === 'main').length > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400 whitespace-nowrap">
                {metadata
                  .filter(item => item.section === 'main')
                  .map((item, index, array) => {
                    if (item.descriptionContent) return null;
                    
                    const prevItem = index > 0 ? array[index - 1] : null;
                    const isCheckInOut = item.label?.includes('Check-in') || item.label?.includes('Check-out');
                    const prevIsRoom = prevItem?.label === 'Zimmer' || prevItem?.label?.includes('Zimmer');
                    const needsExtraSpacing = isCheckInOut && prevIsRoom;
                    
                    return (
                      <React.Fragment key={index}>
                        {needsExtraSpacing && <span className="ml-2 sm:ml-3" />}
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        {item.label && <span className="font-medium whitespace-nowrap flex-shrink-0">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                        <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                          {typeof item.value === 'string' ? item.value : item.value}
                        </span>
                      </React.Fragment>
                    );
                  })}
              </div>
            )}
            
            {/* Container für Solicitado por + Responsable (nebeneinander, immer zusammen) */}
            <div className="flex items-center gap-0.5 text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg 2xl:text-xl text-gray-600 dark:text-gray-400 flex-nowrap whitespace-nowrap flex-shrink-0">
              {/* Solicitado por */}
              {metadata.filter(item => (item.section === 'main-second' && item.label) || (!item.section && item.label === 'Angefragt von')).map((item, index) => {
                if (item.descriptionContent) return null;
                
                return (
                  <React.Fragment key={index}>
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    {item.label && <span className="font-medium whitespace-nowrap flex-shrink-0">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                    <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap flex-shrink-0`}>
                      {typeof item.value === 'string' ? item.value : item.value}
                    </span>
                  </React.Fragment>
                );
              })}
              
              {/* Responsable (direkt daneben) */}
              {metadata.filter(item => item.section === 'main-third' || (!item.section && item.label === 'Verantwortlicher')).map((item, index) => {
                if (item.descriptionContent) return null;
                
                return (
                  <React.Fragment key={index}>
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    {item.label && <span className="font-medium whitespace-nowrap flex-shrink-0">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                    <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap flex-shrink-0`}>
                      {typeof item.value === 'string' ? item.value : item.value}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
            
            {/* Datum (right-inline) */}
            {metadata.filter(item => item.section === 'right-inline').map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400 flex-shrink-0 whitespace-nowrap"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className={`${item.className || 'text-gray-900 dark:text-white'} whitespace-nowrap`}>
                  {typeof item.value === 'string' ? item.value : item.value}
                </span>
              </div>
            ))}
            
            {/* Status - sicherstellen dass innerhalb der Card bleibt */}
            {status && (
              <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0 min-w-0">
                {/* Status-Shift-Button (links) */}
                {status.onPreviousClick ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      status.onPreviousClick?.();
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors flex-shrink-0"
                    title={t('dataCard.previousStatus')}
                  >
                    <ChevronLeftIcon className="h-6 w-6" />
                  </button>
                ) : null}
                <span className={`px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-0.5 md:py-1 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium rounded-full ${status.color} ${status.className || ''} whitespace-nowrap flex-shrink-0`}>
                  {status.label}
                </span>
                {/* Status-Shift-Button (rechts) */}
                {status.onNextClick ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      status.onNextClick?.();
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors flex-shrink-0"
                    title={t('dataCard.nextStatus')}
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right-Metadaten (nicht inline) - unter Status, bündig ausgerichtet (für andere Komponenten) - nur Desktop, NUR wenn KEIN 3-Spalten-Layout aktiv ist */}
      {metadata.filter(item => item.section === 'right').length > 0 && metadata.filter(item => item.section === 'center').length === 0 && (
        <div className="hidden sm:flex flex-shrink-0 ml-4 flex-col items-end gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5">
          {metadata.filter(item => item.section === 'right').map((item, index) => {
            return (
              <div
                key={index}
                className="flex items-center gap-1 sm:gap-1.5 justify-end text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                {item.label && <span className="font-medium mr-1 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                <span className={`${item.className || 'text-gray-900 dark:text-white'} break-words`}>
                  {typeof item.value === 'string' ? item.value : item.value}
                </span>
              </div>
            );
          })}
        </div>
      )}


      {/* Metadaten - strukturiertes Layout (für andere Komponenten) */}
      {(() => {
        const hasCenterSection = metadata.filter(item => item.section === 'center').length > 0;
        const relevantMetadata = metadata.filter(item => 
          item.section !== 'full' && 
          item.section !== 'main' && 
          item.section !== 'main-second' && 
          item.section !== 'right-inline'
        );
        
        // Wenn center-Section vorhanden ist, müssen left, center oder right vorhanden sein
        // Wenn keine center-Section vorhanden ist, müssen left oder right vorhanden sein (aber nicht center)
        const shouldRender = hasCenterSection 
          ? (relevantMetadata.filter(item => item.section === 'left' || item.section === 'center' || item.section === 'right').length > 0)
          : (relevantMetadata.filter(item => item.section === 'left' || item.section === 'right' || (!item.section && item.label !== 'Angefragt von' && item.label !== 'Verantwortlicher')).length > 0);
        
        return shouldRender ? (
        <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* 3-Spalten-Layout für Reservations (wenn center-Section vorhanden) */}
          {hasCenterSection ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start justify-items-start">
              {/* Links: Titel-Bereich (Telefon/Email unter Titel) */}
              <div className="flex flex-col gap-2 items-start w-full">
                {metadata.filter(item => item.section === 'left').map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400 w-full"
                  >
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    {item.label && <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                    <span className={item.className || 'text-gray-900 dark:text-white'}>
                      {typeof item.value === 'string' ? item.value : item.value}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Mitte: Links (Zahlungslink, Check-in Link) */}
              <div className="flex flex-col gap-2 items-center">
                {metadata.filter(item => item.section === 'center').map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                  >
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    {item.label && <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                    <span className={`${item.className || 'text-gray-900 dark:text-white'} break-words`}>
                      {typeof item.value === 'string' ? item.value : item.value}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Rechts: Status-Badges und Rest */}
              <div className="flex flex-col gap-2 items-end">
                {metadata.filter(item => item.section === 'right').map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 sm:gap-1.5 justify-end text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                  >
                    {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                    {item.label && <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                    <span className={`${item.className || 'text-gray-900 dark:text-white'} break-words`}>
                      {typeof item.value === 'string' ? item.value : item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Links: Niederlassung (meist ausgeblendet) - nur wenn keine center-Section */}
              {metadata.filter(item => item.section === 'left').length > 0 && (
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {metadata.filter(item => item.section === 'left').map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                    >
                      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                      {item.label && <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>}
                      <span className={item.className || 'text-gray-900 dark:text-white'}>
                        {typeof item.value === 'string' ? item.value : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Haupt-Metadaten: Alle außer "Angefragt von" und "Verantwortlicher" (die sind jetzt im Header) */}
              {metadata.filter(item => {
                const section = item.section;
                if (section === 'main' || section === 'main-second' || section === 'right-inline' || section === 'center') return false;
                return !section && item.label !== 'Angefragt von' && item.label !== 'Verantwortlicher';
              }).length > 0 && (
                <div className="flex flex-col gap-2 sm:gap-2.5">
                  {metadata
                    .filter(item => {
                      const section = item.section;
                      if (section === 'main' || section === 'main-second' || section === 'right-inline' || section === 'center') return false;
                      return !section && item.label !== 'Angefragt von' && item.label !== 'Verantwortlicher';
                    })
                    .map((item, index) => {
                      // Spezielle Behandlung für Beschreibung mit expandierbarem Inhalt
                      if (item.descriptionContent) {
                        return <DescriptionMetadataItem key={index} item={item} />;
                      }
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                        >
                          {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                          <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label.endsWith(':') ? item.label : `${item.label}:`}</span>
                          <span className={`flex-1 min-w-0 break-words ${item.className || 'text-gray-900 dark:text-white'}`}>
                            {typeof item.value === 'string' ? item.value : item.value}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
        ) : null;
      })()}

      {/* Beschreibung/Mitteilung (section: 'full') - ganz unten in der Card */}
      {metadata.filter(item => item.section === 'full' && item.descriptionContent).length > 0 && (
        <div className="mt-4">
          {metadata.filter(item => item.section === 'full' && item.descriptionContent).map((item, index) => (
            <DescriptionMetadataItem key={index} item={item} />
          ))}
        </div>
      )}

      {/* Actions/Buttons - nach der Beschreibung, IMMER (sowohl Mobile als auch Desktop) */}
      {actions && (
        <div
          className="flex items-center space-x-2 flex-wrap justify-end mt-4"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}

      {/* Children Content (z.B. für zusätzliche Details) */}
      {children && (
        <div className="mb-4">
          {children}
        </div>
      )}

      {/* Expandable Content */}
      {expandable && (
        <div className="mb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              expandable.onToggle();
            }}
            className="flex items-center justify-between w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <span>Details</span>
            {expandable.isExpanded ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <span className="text-base lg:text-lg xl:text-xl">&lt;</span>
            )}
          </button>
          {expandable.isExpanded && (
            <div className="mt-2 pt-3">
              {expandable.content}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default DataCard;

