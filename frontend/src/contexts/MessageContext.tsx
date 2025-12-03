import React, { createContext, useState, useCallback, useRef, ReactNode } from 'react';

export type MessageType = 'success' | 'error' | 'warning' | 'info' | 'default';

export interface Message {
  content: string;
  type: MessageType;
  id: string;
}

interface MessageContextType {
  message: Message | null;
  showMessage: (content: string, type: MessageType) => void;
  clearMessage: () => void;
}

// Erstellen des Kontexts mit Standardwerten
export const MessageContext = createContext<MessageContextType>({
  message: null,
  showMessage: () => {},
  clearMessage: () => {},
});

interface MessageProviderProps {
  children: ReactNode;
}

export const MessageProvider: React.FC<MessageProviderProps> = ({ children }) => {
  const [message, setMessage] = useState<Message | null>(null);
  // ✅ FIX: messageTimeout in useRef verschieben (verhindert Re-Creation von showMessage)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Funktion zum Löschen einer Meldung
  const clearMessage = useCallback(() => {
    setMessage(null);
    
    // Timeout löschen, wenn vorhanden
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
      messageTimeoutRef.current = null;
    }
  }, []);

  // Funktion zum Anzeigen einer Meldung
  const showMessage = useCallback((content: string, type: MessageType = 'default') => {
    // Vorhandenen Timeout löschen, wenn eine neue Nachricht kommt
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }

    // Neue Meldung setzen
    const newMessage: Message = {
      content,
      type,
      id: Date.now().toString(), // Eindeutige ID für die Meldung
    };
    
    setMessage(newMessage);

    // Automatisches Ausblenden nach 3 Sekunden
    const timeout = setTimeout(() => {
      setMessage(null);
      messageTimeoutRef.current = null;
    }, 3000);

    messageTimeoutRef.current = timeout;
  }, []);

  return (
    <MessageContext.Provider
      value={{
        message,
        showMessage,
        clearMessage,
      }}
    >
      {children}
    </MessageContext.Provider>
  );
}; 