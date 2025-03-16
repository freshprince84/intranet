import React, { createContext, useState, useCallback, ReactNode } from 'react';

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
  const [messageTimeout, setMessageTimeout] = useState<NodeJS.Timeout | null>(null);

  // Funktion zum Löschen einer Meldung
  const clearMessage = useCallback(() => {
    setMessage(null);
    
    // Timeout löschen, wenn vorhanden
    if (messageTimeout) {
      clearTimeout(messageTimeout);
      setMessageTimeout(null);
    }
  }, [messageTimeout]);

  // Funktion zum Anzeigen einer Meldung
  const showMessage = useCallback((content: string, type: MessageType = 'default') => {
    // Vorhandenen Timeout löschen, wenn eine neue Nachricht kommt
    if (messageTimeout) {
      clearTimeout(messageTimeout);
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
      setMessageTimeout(null);
    }, 3000);

    setMessageTimeout(timeout);
  }, [messageTimeout]);

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