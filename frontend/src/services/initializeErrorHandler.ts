import errorHandler from './ErrorHandler.ts';
import { logger } from '../utils/logger.ts';

// ✅ MEMORY: Speichere Event Handler für Cleanup
let errorHandlerInitialized = false;
let errorHandler: ((event: ErrorEvent) => boolean) | null = null;
let rejectionHandler: ((event: PromiseRejectionEvent) => boolean) | null = null;

/**
 * Initialisiert den ErrorHandler mit globalen Einstellungen
 * Diese Funktion sollte beim Starten der Anwendung aufgerufen werden
 * @returns Cleanup-Funktion zum Entfernen der Event Listener
 */
export function initializeErrorHandler(): (() => void) | null {
  // ✅ MEMORY: Verhindere mehrfache Initialisierung
  if (errorHandlerInitialized) {
    logger.log('ErrorHandler bereits initialisiert');
    return null;
  }

  errorHandler.configure({
    // Hier könnte ein global verfügbarer Benachrichtigungsdienst eingebunden werden
    onError: (message) => {
      console.error(`[Global Error]: ${message}`);
      // Hier könnte eine globale UI-Benachrichtigung angezeigt werden
    },
    // In Produktionsumgebung auf false setzen, um keine sensiblen Daten zu loggen
    logErrors: process.env.NODE_ENV !== 'production'
  });
  
  // ✅ MEMORY: Speichere Handler-Funktionen für Cleanup
  errorHandler = (event: ErrorEvent) => {
    console.error('Unbehandelter Fehler aufgetreten:', event.error);
    errorHandler.handleError(event.error, {
      type: 'UnhandledError',
      origin: event.filename,
      lineNumber: event.lineno,
      columnNumber: event.colno
    });
    
    // Verhindern, dass der Browser seinen eigenen Fehler zeigt
    event.preventDefault();
    return true;
  };

  rejectionHandler = (event: PromiseRejectionEvent) => {
    console.error('Unbehandelte Promise-Rejection aufgetreten:', event.reason);
    errorHandler.handleError(event.reason, {
      type: 'UnhandledRejection'
    });
    
    // Verhindern, dass der Browser seine eigene Fehlermeldung zeigt
    event.preventDefault();
    return true;
  };
  
  // Unbehandelte Fehler global abfangen
  window.addEventListener('error', errorHandler);
  
  // Unbehandelte Promise-Rejections global abfangen
  window.addEventListener('unhandledrejection', rejectionHandler);
  
  errorHandlerInitialized = true;
  logger.log('ErrorHandler erfolgreich initialisiert');
  
  // ✅ MEMORY: Cleanup-Funktion zurückgeben
  return () => {
    if (errorHandler) {
      window.removeEventListener('error', errorHandler);
      errorHandler = null;
    }
    if (rejectionHandler) {
      window.removeEventListener('unhandledrejection', rejectionHandler);
      rejectionHandler = null;
    }
    errorHandlerInitialized = false;
    logger.log('ErrorHandler Event Listener entfernt');
  };
}

export default initializeErrorHandler; 