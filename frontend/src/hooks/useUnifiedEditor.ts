import { useCallback } from 'react';
import { RefObject } from 'react';

interface UseUnifiedEditorOptions {
  textareaRef: RefObject<HTMLTextAreaElement>;
  content: string;
  setContent: (content: string) => void;
  onUpload: (file: File) => Promise<{ url: string; fileName: string }>;
  setUploading?: (uploading: boolean) => void;
  setError?: (error: string | null) => void;
}

/**
 * Wiederverwendbarer Hook für unified Editor mit Drag & Drop und Paste-Unterstützung
 * 
 * @param options - Konfigurationsoptionen für den Hook
 * @returns Handler-Funktionen für Paste, Drop und DragOver
 */
export const useUnifiedEditor = ({
  textareaRef,
  content,
  setContent,
  onUpload,
  setUploading,
  setError
}: UseUnifiedEditorOptions) => {
  
  /**
   * Lädt eine Datei hoch und fügt einen Markdown-Link an der Cursorposition ein
   */
  const uploadFileAndInsertLink = useCallback(async (file: File) => {
    if (setUploading) setUploading(true);
    if (setError) setError(null);

    try {
      const result = await onUpload(file);
      
      // Markdown-Link generieren
      let insertText = '';
      if (file.type.startsWith('image/')) {
        // Für Bilder einen Markdown-Image-Link einfügen
        insertText = `\n![${result.fileName}](${result.url})\n`;
      } else {
        // Für andere Dateien einen normalen Link
        insertText = `\n[${result.fileName}](${result.url})\n`;
      }
      
      // Füge den Link an der aktuellen Cursorposition ein
      if (textareaRef.current) {
        const cursorPos = textareaRef.current.selectionStart;
        const textBefore = content.substring(0, cursorPos);
        const textAfter = content.substring(cursorPos);
        
        setContent(textBefore + insertText + textAfter);
        
        // Setze den Cursor hinter den eingefügten Link
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = cursorPos + insertText.length;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
      } else {
        setContent(content + insertText);
      }
    } catch (err) {
      console.error('Fehler beim Verarbeiten der Datei:', err);
      const error = err as any;
      const errorMessage = error.response?.data?.message || error.message || 'Ein unerwarteter Fehler ist aufgetreten';
      if (setError) setError(errorMessage);
    } finally {
      if (setUploading) setUploading(false);
    }
  }, [content, setContent, onUpload, textareaRef, setUploading, setError]);
  
  /**
   * Verarbeitet Paste-Events und erkennt Bilder im Clipboard
   */
  const handlePaste = useCallback(async (event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Prüfen, ob das eingefügte Element ein Bild ist
      if (item.type.indexOf('image') === 0) {
        event.preventDefault(); // Standardeingabe verhindern
        
        const file = item.getAsFile();
        if (file) {
          await uploadFileAndInsertLink(file);
        }
        return;
      }
    }
  }, [uploadFileAndInsertLink]);
  
  /**
   * Verarbeitet Drop-Events für Drag & Drop von Dateien
   */
  const handleDrop = useCallback(async (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      await uploadFileAndInsertLink(file);
    }
  }, [uploadFileAndInsertLink]);
  
  /**
   * Verhindert Standard-Drag-Verhalten
   */
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    handlePaste,
    handleDrop,
    handleDragOver
  };
};

