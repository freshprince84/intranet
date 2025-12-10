import React, { createContext, useContext, ReactNode } from 'react';
import useErrorHandling from '../hooks/useErrorHandling.ts';
import { ErrorDetails } from '../services/ErrorHandler.ts';
import ErrorDisplay from '../components/ErrorDisplay.tsx';

// Definieren des Kontexttypus
interface ErrorContextType {
  error: ErrorDetails | null;
  clearError: () => void;
  handleError: (err: any, context?: Record<string, any>) => ErrorDetails;
  handleValidationError: (message: string, fieldErrors?: Record<string, string>) => ErrorDetails;
  handlePermissionError: (message?: string) => ErrorDetails;
  handleNetworkError: (message?: string) => ErrorDetails;
}

// Erstellen des Kontexts mit einem Standardwert
const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Props-Interface für den Provider
interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * Error Provider Komponente, die den ErrorContext bereitstellt
 * und die Fehlerbehandlungsfunktionen zur Verfügung stellt.
 */
export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const errorHandling = useErrorHandling();
  
  return (
    <ErrorContext.Provider value={errorHandling}>
      {/* Zeige Fehler an, wenn einer vorhanden ist */}
      {errorHandling.error && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full">
          <ErrorDisplay
            message={errorHandling.error.message}
            category={errorHandling.error.category}
            severity={errorHandling.error.severity}
            onClose={errorHandling.clearError}
          />
        </div>
      )}
      
      {children}
    </ErrorContext.Provider>
  );
};

/**
 * Hook zum Zugriff auf den ErrorContext
 * Gibt optionalen Context zurück, wenn außerhalb des ErrorProvider-Kontexts verwendet
 */
export const useError = (): ErrorContextType | null => {
  const context = useContext(ErrorContext);
  return context || null;
};

export default ErrorContext; 