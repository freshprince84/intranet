import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import MarkdownPreview from '../MarkdownPreview.tsx';

export interface MetadataItem {
  icon?: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  className?: string;
  descriptionContent?: string; // Für expandierbare Beschreibung
  section?: 'left' | 'main' | 'main-second' | 'right' | 'right-inline' | 'full'; // Position im Layout
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const firstLineRef = useRef<HTMLParagraphElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  
  // Beschreibung als Plain Text (ohne Markdown) für die Vorschau extrahieren
  const getPlainTextPreview = (markdown: string): string => {
    // Entferne Markdown-Syntax für Vorschau
    let plain = markdown
      .replace(/^#+\s+/gm, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/^\s*[-*+]\s+/gm, '') // List items
      .replace(/^\s*\d+\.\s+/gm, '') // Numbered list
      .trim();
    
    return plain;
  };
  
  const fullText = getPlainTextPreview(item.descriptionContent || '');
  
  // Erste Zeile extrahieren (ungefähr die ersten 150 Zeichen oder bis zum ersten Zeilenumbruch)
  const getFirstLine = (text: string): string => {
    const firstNewline = text.indexOf('\n');
    if (firstNewline > 0 && firstNewline < 150) {
      return text.substring(0, firstNewline);
    }
    return text.length > 150 ? text.substring(0, 150) : text;
  };
  
  const firstLine = getFirstLine(fullText);
  const hasMoreContent = fullText.length > firstLine.length || fullText.includes('\n');
  
  // Rest-Text extrahieren (alles nach der ersten Zeile)
  const getRemainingText = (text: string, firstLineText: string): string => {
    const firstLineIndex = text.indexOf(firstLineText);
    if (firstLineIndex === -1) {
      // Fallback: Versuche Zeilenumbruch zu finden
      const firstNewline = text.indexOf('\n');
      if (firstNewline > 0) {
        return text.substring(firstNewline + 1).trim();
      }
      return text.length > firstLineText.length ? text.substring(firstLineText.length).trim() : '';
    }
    
    // Wenn Zeilenumbruch vorhanden, nimm alles danach
    const firstNewline = text.indexOf('\n', firstLineIndex);
    if (firstNewline > 0) {
      return text.substring(firstNewline + 1).trim();
    }
    
    // Wenn keine Zeilenumbruch, nimm Rest nach der ersten Zeile
    return text.length > firstLineIndex + firstLineText.length 
      ? text.substring(firstLineIndex + firstLineText.length).trim() 
      : '';
  };
  
  const remainingPlainText = hasMoreContent ? getRemainingText(fullText, firstLine) : '';
  
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
    // Finde die Position der ersten Zeile im Plain Text
    const plainText = getPlainTextPreview(markdown);
    const firstLineIndex = plainText.indexOf(firstLinePlain);
    
    if (firstLineIndex === -1) {
      // Fallback: Versuche Zeilenumbruch zu finden
      const firstNewline = markdown.indexOf('\n');
      if (firstNewline > 0) {
        return markdown.substring(firstNewline + 1).trim();
      }
      return '';
    }
    
    // Finde den ersten Zeilenumbruch nach der ersten Zeile
    const firstNewline = markdown.indexOf('\n', 0);
    if (firstNewline > 0) {
      return markdown.substring(firstNewline + 1).trim();
    }
    
    // Wenn kein Zeilenumbruch, müssen wir schätzen wo im Markdown die erste Zeile endet
    // Vereinfachter Ansatz: Versuche nach ~150 Zeichen zu schneiden
    if (markdown.length > 150) {
      // Suche nach einem guten Schnittpunkt (nach einem Leerzeichen oder Satzzeichen)
      let cutPoint = 150;
      for (let i = 150; i < markdown.length && i < 200; i++) {
        if (markdown[i] === ' ' || markdown[i] === '.' || markdown[i] === '\n') {
          cutPoint = i + 1;
          break;
        }
      }
      return markdown.substring(cutPoint).trim();
    }
    
    return '';
  };
  
  const remainingMarkdown = isExpanded && hasMoreContent ? getRemainingMarkdown(item.descriptionContent || '', firstLine) : '';
  
  return (
    <div className={`text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400 ${item.className || ''}`}>
      {/* Hauptzeile: Label, Text und Pfeil */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <div className="flex-1 min-w-0 flex items-center gap-1 sm:gap-1.5">
          <span ref={labelRef} className="font-medium mr-1 sm:mr-2 whitespace-nowrap flex-shrink-0">{item.label}:</span>
          {/* Erste Zeile - immer sichtbar, auf eine Zeile begrenzt */}
          <span 
            ref={firstLineRef}
            className="text-gray-900 dark:text-white line-clamp-1 flex-1 min-w-0"
          >
            {firstLine}
          </span>
        </div>
        {/* Pfeil ganz rechts, bündig mit anderen Elementen */}
        {(hasMoreContent && needsExpansion && !isExpanded) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Beschreibung aufklappen"
          >
            <span className="text-base lg:text-lg xl:text-xl">&lt;</span>
          </button>
        )}
        {isExpanded && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="Beschreibung einklappen"
          >
            <ChevronDownIcon className="h-4 w-4 lg:h-5 lg:w-5 xl:h-6 xl:w-6" />
          </button>
        )}
      </div>
      {/* Container für expandierten Inhalt - unter der Hauptzeile */}
      {isExpanded && hasMoreContent && remainingMarkdown && (
        <div 
          className="mt-1" 
          style={{ 
            marginLeft: labelRef.current ? `${labelRef.current.offsetWidth + 8}px` : 'calc(0.75rem * 5 + 0.5rem)'
          }}
        >
          <MarkdownPreview content={remainingMarkdown} showImagePreview={true} maxHeight="none" />
        </div>
      )}
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
  const borderClass = highlightBorder
    ? `border-2 border-${highlightColor}-500 dark:border-${highlightColor}-600`
    : 'border border-gray-300 dark:border-gray-700';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg ${borderClass} p-3 sm:p-4 md:p-5 lg:p-6 shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} w-full overflow-hidden ${className}`}
      onClick={onClick}
    >
      {/* Container für Titel links und Mitte/Rechts - Grid-Layout mit FIXEN Spaltenbreiten */}
      <div className="grid items-start gap-4 mb-2 min-w-0" style={{ gridTemplateColumns: '200px 180px auto' }}>
        {/* Titel links - fixe Breite, unabhängig vom Inhalt */}
        <div className="min-w-0 pr-2 overflow-hidden">
          {typeof title === 'string' ? (
            <h3 className="font-semibold text-gray-900 dark:text-white truncate" style={{ fontSize: 'clamp(0.9375rem, 1.2vw + 0.5rem, 1.25rem)' }}>
              {title}
            </h3>
          ) : (
            title
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-500 dark:text-gray-400 mt-1 truncate">
              {subtitle}
            </p>
          )}
        </div>
        
        {/* Mitte: Solicitado por + Responsable (untereinander, bündig) - FIXE Position, unabhängig vom Titel */}
        <div className="flex flex-col gap-1 sm:gap-1.5">
            {/* Solicitado por (erste Zeile) */}
            {metadata.filter(item => item.section === 'main' || (!item.section && item.label === 'Angefragt von')).length > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400">
                {metadata
                  .filter(item => item.section === 'main' || (!item.section && item.label === 'Angefragt von'))
                  .map((item, index) => {
                    if (item.descriptionContent) return null;
                    
                    return (
                      <React.Fragment key={index}>
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        <span className="font-medium mr-1 whitespace-nowrap">{item.label}:</span>
                        <span className={`${item.className || 'text-gray-900 dark:text-white'}`}>
                          {typeof item.value === 'string' ? item.value : item.value}
                        </span>
                      </React.Fragment>
                    );
                  })}
              </div>
            )}
            
            {/* Responsable (zweite Zeile, bündig unter Solicitado por) */}
            {metadata.filter(item => item.section === 'main-second' || (!item.section && item.label === 'Verantwortlicher')).length > 0 && (
              <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400">
                {metadata
                  .filter(item => item.section === 'main-second' || (!item.section && item.label === 'Verantwortlicher'))
                  .map((item, index) => {
                    if (item.descriptionContent) return null;
                    
                    return (
                      <React.Fragment key={index}>
                        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                        <span className="font-medium mr-1 whitespace-nowrap">{item.label}:</span>
                        <span className={`${item.className || 'text-gray-900 dark:text-white'}`}>
                          {typeof item.value === 'string' ? item.value : item.value}
                        </span>
                      </React.Fragment>
                    );
                  })}
              </div>
            )}
        </div>
        
        {/* Rechts: Datum + Status (mit mehr Abstand) - sicherstellen dass innerhalb der Card */}
        <div className="flex items-center gap-4 sm:gap-5 min-w-0 flex-shrink-0">
            {/* Datum (right-inline) */}
            {metadata.filter(item => item.section === 'right-inline').map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className={item.className || 'text-gray-900 dark:text-white'}>
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
                    title="Vorheriger Status"
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
                    title="Nächster Status"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </button>
                ) : null}
              </div>
            )}
        </div>
      </div>
      
      {/* Right-Metadaten (nicht inline) - unter Status, bündig ausgerichtet (für andere Komponenten) */}
      {metadata.filter(item => item.section === 'right').length > 0 && (
        <div className="flex-shrink-0 ml-4 flex flex-col items-end gap-1 sm:gap-2 mb-3 sm:mb-4 md:mb-5">
          {metadata.filter(item => item.section === 'right').map((item, index) => {
            const leftPlaceholderWidth = status?.onPreviousClick ? 'w-8 sm:w-10 md:w-12' : 'w-8 sm:w-10 md:w-12';
            const rightPlaceholderWidth = status?.onNextClick ? 'w-8 sm:w-10 md:w-12' : 'w-8 sm:w-10 md:w-12';
            
            return (
              <div
                key={index}
                className="flex items-center gap-1 justify-end"
              >
                <div className={`${leftPlaceholderWidth} flex-shrink-0`} />
                <div
                  className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md ${item.className || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50'} text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl font-medium`}
                  title={item.label || 'Fälligkeit'}
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className={item.className || 'text-gray-900 dark:text-white'}>
                    {typeof item.value === 'string' ? item.value : item.value}
                  </span>
                </div>
                <div className={`${rightPlaceholderWidth} flex-shrink-0`} />
              </div>
            );
          })}
        </div>
      )}

      {/* Dritte Zeile: Beschreibung */}
      {metadata.filter(item => item.section === 'full' && item.descriptionContent).length > 0 && (
        <div className="mb-3 sm:mb-4 mt-2 sm:mt-2.5">
          {metadata.filter(item => item.section === 'full' && item.descriptionContent).map((item, index) => (
            <DescriptionMetadataItem key={index} item={item} />
          ))}
        </div>
      )}

      {/* Metadaten - strukturiertes Layout (für andere Komponenten) */}
      {metadata.filter(item => item.section !== 'full' && item.section !== 'main' && item.section !== 'main-second' && item.section !== 'right-inline').length > 0 && (
        <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
          {/* Links: Niederlassung (meist ausgeblendet) */}
          {metadata.filter(item => item.section === 'left').length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {metadata.filter(item => item.section === 'left').map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl 2xl:text-2xl text-gray-600 dark:text-gray-400"
                >
                  {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                  <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label}:</span>
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
            if (section === 'main' || section === 'main-second' || section === 'right-inline') return false;
            return !section && item.label !== 'Angefragt von' && item.label !== 'Verantwortlicher';
          }).length > 0 && (
            <div className="flex flex-col gap-2 sm:gap-2.5">
              {metadata
                .filter(item => {
                  const section = item.section;
                  if (section === 'main' || section === 'main-second' || section === 'right-inline') return false;
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
                      <span className="font-medium mr-1 sm:mr-2 whitespace-nowrap">{item.label}:</span>
                      <span className={`flex-1 min-w-0 break-words ${item.className || 'text-gray-900 dark:text-white'}`}>
                        {typeof item.value === 'string' ? item.value : item.value}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
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
            <div className="mt-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              {expandable.content}
            </div>
          )}
        </div>
      )}

      {/* Action-Buttons */}
      {actions && (
        <div
          className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

export default DataCard;

