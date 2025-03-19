import { useState, useCallback, useEffect } from 'react';
import errorHandler, { ErrorDetails, ErrorCategory, ErrorSeverity } from '../services/ErrorHandler.ts';

/**
 * Hook für die einheitliche Fehlerbehandlung in React-Komponenten
 * Stellt Funktionen für das Handling verschiedener Fehlertypen bereit und
 * verwaltet den aktuellen Fehlerzustand.
 */
const useErrorHandling = () => {
  // State für den aktuellen Fehler
  const [error, setError] = useState<ErrorDetails | null>(null);
  
  // Fehler löschen
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Allgemeiner Fehlerhandler
  const handleError = useCallback((err: any, context?: Record<string, any>) => {
    const errorDetails = errorHandler.handleError(err, context);
    setError(errorDetails);
    return errorDetails;
  }, []);
  
  // Validierungsfehler
  const handleValidationError = useCallback((message: string, fieldErrors?: Record<string, string>) => {
    const errorDetails = errorHandler.handleValidationError(message, fieldErrors);
    setError(errorDetails);
    return errorDetails;
  }, []);
  
  // Berechtigungsfehler
  const handlePermissionError = useCallback((message?: string) => {
    const errorDetails = errorHandler.handlePermissionError(message);
    setError(errorDetails);
    return errorDetails;
  }, []);
  
  // Netzwerkfehler
  const handleNetworkError = useCallback((message?: string) => {
    const errorDetails = errorHandler.handleError(
      { message: message || 'Netzwerkfehler: Es konnte keine Verbindung zum Server hergestellt werden' }, 
      { category: ErrorCategory.NETWORK }
    );
    errorDetails.category = ErrorCategory.NETWORK;
    setError(errorDetails);
    return errorDetails;
  }, []);
  
  // Timer für automatisches Löschen von Info/Warning Fehlern
  useEffect(() => {
    if (error && (error.severity === ErrorSeverity.INFO || error.severity === ErrorSeverity.WARNING)) {
      const timer = setTimeout(() => {
        clearError();
      }, 5000); // 5 Sekunden anzeigen
      
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);
  
  return {
    error,
    clearError,
    handleError,
    handleValidationError,
    handlePermissionError,
    handleNetworkError,
    // Weiterleitungsmethode für einfacheres Handling in komponenten
    onError: handleError
  };
};

export default useErrorHandling; 